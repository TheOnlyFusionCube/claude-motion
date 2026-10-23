#!/usr/bin/env python3
"""Optional gltfpack wrapper: conservative by default, explicit codec/LOD opt-ins.

This optimizer is NOT mandatory for offline renders. Installing gltfpack is an
optional build-time step; do not download it from arbitrary mirrors. If `-cc`
is enabled the viewer must implement EXT_meshopt_compression; KTX2 additionally
requires KHR_texture_basisu. Review the resulting model before release.

Examples:
 python3 scripts/3d-optimize.py hero.glb --out hero-opt.glb --dry-run
 python3 scripts/3d-optimize.py environment.glb --out environment-opt.glb --meshopt --instancing
 python3 scripts/3d-optimize.py background.glb --out background-lod.glb --simplify .55
"""
import argparse
from pathlib import Path
import shutil
import subprocess
import sys


def command(input_path,output_path,meshopt=False,ktx2=False,instancing=False,simplify=None):
    args=['gltfpack','-i',str(input_path),'-o',str(output_path),'-kn','-km','-ke']
    if instancing:args.append('-mi')
    if meshopt:args.append('-cc')
    if ktx2:args.append('-tc')
    if simplify is not None:
        if not 0.0<simplify<=1.0:raise ValueError('simplify must be (0, 1]')
        args.extend(['-si',str(simplify)])
    return args


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('input',type=Path);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--meshopt',action='store_true');p.add_argument('--ktx2',action='store_true')
    p.add_argument('--instancing',action='store_true');p.add_argument('--simplify',type=float)
    p.add_argument('--dry-run',action='store_true')
    a=p.parse_args()
    if not a.input.is_file() or a.input.suffix.lower() not in ('.gltf','.glb'):p.error('input must be an existing .glb/.gltf')
    if a.input.resolve()==a.out.resolve():p.error('never overwrite the original source asset')
    if a.simplify is not None and a.simplify<.99:
        print('WARNING: mesh simplification may erase silhouette/hero detail; use on background LOD only.',file=sys.stderr)
    if a.meshopt:print('REQUIRES: EXT_meshopt_compression decoder in your glTF player',file=sys.stderr)
    if a.ktx2:print('REQUIRES: KHR_texture_basisu/KTX2 decoder in your glTF player',file=sys.stderr)
    try:cmd=command(a.input,a.out,a.meshopt,a.ktx2,a.instancing,a.simplify)
    except ValueError as e:p.error(str(e))
    print('Command:', ' '.join(cmd),flush=True)
    if a.dry_run:return
    if not shutil.which('gltfpack'):
        raise SystemExit('gltfpack not installed. Install from the trusted meshoptimizer project; use --dry-run to inspect flags.')
    a.out.parent.mkdir(parents=True,exist_ok=True)
    r=subprocess.run(cmd,check=False)
    if r.returncode or not a.out.is_file() or a.out.stat().st_size==0:
        raise SystemExit('gltfpack optimization failed; original source remains untouched')
    print(f'Complete: {a.input.stat().st_size:,} bytes => {a.out.stat().st_size:,} bytes; inspect visually before use')

if __name__=='__main__':main()
