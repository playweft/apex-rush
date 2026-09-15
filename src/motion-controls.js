const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// One input curve and one adaptive filter, evaluated at the physics update rate.
export function motionCurve(input){const x=clamp(input,-1,1);return .7*x+.3*x*x*x;}
export function motionHeadingLimit(speed){return (25-9*clamp((speed-15)/40,0,1))*Math.PI/180;}
export function smoothMotionInput(current,target,dt){
 const decisive=Math.abs(target)>.6||current*target<0||Math.abs(target)<.01;
 const rate=decisive?24:12;
 return current+(target-current)*(1-Math.exp(-Math.max(0,dt)*rate));
}
export function motionTarget(input,speed,lateral,bendBias=0){
 const limit=motionHeadingLimit(speed),wanted=clamp(motionCurve(input)*limit+bendBias,-limit,limit);
 const wall=clamp((Math.abs(lateral)-7)/1.5,0,1);
 const outward=limit*(1-wall)-.07*wall;
 // Only constrain the dangerous side; leaving a wall keeps full authority.
 return lateral>0?Math.min(wanted,outward):lateral<0?Math.max(wanted,-outward):wanted;
}
