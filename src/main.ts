import * as THREE from 'three';
import './style.css';
import {generateCity,validateCity,type Building} from './world/CityGenerator';
import {buildCity,contains} from './world/renderCity';
import {doorDistance,isNearNpc,nearestStreetDoor,transitionAtDoor} from './game/Interaction';
import {advanceMission,chooseBellori,clockText,initialState,loadState,missionObjective,missionTitles,renovateWorkshop,saveState,tickEconomy,WORKSHOP_ID,WORKSHOP_RENOVATED_INCOME,WORKSHOP_BASE_INCOME,RENOVATION_COST,type SaveState} from './game/Systems';

const $=(id:string)=>document.getElementById(id)!;
const world=generateCity(8821),errors=validateCity(world);
if(errors.length)throw new Error(`Falha de topologia: ${errors.join('; ')}`);
let state:SaveState=loadState(world)??initialState(world);
let started=false,paused=false,inside:Building|null=world.buildings.find(b=>b.id===state.interiorId)??null,driving=false,covered=false,noticeRemaining=0;
let inspectorOpen=false;
const keys=new Set<string>(),clock=new THREE.Clock(),raycaster=new THREE.Raycaster();
const scene=new THREE.Scene();scene.background=new THREE.Color(0x78858d);scene.fog=new THREE.FogExp2(0x78858d,0.0036);
const camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,0.15,520);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.65;$('game').appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xb5cce0,0x645447,2);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe2a9,2.4);sun.position.set(65,105,-50);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-145;sun.shadow.camera.right=145;sun.shadow.camera.top=145;sun.shadow.camera.bottom=-145;
sun.shadow.normalBias=0.03;scene.add(sun);scene.add(sun.target);
const city=buildCity(world);scene.add(city.root);

const avatar=new THREE.Group();
function character(color:number,height=1.8):THREE.Group{
 const g=new THREE.Group();const fabric=new THREE.MeshStandardMaterial({color,roughness:0.95});
 const face=new THREE.MeshStandardMaterial({color:0xb9977b});const black=new THREE.MeshStandardMaterial({color:0x23252a});
 const torso=new THREE.Mesh(new THREE.BoxGeometry(.65,.84,.32),fabric);torso.position.y=1.12;g.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),face);head.position.y=1.69;g.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.225,8,8,0,Math.PI*2,0,Math.PI*.4),black);hair.position.y=1.76;g.add(hair);
 for(const sx of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.24,.75,.27),black);leg.position.set(sx*.19,.39,0);g.add(leg);
 const arm=new THREE.Mesh(new THREE.BoxGeometry(.19,.7,.23),fabric);arm.position.set(sx*.43,1.09,0);g.add(arm);}
 g.scale.setScalar(height/1.8);return g;
}
avatar.add(character(0x283341));scene.add(avatar);
let yaw=0.15,pitch=0.33,dragging=false,lastMouseX=0,lastMouseY=0;
const parkedCar=new THREE.Group();function carMesh(color:number){const g=new THREE.Group();
 const chassis=new THREE.Mesh(new THREE.BoxGeometry(2,0.68,4.25),new THREE.MeshStandardMaterial({color,metalness:.36,roughness:.43}));chassis.position.y=.86;chassis.castShadow=true;g.add(chassis);
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.73,.71,2.15),new THREE.MeshStandardMaterial({color:0x536b73,metalness:.3,roughness:.24}));cabin.position.set(0,1.5,-.2);cabin.castShadow=true;g.add(cabin);
 for(const x of [-.92,.92])for(const z of [-1.36,1.36]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.22,12),new THREE.MeshStandardMaterial({color:0x202124}));w.rotation.z=Math.PI/2;w.position.set(x,.49,z);g.add(w);}
 for(const x of [-.68,.68])for(const z of [-2.13,2.13]){const l=new THREE.Mesh(new THREE.BoxGeometry(.35,.23,.06),new THREE.MeshBasicMaterial({color:z<0?0xffe4ad:0xbd2626}));l.position.set(x,.9,z);g.add(l);}
 return g;
}
parkedCar.add(carMesh(0x7e3537));parkedCar.position.set(state.vehicle.x,0,state.vehicle.z);parkedCar.rotation.y=state.vehicle.yaw;scene.add(parkedCar);
const movingCars:{mesh:THREE.Group;route:THREE.Vector3[];t:number;speed:number}[]=[];
function addTraffic(){const routes=[
 [new THREE.Vector3(-106,0,-88),new THREE.Vector3(-106,0,88),new THREE.Vector3(106,0,88),new THREE.Vector3(106,0,-88)],
 [new THREE.Vector3(-102,0,0),new THREE.Vector3(102,0,0),new THREE.Vector3(102,0,-92),new THREE.Vector3(-102,0,-92)],
 [new THREE.Vector3(-104,0,92),new THREE.Vector3(104,0,92),new THREE.Vector3(104,0,-2),new THREE.Vector3(-104,0,-2)]
 ];routes.forEach((route,i)=>{const mesh=carMesh([0x647b7c,0xbab2a3,0x494956][i]);scene.add(mesh);movingCars.push({mesh,route,t:i*.24,speed:7.5+i*2});});}addTraffic();
