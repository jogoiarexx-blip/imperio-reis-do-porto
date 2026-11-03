import * as THREE from 'three';
import type {Building,Bounds,CityManifest} from './CityGenerator';

export type CityVisual={root:THREE.Group;doors:THREE.Object3D[];interiors:Map<string,THREE.Group>;roofByBuilding:Map<string,THREE.Object3D>;clickables:THREE.Object3D[]};
const mat=(color:number,roughness=0.83)=>new THREE.MeshStandardMaterial({color,roughness});
const asphalt=mat(0x292d35),concrete=mat(0x858486),floorMat=mat(0x806e5a);
function box(w:number,h:number,d:number,color:number|THREE.Material):THREE.Mesh{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof color==='number'?mat(color):color);m.castShadow=true;m.receiveShadow=true;return m;}
function addLabel(group:THREE.Group,label:string,x:number,y:number,z:number,width:number){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=100;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#252a32';ctx.fillRect(0,0,512,100);ctx.strokeStyle='#d9bd76';ctx.lineWidth=5;ctx.strokeRect(4,4,504,92);
 ctx.fillStyle='#f5e7c7';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 30px Georgia,serif';
 ctx.fillText(label.slice(0,26).toUpperCase(),256,52,470);
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(4,Math.min(width-1,13)),1.0),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),side:THREE.DoubleSide}));
 mesh.position.set(x,y,z);group.add(mesh);
}
export function buildCity(world:CityManifest):CityVisual{
 const root=new THREE.Group(),doors:THREE.Object3D[]=[],interiors=new Map<string,THREE.Group>(),roofByBuilding=new Map<string,THREE.Object3D>(),clickables:THREE.Object3D[]=[];
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(460,400),mat(0x3e4740));ground.rotation.x=-Math.PI/2;ground.position.y=-0.06;ground.receiveShadow=true;root.add(ground);
 // Toda a malha viária vem do mesmo manifesto usado pelos lotes.
 for(const s of world.streets){const vertical=s.x1===s.x2;const length=vertical?Math.abs(s.z2-s.z1):Math.abs(s.x2-s.x1);
  const road=box(vertical?s.width: length,0.045,vertical?length:s.width,asphalt);road.position.set((s.x1+s.x2)/2,0.012,(s.z1+s.z2)/2);root.add(road);
  const markingMat=new THREE.MeshBasicMaterial({color:0xc2b99b});for(let t=0;t<Math.floor(length/10);t++){const marking=new THREE.Mesh(new THREE.PlaneGeometry(vertical?0.12:4,vertical?4:0.12),markingMat);marking.rotation.x=-Math.PI/2;marking.position.set(vertical?s.x1:s.x1+5+10*t,0.038,vertical?s.z1+5+10*t:s.z1);root.add(marking);}
 }
 for(const block of world.blocks){const b=block.bounds;const p=box(b.maxX-b.minX+4.3,0.18,b.maxZ-b.minZ+4.3,concrete);p.position.set((b.minX+b.maxX)/2,0.07,(b.minZ+b.maxZ)/2);root.add(p);
  const inner=box(b.maxX-b.minX,0.015,b.maxZ-b.minZ,mat(0x6b7065));inner.position.set(p.position.x,0.172,p.position.z);inner.castShadow=false;root.add(inner);
 }
 const glass=new THREE.MeshStandardMaterial({color:0x293e55,roughness:0.28,metalness:0.2,emissive:0x0c1723});
 for(const b of world.buildings){
  const g=new THREE.Group();g.userData.buildingId=b.id;g.userData.name=b.name;
  const {minX,maxX,minZ,maxZ}=b.bounds,w=maxX-minX,d=maxZ-minZ;
  const x=(minX+maxX)/2,z=(minZ+maxZ)/2,h=b.floors*3.12;
  const facade=mat(b.color),trim=mat(0xb9b3a4),dark=mat(0x383739);
  const shell=box(w,h,d,facade);shell.position.set(x,0.17+h/2,z);shell.userData={buildingId:b.id,name:b.name};
  if(b.tier==='full'){
    // Recinto fisicamente oco: fundo, laterais e porta alinhada à rua.
    const walls:THREE.Mesh[]=[];
    for(const xx of [minX+0.19,maxX-0.19]){const wall=box(0.38,h,d,facade);wall.position.set(xx,0.17+h/2,z);walls.push(wall);}
    const backZ=b.entrance.side===-1?maxZ-0.19:minZ+0.19;
    const back=box(w,h,0.38,facade);back.position.set(x,0.17+h/2,backZ);walls.push(back);
    const frontZ=b.entrance.z;
    const frontW=(w-2.6)/2;for(const sx of [-1,1]){const side=box(frontW,h,0.38,facade);side.position.set(x+sx*(w+2.6)/4,0.17+h/2,frontZ);walls.push(side);}
    for(const wall of walls){wall.userData={buildingId:b.id,name:b.name};g.add(wall);clickables.push(wall);}
    const roof=box(w+0.45,0.38,d+0.45,dark);roof.position.set(x,0.17+h,z);g.add(roof);roofByBuilding.set(b.id,roof);
    const groundInside=box(w-0.8,0.12,d-0.8,floorMat);groundInside.position.set(x,0.23,z);g.add(groundInside);
    const inside=new THREE.Group();
    const counter=box(Math.min(4,w-3),1,1.2,b.kind==='Oficina'?0x683d29:0x54331e);counter.position.set(x,0.85,z+3);inside.add(counter);
    for(const sx of [-1,1]){const shelf=box(1.4,1.9,0.7,0x5c5147);shelf.position.set(x+sx*(w/2-1.4),1.12,z+2);inside.add(shelf);}
    const lamp=new THREE.PointLight(0xffc486,12,18);lamp.position.set(x,2.9,z);inside.add(lamp);g.add(inside);interiors.set(b.id,inside);
  }else{g.add(shell);clickables.push(shell);}
  const frontZ=b.entrance.z+(b.entrance.side===-1?-0.04:0.04);
  const door=box(1.45,2.22,0.12,b.enterable?0x7d5133:0x42474c);door.position.set(x,1.28,frontZ);door.userData={buildingId:b.id,name:b.name,enterable:b.enterable};g.add(door);doors.push(door);clickables.push(door);
  const signZ=frontZ+(b.entrance.side===-1?-0.16:0.16);
  if(b.kind!=='Residência')addLabel(g,b.name,x,3.12,signZ,w);
  const windowWidth=Math.max(1.0,Math.min(1.75,w/8));
  for(let level=1;level<b.floors;level++){
   for(let j=1;j<=4;j++){const xx=minX+(w*j)/5;const pane=box(windowWidth,1.45,0.13,glass);pane.castShadow=false;pane.position.set(xx,level*3.12+1.35,frontZ);g.add(pane);
    const sill=box(windowWidth+0.25,0.1,0.28,trim);sill.castShadow=false;sill.position.set(xx,level*3.12+0.57,frontZ);g.add(sill);
   }
  }
  const cornice=box(w+0.14,0.25,0.26,trim);cornice.position.set(x,h,frontZ);g.add(cornice);
  if(b.tier==='shell'){const vitrine=box(Math.min(w-2.8,5),1.7,0.14,new THREE.MeshStandardMaterial({color:0x68919b,transparent:true,opacity:0.5,metalness:0.25,roughness:0.2}));vitrine.position.set(x-1.4,1.5,frontZ);g.add(vitrine);}
  root.add(g);
 }
 // Instancing reduz draw calls de mobiliário urbano distante.
 const lamps:THREE.Vector3[]=[];const trees:THREE.Vector3[]=[];
 for(const block of world.blocks){const {minX,maxX,minZ,maxZ}=block.bounds;for(let i=0;i<5;i++){
  const x=minX+7+(maxX-minX-14)*i/4;
  lamps.push(new THREE.Vector3(x,2.35,minZ-2.35));
  if(i%2===0)trees.push(new THREE.Vector3(x,1.6,maxZ+2.8));
 }}
 const dummy=new THREE.Object3D();const postMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.085,0.12,4.7,6),mat(0x3a3b3c),lamps.length);
 lamps.forEach((p,i)=>{dummy.position.copy(p);dummy.scale.set(1,1,1);dummy.updateMatrix();postMesh.setMatrixAt(i,dummy.matrix);});postMesh.instanceMatrix.needsUpdate=true;root.add(postMesh);
 const leaf=new THREE.InstancedMesh(new THREE.ConeGeometry(1.75,3.5,7),mat(0x385b43),trees.length);
 trees.forEach((p,i)=>{dummy.position.copy(p);dummy.updateMatrix();leaf.setMatrixAt(i,dummy.matrix);});leaf.instanceMatrix.needsUpdate=true;root.add(leaf);
 return {root,doors,interiors,roofByBuilding,clickables};
}
export function contains(bounds:Bounds,x:number,z:number,pad=0){return x>bounds.minX-pad&&x<bounds.maxX+pad&&z>bounds.minZ-pad&&z<bounds.maxZ+pad;}
export function nearbyBuilding(world:CityManifest,x:number,z:number,maxDistance=4):Building|null{let best:Building|null=null;let dist=maxDistance;for(const b of world.buildings){const d=Math.hypot(x-b.entrance.x,z-b.entrance.z);if(d<dist){dist=d;best=b;}}return best;}
