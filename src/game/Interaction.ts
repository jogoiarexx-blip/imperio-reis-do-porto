import type {Building,CityManifest} from '../world/CityGenerator';

/** A fachada está alinhada ao eixo X; side indica o lado da calçada (+Z/-Z). */
export function doorDistance(building:Building,x:number,z:number,location:'outside'|'inside'):{distance:number;clear:boolean}{
  const dx=Math.abs(x-building.entrance.x);
  const outward=(z-building.entrance.z)*building.entrance.side;
  const normal=location==='outside'?outward:-outward;
  const clear=dx<=1.8&&normal>=-.25&&normal<=3.6;
  return {distance:Math.hypot(dx,normal),clear};
}
export function nearestStreetDoor(world:CityManifest,x:number,z:number):Building|null{
  let nearest:Building|null=null,best=Infinity;
  for(const building of world.buildings){
    const {distance,clear}=doorDistance(building,x,z,'outside');
    if(clear&&distance<best){nearest=building;best=distance;}
  }
  return nearest;
}
/** Pequeno deslocamento através do vão da porta; sem teletransporte entre cômodos. */
export function transitionAtDoor(building:Building,to:'inside'|'outside'):{x:number;z:number}{
  return {x:building.entrance.x,z:building.entrance.z+(to==='outside'?1:-1)*building.entrance.side*2.15};
}
export function isInsideFootprint(building:Building,x:number,z:number):boolean{
  return x>building.bounds.minX+.45&&x<building.bounds.maxX-.45&&
         z>building.bounds.minZ+.45&&z<building.bounds.maxZ-.45;
}
export function npcSpot(building:Building):{x:number;z:number}{
  return {x:building.entrance.x+2.7,z:building.entrance.z-building.entrance.side*6.4};
}
export function isNearNpc(building:Building,x:number,z:number,maxDistance=2.8):boolean{
  const npc=npcSpot(building);
  return Math.hypot(x-npc.x,z-npc.z)<=maxDistance;
}
