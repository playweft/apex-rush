// Assisted track-relative dynamics: forward speed, lateral velocity and yaw.
// This keeps the arcade controls while giving contact a velocity-based response.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function initializeVehicle(v){
 v.heading??=0;v.lateralVelocity??=0;v.collision??=0;v.impact??=0;v.slip??=0;
}
export function stepHandling(v,steer,curvature,dt){
 initializeVehicle(v);v.collision=Math.max(0,v.collision-dt);v.impact*=Math.exp(-dt*8);
 const offroad=Math.abs(v.lateral)>7.5;
 const desired=Math.asin(clamp(steer*(3+v.speed*.105)/Math.max(v.speed,8),-.55,.55));
 v.heading+=(desired-v.heading)*(1-Math.exp(-dt*7));
 const wheelVelocity=Math.sin(v.heading)*v.speed;
 const grip=offroad?10:26;
 const lateralForce=clamp((wheelVelocity-v.lateralVelocity)*6-curvature*v.speed*v.speed,-grip,grip);
 v.lateralVelocity+=lateralForce*dt;
 if(v.speed<2)v.lateralVelocity*=Math.exp(-dt*8);
 v.slip=Math.abs(wheelVelocity-v.lateralVelocity);
 v.lateral+=v.lateralVelocity*dt;
 resolveBarrier(v);
}
export function resolveBarrier(v){
 initializeVehicle(v);
 const halfWidth=.95*Math.cos(v.heading)+1.95*Math.abs(Math.sin(v.heading));
 const limit=10.375-halfWidth;
 if(Math.abs(v.lateral)<=limit)return;
 const side=Math.sign(v.lateral),impact=Math.max(0,v.lateralVelocity*side);
 v.lateral=side*limit;
 if(impact<=0)return;
 const incidence=clamp(impact/Math.max(v.speed,1),0,1);
 v.speed=Math.max(0,v.speed-impact*(.25+incidence*.9));
 v.lateralVelocity=-side*impact*.18;
 // Turn gently away from contact instead of trapping the car against the rail.
 v.heading=clamp(v.heading-side*Math.min(.16,impact*.012),-.55,.55);
 v.impact=Math.max(v.impact,impact);if(impact>1)v.collision=.8;
}
export function resolveVehicleContact(a,b,length){
 initializeVehicle(a);initializeVehicle(b);
 const dz=((b.distance-a.distance+length/2)%length+length)%length-length/2;
 const dx=b.lateral-a.lateral;
 // Conservative bounds include the extra width of a car turned across the road.
 const width=v=>.95*Math.cos(v.heading)+1.95*Math.abs(Math.sin(v.heading));
 const overlapX=width(a)+width(b)-Math.abs(dx),overlapZ=3.9-Math.abs(dz);
 if(overlapX<=0||overlapZ<=0)return false;
 const lateral=overlapX<overlapZ;
 const sign=Math.sign(lateral?dx:dz)||1;
 const av=lateral?a.lateralVelocity:a.speed,bv=lateral?b.lateralVelocity:b.speed;
 const closing=(av-bv)*sign;
 // Symmetric separation works even when the contact has no relative velocity.
 const correction=(lateral?overlapX:overlapZ)*.5+.001;
 if(lateral){a.lateral-=sign*correction;b.lateral+=sign*correction;}
 else{a.distance-=sign*correction;b.distance+=sign*correction;}
 if(closing>0){
   const impulse=closing*.56; // equal mass, low restitution
   if(lateral){a.lateralVelocity-=sign*impulse;b.lateralVelocity+=sign*impulse;
     const yaw=clamp(sign*impulse*.009,-.12,.12);a.heading=clamp(a.heading-yaw,-.55,.55);b.heading=clamp(b.heading+yaw,-.55,.55);
   }else{a.speed=Math.max(0,a.speed-sign*impulse);b.speed=Math.max(0,b.speed+sign*impulse);}
   if(closing>1){a.collision=b.collision=.8;a.impact=Math.max(a.impact,closing);b.impact=Math.max(b.impact,closing);}
 }
 resolveBarrier(a);resolveBarrier(b);return true;
}
export function laneSteering(v,curvature,lane=0){
 initializeVehicle(v);
 const desiredVelocity=curvature*v.speed*v.speed/6+(lane-v.lateral)*2-v.lateralVelocity*1.1;
 return clamp(desiredVelocity/(3+v.speed*.105),-1,1);
}
