import {describe,it,expect} from 'vitest';
import {generateCity} from '../src/world/CityGenerator';
import {doorDistance,nearestStreetDoor,transitionAtDoor,isInsideFootprint,npcSpot,isNearNpc} from '../src/game/Interaction';
const world=generateCity(8821);
const oficina=world.buildings.find(b=>b.name==='Oficina Valença')!;
const bar=world.buildings.find(b=>b.name==='Bar Atlântico')!;
describe('Portas e interações em Santa Ângela (P0)',()=>{
  for(const b of [oficina,bar]){
    it(`${b.name}: entrada só pela fachada de rua, saída somente perto da porta`,()=>{
      const outside=transitionAtDoor(b,'outside'),inside=transitionAtDoor(b,'inside');
      expect(nearestStreetDoor(world,outside.x,outside.z)?.id).toBe(b.id);
      expect(doorDistance(b,outside.x,outside.z,'outside').clear).toBe(true);
      expect(doorDistance(b,outside.x,outside.z,'inside').clear).toBe(false);
      expect(doorDistance(b,inside.x,inside.z,'inside').clear).toBe(true);
      expect(doorDistance(b,inside.x,inside.z,'outside').clear).toBe(false);
      expect(isInsideFootprint(b,inside.x,inside.z)).toBe(true);
      expect(isInsideFootprint(b,outside.x,outside.z)).toBe(false);
      expect(doorDistance(b,inside.x+5,inside.z,'inside').clear).toBe(false);
    });
    it(`${b.name}: personagem da história alcançável perto da frente`,()=>{
      const p=npcSpot(b);
      expect(isInsideFootprint(b,p.x,p.z)).toBe(true);
      expect(isNearNpc(b,p.x+.7,p.z+.7)).toBe(true);
      expect(isNearNpc(b,p.x+8,p.z+8)).toBe(false);
    });
  }
});
