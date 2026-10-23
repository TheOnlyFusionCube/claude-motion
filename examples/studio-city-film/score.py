#!/usr/bin/env python3
"""Original, deterministic, wordless score for studio-city-film.

Uses simple synthesis only; no samples, external melody or proprietary synth.
"""
import argparse, math, wave
from pathlib import Path
import numpy as np

SR=48000
DURATION=18.0
TAU=2*math.pi

def render_score(duration=DURATION):
    n=int(duration*SR)
    y=np.zeros(n,dtype=np.float64)
    def note(start,dur,hz,amp=.045,decay=2.0,timbre='pluck'):
        i=max(0,round(start*SR));j=min(n,round((start+dur)*SR));
        if j<=i:return
        ts=np.arange(j-i)/SR
        if timbre=='pluck':
            env=(1-np.exp(-ts*70))*np.exp(-ts*decay)
            tone=np.sin(TAU*hz*ts)*.64 + np.sin(TAU*hz*2*ts)*.23+np.sin(TAU*hz*3*ts)*.13
        elif timbre=='pad':
            env=np.minimum(1,ts*2.5)*np.minimum(1,(dur-ts)*1.8)
            tone=.58*np.sin(TAU*hz*ts)+.22*np.sin(TAU*(hz*.998)*ts)+.18*np.sin(TAU*(2*hz)*ts)
        elif timbre=='bass':
            env=np.exp(-ts*3.)*(1-np.exp(-ts*70));tone=np.sin(TAU*hz*ts)+.18*np.sin(TAU*hz*2*ts)
        else:
            env=np.exp(-ts*13);tone=np.sin(TAU*hz*ts)
        y[i:j]+=tone*env*amp
    # A spare modal progression; notes anchored to cinematic section changes.
    for t,p in [(0,146.8),(4.5,130.81),(8.6,110.0),(12,164.8),(15,146.8)]:
        note(t,max(.1,min(4.25,duration-t)),p,.035,.8,'pad')
        note(t,max(.1,min(4.25,duration-t)),p*1.5,.016,.8,'pad')
    beat=60/94
    melody=[(0,293.66),(1,369.99),(2.5,440),(3.5,392),(4,329.63),(5.5,293.66),(6,246.94),(7.5,329.63)]
    for b in range(int(duration/beat)):
        note(b*beat,.30,73.42 if b<10 else (65.41 if b<19 else 82.41),.032,4,'bass')
        if b%2==0:note(b*beat,.19,1100,.006,16,'click')
    for k in range(2):
        for b,f in melody:
            t=2.6+k*5.1+b*beat*.58
            if t<14.8:note(t,.65,f,.035,6.5,'pluck')
    # Depiction foley cues: start building, depletion, re-route, recovered state.
    for t,f in [(2.4,440),(5.9,330),(9.75,210),(11.0,590),(12.1,710),(14.6,880)]:
        note(t,.6,f,.026,7,'pluck')
        note(t+.10,.45,f*1.498,.012,9,'pluck')
    # wide final decay and true bookend fade, not a sudden chop.
    fadein=np.minimum(1.,np.arange(n)/(SR*.22))
    fadeout=np.minimum(1.,np.arange(n)[::-1]/(SR*1.25))
    y*=fadein*fadeout
    peak=np.max(np.abs(y)) or 1
    y=y/max(1.,peak/.82)
    return np.asarray(np.rint(y*32767),dtype='<i2')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,default=Path(__file__).with_name('score.wav'))
    args=ap.parse_args();args.out.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(args.out),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(render_score().tobytes())
    print(args.out)
if __name__=='__main__':main()
