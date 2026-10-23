#!/usr/bin/env python3
"""Camera-directed, asset-led Blender 4.x studio miniature.

Run with Blender, not regular Python (bpy is part of Blender):
  blender --background --python stage.py -- --quality draft --time 8.0 --out /tmp/shot.png
  blender --background --python stage.py -- --quality review --time 13.0 --width 1280 --out /tmp/close.png
  blender --background --python stage.py -- --quality final --time 9.0 --width 1920 --out /tmp/hero.png
  blender --background --python stage.py -- --quality review --save-blend /tmp/shot.blend --no-render

This script is a reusable *studio starting scene*, not a drop-in substitute for
art direction. Render two stills and look at them before committing to animation.
One central model kit is imported exactly once. Other instances are cheap linked
collection instances. Lights share a deliberate softbox/key/fill/rim approach.
"""
from __future__ import annotations
import argparse
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def parse_args():
    argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    p=argparse.ArgumentParser()
    p.add_argument('--quality',choices=('draft','review','final'),default='draft')
    p.add_argument('--engine',choices=('auto','eevee','cycles'),default='auto')
    p.add_argument('--width',type=int,default=1280)
    p.add_argument('--time',type=float,default=9.)
    p.add_argument('--out',type=Path,default=Path('/tmp/claude-motion-studio.png'))
    p.add_argument('--save-blend',type=Path)
    p.add_argument('--animation',action='store_true',help='Render timestamp-exact PNG sequence (requires time)')
    p.add_argument('--fps',type=int,default=24)
    p.add_argument('--duration',type=float,default=18.0)
    p.add_argument('--start-frame',type=int,default=1,help='1-based inclusive; use for chunking')
    p.add_argument('--end-frame',type=int,default=None,help='1-based inclusive; use for chunking')
    p.add_argument('--no-render',action='store_true')
    p.add_argument('--gpu',action='store_true',help='Attempt Cycles GPU; fall back to CPU if unavailable')
    return p.parse_args(argv)


def sat(v):return max(0.0,min(1.0,v))

def ease(v):
    v=sat(v);return v*v*(3-2*v)

def lerp(a,b,p):return a+(b-a)*p

def tween(t,a,b):return ease((t-a)/(b-a)) if a!=b else float(t>=b)


def data_at(t):
    loss=tween(t,5.5,9.5);recovery=tween(t,12.0,15.2)
    return int(round(lerp(24*(1-loss),16,recovery)))

# Camera poses are in world meters; deterministic, no accumulation. The final
# shot is wider to recover spatial context after the close on the signal.
CAMERA=[
    (0.0,(19,-25,19),(0,0,1.7),41),
    (4.1,(19,-25,19),(0,0,1.7),41),
    (7.0,(10.5,-17.5,11.0),(0,-.3,1.9),64),
    (10.5,(7.9,-12.2,7.8),(0,0,2.0),80),
    (12.7,(7.9,-12.2,7.8),(0,0,2.0),80),
    (16.5,(18,-22,17),(0,0,1.7),48),
    (18.0,(19,-25,19),(0,0,1.7),41),
]


def camera_at(t):
    for i in range(len(CAMERA)-1):
        a,b=CAMERA[i:i+2]
        if t<=b[0]:
            p=tween(t,a[0],b[0]);return (tuple(lerp(a[1][k],b[1][k],p) for k in range(3)),
                                           tuple(lerp(a[2][k],b[2][k],p) for k in range(3)),
                                           lerp(a[3],b[3],p))
    return CAMERA[-1][1:]


def mat(bpy,name,rgb,metal=0.0,rough=.65,emission=0.0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*rgb,1)
    bs.inputs['Metallic'].default_value=metal
    bs.inputs['Roughness'].default_value=rough
    if emission:
        for key,val in [('Emission Color',(*rgb,1)),('Emission Strength',emission)]:
            if bs.inputs.get(key):bs.inputs[key].default_value=val
    return m


