import type {Bounds} from '../world/CityGenerator';

export type CarPose={x:number;z:number;yaw:number};
export type DriveInput={throttle:number;steer:number;brake:boolean;fast:boolean};
export type DriveState=CarPose&{speed:number};
const HALF_WIDTH=1.03, HALF_LENGTH=2.18;
function approach(value:number,target:number,amount:number){return value<target?Math.min(target,value+amount):Math.max(target,value-amount);}
/** Colisão entre o retângulo orientado do carro e os retângulos dos prédios. */
export function carFits(p:CarPose,buildings:Bounds[]):boolean{
 const sx=Math.sin(p.yaw),cz=Math.cos(p.yaw);
 const axes=[[cz,-sx],[sx,cz]];
 const corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,b])=>({x:p.x+a*HALF_WIDTH*cz+b*HALF_LENGTH*sx,z:p.z-a*HALF_WIDTH*sx+b*HALF_LENGTH*cz}));
 if(corners.some(c=>Math.abs(c.x)>123||Math.abs(c.z)>102))return false;
 for(const box of buildings){
  const bx=(box.minX+box.maxX)/2,bz=(box.minZ+box.maxZ)/2,hx=(box.maxX-box.minX)/2,hz=(box.maxZ-box.minZ)/2;
  let separated=false;
  for(const [ax,az] of [[1,0],[0,1],...axes]){
   const distance=Math.abs((p.x-bx)*ax+(p.z-bz)*az);
   const carRadius=HALF_WIDTH*Math.abs(cz*ax-sx*az)+HALF_LENGTH*Math.abs(sx*ax+cz*az);
   const boxRadius=hx*Math.abs(ax)+hz*Math.abs(az);
   if(distance>=carRadius+boxRadius){separated=true;break;}
  }
  if(!separated)return false;
 }
 return true;
}
/** Modelo arcade: aceleração, frenagem e direção proporcionais à velocidade. */
export function driveStep(state:DriveState,input:DriveInput,dt:number,fits:(pose:CarPose)=>boolean):DriveState{
 if(!Number.isFinite(dt)||dt<=0)return {...state};
 const steps=Math.ceil(Math.min(dt,.1)/.02),step=Math.min(dt,.1)/steps;
 const next={...state};
 for(let i=0;i<steps;i++){
  const throttle=Math.max(-1,Math.min(1,input.throttle));
  const target=input.brake?0:throttle>0?(input.fast?17:11)*throttle:throttle<0?5*throttle:0;
  const rate=input.brake?18:throttle===0?3:(next.speed*target<0?13:6);
  next.speed=approach(next.speed,target,rate*step);
  const steer=Math.max(-1,Math.min(1,input.steer));
  const turn=-steer*Math.sign(next.speed)*Math.min(Math.abs(next.speed)/4,1)*1.15*step;
  const yaw=next.yaw+turn;
  const candidate={x:next.x+Math.sin(yaw)*next.speed*step,z:next.z+Math.cos(yaw)*next.speed*step,yaw};
  if(fits(candidate)){next.x=candidate.x;next.z=candidate.z;next.yaw=yaw;}else{next.speed=0;break;}
 }
 return next;
}
