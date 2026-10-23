#!/usr/bin/env python3
"""Audit a local glTF/GLB kit without running Blender or installing packages.

Usage:
 python3 scripts/3d-preflight.py examples/blender-studio/asset-manifest.json --budget desktop --strict
 python3 scripts/3d-preflight.py ./asset-manifest.json --budget web --json

This is a cost/rights preflight, not a substitute for rendering two real frames.
"""
from __future__ import annotations
import argparse
import json
import os
import struct
from pathlib import Path
from urllib.parse import urlparse, unquote

BUDGETS = {
    'web': {'triangles': 500_000, 'renderedTriangles': 2_000_000, 'drawCalls': 500, 'texturePixels': 12_000_000, 'assetMB': 40},
    'desktop': {'triangles': 2_000_000, 'renderedTriangles': 8_000_000, 'drawCalls': 1600, 'texturePixels': 48_000_000, 'assetMB': 250},
    'film': {'triangles': 8_000_000, 'renderedTriangles': 40_000_000, 'drawCalls': 6000, 'texturePixels': 192_000_000, 'assetMB': 1000},
}


def local_uri(root, uri, issues, label):
    if not isinstance(uri,str):
        issues.append(f'{label}: invalid resource URI');return None
    if uri.startswith('data:'):
        return None
    parsed=urlparse(uri)
    if parsed.scheme or parsed.netloc or uri.startswith(('//', '/', '\\')):
        issues.append(f'{label}: remote/absolute URI forbidden: {uri[:80]}');return None
    name=unquote(parsed.path)
    if not name or '?' in name or '#' in name:
        issues.append(f'{label}: invalid local URI');return None
    path=(root/name).resolve()
    if not path.is_relative_to(root.resolve()):
        issues.append(f'{label}: path escapes asset directory: {name}');return None
    if not path.is_file():
        issues.append(f'{label}: missing file: {name}');return None
    return path


def parse_gltf(path, issues):
    if path.suffix.lower()=='.gltf':
        return json.loads(path.read_text('utf8')),None
    data=path.read_bytes()
    if len(data)<20 or data[:4]!=b'glTF' or struct.unpack_from('<I',data,4)[0]!=2:
        raise ValueError('not a glTF 2.0 GLB')
    total=struct.unpack_from('<I',data,8)[0]
    if total!=len(data):raise ValueError(f'GLB length mismatch: header {total}, file {len(data)}')
    offset=12;doc=None;binary=None
    while offset+8<=len(data):
        size,code=struct.unpack_from('<II',data,offset);offset+=8
        if offset+size>len(data):raise ValueError('GLB chunk size exceeds file')
        chunk=data[offset:offset+size];offset+=size
        if code==0x4e4f534a:doc=json.loads(chunk.decode('utf8').strip(' \t\r\n\0'))
        if code==0x004e4942:binary=chunk
    if offset!=len(data):raise ValueError('trailing incomplete chunk')
    if not doc:raise ValueError('GLB JSON chunk missing')
    return doc,binary


def triangle_count(p,accessors):
    mode=p.get('mode',4)
    idx=p.get('indices');pos=p.get('attributes',{}).get('POSITION')
    if idx is not None and 0<=idx<len(accessors):cnt=accessors[idx].get('count',0)
    elif pos is not None and 0<=pos<len(accessors):cnt=accessors[pos].get('count',0)
    else:return 0
    if mode==4:return cnt//3
    if mode in (5,6):return max(0,cnt-2)
    return 0


