import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {createTrack} from './track.js';
import {smoothHorizonRoll} from './camera-motion.js';
export function createWorld(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#aacdd2');scene.fog=new THREE.Fog('#aacdd2',160,700);
 scene.add(new THREE.HemisphereLight(0xd9f3ff,0x65735a,2.7));const sun=new THREE.DirectionalLight(0xffe3b1,3);sun.position.set(-140,220,60);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(60,1,.1,1300);
 const track=createTrack();const {length,frame}=track;
 const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.86});
 function ribbon(left,right,y,material,segments=1400,filter=()=>true){const positions=[],indices=[];for(let i=0;i<segments;i++){if(!filter(i))continue;const a=frame(i/segments*length),b=frame((i+1)/segments*length);const n=positions.length/3;for(const [f,offset]of[[a,left],[a,right],[b,left],[b,right]]){positions.push(f.p.x+f.right.x*offset,f.p.y+y,f.p.z+f.right.z*offset);}indices.push(n,n+1,n+2,n+1,n+3,n+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);scene.add(mesh);return mesh;}
 ribbon(-10,10,-.22,mat('#898974'));ribbon(-8,8,0,mat('#35434a'));ribbon(-8.8,-8,.02,mat('#ede5c9'));ribbon(8,8.8,.02,mat('#ede5c9'));
 ribbon(-8.8,-8,.04,mat('#df674e'),1400,i=>Math.floor(i/4)%2===0);ribbon(8,8.8,.04,mat('#df674e'),1400,i=>Math.floor(i/4)%2===0);
 for(const lane of [-2.67,2.67])ribbon(lane-.07,lane+.07,.025,mat('#e8e8d1'),1400,i=>i%12<5);
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),mat('#438b94'));sea.rotation.x=-Math.PI/2;sea.position.y=-6;scene.add(sea);
 const land=new THREE.Mesh(new THREE.CylinderGeometry(440,465,15,48),mat('#798876'));land.position.set(0,-3,0);scene.add(land);
 const dummy=new THREE.Object3D();const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(.25,.55,4),mat('#d6e0d5'),Math.ceil(length/5)*2);let ri=0;
 for(let d=0;d<length;d+=5){for(const side of [-10.5,10.5]){const f=frame(d,side);dummy.position.copy(f.p);dummy.position.y+=.55;dummy.rotation.set(0,Math.atan2(f.dir.x,f.dir.z),0);dummy.updateMatrix();rails.setMatrixAt(ri++,dummy.matrix);}}rails.count=ri;scene.add(rails);
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.3,.55,4,5),mat('#5e6854'),140),crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(3,10,5),mat('#3d6657'),140);
 let seed=42;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<140;i++){const f=frame(i/140*length,(i%2?1:-1)*(22+rnd()*12));dummy.position.copy(f.p);dummy.position.y+=1;dummy.rotation.set(0,rnd()*6,0);dummy.scale.setScalar(.7+rnd()*.6);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y+=5;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);}scene.add(trunks,crowns);
 for(let i=0;i<14;i++){const h=40+rnd()*130;const mountain=new THREE.Mesh(new THREE.ConeGeometry(65+rnd()*65,h,5),mat(i%2?'#829a90':'#697f79'));const a=i/14*Math.PI*2;mountain.position.set(Math.cos(a)*580,h/2-8,Math.sin(a)*550);mountain.rotation.y=rnd()*6;scene.add(mountain);}
 const white=mat('#f2f0d9'),black=mat('#26353b');
 for(let i=0;i<8;i++)for(let j=0;j<2;j++){const f=frame(j*1.2, -7+i*2);const tile=new THREE.Mesh(new THREE.BoxGeometry(2,.035,1.2),(i+j)%2?white:black);tile.position.copy(f.p);tile.position.y+=.045;tile.rotation.y=Math.atan2(f.dir.x,f.dir.z);scene.add(tile);}
 const gate=new THREE.Group();for(const x of [-10,10]){const p=new THREE.Mesh(new THREE.BoxGeometry(.5,10,.5),black);p.position.set(x,5,0);gate.add(p);}const beam=new THREE.Mesh(new THREE.BoxGeometry(21,1.6,.6),black);beam.position.y=10;gate.add(beam);for(let i=0;i<20;i++){const sq=new THREE.Mesh(new THREE.BoxGeometry(.9,.65,.65),i%2?white:black);sq.position.set(-9.5+i,10,0);gate.add(sq);}const gf=frame(0);gate.position.copy(gf.p);gate.rotation.y=Math.atan2(gf.dir.x,gf.dir.z);scene.add(gate);
 function car(color){const group=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color,metalness:.4,roughness:.3}),glass=mat('#1c3945'),rubber=mat('#172127');function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);group.add(o);return o;}box(1.85,.5,3.7,paint,0,.65,0);box(1.75,.25,1.5,paint,0,.9,1);box(1.45,.55,1.6,glass,0,1.08,-.25);box(1.45,.12,1.35,paint,0,1.4,-.3);box(.26,.025,3.72,black,0,.915,0);box(2,.15,.4,black,0,1.1,-1.75);box(.12,.45,.12,black,-.65,.86,-1.7);box(.12,.45,.12,black,.65,.86,-1.7);
 for(const x of [-.96,.96])for(const z of [-1.12,1.12]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.3,10),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.4,z);group.add(wheel);}
 const red=new THREE.MeshBasicMaterial({color:'#ff594d'});for(const x of [-.63,.63]){box(.45,.14,.04,red,x,.78,-1.87);box(.5,.1,.04,white,x,.72,1.86);}const flame=new THREE.Mesh(new THREE.ConeGeometry(.3,2,8),new THREE.MeshBasicMaterial({color:'#83eaff'}));flame.rotation.x=-Math.PI/2;flame.position.set(0,.5,-2.5);flame.visible=false;group.add(flame);scene.add(group);return {group,flame};}
 const player=car('#d9ff65'),rivals=['#ef734f','#e6d7b9','#719bdc','#ac87cd','#55c4b0'].map(car);
 for(const corner of track.corners.filter(c=>c.type!=='sweeper'))for(const distance of [100,50]){
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#10242c';ctx.fillRect(0,0,256,128);ctx.strokeStyle='#d9ff65';ctx.lineWidth=8;ctx.strokeRect(4,4,248,120);ctx.fillStyle='#ffffff';ctx.font='bold 80px sans-serif';ctx.textAlign='center';ctx.fillText(String(distance),128,94);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const board=new THREE.Mesh(new THREE.PlaneGeometry(3.8,1.9),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
   const f=frame(corner.distance-distance,12);board.position.copy(f.p);board.position.y+=2.8;board.rotation.y=Math.atan2(-f.dir.x,-f.dir.z);scene.add(board);
 }
 const loader=new GLTFLoader();
 const assetsReady=Promise.all(['race','race-future','sedan-sports','cone'].map(name=>loader.loadAsync(`${import.meta.env.BASE_URL}models/kenney/${name}.glb`))).then(models=>{
   [player,...rivals].forEach((vehicle,i)=>{
     const model=models[i%3].scene.clone(true);
     const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
     const scale=3.9/size.z;model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
     model.traverse(node=>{if(node.isMesh){node.material=node.material.clone();node.material.roughness=.55;}});
     for(const child of [...vehicle.group.children])if(child!==vehicle.flame){vehicle.group.remove(child);child.geometry?.dispose();}
     vehicle.group.add(model);
   });
   for(let i=0;i<16;i++){const model=models[3].scene.clone(true),f=frame(50+i*4,i%2?-9.4:9.4);model.scale.setScalar(1.7);model.position.copy(f.p);scene.add(model);}
 });
 const chase=new THREE.Vector3(),target=new THREE.Vector3();let initialized=false,horizonRoll=0;
 function place(object,d,lateral,steer=0){const f=frame(d,lateral);object.group.position.copy(f.p);object.group.position.y+=.08;object.group.rotation.set(0,Math.atan2(f.dir.x,f.dir.z)-steer*.08,steer*.035);return f;}
 function draw(state,dt,idle=false,steer=0,rollTarget=0){const f=place(player,state.distance,state.lateral,steer);player.flame.visible=state.boosting;state.rivals.forEach((r,i)=>place(rivals[i],r.distance,r.lateral));
 if(idle){chase.copy(f.p).addScaledVector(f.dir,-13).addScaledVector(f.right,9);chase.y+=6;target.copy(f.p).addScaledVector(f.dir,12);target.y+=1;}else{chase.copy(f.p).addScaledVector(f.dir,-11.5-state.speed*.025);chase.y+=5.6;target.copy(f.p).addScaledVector(f.dir,18+state.speed*.1);target.y+=1.6;}
 const k=initialized?1-Math.exp(-dt*7):1;camera.position.lerp(chase,k);camera.lookAt(target);horizonRoll=smoothHorizonRoll(horizonRoll,rollTarget,dt);camera.rotateZ(horizonRoll);camera.fov=THREE.MathUtils.lerp(camera.fov,state.boosting?70:60,Math.min(1,dt*3));camera.updateProjectionMatrix();initialized=true;renderer.render(scene,camera);}
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}resize();window.addEventListener('resize',resize);
 return {...track,draw,assetsReady,renderer,resetHorizon(){horizonRoll=0;}};
}
