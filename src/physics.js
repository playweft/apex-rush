import {stepVehicle,assistedSteering,resolveVehicleContact,aiSteering,resolveBarrier,initializeVehicle,straightRoad} from './vehicle-dynamics.js';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const NITRO_MINIMUM=25;
export const NITRO_BURN_RATE=29;
export const mod=(n,m)=>(n%m+m)%m;
export function createRace(length){return {length,distance:0,speed:0,lateral:0,nitro:100,nitroRemaining:0,boostInterrupted:false,boostHeld:false,time:0,collision:0,finished:false,boosting:false,rivals:Array.from({length:5},(_,i)=>({distance:13+i*9,speed:0,lateral:(i%3-1)*3.2,pace:43.4+i*.8,nitro:100,nitroRemaining:0,boostInterrupted:false,boostHeld:false,boosting:false,aiStyle:i,nextBoostAt:2+i*.65,boostUntil:0,finishTime:null}))};}
export function stepRace(s,input,dt,curvature=0,track=null){
 if(s.finished)return;dt=clamp(dt,0,.05);s.time+=dt;
 const road=track?.project?track:straightRoad;
 initializeVehicle(s,road);
 stepNitro(s,{...input,brake:input.brake||s.forwardSpeed<0},dt);
 stepVehicle(s,{...input,steer:assistedSteering(s,input.steer,dt,road)},dt,road);
 for(const rival of s.rivals){
   initializeVehicle(rival,road);rival.lane??=rival.lateral;
   const wantsBoost=chooseRivalBoost(rival,s,track);
   const cruise=Math.abs(rival.lateral)>7.5?24:wantsBoost||rival.boosting||rival.nitroRemaining>0?76:rival.pace;
   let target=track?track.targetSpeed(rival.distance,cruise):cruise;
   if(Math.abs(rival.heading)>1)target=Math.min(target,8);
   const brake=rival.speed>target+1;
   stepNitro(rival,{boost:wantsBoost,brake},dt);
   stepVehicle(rival,{steer:aiSteering(rival,road,rival.lane),gas:!brake,brake,cruise:Math.min(target,rival.boosting?76:rival.pace)},dt,road);
 }
 const vehicles=[s,...s.rivals];
 for(let pass=0;pass<2;pass++){
   for(let i=0;i<vehicles.length;i++)for(let j=i+1;j<vehicles.length;j++)resolveVehicleContact(vehicles[i],vehicles[j],road);
   for(const vehicle of vehicles)resolveBarrier(vehicle,road);
 }
 for(const rival of s.rivals)if(rival.distance>=s.length*3&&rival.finishTime===null)rival.finishTime=s.time;
 if(s.distance>=s.length*3){s.distance=s.length*3;s.finished=true;s.boosting=false;s.nitroRemaining=0;}
}
// Player and AI use the same minimum burn, recharge and activation latch.
export function stepNitro(s,input,dt){
 s.nitro??=100;s.nitroRemaining??=0;s.boostHeld??=false;s.boostInterrupted??=false;
 const pressed=!!input.boost&&!s.boostHeld;
 s.boostHeld=!!input.boost;
 const canDriveBoost=s.speed>8&&!input.brake;
 const continuing=s.boosting&&input.boost;
 // Commit to a minimum burn, but consume it progressively over time.
 if(!canDriveBoost)s.boostInterrupted=true;
 if(canDriveBoost&&pressed&&!s.boosting&&s.nitroRemaining===0&&s.nitro>=NITRO_MINIMUM){
   s.nitroRemaining=NITRO_MINIMUM;s.boostInterrupted=false;
 }
 s.boosting=canDriveBoost&&!s.boostInterrupted&&(s.nitroRemaining>0||(continuing&&s.nitro>0));
 if(s.boosting||s.nitroRemaining>0){
   const burn=Math.min(s.nitro,NITRO_BURN_RATE*dt,
     s.boosting&&input.boost?Infinity:s.nitroRemaining);
   s.nitro=Math.max(0,s.nitro-burn);
   s.nitroRemaining=Math.max(0,s.nitroRemaining-burn);
 }else{s.nitro=clamp(s.nitro+9*dt,0,100);}
}
export function chooseRivalBoost(rival,race,track){
 const style=rival.aiStyle??0;
 if(!track||rival.finishTime!=null||rival.speed<30||Math.abs(rival.lateral)>6||rival.collision>0||Math.abs(rival.heading??0)>.2||Math.abs(rival.lateralVelocity??0)>3)return false;
 // Reserve enough straight road for both the minimum burst and braking.
 if(track.targetSpeed(rival.distance,76)<65||track.targetSpeed(rival.distance+70,76)<60)return false;
 const traffic=[race,...race.rivals].filter(other=>other!==rival);
 const blocked=traffic.some(other=>{
   const ahead=mod(other.distance-rival.distance,race.length);
   return ahead>0&&ahead<12+Math.max(0,rival.speed-other.speed)*1.2&&Math.abs(other.lateral-rival.lateral)<2.5;
 });
 if(blocked)return false;
 if(race.time<(rival.boostUntil??0))return true;
 if(rival.boostHeld||rival.boosting||rival.nitroRemaining>0||race.time<(rival.nextBoostAt??0))return false;
 const chasing=traffic.some(other=>other.distance>rival.distance&&other.distance-rival.distance<140);
 const reserve=chasing?NITRO_MINIMUM+style*3:60+style*5;
 if(rival.nitro<reserve)return false;
 const duration=.9+style*.14;
 rival.boostUntil=race.time+duration;
 rival.nextBoostAt=race.time+duration+3.5+style*.6;
 return true;
}
export function position(s){return 1+s.rivals.filter(r=>s.finished?r.finishTime!==null&&r.finishTime<=s.time:r.distance>s.distance).length;}
export function screenTilt(beta,gamma,angle=0){
 if(!Number.isFinite(beta)||!Number.isFinite(gamma))return null;
 const r=Math.PI/180,a=angle*r;
 return Math.asin(clamp(Math.sin(gamma*r)*Math.cos(beta*r)*Math.cos(a)+Math.sin(beta*r)*Math.sin(a),-1,1))/r;
}
export function tiltSteer(value,neutral){const delta=value-neutral;return Math.abs(delta)<2?0:clamp((delta-Math.sign(delta)*2)/22,-1,1);}
export function formatTime(seconds){const cents=Math.floor(seconds*100);return `${String(Math.floor(cents/6000)).padStart(2,'0')}:${String(Math.floor(cents/100)%60).padStart(2,'0')}.${String(cents%100).padStart(2,'0')}`;}