def inspect_asset(path):
    issues=[]
    doc,binary=parse_gltf(path,issues)
    if doc.get('asset',{}).get('version')!='2.0':issues.append('expected glTF 2.0')
    accessors=doc.get('accessors',[]);meshes=doc.get('meshes',[])
    nodes=doc.get('nodes',[]);scenes=doc.get('scenes',[])
    materials=doc.get('materials',[])
    mesh_tris=[[triangle_count(p,accessors) for p in mesh.get('primitives',[])] for mesh in meshes]
    unique=sum(map(sum,mesh_tris))
    rendered=0; drawcalls=0; objects=0;instance_count=0
    def traverse(node_i,depth=0):
        nonlocal rendered,drawcalls,objects,instance_count
        if depth>128:issues.append('node graph depth > 128 / possible cycle');return
        if not isinstance(node_i,int) or not 0<=node_i<len(nodes):issues.append('scene references invalid node');return
        nd=nodes[node_i];mesh_id=nd.get('mesh')
        if mesh_id is not None:
            if not 0<=mesh_id<len(mesh_tris):issues.append('node references invalid mesh')
            else:
                inst=nd.get('extensions',{}).get('EXT_mesh_gpu_instancing',{}).get('attributes',{})
                cnt=1
                for name,a in inst.items():
                    if isinstance(a,int) and 0<=a<len(accessors):cnt=max(cnt,accessors[a].get('count',1))
                objects+=1;instance_count+=cnt
                rendered+=cnt*sum(mesh_tris[mesh_id]);drawcalls+=len(mesh_tris[mesh_id])
        for child in nd.get('children',[]):traverse(child,depth+1)
    chosen=doc.get('scene',0)
    if scenes and 0<=chosen<len(scenes):
        for node in scenes[chosen].get('nodes',[]):traverse(node)
    else:
        for node in range(len(nodes)):traverse(node)
    image_pixels=0
    for i,image in enumerate(doc.get('images',[])):
        image_bytes=None
        if 'uri' in image:
            p=local_uri(path.parent,image['uri'],issues,f'image {i}')
            if p:image_bytes=p.read_bytes()
        elif binary is not None and 'bufferView' in image:
            idx=image['bufferView'];views=doc.get('bufferViews',[])
            if isinstance(idx,int) and 0<=idx<len(views):
                v=views[idx]
                if v.get('buffer',0)==0:
                    start=v.get('byteOffset',0);size=v.get('byteLength',0)
                    image_bytes=binary[start:start+size]
        if image_bytes:
            try:
                from PIL import Image
                from io import BytesIO
                with Image.open(BytesIO(image_bytes)) as im:
                    image_pixels+=im.width*im.height
                    if max(im.size)>4096:issues.append(f'image {i}: {im.size} exceeds 4K; consider targeted downsampling')
            except ImportError:
                if image_bytes[:8]==b'\x89PNG\r\n\x1a\n' and len(image_bytes)>24:
                    w,h=struct.unpack('>II',image_bytes[16:24]);image_pixels+=w*h
            except Exception as e:
                issues.append(f'image {i}: unreadable embedded texture ({type(e).__name__})')
    for i,b in enumerate(doc.get('buffers',[])):
        if 'uri' in b:local_uri(path.parent,b['uri'],issues,f'buffer {i}')
    extensions=doc.get('extensionsRequired',[])
    for ext in extensions:
        if ext in ('EXT_meshopt_compression','KHR_draco_mesh_compression','KHR_texture_basisu'):
            issues.append(f'REQUIREMENT: {ext}; ensure your target loader has a compatible decoder')
    return {'file':str(path),'bytes':path.stat().st_size,'meshCount':len(meshes),
            'materialCount':len(materials),'nodeCount':len(nodes),'visibleMeshes':objects,
            'instances':instance_count,'triangles':unique,'renderedTriangles':rendered,
            'drawCalls':drawcalls,'texturePixels':image_pixels,'issues':issues,
            'extensionsRequired':extensions}


def audit_manifest(filename,budget='desktop'):
    root=filename.resolve().parent
    m=json.loads(filename.read_text('utf8'))
    if not isinstance(m.get('assets'),list):raise ValueError('asset manifest needs an assets array')
    errors=[];warnings=[];rows=[]
    for i,item in enumerate(m['assets']):
        if not isinstance(item,dict):errors.append(f'item {i} is not an object');continue
        for required in ('file','license','attribution','role'):
            if not item.get(required):errors.append(f'asset {i}: required provenance field {required} missing')
        uri=item.get('file')
        if not uri:continue
        p=local_uri(root,uri,errors,f'asset {i}')
        if p is None:continue
        if p.suffix.lower() not in ('.glb','.gltf'):
            errors.append(f'asset {i}: expected .glb or .gltf');continue
        try:stat=inspect_asset(p)
        except Exception as e:
            errors.append(f'asset {i}: {type(e).__name__}: {e}');continue
        stat['role']=item.get('role')
        # Loader requirements are warnings, not errors; may be intentionally bundled.
        warnings.extend(f'{uri}: {message}' for message in stat['issues'])
        rows.append(stat)
    totals={key:sum(r[key] for r in rows) for key in ('bytes','triangles','renderedTriangles','drawCalls','texturePixels')}
    totals['assetMB']=round(totals.pop('bytes')/(1024*1024),3)
    for key,limit in BUDGETS[budget].items():
        if totals[key]>limit:warnings.append(f'Budget {budget}: {key}={totals[key]:,} exceeds suggested {limit:,}')
    if not any(r.get('role')=='hero' for r in rows):warnings.append('No hero-role model. Cinematic 3D requires a readable focal object.')
    return {'manifest':str(filename),'budget':budget,'assets':rows,'totals':totals,'errors':errors,'warnings':warnings,
            'status':'fail' if errors or warnings else 'pass'}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('manifest',type=Path);p.add_argument('--budget',choices=BUDGETS,default='desktop')
    p.add_argument('--strict',action='store_true');p.add_argument('--json',action='store_true')
    args=p.parse_args()
    try:report=audit_manifest(args.manifest,args.budget)
    except Exception as e:raise SystemExit(f'ERROR: {e}')
    if args.json:print(json.dumps(report,indent=2))
    else:
        print(f"3D ASSET PREFLIGHT | {report['budget']} | {len(report['assets'])} assets")
        for a in report['assets']:
            print(f"  {Path(a['file']).name}: {a['meshCount']} meshes, {a['triangles']:,} source / {a['renderedTriangles']:,} visible tris; {a['drawCalls']} estimated draw calls; {a['materialCount']} materials")
        print('  totals:',report['totals'])
        for label in ('errors','warnings'):
            for msg in report[label]:print(f'  {label[:-1].upper()}: {msg}')
    if report['errors'] or (args.strict and report['warnings']):raise SystemExit(1)

if __name__=='__main__':main()
