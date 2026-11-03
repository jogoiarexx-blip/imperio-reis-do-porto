import type {CityManifest} from '../world/CityGenerator';

export const WORKSHOP_ID = 'BLD-BLK-SA-01-LOT-N1';
export const RENOVATION_COST = 300;
export const WORKSHOP_BASE_INCOME = 155;
export const WORKSHOP_RENOVATED_INCOME = 225;
export type MissionId = 'm01'|'m02'|'m03'|'end';
export type MissionState = {id:MissionId;step:number;completed:string[]};
export type MissionCheckpoint = {
  missionId:MissionId;step:number;player:{x:number;z:number};
  vehicle:{x:number;z:number;yaw:number};interiorId:string|null;
};
export type MissionRuntime = {
  status:'active'|'failed'|'finished';checkpoint:MissionCheckpoint;
  elapsedSeconds:number;failureReason:string|null;retries:number;
};
/** Prazo em segundos de simulação ativa (não avança na pausa ou aba suspensa). */
export const DELIVERY_LIMIT_SECONDS=240;
function checkpointFromState(s:SaveState):MissionCheckpoint{return {
  missionId:s.mission.id,step:s.mission.step,
  player:{x:s.player.x,z:s.player.z},vehicle:{...s.vehicle},interiorId:s.interiorId
};}
function defaultRuntime(s:SaveState):MissionRuntime{return {
  status:s.mission.id==='end'?'finished':'active',checkpoint:checkpointFromState(s),
  elapsedSeconds:0,failureReason:null,retries:0
};}
/** Atualiza o ponto de retomada somente após um objetivo validado. */
function checkpointMission(s:SaveState){
  s.missionRuntime.status=s.mission.id==='end'?'finished':'active';
  s.missionRuntime.checkpoint=checkpointFromState(s);
  s.missionRuntime.elapsedSeconds=0;s.missionRuntime.failureReason=null;
}

