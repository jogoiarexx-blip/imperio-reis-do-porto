import {describe,it,expect,vi} from 'vitest';
import {generateCity,validateCity} from '../src/world/CityGenerator';
import {doorDistance,isInsideFootprint,transitionAtDoor} from '../src/game/Interaction';
import {advanceMission,chooseBellori,DELIVERY_LIMIT_SECONDS,failMission,initialState,
 missionDestination,missionObjective,normalizeState,renovateWorkshop,retryMission,tickMission,
 saveState,loadState,SAVE_KEY,SAVE_BACKUP_KEY} from '../src/game/Systems';
const world=generateCity(8821);
const oficina=world.buildings.find(b=>b.name==='Oficina Valença')!;
const bar=world.buildings.find(b=>b.name==='Bar Atlântico')!;
function prologue(){const s=initialState(world);
  expect(advanceMission(s,'Oficina Valença')).toBeTruthy();
  expect(advanceMission(s,'Bar Atlântico')).toBeTruthy();
  expect(advanceMission(s,'Bar Atlântico')).toBeTruthy();
  expect(chooseBellori(s,'respect')).toBe(true);
  expect(advanceMission(s,'Oficina Valença')).toBeTruthy();
  return s;
}
describe('FSM serializável — campanha Santa Ângela',()=>{
  it('m01 e m02 evoluem sem repetir bônus ou reputação no mesmo objetivo',()=>{
    const s=initialState(world);expect(missionDestination(s)).toBe('Oficina Valença');
    expect(advanceMission(s,'Bar Atlântico')).toBe(null);
    expect(advanceMission(s,'Oficina Valença')).toBeTruthy();
    expect(s.missionRuntime.checkpoint).toMatchObject({missionId:'m01',step:1});
    expect(missionDestination(s)).toBe('Bar Atlântico');
    expect(advanceMission(s,'Bar Atlântico')).toBeTruthy();
    expect(s.player.money).toBe(700);expect(s.mission.completed).toEqual(['m01']);
    const before=s.player.money;
    expect(advanceMission(s,'Oficina Valença')).toBe(null);
    expect(s.player.money).toBe(before);
    expect(advanceMission(s,'Bar Atlântico')).toBeTruthy();
    expect(chooseBellori(s,'respect')).toBe(true);
    const rep=s.reputation.bellori;
    expect(chooseBellori(s,'refuse')).toBe(false);
    expect(s.reputation.bellori).toBe(rep);
    expect(advanceMission(s,'Oficina Valença')).toBeTruthy();
    expect(s.mission.completed).toEqual(['m01','m02']);
    expect(s.missionRuntime.checkpoint.missionId).toBe('m03');
  });
  it('m03 tem retirada real na oficina e entrega no bar, não concluindo sem pacote',()=>{
    const s=prologue();expect(missionObjective(s)).toContain('Reforme');
    expect(advanceMission(s,'Bar Atlântico')).toBe(null);
    expect(renovateWorkshop(s)).toBe('ok');
    expect(s.mission.step).toBe(1);
    expect(advanceMission(s,'Bar Atlântico')).toBe(null);
    expect(advanceMission(s,'Oficina Valença')).toContain('encomenda');
    expect(s.mission.step).toBe(2);
    expect(missionDestination(s)).toBe('Bar Atlântico');
    expect(advanceMission(s,'Bar Atlântico')).toBeTruthy();
    expect(s.mission.id).toBe('end');
    expect(s.missionRuntime.status).toBe('finished');
    expect(advanceMission(s,'Bar Atlântico')).toBe(null);
    expect(s.mission.completed).toEqual(['m01','m02','m03']);
  });
  it('entrega expira, bloqueia recompensa e retry retorna somente a checkpoint',()=>{
    const s=prologue();renovateWorkshop(s);advanceMission(s,'Oficina Valença');
    const rewardBefore=s.player.money;
    const cp=structuredClone(s.missionRuntime.checkpoint);
    s.player.x=99;s.player.z=81;s.vehicle={x:10,z:92,yaw:1.5};
    expect(tickMission(s,0)).toBe(false);
    expect(tickMission(s,DELIVERY_LIMIT_SECONDS)).toBe(false); // dt limitado contra saltos de aba
    for(let i=0;i<2400;i++)tickMission(s,.1);
    expect(s.missionRuntime.status).toBe('failed');
    expect(advanceMission(s,'Bar Atlântico')).toBe(null);
    expect(s.player.money).toBe(rewardBefore);
    expect(retryMission(s)).toBe(true);
    expect(s.missionRuntime).toMatchObject({status:'active',retries:1,elapsedSeconds:0});
    expect(s.player.x).toBe(cp.player.x);expect(s.player.z).toBe(cp.player.z);
    expect(s.vehicle).toEqual(cp.vehicle);
    expect(retryMission(s)).toBe(false);
    expect(advanceMission(s,'Bar Atlântico')).toBeTruthy();
    expect(s.player.money).toBe(rewardBefore+400);
  });
  it('pausa mantém o prazo, falha de saúde é repetível e saves falhos sobrevivem a reload',()=>{
    const s=prologue();renovateWorkshop(s);advanceMission(s,'Oficina Valença');
    tickMission(s,2.5); // delta de aba suspensa limitado a 100ms
    expect(s.missionRuntime.elapsedSeconds).toBeCloseTo(.1);
    const stored=normalizeState(world,JSON.parse(JSON.stringify(s)))!;
    expect(stored.missionRuntime.elapsedSeconds).toBeCloseTo(.1);
    stored.player.health=0;expect(tickMission(stored,.01)).toBe(true);
    const broken=normalizeState(world,JSON.parse(JSON.stringify(stored)))!;
    expect(broken.missionRuntime.status).toBe('failed');
    expect(failMission(broken,'outra falha')).toBe(false);
    expect(retryMission(broken)).toBe(true);expect(broken.player.health).toBeGreaterThanOrEqual(40);
  });
  it('migra save REV3 de entrega em etapa 1 sem reiniciar missão ou reforma',()=>{
    const s=prologue();renovateWorkshop(s);
    const old=JSON.parse(JSON.stringify(s));delete old.missionRuntime;
    const restored=normalizeState(world,old)!;
    expect(restored.mission).toMatchObject({id:'m03',step:2});
    expect(restored.missionRuntime.checkpoint.step).toBe(2);
    expect(restored.renovated).toEqual(s.renovated);
    expect(advanceMission(restored,'Bar Atlântico')).toBeTruthy();
  });
  it('checkpoints dos marcos continuam em posição válida e portas permanecem orientadas',()=>{
    expect(validateCity(world)).toEqual([]);
    for(const b of [oficina,bar]){
      const outside=transitionAtDoor(b,'outside'),inside=transitionAtDoor(b,'inside');
      expect(doorDistance(b,outside.x,outside.z,'outside').clear).toBe(true);
      expect(isInsideFootprint(b,inside.x,inside.z)).toBe(true);
    }
    const s=prologue();
    expect(s.missionRuntime.checkpoint.missionId).toBe('m03');
    expect(missionDestination(s)).toBe('Oficina Valença');
  });
  it('percurso entre oficina e bar é caminhável na malha atual sem cortar fachadas',()=>{
    const a=transitionAtDoor(oficina,'outside');
    const b=transitionAtDoor(bar,'outside');
    // Rota programática controlada pela rua das Palmeiras, travessa central e avenida Mercado.
    const points=[a,{x:a.x,z:-85},{x:0,z:-85},{x:0,z:-8},{x:b.x,z:-8},b];
    for(let i=1;i<points.length;i++){
      const previous=points[i-1],current=points[i];
      const count=Math.ceil(Math.hypot(previous.x-current.x,previous.z-current.z)/.5);
      for(let j=0;j<=count;j++){
        const x=previous.x+(current.x-previous.x)*j/Math.max(1,count);
        const z=previous.z+(current.z-previous.z)*j/Math.max(1,count);
        expect(Math.abs(x)).toBeLessThan(123);
        expect(Math.abs(z)).toBeLessThan(102);
        expect(world.buildings.some(building=>x>building.bounds.minX-.42&&
          x<building.bounds.maxX+.42&&z>building.bounds.minZ-.42&&
          z<building.bounds.maxZ+.42)).toBe(false);
      }
    }
  });
  it('recarrega backup válido se a gravação principal ficou corrompida',()=>{
    const memory=new Map<string,string>();
    vi.stubGlobal('localStorage',{
      getItem:(key:string)=>memory.get(key)??null,
      setItem:(key:string,val:string)=>{memory.set(key,val);}
    });
    try{
      const s=initialState(world);expect(saveState(s)).toBe(true);
      advanceMission(s,'Oficina Valença');expect(saveState(s)).toBe(true);
      expect(memory.has(SAVE_BACKUP_KEY)).toBe(true);
      memory.set(SAVE_KEY,'{corrupt');
      expect(loadState(world)?.mission.id).toBe('m01');
      expect(loadState(world)?.mission.step).toBe(0); // backup do primeiro save
    }finally{vi.unstubAllGlobals();}
  });
});
