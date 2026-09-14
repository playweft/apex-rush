export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const mod=(n,m)=>(n%m+m)%m;
export function createRace(length){return {length,distance:0,speed:0,lateral:0,nitro:100,time:0,collision:0,finished:false,boosting:false,rivals:Array.from({length:5},(_,i)=>({distance:13+i*9,speed:0,lateral:(i%3-1)*3.2,pace:43.4+i*.8,finishTime:null}))};}
export function stepRace(s,input,dt,curvature=0,track=null){
 if(s.finished)return;dt=clamp(dt,0,.05);s.time+=dt;s.collision=Math.max(0,s.collision-dt);
 const steer=clamp(input.steer||0,-1,1);s.boosting=!!input.boost&&s.nitro>0&&s.speed>8&&!input.brake;
 s.nitro=clamp(s.nitro+(s.boosting?-29:9)*dt,0,100);
 const offroad=Math.abs(s.lateral)>7.5;
 const max=offroad?24:s.boosting?76:59;
 const acceleration=input.brake?-48:input.gas||s.boosting?22:-10;
 if(acceleration>0){s.speed=s.speed>max?Math.max(max,s.speed-(offroad?45:14)*dt):Math.min(max,s.speed+acceleration*dt);}else{s.speed=Math.max(0,s.speed+acceleration*dt);if(s.speed>max)s.speed=Math.max(max,s.speed-(offroad?45:14)*dt);}
 s.lateral+=steer*(3.0+s.speed*.105)*dt-curvature*s.speed*s.speed*.20*dt;
 s.lateral=clamp(s.lateral,-12,12);
 s.distance+=s.speed*dt;
 for(const rival of s.rivals){
   const target=track?track.targetSpeed(rival.distance,rival.pace):rival.pace;
   rival.speed=rival.speed>target?Math.max(target,rival.speed-30*dt):Math.min(target,rival.speed+18*dt);
   rival.distance+=rival.speed*dt;
   if(rival.distance>=s.length*3&&rival.finishTime===null)rival.finishTime=s.time;
   const delta=mod(rival.distance-s.distance+s.length/2,s.length)-s.length/2;
   if(Math.abs(delta)<4.1&&Math.abs(rival.lateral-s.lateral)<1.9&&s.collision===0){s.speed*=.63;s.lateral=clamp(s.lateral+(s.lateral>=rival.lateral?1:-1)*1.4,-12,12);s.collision=.9;}
 }
 if(s.distance>=s.length*3){s.distance=s.length*3;s.finished=true;s.boosting=false;}
}
export function position(s){return 1+s.rivals.filter(r=>s.finished?r.finishTime!==null&&r.finishTime<=s.time:r.distance>s.distance).length;}
export function screenTilt(beta,gamma,angle=0){
 if(!Number.isFinite(beta)||!Number.isFinite(gamma))return null;
 const r=Math.PI/180,a=angle*r;
 return Math.asin(clamp(Math.sin(gamma*r)*Math.cos(beta*r)*Math.cos(a)+Math.sin(beta*r)*Math.sin(a),-1,1))/r;
}
export function tiltSteer(value,neutral){const delta=value-neutral;return Math.abs(delta)<2?0:clamp((delta-Math.sign(delta)*2)/22,-1,1);}
export function formatTime(seconds){const cents=Math.floor(seconds*100);return `${String(Math.floor(cents/6000)).padStart(2,'0')}:${String(Math.floor(cents/100)%60).padStart(2,'0')}.${String(cents%100).padStart(2,'0')}`;}
