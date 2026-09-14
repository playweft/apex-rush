import test from 'node:test';
import assert from 'node:assert/strict';
import {assistedSteering,initializeVehicle,stepVehicle,straightRoad} from '../src/vehicle-dynamics.js';
import {createTrack} from '../src/track.js';
const car=(extra={})=>{const v={distance:100,lateral:0,speed:40,heading:.12,...extra};initializeVehicle(v);return v;};
test('assistance corrects heading symmetrically without modifying physical state',()=>{
 for(const heading of [-.12,.12]){const v=car({heading}),before=[v.x,v.z,v.yaw,v.vx,v.vz];const steer=assistedSteering(v,0,.05);assert.equal(Math.sign(steer),-Math.sign(heading));assert.deepEqual([v.x,v.z,v.yaw,v.vx,v.vz],before);}
});
test('no lateral attraction to the centre on a straight',()=>{
 for(const lateral of [-6,0,6]){const v=car({lateral,heading:0});assert.equal(assistedSteering(v,0,.05),0);}
});
test('strong input wins immediately and assistance returns gradually',()=>{
 const v=car();for(let i=0;i<120;i++)assistedSteering(v,0,1/120);
 assert.ok(v.assistWeight>.8);assert.equal(assistedSteering(v,.7,1/120),.7);assert.equal(v.assistWeight,0);
 const first=Math.abs(assistedSteering(v,0,1/120));for(let i=0;i<60;i++)assistedSteering(v,0,1/120);
 assert.ok(Math.abs(assistedSteering(v,0,1/120))>first*10);
});
test('collision, reverse, low speed, offroad and large yaw disable assistance',()=>{
 for(const extra of [{collision:.5},{forwardSpeed:-8},{forwardSpeed:2},{lateral:8},{heading:1}]){const v=Object.assign(car(),extra,{assistWeight:1});assert.equal(assistedSteering(v,.1,.05),.1);assert.equal(v.assistWeight,0);}
});
test('assistance reduces straight-road drift without snapping the vehicle',()=>{
 const assisted=car(),manual=car();for(let i=0;i<120;i++){stepVehicle(assisted,{gas:true,steer:assistedSteering(assisted,0,1/120)},1/120);stepVehicle(manual,{gas:true},1/120);}
 assert.ok(Math.abs(assisted.heading)<Math.abs(manual.heading)*.8);assert.ok(Math.abs(assisted.lateral)<Math.abs(manual.lateral));
});
test('bounded help anticipates bends but cannot supply full high-speed hairpin steering',()=>{
 const track=createTrack(),v={distance:track.corners[0].distance-10,lateral:0,speed:59};initializeVehicle(v,track);
 for(let i=0;i<240;i++)assistedSteering(v,0,1/120,track);
 const steer=assistedSteering(v,0,1/120,track);assert.ok(Math.abs(steer)>0);assert.ok(Math.abs(steer)<=.32);
 assert.ok(Math.abs(track.curvature(v.distance))*59**2>28*.32);
});
test('assist recovery is independent of update rate',()=>{
 const a=car(),b=car();for(let i=0;i<30;i++)assistedSteering(a,0,1/30);for(let i=0;i<120;i++)assistedSteering(b,0,1/120);assert.ok(Math.abs(a.assistWeight-b.assistWeight)<1e-12);
});
