import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrack} from '../src/track.js';
import {createRace,stepRace,clamp} from '../src/physics.js';
import {aiSteering} from '../src/vehicle-dynamics.js';
const track=createTrack();
test('circuit has a seamless start, safe radii and separated road sections',()=>{
 assert.ok(track.frame(0).p.distanceTo(track.frame(track.length).p)<.001);
 assert.ok(track.frame(.1).dir.dot(track.frame(track.length-.1).dir)>.999);
 const positions=[];for(let d=0;d<track.length;d+=4){assert.ok(1/Math.abs(track.curvature(d))>11,'radius must clear road and rails');positions.push({d,p:track.frame(d).p});}
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
  const a=positions[i],b=positions[j],gap=Math.min(b.d-a.d,track.length-b.d+a.d);if(gap<70)continue;
  assert.ok(Math.hypot(a.p.x-b.p.x,a.p.z-b.p.z)>28,'unrelated road sections must not overlap');
 }
 assert.equal(track.corners.filter(c=>c.type==='hairpin').length,2);
});
test('rivals anticipate braking and accelerate back onto straight',()=>{
 const h=track.corners[0];assert.ok(track.targetSpeed(h.distance-45,47)<47);
 const s=createRace(track.length);s.rivals=[{distance:h.distance-120,speed:47,pace:47,lateral:3,finishTime:null}];
 let min=47,after=0;for(let n=0;n<2400;n++){stepRace(s,{},1/120,0,track);if(s.rivals[0].speed<min){min=s.rivals[0].speed;after=min;}else{after=Math.max(after,s.rivals[0].speed);}}
 assert.ok(min<30);assert.ok(after>min+8);
});
test('a braking driver can complete three laps without leaving the road',()=>{
 const s=createRace(track.length);s.rivals=[];let maxOffset=0;
 for(let n=0;n<120*400&&!s.finished;n++){
  const k=track.curvature(s.distance),target=track.targetSpeed(s.distance);
  const steer=aiSteering(s,track);
  stepRace(s,{steer,gas:s.speed<target,brake:s.speed>target+1},1/120,k,track);
  maxOffset=Math.max(maxOffset,Math.abs(s.lateral));
 }
 assert.ok(s.finished);assert.ok(maxOffset<7.5);assert.ok(s.time<400);
});
test('full throttle requires more than maximum steering at tight corners',()=>{
 let exceeded=false;for(let d=0;d<track.length;d+=2)if(Math.abs(track.curvature(d))*59*59>26)exceeded=true;assert.ok(exceeded);
});
