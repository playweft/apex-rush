import * as THREE from 'three';

export const NATURE_MODELS = ['tree_detailed','tree_oak','tree_palmDetailedTall','plant_bushDetailed','rock_largeA'];

export function createTerrain(track) {
  const samples = [];
  for (let d = 0; d < track.length; d += 5) samples.push(track.frame(d).p);
  function surface(x,z) {
    let distance2=Infinity, roadHeight=7;
    for (const point of samples) {
      const candidate=(point.x-x)**2+(point.z-z)**2;
      if(candidate<distance2){distance2=candidate;roadHeight=point.y;}
    }
    const distance=Math.sqrt(distance2);
    const angle=Math.atan2(z,x);
    const coast=405+22*Math.sin(angle*3)+13*Math.cos(angle*5);
    const radius=Math.hypot(x,z);
    const inland=THREE.MathUtils.smoothstep(distance,14,75);
    const hills=10+10*Math.sin(x*.011)*Math.cos(z*.009)+5*Math.sin(z*.025+x*.014);
    let height=THREE.MathUtils.lerp(roadHeight-1.2,hills,inland);
    height=THREE.MathUtils.lerp(height,-7,THREE.MathUtils.smoothstep(radius,coast-28,coast+25));
    return {height,distance,radius,coast};
  }
  return {surface};
}

export function buildTerrain(scene,terrain) {
  const geometry=new THREE.PlaneGeometry(1000,1000,150,150);
  geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position,colors=[];
  const grass=new THREE.Color('#66794b'),lightGrass=new THREE.Color('#81935b'),sand=new THREE.Color('#c8b185'),cliff=new THREE.Color('#8a8d78');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),s=terrain.surface(x,z);
    positions.setY(i,s.height);
    const variation=(Math.sin(x*.073+z*.031)+Math.cos(z*.091-x*.041)+2)/4;
    const color=grass.clone().lerp(lightGrass,variation*.65);
    if(s.radius>s.coast-35)color.lerp(sand,THREE.MathUtils.smoothstep(s.radius,s.coast-35,s.coast));
    if(s.height>17)color.lerp(cliff,Math.min(.6,(s.height-17)/15));
    colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));mesh.receiveShadow=true;scene.add(mesh);
}

// Deterministic clusters, with a clear margin around every part of the track.
export function sceneryPlacements(terrain) {
  let seed=731;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const groups=Array.from({length:NATURE_MODELS.length},()=>[]);
  for(let i=0;i<1800;i++){
    const x=(random()-.5)*780,z=(random()-.5)*780,s=terrain.surface(x,z);
    if(s.distance<19||s.radius>s.coast-22||s.height<0)continue;
    const grove=Math.sin(x*.019)+Math.cos(z*.021);
    if(grove<-.4&&random()<.85)continue;
    const kind=random()<.2?3:random()<.19?4:x<-80?Math.floor(random()*3):random()<.65?0:1;
    if(groups[kind].length>100)continue;
    const height=kind===3?1.2+random()*1.7:kind===4?1.7+random()*3.7:6+random()*7;
    groups[kind].push({x,z,y:s.height-.12,height,rotation:random()*Math.PI*2,tint:.87+random()*.13});
  }
  return groups;
}

// Bake each source node transform once, then draw all copies as instances.
export function addModelInstances(scene,source,placements) {
  source.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(source),height=box.max.y-box.min.y;
  if(!Number.isFinite(height)||height<=0)throw new Error('Invalid scenery model bounds');
  const center=box.getCenter(new THREE.Vector3()),dummy=new THREE.Object3D();
  source.traverse(node=>{
    if(!node.isMesh)return;
    const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);
    geometry.translate(-center.x,-box.min.y,-center.z);
    const batch=new THREE.InstancedMesh(geometry,node.material,placements.length);
    placements.forEach((p,i)=>{
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.setScalar(p.height/height);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
      batch.setColorAt(i,new THREE.Color(p.tint,p.tint,p.tint));
    });
    batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();scene.add(batch);
  });
}

export function addSky(scene){
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1100,24,12),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color('#548faa')},horizon:{value:new THREE.Color('#cfddcf')}},
    vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 top;uniform vec3 horizon;varying vec3 direction;void main(){float h=max(normalize(direction).y,0.0);vec3 c=mix(horizon,top,pow(h,.55));gl_FragColor=vec4(c,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  }));
  // Preprocessor directives must begin on their own lines.
  sky.material.fragmentShader=sky.material.fragmentShader.replace(';#include',';\n#include');
  sky.frustumCulled=false;scene.add(sky);
  return sky;
}
