#!/usr/bin/env python3
"""An original, deterministic proof-of-motion concept film. Python/Pillow + FFmpeg.
No private player, no remote assets. Not a recreation of an Anthropic UI.
"""
import sys, math, os, subprocess, wave, shutil
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

W,H,FPS,DUR=1920,1080,30,20
INK=(19,31,45)
INK2=(28,47,65)
WHITE=(252,249,243)
PAPER=(243,240,233)
ORANGE=(247,106,74)
PALE=(254,215,192)
BLUE=(81,113,221)
MUTED=(129,149,161)
UI_BG=(253,252,249)
GREY=(219,226,226)
FONTDIR=os.environ.get('CLAUDE_MOTION_FONTDIR','/usr/share/fonts/opentype/inter/')
OUTPUT=Path(os.environ.get('CLAUDE_MOTION_OUTPUT_DIR',Path(__file__).resolve().parent))
FONTS={}

def font_file(weight):
 name={'heavy':'InterDisplay-ExtraBold.otf','bold':'InterDisplay-Bold.otf','semibold':'InterDisplay-SemiBold.otf','regular':'InterDisplay-Regular.otf','medium':'InterDisplay-Medium.otf'}.get(weight,'InterDisplay-Regular.otf')
 expected=Path(FONTDIR)/name
 if expected.is_file():return str(expected)
 if shutil.which('fc-match'):
  style={'heavy':'ExtraBold','bold':'Bold','semibold':'SemiBold','regular':'Regular','medium':'Medium'}.get(weight,'Regular')
  resolved=subprocess.check_output(['fc-match',f'Inter Display:style={style}','-f','%{file}'],text=True).strip()
  if Path(resolved).is_file():return resolved
 for candidate in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
  if Path(candidate).is_file():return candidate
 raise RuntimeError('No supported font found. Set CLAUDE_MOTION_FONTDIR to a folder containing Inter Display font files.')


def font(size,weight='regular'):
 key=(size,weight)
 if key not in FONTS:
  FONTS[key]=ImageFont.truetype(font_file(weight),size)
 return FONTS[key]

def clamp(x,a=0,b=1):return max(a,min(b,x))
def prog(t,a,b):return clamp((t-a)/(b-a))
def ease(x):return 1-(1-clamp(x))**3
def smooth(x): x=clamp(x);return x*x*(3-2*x)
def lerp(a,b,p):return a+(b-a)*p

def tx(draw,text,x,y,size,fill=INK,weight='regular',anchor='lt'):
 draw.text((int(x),int(y)),text,font=font(size,weight),fill=fill,anchor=anchor,stroke_width=0)

def rounded(draw,box,r,fill,outline=None,width=2):draw.rounded_rectangle(tuple(map(int,box)),radius=max(0,int(r)),fill=fill,outline=outline,width=width)
def poly(draw,pts,color,width): draw.line([(int(x),int(y)) for x,y in pts],fill=color,width=int(width),joint='curve')

def bezier(points,progress=1,n=80):
 a,b,c,d=points
 tmax=clamp(progress)
 return [( (1-u)**3*a[0]+3*(1-u)**2*u*b[0]+3*(1-u)*u*u*c[0]+u**3*d[0],
           (1-u)**3*a[1]+3*(1-u)**2*u*b[1]+3*(1-u)*u*u*c[1]+u**3*d[1]) for u in (tmax*i/n for i in range(n+1))]

def centered(draw,txt,x,y,size,col,wt='medium'):
 draw.text((int(x),int(y)),txt,font=font(size,wt),fill=col,anchor='mm')

def easeback(p):
 p=clamp(p); return 1 + 2.5*(p-1)**3+1.5*(p-1)**2

def header(d,part,title):
 # genuine visual hierarchy; no decorative technical labels
 rounded(d,(112,86,162,136),14,ORANGE)
 tx(d,'◦',131,88,48,INK,'bold')
 tx(d,'CLAUDE   /   MOTION',186,101,26,INK if part!='dark' else WHITE,'bold')
 tx(d,title,1784,101,25,MUTED,'medium',anchor='rt')