def cube(bpy,name,location,scale,material,bevel=0.):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    ob=bpy.context.object;ob.name=name
    ob.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(material)
    if bevel:
        mod=ob.modifiers.new('small physical edge / catch highlight','BEVEL')
        mod.width=bevel;mod.segments=2
        normal=ob.modifiers.new('corner normals','WEIGHTED_NORMAL');normal.keep_sharp=True
    return ob


def cylinder(bpy,name,location,radius,depth,material,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=location)
    ob=bpy.context.object;ob.name=name;ob.data.materials.append(material)
    bevel=ob.modifiers.new('molded edge','BEVEL');bevel.width=.035;bevel.segments=2
    normal=ob.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return ob


def load_asset_collection(bpy,name):
    path=ROOT/'assets'/(name+'.glb')
    if not path.is_file():raise RuntimeError(f'Missing {path}. Run build_assets.py first.')
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    added=set(bpy.data.objects)-before
    collection=bpy.data.collections.new('ASSET / '+name)
    # Keep the collection unlinked from the render scene: only lightweight
    # collection instances are visible, so the original is not double-drawn.
    for ob in added:
        for old in tuple(ob.users_collection):old.objects.unlink(ob)
        collection.objects.link(ob)
    return collection


def instance(bpy,collection,name,loc=(0,0,0),rot=0,scale=1):
    ob=bpy.data.objects.new(name,None)
    bpy.context.scene.collection.objects.link(ob)
    ob.instance_type='COLLECTION';ob.instance_collection=collection
    ob.location=loc;ob.rotation_euler.z=rot
    ob.scale=(scale,scale,scale)
    return ob


def area(bpy,name,location,color,power,size,target):
    from mathutils import Vector
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o)
    o.location=location;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()


