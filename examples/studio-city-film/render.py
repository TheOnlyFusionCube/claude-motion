#!/usr/bin/env python3
"""Scene-first studio 3D miniature of a fictional distribution network.

Pure timeline sampling, real OpenGL 3D via VTK, rasterized editorial type via Pillow.
No network or private assets. Requires vtk, pillow, numpy and FFmpeg for movies.

Usage: python render.py --still 7.5 --width 1280 --out frame.png
"""
from __future__ import annotations
import argparse, math, random, os, sys, tempfile, subprocess, shutil, json
from pathlib import Path
from functools import lru_cache
from typing import NamedTuple
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import vtk
from vtk.util.numpy_support import vtk_to_numpy

ROOT=Path(__file__).resolve().parent
DURATION=18.0
FPS=24
W0,H0=1920,1080
BG=(9,17,31)
INK=(235,241,239)
MUTE=(150,173,182)
TEAL=(76,234,199)
GOLD=(255,175,107)
T=math.pi*2

def clamp(v):return max(0.,min(1.,v))
def ease(p):
    p=clamp(p);return p*p*(3-2*p)
def seg(t,a,b):return ease((t-a)/(b-a)) if b>a else float(t>=b)
def mix(a,b,p):return a+(b-a)*p

@lru_cache(maxsize=64)
def font(size=50,weight='regular'):
    paths={'regular':['/usr/share/fonts/opentype/inter/Inter-Regular.otf','/usr/share/fonts/truetype/lato/Lato-Regular.ttf'],
           'medium':['/usr/share/fonts/opentype/inter/Inter-Medium.otf','/usr/share/fonts/truetype/lato/Lato-Semibold.ttf'],
           'bold':['/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf','/usr/share/fonts/opentype/inter/Inter-Bold.otf','/usr/share/fonts/truetype/lato/Lato-Bold.ttf']}
    for p in paths[weight]:
        if Path(p).exists():return ImageFont.truetype(p,size)
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',size)


def material(actor,color,metal=.0,rough=.7,opacity=1):
    p=actor.GetProperty();p.SetInterpolationToPBR();p.SetColor(*color);p.SetMetallic(metal);p.SetRoughness(rough);p.SetOpacity(opacity)
    return actor

def actor_for(src,color,metal=0.,rough=.7,opacity=1):
    mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(src.GetOutputPort());a=vtk.vtkActor();a.SetMapper(mapper)
    return material(a,color,metal,rough,opacity)

def cube(x,y,z,dx,dy,dz,color,metal=0.,rough=.7):
    o=vtk.vtkCubeSource();o.SetCenter(x,y,z);o.SetXLength(dx);o.SetYLength(dy);o.SetZLength(dz)
    return actor_for(o,color,metal,rough)

def cylinder(x,y,z,r,h,c,res=32,metal=0.,rough=.55):
    o=vtk.vtkCylinderSource();o.SetRadius(r);o.SetHeight(h);o.SetResolution(res)
    a=actor_for(o,c,metal,rough)
    a.RotateX(90) # y cylinder axis -> -z axis
    a.SetPosition(x,y,z)
    return a

def polyline(points,color,r=.028,metal=0.03,rough=.45):
    pts=vtk.vtkPoints();lines=vtk.vtkCellArray();poly=vtk.vtkPolyLine();poly.GetPointIds().SetNumberOfIds(len(points))
    for i,p in enumerate(points):pts.InsertNextPoint(*p);poly.GetPointIds().SetId(i,i)
    lines.InsertNextCell(poly)
    data=vtk.vtkPolyData();data.SetPoints(pts);data.SetLines(lines)
    tube=vtk.vtkTubeFilter();tube.SetInputData(data);tube.SetRadius(r);tube.SetNumberOfSides(7);tube.CappingOn()
    return actor_for(tube,color,metal,rough)

