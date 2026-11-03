import {describe,it,expect} from 'vitest';
import {generateCity,validateCity} from '../src/world/CityGenerator';
describe('Validador da cidade — regressões de topologia',()=>{
 it('aceita a seed oficial sem interpenetração ou entradas sem calçada',()=>{
  expect(validateCity(generateCity(8821))).toEqual([]);
 });
 it('rejeita porta de entrada invertida',()=>{
  const city=generateCity(8821);
  city.buildings[0].entrance.side=1;
  expect(validateCity(city).some(e=>e.includes('lado incorreto'))).toBe(true);
 });
 it('rejeita edifício orientado para rua de outro lote',()=>{
  const city=generateCity(8821);
  city.buildings[0].streetId='STR-MERCADO';
  expect(validateCity(city).some(e=>e.includes('rua/quadra divergente'))).toBe(true);
 });
 it('rejeita porta fora da fachada e imóvel que atravessa seu lote',()=>{
  const city=generateCity(8821);
  city.buildings[0].entrance.x+=6;
  city.buildings[1].bounds.maxX+=30;
  const errors=validateCity(city);
  expect(errors.some(e=>e.includes('desalinhada'))).toBe(true);
  expect(errors.some(e=>e.includes('fora do lote'))).toBe(true);
 });
});