const walkers:{mesh:THREE.Group;route:THREE.Vector3[];t:number;speed:number;flee:number}[]=[];
const sidewalkRoutes=world.blocks.map(b=>{const d=b.bounds;return [new THREE.Vector3(d.minX-2.4,0,d.minZ-2.6),new THREE.Vector3(d.maxX+2.4,0,d.minZ-2.6),new THREE.Vector3(d.maxX+2.4,0,d.maxZ+2.6),new THREE.Vector3(d.minX-2.4,0,d.maxZ+2.6)];});
for(let i=0;i<12;i++){const mesh=character([0x64574e,0x394c50,0x4b505d,0x756c5c][i%4],1.55+(i%4)*.07);scene.add(mesh);walkers.push({mesh,route:sidewalkRoutes[i%4],t:(i%3)*.29,speed:1.08+(i%4)*.19,flee:0});}
function moveAround(route:THREE.Vector3[],time:number,obj:THREE.Group){const seg=Math.floor(time)%route.length,u=time%1;const a=route[seg],b=route[(seg+1)%route.length];obj.position.lerpVectors(a,b,u);obj.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);}
function routeLength(route:THREE.Vector3[]){let n=0;for(let i=0;i<route.length;i++)n+=route[i].distanceTo(route[(i+1)%route.length]);return n;}
function viewPosition(){return driving?parkedCar.position:avatar.position;}
function applyWorldState(){
 city.interiors.forEach((group,id)=>{const b=world.buildings.find(item=>item.id===id)!;
  group.visible=inside?.id===id||Math.hypot(state.player.x-b.entrance.x,state.player.z-b.entrance.z)<35;});
 city.renovationByBuilding.forEach((mesh,id)=>{mesh.visible=state.renovated.includes(id);});
 city.roofByBuilding.forEach((mesh,id)=>{mesh.visible=inside?.id!==id;});
 city.doorByBuilding.forEach((hinge,id)=>{const b=world.buildings.find(x=>x.id===id);hinge.rotation.y=inside?.id===id&&b?b.entrance.side*1.65:0;});
}
function syncVehicle(){parkedCar.position.set(state.vehicle.x,0,state.vehicle.z);parkedCar.rotation.y=state.vehicle.yaw;}
function syncAvatar(){avatar.position.set(state.player.x,0.18,state.player.z);if(!driving){parkedCar.visible=true;avatar.visible=true;}else{avatar.visible=false;parkedCar.visible=true;}}
syncAvatar();applyWorldState();
function showNotice(text:string,secs=5){$('notice').textContent=text;$('notice').classList.remove('hidden');noticeRemaining=secs;}
function updateUI(){
 $('health').textContent=String(Math.round(state.player.health));$('money').textContent=`R$ ${Math.round(state.player.money).toLocaleString('pt-BR')}`;
 $('heat').textContent='■'.repeat(Math.min(5,state.heat))+'□'.repeat(5-Math.min(5,state.heat));
 $('clock').textContent=clockText(state.clock);$('mission-title').textContent=missionTitles[state.mission.id];$('mission-objective').textContent=missionObjective(state);
 const b=nearestStreetDoor(world,state.player.x,state.player.z);
 const carDist=Math.hypot(state.player.x-parkedCar.position.x,state.player.z-parkedCar.position.z);
 const prompt=inside
  ?(isNearNpc(inside,state.player.x,state.player.z)?`[E] Conversar com ${inside.kind==='Oficina'?'Helena Valença':'Rafael'}`
    :doorDistance(inside,state.player.x,state.player.z,'inside').clear?`[E] Sair de ${inside.name}`:'')
  :driving?'[E] Sair do veículo':carDist<5?'[E] Entrar no carro':b?(b.enterable?`[E] Abrir e entrar — ${b.name}`:`${b.name} · somente fachada`):'';
 $('prompt').textContent=prompt;$('prompt').classList.toggle('hidden',!prompt||!started||paused);
}
function openModal(title:string,body:string,kicker='PORTO VESPER',actions?:{label:string;run:()=>void}[]){paused=true;$('modal-title').textContent=title;$('modal-kicker').textContent=kicker;$('modal-body').innerHTML=body;
 const slot=$('modal-actions');slot.innerHTML='';for(const a of actions??[{label:'VOLTAR AO JOGO',run:closeModal}]){const b=document.createElement('button');b.textContent=a.label;b.className='primary';b.addEventListener('click',a.run);slot.appendChild(b);} $('modal').classList.remove('hidden');}