def stroke_wave(d,t,cx,cy,scale=1,color=ORANGE,thickness=25,amplitude=140):
 pts=[]
 for i in range(145):
  a=i/144
  x=cx+(a-0.5)*650*scale
  y=cy+ math.sin((a*1.65+t*.48)*math.pi*2)*amplitude*scale*math.sin(math.pi*a)**0.3
  pts.append((x,y))
 poly(d,pts,color,thickness*scale)
 # leading, guided point: meaningful moving subject
 q=prog((t*0.7)%1.0,0,1)
 x,y=pts[int(144*q)]
 d.ellipse((x-14*scale,y-14*scale,x+14*scale,y+14*scale),fill=WHITE if color==ORANGE else ORANGE)

def open_scene(t):
 im=Image.new('RGB',(W,H),INK);d=ImageDraw.Draw(im)
 # generous editorial type, high contrast, intentional size
 tx(d,'FILM DIRECTION  /  IN CODE',135,112,33,PALE,'semibold')
 tx(d,'Make ideas',129,364,190,WHITE,'heavy')
 tx(d,'move.',129,590,190,WHITE,'heavy')
 # traveling proof motif: a moving line, not a static corporate icon
 p=ease(prog(t,.05,2.15))
 curve=bezier(((1160,733),(1310,360),(1462,930),(1780,440)),p,130)
 if len(curve)>1: poly(d,curve,ORANGE,28)
 if p>0:
  x,y=curve[-1]
  d.ellipse((x-31,y-31,x+31,y+31),fill=ORANGE)
  d.ellipse((x-11,y-11,x+11,y+11),fill=INK)
 # oversized offscreen, sweeping coils animate; distinct from user clip's static concentric rings
 for j in range(3):
  r=80+j*77+20*math.sin(t*1.8+j*.8)
  d.arc((1455-r,490-r,1455+r,490+r),15+23*t,165+23*t,fill=(73+j*8,91+j*8,110+j*8),width=3)
 tx(d,'An idea becomes an action.',137,881,43,(180,194,200),'regular')
 # transition sweeps outward FROM orange endpoint at 2.7 into workbench paper
 q=ease(prog(t,2.5,3.1))
 if q>0:
  r=2450*q
  d.ellipse((1700-r,410-r,1700+r,410+r),fill=PAPER)
  # The new shot starts composing before the outgoing circle completes.
  # Match this exact headline and position to the incoming editor scene.
  if q>.58:
   fade=smooth(prog(t,2.62,2.90))
   col=tuple(int(lerp(PAPER[i],INK[i],fade)) for i in range(3))
   tx(d,'The brief becomes a frame.',128,178,82,col,'bold')
 return im

def visual_preview(d,t,box,clip=.7):
 x0,y0,x1,y1=box
 rounded(d,box,27,INK)
 # visual tells user why scrub matters: path shape, size, color, title all change
 phase=smooth(prog(t,7.35,9.25))
 amp=lerp(28,106,phase)
 col=tuple(int(lerp(ORANGE[i],BLUE[i],phase)) for i in range(3))
 pts=[]
 n=140
 for i in range(n):
  u=i/(n-1)
  x=x0+80 + u*(x1-x0-160)
  y=(y0+y1)*.58 + math.sin(u*math.pi*2.5+phase*2)*amp
  pts.append((x,y))
 poly(d,pts,col,19)
 # the headline is a visible state change, not just static code
 name='IDEA' if phase<.5 else 'MOTION'
 fsize=92 if phase<.5 else 79
 tx(d,name,x0+72,y0+70,fsize,WHITE,'heavy')
 rounded(d,(x0+78,y1-66,x0+242,y1-42),12,ORANGE if phase<.5 else BLUE)
 tx(d,'PREVIEW  /  LIVE',x1-56,y0+40,23,(168,185,191),'semibold','rt')

def pointer(d,x,y,pressed=False):
 # bold pointer visible as an agent decision, with a meaningful target
 verts=[(x,y),(x+8,y+60),(x+23,y+46),(x+38,y+79),(x+57,y+68),(x+39,y+35),(x+67,y+31)]
 d.polygon(verts,fill=WHITE)
 d.line(verts+[verts[0]],fill=INK,width=5,joint='curve')
 if pressed:
  d.ellipse((x-28,y-28,x+28,y+28),outline=ORANGE,width=6)

