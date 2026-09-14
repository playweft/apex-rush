import test from 'node:test';import assert from 'node:assert/strict';
import {motionCurve,motionTarget,smoothMotionInput} from '../src/motion-controls.js';
import {tiltSteer,createRace,stepRace} from '../src/physics.js';
test('tilt range remains progressive beyond 24 degrees and curve is continuous symmetric monotonic',()=>{
 assert.ok(tiltSteer(24,0)<tiltSteer(30,0));assert.equal(tiltSteer(32,0),1);
 let previous=-1;for(let i=-100;i<=100;i++){const x=i/100,y=motionCurve(x);assert.ok(y>=previous);assert.ok(Math.abs(y+motionCurve(-x))<1e-12);previous=y;}
 assert.ok(motionCurve(.2)<.2);assert.ok(motionCurve(.9)-motionCurve(.8)>motionCurve(.2)-motionCurve(.1));
});
test('large input, countersteering and release filter faster without overshoot',()=>{
 const small=smoothMotionInput(0,.2,1/60)/.2,large=smoothMotionInput(0,1,1/60);
 assert.ok(large>small);assert.ok(smoothMotionInput(.5,-.5,.05)<.1);
 assert.ok(smoothMotionInput(.5,0,.05)<.2);
 for(const dt of [1/120,1/30,.2])assert.ok(smoothMotionInput(0,1,dt)<=1);
 let a=0,b=0;for(let i=0;i<30;i++)a=smoothMotionInput(a,1,1/30);for(let i=0;i<120;i++)b=smoothMotionInput(b,1,1/120);assert.ok(Math.abs(a-b)<1e-12);
});
test('target envelope is wider at low speed; wall only restricts the dangerous side',()=>{
 assert.ok(motionTarget(1,15,0)>motionTarget(1,59,0));
 for(const sign of [-1,1]){assert.equal(motionTarget(-sign,30,sign*9),motionTarget(-sign,30,0));assert.ok(motionTarget(sign,30,sign*9)*sign<0);}
});
test('full-input race response develops quickly and returns toward neutral',()=>{
 const s=createRace(2000);s.rivals=[];s.speed=25;
 for(let i=0;i<60;i++)stepRace(s,{motion:true,steer:1,gas:true},1/120);
 assert.ok(s.heading>.12);const before=s.heading;
 for(let i=0;i<120;i++)stepRace(s,{motion:true,steer:0,gas:true},1/120);
 assert.ok(Math.abs(s.heading)<before*.3);
});