function closeModal(){paused=false;$('modal').classList.add('hidden');}
function talkToResident(b:Building){
 const dialogue=advanceMission(state,b.name);
 if(dialogue){showNotice(dialogue,7);saveState(state);}else showNotice(b.kind==='Oficina'?'Helena: "A oficina é nossa. Proteja o que construímos."':'Rafael: "Nosso acordo depende de confiança."',4);
 if(state.mission.id==='m02'&&state.mission.step===1&&!state.belloriDecision&&b.name==='Bar Atlântico'){
  openModal('O convite Bellori','<p>O emissário estende a mão. Há sempre um preço por trás de um acordo nesta cidade.</p>','UMA ESCOLHA, UMA CONSEQUÊNCIA',[
   {label:'TRATAR COM RESPEITO',run:()=>{if(chooseBellori(state,'respect'))saveState(state);closeModal();showNotice('A família Bellori respeita sua postura.',4);}},
   {label:'RECUSAR A PRESSÃO',run:()=>{if(chooseBellori(state,'refuse'))saveState(state);closeModal();showNotice('Sua recusa não passou despercebida.',4);}}
  ]);
 }
}
function interact(){
 if(inside){
  if(isNearNpc(inside,state.player.x,state.player.z)){talkToResident(inside);return;}
  if(!doorDistance(inside,state.player.x,state.player.z,'inside').clear){showNotice('Volte até a porta para sair. Procure também a pessoa do local.',3);return;}
  const b=inside,exterior=transitionAtDoor(b,'outside');
  if(!allowed(exterior.x,exterior.z,false,null)){showNotice('A saída está obstruída. Aproxime-se da porta.',3);return;}
  inside=null;state.interiorId=null;state.player.x=exterior.x;state.player.z=exterior.z;
  syncAvatar();applyWorldState();saveState(state);showNotice(`Você saiu de ${b.name}.`,2.5);return;
 }
 if(driving){
  const a=parkedCar.rotation.y,offsetX=Math.cos(a)*2.9,offsetZ=-Math.sin(a)*2.9;
  const spots=[[parkedCar.position.x+offsetX,parkedCar.position.z+offsetZ],[parkedCar.position.x-offsetX,parkedCar.position.z-offsetZ]];
  const safe=spots.find(([x,z])=>allowed(x,z,false));
  if(!safe){showNotice('Pare em um local com espaço livre para sair do veículo.',3);return;}
  driving=false;state.player.x=safe[0];state.player.z=safe[1];syncAvatar();showNotice('Você saiu do veículo.',2.5);return;
 }
 if(Math.hypot(state.player.x-parkedCar.position.x,state.player.z-parkedCar.position.z)<5){driving=true;state.player.x=parkedCar.position.x;state.player.z=parkedCar.position.z;syncAvatar();showNotice('Dirigindo: WASD para acelerar, frear e virar. E para sair.',4);return;}
 const b=nearestStreetDoor(world,state.player.x,state.player.z);
 if(!b){showNotice('Aproxime-se da porta pela calçada da rua.',2);return;}
 if(!b.enterable){showNotice(`${b.name} é uma fachada cenográfica nesta versão.`,3);return;}
 const target=transitionAtDoor(b,'inside');
 inside=b;state.interiorId=b.id;state.player.x=target.x;state.player.z=target.z;
 syncAvatar();applyWorldState();saveState(state);
 showNotice(`Você entrou em ${b.name}. Encontre ${b.kind==='Oficina'?'Helena':'Rafael'} para conversar.`,4);
}
function empireModal(){
 const renovated=state.renovated.includes(WORKSHOP_ID);
 let cards='';for(const name of state.owned){
  const income=name==='Oficina Valença'?(renovated?WORKSHOP_RENOVATED_INCOME:WORKSHOP_BASE_INCOME):65;
  cards+=`<div class="business-card"><h3>${name}${name==='Oficina Valença'&&renovated?' · REFORMADA':''}</h3><p>Operando · Receita líquida R$ ${income}/hora de jogo</p></div>`;
 }
 const body=`<p>O seu poder começa nos negócios. Caixa atual: <strong>R$ ${Math.round(state.player.money).toLocaleString('pt-BR')}</strong>.</p>${cards}<p class="small-note">Reformar altera a fachada da oficina, aumenta sua receita e fica registrado no save. A compra só pode ocorrer uma vez.</p><p>Relação Bellori: <strong>${state.reputation.bellori}</strong> · Pressão policial: <strong>${state.heat}/5</strong></p>`;
 const actions:{label:string;run:()=>void}[]=[];
 if(!renovated)actions.push({label:`REFORMAR OFICINA (R$ ${RENOVATION_COST})`,run:()=>{
  const result=renovateWorkshop(state);
  if(result==='not-enough-money'){$('modal-body').insertAdjacentHTML('beforeend','<p role="status">Saldo insuficiente para a reforma.</p>');return;}
  if(result==='not-owned'){$('modal-body').insertAdjacentHTML('beforeend','<p role="status">Você não controla este imóvel.</p>');return;}
  applyWorldState();saveState(state);closeModal();showNotice(result==='ok'?'Oficina reformada! Nova fachada e receita ampliada. Progresso salvo.':'A oficina já foi reformada.',5);
 }});
 actions.push({label:'FECHAR',run:closeModal});
 openModal('Gestão do império',body,'OFICINA VALENÇA · SANTA ÂNGELA',actions);
}
function mapModal(){const placeList=world.buildings.filter(b=>b.tier==='full').map(b=>`<div class="business-card"><h3>${b.name}</h3><p>Quadra ${b.blockId.replace('BLK-SA-','')} · ${b.kind} · Interior completo${state.renovated.includes(b.id)?' · REFORMADO':''}</p></div>`).join('');
 openModal('Mapa do bairro',`<p><strong>Santa Ângela:</strong> 4 quarteirões, 28 imóveis contíguos e 6 segmentos de rua.</p>${placeList}<p class="small-note">Os outros distritos de Porto Vesper estão previstos no GDD, mas ainda não são exploráveis.</p>`,'GEOGRAFIA URBANA · SANTA ÂNGELA');}