def donut(cx,cy,z,R,r,c):
    o=vtk.vtkParametricTorus();o.SetRingRadius(R);o.SetCrossSectionRadius(r)
    src=vtk.vtkParametricFunctionSource();src.SetParametricFunction(o);src.SetUResolution(72);src.SetVResolution(8)
    a=actor_for(src,c,.18,.42);a.SetPosition(cx,cy,z);return a

# Fictional network. Each numerical status and physical marker derives from this function.
NODES=[(-3.6,-2.7),(-.2,2.4),(3.45,-1.7)]
FOCUS=1

def data_at(t):
    loss=seg(t,5.5,10.1)
    recovery=seg(t,12.0,15.1)
    return {'west':round(mix(18,15,loss)),'north':round(mix(mix(24,0,loss),16,recovery)),'east':round(mix(12,9,loss)),
            'loss':loss,'recovery':recovery, 'route_active':recovery>0.01}

# Camera is an absolute-time interpolation of authored shot keys; no state accumulation.
CAM_KEYS=[
    (0.0, (21., -28., 23.), (-.2,0.,1.), 37.),
    (2.7, (21., -28., 23.), (-.2,0.,1.), 37.),
    (4.4, (15.6,-22.5,18.), (-.6,.3,1.7), 35.),
    (5.8, (9.5,-13.,10.4), (-.2,1.6,1.7), 35.),
    (8.7, (8.3,-12.1,10.5), (-.2,1.6,1.9), 34.),
    (10.4, (8.2,-12.2,10.2), (-.2,1.7,1.8), 34.),
    (12.0, (8.2,-12.8,11.3),(-.5,1.2,2.),35.),
    (14.3, (17.,-23.,20.), (0,0,1.),37.),
    (17.9, (21., -28., 23.),(-.2,0.,1.),37.)]

def camera_at(t):
    for i in range(len(CAM_KEYS)-1):
        a,b=CAM_KEYS[i:i+2]
        if t<=b[0]:
            p=seg(t,a[0],b[0]); eye=tuple(mix(a[1][k],b[1][k],p) for k in range(3));target=tuple(mix(a[2][k],b[2][k],p) for k in range(3));
            return eye,target,mix(a[3],b[3],p)
    return CAM_KEYS[-1][1:]