def workbench_scene(t):
 im=Image.new('RGB',(W,H),PAPER);d=ImageDraw.Draw(im)
 # constantly changing scene: window arrives, type appears, cursor moves, preview morphs
 p=easeback(prog(t,3.02,3.88));dy=int(175*(1-p));alpha=clamp(p)
 header(d,'light','01 /  IDEA TO ACTION')
 tx(d,'The brief becomes a frame.',128,178,82,INK,'bold')
 # physical editor window with depth and panels
 x0,y0,x1,y1=128,302+dy,1794,957+dy
 rounded(d,(x0+15,y0+22,x1+15,y1+23),35,(214,215,211))
 rounded(d,(x0,y0,x1,y1),32,UI_BG)
 rounded(d,(x0,y0,x1,y0+95),32,(229,232,231))
 d.rectangle((x0,y0+52,x1,y0+95),fill=(229,232,231))
 for k,color in enumerate([ORANGE,(246,190,109),(137,187,156)]):
  d.ellipse((174+30*k,y0+35,191+30*k,y0+52),fill=color)
 tx(d,'STUDIO',294,y0+30,27,INK,'bold')
 tx(d,'CONCEPT DEMO  ·  NOT A PRODUCT SCREEN',1728,y0+35,23,(105,126,141),'medium','rt')
 tx(d,'01  /  BRIEF',183,y0+126,23,(107,129,138),'semibold')
 tx(d,'Turn a line into',187,y0+207,55,INK,'bold')
 tx(d,'a living wave.',187,y0+281,55,INK,'bold')
 # make entered text genuinely type from time, rather than duplicate fixed wording
 d.rectangle((184,y0+377,737,y0+489),fill=(240,241,237))
 rounded(d,(184,y0+377,737,y0+489),16,(240,241,237))
 phrase='Make the path feel alive'
 n=max(0,min(len(phrase),int((t-4.16)*22)))
 tx(d,phrase[:n],207,y0+405,34,INK,'medium')
 if n<len(phrase) and (int(t/.42)%2)==0: d.rectangle((213+min(490,font(34,"medium").getlength(phrase[:n])),y0+409,217+min(490,font(34,"medium").getlength(phrase[:n])),y0+453),fill=ORANGE)
 tx(d,'02  /  PREVIEW',833,y0+126,23,(107,129,138),'semibold')
 box=(820,y0+168,1725,y0+496)
 visual_preview(d,t,box)
 tx(d,'03  /  TIMELINE',187,y0+525,23,(107,129,138),'semibold')
 rounded(d,(184,y0+555,1728,y0+630),14,(228,232,231))
 # timeline clips change shape and playhead moves with pointer drag
 rounded(d,(207,y0+572,713,y0+613),11,(209,214,230))
 rounded(d,(729,y0+572,1143,y0+613),11,(250,184,158))
 rounded(d,(1158,y0+572,1707,y0+613),11,(205,219,210))
 phase=prog(t,7.35,9.25)
 play=lerp(741,1334,smooth(phase))
 d.line((play,y0+548,play,y0+633),fill=ORANGE,width=7)
 d.polygon([(play-13,y0+541),(play+13,y0+541),(play,y0+557)],fill=ORANGE)
 # pointer travel is linked to scrub time, visible and exact
 if t>=5.9:
  if t<7.35:
   e=smooth(prog(t,5.9,7.18))
   px=lerp(580,741,e);py=lerp(y0+365,y0+560,e) - 44*math.sin(e*math.pi)
  else:
   px=play;py=y0+563
  pointer(d,px,py,t>=7.35 and t<9.3)
 # foley and preview flash at completed drag
 if 9.15<t<10.35:
  q=ease(prog(t,9.15,9.55))
  rounded(d,(1369,y0+120+20*(1-q),1721,y0+172+20*(1-q)),20,(217,244,222))
  tx(d,'SAVED  /  READY TO RENDER',1548,y0+134+20*(1-q),20,(43,122,87),'bold','mt')
 # outgoing UI preview becomes finished film (transition cover)
 q=ease(prog(t,10.62,11.20))
 if q>0:
  # preview expands outward from a recognizable location; colors match next shot
  xx,yy=1290,590
  r=2300*q
  d.ellipse((xx-r,yy-r,xx+r,yy+r),fill=INK)
 # Intentional 2.8s camera push while the user's prompt appears. At 720p/1080p
 # this shifts the composition visibly, without distracting from the interaction.
 cam=smooth(prog(t,4.05,6.85))
 camz=1+0.095*cam
 if camz>1.0001:
  focusx=W/2
  focusy=H/2
  left=focusx-W/(2*camz);top=focusy-H/(2*camz)
  M=np.float32([[1/camz,0,left],[0,1/camz,top]])
  moved=cv2.warpAffine(np.asarray(im),M,(W,H),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_CONSTANT,borderValue=PAPER)
  im=Image.fromarray(moved)
 return im

