#!/usr/bin/env python3
"""18s original 2D continuous-motion proof. Requires pillow + ffmpeg, numpy for score.
A single request token traverses a continuous world. No still cards or slide cuts.
Pure render(t): seekable and deterministic. Subject + gentle camera drift always active.
THIS IS CONCEPT ART, NOT REAL PHP SECURITY DATA OR A PRODUCT SCREEN RECORDING.
"""
import argparse
import math
import shutil
import subprocess
import wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DURATION=18.0
BASE_W,BASE_H=1280,720
BG='#0C1421'; SURFACE='#15283A'; MUTED='#70899B'; INK='#E9F4F4'; LINE='#315063'; ACCENT='#78E5C8'; ALERT='#F1AB73'
FONT_DIR=Path('/usr/share/fonts/truetype/dejavu')
FONT_REG=FONT_DIR/'DejaVuSans.ttf';FONT_BOLD=FONT_DIR/'DejaVuSans-Bold.ttf';FONT_MONO=FONT_DIR/'DejaVuSansMono.ttf'

def smooth(x):
 x=max(0,min(1,x));return x*x*(3-2*x)

def lerp(a,b,p):return a+(b-a)*p

def route_y(x):return 460+45*math.sin(x*.0021)+18*math.sin(x*.0058)

def packet_x(t):return lerp(170,3750,smooth(min(17.6,max(0,t))/17.6))

def cam_x(t):
 # Camera follows the SAME packet across every shot; a tiny t-based offset
 # guarantees the reading hold never silently turns into a static plate.
 return max(0,packet_x(t)-430)+1.8*t

def font(sz,bold=False,mono=False):
 f=FONT_MONO if mono else (FONT_BOLD if bold else FONT_REG)
 return ImageFont.truetype(str(f),sz)

def rrect(d,box,r,fill,outline=None,width=1):
 d.rounded_rectangle(tuple(int(v) for v in box),radius=r,fill=fill,outline=outline,width=width)

def world_icon(d, x, y, cam, type_, t):
 x=int(x-cam)
 if x < -400 or x>BASE_W+400:return
 yy=int(y)
 if type_=='request':
  # The click/packet visibly originates inside this authoring source.
  rrect(d,(x-130,yy-100,x+142,yy+100),21,SURFACE,LINE,2)
  d.text((x-100,yy-67),'BROWSER',font=font(20,True,True),fill=MUTED)
  rrect(d,(x-101,yy-25,x+105,yy+49),14,'#102331','#406A7C',2)
  d.text((x-80,yy-7),'SEND REQUEST',font=font(18,True),fill=INK)
  if t<2.5:
   v=(1+math.sin(t*math.pi*1.7))*.5
   d.ellipse((x+105,yy-34,x+105+int(16+v*18),yy-34+int(16+v*18)),outline=ACCENT,width=3)
 if type_=='runtime':
  d.ellipse((x-140,yy-135,x+140,yy+145),fill='#112738',outline=ACCENT,width=5)
  d.ellipse((x-114,yy-109,x+114,yy+119),outline=LINE,width=3)
  d.text((x-68,yy-43),'PHP',font=font(53,True),fill=INK)
  d.text((x-104,yy+40),'EXECUTION',font=font(18,False,True),fill=MUTED)
  # processing arcs respond to the packet's arrival
  if 4.8<t<9.8:
   phase=(t-4.8)*2.1
   for i in range(3):
    alpha=0.4+0.6*max(0,math.sin(phase-i*.7))
    d.arc((x-165-i*8,yy-160-i*8,x+165+i*8,yy+170+i*8),start=int(phase*33+i*94),end=int(phase*33+i*94+60),fill=ACCENT if alpha>.6 else LINE,width=4)
 if type_=='state':
  rrect(d,(x-218,yy-130,x+216,yy+135),23,SURFACE,LINE,2)
  d.text((x-180,yy-107),'STATE / MEMORY',font=font(22,True,True),fill=MUTED)
  for i in range(5):
   sx=x-174+i*79
   lit=smooth((t-(9.3+i*.48))/.5)
   stroke=ALERT if lit>.3 else LINE
   rrect(d,(sx,yy-40,sx+65,yy+39),11,'#173248',stroke,3 if lit>.3 else 1)
   d.text((sx+21,yy-22),str(i+1),font=font(29,True,True),fill=INK if lit>.2 else MUTED)
 if type_=='verify':
  progress=smooth((t-13.2)/2.2)
  d.ellipse((x-158,yy-152,x+158,yy+164),outline=LINE,width=4)
  d.ellipse((x-137,yy-131,x+137,yy+143),outline=ACCENT,width=7)
  if progress>0:
   a=(x-70,yy+4);b=(x-18,yy+57);c=(x+82,yy-61)
   if progress<.4:
    q=progress/.4;d.line((a[0],a[1],lerp(a[0],b[0],q),lerp(a[1],b[1],q)),fill=ACCENT,width=16)
   else:
    d.line((*a,*b),fill=ACCENT,width=16)
    q=(progress-.4)/.6;d.line((*b,lerp(b[0],c[0],q),lerp(b[1],c[1],q)),fill=ACCENT,width=16)