class CityScene:
    def __init__(self,width=1280,height=720):
        self.width,self.height=width,height
        self.ren=vtk.vtkRenderer()
        self.ren.AutomaticLightCreationOff()
        self.ren.SetBackground(.020,.031,.050)
        self.ren.SetBackground2(.060,.095,.127)
        self.ren.GradientBackgroundOn()
        self.ren.SetUseFXAA(False)
        self.ren.SetUseSSAO(False)
        self.ren.SetSSAORadius(.38)
        self.ren.SetSSAOKernelSize(24)
        self.ren.SetSSAOBias(.005)
        self.ren.SetUseShadows(False)
        self.window=vtk.vtkRenderWindow()
        self.window.OffScreenRenderingOn();self.window.SetSize(width,height);self.window.SetMultiSamples(4)
        self.window.AddRenderer(self.ren)
        self.cam=vtk.vtkCamera();self.cam.SetViewUp(0,0,1);self.ren.SetActiveCamera(self.cam)
        # Primary soft-warm key, cool fill, accent rim. VTK positional light falloff is physical-ish.
        for pos,col,intensity in [((-13,-18,24),(1.,.86,.72),1.7),((12,9,17),(.59,.80,1.),1.0),((2,14,16),(.95,1.,1.),.8)]:
            light=vtk.vtkLight();light.SetLightTypeToSceneLight();light.SetPosition(*pos);light.SetFocalPoint(0,0,0)
            light.SetColor(*col);light.SetIntensity(intensity)
            self.ren.AddLight(light)
        self.ren.AddActor(cube(0,0,-.43,17,15,.7,(.065,.085,.125),.22,.52))
        self.ren.AddActor(cube(0,0,-.045,16.5,14.55,.15,(.080,.115,.155),.10,.76))
        self.ren.AddActor(cube(0,0,.04,16.2,14.3,.038,(.070,.105,.145),.10,.77))
        # perimeter inset border and architectural curbs (show object as miniature rather than flat data plot)
        for ax in [-7.95,7.95]:self.ren.AddActor(cube(ax,0,.063,.018,13.90,.014,(.25,.40,.48),0,.47))
        for ay in [-6.94,6.94]:self.ren.AddActor(cube(0,ay,.063,15.90,.018,.014,(.25,.40,.48),0,.47))
        self._roads()
        self._buildings()
        self._nodes()
        self._routes()
        self.w2i=vtk.vtkWindowToImageFilter();self.w2i.SetInput(self.window);self.w2i.SetInputBufferTypeToRGB();self.w2i.ReadFrontBufferOff()
        self._first=True
    def _roads(self):
        # Deliberately scale roads to 3D building geometry: no infinite wireframe grid.
        for u in range(-6,7):
            x=u*1.05
            self.ren.AddActor(cube(x,0,.066,.25,13.6,.009,(.095,.14,.18),0,.9))
        for v in range(-6,7):
            y=v*.99
            self.ren.AddActor(cube(0,y,.068,15.3,.25,.009,(.095,.14,.18),0,.9))
        for v in [-4,-1,2,5]:
            y=v*.99+.25
            self.ren.AddActor(cube(0,y,.075,15.3,.015,.008,(.22,.30,.35),0,.9))
    def _glyph_boxes(self, scales, colors, name):
        """One GPU-instanced batch instead of hundreds of near-identical actors.

        Position, length, material tint are point attributes and stay updated in
        absolute-time `update(t)`.  This reduces geometry draw calls dramatically.
        """
        from vtk.util.numpy_support import numpy_to_vtk
        n=len(scales)
        pts=vtk.vtkPoints();pts.SetNumberOfPoints(n)
        attrs=vtk.vtkFloatArray();attrs.SetNumberOfComponents(3);attrs.SetName('instance_scale');attrs.SetNumberOfTuples(n)
        cols=vtk.vtkUnsignedCharArray();cols.SetNumberOfComponents(3);cols.SetName('instance_rgb');cols.SetNumberOfTuples(n)
        for i,(sc,col) in enumerate(zip(scales,colors)):
            attrs.SetTuple3(i,*sc)
            cols.SetTuple3(i,*[int(round(max(0,min(1,x))*255)) for x in col])
        poly=vtk.vtkPolyData();poly.SetPoints(pts)
        poly.GetPointData().AddArray(attrs);poly.GetPointData().AddArray(cols)
        geo=vtk.vtkCubeSource();geo.SetCenter(0,0,0);geo.SetXLength(1);geo.SetYLength(1);geo.SetZLength(1)
        mapper=vtk.vtkGlyph3DMapper();mapper.SetSourceConnection(geo.GetOutputPort());mapper.SetInputData(poly)
        mapper.SetScaleArray('instance_scale');mapper.SetScaleModeToScaleByVectorComponents();mapper.SetScaleFactor(1)
        mapper.SetScalarModeToUsePointFieldData();mapper.SelectColorArray('instance_rgb');mapper.SetColorModeToDirectScalars()
        material_actor=vtk.vtkActor();material_actor.SetMapper(mapper)
        material(material_actor,(1,1,1),.08,.65)
        self.ren.AddActor(material_actor)
        return pts,attrs,poly

    def _buildings(self):
        rng=random.Random(47)
        buildings=[]
        for ix in range(-7,8):
            for iy in range(-6,7):
                if (ix+7)%4==0 and (iy+6)%3==0:continue
                x=ix*1.04+rng.uniform(-.045,.045)
                y=iy*.99+rng.uniform(-.045,.045)
                if abs(x)>7.25 or abs(y)>6.15:continue
                if min(math.hypot(x-hx,y-hy) for hx,hy in NODES) < 1.48:continue
                if (3.1<x<5.5 and 2.0<y<4.6) or (-5.2<x<-3.3 and 1.0<y<3.1):continue
                # Vary building families so the city does not read as a grid of cubes.
                if rng.random()<.19:continue
                dist=math.hypot(x+1.1,y-.6)
                tall=max(0,1.95-dist*.19)
                h=.4+rng.random()*.8+tall*(.25+rng.random()*.62)
                if rng.random()<.105:h*=1.5
                w=.62+rng.random()*.23;d=.56+rng.random()*.24
                fam=(ix*11+iy*7)%7
                base=(.58,.70,.72) if fam<3 else ((.35,.49,.55) if fam<5 else (.72,.75,.70))
                shade=rng.uniform(-.09,.06)
                color=tuple(max(.1,min(.95,channel+shade)) for channel in base)
                spawn=(math.hypot(x+3.6,y+2.7)/15)*.58
                corridor=y<2.4 and y>-3.3 and abs(x+.2)<2.35
                buildings.append((x,y,w,d,h,color,spawn,corridor))
        self.buildings=buildings
        self.body_points,self.body_sizes,self.body_poly=self._glyph_boxes(
            [(a[2],a[3],a[4]) for a in buildings], [a[5] for a in buildings],'body')
        self.roof_points,self.roof_sizes,self.roof_poly=self._glyph_boxes(
            [(a[2]*.77,a[3]*.78,.085) for a in buildings],[(.18,.29,.35)]*len(buildings),'roof')
        self.window_points,self.window_sizes,self.window_poly=self._glyph_boxes(
            [(a[2]*.66,.021,.045) for a in buildings],[(.27,.52,.57)]*len(buildings),'glazing')

    def _update_buildings(self,t):
        reveal=seg(t,5.6,7.7)*(1-seg(t,11.3,13.2))
        for i,(x,y,w,d,h,col,delay,corridor) in enumerate(self.buildings):
            progress=(.18+.82*seg(t,.34+delay,2.5+delay))
            progress*= (1-.78*reveal) if corridor else 1
            H=h*progress
            self.body_points.SetPoint(i,x,y,.08+H/2)
            self.body_sizes.SetTuple3(i,w,d,H)
            self.roof_points.SetPoint(i,x,y,.08+H+.02)
            self.window_points.SetPoint(i,x,y-d*.51,.08+H*.62)
        for p,a,data in [(self.body_points,self.body_sizes,self.body_poly),
                          (self.roof_points,self.roof_sizes,self.roof_poly),
                          (self.window_points,self.window_sizes,self.window_poly)]:
            p.Modified();a.Modified();data.Modified()
    def _nodes(self):
        self.node_actors=[]
        for j,(x,y) in enumerate(NODES):
            # White stone hub body, actual status column, concentric metallic torus.
            self.ren.AddActor(cube(x,y,.135,2.15,2.15,.14,(.72,.79,.77),.16,.60))
            self.ren.AddActor(cube(x,y,.243,1.88,1.88,.095,(.14,.27,.32),.35,.36))
            self.ren.AddActor(donut(x,y,.315,.88,.022,(.40,.68,.68)))
            # Conspicuous real depot sculpture with tiered base, castable surfaces.
            self.ren.AddActor(cube(x,y,.42,.68,.68,.35,(.67,.80,.77),.12,.47))
            self.ren.AddActor(cube(x,y,.66,.50,.50,.16,(.12,.31,.38),.2,.48))
            # Supply column: physical height is driven by the same data as the overlay.
            pillar=cube(x,y,.96,.34,.34,.50,(.12,.88,.68),.27,.28)
            self.ren.AddActor(pillar)
            ring=donut(x,y,1.22,.78,.065,(.11,.8,.62));self.ren.AddActor(ring)
            self.node_actors.append((pillar,ring,x,y))
    def _routes(self):
        # Render physically above roofs, not composited lines faked in screen space.
        p0=NODES[0];p1=NODES[1];p2=NODES[2]
        self.route_solid=[]
        for i,(a,b) in enumerate([(p0,p1),(p2,p1)]):
            pts=[]
            for n in range(51):
                p=n/50
                x=mix(a[0],b[0],p);y=mix(a[1],b[1],p)
                z=2.10+2.85*math.sin(math.pi*p)
                pts.append((x,y,z))
            path=polyline(pts,(.92,.53,.25),.067)
            self.ren.AddActor(path)
            self.route_solid.append(path)
            # World-space data packet traverses the tube.
        self.packet=[]
        for _ in range(2):
            obj=vtk.vtkSphereSource();obj.SetRadius(.135);obj.SetThetaResolution(16);obj.SetPhiResolution(12)
            a=actor_for(obj,(.99,.72,.35),.26,.20);self.ren.AddActor(a);self.packet.append(a)
    def update(self,t):
        d=data_at(t)
        # Extrude real geometry out of the map; visible causality instead of a still photo.
        self._update_buildings(t)
        for j,(pillar,ring,x,y) in enumerate(self.node_actors):
            value=[d['west'],d['north'],d['east']][j]
            h=.13 + max(value,0)/24*2.65
            pillar.SetScale(1,1,h/.5)
            # Anchor bottom at top of physical hub pedestal (z=.74).
            pillar.SetPosition(0,0,(.74+h/2)-.96*h/.5)
            c=(.98,.39,.26) if j==1 and value<=4 else (.12,.92,.68)
            pillar.GetProperty().SetColor(*c);ring.GetProperty().SetColor(*c)
            ring.SetPosition(0,0,.13 + h*.10)
            ring.SetVisibility(1)
        active=seg(t,10.1,12.9)
        for i,a in enumerate(self.route_solid):a.SetVisibility(1 if active>.02 else 0)
        for i,a in enumerate(self.packet):
            if active>.04:
                n=clamp((t-11.0-i*.46)/2.6);start=NODES[0 if i==0 else 2];end=NODES[1]
                x=mix(start[0],end[0],n);y=mix(start[1],end[1],n);z=2.10+2.85*math.sin(math.pi*n)
                a.SetPosition(x,y,z);a.SetVisibility(1 if 0<n<1 else 0)
            else:a.SetVisibility(0)
        eye,target,angle=camera_at(t)
        self.cam.SetPosition(*eye);self.cam.SetFocalPoint(*target);self.cam.SetViewAngle(angle);self.cam.SetClippingRange(.1,130)
        self.cam.SetWindowCenter(-.72,-.015) # leave left copy enough air
    def raw(self,t):
        self.update(t);self.window.Render();self.w2i.Modified();self.w2i.Update()
        vtk_img=self.w2i.GetOutput(); dims=vtk_img.GetDimensions();data=vtk_to_numpy(vtk_img.GetPointData().GetScalars()).reshape((dims[1],dims[0],3))
        return Image.fromarray(np.flipud(data),'RGB')

