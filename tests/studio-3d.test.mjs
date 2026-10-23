import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const root3d=join(root,'examples','studio-city-film');
const src=readFileSync(join(root3d,'render.py'),'utf8');
const skill=readFileSync(join(root,'SKILL.md'),'utf8');

test('actual renderer path exists and Pillow proxy is demoted',()=>{
  assert.ok(existsSync(join(root3d,'render.py')));
  assert.ok(existsSync(join(root3d,'requirements.txt')));
  assert.match(src,/vtk\.vtkGlyph3DMapper/);
  assert.match(src,/vtk\.vtkRenderer/);
  assert.match(src,/vtk\.vtkLight/);
  assert.match(src,/GetProperty\(\)\.SetColor/);
  assert.match(skill,/cinematic-3d\.md/);
  assert.match(skill,/Pillow polygon projection/);
});
test('new example declares real 3D and honest visual limitations',()=>{
  const contract=JSON.parse(readFileSync(join(root3d,'scene-contract.json'),'utf8'));
  assert.equal(contract.renderer,'vtk-egl-opengl');
  assert.equal(contract.dataStatus,'synthetic');
  assert.ok(contract.cameraKeysSeconds.length>=5);
  assert.ok(contract.visualActions.includes('reroute-supply'));
  assert.ok(contract.visualLimitations.length>=2);
  assert.ok(contract.duration>10 && contract.duration<=30);
});

const haveVTK=spawnSync('python3',['-c','import vtk, PIL, numpy'],{stdio:'ignore'}).status===0;
test('optional VTK smoke: sample genuine renderer and deterministic data', {skip:!haveVTK},()=>{
  const py=String.raw`
import importlib.util, math
p=${JSON.stringify(join(root3d,'render.py'))}
spec=importlib.util.spec_from_file_location('studio',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert m.data_at(4.0)['north']==24
assert m.data_at(10.5)['north']==0
assert m.data_at(15.2)['north']==16
assert m.camera_at(0)!=m.camera_at(9.3)
s=m.CityScene(400,225)
a=s.raw(1.7).tobytes()
b=s.raw(10.1).tobytes()
c=s.raw(1.7).tobytes()
assert a==c, 'Re-seeking to the same absolute time must produce the same pixels'
assert a!=b, 'Actual movie frames must change with time'
assert max(a)>64 and max(b)>64, 'Do not ship solid-black 3D frames'
`;
  const r=spawnSync('python3',['-c',py],{cwd:root,encoding:'utf8',timeout:60000});
  assert.equal(r.status,0,`${r.stdout}\n${r.stderr}`);
});
