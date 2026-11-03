import type {CityManifest} from '../world/CityGenerator';

export const WORKSHOP_ID = 'BLD-BLK-SA-01-LOT-N1';
export const RENOVATION_COST = 300;
export const WORKSHOP_BASE_INCOME = 155;
export const WORKSHOP_RENOVATED_INCOME = 225;
export type MissionState = {id:'m01'|'m02'|'m03'|'end';step:number;completed:string[]};
export type SaveState = {
  schemaVersion:1;generatorVersion:string;seed:number;
  player:{x:number;z:number;health:number;money:number};
  vehicle:{x:number;z:number;yaw:number};interiorId:string|null;
  mission:MissionState;owned:string[];renovated:string[];belloriDecision:'respect'|'refuse'|null;
  clock:number;heat:number;lastCycle:number;reputation:Record<string,number>;
};
export const SAVE_KEY='imperio_reis_porto_slot_1';
export function initialState(world:CityManifest):SaveState{return {
  schemaVersion:1,generatorVersion:world.generatorVersion,seed:world.seed,
  player:{x:-87,z:-87,health:100,money:500},
  vehicle:{x:-85,z:-92,yaw:0},interiorId:null,mission:{id:'m01',step:0,completed:[]},
  owned:['Oficina Valença'],renovated:[],belloriDecision:null,clock:540,heat:0,lastCycle:8,
  reputation:{valenca:15,bellori:0,calder:0,aurora:0,mare_negra:0}
};}
/** Migra saves v1 anteriores à reforma/posição do carro sem zerar o progresso. */
export function normalizeState(world:CityManifest,raw:unknown):SaveState|null{
  if(!raw||typeof raw!=='object')return null;
  const s=raw as Partial<SaveState>,base=initialState(world);
  if(s.schemaVersion!==1||s.seed!==world.seed||s.generatorVersion!==world.generatorVersion)return null;
  if(!s.player||!Number.isFinite(s.player.x)||!Number.isFinite(s.player.z)||!Number.isFinite(s.player.money)||!Number.isFinite(s.player.health))return null;
  if(!s.mission||!['m01','m02','m03','end'].includes(s.mission.id)||!Number.isInteger(s.mission.step)||!Array.isArray(s.mission.completed))return null;
  if(!Array.isArray(s.owned)||!s.owned.every(x=>typeof x==='string')||!Number.isFinite(s.clock)||!Number.isFinite(s.lastCycle)||!Number.isFinite(s.heat))return null;
  if(!s.reputation||typeof s.reputation!=='object')return null;
  const vehicle=s.vehicle&&Number.isFinite(s.vehicle.x)&&Number.isFinite(s.vehicle.z)&&Number.isFinite(s.vehicle.yaw)?s.vehicle:base.vehicle;
  // Saves REV1 não guardavam o imóvel: recuperar o interior pelo volume realmente ocupado.
  // Saves com interiorId inválido não deixam o jogador atravessar um prédio fechado.
  const standingInside=world.buildings.find(b=>b.enterable&&
    s.player!.x>b.bounds.minX+.45&&s.player!.x<b.bounds.maxX-.45&&
    s.player!.z>b.bounds.minZ+.45&&s.player!.z<b.bounds.maxZ-.45);
  const interiorId=standingInside?.id??null;
  const renovated=Array.isArray(s.renovated)&&s.renovated.every(x=>typeof x==='string')?s.renovated.filter(x=>x===WORKSHOP_ID):[];
  const belloriDecision=s.belloriDecision==='respect'||s.belloriDecision==='refuse'?s.belloriDecision:null;
  return {...s,vehicle:{...vehicle},interiorId,belloriDecision,renovated:[...new Set(renovated)],player:{...s.player},mission:{...s.mission,completed:[...s.mission.completed]},owned:[...s.owned],reputation:{...base.reputation,...s.reputation}} as SaveState;
}
export function loadState(world:CityManifest):SaveState|null{try{return normalizeState(world,JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));}catch{return null;}}
export function saveState(s:SaveState):boolean{try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export const missionTitles:Record<MissionState['id'],string>={m01:'01 — O retorno',m02:'02 — Uma conversa no Atlântico',m03:'03 — As contas do cais',end:'Prólogo concluído'};
export function missionObjective(s:SaveState):string{switch(s.mission.id){
  case 'm01':return s.mission.step===0?'Visite a Oficina Valença e converse com Helena.':'Dirija-se ao Bar Atlântico.';
  case 'm02':return s.mission.step===0?'Converse com o contato no Bar Atlântico.':'Volte à oficina para tomar sua decisão.';
  case 'm03':return s.mission.step===0?'Gerencie seu primeiro negócio (tecla I).':'Retorne ao Bar Atlântico para fechar o acordo.';
  default:return 'Explore Santa Ângela. A campanha continuará nas próximas versões.';
}}
export function advanceMission(s:SaveState,place:string):string|null{
  const m=s.mission;
  if(m.id==='m01'&&m.step===0&&place==='Oficina Valença'){m.step=1;return 'Helena: "A cidade mudou, Dante. Não confie em quem sorri demais."';}
  if(m.id==='m01'&&m.step===1&&place==='Bar Atlântico'){m.completed.push('m01');m.id='m02';m.step=0;s.player.money+=200;return 'Rafael: "O velho porto ainda tem lugar para quem sabe negociar." + R$ 200';}
  if(m.id==='m02'&&m.step===0&&place==='Bar Atlântico'){m.step=1;s.reputation.bellori+=5;return 'Intermediário Bellori: "As famílias querem saber de que lado você está."';}
  if(m.id==='m02'&&m.step===1&&place==='Oficina Valença'){m.completed.push('m02');m.id='m03';m.step=s.renovated.includes(WORKSHOP_ID)?1:0;return 'Helena: "Negócio de família. Faça a oficina voltar a render."';}
  if(m.id==='m03'&&m.step===1&&place==='Bar Atlântico'){m.completed.push('m03');m.id='end';m.step=0;s.player.money+=400;return 'Prólogo concluído. Porto Vesper agora conhece seu nome. + R$ 400';}
  return null;
}
/** A escolha de narrativa tem efeito único, mesmo que a conversa seja reaberta. */
export function chooseBellori(s:SaveState,decision:'respect'|'refuse'):boolean{
  if(s.mission.id!=='m02'||s.mission.step!==1||s.belloriDecision!==null)return false;
  s.belloriDecision=decision;
  if(decision==='respect')s.reputation.bellori=(s.reputation.bellori||0)+7;
  else{s.reputation.bellori=(s.reputation.bellori||0)-6;s.heat=Math.min(5,s.heat+1);}
  return true;
}
/** Compra única, com efeito de mundo e missão; não depende de cliques da UI. */
export function renovateWorkshop(s:SaveState):'ok'|'already-renovated'|'not-enough-money'|'not-owned'{
  if(!s.owned.includes('Oficina Valença'))return 'not-owned';
  if(s.renovated.includes(WORKSHOP_ID))return 'already-renovated';
  if(s.player.money<RENOVATION_COST)return 'not-enough-money';
  s.player.money-=RENOVATION_COST;s.renovated.push(WORKSHOP_ID);s.reputation.valenca=(s.reputation.valenca||0)+5;
  if(s.mission.id==='m03'&&s.mission.step===0)s.mission.step=1;
  return 'ok';
}
export function tickEconomy(s:SaveState):number{
  const index=Math.floor(s.clock/60);if(index<=s.lastCycle)return 0;
  const cycles=Math.min(index-s.lastCycle,24);s.lastCycle=index;
  const net=s.owned.reduce((sum,name)=>sum+(name==='Oficina Valença'?(s.renovated.includes(WORKSHOP_ID)?WORKSHOP_RENOVATED_INCOME:WORKSHOP_BASE_INCOME):65),0)*cycles;
  s.player.money+=net;return net;
}
export function clockText(minutes:number){const m=((Math.floor(minutes)%1440)+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
