import {stepHandling,resolveVehicleContact,laneSteering,resolveBarrier} from './vehicle-dynamics.js';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const NITRO_MINIMUM=25;
export const NITRO_BURN_RATE=29;
export const mod=(n,m)=>(n%m+m)%m;
export function createRace(length){return {length,distance:0,speed:0,lateral:0,nitro:100,nitroRemaining:0,boostInterrupted:false,boostHeld:false,time:0,collision:0,finished:false,boosting:false,rivals:Array.from({length:5},(_,i)=>({distance:13+i*9,speed:0,lateral:(i%3-1)*3.2,pace:43.4+i*.8,finishTime:null}))};}
export function stepRace(s,input,dt,curvature=0,track=null){
 if(s.finished)return;dt=clamp(dt,0,.05);s.time+=dt;
 const steer=clamp(input.steer||0,-1,1);
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
 const offroad=Math.abs(s.lateral)>7.5;
 const max=offroad?24:s.boosting?76:59;
 const acceleration=input.brake?-48:input.gas||s.boosting?22:-10;
 if(acceleration>0){s.speed=s.speed>max?Math.max(max,s.speed-(offroad?45:14)*dt):Math.min(max,s.speed+acceleration*dt);}else{s.speed=Math.max(0,s.speed+acceleration*dt);if(s.speed>max)s.speed=Math.max(max,s.speed-(offroad?45:14)*dt);}
 stepHandling(s,steer,curvature,dt);
 s.distance+=s.speed*dt;
 for(const rival of s.rivals){
   const cruise=Math.abs(rival.lateral)>7.5?24:rival.pace;
   const target=track?track.targetSpeed(rival.distance,cruise):cruise;
   rival.speed=rival.speed>target?Math.max(target,rival.speed-30*dt):Math.min(target,rival.speed+18*dt);
   rival.lane??=rival.lateral;
   const bend=track?track.curvature(rival.distance):0;
   stepHandling(rival,laneSteering(rival,bend,rival.lane),bend,dt);
   rival.distance+=rival.speed*dt;
 }
 const vehicles=[s,...s.rivals];
 for(let pass=0;pass<2;pass++)for(let i=0;i<vehicles.length;i++)for(let j=i+1;j<vehicles.length;j++)resolveVehicleContact(vehicles[i],vehicles[j],s.length);
 for(const vehicle of vehicles)resolveBarrier(vehicle);
 for(const rival of s.rivals)if(rival.distance>=s.length*3&&rival.finishTime===null)rival.finishTime=s.time;
 if(s.distance>=s.length*3){s.distance=s.length*3;s.finished=true;s.boosting=false;s.nitroRemaining=0;}
}
export function position(s){return 1+s.rivals.filter(r=>s.finished?r.finishTime!==null&&r.finishTime<=s.time:r.distance>s.distance).length;}
export function screenTilt(beta,gamma,angle=0){
 if(!Number.isFinite(beta)||!Number.isFinite(gamma))return null;
 const r=Math.PI/180,a=angle*r;
 return Math.asin(clamp(Math.sin(gamma*r)*Math.cos(beta*r)*Math.cos(a)+Math.sin(beta*r)*Math.sin(a),-1,1))/r;
}
export function tiltSteer(value,neutral){const delta=value-neutral;return Math.abs(delta)<2?0:clamp((delta-Math.sign(delta)*2)/22,-1,1);}
export function formatTime(seconds){const cents=Math.floor(seconds*100);return `${String(Math.floor(cents/6000)).padStart(2,'0')}:${String(Math.floor(cents/100)%60).padStart(2,'0')}.${String(cents%100).padStart(2,'0')}`;}
