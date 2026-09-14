import test from 'node:test';import assert from 'node:assert/strict';
import {stepVehicle,initializeVehicle,resolveBarrier,resolveVehicleContact,straightRoad} from '../src/vehicle-dynamics.js';
import {createRace,stepRace} from '../src/physics.js';import {createTrack} from '../src/track.js';
const car=(changes={})=>({distance:100,speed:40,lateral:0,heading:0,...changes});
test('steering is progressive and releasing centres wheels without snapping heading',()=>{
 const v=car();stepVehicle(v,{steer:1},1/120);assert.ok(v.yaw<0&&v.yaw>-.1);
 for(let i=0;i<30;i++)stepVehicle(v,{steer:1},1/120);
 const yaw=v.yaw;for(let i=0;i<120;i++)stepVehicle(v,{},1/120);
 assert.ok(Math.abs(v.steerAngle)<1e-5);assert.ok(v.yaw<yaw);
});
test('road direction cannot steer a vehicle without input',()=>{
 const track=createTrack(),v=car({distance:track.corners[0].distance-15,speed:25});initializeVehicle(v,track);const yaw=v.yaw;
 for(let i=0;i<180;i++)stepVehicle(v,{gas:true},1/120,track);
 assert.equal(v.yaw,yaw);assert.ok(Math.abs(v.heading)>.1);
});
test('head-on barrier impact costs more energy than a scrape',()=>{
 const scrape=car({x:-11,z:100,yaw:0,vx:-2,vz:40}),hit=car({x:-11,z:100,yaw:-Math.PI/2,vx:-40,vz:2});
 initializeVehicle(scrape);initializeVehicle(hit);resolveBarrier(scrape);resolveBarrier(hit);
 assert.ok(scrape.speed>38);assert.ok(hit.speed<6);assert.ok(hit.lateral<9.5);assert.ok(hit.vx>0);
 const speed=hit.speed;resolveBarrier(hit);assert.equal(hit.speed,speed);
});
test('rear impact transfers momentum and dissipates energy',()=>{
 const a=car({speed:60}),b=car({distance:103,speed:20});resolveVehicleContact(a,b);
 assert.ok(a.speed<60&&b.speed>20);assert.ok(a.speed**2+b.speed**2<4000);assert.ok(Math.abs(a.vz+b.vz-80)<1e-9);
});
test('lateral contact affects both cars without adding translational energy',()=>{
 const a=car({x:0,z:100,yaw:0,vx:-5,vz:40}),b=car({x:-1.5,z:100,yaw:0,vx:3,vz:40});resolveVehicleContact(a,b);
 assert.ok(a.vx>-5&&b.vx<3);assert.ok(a.vx**2+b.vx**2<=34);
});
test('physical contacts and signed progress work across the start line',()=>{
 const track=createTrack(),a=car({distance:track.length-1,speed:60}),b=car({distance:1,speed:20});
 assert.ok(resolveVehicleContact(a,b,track));assert.ok(a.speed<60&&b.speed>20);
 let hint=track.length-2;
 for(const offset of [-1,0,1,2,1,0,-1,-2]){const p=track.frame(track.length+offset).p;hint=track.project(p.x,p.z,hint).distance;assert.ok(Math.abs(hint-(track.length+offset))<.05);}
});
test('held brake reverses after stopping and throttle drives forward again',()=>{
 const v=car({speed:5});for(let i=0;i<180;i++)stepVehicle(v,{brake:true},1/120,straightRoad);
 assert.ok(v.forwardSpeed<-5);const z=v.z;for(let i=0;i<10;i++)stepVehicle(v,{brake:true},1/120);assert.ok(v.z<z);
 for(let i=0;i<120;i++)stepVehicle(v,{gas:true},1/120);assert.ok(v.forwardSpeed>0);
});
test('six-car race remains finite and bounded under repeated full-throttle impacts',()=>{
 const track=createTrack(),s=createRace(track.length);
 for(let i=0;i<120*180&&!s.finished;i++){stepRace(s,{gas:true,steer:Math.sin(i/400)},1/120,0,track);for(const v of [s,...s.rivals]){assert.ok(Number.isFinite(v.x+v.z+v.vx+v.vz+v.yaw));assert.ok(Math.abs(v.lateral)<10);assert.ok(v.speed>=0&&v.speed<100);}}
 assert.ok(s.rivals.every(v=>v.distance>track.length));
});