def text_frame(frame,t):
    w,h=frame.size;s=w/W0
    # vignetting, subtle left matte for typography. Preserve 3D image rather than flatten.
    arr=np.asarray(frame).copy();ny,nx=arr.shape[:2]
    x=np.arange(nx)[None,:]/nx; y=np.arange(ny)[:,None]/ny
    alpha=(.68*np.maximum(0.,(0.48-x)/.48)**1.4 + .14*(y-.45)**2).clip(0,.82)
    arr=(arr*(1-alpha[...,None]) + np.array(BG)[None,None,:]*alpha[...,None]).astype('uint8')
    im=Image.fromarray(arr)
    overlay=Image.new('RGBA',frame.size,(0,0,0,0));d=ImageDraw.Draw(overlay)
    S=lambda x:int(round(x*s))
    def txt(x,y,word,size,color=INK,weight='regular',spacing=0):
        f=font(max(10,S(size)),weight)
        d.text((S(x),S(y)),word,font=f,fill=(*color,255),stroke_width=0)
    # Brand-like unobtrusive system—fictional brand, no trademark imitation.
    txt(92,68,'F O R M   /   N E T W O R K',20,INK,'medium')
    d.line((S(92),S(124),S(1828),S(124)),fill=(*MUTE,65),width=max(1,S(1)))
    txt(92,143,'DATA / 3D OPERATIONS FILM',18,MUTE,'medium')
    # Topic changes through film, aligned with camera intent.
    if t<4.7:
        lines=['A city is', 'a living system.'];little='A moving model of demand, not a flat report.'; tag='01 / EXPLORE'
    elif t<10.9:
        lines=['When one depot', 'runs out.'];little='One depot falls below the morning threshold.';tag='02 / DETECT'
    elif t<14.7:
        lines=['See the city', 'respond.'];little='Supply is rerouted before the next peak.';tag='03 / RESPOND'
    else:
        lines=['Better decisions.', 'Better flow.'];little='A decision you can actually see.';tag='04 / UNDERSTAND'
    txt(92,249,tag,19,TEAL,'medium')
    # Distinct type hierarchy: 74px display to hold at 640px preview.
    for j,line in enumerate(lines):
        txt(87,315+j*89,line,74,INK,'bold')
    txt(92,530,little,23,MUTE,'regular')
    # Callout panel and physical event are driven by the same `data_at(t)`.
    if 6.0<t<15.4:
        val=data_at(t)['north'];warn=val<=4
        px,py=S(1280),S(122)
        d.rounded_rectangle((px,py,px+S(515),py+S(175)),radius=S(12),fill=(10,25,38,232),outline=(255,255,255,60),width=S(2))
        txt(1309,144,'NORTHERN DEPOT  /  N-07',20,MUTE,'medium')
        col=(255,132,103) if warn else TEAL
        txt(1304,183,f'{val:02d}',65,col,'bold')
        txt(1417,230,'UNITS AVAILABLE',20,INK,'medium')
        d.line((S(1309),S(270),S(1760),S(270)),fill=(*col,130),width=max(1,S(3)))
    # bottom rail: honest synthetic data indicator, thin engineering style.
    d.line((S(92),S(952),S(1828),S(952)),fill=(*MUTE,65),width=max(1,S(1)))
    txt(92,979,'FICTIONAL CITY  /  SYNTHETIC DATA',17,MUTE,'medium')
    minutes=int(mix(360,540,seg(t,3.5,14.6)))
    txt(1665,979,f'{minutes//60:02d}:{minutes%60:02d}',19,INK,'medium')
    d.line((S(92),S(1034),S(92+1736*clamp(t/DURATION)),S(1034)),fill=(*TEAL,220),width=max(1,S(3)))
    return Image.alpha_composite(im.convert('RGBA'),overlay).convert('RGB')

def render_at(scene,t):return text_frame(scene.raw(t),t)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--still',type=float)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--width',type=int,default=1280)
    ap.add_argument('--fps',type=int,default=24)
    ap.add_argument('--duration',type=float,default=DURATION)
    args=ap.parse_args();args.out.parent.mkdir(parents=True,exist_ok=True)
    height=round(args.width*9/16);scene=CityScene(args.width,height)
    if args.still is not None:
        render_at(scene,args.still).save(args.out)
    else:
        ffmpeg=shutil.which('ffmpeg')
        if not ffmpeg:raise SystemExit('Need ffmpeg on PATH')
        cmd=[ffmpeg,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{args.width}x{height}', '-r',str(args.fps),'-i','pipe:','-an','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p',str(args.out)]
        p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
        for i in range(round(args.duration*args.fps)):
            t=i/args.fps
            try:p.stdin.write(render_at(scene,t).tobytes())
            except BrokenPipeError:break
            if i%max(args.fps,24)==0:print(f'{t:.1f}/{args.duration:.1f}',flush=True)
        p.stdin.close();status=p.wait()
        if status:raise SystemExit(status)
    print(args.out)

if __name__=='__main__':main()