def payoff_scene(t):
 im=Image.new('RGB',(W,H),INK);d=ImageDraw.Draw(im)
 tx(d,'03  /  THE RESULT',130,118,32,PALE,'semibold')
 # the moving line has left the UI and now becomes whole-film composition
 p=ease(prog(t,11.05,12.2))
 yy=760
 for j in range(3):
  offset=j*.3
  pts=[]
  for i in range(125):
   u=i/124
   x=130 + u*(W-260)
   y=yy+math.sin(u*math.pi*4+(t-11)*2.5+offset)*lerp(55,124,p)*(1-j*.16)
   pts.append((x,y + j*35))
  color=[ORANGE,BLUE,(86,118,137)][j]
  poly(d,pts,color,22 if j==0 else 9)
 # large text becomes readable and pushes in
 rise=58*(1-ease(prog(t,11.2,12.08)))
 tx(d,'One idea.',133,270+rise,155,WHITE,'heavy')
 tx(d,'Infinite frames.',133,446+rise,148,PALE,'heavy')
 # visual "before/after" film simulation: point follows wave toward payoff
 x=lerp(145,1730,ease(prog(t,11.4,14.7)))
 y=yy+math.sin(((x-130)/(W-260))*math.pi*4+(t-11)*2.5)*lerp(55,124,p)
 d.ellipse((x-27,y-27,x+27,y+27),fill=WHITE)
 d.ellipse((x-11,y-11,x+11,y+11),fill=ORANGE)
 # handoff to brand mark via moving point
 q=ease(prog(t,14.4,15.01))
 if q>0:
  rr=2400*q
  d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=PAPER)
  if q>.67:
   fade=smooth(prog(t,14.65,15.02))
   col=tuple(int(lerp(PAPER[i],INK[i],fade)) for i in range(3))
   d.ellipse((272,417,508,653),fill=ORANGE)
   d.arc((347,495,433,578),205,515,fill=PAPER,width=17)
   d.ellipse((412,511,429,528),fill=PAPER)
   tx(d,'claude-motion',400,493,169,col,'heavy')
 return im

def close_scene(t):
 im=Image.new('RGB',(W,H),PAPER);d=ImageDraw.Draw(im)
 # graphic from the moving dot becomes logo, closes on a calm hold
 p=ease(prog(t,15.0,15.85))
 x=lerp(390,250,p);y=535
 radius=lerp(118,85,p)
 d.ellipse((x-radius,y-radius,x+radius,y+radius),fill=ORANGE)
 # signature direction mark in negative space, almost complete, time-resolved
 d.arc((x-43,y-40,x+43,y+43),205,515,fill=PAPER,width=17)
 d.ellipse((x+22,y-24,x+39,y-7),fill=PAPER)
 textx=400
 shift=70*(1-p)
 tx(d,'claude-motion',textx,423+shift,169,INK,'heavy')
 a=ease(prog(t,15.55,16.18))
 if a>0:
  tx(d,'Motion direction for coding agents.',textx+5,653+16*(1-a),53,(84,104,111),'medium')
  d.line((textx+6,745,textx+6+int(a*1050),745),fill=ORANGE,width=10)
 # bottom reads on mobile, no arbitrary compact status bar
 tx(d,'CREATE   ·   REVIEW   ·   REFINE',410,852,35,(95,108,112),'semibold')
 return im

