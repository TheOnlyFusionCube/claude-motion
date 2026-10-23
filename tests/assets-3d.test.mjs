import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=join(root,'examples/blender-studio/asset-manifest.json');
const pf=join(root,'scripts/3d-preflight.py');
const optimize=join(root,'scripts/3d-optimize.py');
const assetRoot=join(root,'examples/blender-studio');
const run=(script,args,timeout=30000)=>spawnSync('python3',[script,...args],{encoding:'utf8',timeout,cwd:root});
const have=(name)=>spawnSync('python3',['-c',`import ${name}`],{stdio:'ignore'}).status===0;

test('bundled glTF kit has a real focal asset and passes small web budget',()=>{
  const r=run(pf,[manifest,'--budget','web','--strict','--json']);
  assert.equal(r.status,0,r.stderr+'\n'+r.stdout);
  const a=JSON.parse(r.stdout);
  assert.equal(a.assets.length,3);
  assert.equal(a.status,'pass');
  assert.equal(a.totals.triangles,2584);
  assert.equal(a.totals.renderedTriangles,6172);
  assert.ok(a.assets[0].meshCount<a.assets[0].visibleMeshes,'GLB reuses geometries through named nodes');
  assert.ok(a.totals.assetMB<.15);
  assert.equal(a.totals.texturePixels,0);
  assert.ok(a.assets.some(r=>r.role==='hero'));
  for(const item of a.assets){assert.ok(item.meshCount>=1);assert.ok(item.materialCount>=1);assert.ok(item.drawCalls>0)}
});

test('preflight rejects unlicensed and remote model references',()=>{
  const dir=mkdtempSync(join(tmpdir(),'3d-preflight-'));
  try{
    const bad={version:1,assets:[{file:'https://example.com/trick.glb',role:'hero'},
      {file:'../outside.glb',role:'support',license:'CC0-1.0',attribution:'no'}]};
    const path=join(dir,'asset-manifest.json');writeFileSync(path,JSON.stringify(bad));
    const r=run(pf,[path,'--strict','--json']);
    assert.equal(r.status,1);
    const o=JSON.parse(r.stdout);
    assert.match(o.errors.join(';'),/required provenance field license missing/);
    assert.match(o.errors.join(';'),/remote\/absolute URI forbidden/);
    assert.match(o.errors.join(';'),/path escapes asset directory/);
  }finally{rmSync(dir,{recursive:true,force:true})}
});

test('optimizer is opt-in, source-preserving, and warns when decoder is required',()=>{
  const src=join(assetRoot,'assets/transit-hub.glb');
  const a=run(optimize,[src,'--out','/tmp/new-safe.glb','--dry-run']);
  assert.equal(a.status,0,a.stderr);
  assert.match(a.stdout,/-kn -km -ke/);
  assert.doesNotMatch(a.stdout,/ -cc| -tc| -si /);
  const b=run(optimize,[src,'--out','/tmp/new-safe.glb','--dry-run','--meshopt','--ktx2','--instancing']);
  assert.equal(b.status,0,b.stderr);
  assert.match(b.stdout,/-cc/);assert.match(b.stdout,/-tc/);assert.match(b.stdout,/-mi/);
  assert.match(b.stderr,/EXT_meshopt_compression/);assert.match(b.stderr,/KHR_texture_basisu/);
  const c=run(optimize,[src,'--out',src,'--dry-run']);
  assert.notEqual(c.status,0,'in-place optimization must be refused');
});

test('Blender script is parseable without Blender; exposes a real camera and lighting rig',()=>{
  const p=join(assetRoot,'stage.py');
  const compiled=spawnSync('python3',['-m','py_compile',p],{encoding:'utf8'});
  assert.equal(compiled.status,0,compiled.stderr);
  const s=readFileSync(p,'utf8');
  for (const snippet of ['bpy.ops.import_scene.gltf','COLLECTION',"new(name,'AREA')",'data_at(t)','camera_at(t)','frame_change_pre','sc.cycles.samples','--animation'])
    assert.ok(s.includes(snippet),`missing production feature ${snippet}`);
});

test('optional asset-regeneration uses a separate output directory',{skip:!have('trimesh')||!have('numpy')},()=>{
  const dir=mkdtempSync(join(tmpdir(),'3d-generated-'));
  try{
    const r=run(join(assetRoot,'build_assets.py'),['--out',dir],60000);
    assert.equal(r.status,0,r.stderr);
    assert.ok(existsSync(join(dir,'assets/transit-hub.glb')));
    const chk=run(pf,[join(dir,'asset-manifest.json'),'--strict','--budget','web']);
    assert.equal(chk.status,0,chk.stderr);
  }finally{rmSync(dir,{recursive:true,force:true})}
});

test('optional real 3D importer opens authored GLB', {skip:!have('vtk')},()=>{
  const glb=join(assetRoot,'assets/transit-hub.glb');
  const py=String.raw`
import vtk
w=vtk.vtkRenderWindow();w.SetSize(320,200);w.OffScreenRenderingOn()
i=vtk.vtkGLTFImporter();i.SetRenderWindow(w);i.SetFileName(${JSON.stringify(glb)});i.Update()
r=w.GetRenderers().GetFirstRenderer()
assert r.GetActors().GetNumberOfItems()>=20,'imported asset missing 3D geometry'
c=r.GetActiveCamera();c.SetPosition(12,-17,11);c.SetFocalPoint(0,0,2);c.SetViewUp(0,0,1)
w.Render()
f=vtk.vtkWindowToImageFilter();f.SetInput(w);f.Update()
assert f.GetOutput().GetNumberOfPoints()>500,'3D still was blank'
`;
  const r=spawnSync('python3',['-c',py],{encoding:'utf8',cwd:root,timeout:60000});
  assert.equal(r.status,0,r.stderr);
});