def aim(obj,target):
    from mathutils import Vector
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def build_scene(bpy):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.users==0:bpy.data.collections.remove(collection)
    scene=bpy.context.scene
    ceramic=mat(bpy,'SURFACE / pearl stone',(.63,.76,.72),.03,.56)
    asphalt=mat(bpy,'SURFACE / graphite concrete',(.045,.075,.085),.12,.68)
    brass=mat(bpy,'TRIM / champagne bronze',(.73,.42,.19),.75,.28)
    mint=mat(bpy,'EMISSION / signal mint',(.14,.94,.77),.1,.24,emission=1.3)
    danger=mat(bpy,'EMISSION / exhausted',(.99,.18,.095),.1,.37,emission=.7)
    water=mat(bpy,'SURFACE / quiet water',(.03,.23,.25),.16,.16)
    garden=mat(bpy,'SURFACE / living moss',(.12,.24,.18),0,.84)
    # Actual softbox studio. Render shadows come from fixtures, not 2D painted tricks.
    area(bpy,'KEY / north-west octabox',(-11,-13,19),(1.0,.86,.73),2400,12,(0,0,0))
    area(bpy,'FILL / cool bounce',(12,-3,12),(.63,.82,1.0),1000,15,(0,0,0))
    area(bpy,'RIM / skyline',(3,13,17),(.93,1.,.98),3100,10,(0,0,0))
    world=bpy.data.worlds.new('Studio / midnight blue')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.035,.058,.073,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.22
    scene.world=world
    # Stage and landscape: no omnipresent checkerboard streets.
    cube(bpy,'heroist display plinth',(0,0,-.40),(21,17,.8),asphalt,.33)
    cube(bpy,'upper civic platform',(0,0,.035),(20.2,16.2,.13),ceramic,.14)
    cube(bpy,'road axis N-S',(4.7,.1,.13),(.9,15.5,.055),asphalt,.055)
    cube(bpy,'road axis E-W',(0,-5.1,.13),(17.7,.86,.055),asphalt,.055)
    cube(bpy,'urban water basin',(-6.9,3.6,.18),(3.8,3.4,.1),water,.14)
    # Hero is one imported asset — recognizable curved roof, support struts,
    # interior mullions, copper beacon. It carries the key action.
    hub=load_asset_collection(bpy,'transit-hub')
    instance(bpy,hub,'HERO / central transit hall',(0,0,.22),rot=.10)
    reservoir=load_asset_collection(bpy,'reservoir')
    for i,(x,y) in enumerate(((-7.,-3.),(7.1,2.5),(7.3,-3.3))):
        instance(bpy,reservoir,f'INFRA / reservoir-{i}',(x,y,.2),rot=.4*i,scale=.88+i*.05)
    court=load_asset_collection(bpy,'courtyard')
    for i,(x,y,turn,s) in enumerate(((-6.4,1.1,-.18,1.),(-4.6,5.2,.25,.87),(4.1,5.0,.32,.98),(-3.3,-5.9,0,.72))):
        instance(bpy,court,f'NEIGHBORHOOD / mixed-use {i}',(x,y,.13),turn,s)
    # Curated, not duplicated urban silhouette: quiet lawns, planters, a
    # navigation promenade. Model density is deliberately low around hero.
    for i,(x,y) in enumerate(((-2.4,5.1),(-.6,5.1),(1.2,5.1),(3.0,5.1))):
        cube(bpy,f'landscape / ground patch {i}',(x,y,.2),(1.4,1.3,.09),garden,.13)
        cylinder(bpy,f'landscape / tree trunk {i}',(x,y,.54),.065,.64,brass,12)
        # Icosphere canopy reads organic, not another box.
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.42,location=(x,y,.93))
        bpy.context.object.name=f'landscape / sculpted tree {i}';bpy.context.object.data.materials.append(garden)
    for i in range(6):
        # Architectural track lights: pooled highlights on stage.
        x=-4.4+i*1.7
        cube(bpy,f'promenade LED rail {i}',(x,-4.5,.23),(.75,.07,.025),mint,.02)
    # Physically modeled source-driven telemetry. It matches the count on
    # the rendered graphic; no manually animated text copied from another value.
    signal=cylinder(bpy,'DATA / physical depot level',(3.85,1.57,1.4),.21,2.0,mint,28)
    signal.data.materials.clear();signal.data.materials.append(mint)
    warning=cylinder(bpy,'DATA / alert torus pedestal',(3.85,1.57,.35),.55,.18,danger,30)
    # Path physically links three sites; reveal by bevel factor at absolute time.
    curve=bpy.data.curves.new('SUPPLY / route in world coordinates','CURVE')
    curve.dimensions='3D';curve.resolution_u=20;curve.bevel_depth=.035;curve.bevel_resolution=3
    poly=curve.splines.new('BEZIER');poly.bezier_points.add(3)
    controls=[(-7,-3,1.8),(-2.5,-3.8,3.8),(2.1,-2.3,3.7),(3.85,1.57,4.0)]
    for i,(x,y,z) in enumerate(controls):
        pt=poly.bezier_points[i];pt.co=(x,y,z);pt.handle_left_type='AUTO';pt.handle_right_type='AUTO'
    ob=bpy.data.objects.new('SUPPLY / world-space route',curve)
    scene.collection.objects.link(ob);ob.data.materials.append(brass)
    # Presentation camera (real physical lens and motion, not a 2D scale).
    cam_data=bpy.data.cameras.new('Camera / directed lens')
    cam=bpy.data.objects.new('Camera / directed lens',cam_data)
    scene.collection.objects.link(cam);scene.camera=cam
    cam_data.dof.use_dof=False  # avoid soft unreadable live data; optional later macro review
    scene.render.film_transparent=False
    return {'signal':signal,'mint':mint,'danger':danger,'curve':curve,'camera':cam,'warning':warning}


