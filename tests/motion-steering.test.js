import test from 'node:test';import assert from 'node:assert/strict';
import {initializeVehicle,motionSteering,stepVehicle} from '../src/vehicle-dynamics.js';
import {createRace,stepRace} from '../src/physics.js';
const car=(extra={})=>{const v={distance:100,lateral:0,speed:15,heading:0,...extra};initializeVehicle(v);return v;};
const step=(v,tilt)=>stepVehicle(v,{steer:motionSteering(v,tilt),gas:true,cruise:15,headingGuard:true},1/120);
test('neutral motion input converges to road heading from both directions',()=>{
 for(const sign of [-1,1]){const v=car({heading:sign*.2});for(let i=0;i<360;i++)step(v,0);assert.ok(Math.abs(v.heading)<.01);assert.ok(Math.abs(v.lateral)<3);}
});
test('held tilt settles at a heading instead of continually rotating, then neutral returns',()=>{
 for(const sign of [-1,1]){const v=car();for(let i=0;i<360;i++)step(v,sign*.25);
 assert.ok(Math.abs(v.heading-sign*.25*20*Math.PI/180)<.01);assert.ok(Math.abs(v.yawRate)<.01);
 for(let i=0;i<360;i++)step(v,0);assert.ok(Math.abs(v.heading)<.01);}
});
test('neutral does not pull a parallel car toward the middle; reverse remains manual',()=>{
 for(const lateral of [-5,5]){const v=car({lateral});assert.ok(Math.abs(motionSteering(v,0))<1e-12);}
 const v=car();v.forwardSpeed=-5;assert.equal(motionSteering(v,.7),.7);
});
test('motion mode is routed through the race controller and manual mode remains distinct',()=>{
 const a=createRace(2000),b=createRace(2000);for(const v of [a,b]){v.rivals=[];v.speed=15;v.heading=.2;}
 stepRace(a,{gas:true,motion:true,steer:0},1/120);stepRace(b,{gas:true,steer:0},1/120);
 assert.ok(a.yawRate>b.yawRate);
});

test('road curvature supplies the matching turn and motion steering still escapes a wall',()=>{
 const v=car();assert.ok(motionSteering(v,0,{curvature:()=>.01})>0);
 assert.ok(motionSteering(v,0,{curvature:()=>-.01})<0);
 for(const sign of [-1,1]){const s=createRace(2000);s.rivals=[];s.speed=.2;s.lateral=sign*9;s.heading=sign*1.4;
 for(let i=0;i<1680;i++)stepRace(s,{motion:true,gas:true,steer:sign},1/120);
 assert.ok(s.distance>30);assert.ok(Math.abs(s.heading)<.45);}
});