def frame(t):
 if t<3.05: return open_scene(t)
 if t<11.06: return workbench_scene(t)
 if t<15.01:return payoff_scene(t)
 return close_scene(t)

def music(out):
 sr=48000;n=int(DUR*sr);mix=np.zeros(n,dtype=np.float32)
 def note(t,dur,f,amp,kind='marimba'):
  idx=int(t*sr);m=min(int(dur*sr),n-idx)
  if m<=0:return
  u=np.arange(m,dtype=np.float32)/sr
  atk=np.minimum(1,u/.04)
  if kind=='marimba':
   env=atk*np.exp(-u*4.8)
   tone=np.sin(2*np.pi*f*u)+.27*np.sin(2*np.pi*f*2.02*u)
  elif kind=='bass':
   env=atk*np.minimum(1,(dur-u)/.2)
   tone=.8*np.sin(2*np.pi*f*u)+.22*np.sin(2*np.pi*2*f*u)
  else:
   env=atk*np.minimum(1,(dur-u)/.75)
   tone=.77*np.sin(2*np.pi*f*u)+.13*np.sin(2*np.pi*1.004*f*u)
  mix[idx:idx+m]+=amp*env*tone
 def hit(t,amp=.1):
  idx=int(sr*t);m=min(int(.1*sr),n-idx)
  u=np.arange(m,dtype=np.float32)/sr
  rng=np.random.default_rng(int(t*1000))
  mix[idx:idx+m]+=amp*(rng.random(m,dtype=np.float32)*2-1)*np.exp(-u*45)
 def sweep(t,dur,amp):
  idx=int(sr*t);m=min(int(dur*sr),n-idx)
  u=np.arange(m,dtype=np.float32)/sr
  rng=np.random.default_rng(int(t*1122))
  noise=rng.normal(0,.15,m).astype('float32')
  env=np.sin(np.pi*np.minimum(1,u/dur))**2
  mix[idx:idx+m]+=amp*env*noise
 # warm C major-ish original motif from the picture, not a song copy
 for t in (0,3.0,11.0,15.1):
  for f in (130.81,164.81,196,261.63):note(t,3.5,f,.018,'pad')
 for i in range(32):
  t=3.1+i*.43
  if t>14.9:break
  note(t,.55,[523.25,659.26,783.99,659.26,587.33,523.25][i%6],.045 if i%4 else .071)
 for t in (3.1,6.0,7.35,9.25,11.07,15.05):hit(t,.12)
 for k in range(25):
  t=4.20+k/22
  if t<5.5:hit(t,.015)
 sweep(10.6,.85,.12)
 sweep(14.66,.7,.08)
 for f in (261.63,329.63,392,523.25):note(15.1,3.5,f,.014,'pad')
 for i in range(int(sr*2)):
  k=n-int(sr*2)+i
  mix[k]*=float((int(sr*2)-i)/(sr*2))**1.2
 maxval=float(np.max(np.abs(mix)))
 if maxval>.8:mix*=.8/maxval
 with wave.open(out,'wb') as wr:
  wr.setnchannels(1);wr.setsampwidth(2);wr.setframerate(sr)
  wr.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())

def main():
 OUTPUT.mkdir(parents=True,exist_ok=True)
 if '--stills' in sys.argv:
  for t in [0,1.8,3.6,5.1,7.3,8.8,10.0,11.6,13.4,15.5,17.8]:
   frame(t).resize((960,540),Image.Resampling.LANCZOS).save(str(OUTPUT / f'{str(t).replace(".","p")}.png'))
  return
 audio=str(OUTPUT/'original-score.wav');music(audio)
 command=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-', '-i',audio,'-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',str(DUR),'-movflags','+faststart',str(OUTPUT/'demo.mp4')]
 proc=subprocess.Popen(command,stdin=subprocess.PIPE)
 try:
  for i in range(FPS*DUR):
   t=i/FPS
   proc.stdin.write(frame(t).tobytes())
   if i%90==0:print('Rendered',i,'/',FPS*DUR,flush=True)
 finally:
  proc.stdin.close()
 proc.wait()
 if proc.returncode!=0:raise RuntimeError('ffmpeg encode failed')
 print('Video ready')

if __name__=='__main__':main()