def render(t,width=BASE_W,height=BASE_H):
 if width<=0 or height<=0:raise ValueError('dimensions must be positive')
 t=max(0,min(DURATION,float(t)))
 W,H=BASE_W,BASE_H
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 cam=cam_x(t);pk=packet_x(t)
 # architectural guides shift in parallax; no repeating neon particle layer
 for x in range(-100,4400,300):
  xx=int(x-cam*.7)
  if -2<xx<W+2:
   d.line((xx,110,xx,663),fill='#172638',width=2)
 for h in [224,383,590]:
  d.line((0,h,1280,h),fill='#112235',width=2)
 # World-anchored large chapter markers move with the story (not static slides)
 stages=[('01','THE REQUEST',220),('02','EXECUTION',1240),('03','STATE',2450),('04','VERIFY',3550)]
 for num,label,x in stages:
  xx=int(x-cam)
  if -850<xx<W+700:
   d.text((xx-140,132),num,font=font(145,True),fill='#1F384B')
   d.text((xx-112,270),label,font=font(31,True),fill=INK)
   d.line((xx-112,318,xx+245,318),fill=LINE,width=3)
 # Route always exists as a world path; traveled portion lights up from same x as packet.
 coords=[];coords_passed=[]
 for worldX in range(15,4100,11):
  xx=worldX-cam
  if -20<=xx<=W+20:
   v=(int(xx),int(route_y(worldX)))
   coords.append(v)
   if worldX<=pk:coords_passed.append(v)
 if len(coords)>1:d.line(coords,fill='#29485C',width=12,joint='curve')
 if len(coords_passed)>1:d.line(coords_passed,fill=ACCENT,width=13,joint='curve')
 # Every waypoint is a real subject component carried between chapters.
 world_icon(d,220,route_y(220)-13,cam,'request',t)
 world_icon(d,1350,route_y(1350)-6,cam,'runtime',t)
 world_icon(d,2440,route_y(2440)-10,cam,'state',t)
 world_icon(d,3615,route_y(3615)-10,cam,'verify',t)
 # Persistent tracked packet: 3 pure-t trailing copies on earlier path positions.
 for delta,rad in [(0.26,20),(0.17,24),(0.08,29),(0,35)]:
  prevX=packet_x(max(0,t-delta));sx=prevX-cam;sy=route_y(prevX)
  color=LINE if delta>.1 else ACCENT
  if -100<sx<W+100:
   d.ellipse((sx-rad,sy-rad,sx+rad,sy+rad),fill=BG,outline=color,width=4)
 if 0<pk-cam<W:
  sx=pk-cam;sy=route_y(pk)
  d.ellipse((sx-18,sy-18,sx+18,sy+18),fill=INK)
 # Foreground captions direct attention, but the story continues moving behind them.
 rrect(d,(42,35,566,104),15,'#101F30','#2E4C5E',2)
 d.text((64,50),'PHP   /   REQUEST TO RESPONSE',font=font(22,True,True),fill=INK)
 phase=0 if t<5 else (1 if t<11.7 else 2)
 names=['FOLLOW THE REQUEST','WATCH STATE CHANGE','TRACE. CHECK. VERIFY.']
 d.text((43,635),names[phase],font=font(40,True),fill=INK)
 d.text((44,686),'CONTINUOUS-MOTION CONCEPT  /  NOT A SECURITY ADVISORY',font=font(13,False,True),fill=MUTED)
 # Stage progress is bound to absolute t, does not require prior frame state.
 d.line((42,118,1229,118),fill='#294358',width=4)
 d.line((42,118,42+1187*smooth(t/DURATION),118),fill=ACCENT,width=5)
 # Final mark gently breathes while the title holds and camera still advances.
 if t>15:
  p=smooth((t-15)/.8)
  c=(1124,642);r=20+(1+math.sin((t-15)*2.08))*2
  d.ellipse((c[0]-r,c[1]-r,c[0]+r,c[1]+r),outline=ACCENT,width=3)
  if p>.3:d.text((1091,631),'OK',font=font(21,True),fill=INK)
 if (width,height)!=(W,H):im=im.resize((width,height),Image.Resampling.LANCZOS)
 return im