export type SaveState = {
  schemaVersion:1;generatorVersion:string;seed:number;
  player:{x:number;z:number;health:number;money:number};
  vehicle:{x:number;z:number;yaw:number};interiorId:string|null;
  mission:MissionState;missionRuntime:MissionRuntime;owned:string[];renovated:string[];belloriDecision:'respect'|'refuse'|null;
  clock:number;heat:number;lastCycle:number;reputation:Record<string,number>;
};
export const SAVE_KEY='imperio_reis_porto_slot_1';
export const SAVE_BACKUP_KEY=SAVE_KEY+'_backup';
export function initialState(world:CityManifest):SaveState{const state:SaveState={
  schemaVersion:1,generatorVersion:world.generatorVersion,seed:world.seed,
  player:{x:-87,z:-87,health:100,money:500},
  vehicle:{x:-85,z:-92,yaw:0},interiorId:null,mission:{id:'m01',step:0,completed:[]},
  owned:['Oficina Valença'],renovated:[],belloriDecision:null,clock:540,heat:0,lastCycle:8,
  reputation:{valenca:15,bellori:0,calder:0,aurora:0,mare_negra:0},
  missionRuntime:null as unknown as MissionRuntime
};state.missionRuntime=defaultRuntime(state);return state;}
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
  const legacyMission=s.mission.id==='m03'&&s.mission.step===1&&!s.missionRuntime;
  const result:SaveState={...base,...s,vehicle:{...vehicle},interiorId,belloriDecision,
    renovated:[...new Set(renovated)],player:{...s.player},
    mission:{...s.mission,step:legacyMission?2:s.mission.step,completed:[...new Set(s.mission.completed.filter((id):id is string=>typeof id==='string'))]},
    owned:[...s.owned],reputation:{...base.reputation,...s.reputation}} as SaveState;
  // Saves REV1–REV3 não têm FSM: constroem checkpoint na etapa corrente, sem apagar conquistas.
  result.missionRuntime=defaultRuntime(result);
  const rt=s.missionRuntime;
  if(rt&&typeof rt==='object'&&rt.checkpoint&&rt.checkpoint.missionId===result.mission.id&&
     rt.checkpoint.step===result.mission.step&&Number.isFinite(rt.checkpoint.player?.x)&&
     Number.isFinite(rt.checkpoint.player?.z)&&Number.isFinite(rt.checkpoint.vehicle?.x)&&
     Number.isFinite(rt.checkpoint.vehicle?.z)&&Number.isFinite(rt.checkpoint.vehicle?.yaw)){
    const cp=rt.checkpoint;
    const cpInterior=world.buildings.find(b=>b.id===cp.interiorId&&b.enterable&&
      cp.player.x>b.bounds.minX+.45&&cp.player.x<b.bounds.maxX-.45&&
      cp.player.z>b.bounds.minZ+.45&&cp.player.z<b.bounds.maxZ-.45)?.id??null;
    // Não recuperar checkpoints fora do mundo navegável.
    if(Math.abs(cp.player.x)<123&&Math.abs(cp.player.z)<102&&
      (!cp.interiorId||cpInterior!==null)){
      result.missionRuntime={status:result.mission.id==='end'?'finished':
        rt.status==='failed'?'failed':'active',
        checkpoint:{missionId:cp.missionId,step:cp.step,player:{...cp.player},
          vehicle:{...cp.vehicle},interiorId:cpInterior},
        elapsedSeconds:Number.isFinite(rt.elapsedSeconds)?Math.max(0,Math.min(DELIVERY_LIMIT_SECONDS,rt.elapsedSeconds)):0,
        failureReason:typeof rt.failureReason==='string'?rt.failureReason:null,
        retries:Number.isInteger(rt.retries)&&rt.retries>=0?Math.min(rt.retries,9999):0};
    }
  }
  return result;
}
export function loadState(world:CityManifest):SaveState|null{
  for(const key of [SAVE_KEY,SAVE_BACKUP_KEY]){
    try{const restored=normalizeState(world,JSON.parse(localStorage.getItem(key)||'null'));if(restored)return restored;}catch{ /* tenta o backup */ }
  }
  return null;
}
/** Mantém o save anterior como backup, jamais substituindo-o por conteúdo inválido. */
export function saveState(s:SaveState):boolean{
  try{
    const encoded=JSON.stringify(s);
    if(!encoded||JSON.parse(encoded).schemaVersion!==1)return false;
    const previous=localStorage.getItem(SAVE_KEY);
    if(previous){
      try{const old=JSON.parse(previous);if(old?.schemaVersion===1&&old?.mission&&old?.player){
        localStorage.setItem(SAVE_BACKUP_KEY,previous);
      }}catch{ /* não copiar save já corrompido para backup */ }
    }
    localStorage.setItem(SAVE_KEY,encoded);
    return localStorage.getItem(SAVE_KEY)===encoded;
  }catch{return false;}
}
export const missionTitles:Record<MissionState['id'],string>={m01:'01 — O retorno',m02:'02 — Uma conversa no Atlântico',m03:'03 — A conta vence',end:'Prólogo concluído'};
export function missionDestination(s:SaveState):'Oficina Valença'|'Bar Atlântico'|null{
  if(s.mission.id==='m01')return s.mission.step===0?'Oficina Valença':'Bar Atlântico';
  if(s.mission.id==='m02')return s.mission.step===0?'Bar Atlântico':'Oficina Valença';
  if(s.mission.id==='m03')return s.mission.step===2?'Bar Atlântico':'Oficina Valença';
  return null;
}
export function missionObjective(s:SaveState):string{
  if(s.missionRuntime.status==='failed')return `Missão falhou: ${s.missionRuntime.failureReason||'Objetivo não cumprido'}. Use R para repetir.`;
  switch(s.mission.id){
  case 'm01':return s.mission.step===0?'Visite a Oficina Valença e converse com Helena.':'Dirija-se ao Bar Atlântico.';
  case 'm02':return s.mission.step===0?'Converse com o contato no Bar Atlântico.':'Volte à oficina para tomar sua decisão.';
  case 'm03':return s.mission.step===0?'Reforme a oficina pelo menu Império [I].':s.mission.step===1?'Pegue os documentos de transporte com Helena na oficina.':`Entregue os documentos ao Bar Atlântico. Prazo: ${Math.max(0,Math.ceil(DELIVERY_LIMIT_SECONDS-s.missionRuntime.elapsedSeconds))} s.`;
  default:return 'Explore Santa Ângela. A campanha continuará nas próximas versões.';
}}
export function advanceMission(s:SaveState,place:string):string|null{
  const m=s.mission;
  if(s.missionRuntime.status!=='active'||m.id==='end')return null;
  if(m.id==='m01'&&m.step===0&&place==='Oficina Valença'){m.step=1;checkpointMission(s);return 'Helena: "A cidade mudou, Dante. Não confie em quem sorri demais."';}
  if(m.id==='m01'&&m.step===1&&place==='Bar Atlântico'){m.completed.push('m01');m.id='m02';m.step=0;s.player.money+=200;checkpointMission(s);return 'Rafael: "O velho porto ainda tem lugar para quem sabe negociar." + R$ 200';}
  if(m.id==='m02'&&m.step===0&&place==='Bar Atlântico'){m.step=1;s.reputation.bellori+=5;checkpointMission(s);return 'Intermediário Bellori: "As famílias querem saber de que lado você está."';}
  if(m.id==='m02'&&m.step===1&&place==='Oficina Valença'){m.completed.push('m02');m.id='m03';m.step=s.renovated.includes(WORKSHOP_ID)?1:0;checkpointMission(s);return 'Helena: "Negócio de família. Faça a oficina voltar a render."';}
  if(m.id==='m03'&&m.step===1&&place==='Oficina Valença'){m.step=2;checkpointMission(s);return 'Helena: "Aqui está a encomenda legalizada. Leve os documentos ao Bar Atlântico antes do horário combinado."';}
  if(m.id==='m03'&&m.step===2&&place==='Bar Atlântico'){m.completed.push('m03');m.id='end';m.step=0;s.player.money+=400;checkpointMission(s);return 'Prólogo concluído. Porto Vesper agora conhece seu nome. + R$ 400';}
  return null;
}
/** A escolha de narrativa tem efeito único, mesmo que a conversa seja reaberta. */
export function chooseBellori(s:SaveState,decision:'respect'|'refuse'):boolean{
  if(s.mission.id!=='m02'||s.mission.step!==1||s.belloriDecision!==null||s.missionRuntime.status!=='active')return false;
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
  if(s.mission.id==='m03'&&s.mission.step===0){s.mission.step=1;checkpointMission(s);}
  return 'ok';
}
export function tickEconomy(s:SaveState):number{
  const index=Math.floor(s.clock/60);if(index<=s.lastCycle)return 0;
  const cycles=Math.min(index-s.lastCycle,24);s.lastCycle=index;
  const net=s.owned.reduce((sum,name)=>sum+(name==='Oficina Valença'?(s.renovated.includes(WORKSHOP_ID)?WORKSHOP_RENOVATED_INCOME:WORKSHOP_BASE_INCOME):65),0)*cycles;
  s.player.money+=net;return net;
}
export function clockText(minutes:number){const m=((Math.floor(minutes)%1440)+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}

/** Falha jogável: entrega atrasada (m03) ou jogador sem saúde; outras missões mantêm continuidade. */
export function failMission(s:SaveState,reason:string):boolean{
  if(s.mission.id==='end'||s.missionRuntime.status!=='active')return false;
  s.missionRuntime.status='failed';s.missionRuntime.failureReason=reason;return true;
}
/** Temporizador só roda com jogo em simulação; pausa/modais não chamam tickMission. */
export function tickMission(s:SaveState,dt:number):boolean{
  if(s.missionRuntime.status!=='active'||s.mission.id==='end')return false;
  if(s.player.health<=0)return failMission(s,'Dante ficou incapacitado');
  if(s.mission.id==='m03'&&s.mission.step===2&&Number.isFinite(dt)&&dt>0){
    s.missionRuntime.elapsedSeconds+=Math.min(dt,.1);
    if(s.missionRuntime.elapsedSeconds>=DELIVERY_LIMIT_SECONDS)return failMission(s,'Prazo da entrega encerrado');
  }
  return false;
}
/** Retry recua só posição e objetivo: dinheiro, propriedades e escolhas continuam válidos. */
export function retryMission(s:SaveState):boolean{
  if(s.missionRuntime.status!=='failed')return false;
  const c=s.missionRuntime.checkpoint;
  if(c.missionId!==s.mission.id||c.step!==s.mission.step)return false;
  s.player.x=c.player.x;s.player.z=c.player.z;s.player.health=Math.max(40,s.player.health);
  s.vehicle={...c.vehicle};s.interiorId=c.interiorId;
  s.missionRuntime.retries++;s.missionRuntime.status='active';
  s.missionRuntime.failureReason=null;s.missionRuntime.elapsedSeconds=0;
  return true;
}
