const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'..'),tmp=path.join(root,'.qa-tmp');fs.mkdirSync(tmp,{recursive:true});fs.writeFileSync(path.join(tmp,'package.json'),'{"type":"commonjs"}');
const files=['src/world/CityGenerator.ts','src/game/Systems.ts','src/game/Interaction.ts','src/world/renderCity.ts','src/main.ts','tests/city.test.ts','tests/progress.test.ts','tests/interaction.test.ts','tests/validator.test.ts','tests/mission-fsm.test.ts'];
for(const f of files){const code=fs.readFileSync(path.join(root,f),'utf8');const r=ts.transpileModule(code,{fileName:f,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const errors=(r.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);assert.equal(errors.length,0,`${f}: ${errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' '))}`);
 if(f.startsWith('src/world/City')||f.startsWith('src/game/')){const out=path.join(tmp,f.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,r.outputText);}}
const worldModule=require(path.join(tmp,'src/world/CityGenerator.js')),s=require(path.join(tmp,'src/game/Systems.js')),i=require(path.join(tmp,'src/game/Interaction.js'));const world=worldModule.generateCity(8821);
assert.equal(world.blocks.length,4);assert.equal(world.buildings.length,28);assert.deepEqual(worldModule.validateCity(world),[]);
let count=0;for(const b of world.buildings.filter(x=>x.enterable)){
 const exterior=i.transitionAtDoor(b,'outside'),interior=i.transitionAtDoor(b,'inside');
 assert.equal(i.nearestStreetDoor(world,exterior.x,exterior.z).id,b.id);assert.equal(i.doorDistance(b,exterior.x,exterior.z,'outside').clear,true);assert.equal(i.doorDistance(b,exterior.x,exterior.z,'inside').clear,false);assert.equal(i.doorDistance(b,interior.x,interior.z,'inside').clear,true);assert.equal(i.isInsideFootprint(b,interior.x,interior.z),true);
 const npc=i.npcSpot(b);assert.equal(i.isInsideFootprint(b,npc.x,npc.z),true);count++;
}
assert.equal(count,2);
const missionState=s.initialState(world);assert.equal(s.renovateWorkshop(missionState),'ok');assert.equal(s.renovateWorkshop(missionState),'already-renovated');missionState.clock=540;assert.equal(s.tickEconomy(missionState),225);
const before=s.initialState(world);const b=world.buildings.find(x=>x.name==='Oficina Valença');before.player.x=b.entrance.x;before.player.z=i.transitionAtDoor(b,'inside').z;delete before.interiorId;
const migrated=s.normalizeState(world,before);assert.equal(migrated.interiorId,b.id);assert.equal(s.normalizeState(world,{...migrated,player:{...migrated.player,x:99,z:95}}).interiorId,null);
const invalid=worldModule.generateCity(8821);invalid.buildings[0].entrance.side=1;assert(worldModule.validateCity(invalid).some(e=>e.includes('lado incorreto')));
console.log(`PASS: sintaxe TS ${files.length} arquivos; world 4 quadras / 28 prédios; 2 portas com lado e nav; 2 NPC spots; save interior antigo migrado; reforma e renda; validador detecta porta invertida`);
