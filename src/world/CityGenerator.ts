/** Malha urbana autoral e determinística de Santa Ângela. 1 unidade = 1 metro. */
export type InteriorTier = 'none' | 'shell' | 'full';
export type Bounds = { minX:number; maxX:number; minZ:number; maxZ:number };
export type Lot = {id:string; blockId:string; streetId:string; bounds:Bounds; frontage:number; depth:number; corner:boolean};
export type Building = {id:string; lotId:string; blockId:string; streetId:string; name:string; kind:string; style:number; floors:number; color:number; bounds:Bounds; entrance:{x:number;z:number;side:1|-1}; tier:InteriorTier; enterable:boolean; faction:string};
export type Block = {id:string; bounds:Bounds; lotIds:string[]};
export type CityManifest = {schemaVersion:1; generatorVersion:string; seed:number; streets:{id:string; x1:number;z1:number;x2:number;z2:number;width:number}[]; blocks:Block[]; lots:Lot[]; buildings:Building[]};
export const GENERATOR_VERSION = '1.0.0';
function hash(seed:number, key:string):number {let h=(seed^2166136261)>>>0;for(const c of key){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return h;}
function randint(seed:number,key:string,min:number,max:number):number{return min + hash(seed,key)%(max-min+1);}
const palette=[0xc4ad91,0xb88366,0xd5c7ae,0x9eaaa8,0xa48a72,0x876957,0xc6b7a0,0xb9a59b];
const shopNames=['Padaria Lusitana','Farmácia Vesper','Mercado Central','Fitas & Rádio 88','Relojoaria Sol','Armazém do Cais','Café do Porto'];
const streets=[
{id:'STR-PALMEIRAS',x1:-125,z1:-92,x2:125,z2:-92,width:12},
{id:'STR-MERCADO',x1:-125,z1:0,x2:125,z2:0,width:14},
{id:'STR-CAIS',x1:-125,z1:92,x2:125,z2:92,width:12},
{id:'STR-OESTE',x1:-106,z1:-110,x2:-106,z2:110,width:12},
{id:'STR-CENTRAL',x1:0,z1:-110,x2:0,z2:110,width:12},
{id:'STR-LESTE',x1:106,z1:-110,x2:106,z2:110,width:12}
];
const specs=[
{id:'BLK-SA-01',bounds:{minX:-97,maxX:-10,minZ:-79,maxZ:-13},n:4},
{id:'BLK-SA-02',bounds:{minX:10,maxX:97,minZ:-79,maxZ:-13},n:4},
{id:'BLK-SA-03',bounds:{minX:-97,maxX:-10,minZ:13,maxZ:79},n:3},
{id:'BLK-SA-04',bounds:{minX:10,maxX:97,minZ:13,maxZ:79},n:3}
];
export function generateCity(seed=8821):CityManifest {
 const blocks:Block[]=[],lots:Lot[]=[],buildings:Building[]=[];
 for(const spec of specs){
  const block:Block={id:spec.id,bounds:{...spec.bounds},lotIds:[]};
  for(const side of [-1,1] as const){
   const face=side===-1?'N':'S';
   const streetId=side===-1?(spec.bounds.minZ<0?'STR-PALMEIRAS':'STR-MERCADO'):(spec.bounds.maxZ<0?'STR-MERCADO':'STR-CAIS');
   const width=(spec.bounds.maxX-spec.bounds.minX)/spec.n;
   for(let i=0;i<spec.n;i++){
    const id=`${spec.id}-LOT-${face}${i+1}`;
    const minX=spec.bounds.minX+i*width,maxX=minX+width;
    const minZ=side===-1?spec.bounds.minZ:spec.bounds.maxZ-27;
    const maxZ=side===-1?spec.bounds.minZ+27:spec.bounds.maxZ;
    const lot:Lot={id,blockId:spec.id,streetId,bounds:{minX,maxX,minZ,maxZ},frontage:width,depth:27,corner:i===0||i===spec.n-1};
    lots.push(lot);block.lotIds.push(id);
    const isOficina=id==='BLK-SA-01-LOT-N1';
    const isBar=id==='BLK-SA-02-LOT-S4';
    const tier:InteriorTier=isOficina||isBar?'full':(face==='S'&&i===1?'shell':'none');
    const style=randint(seed,id+':style',0,3);
    const floors=isOficina||isBar?2:randint(seed,id+':floor',2,4);
    const kind=isOficina?'Oficina':isBar?'Bar':(face==='S'?'Comércio':'Residência');
    const name=isOficina?'Oficina Valença':isBar?'Bar Atlântico':kind==='Comércio'?shopNames[randint(seed,id+':name',0,shopNames.length-1)]:`Residencial ${i+1}`;
    const buildingBounds={minX:minX+0.28,maxX:maxX-0.28,minZ:minZ+0.7,maxZ:maxZ-0.7};
    const entrance={x:(minX+maxX)/2,z:side===-1?buildingBounds.minZ:buildingBounds.maxZ,side};
    buildings.push({id:`BLD-${id}`,lotId:id,blockId:spec.id,streetId,name,kind,style,floors,color:isOficina?0xb5543c:isBar?0x356b6b:palette[randint(seed,id+':color',0,palette.length-1)],bounds:buildingBounds,entrance,tier,enterable:tier==='full',faction:isBar?'bellori':'valenca'});
   }
  }
  blocks.push(block);
 }
 return {schemaVersion:1,generatorVersion:GENERATOR_VERSION,seed,streets:streets.map(s=>({...s})),blocks,lots,buildings};
}
function overlaps(a:Bounds,b:Bounds,epsilon=0.02){return a.minX<b.maxX-epsilon&&a.maxX>b.minX+epsilon&&a.minZ<b.maxZ-epsilon&&a.maxZ>b.minZ+epsilon;}
export function validateCity(world:CityManifest):string[]{
 const errors:string[]=[];if(world.blocks.length!==4)errors.push('Quarteirões: esperado 4');if(world.lots.length!==28||world.buildings.length!==28)errors.push('Imóveis: esperado 28');
 const lotIds=new Set<string>();const buildingIds=new Set<string>();const streetIds=new Set(world.streets.map(s=>s.id));
 for(const lot of world.lots){if(lotIds.has(lot.id))errors.push(`Lote duplicado: ${lot.id}`);lotIds.add(lot.id);if(!streetIds.has(lot.streetId))errors.push(`Rua inválida: ${lot.id}`);}
 for(let i=0;i<world.buildings.length;i++){
  const b=world.buildings[i];if(buildingIds.has(b.id))errors.push(`Prédio duplicado: ${b.id}`);buildingIds.add(b.id);
  const l=world.lots.find(x=>x.id===b.lotId);if(!l)errors.push(`Lote ausente: ${b.id}`);
  else if(b.bounds.minX<l.bounds.minX||b.bounds.maxX>l.bounds.maxX||b.bounds.minZ<l.bounds.minZ||b.bounds.maxZ>l.bounds.maxZ)errors.push(`Prédio fora do lote: ${b.id}`);
  if(b.enterable&&b.tier!=='full')errors.push(`Interior inacessível: ${b.id}`);
  for(let j=i+1;j<world.buildings.length;j++)if(overlaps(b.bounds,world.buildings[j].bounds))errors.push(`Sobreposição: ${b.id}`);
 }
 if(world.buildings.filter(b=>b.tier==='full').length!==2)errors.push('Esperados dois interiores completos');
 return errors;
}