def apply_at(bpy,objects,t):
    value=data_at(t)
    signal=objects['signal']
    h=.15+2.15*value/24
    # Cylinder created at center z=1.4, native depth 2; anchor bottom at .50.
    signal.scale.z=h/2
    signal.location.z=.5+h/2
    signal.data.materials.clear()
    signal.data.materials.append(objects['danger'] if value<=4 else objects['mint'])
    objects['warning'].hide_render=value>4
    objects['warning'].hide_viewport=value>4
    objects['curve'].bevel_factor_end=tween(t,10.2,13.6)
    eye,target,lens=camera_at(t)
    cam=objects['camera'];cam.location=eye;cam.data.lens=lens;aim(cam,target)
    # Optional renderer may be invoked at any arbitrary frame in any order.
    return value


def configure_render(bpy,args):
    sc=bpy.context.scene
    sc.render.resolution_x=args.width
    sc.render.resolution_y=round(args.width*9/16)
    sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG'
    sc.render.film_transparent=False
    sc.render.use_file_extension=True
    sc.render.film_transparent=False
    engine='cycles' if (args.engine=='cycles' or args.quality=='final' and args.engine=='auto') else 'eevee'
    if engine=='cycles':
        sc.render.engine='CYCLES';sc.cycles.samples={'draft':16,'review':48,'final':128}[args.quality]
        if hasattr(sc.cycles,'use_denoising'):sc.cycles.use_denoising=True
        elif hasattr(bpy.context.view_layer,'cycles'):
            bpy.context.view_layer.cycles.use_denoising=True
        sc.cycles.max_bounces=5
        sc.render.use_persistent_data=True
        if args.gpu:
            try:
                sc.cycles.device='GPU'
            except Exception:print('GPU unavailable; using CPU',flush=True);sc.cycles.device='CPU'
    else:
        supported={e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
        preferred='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in supported else 'BLENDER_EEVEE'
        if preferred not in supported:raise RuntimeError(f'No EEVEE render engine found; available: {supported}')
        sc.render.engine=preferred
        if hasattr(sc,'eevee') and hasattr(sc.eevee,'taa_render_samples'):
            sc.eevee.taa_render_samples={'draft':16,'review':32,'final':64}[args.quality]
    try:
        sc.view_settings.view_transform='AgX'
    except TypeError:
        sc.view_settings.view_transform='Filmic'
    # Color-correct, not fake contrast achieved via crushing shadows.
    try:sc.view_settings.look='Medium High Contrast'
    except TypeError:pass


def main():
    import bpy
    args=parse_args()
    if args.width<320 or args.width>7680:raise SystemExit('--width outside supported range')
    objs=build_scene(bpy)
    configure_render(bpy,args)
    v=apply_at(bpy,objs,args.time)
    bpy.context.view_layer.update()
    if args.save_blend:
        args.save_blend.parent.mkdir(parents=True,exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(args.save_blend.resolve()))
        print('Saved editable Blender project:',args.save_blend)
    if not args.no_render:
        if args.animation:
            if args.fps not in (24,25,30,60):raise SystemExit('fps must be 24, 25, 30 or 60')
            if args.duration<=0 or args.duration>300:raise SystemExit('duration outside 0..300')
            scene=bpy.context.scene
            scene.render.fps=args.fps
            scene.frame_start=args.start_frame
            scene.frame_end=args.end_frame or round(args.duration*args.fps)
            if scene.frame_start<1 or scene.frame_end<scene.frame_start:
                raise SystemExit('invalid frame range')
            def on_frame(scene):
                apply_at(bpy,objs,(scene.frame_current-1)/args.fps)
            bpy.app.handlers.frame_change_pre.append(on_frame)
            args.out.mkdir(parents=True,exist_ok=True)
            scene.render.filepath=str((args.out/'frame_######').resolve())
            bpy.ops.render.render(animation=True)
            print(f'Rendered frames {scene.frame_start}..{scene.frame_end} to {args.out}; no intermediate video')
        else:
            args.out.parent.mkdir(parents=True,exist_ok=True)
            bpy.context.scene.render.filepath=str(args.out.resolve())
            bpy.ops.render.render(write_still=True)
            print(f'Saved {args.out}; value {v}; time {args.time:.2f}; quality {args.quality}')

if __name__=='__main__':main()
