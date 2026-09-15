import test from 'node:test';import assert from 'node:assert/strict';
import {createTrack} from '../src/track.js';
import {createRace,stepRace,clamp} from '../src/physics.js';
import {steeringLimit} from '../src/vehicle-dynamics.js';
import {motionTarget} from '../src/motion-controls.js';
const track=createTrack();
test('tight inner lanes receive a usable braking target with steering margin',()=>{
 for(const c of track.corners){let d=c.distance,k=0;for(let p=d-65;p<c.distance+100;p+=.5)if(Math.abs(track.curvature(p))>Math.abs(k)){k=track.curvature(p);d=p;}
 const lane=Math.sign(k)*5,v=track.cornerSpeed(d,lane),radius=1/Math.abs(k)-5;
 assert.ok(v<track.cornerSpeed(d));assert.ok(2.6/Math.tan(steeringLimit(v))<radius);
 if(radius<11)assert.ok(v*3.6<55);
 }
});
test('all five corner sections can be driven with motion input and moderate braking',()=>{
 for(const c of track.corners){const s=createRace(track.length);s.rivals=[];s.distance=c.distance-65;s.speed=14;let max=0;
 for(let i=0;i<3600&&s.distance<c.distance+100;i++){
 const k=track.curvature(s.distance),steer=clamp(k*14-s.lateral*.13,-1,1),target=track.targetSpeed(s.distance,16,s.lateral);
 stepRace(s,{motion:true,steer,gas:s.speed<target,brake:s.speed>target+1},1/120,0,track);max=Math.max(max,Math.abs(s.lateral));
 }
 assert.ok(s.distance>=c.distance+100,c.name);assert.ok(max<2,c.name);
 }
});
test('neutral heading bias vanishes on straights and leaves outward bias in either bend',()=>{
 assert.equal(motionTarget(0,20,0,0),0);
 for(const sign of [-1,1]){const bias=-sign*.12;assert.ok(motionTarget(0,20,0,bias)*sign<0);assert.ok(motionTarget(sign,20,0,bias)*sign>0);}
});
test('low speed steering improves while high speed steering remains restrained',()=>{
 const old=v=>Math.atan(28*2.6/(v*v+35));assert.ok(steeringLimit(15)>old(15)*1.1);assert.ok(steeringLimit(59)<old(59)*1.01);
});
