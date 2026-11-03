import {describe,it,expect} from 'vitest';
import {generateCity} from '../src/world/CityGenerator';
import {advanceMission,chooseBellori,initialState,normalizeState,renovateWorkshop,tickEconomy,WORKSHOP_ID,RENOVATION_COST,WORKSHOP_RENOVATED_INCOME} from '../src/game/Systems';

const world=generateCity(8821);
describe('Progresso persistente — oficina e escolhas',()=>{
 it('reforma só uma vez, cobra uma vez e altera receita no próximo ciclo',()=>{
  const s=initialState(world),initialCash=s.player.money;
  expect(renovateWorkshop(s)).toBe('ok');
  expect(s.player.money).toBe(initialCash-RENOVATION_COST);
  expect(s.renovated).toEqual([WORKSHOP_ID]);
  const rep=s.reputation.valenca;
  expect(renovateWorkshop(s)).toBe('already-renovated');
  expect(s.player.money).toBe(initialCash-RENOVATION_COST);
  expect(s.reputation.valenca).toBe(rep);
  s.clock=540;
  expect(tickEconomy(s)).toBe(WORKSHOP_RENOVATED_INCOME);
  expect(tickEconomy(s)).toBe(0);
 });
 it('não debita nem avança missão se não houver dinheiro',()=>{
  const s=initialState(world);s.player.money=299;s.mission.id='m03';
  expect(renovateWorkshop(s)).toBe('not-enough-money');
  expect(s.player.money).toBe(299);expect(s.mission.step).toBe(0);
 });
 it('migra save da versão inicial e preserva estado sem reforma',()=>{
  const s=initialState(world);const legacy=JSON.parse(JSON.stringify(s));
  delete legacy.vehicle;delete legacy.renovated;delete legacy.belloriDecision;
  legacy.player.money=742;legacy.mission.id='m02';
  const migrated=normalizeState(world,legacy)!;
  expect(migrated.player.money).toBe(742);
  expect(migrated.mission.id).toBe('m02');
  expect(migrated.renovated).toEqual([]);
  expect(migrated.vehicle).toEqual({x:-85,z:-92,yaw:0});
  expect(migrated.belloriDecision).toBe(null);
 });
 it('carro, reforma e escolha sobrevivem a serialização',()=>{
  const s=initialState(world);renovateWorkshop(s);
  s.vehicle={x:27,z:90,yaw:1.4};s.mission.id='m02';s.mission.step=1;
  expect(chooseBellori(s,'respect')).toBe(true);
  const restored=normalizeState(world,JSON.parse(JSON.stringify(s)))!;
  expect(restored.vehicle).toEqual(s.vehicle);
  expect(restored.renovated).toEqual([WORKSHOP_ID]);
  expect(restored.belloriDecision).toBe('respect');
  const respect=restored.reputation.bellori;
  expect(chooseBellori(restored,'respect')).toBe(false);
  expect(restored.reputation.bellori).toBe(respect);
 });
 it('reforma prévia não bloqueia a terceira missão',()=>{
  const s=initialState(world);renovateWorkshop(s);
  s.mission.id='m02';s.mission.step=1;
  expect(advanceMission(s,'Oficina Valença')).toBeTruthy();
  expect(s.mission.id).toBe('m03');expect(s.mission.step).toBe(1);
  expect(advanceMission(s,'Bar Atlântico')).toBeTruthy();
  expect(s.mission.id).toBe('end');
 });
 it('rejeita saves incompatíveis e coordenadas inválidas',()=>{
  const s=initialState(world);
  expect(normalizeState(world,{...s,seed:42})).toBe(null);
  expect(normalizeState(world,{...s,player:{...s.player,x:Infinity}})).toBe(null);
 });
});
