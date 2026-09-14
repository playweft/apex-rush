import test from 'node:test';import assert from 'node:assert/strict';
import {createRace,stepRace,stepNitro,chooseRivalBoost} from '../src/physics.js';
import {createTrack} from '../src/track.js';
const straight={targetSpeed:(_d,speed)=>speed,curvature:()=>0};
function setup(){const race=createRace(2600);race.distance=200;race.time=10;race.rivals=[race.rivals[0]];const rival=race.rivals[0];rival.distance=100;rival.speed=44;rival.lateral=0;return {race,rival};}
test('AI boosts to chase on clear straights but avoids unsafe activation',()=>{
 const {race,rival}=setup();assert.equal(chooseRivalBoost(rival,race,straight),true);
 assert.equal(chooseRivalBoost(rival,race,{targetSpeed:()=>25}),false);
 rival.lateral=8;assert.equal(chooseRivalBoost(rival,race,straight),false);
 rival.lateral=0;rival.collision=.5;assert.equal(chooseRivalBoost(rival,race,straight),false);
 rival.collision=0;race.distance=105;race.lateral=0;assert.equal(chooseRivalBoost(rival,race,straight),false);
});
test('AI cannot activate below the minimum tank',()=>{const {race,rival}=setup();rival.nitro=24;assert.equal(chooseRivalBoost(rival,race,straight),false);});
test('shared nitro rules consume gradually through release and braking for both drivers',()=>{
 const player=createRace(2600),rival=createRace(2600).rivals[0];player.speed=rival.speed=50;
 for(let i=0;i<200;i++){
  const input={boost:i===0,brake:i>20&&i<25};stepNitro(player,input,1/120);stepNitro(rival,input,1/120);
  for(const key of ['nitro','nitroRemaining','boosting','boostInterrupted','boostHeld'])assert.equal(player[key],rival[key]);
 }
 assert.ok(player.nitro<85);
});
test('all five rivals use nitro on the real circuit with distinct start times',()=>{
 const track=createTrack(),race=createRace(track.length),uses=[0,0,0,0,0],starts=[null,null,null,null,null],maxSpeed=[0,0,0,0,0];
 for(let i=0;i<120*180;i++){
  stepRace(race,{},1/120,track.curvature(race.distance),track);
  race.rivals.forEach((v,j)=>{if(v.boosting){uses[j]++;starts[j]??=race.time;}maxSpeed[j]=Math.max(maxSpeed[j],v.speed);assert.ok(v.nitro>=0&&v.nitro<=100);});
 }
 assert.ok(uses.every(n=>n>0));assert.ok(new Set(starts).size>1);assert.ok(maxSpeed.every(n=>n>50));
});
