// World-space arcade vehicle. Assistance only contributes front-wheel input.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const steeringLimit=speed=>Math.min(.55,Math.atan(28*2.6/(speed*speed+35)));
export const straightRoad={
 frame(distance,lateral=0){return {p:{x:-lateral,y:0,z:distance},dir:{x:0,y:0,z:1},right:{x:-1,y:0,z:0}};},
 project(x,z){return {distance:z,lateral:-x,p:{x:0,y:0,z},dir:{x:0,y:0,z:1},right:{x:-1,y:0,z:0}};},
};
export function initializeVehicle(v,track=straightRoad){
 v.yawRate??=0;v.steerAngle??=0;v.collision??=0;v.impact??=0;v.slip??=0;v.reverseWait??=0;
 if(v.x===undefined){
  const f=track.frame(v.distance,v.lateral);v.x=f.p.x;v.z=f.p.z;
  v.yaw=Math.atan2(f.dir.x,f.dir.z)-(v.heading??0);
  v.vx=Math.sin(v.yaw)*(v.speed??0);v.vz=Math.cos(v.yaw)*(v.speed??0);
 }
 v.yaw??=0;v.vx??=0;v.vz??=0;
 updateRoadPosition(v,track);
}
export function updateRoadPosition(v,track=straightRoad){
 const road=track.project(v.x,v.z,v.distance);
 v.road=road;v.distance=road.distance;v.lateral=road.lateral;
 v.heading=wrapAngle(Math.atan2(road.dir.x,road.dir.z)-v.yaw);
 v.lateralVelocity=v.vx*road.right.x+v.vz*road.right.z;
 v.forwardSpeed=v.vx*Math.sin(v.yaw)+v.vz*Math.cos(v.yaw);
 v.speed=Math.hypot(v.vx,v.vz);
}
export function stepVehicle(v,input,dt,track=straightRoad){
 initializeVehicle(v,track);v.collision=Math.max(0,v.collision-dt);v.impact*=Math.exp(-dt*8);
 const fx=Math.sin(v.yaw),fz=Math.cos(v.yaw),rx=-fz,rz=fx;
 let forward=v.vx*fx+v.vz*fz,side=v.vx*rx+v.vz*rz;
 const offroad=Math.abs(v.lateral)>7.5,limit=offroad?24:v.boosting?76:(input.cruise??59);
 if(input.brake){
  if(forward>.3){forward=Math.max(0,forward-48*dt);v.reverseWait=0;}
  else{v.reverseWait+=dt;if(v.reverseWait>.4)forward=Math.max(-8,forward-10*dt);}
 }else{
  v.reverseWait=0;
  if(input.gas||v.boosting){forward=forward>limit?Math.max(limit,forward-(offroad?45:14)*dt):Math.min(limit,forward+22*dt);}
  else forward=Math.sign(forward)*Math.max(0,Math.abs(forward)-10*dt);
 }
 if(offroad&&forward>24)forward=Math.max(24,forward-45*dt);
 let requested=clamp(input.steer||0,-1,1)*steeringLimit(v.speed);
 if(input.headingGuard)requested=guardHeading(v,requested,track);
 // Steering return centres the front wheels, not the vehicle's world heading.
 v.steerAngle+=(requested-v.steerAngle)*(1-Math.exp(-dt*12));
 const desiredYaw=clamp(-forward*Math.tan(v.steerAngle)/2.6,-2.2,2.2);
 v.yawRate+=(desiredYaw-v.yawRate)*(1-Math.exp(-dt*9));
 const grip=offroad?12:30;
 side+=clamp(-side*12,-grip,grip)*dt;
 v.slip=Math.abs(side);
 v.vx=fx*forward+rx*side;v.vz=fz*forward+rz*side;
 v.yaw=wrapAngle(v.yaw+v.yawRate*dt);
 v.x+=v.vx*dt;v.z+=v.vz*dt;
 updateRoadPosition(v,track);resolveBarrier(v,track);
}
export function resolveBarrier(v,track=straightRoad){
 if(v.x===undefined)initializeVehicle(v,track);
 updateRoadPosition(v,track);
 const halfWidth=.95*Math.abs(Math.cos(v.heading))+1.95*Math.abs(Math.sin(v.heading));
 const penetration=Math.abs(v.lateral)-(10.375-halfWidth);
 if(penetration<=0)return;
 const sign=Math.sign(v.lateral),nx=v.road.right.x*sign,nz=v.road.right.z*sign;
 v.x-=nx*(penetration+.001);v.z-=nz*(penetration+.001);
 const normalSpeed=v.vx*nx+v.vz*nz;
 if(normalSpeed>0){
  const tx=-nz,tz=nx,tangentSpeed=v.vx*tx+v.vz*tz;
  const friction=1-Math.min(.35,normalSpeed*.015);
  v.vx=tx*tangentSpeed*friction-nx*normalSpeed*.12;
  v.vz=tz*tangentSpeed*friction-nz*normalSpeed*.12;
  // Dampen spin from impact; do not align the car with the road.
  v.yawRate*=.4;
  if(normalSpeed>1){v.collision=.8;v.impact=Math.max(v.impact,normalSpeed);}
 }
 updateRoadPosition(v,track);
}
export function resolveVehicleContact(a,b,track=straightRoad){
 initializeVehicle(a,track);initializeVehicle(b,track);
 const dx=b.x-a.x,dz=b.z-a.z;
 if(dx*dx+dz*dz>20)return false;
 const axes=v=>[{x:Math.sin(v.yaw),z:Math.cos(v.yaw)},{x:-Math.cos(v.yaw),z:Math.sin(v.yaw)}];
 const aa=axes(a),bb=axes(b);
 const extent=(basis,n)=>1.95*Math.abs(basis[0].x*n.x+basis[0].z*n.z)+.95*Math.abs(basis[1].x*n.x+basis[1].z*n.z);
 let depth=Infinity,normal;
 for(const axis of [...aa,...bb]){
  const signed=dx*axis.x+dz*axis.z,overlap=extent(aa,axis)+extent(bb,axis)-Math.abs(signed);
  if(overlap<=0)return false;
  if(overlap<depth){depth=overlap;const sign=Math.sign(signed)||1;normal={x:axis.x*sign,z:axis.z*sign};}
 }
 const correction=depth*.5+.001;
 a.x-=normal.x*correction;a.z-=normal.z*correction;b.x+=normal.x*correction;b.z+=normal.z*correction;
 const closing=(a.vx-b.vx)*normal.x+(a.vz-b.vz)*normal.z;
 if(closing>0){
  const impulse=closing*.56;
  a.vx-=normal.x*impulse;a.vz-=normal.z*impulse;b.vx+=normal.x*impulse;b.vz+=normal.z*impulse;
  const spin=clamp((dx*normal.z-dz*normal.x)*impulse*.025,-.5,.5);
  a.yawRate=clamp(a.yawRate+spin,-2.2,2.2);b.yawRate=clamp(b.yawRate-spin,-2.2,2.2);
  if(closing>1){a.collision=b.collision=.8;a.impact=Math.max(a.impact,closing);b.impact=Math.max(b.impact,closing);}
 }
 updateRoadPosition(a,track);updateRoadPosition(b,track);return true;
}
export function aiSteering(v,track,lane=0){
 initializeVehicle(v,track);
 const lookahead=6+v.speed*.2;
 const aim=track.frame(v.distance+lookahead,lane).p;
 const dx=aim.x-v.x,dz=aim.z-v.z;
 const error=wrapAngle(Math.atan2(dx,dz)-v.yaw);
 const angle=-Math.atan2(2*2.6*Math.sin(error),Math.max(3,Math.hypot(dx,dz)));
 return clamp(angle/steeringLimit(v.speed),-1,1);
}

