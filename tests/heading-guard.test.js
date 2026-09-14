import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeVehicle,guardHeading,steeringLimit,stepVehicle,straightRoad} from '../src/vehicle-dynamics.js';
const car=(extra={})=>{const v={distance:100,lateral:0,speed:40,heading:0,...extra};initializeVehicle(v);return v;};
test('guard leaves normal steering alone and limits outward input symmetrically',()=>{
 for(const sign of [-1,1]){
 const v=car(),wheel=sign*steeringLimit(v.speed);assert.ok(Math.abs(guardHeading(v,wheel)-wheel)<1e-12);
 v.heading=sign*.6;assert.ok(guardHeading(v,wheel)*sign<wheel*sign);
 assert.ok(Math.abs(guardHeading(v,-wheel)+wheel)<1e-12);
 }
});
test('wall recovery stays guarded but reversing and turning around remain possible',()=>{
 const v=car({heading:.65,collision:.8,lateral:9});const wheel=steeringLimit(v.speed);
 assert.ok(guardHeading(v,wheel)<wheel);
 v.forwardSpeed=-8;assert.equal(guardHeading(v,wheel),wheel);
 v.forwardSpeed=3;assert.ok(guardHeading(v,wheel)<wheel);
 v.forwardSpeed=40;v.heading=Math.PI;assert.equal(guardHeading(v,wheel),wheel);
});
test('yaw inertia is anticipated and faster driving receives a narrower envelope',()=>{
 const v=car({heading:.4});const wheel=steeringLimit(v.speed),base=guardHeading(v,wheel);
 v.yawRate=-1;assert.ok(guardHeading(v,wheel)<base);
 const slow=car({speed:15,heading:.3}),fast=car({speed:59,heading:.3});
 assert.ok(guardHeading(slow,0)>=0);assert.ok(guardHeading(fast,0)<0);
});
test('reversing steering after a scrape avoids a large cross-road yaw swing',()=>{
 for(const sign of [-1,1]){
 const guarded=car({lateral:sign*9,heading:sign*.2,speed:30,collision:.8});
 const free=car({lateral:sign*9,heading:sign*.2,speed:30,collision:.8});
 let guardedMax=0,freeMax=0;
 for(let i=0;i<180;i++){
 stepVehicle(guarded,{gas:true,steer:-sign,headingGuard:true},1/120,straightRoad);
 stepVehicle(free,{gas:true,steer:-sign},1/120,straightRoad);
 guardedMax=Math.max(guardedMax,Math.abs(guarded.heading));freeMax=Math.max(freeMax,Math.abs(free.heading));
 }
 assert.ok(guardedMax<.7);assert.ok(guardedMax<freeMax*.8);
 }
});

test('auto throttle escapes either wall from near standstill despite held outward tilt',()=>{
 for(const sign of [-1,1])for(const heading of [.6,1.4,2.3]){
 const v=car({lateral:sign*9,speed:.2,heading:sign*heading,collision:.8});const start=v.distance;
 for(let i=0;i<120*14;i++)stepVehicle(v,{gas:true,steer:sign,headingGuard:true},1/120);
 assert.ok(v.distance>start+30,`must make progress: ${sign}, ${heading}`);
 assert.ok(Math.abs(v.lateral)<8.5);assert.ok(Math.abs(v.heading)<.45);
 }
});
test('stationary wall recovery never rotates a braking or reversing vehicle',()=>{
 for(const speed of [0,-3]){const v=car({lateral:9,speed,heading:1});const yaw=v.yaw;
 stepVehicle(v,{brake:true,headingGuard:true},1/120);assert.equal(v.yaw,yaw);}
});
