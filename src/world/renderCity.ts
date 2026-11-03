import * as THREE from 'three';
import type {Building,Bounds,CityManifest} from './CityGenerator';
import {npcSpot} from '../game/Interaction';

export type CityVisual={root:THREE.Group;doors:THREE.Object3D[];interiors:Map<string,THREE.Group>;roofByBuilding:Map<string,THREE.Object3D>;doorByBuilding:Map<string,THREE.Group>;renovationByBuilding:Map<string,THREE.Group>;interiorObstacles:Map<string,Bounds[]>;clickables:THREE.Object3D[]};
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
 const root=new THREE.Group(),doors:THREE.Object3D[]=[],interiors=new Map<string,THREE.Group>(),roofByBuilding=new Map<string,THREE.Object3D>(),doorByBuilding=new Map<string,THREE.Group>(),renovationByBuilding=new Map<string,THREE.Group>(),interiorObstacles=new Map<string,Bounds[]>(),clickables:THREE.Object3D[]=[];
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(460,400),mat(0x3e4740));ground.rotation.x=-Math.PI/2;ground.position.y=-0.06;ground.receiveShadow=true;root.add(ground);
 // Toda a malha viária vem do mesmo manifesto usado pelos lotes.
 for(const s of world.streets){const vertical=s.x1===s.x2;const length=vertical?Math.abs(s.z2-s.z1):Math.abs(s.x2-s.x1);
  const road=box(vertical?s.width: length,0.045,vertical?length:s.width,asphalt);road.position.set((s.x1+s.x2)/2,0.012,(s.z1+s.z2)/2);root.add(road);
  const markingMat=new THREE.MeshBasicMaterial({color:0xc2b99b});for(let t=0;t<Math.floor(length/10);t++){const marking=new THREE.Mesh(new THREE.PlaneGeometry(vertical?0.12:4,vertical?4:0.12),markingMat);marking.rotation.x=-Math.PI/2;marking.position.set(vertical?s.x1:s.x1+5+10*t,0.038,vertical?s.z1+5+10*t:s.z1);root.add(marking);}
 }
 // Cruzamentos demarcados usando a própria malha viária, sem posicionamento aleatório.
 const lineMat=new THREE.MeshBasicMaterial({color:0xded5b8});
 for(const horizontal of world.streets.filter(st=>st.z1===st.z2)){
  for(const vertical of world.streets.filter(st=>st.x1===st.x2)){
    const x=vertical.x1,z=horizontal.z1;
    if(x<Math.min(horizontal.x1,horizontal.x2)||x>Math.max(horizontal.x1,horizontal.x2)||
       z<Math.min(vertical.z1,vertical.z2)||z>Math.max(vertical.z1,vertical.z2))continue;
    for(let t=-3;t<=3;t++){
      const stripe=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.42),lineMat);
      stripe.rotation.x=-Math.PI/2;stripe.position.set(x+7,.05,z+t*.85);root.add(stripe);
    }
  }
 }
 for(const block of world.blocks){const b=block.bounds;const p=box(b.maxX-b.minX+4.3,0.18,b.maxZ-b.minZ+4.3,concrete);p.position.set((b.minX+b.maxX)/2,0.07,(b.minZ+b.maxZ)/2);root.add(p);
  const inner=box(b.maxX-b.minX,0.015,b.maxZ-b.minZ,mat(0x6b7065));inner.position.set(p.position.x,0.172,p.position.z);inner.castShadow=false;root.add(inner);
 }
 const glass=new THREE.MeshStandardMaterial({color:0x293e55,roughness:0.28,metalness:0.2,emissive:0x0c1723});
 for(const b of world.buildings){
  const g=new THREE.Group();g.userData.buildingId=b.id;g.userData.name=b.name;
  const lot=world.lots.find(item=>item.id===b.lotId)!;
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
    const obstacles:Bounds[]=[];
    const counter=box(Math.min(4,w-3),1,1.2,b.kind==='Oficina'?0x683d29:0x54331e);counter.position.set(x,0.85,z+3);inside.add(counter);
    obstacles.push({minX:x-Math.min(4,w-3)/2,maxX:x+Math.min(4,w-3)/2,minZ:z+2.4,maxZ:z+3.6});
    for(const sx of [-1,1]){const shelf=box(1.4,1.9,0.7,0x5c5147);shelf.position.set(x+sx*(w/2-1.4),1.12,z+2);inside.add(shelf);
      obstacles.push({minX:shelf.position.x-.7,maxX:shelf.position.x+.7,minZ:z+1.65,maxZ:z+2.35});}
    // Cada imóvel de missão tem composição própria: personagens, mobiliário e volumes sólidos.
    if(b.kind==='Oficina'){
      const lift=box(2.6,.24,4.2,0x53646c);lift.position.set(minX+3.8,.36,z-3.3);inside.add(lift);
      obstacles.push({minX:minX+2.5,maxX:minX+5.1,minZ:z-5.4,maxZ:z-1.2});
      for(const q of [-1,1]){const post=box(.18,2.5,.18,0xc79645);post.position.set(minX+3.8+q*1.35,1.5,z-3.3);inside.add(post);}
      const cabinet=box(2.1,1.85,.55,0x5b6b70);cabinet.position.set(maxX-1.7,1.2,z-5);inside.add(cabinet);
      obstacles.push({minX:maxX-2.75,maxX:maxX-.65,minZ:z-5.3,maxZ:z-4.7});
    }else{
      for(const dz of [-5.3,4.1]){
        const table=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.12,12),mat(0x70523d));
        table.position.set(minX+3.2,1.04,z+dz);table.castShadow=true;inside.add(table);
        const stem=box(.16,.9,.16,0x393a3b);stem.position.set(minX+3.2,.55,z+dz);inside.add(stem);
        obstacles.push({minX:minX+2.3,maxX:minX+4.1,minZ:z+dz-.9,maxZ:z+dz+.9});
      }
      const backBar=box(2.2,2.25,.55,0x805a3a);backBar.position.set(maxX-1.6,1.32,z-3.7);inside.add(backBar);
      obstacles.push({minX:maxX-2.7,maxX:maxX-.5,minZ:z-4,maxZ:z-3.4});
    }
    const person=npcSpot(b),bodyColor=b.kind==='Oficina'?0x567b70:0x6b3744;
    const npc=new THREE.Group();npc.position.set(person.x,.18,person.z);
    const torso=box(.67,.83,.36,bodyColor);torso.position.y=1.12;npc.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.21,10,8),mat(0xd4ac83));head.position.y=1.72;npc.add(head);
    const hair=box(.46,.13,.38,0x29252a);hair.position.y=1.9;npc.add(hair);
    for(const sx of [-1,1]){
      const arm=box(.18,.73,.2,bodyColor);arm.position.set(sx*.44,1.14,0);npc.add(arm);
      const leg=box(.23,.76,.27,0x282b33);leg.position.set(sx*.17,.41,0);npc.add(leg);
    }
    npc.rotation.y=b.entrance.side===-1?Math.PI:0;
    inside.add(npc);
    addLabel(inside,b.kind==='Oficina'?'HELENA VALENÇA':'RAFAEL',person.x,2.7,person.z,b.kind==='Oficina'?7:5);
    const lamp=new THREE.PointLight(0xffc486,5.2,14,2);lamp.position.set(x,2.9,z);inside.add(lamp);
    g.add(inside);interiors.set(b.id,inside);interiorObstacles.set(b.id,obstacles);
  }else if(b.tier==='shell'){
    // Vitrine de verdade: 4,2 m de profundidade, não vidro colado num cubo opaco.
    const displayDepth=4.2,front=b.entrance.z,back=front-b.entrance.side*displayDepth;
    const rear=b.entrance.side===-1?maxZ:minZ;
    const massDepth=Math.abs(rear-back);
    const mass=box(w,h,massDepth,facade);mass.position.set(x,.17+h/2,(rear+back)/2);g.add(mass);clickables.push(mass);
    for(const sx of [-1,1]){
      const sideWall=box(.27,3.2,displayDepth,facade);sideWall.position.set(x+sx*(w/2-.14),1.77,(front+back)/2);g.add(sideWall);
    }
    const floor=box(w-.4,.12,displayDepth,0x766d63);floor.position.set(x,.2,(front+back)/2);g.add(floor);
    const ceiling=box(w, .24,displayDepth,facade);ceiling.position.set(x,3.32,(front+back)/2);g.add(ceiling);
    const backPanel=box(w-.5,3,.08,0x4c4a46);backPanel.position.set(x,1.73,back+b.entrance.side*.08);g.add(backPanel);
    const displayWidth=Math.min(w-3,7.5);
    const stone=box((w-displayWidth)/2,3.2,.34,facade);
    stone.position.set(x-(w+displayWidth)/4,1.77,front);g.add(stone);
    const stone2=stone.clone();stone2.position.x=x+(w+displayWidth)/4;g.add(stone2);
    const glassMaterial=new THREE.MeshStandardMaterial({color:0x95bcc0,transparent:true,opacity:.27,depthWrite:false,metalness:.18,roughness:.12,side:THREE.DoubleSide});
    for(const sx of [-1,1]){
      const glassPane=box((displayWidth-1.9)/2,2.65,.08,glassMaterial);
      glassPane.castShadow=false;glassPane.position.set(x+sx*(displayWidth+1.9)/4,1.62,front-b.entrance.side*.12);g.add(glassPane);
      clickables.push(glassPane);
    }
    const shelfMaterial=mat(0x564a3a);
    if(Number(b.blockId.slice(-1))%2===0){
      // Vitrine de confeitaria/mercado: prateleiras com produtos coloridos.
      for(let hShelf=0;hShelf<2;hShelf++){
        const shelf=box(5,.12,.85,shelfMaterial);shelf.position.set(x,1.05+hShelf*.93,front-b.entrance.side*2.65);g.add(shelf);
        for(let item=0;item<5;item++){
          const packageMesh=box(.43,.57,.4,[0x957347,0x9a403c,0x58756d][(item+hShelf)%3]);
          packageMesh.position.set(x-1.9+item*.96,1.4+hShelf*.93,front-b.entrance.side*2.65);g.add(packageMesh);
        }
      }
    }else{
      // Vitrine de moda/serviços: dois expositores e banco, distinguindo o shell visual.
      for(const sx of [-1,1]){
        const display=box(.9,1.35,.52,sx===1?0x8c6954:0x526576);display.position.set(x+sx*1.8,1.2,front-b.entrance.side*2.25);g.add(display);
        const stand=box(1.05,.16,.68,0xb2a28b);stand.position.set(x+sx*1.8,.48,front-b.entrance.side*2.25);g.add(stand);
      }
      const bench=box(3,.32,.65,0x95683e);bench.position.set(x,.42,front-b.entrance.side*3.5);g.add(bench);
    }
  }else{g.add(shell);clickables.push(shell);}
  const frontZ=b.entrance.z+(b.entrance.side===-1?-0.04:0.04);
  // Eixo real na dobradiça: imóveis acessíveis abrem a porta para dentro.
  const hinge=new THREE.Group();hinge.position.set(x-.73,0,frontZ);
  const door=box(1.45,2.22,0.12,b.enterable?0x7d5133:0x42474c);door.position.set(.73,1.28,0);door.userData={buildingId:b.id,name:b.name,enterable:b.enterable};
  hinge.add(door);g.add(hinge);doorByBuilding.set(b.id,hinge);doors.push(door);clickables.push(door);
  if(b.name==='Oficina Valença'){
    const upgrade=new THREE.Group();
    const frame=mat(0xd8bb80),paint=mat(0x334b50);
    for(const xx of [minX+.48,maxX-.48]){const p=box(.3,3.2,.38,frame);p.position.set(xx,1.8,frontZ);upgrade.add(p);}
    const awning=box(w+.55,.23,2.1,paint);awning.position.set(x,3.36,frontZ+b.entrance.side*.85);upgrade.add(awning);
    const fascia=box(w+.4,.69,.35,frame);fascia.position.set(x,4.02,frontZ);upgrade.add(fascia);
    addLabel(upgrade,'VALENÇA · RESTAURADA',x,4.03,frontZ+b.entrance.side*.22,w);
    upgrade.visible=false;g.add(upgrade);renovationByBuilding.set(b.id,upgrade);
  }
  const signZ=frontZ+(b.entrance.side===-1?-0.16:0.16);
  if(b.kind!=='Residência')addLabel(g,b.name,x,3.12,signZ,w);
  const windowWidth=Math.max(1.0,Math.min(1.75,w/8));
  for(let level=1;level<b.floors;level++){
   for(let j=1;j<=4;j++){const xx=minX+(w*j)/5;const pane=box(windowWidth,1.45,0.13,glass);pane.castShadow=false;pane.position.set(xx,level*3.12+1.35,frontZ);g.add(pane);
    const sill=box(windowWidth+0.25,0.1,0.28,trim);sill.castShadow=false;sill.position.set(xx,level*3.12+0.57,frontZ);g.add(sill);
   }
  }
  const cornice=box(w+0.14,0.25,0.26,trim);cornice.position.set(x,h,frontZ);g.add(cornice);
  if(lot.corner){
    // Esquinas externas recebem tratamento lateral sem porta falsa.
    const edge=lot.id.endsWith('1')?-1:1;
    const outerX=x+edge*(w/2+.08);
    const pilaster=box(.38,h,.44,trim);pilaster.position.set(outerX,.17+h/2,frontZ-b.entrance.side*.65);g.add(pilaster);
    for(let level=0;level<Math.min(b.floors,3);level++){
      const sidePane=box(.14,1.24,1.4,glass);sidePane.castShadow=false;
      sidePane.position.set(outerX,level*3.12+1.45,frontZ-b.entrance.side*2.25);g.add(sidePane);
    }
  }
  // A vitrine shell já possui profundidade, vidro e decoração física acima.
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
 return {root,doors,interiors,roofByBuilding,doorByBuilding,renovationByBuilding,interiorObstacles,clickables};
}
export function contains(bounds:Bounds,x:number,z:number,pad=0){return x>bounds.minX-pad&&x<bounds.maxX+pad&&z>bounds.minZ-pad&&z<bounds.maxZ+pad;}
export function nearbyBuilding(world:CityManifest,x:number,z:number,maxDistance=4):Building|null{let best:Building|null=null;let dist=maxDistance;for(const b of world.buildings){const d=Math.hypot(x-b.entrance.x,z-b.entrance.z);if(d<dist){dist=d;best=b;}}return best;}