// Small heading correction, never a position correction or a centre-line target.
export function assistedSteering(v,raw,dt,track=straightRoad){
 const manual=clamp(raw||0,-1,1);
 const eligible=v.forwardSpeed>5&&v.collision<=0&&Math.abs(v.heading)<.7&&Math.abs(v.lateral)<7.5;
 if(!eligible){v.assistWeight=0;return manual;}
 const intent=clamp(1-Math.abs(manual)/.65,0,1);
 const targetWeight=intent*intent;
 // Yield immediately to input; rebuild assistance gently after release.
 v.assistWeight=Math.min(targetWeight,(v.assistWeight??0)+(targetWeight-(v.assistWeight??0))*(1-Math.exp(-dt/ .45)));
 const ahead=track.frame(v.distance+clamp(v.speed*.22,3,14),v.lateral).dir;
 const error=wrapAngle(Math.atan2(ahead.x,ahead.z)-v.yaw);
 const correction=clamp(-error*.9*2.6/(Math.max(8,v.speed)*steeringLimit(v.speed)),-.32,.32);
 return clamp(manual+correction*v.assistWeight,-1,1);
}

// Predict yaw overshoot and progressively constrain wheel input, including after
// wall contact. No teleport, yaw clamp, extra grip or centre-line attraction.
export function guardHeading(v,wheelAngle,track=straightRoad){
 if(v.forwardSpeed<=5||Math.abs(v.heading)>Math.PI*.45)return wheelAngle;
 const limit=(38-16*clamp((v.speed-15)/40,0,1))*Math.PI/180;
 const roadSpeed=v.vx*v.road.dir.x+v.vz*v.road.dir.z;
 const roadYawRate=-(track.curvature?.(v.distance)??0)*roadSpeed;
 const predicted=v.heading+(roadYawRate-v.yawRate)*.18;
 const requestedYaw=-v.forwardSpeed*Math.tan(wheelAngle)/2.6;
 // The closer to the allowed angle, the less outward yaw remains available.
 const safeYaw=clamp(requestedYaw,roadYawRate+(predicted-limit)*3,roadYawRate+(predicted+limit)*3);
 const maxWheel=steeringLimit(v.speed);
 return clamp(-Math.atan(safeYaw*2.6/v.forwardSpeed),-maxWheel,maxWheel);
}
