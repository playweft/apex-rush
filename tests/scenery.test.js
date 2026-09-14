import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createTrack} from '../src/track.js';
import {NATURE_MODELS,createTerrain,buildTerrain,sceneryPlacements,addModelInstances,addSky} from '../src/scenery.js';
const track=createTrack(),terrain=createTerrain(track);

test('scenery stays clear of road and uses bounded deterministic populations',()=>{
 const a=sceneryPlacements(terrain),b=sceneryPlacements(terrain);
 assert.deepEqual(a,b);assert.ok(a.flat().length>150);assert.ok(a.flat().length<=505);
 for(const group of a)for(const p of group){assert.ok(terrain.surface(p.x,p.z).distance>=19);assert.ok(Number.isFinite(p.y));}
});

test('terrain triangles stay below the driving surface',()=>{
 const scene=new THREE.Scene();buildTerrain(scene,terrain);scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 for(let d=0;d<track.length;d+=25)for(const lateral of [-7,0,7]){
  const p=track.frame(d,lateral).p;
  ray.set(new THREE.Vector3(p.x,100,p.z),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObjects(scene.children)[0];assert.ok(hit);assert.ok(hit.point.y<p.y-.05,`terrain clips road at ${d}, ${lateral}`);
 }
});

test('nature GLBs load and are drawn in bounded instance batches',async()=>{
 let bytes=0;
 for(const name of NATURE_MODELS){
  const data=fs.readFileSync(`public/models/nature/${name}.glb`);bytes+=data.length;
  const model=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const scene=new THREE.Scene();
  addModelInstances(scene,model.scene,[{x:0,y:0,z:0,height:8,rotation:0,tint:1},{x:20,y:0,z:0,height:10,rotation:1,tint:.9}]);
  assert.ok(scene.children.length>0&&scene.children.length<12);
  for(const batch of scene.children){assert.ok(batch.isInstancedMesh);assert.equal(batch.count,2);assert.ok(Number.isFinite(batch.boundingSphere.radius));}
 }
 assert.ok(bytes<120000);
});

test('sky shader directives have valid line boundaries',()=>{
 const sky=addSky(new THREE.Scene());
 assert.ok(sky.material.fragmentShader.includes('\n#include <colorspace_fragment>\n'));
});
