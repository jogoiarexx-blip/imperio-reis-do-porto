import type {CityManifest} from '../world/CityGenerator';

export type MissionState={id:'m01'|'m02'|'m03'|'end';step:number;completed:string[]};
export type SaveState={schemaVersion:1;generatorVersion:string;seed:number;player:{x:number;z:number;health:number;money:number};mission:MissionState;owned:string[];clock:number;heat:number;lastCycle:number;reputation:Record<string,number>};
export const SAVE_KEY='imperio_reis_porto_slot_1';
export function initialState(world:CityManifest):SaveState{return {schemaVersion:1,generatorVersion:world.generatorVersion,seed:world.seed,player:{x:-87,z:-87,health:100,money:500},mission:{id:'m01',step:0,completed:[]},owned:['Oficina Valença'],clock:540,heat:0,lastCycle:8,reputation:{valenca:15,bellori:0,calder:0,aurora:0,mare_negra:0}};}
export function loadState(world:CityManifest):SaveState|null{try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null') as SaveState|null;if(!s||s.schemaVersion!==1||s.seed!==world.seed||s.generatorVersion!==world.generatorVersion||!Number.isFinite(s.player.x)||!Number.isFinite(s.player.z)||!Array.isArray(s.owned)||!s.mission)return null;return s;}catch{return null;}}
export function saveState(s:SaveState):boolean{try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export const missionTitles:Record<MissionState['id'],string>={m01:'01 — O retorno',m02:'02 — Uma conversa no Atlântico',m03:'03 — As contas do cais',end:'Prólogo concluído'};
export function missionObjective(s:SaveState):string{switch(s.mission.id){case 'm01':return s.mission.step===0?'Visite a Oficina Valença e converse com Helena.':'Dirija-se ao Bar Atlântico.';case 'm02':return s.mission.step===0?'Converse com o contato no Bar Atlântico.':'Volte à oficina para tomar sua decisão.';case 'm03':return s.mission.step===0?'Gerencie seu primeiro negócio (tecla I).':'Retorne ao Bar Atlântico para fechar o acordo.';default:return 'Explore Santa Ângela. A campanha continuará nas próximas versões.';}}
export function advanceMission(s:SaveState,place:string):string|null{
 const m=s.mission;
 if(m.id==='m01'&&m.step===0&&place==='Oficina Valença'){m.step=1;return 'Helena: "A cidade mudou, Dante. Não confie em quem sorri demais."';}
 if(m.id==='m01'&&m.step===1&&place==='Bar Atlântico'){m.completed.push('m01');m.id='m02';m.step=0;s.player.money+=200;return 'Rafael: "O velho porto ainda tem lugar para quem sabe negociar." + R$ 200';}
 if(m.id==='m02'&&m.step===0&&place==='Bar Atlântico'){m.step=1;s.reputation.bellori+=5;return 'Intermediário Bellori: "As famílias querem saber de que lado você está."';}
 if(m.id==='m02'&&m.step===1&&place==='Oficina Valença'){m.completed.push('m02');m.id='m03';m.step=0;return 'Helena: "Negócio de família. Faça a oficina voltar a render."';}
 if(m.id==='m03'&&m.step===1&&place==='Bar Atlântico'){m.completed.push('m03');m.id='end';m.step=0;s.player.money+=400;return 'Prólogo concluído. Porto Vesper agora conhece seu nome. + R$ 400';}
 return null;
}
export function tickEconomy(s:SaveState):number{const index=Math.floor(s.clock/60);if(index<=s.lastCycle)return 0;const cycles=Math.min(index-s.lastCycle,24);s.lastCycle=index;const net=s.owned.reduce((sum,name)=>sum+(name==='Oficina Valença'?155:65),0)*cycles;s.player.money+=net;return net;}
export function clockText(minutes:number){const m=Math.floor(minutes)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
