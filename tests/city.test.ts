import {describe,it,expect} from 'vitest';
import {generateCity,validateCity} from '../src/world/CityGenerator';
import {initialState,advanceMission,tickEconomy} from '../src/game/Systems';
describe('Santa Ângela — contrato P0',()=>{
 it('gera os mesmos lotes e edifícios com a mesma seed',()=>expect(generateCity(8821)).toEqual(generateCity(8821)));
 it('gera quatro quadras, 28 imóveis e 2 interiores completos sem colisões',()=>{const world=generateCity(8821);expect(world.blocks).toHaveLength(4);expect(world.buildings).toHaveLength(28);expect(world.buildings.filter(b=>b.enterable)).toHaveLength(2);expect(validateCity(world)).toEqual([]);});
 it('altera detalhes estéticos com outra seed sem trocar landmarks',()=>{const a=generateCity(8821),b=generateCity(31);expect(a.buildings.map(x=>x.name==='Bar Atlântico'||x.name==='Oficina Valença')).toEqual(b.buildings.map(x=>x.name==='Bar Atlântico'||x.name==='Oficina Valença'));expect(a.buildings.map(x=>x.color)).not.toEqual(b.buildings.map(x=>x.color));});
 it('avança três missões e mantém checkpoints de etapa',()=>{const s=initialState(generateCity());expect(advanceMission(s,'Oficina Valença')).toBeTruthy();expect(advanceMission(s,'Bar Atlântico')).toBeTruthy();expect(s.mission.id).toBe('m02');advanceMission(s,'Bar Atlântico');advanceMission(s,'Oficina Valença');expect(s.mission.id).toBe('m03');s.mission.step=1;advanceMission(s,'Oficina Valença');advanceMission(s,'Bar Atlântico');expect(s.mission.id).toBe('end');});
 it('impede receita repetida no mesmo ciclo de relógio',()=>{const s=initialState(generateCity());s.clock=540;expect(tickEconomy(s)).toBe(155);expect(tickEconomy(s)).toBe(0);s.clock=600;expect(tickEconomy(s)).toBe(155);});
});
