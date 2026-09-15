import * as THREE from 'three';
import { mod, clamp } from './physics.js';

// Clockwise coastal circuit: straight, hairpin, esses, sweeper,
// second hairpin, chicane and a flowing return to the start.
const points = [
 [-240,7,-240],[-80,7,-240],[120,7,-240],[200,7,-240],
 [235,7,-225],[240,7,-200],[215,7,-180],[165,7,-180],
 [105,9,-175],[65,12,-140],[95,15,-105],[145,18,-70],
 [145,18,-35],[105,17,5],[130,15,55],
 [230,12,105],[275,10,170],[245,9,245],[150,9,285],
 [0,9,290],[-145,9,290],[-200,9,282],[-224,9,258],
 [-211,9,233],[-175,9,220],[-100,10,220],
 [-45,12,202],[-40,13,169],[-85,14,143],[-135,13,113],
 [-240,10,100],[-300,8,40],[-315,7,-60],[-295,7,-170],
];
export function createTrack() {
 const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),true,'catmullrom',.6);
 curve.arcLengthDivisions=6000;curve.updateArcLengths();
 const length=curve.getLength();
 function frame(distance,lateral=0){const t=mod(distance,length)/length,p=curve.getPointAt(t),dir=curve.getTangentAt(t).normalize(),right=new THREE.Vector3(-dir.z,0,dir.x).normalize();p.addScaledVector(right,lateral);return {p,dir,right};}
 function rawCurvature(distance){const a=frame(distance-2).dir,b=frame(distance+2).dir;return Math.atan2(a.x*b.z-a.z*b.x,a.dot(b))/4;}
 const count=Math.ceil(length/2),spacing=length/count;
 const samples=Array.from({length:count},(_,i)=>rawCurvature(i*spacing));
 function curvature(distance){const f=mod(distance,length)/spacing,i=Math.floor(f),u=f-i;return samples[i]*(1-u)+samples[(i+1)%count]*u;}
 function cornerSpeed(distance,lateral=0){const k=curvature(distance),laneK=k/Math.max(.35,1-k*lateral);return clamp(Math.sqrt(18/Math.max(.0001,Math.abs(laneK))),8,76);}
 function targetSpeed(distance,cruise=59,lateral=0){let speed=cruise;for(let ahead=0;ahead<=150;ahead+=5){const limit=cornerSpeed(distance+ahead,lateral);speed=Math.min(speed,Math.sqrt(limit*limit+2*22*Math.max(0,ahead-12)));}return speed;}
 // Project physical positions onto nearby segments for road contacts and lap progress.
 // The unwrapped hint prevents jumping to a neighboring section or skipping a lap.
 const centerline=Array.from({length:count+1},(_,i)=>curve.getPointAt((i%count)/count));
 function project(x,z,hint=0){
   const center=Math.floor(hint/spacing);let best=null;
   for(let j=center-24;j<=center+24;j++){
     const i=mod(j,count),a=centerline[i],b=centerline[i+1];
     const dx=b.x-a.x,dz=b.z-a.z;
     const u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
     const px=a.x+u*dx,pz=a.z+u*dz,error=(x-px)**2+(z-pz)**2;
     if(!best||error<best.error){
       const norm=Math.hypot(dx,dz),right={x:-dz/norm,z:dx/norm};
       best={distance:(j+u)*spacing,lateral:(x-px)*right.x+(z-pz)*right.z,
         p:{x:px,y:a.y+(b.y-a.y)*u,z:pz},right,dir:{x:dx/norm,y:(b.y-a.y)/norm,z:dz/norm},error};
     }
   }
   return best;
 }
 function nearest(point){let best=Infinity,result=0;for(let d=0;d<length;d+=2){const p=frame(d).p;const delta=(p.x-point[0])**2+(p.z-point[1])**2;if(delta<best){best=delta;result=d;}}return result;}
 const corners=[
 {name:'海岬发卡弯',point:[235,-225],type:'hairpin'},
 {name:'山脊连续 S 弯',point:[65,-140],type:'esses'},
 {name:'海岸高速弯',point:[275,170],type:'sweeper'},
 {name:'港湾发卡弯',point:[-224,258],type:'hairpin'},
 {name:'回程减速弯',point:[-40,169],type:'chicane'},
 ].map(c=>({...c,distance:nearest(c.point)}));
 function upcoming(distance){return corners.map(c=>({...c,ahead:mod(c.distance-distance,length)})).sort((a,b)=>a.ahead-b.ahead)[0];}
 return {length,frame,project,curvature,cornerSpeed,targetSpeed,corners,upcoming};
}
