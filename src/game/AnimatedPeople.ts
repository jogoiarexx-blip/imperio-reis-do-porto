import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

type Mode = 'idle'|'walk'|'run';
type Template = {scene:THREE.Group; clips:Partial<Record<Mode,THREE.AnimationClip>>;scale:number};
const cache=new Map<string,Promise<Template>>();

/** Modelos Quaternius (CC0); falhas de carregamento deixam o personagem provisório visível. */
export function loadPerson(name:string):Promise<Template>{
 let pending=cache.get(name);
 if(!pending){
  pending=new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/people/${name}.glb`).then(gltf=>{
   const size=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
   if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Modelo de personagem sem altura válida');
   const clips:Template['clips']={};
   for(const mode of ['idle','walk','run'] as const){
    clips[mode]=gltf.animations.find(clip=>new RegExp(`[|_]${mode}$`,'i').test(clip.name));
   }
   if(!clips.idle||!clips.walk||!clips.run)throw new Error('Animações do personagem incompletas');
   gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
   return {scene:gltf.scene,clips,scale:1.8/size.y};
  });
  cache.set(name,pending);
 }
 return pending;
}
export class AnimatedPerson{
 readonly model:THREE.Object3D;
 private mixer:THREE.AnimationMixer;
 private actions:Partial<Record<Mode,THREE.AnimationAction>>={};
 private current:Mode|null=null;
 constructor(template:Template,height=1.8){
  this.model=clone(template.scene);this.model.scale.setScalar(template.scale*height/1.8);
  this.mixer=new THREE.AnimationMixer(this.model);
  for(const mode of ['idle','walk','run'] as const){const clip=template.clips[mode];if(clip)this.actions[mode]=this.mixer.clipAction(clip);}
  this.move(0);
 }
 move(speed:number){
  const mode:Mode=speed<.15?'idle':speed>4.5?'run':'walk';
  if(this.current!==mode){const previous=this.current&&this.actions[this.current];const next=this.actions[mode];
   next?.reset().setEffectiveWeight(1).fadeIn(.2).play();previous?.fadeOut(.2);this.current=mode;}
  const action=this.actions[mode];if(action&&mode!=='idle')action.setEffectiveTimeScale(THREE.MathUtils.clamp(speed/(mode==='run'?6:3.6),.65,1.5));
 }
 update(dt:number){this.mixer.update(dt);}
}