$('btn-start').addEventListener('click',()=>{started=true;$('intro').classList.add('hidden');showNotice('Dante Valença está de volta a Porto Vesper. Vá até a Oficina Valença.',6);});
$('btn-save').addEventListener('click',()=>showNotice(saveState(state)?'Partida salva neste navegador.':'Não foi possível salvar nesta sessão.',3));
$('btn-load').addEventListener('click',()=>{const saved=loadState(world);if(!saved){showNotice('Nenhum save compatível encontrado.',3);return;}state=saved;inside=world.buildings.find(b=>b.id===saved.interiorId)??null;driving=false;syncVehicle();applyWorldState();syncAvatar();showNotice('Partida restaurada.',3);});
$('btn-empire').addEventListener('click',empireModal);$('btn-map').addEventListener('click',mapModal);
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);
 if(e.code==='F3'){e.preventDefault();inspectorOpen=!inspectorOpen;$('inspector').classList.toggle('hidden',!inspectorOpen);return;}
 if(e.repeat||!started)return;if(e.code==='Escape'){if(!$('modal').classList.contains('hidden'))closeModal();else openModal('Jogo pausado','<p>O relógio, o tráfego e a simulação ficam suspensos enquanto o menu estiver aberto.</p>');return;}
 if(paused)return;
 if(e.code==='KeyE')interact();if(e.code==='KeyI')empireModal();if(e.code==='KeyM')mapModal();if(e.code==='KeyL')showNotice(saveState(state)?'Partida salva.':'Falha ao salvar.',3);
 if(e.code==='KeyQ'){covered=!covered;showNotice(covered?'Cobertura ativada (protótipo).':'Cobertura desativada.',2);}
});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.altKey&&inspectorOpen){
  const bounds=renderer.domElement.getBoundingClientRect();
  const mouse=new THREE.Vector2((e.clientX-bounds.left)/bounds.width*2-1,-((e.clientY-bounds.top)/bounds.height)*2+1);
  raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects(city.clickables,false);
  let part:THREE.Object3D|null=hits[0]?.object??null;
  while(part&&!part.userData.buildingId)part=part.parent;
  const b=world.buildings.find(item=>item.id===part?.userData.buildingId);
  const lot=world.lots.find(l=>l.id===b?.lotId);
  $('inspector-data').textContent=b?`${b.name} | ${b.id}\nQuadra: ${b.blockId} | Lote: ${lot?.id}\nRua: ${b.streetId}\nInterior: ${b.tier} | Entrável: ${b.enterable?'sim':'não'}\nSeed: ${world.seed}`:'Nenhum imóvel sob o cursor. Alt + clique numa fachada.';
  e.preventDefault();return;
 }
 if(e.button===0){dragging=true;lastMouseX=e.clientX;lastMouseY=e.clientY;}
});
window.addEventListener('pointerup',()=>dragging=false);window.addEventListener('pointermove',e=>{if(!dragging||paused)return;const dx=e.clientX-lastMouseX,dy=e.clientY-lastMouseY;lastMouseX=e.clientX;lastMouseY=e.clientY;yaw-=dx*.006;pitch=THREE.MathUtils.clamp(pitch+dy*.004,-.04,.9);});
// O protótipo de tiro demonstra pressão policial sem simular combate completo.
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function allowed(x:number,z:number,forVehicle=driving,interiorContext:Building|null=inside){
 const radius=forVehicle?1.6:.42;
 if(Math.abs(x)>123-radius||Math.abs(z)>102-radius)return false;
 if(interiorContext){
  if(!contains(interiorContext.bounds,x,z,-.85))return false;
  const obstacles=city.interiorObstacles.get(interiorContext.id)||[];
  return !obstacles.some(bounds=>contains(bounds,x,z,.38));
 }
 for(const b of world.buildings){if(contains(b.bounds,x,z,radius))return false;}
 return true;
}
function movement(dt:number){let forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
 let side=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));if(!forward&&!side)return;
 const n=Math.hypot(forward,side);forward/=n;side/=n;const fast=keys.has('ShiftLeft')||keys.has('ShiftRight');let speed=inside?2.9:fast?6.4:3.6;
 if(covered)speed*=.62;
 if(driving){parkedCar.rotation.y-=side*dt*1.35;state.vehicle.yaw=parkedCar.rotation.y;speed=fast?17:10;const dir=parkedCar.rotation.y;const nx=parkedCar.position.x+Math.sin(dir)*forward*speed*dt,nz=parkedCar.position.z+Math.cos(dir)*forward*speed*dt;
  if(allowed(nx,nz)){parkedCar.position.set(nx,0,nz);state.player.x=nx;state.player.z=nz;state.vehicle={x:nx,z:nz,yaw:parkedCar.rotation.y};}return;}
 const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt,dz=(-Math.cos(yaw)*forward+Math.sin(yaw)*side)*speed*dt;
 const nx=state.player.x+dx,nz=state.player.z+dz;
 if(allowed(nx,state.player.z))state.player.x=nx;
 if(allowed(state.player.x,nz))state.player.z=nz;
 avatar.rotation.y=Math.atan2(dx,dz);syncAvatar();
}
const cameraTarget=new THREE.Vector3();const toCamera=new THREE.Vector3();
function updateCamera(dt:number){const p=viewPosition();cameraTarget.set(p.x,driving?1.6:1.45,p.z);
 const distance=inside?5.6:driving?11:8.2;
 const desired=new THREE.Vector3(cameraTarget.x+Math.sin(yaw)*distance*Math.cos(pitch),cameraTarget.y+2.4+Math.sin(pitch)*distance,cameraTarget.z+Math.cos(yaw)*distance*Math.cos(pitch));
 // Corrige clipping da câmera contra paredes e fachadas.
 toCamera.copy(desired).sub(cameraTarget);const rayLen=toCamera.length();raycaster.set(cameraTarget,toCamera.normalize());raycaster.far=rayLen;
 const intersects=raycaster.intersectObjects(city.clickables,false).filter(i=>i.distance>.5);
 if(intersects.length){const d=Math.max(1.3,intersects[0].distance-.42);desired.copy(cameraTarget).addScaledVector(toCamera,d);}
 camera.position.lerp(desired,Math.min(1,dt*8));camera.lookAt(cameraTarget);
}
function atmosphere(){const t=(state.clock%1440)/1440,day=Math.max(0,Math.sin(Math.PI*(t-.18)*1.45));
 const sky=new THREE.Color(0x172437).lerp(new THREE.Color(0x8497a0),day);scene.background=sky;scene.fog!.color.copy(sky);
 sun.intensity=.18+day*2.4;hemi.intensity=.3+day*1.7;sun.position.set(Math.sin(t*Math.PI*2)*80,12+day*90,-50);
}
let frame=0,fpsTime=0,frames=0;function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);
 if(started&&!paused){movement(dt);state.clock+=dt*.52;if(state.clock>=1440){state.clock-=1440;state.lastCycle=-1;}
  tickEconomy(state);
  if(frame%18===0)applyWorldState();
  for(const c of movingCars){c.t+=dt*c.speed/routeLength(c.route)*c.route.length;moveAround(c.route,c.t,c.mesh);}
  for(const npc of walkers){npc.flee=Math.max(0,npc.flee-dt);npc.t+=dt*npc.speed/routeLength(npc.route)*npc.route.length*(npc.flee?1.8:1);moveAround(npc.route,npc.t,npc.mesh);}
  noticeRemaining-=dt;if(noticeRemaining<=0)$('notice').classList.add('hidden');
 }
 updateCamera(dt);atmosphere();if((frame++%8)===0)updateUI();
 fpsTime+=dt;frames++;if(fpsTime>=.8){$('performance').textContent=`FPS ${Math.round(frames/fpsTime)} · ${world.blocks.length} quadras · ${world.buildings.length} imóveis · ${renderer.info.render.calls} draw calls`;fpsTime=0;frames=0;}
 renderer.render(scene,camera);
}
updateUI();animate();
