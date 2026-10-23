#!/usr/bin/env python3
"""Fully deterministic, offline, code-rendered 3D data-film benchmark.

A small real 3D model, projected onto Pillow's 2D canvas with a moving
orthographic camera. Requires Pillow and the ffmpeg binary. No 3D service,
network, voice model, video generation model, browser, or proprietary API.

Output is original and depicts synthetic, fictional operations data.
"""
import argparse
from functools import lru_cache
import io
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import sys
import wave

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
DURATION = 26.0
FPS = 30
TAU = 2 * math.pi
BG = (6, 14, 28)
WHITE = (234, 243, 247)
MUTED = (135, 165, 187)
MINT = (87, 241, 199)
ORANGE = (255, 191, 104)
CORAL = (255, 110, 119)
FONT_PATHS = {
    "regular": ["/usr/share/fonts/truetype/lato/Lato-Regular.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"],
    "medium": ["/usr/share/fonts/truetype/lato/Lato-Medium.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"],
    "bold": ["/usr/share/fonts/truetype/lato/Lato-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
}
DATA = json.loads((ROOT / "data/network.json").read_text())
HUBS = DATA["hubs"]
HUB_BY_ID = {hub["id"]: hub for hub in HUBS}


def mix(a, b, x):
    return a + (b - a) * x


def clamp(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def seg(t, start, end):
    return smooth((t - start) / (end - start)) if end > start else float(t >= end)


def between(t, a, b):
    return (1 - seg(t, a - .48, a + .36)) * seg(t, b - .58, b + .2)


def rgb_blend(a, b, amount):
    return tuple(int(mix(a[i], b[i], amount)) for i in range(3))


def darken(rgb, factor):
    return tuple(max(0, min(255, int(x * factor))) for x in rgb)


@lru_cache(maxsize=96)
def font(kind, size):
    for path in FONT_PATHS[kind]:
        if Path(path).is_file():
            return ImageFont.truetype(path, int(size))
    return ImageFont.load_default(size=int(size))


def camera_at(t):
    # Independent, absolute-time pose keys. Scene never integrates previous frames.
    keys = [
        (0.0, 0.48, .88, 41.0, 1.0, .0, 1270, 630),
        (3.0, 0.56, .87, 43.0, 1.0, .0, 1270, 620),
        (6.7, 0.85, .76, 57.0, 0.0, .0, 1275, 650),
        (10.9, 1.12, .66, 80.0, -2.1, -1.1, 1240, 685),
        (14.6, 1.14, .55, 105., -2.45, -2.1, 1270, 750),
        (18.9, 0.76, .68, 68.0, -1.0, -.25, 1255, 675),
        (21.6, 0.51, .88, 47.0, 0.0, .0, 1290, 635),
        (26.0, 0.51, .88, 41.0, 0.0, .0, 1290, 650),
    ]
    for i in range(len(keys) - 1):
        a, b = keys[i], keys[i+1]
        if t <= b[0]:
            p = seg(t, a[0], b[0])
            return tuple(mix(a[j], b[j], p) for j in range(1, len(a)))
    return keys[-1][1:]


class Camera:
    def __init__(self, t, width, height):
        yaw, pitch, unit_scale, tx, ty, vx, vy = camera_at(t)
        self.ux = (-math.sin(yaw), math.cos(yaw), 0.0)
        self.uy = (-math.sin(pitch)*math.cos(yaw), -math.sin(pitch)*math.sin(yaw), math.cos(pitch))
        self.depth = (math.cos(pitch)*math.cos(yaw), math.cos(pitch)*math.sin(yaw), math.sin(pitch))
        self.units = unit_scale * (width / 1920)
        self.target = (tx, ty, 0)
        self.origin = (vx * width / 1920, vy * height / 1080)

    def p(self, x, y, z=0):
        x -= self.target[0]; y -= self.target[1]; z -= self.target[2]
        return (int(self.origin[0] + (x*self.ux[0]+y*self.ux[1]+z*self.ux[2])*self.units),
                int(self.origin[1] - (x*self.uy[0]+y*self.uy[1]+z*self.uy[2])*self.units))

    def z(self, x, y, z=0):
        return (x-self.target[0])*self.depth[0]+(y-self.target[1])*self.depth[1]+(z-self.target[2])*self.depth[2]


def city_blocks():
    blocks = []
    # Fixed topology: do not use global random() inside render.
    for iy in range(-5, 6):
        for ix in range(-7, 8):
            if ix % 4 == 0 and iy % 4 == 0:
                continue
            # Stable arithmetic seed, never Python's process-randomized hash().
            n = (ix*1157 + iy*1723 + ix*iy*99 + 9053) & 0xffff
            rng = (n * 48271 + 1) % 2147483647
            h = 0.36 + (rng % 100) / 100 * 2.05
            if n % 11 == 2:
                h *= 1.8
            w = .64 if n % 4 else .52
            d = .64 if n % 3 else .51
            blocks.append((ix*1.05, iy*.97, w, d, h, n))
    return blocks

BLOCKS = city_blocks()


def bottom_quad(x,y,w,d,z=0):
    return [(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z)]


def render_city(draw, camera, t, s):
    # Streets. Every 3D ground mark and building obeys the same camera transform.
    for i in range(-10, 11):
        pp = [camera.p(i*1.05 + .5, -5.8), camera.p(i*1.05 + .5, 5.8)]
        draw.line(pp, fill=(24, 46, 62), width=max(1, round(2*s)))
    for i in range(-7, 8):
        pp = [camera.p(-8.7, i*.97 + .5), camera.p(8.7, i*.97 + .5)]
        draw.line(pp, fill=(24, 46, 62), width=max(1, round(2*s)))

    # Render far-to-near. A z-order from the camera basis prevents most
    # extrusions from popping on a yaw change.
    items = sorted(BLOCKS, key=lambda b: camera.z(b[0],b[1],0), reverse=True)
    for x,y,w,d,h,n in items:
        footprint = bottom_quad(x,y,w,d,0)
        roof = bottom_quad(x,y,w,d,h)
        foot = [camera.p(*p) for p in footprint]
        top = [camera.p(*p) for p in roof]
        # Distance-based subdued palette lets data markers own the color.
        base = (31 + n%10, 59+n%13, 75+n%13)
        # Three/four sides visible based on yaw. Draw all distant sides first.
        sides = []
        for j in range(4):
            jj=(j+1)%4
            face = [foot[j],foot[jj],top[jj],top[j]]
            depth = camera.z((footprint[j][0]+footprint[jj][0])/2,(footprint[j][1]+footprint[jj][1])/2,h/2)
            normal = (footprint[jj][1]-footprint[j][1], -(footprint[jj][0]-footprint[j][0]))
            lum = 1.0 if normal[0] > .2 else .74
            sides.append((depth,face,darken(base,lum)))
        for _, quad, color in sorted(sides,reverse=True):
            draw.polygon(quad, fill=color)
        topcolor = (54+n%9, 79+n%10, 94+n%12)
        draw.polygon(top, fill=topcolor)
        draw.line(top + [top[0]], fill=(85, 112, 126), width=max(1, round(s)))
        # Windows read as architecture, not extra UI chrome.
        if n%5==0 and h>1:
            a,b = camera.p(x-w*.23,y-d*.51,h*.58),camera.p(x+w*.20,y-d*.51,h*.58)
            draw.line([a,b],fill=(83,127,136),width=max(1,round(1.5*s)))


def clock_at(t):
    """Fictional operational time in minutes since midnight, in sync with t."""
    if t <= 14.0:
        return int(round(mix(360, 490, seg(t, 5.0, 14.0))))
    return int(round(mix(490, 540, seg(t, 14.0, 21.0))))


def hub_availability(hub,t):
    # Data-driven and continuous. 06:00 -> morning depletion -> rebalance.
    if t <= 15.8:
        return mix(hub["start"],hub["trough"],seg(t,4.8,14.0))
    return mix(hub["trough"],hub["end"],seg(t,17.15,21.0))


def projected_hub(cam,h):
    return cam.p(h["x"], h["y"], .12)


def render_hubs(img,draw,cam,t,s):
    # Nodes have physical addresses in world space, data-derived values,
    # depth-scaled planar rings, and uncluttered labels.
    for h in HUBS:
        stock=hub_availability(h,t)
        low=stock<4.0
        x,y=projected_hub(cam,h)
        if not(-150<x<img.width+180 and -150<y<img.height+180):
            continue
        r=int((11 if low else 9)*s)
        color=CORAL if low else MINT
        a=(x-int(30*s),y-int(14*s),x+int(30*s),y+int(14*s))
        draw.ellipse(a, outline=tuple(color), width=max(2,int(2.5*s)))
        draw.ellipse((x-r,y-r,x+r,y+r),fill=tuple(color))
        draw.ellipse((x-r//2,y-r//2,x+r//2,y+r//2),fill=(10,34,47))
        # Data spokes: a count expressed as a curved occupancy indicator.
        if t>7:
            amount=clamp(stock/max(1,h["start"]))
            rr=int(33*s)
            draw.arc((x-rr,y-rr,x+rr,y+rr),198,198+int(295*amount),fill=color,width=max(2,int(3*s)))
    if 9.2<t<20.0:
        h=HUB_BY_ID["N-07"]
        x,y=projected_hub(cam,h)
        color=CORAL if hub_availability(h,t)<4 else ORANGE
        rr=int((49+3*math.sin(t*3))*s)
        draw.ellipse((x-rr,y-rr//2,x+rr,y+rr//2),outline=color,width=max(2,int(4*s)))
        # World-to-screen connector: end has meaningful semantic UI.
        draw.line([(x+int(40*s),y-int(18*s)),(x+int(95*s),y-int(75*s))],fill=color,width=max(2,int(2*s)))


def render_routes(draw,cam,t,s):
    # Commuter flow in world coordinates. Each curved segment is sampled
    # at absolute t; never advance an object by dt.
    hubs = HUB_BY_ID
    lines=[("N-07","C-02"),("N-03","S-05"),("N-07","E-06"),("C-02","S-09")]
    for index,(start,end) in enumerate(lines):
        if not(6.2<t<17.1):
            continue
        a,b=hubs[start],hubs[end]
        part=seg(t,6.3+index*.35,11.1+index*.45)
        if part<=0:continue
        pts=[]
        for i in range(60):
            u=i/59*part
            xx=mix(a['x'],b['x'],u)
            yy=mix(a['y'],b['y'],u)
            z=.22+.65*math.sin(math.pi*u)
            pts.append(cam.p(xx,yy,z))
        draw.line(pts,fill=ORANGE,width=max(2,int(3*s)),joint='curve')
        if part<.99:
            px,py=pts[-1]
            rad=int(6*s)
            draw.ellipse((px-rad,py-rad,px+rad,py+rad),fill=WHITE)
    if 16.6<t<21.7:
        path=DATA['replenish']; a,b=hubs[path['from']],hubs[path['to']]
        grow=seg(t,16.9,20.3)
        pts=[]
        for i in range(70):
            u=i/69*grow
            xx=mix(a['x'],b['x'],u)
            yy=mix(a['y'],b['y'],u)
            zz= .8+1.4*math.sin(math.pi*u)
            pts.append(cam.p(xx,yy,zz))
        draw.line(pts,fill=MINT,width=max(3,int(5*s)),joint='curve')
        x,y=pts[-1]
        r=int(7*s)
        draw.ellipse((x-r,y-r,x+r,y+r),fill=WHITE)


def rounded(draw,rect,rad,fill,outline=None,width=1):
    draw.rounded_rectangle(tuple(int(x) for x in rect),radius=int(rad),fill=fill,outline=outline,width=int(width))


def txt(draw,xy,text,kind,size,color,scale=1,anchor=None):
    # Text quality is controlled by the actual delivery resolution.
    xy=tuple(int(v) for v in xy)
    draw.text(xy,str(text),font=font(kind,size*scale),fill=color,anchor=anchor,stroke_width=0)


def pill(draw,x,y,text,s,color=MINT):
    f=font('medium',19*s)
    b=draw.textbbox((0,0),text,font=f)
    w=b[2]-b[0]
    rounded(draw,(x,y,x+w+28*s,y+33*s),16*s,(22,43,55),(54,77,84))
    draw.ellipse((int(x+10*s),int(y+13*s),int(x+17*s),int(y+20*s)),fill=color)
    draw.text((int(x+22*s),int(y+5*s)),text,font=f,fill=WHITE)


def top_hud(draw,t,s,w):
    txt(draw,(85*s,61*s),'N O R T H L I N E', 'bold',21,WHITE,s)
    txt(draw,(85*s,102*s),'OPERATIONS  /  FIELD REPORT', 'medium',16,MUTED,s)
    draw.line([(87*s,146*s),(w-88*s,146*s)],fill=(42,68,80),width=max(1,int(2*s)))
    txt(draw,(w-370*s,65*s),'DATA-TO-FILM   /   001', 'medium',18,MUTED,s)
    txt(draw,(w-370*s,106*s),'CONCEPT / SYNTHETIC DATA', 'regular',16,MUTED,s)


def caption(draw,headlines,detail,t,s):
    x=91*s
    y=273*s
    for i,line in enumerate(headlines):
        txt(draw,(x,y+i*102*s),line,'bold',83,WHITE,s)
    txt(draw,(x,y+len(headlines)*104*s+30*s),detail,'regular',30,MUTED,s)


def lower_hud(draw,t,s,w,h):
    margin=88*s
    draw.line([(margin,h-100*s),(w-margin,h-100*s)],fill=(42,68,80),width=max(1,int(2*s)))
    txt(draw,(margin,h-80*s),'NORTHLINE / MOTION STUDY', 'medium',17,MUTED,s)
    txt(draw,(w-325*s,h-80*s),'FIGURES ARE ILLUSTRATIVE', 'regular',16,MUTED,s)
    # Timeline progression is real and continuous, not an unrelated loading bar.
    draw.line([(margin,h-37*s),(margin+(w-2*margin)*(t/DURATION),h-37*s)],fill=MINT,width=max(2,int(3*s)))


def data_panel(draw,t,s,w,h,cam):
    x=w-570*s
    y=207*s
    # Anchored fixed HUD panel is restrained; it's data, not fake editor chrome.
    rounded(draw,(x,y,x+465*s,y+171*s),18*s,(14,34,48,231),(40,73,83),max(1,int(2*s)))
    txt(draw,(x+28*s,y+25*s),'DEPOT N-07', 'medium',21,MUTED,s)
    val=round(hub_availability(HUB_BY_ID['N-07'],t))
    text=f'{val:02d}'
    color= CORAL if val<4 else MINT
    txt(draw,(x+29*s,y+61*s),text,'bold',62,color,s)
    txt(draw,(x+122*s,y+98*s),'units ready', 'regular',22,WHITE,s)
    # 3D-world state + fixed HUD use identical interpolated hub data.
    txt(draw,(x+286*s,y+81*s),'LOW SUPPLY' if val<4 else 'LIVE STOCK', 'bold',18,color,s)
    for i in range(8):
        cw=26*s
        fill=color if i<round(val/18*8) else (46,67,77)
        draw.rounded_rectangle((x+28*s+i*49*s,y+148*s,x+28*s+i*49*s+cw,y+158*s),radius=4*s,fill=fill)


def make_backdrop(w,h):
    # Static RGB ground + studio-vignette and diffuse gradient, cached once.
    img=Image.new('RGB',(w,h),BG)
    draw=ImageDraw.Draw(img)
    for j in range(h):
        p=j/max(1,h-1)
        col=rgb_blend((8,22,41),(4,13,24),p)
        draw.line(((0,j),(w,j)),fill=col,width=1)
    halo=Image.new('RGBA',(w,h),(0,0,0,0))
    hh=ImageDraw.Draw(halo,'RGBA')
    hh.ellipse((int(w*.42),int(-h*.38),int(w*1.1),int(h*.77)),fill=(18,102,121,40))
    halo=halo.filter(ImageFilter.GaussianBlur(max(24,int(w*.08))))
    return Image.alpha_composite(img.convert('RGBA'),halo).convert('RGB')


class Film:
    def __init__(self,width=1920,height=1080):
        if width * 9 != height * 16:
            raise ValueError('This example storyboard is 16:9. Recompose explicitly for other aspect ratios.')
        self.width=width;self.height=height;self.s=width/1920
        self.background=make_backdrop(width,height)

    def frame(self,t):
        t=max(0,min(float(t),DURATION))
        w,h,s=self.width,self.height,self.s
        img=self.background.copy()
        dr=ImageDraw.Draw(img,'RGBA')
        cam=Camera(t,w,h)
        # Elevate the three-dimensional world as a graphic stage that can be
        # orbited, pushed toward, and isolated without flattening the scene.
        if t<21.1:
            render_city(dr,cam,t,s)
            render_routes(dr,cam,t,s)
            render_hubs(img,dr,cam,t,s)
        else:
            fade=1-seg(t,21.1,22.5)
            if fade>0:
                layer=Image.new('RGBA',(w,h))
                d=ImageDraw.Draw(layer,'RGBA')
                render_city(d,cam,t,s)
                render_hubs(layer,d,cam,t,s)
                layer.putalpha(int(255*fade))
                img=Image.alpha_composite(img.convert('RGBA'),layer).convert('RGB')
                dr=ImageDraw.Draw(img,'RGBA')
        top_hud(dr,t,s,w)
        lower_hud(dr,t,s,w,h)
        if t<4.3:
            e=seg(t,.2,1.2)
            caption(dr,['A city has','a rhythm.'],'Every route leaves a trace.',t,s)
            pill(dr,95*s,210*s,'OPERATIONS INTELLIGENCE',s)
            # A visible bar chart transforms into physical city markers, not
            # just a line of text claiming that data is dynamic.
            x,y=99*s,765*s
            for i,val in enumerate([.34,.65,.83,.57,.48,.91,.72]):
                base=int(y+120*s); xx=x+i*75*s
                hh=int(val*94*s*e)
                rounded(dr,(xx,base-hh,xx+47*s,base),6*s,(55,117,126) if i%2 else MINT)
        elif t<10.0:
            p=seg(t,4.3,5.2)
            caption(dr,['From data','to a place.'],'The network becomes navigable.',t,s)
            pill(dr,95*s,210*s,'CAMERA / FLYOVER',s)
            # Small chart-to-world connective stroke leads eye to camera view.
            dr.line([(685*s,613*s),(802*s,570*s),(870*s,530*s)],fill=MINT,width=max(2,int(4*s)))
        elif t<16.5:
            caption(dr,['Follow the','pressure.'],'Watch the northern depot run low.',t,s)
            pill(dr,95*s,210*s,'MORNING DEMAND / DEPLETION',s,color=ORANGE)
            data_panel(dr,t,s,w,h,cam)
        elif t<21.2:
            caption(dr,['See the','response.'],'12 units rebalanced to the north.',t,s)
            pill(dr,95*s,210*s,'SUGGESTED ACTION / CONCEPT',s)
            data_panel(dr,t,s,w,h,cam)
        else:
            gain=seg(t,21.1,22.3)
            # The closing line resolves out of the scene it explained.
            xx=125*s
            dr.rounded_rectangle((xx,352*s,xx+17*s,560*s),radius=8*s,fill=MINT)
            txt(dr,(175*s,351*s),'Make the data', 'bold',101,WHITE,s)
            txt(dr,(175*s,472*s),'make sense.', 'bold',101,MINT,s)
            txt(dr,(183*s,628*s),'AN ORIGINAL, CODE-RENDERED EXPLAINER', 'regular',27,MUTED,s)
            pill(dr,181*s,702*s,'DEMO / SYNTHETIC NETWORK',s)
        # Readable time-state always driven by the same t as station markers.
        if t>=4.3 and t<21.2:
            mins=clock_at(t)
            clock=f'{mins//60:02}:{mins%60:02}'
            txt(dr,(w-335*s,893*s),clock,'bold',39,WHITE,s)
            txt(dr,(w-335*s,945*s),'SIMULATED WEEKDAY', 'medium',16,MUTED,s)
        del dr
        return img


def make_score(out,duration=DURATION,rate=44100):
    """Original simple score with time-coded accents and stereo silence-safe tail."""
    import array
    # No third-party audio library; direct 16-bit PCM. Calm mallet/pulse cues.
    samples=array.array('h')
    notes=[(0.0,0.9,220,0.055),(3.5,.6,329.6,.058),(4.5,.35,392,.08),(5.8,.30,523.25,.065),
           (9.9,.65,293.7,.072),(10.5,.3,440,.06),(13.6,.45,261.6,.075),
           (16.6,.48,392,.082),(17.1,.42,523.25,.073),(18.5,.43,659.25,.066),
           (21.4,1.4,392,.06)]
    notes.sort()
    # Render 44.1 kHz mono, 24s. Stereo produced by FFmpeg when muxing.
    fade_len=2.0
    for i in range(int(duration*rate)):
        t=i/rate
        val=0.015*math.sin(TAU*110*t)+0.013*math.sin(TAU*164.81*t)+0.009*math.sin(TAU*220*t)
        # Sparse 96 BPM pulse, the grid coincides with the visual cadence.
        beat=(t*1.6)%1
        val+=0.037*math.sin(TAU*72*t)*math.exp(-beat*13)
        for start,dur,freq,level in notes:
            local=t-start
            if 0<=local<dur:
                envelope=(1-math.exp(-local*55))*math.exp(-local/max(.09,dur*.45))
                val+=level*envelope*(.7*math.sin(TAU*freq*local)+.3*math.sin(TAU*freq*2.01*local))
        fade= min(1,t/.7, (duration-t)/fade_len)
        val*=max(0,fade)
        samples.append(max(-32767,min(32767,int(val*32767))))
    with wave.open(str(out),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(samples.tobytes())


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out',default=str(ROOT/'demo.mp4'),help='MP4 output')
    ap.add_argument('--width',type=int,default=1920,help='16:9 width (e.g. 1280 or 1920)')
    ap.add_argument('--fps',type=int,default=30)
    ap.add_argument('--limit',type=float,default=DURATION,help='Number of seconds to render (default: full 26s)')
    ap.add_argument('--start',type=float,default=0,help='Start at this absolute film timestamp')
    ap.add_argument('--codec',choices=['libx264','mpeg4'],default='libx264')
    ap.add_argument('--single-pass',action='store_true',help='Disable chunked full-film export')
    ap.add_argument('--preset',choices=['ultrafast','superfast','veryfast','faster','medium'],default='ultrafast')
    ap.add_argument('--stills',type=Path,help='Render contact frames instead of a movie')
    ap.add_argument('--times',default='0,2,4.5,7.5,10.2,12.8,15.0,18.5,20.3,23.5,25.2',help='Comma-separated still timestamps')
    args=ap.parse_args()
    if args.width%16!=0 or args.width<640 or args.width>3840: ap.error('--width should be 16:9, divisible by 16, between 640 and 3840')
    if args.fps<12 or args.fps>60: ap.error('--fps should be 12-60')
    if not(0<args.limit<=DURATION) or args.start<0 or args.start+args.limit>DURATION+.0001:ap.error('Start+limit must be within film duration')
    # Long rawvideo pipes can stall in CPU/memory-constrained coding sandboxes.
    # For a full master, render 3 deterministic independent time windows and
    # concatenate on exact frame boundaries, then optimize H.264 in one pass.
    # This path is invisible to the user and produces a single normal MP4.
    if not args.stills and not args.single_pass and args.start==0 and abs(args.limit-DURATION)<.0001 and args.codec=='libx264':
        if not shutil.which('ffmpeg'): ap.error('ffmpeg not found on PATH')
        target=Path(args.out).resolve(); target.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='city-film-') as scratch:
            temp=Path(scratch)
            clips=[]
            cursor=0.0
            while cursor<DURATION-.0001:
                length=min(10.0, DURATION-cursor)
                clip=temp/f'part-{len(clips)}.mp4'
                cmd=[sys.executable,str(Path(__file__).resolve()),'--out',str(clip),
                     '--width',str(args.width),'--fps',str(args.fps),'--start',str(cursor),
                     '--limit',str(length),'--preset',args.preset,'--single-pass']
                subprocess.run(cmd,check=True)
                clips.append(clip)
                cursor+=length
            manifest=temp/'parts.txt'
            manifest.write_text(''.join(f"file '{clip}'\n" for clip in clips))
            merged=temp/'merged.mp4'
            subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0',
                            '-i',str(manifest),'-c','copy','-movflags','+faststart',str(merged)],check=True)
            subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(merged),
                            '-c:v','libx264','-pix_fmt','yuv420p','-preset','veryfast','-threads','2',
                            '-crf','21','-c:a','aac','-b:a','160k',
                            '-movflags','+faststart','-t',str(DURATION),str(target)],check=True)
        print(f'Wrote {target} ({target.stat().st_size} bytes, {args.width}x{args.width*9//16}, {args.fps}fps, {DURATION}s)')
        return
    film=Film(args.width,args.width*9//16)
    if args.stills:
        args.stills.mkdir(parents=True,exist_ok=True)
        for i,raw in enumerate(args.times.split(',')):
            t=float(raw)
            if not(0<=t<=DURATION):ap.error('Still times must lie within duration')
            out=args.stills/f'frame_{i:02d}_{t:.2f}.png'
            film.frame(t).save(out)
            print(out)
        return
    if not shutil.which('ffmpeg'):ap.error('ffmpeg not found on PATH')
    target=Path(args.out).resolve();target.parent.mkdir(parents=True,exist_ok=True)
    audio=target.with_suffix('.wav')
    make_score(audio)
    cmd=['ffmpeg','-y','-hide_banner','-loglevel','error',
         '-f','rawvideo','-pix_fmt','rgb24','-s',f'{film.width}x{film.height}',
         '-r',str(args.fps),'-i','pipe:0','-ss',str(args.start),'-i',str(audio),
         '-map','0:v:0','-map','1:a:0','-c:v',args.codec,
         '-pix_fmt','yuv420p',*(['-preset',args.preset,'-threads','2','-crf','21'] if args.codec=='libx264' else ['-qscale:v','3']),
         '-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest','-t',str(args.limit),str(target)]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    frames=round(args.limit*args.fps)
    try:
        for i in range(frames):
            image=film.frame(args.start+i/args.fps)
            proc.stdin.write(image.tobytes())
            if i%max(1,2*args.fps)==0:print(f'frame {i+1}/{frames}',flush=True)
        proc.stdin.close()
        err=proc.stderr.read().decode('utf-8','replace')
        code=proc.wait()
        if code:raise RuntimeError(f'ffmpeg exited {code}: {err[-1300:]}')
        print(f'Wrote {target} ({target.stat().st_size} bytes, {film.width}x{film.height}, {args.fps}fps, {args.limit}s)')
    finally:
        if proc.poll() is None:proc.kill()
    audio.unlink(missing_ok=True)

if __name__=='__main__':
    main()
