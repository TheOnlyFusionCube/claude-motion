#!/usr/bin/env python3
"""Generate a small original PBR-ready GLB kit; no network, no external textures.

The GLB files are portable between Blender, Three.js, and other glTF 2.0 viewers.
Objects named with a shared source mesh are reused as instances at different
transforms, not triangulated into hundreds of unique objects.

Requires: pip install trimesh numpy
Usage: python examples/blender-studio/build_assets.py
"""
from __future__ import annotations
import json
import argparse
import math
from pathlib import Path
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'assets'

# Colors from a deliberate art-directed material family (warm oxidized copper,
# satin pearl, quiet charcoal, sea glass, golden window emission cue).
PALETTE = {
    'ceramic': ([201, 215, 209, 255], .03, .53),
    'graphite': ([43, 63, 77, 255], .60, .35),
    'copper': ([193, 121, 73, 255], .77, .28),
    'glass': ([61, 142, 147, 255], .12, .23),
    'ivory': ([227, 227, 203, 255], .04, .57),
    'gold': ([242, 188, 102, 255], .65, .33),
}


def material(name):
    from trimesh.visual.material import PBRMaterial
    rgba, metal, rough = PALETTE[name]
    return PBRMaterial(name=name, baseColorFactor=rgba,
                       metallicFactor=metal, roughnessFactor=rough,
                       doubleSided=True)


def color(mesh, name):
    mesh.visual = trimesh.visual.TextureVisuals(material=material(name))
    return mesh


def box(extents, name):
    return color(trimesh.creation.box(extents=extents), name)


def cylinder(radius, height, name, sections=24):
    return color(trimesh.creation.cylinder(radius, height, sections=sections), name)


def torus(major, minor, name, count=48, sides=8):
    # Entire mesh authored once, efficient for repeated trim/fabrication rings.
    verts, faces = [], []
    for i in range(count):
        a = i*2*math.pi/count
        for j in range(sides):
            b=j*2*math.pi/sides
            rad = major + minor*math.cos(b)
            verts.append((rad*math.cos(a),rad*math.sin(a),minor*math.sin(b)))
    for i in range(count):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            c=((i+1)%count)*sides+j; d=((i+1)%count)*sides+(j+1)%sides
            faces.extend(((a,c,b),(b,c,d)))
    return color(trimesh.Trimesh(vertices=verts,faces=faces,process=False),name)


def ribbon(span, depth, base_z, arch, thickness, name, steps=28):
    """A genuinely curved, manufacturable roof, not a scaled cube."""
    verts=[]; faces=[]
    for i in range(steps+1):
        x=span*(i/steps-.5)
        z=base_z+arch*(1-(2*x/span)**2)
        for zz in (0,-thickness):
            for y in (-depth/2,depth/2):
                verts.append((x,y,z+zz))
    for i in range(steps):
        a=i*4;b=(i+1)*4
        for j,k in ((0,1),(1,3),(3,2),(2,0)):
            faces.append((a+j,b+j,b+k));faces.append((a+j,b+k,a+k))
    faces.extend(((0,2,1),(1,2,3),(steps*4,steps*4+1,steps*4+2),(steps*4+1,steps*4+3,steps*4+2)))
    return color(trimesh.Trimesh(vertices=verts,faces=faces,process=False),name)


def add(scene, mesh, name, x=0,y=0,z=0, rot_z=0):
    tf=trimesh.transformations.rotation_matrix(rot_z,(0,0,1))
    tf[:3,3]=(x,y,z)
    # Store shared mesh only ONCE; subsequent structural beams/ribs/collars
    # reference the same vertex/index buffer with independent transforms.
    # glTF's node-to-mesh reference makes the resulting GLB smaller without
    # merging materials or baking transform-dependent lighting into geometry.
    cache=getattr(scene,'_asset_cache',None)
    if cache is None:
        cache={};scene._asset_cache=cache
    key=id(mesh)
    if key not in cache:
        proto=f'prototype-{len(cache):03d}'
        scene.add_geometry(mesh,geom_name=proto,node_name=name,transform=tf)
        cache[key]=proto
    else:
        scene.graph.update(frame_to=name,frame_from=scene.graph.base_frame,
                           matrix=tf,geometry=cache[key])