def score(path):
 import numpy as np
 rate=22050
 ts=np.arange(int(DURATION*rate))/rate
 audio=np.zeros_like(ts,dtype=np.float64)
 # Gentle original minor->major ostinato, no sampled/third-party media.
 chord=[110,164.81,220]
 for i,f in enumerate(chord):
  audio+=(.028/(1+i*.6))*np.sin(2*np.pi*f*ts)*(.4+.6*np.sin(np.pi*np.minimum(1,ts/1.5))**2)
 for t0 in np.arange(.55,17.6,1.7):
  d=ts-t0;mask=(d>=0)&(d<.25)
  audio[mask]+=.12*np.sin(2*np.pi*660*d[mask])*np.exp(-22*d[mask])
 fade=np.minimum(1,np.minimum(ts/1.2,(DURATION-ts)/1.5).clip(0,1));audio*=fade
 samples=(np.clip(audio,-1,1)*32767).astype('<i2')
 with wave.open(str(path),'wb') as wf:
  wf.setnchannels(1);wf.setsampwidth(2);wf.setframerate(rate);wf.writeframes(samples.tobytes())

def main():
 p=argparse.ArgumentParser();p.add_argument('--still',type=float);p.add_argument('--out',required=True);p.add_argument('--width',type=int,default=1280);p.add_argument('--height',type=int,default=720);p.add_argument('--fps',type=int,default=24);p.add_argument('--mute',action='store_true')
 a=p.parse_args();out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
 if a.still is not None:
  render(a.still,a.width,a.height).save(out)
  print('rendered still',out);return
 if not shutil.which('ffmpeg'):raise RuntimeError('Need ffmpeg to encode video')
 frames=int(DURATION*a.fps)
 if a.fps<=0 or a.fps>60:raise ValueError('fps should be 1-60')
 audio=out.parent/(out.stem+'-original-score.wav')
 if not a.mute:score(audio)
 args=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{a.width}x{a.height}','-framerate',str(a.fps),'-i','pipe:0']
 if not a.mute:args.extend(['-i',str(audio),'-map','0:v','-map','1:a'])
 args.extend(['-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p'])
 if not a.mute:args.extend(['-c:a','aac','-b:a','128k','-shortest'])
 args.append(str(out))
 pipe=subprocess.Popen(args,stdin=subprocess.PIPE)
 try:
  for i in range(frames):
   pipe.stdin.write(render(i/a.fps,a.width,a.height).tobytes())
 finally:
  pipe.stdin.close()
  code=pipe.wait()
  if code:raise RuntimeError(f'ffmpeg failed ({code})')
 print('Rendered',out,frames,'frames with pure-time camera and subject motion')

if __name__=='__main__':main()
