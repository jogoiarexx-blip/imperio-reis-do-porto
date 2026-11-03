import {describe,it,expect} from 'vitest';
import {carFits,driveStep,type DriveState} from '../src/game/Driving';
const empty=()=>true;
const controls={throttle:1,steer:0,brake:false,fast:false};
describe('direção arcade',()=>{
 it('acelera gradualmente e desacelera sem tecla',()=>{
  let car:DriveState={x:0,z:0,yaw:0,speed:0};
  car=driveStep(car,controls,.1,empty);expect(car.speed).toBeGreaterThan(0);expect(car.speed).toBeLessThan(11);
  const speed=car.speed;car=driveStep(car,{...controls,throttle:0},.1,empty);expect(car.speed).toBeLessThan(speed);
 });
 it('não gira parado e freia antes de inverter marcha',()=>{
  let car:DriveState={x:0,z:0,yaw:0,speed:0};
  expect(driveStep(car,{...controls,throttle:0,steer:1},.1,empty).yaw).toBe(0);
  car={...car,speed:5};const braking=driveStep(car,{...controls,throttle:-1},.1,empty);
  expect(braking.speed).toBeGreaterThan(0);expect(braking.speed).toBeLessThan(5);
 });
 it('impede a frente e laterais de atravessar prédios e limites',()=>{
  const wall={minX:-5,maxX:5,minZ:3,maxZ:5};
  expect(carFits({x:0,z:0,yaw:0},[wall])).toBe(true);
  expect(carFits({x:0,z:1,yaw:0},[wall])).toBe(false);
  expect(carFits({x:0,z:1,yaw:Math.PI/2},[wall])).toBe(true);
  expect(carFits({x:122,z:0,yaw:0},[])).toBe(false);
  const car=driveStep({x:0,z:.7,yaw:0,speed:10},controls,.1,p=>carFits(p,[wall]));
  expect(car.speed).toBe(0);expect(car.z).toBeLessThan(.82);
 });
});