def create_hub():
    scene=trimesh.Scene()
    add(scene,box((9.4,6.3,.42),'graphite'),'concourse-foundation',z=.20)
    add(scene,box((9.1,5.9,.18),'ceramic'),'concourse-terrace',z=.52)
    add(scene,box((6.75,3.95,1.35),'glass'),'glazed-terminal',z=1.32)
    # Large expressive canopy anchors the silhouette, readable from close and wide.
    add(scene,ribbon(10.1,5.15,2.5,1.14,.16,'copper'),'copper-arched-canopy')
    # Exposed metal beams, glazing breaks, legible real structure. Reused meshes.
    beam=box((.12,5.48,2.05),'graphite')
    for i,x in enumerate((-4.25,-2.55,2.55,4.25)):
        add(scene,beam,f'canopy-support-{i}',x=x,z=1.55)
    slat=box((.055,4.85,.055),'ivory')
    for i in range(19):
        x=-4.62+i*.513
        z=2.57+1.14*(1-(x/5.05)**2)
        add(scene,slat,f'roof-rib-{i}',x=x,z=z-.18)
    # Door openings are visible from the front; no wall-of-identical-cubes look.
    glazing=box((.82,.045,1.16),'graphite')
    for i in range(7):
        add(scene,glazing,f'mullion-{i}',x=-2.75+i*.92,y=-2.0,z=1.25)
    dock=box((1.23,1.7,.18),'gold')
    for i in range(4):
        add(scene,dock,f'loading-bay-{i}',x=-3.0+i*2.0,y=-3.27,z=.67)
    stair=box((3.2,.39,.11),'ivory')
    for i in range(4):
        add(scene,stair,f'public-step-{i}',x=0,y=-4.05-i*.43,z=.46-i*.09)
    # Beacon provides a focal tower: vertical shape, round profile, rings.
    add(scene,cylinder(.42,3.0,'graphite'),'beacon-shaft',x=3.85,y=1.55,z=2.39)
    beacon=torus(.68,.07,'gold')
    for i,z in enumerate((3.5,3.86,4.22)):
        add(scene,beacon,f'beacon-ring-{i}',x=3.85,y=1.55,z=z)
    add(scene,cylinder(.22,.6,'copper'),'beacon-cap',x=3.85,y=1.55,z=4.19)
    return scene


def create_silo():
    scene=trimesh.Scene()
    add(scene,cylinder(.85,2.8,'ceramic'),'reservoir',z=1.4)
    add(scene,cylinder(.91,.11,'copper'),'upper-collar',z=2.77)
    add(scene,cylinder(1.03,.18,'graphite'),'base-ring',z=.1)
    add(scene,cylinder(.22,.82,'gold'),'telemetry-mast',z=3.15)
    guard=torus(.93,.04,'graphite')
    for i,z in enumerate((.6,1.8,2.48)):
        add(scene,guard,f'steel-belt-{i}',z=z)
    # Four exterior structural feet, distinct from main geometry.
    leg=box((.16,.2,.78),'copper')
    for i,(x,y) in enumerate(((-.78,0),(.78,0),(0,.78),(0,-.78))):
        add(scene,leg,f'foot-{i}',x=x,y=y,z=.40)
    return scene


def create_courtyard():
    scene=trimesh.Scene()
    add(scene,box((3.2,3.1,.22),'graphite'),'foundation',z=.11)
    add(scene,box((3,1.15,1.2),'ivory'),'north-wing',y=0.96,z=.78)
    add(scene,box((.8,2.1,1.0),'ceramic'),'east-wing',x=1.10,y=-.44,z=.70)
    add(scene,box((.8,2.1,1.0),'ceramic'),'west-wing',x=-1.10,y=-.44,z=.70)
    add(scene,box((1.34,1.2,.07),'glass'),'water-court',y=-.68,z=.24)
    add(scene,cylinder(.30,.55,'copper',sections=16),'courtyard-sculpture',y=-.68,z=.55)
    beam=box((.06,.45,.14),'gold')
    for i in range(8):
        add(scene,beam,f'pergola-{i}',x=-1.3+i*.38,y=-.28,z=1.18)
    return scene


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out',type=Path,default=ROOT,help='Root folder holding the asset-manifest.json')
    args=ap.parse_args()
    assets=args.out/'assets'
    assets.mkdir(parents=True,exist_ok=True)
    rows=[]
    for name,fn,role in [('transit-hub',create_hub,'hero'),('reservoir',create_silo,'support'),('courtyard',create_courtyard,'environment')]:
        sc=fn(); p=assets / (name+'.glb')
        p.write_bytes(sc.export(file_type='glb'))
        unique_triangles=sum(len(g.faces) for g in sc.geometry.values())
        rows.append({'file':'assets/'+p.name,'role':role,'license':'CC0-1.0',
                     'attribution':'Original claude-motion procedural asset',
                     'usage': 'authored structural geometry, no external textures',
                     'notes':f'{unique_triangles} authored triangles before instancing'})
        print(f'{p.name}: {p.stat().st_size} bytes; {unique_triangles} unique triangles; {len(sc.graph.nodes_geometry)} nodes')
    manifest={'version':1,'project':'Studio City Asset Kit','assets':rows,'visualTarget':'premium-stylized-architectural'}
    (args.out/'asset-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__':main()
