import {describe,it,expect,vi} from 'vitest';
import {generateCity} from '../src/world/CityGenerator';
import {initialState,loadState,normalizeState,saveState,SAVE_KEY,SAVE_BACKUP_KEY} from '../src/game/Systems';

const world=generateCity(8821);
describe('proteção do progresso',()=>{
 it('não substitui backup válido por save principal estruturalmente inválido',()=>{
  const memory=new Map<string,string>();
  vi.stubGlobal('localStorage',{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,val:string)=>memory.set(key,val)});
  try{
   const state=initialState(world);state.player.money=780;
   memory.set(SAVE_BACKUP_KEY,JSON.stringify(state));
   memory.set(SAVE_KEY,JSON.stringify({...state,player:{x:0}}));
   const recovered=loadState(world)!;
   expect(recovered.player.money).toBe(780);
   expect(saveState(recovered)).toBe(true);
   expect(JSON.parse(memory.get(SAVE_BACKUP_KEY)!).player.money).toBe(780);
   expect(loadState(world)?.player.money).toBe(780);
  }finally{vi.unstubAllGlobals();}
 });
 it('rejeita dados que travariam a interface ou objetivos impossíveis',()=>{
  const s=initialState(world);
  expect(normalizeState(world,{...s,heat:-1})).toBeNull();
  expect(normalizeState(world,{...s,mission:{...s.mission,step:99}})).toBeNull();
  expect(normalizeState(world,{...s,player:{...s.player,x:900}})).toBeNull();
  expect(normalizeState(world,{...s,reputation:{bellori:'inválido'}})).toBeNull();
 });
});
