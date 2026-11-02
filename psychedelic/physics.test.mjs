import assert from 'node:assert/strict';
import {ParticleWorld,forceAt,forceRamp} from './physics.js';
const pull={x:0,y:0,type:'pull',strength:1};
const near=forceAt(.1,0,pull),core=forceAt(.15,0,pull);
assert(near.ax<0&&near.ay===0,'Pull points toward the controller');
assert(Math.abs(near.ax)<1&&Math.abs(core.ax)<1,'Pull has a gentle finite core');
assert(Math.abs(forceAt(.25,0,pull).ax/forceAt(.5,0,{...pull,type:'pull'}).ax)>1,'Near pull exceeds far pull');
const right=forceAt(.6,0,{...pull,type:'swirl',spin:1}),left=forceAt(.6,0,{...pull,type:'swirl',spin:-1});
assert(right.ax<0&&right.ay!==0,'Swirl has inward and tangential acceleration');
assert(Math.abs(right.ax-left.ax)<1e-9&&Math.abs(right.ay+left.ay)<1e-9,'Left/right swirl mirror');
function bounded(world){for(const p of world.particles){assert(Number.isFinite(p.x+p.y+p.vx+p.vy),'Finite state');assert(p.x>=.025&&p.x<=world.width-.025,'Horizontal containment');assert(p.y>=.025&&p.y<=world.height-.025,'Vertical containment');}}
for(const [w,h] of [[5.85,2.6],[2.6,3.25]]){
 const world=new ParticleWorld(w,h,300);
 const initial=world.controllers().map(f=>({x:f.x,y:f.y}));
 for(let frame=0;frame<7200;frame++){world.step(1/120);if(frame%120===0)bounded(world);}
 assert(world.controllers().length===2);assert.notDeepEqual(world.controllers().map(f=>({x:f.x,y:f.y})),initial,'Idle controllers move');
 for(const force of ['pull','swirl'])for(let frame=0;frame<1200;frame++){world.step(1/120,[{x:-10,y:100,type:force,strength:100}]);bounded(world);}
 world.resize(h,w);bounded(world);
}
const gathering=new ParticleWorld(5,3,20);gathering.particles.forEach(p=>{p.x=3;p.y=1.5;p.vx=0;p.vy=0;});
for(let i=0;i<120;i++)gathering.step(1/120,[{x:2.5,y:1.5,type:'pull'}]);
assert(gathering.particles.reduce((s,p)=>s+Math.hypot(p.x-2.5,p.y-1.5),0)/20<.5,'Pull gathers particles');
for(const mode of ['particles','ball','strands','comets','flocking']){
  const world=new ParticleWorld(4.8,2.6);world.setMode(mode);
  for(let i=0;i<1800;i++){world.step(1/120);if(i%120===0)bounded(world);}
  bounded(world);
  const speed=world.particles.reduce((s,p)=>s+Math.hypot(p.vx,p.vy),0)/world.particles.length;
  assert(speed>.025,`${mode} retains motion`);
  if(mode==='comets')assert(world.particles.every(p=>p.trail.length===50),'Comets retain bounded history');
  if(mode==='flocking')assert(speed>.35,'Flock maintains cruise speed');
  if(mode==='strands')for(let i=0;i<world.particles.length-1;i++){if(i%20===19)continue;const a=world.particles[i],b=world.particles[i+1];assert(Math.hypot(a.x-b.x,a.y-b.y)<.12,'Strands stay connected');}
  world.resize(2.6,3.25);bounded(world);
  for(let i=0;i<360;i++)world.step(1/120,[{x:1.3,y:1.6,type:'swirl'}]);bounded(world);
}
assert(Math.hypot(forceAt(.4,0,pull).ax,forceAt(.4,0,pull).ay)<1,'Force strength regression: no aggressive vacuum');
console.log('PASS: gentle forces, mirrored swirl, idle motion, containment, all four modes, strand constraints, comet history, flock cruise speed.');

assert.equal(forceRamp(0),.8);assert.equal(forceRamp(5),24);assert.equal(forceRamp(20),24);
assert(forceRamp(2.5)>forceRamp(0)&&forceRamp(2.5)<forceRamp(5),'Force ramps progressively');
const cluster=new ParticleWorld(4.8,2.6,80);cluster.setMode('ball');
function spread(w){const n=w.particles.length,x=w.particles.reduce((s,p)=>s+p.x,0)/n,y=w.particles.reduce((s,p)=>s+p.y,0)/n;return w.particles.reduce((s,p)=>s+Math.hypot(p.x-x,p.y-y),0)/n;}
const start=spread(cluster);for(let i=0;i<3600;i++)cluster.step(1/120,[]);
assert(spread(cluster)<start*.25,'N-bodies coalesce without external controllers');
const collision=new ParticleWorld(5,3,2);collision.setMode('ball');
Object.assign(collision.particles[0],{x:2.47,y:1.5,r:.04,vx:.5,vy:0});
Object.assign(collision.particles[1],{x:2.53,y:1.5,r:.04,vx:-.5,vy:0});
collision.step(1/120,[]);
assert(collision.particles[0].vx<0&&collision.particles[1].vx>0,'Contact reverses closing velocities');
assert(collision.particles[1].x-collision.particles[0].x>=.079,'Balls do not overlap');
console.log('PASS: restored particles, five-second ramp, independent n-body aggregation, collision bounce.');

const breakup=new ParticleWorld();breakup.setMode('ball');
for(let i=0;i<3600;i++)breakup.step(1/120,[]);
const packed=spread(breakup),cx=breakup.particles.reduce((s,p)=>s+p.x,0)/180,cy=breakup.particles.reduce((s,p)=>s+p.y,0)/180;
assert(packed<.4,'Full-size ball population still gathers naturally');
for(let i=0;i<1200;i++)breakup.step(1/120,[{x:cx,y:cy,type:'swirl',spin:1,strength:forceRamp(i/120)}]);
assert(spread(breakup)>packed*2,'A sustained swirl breaks up a settled cluster');
bounded(breakup);
console.log('PASS: full-size cluster naturally forms and can be broken apart by a ramped swirl.');

const peel=new ParticleWorld();peel.setMode('ball');
for(let i=0;i<3600;i++)peel.step(1/120,[]);
const peelStart=spread(peel),px=peel.particles.reduce((s,p)=>s+p.x,0)/180,py=peel.particles.reduce((s,p)=>s+p.y,0)/180;
assert(peelStart<.4,'Lower-gravity balls still form a compact cluster');
for(let i=0;i<1200;i++){const t=i/120;peel.step(1/120,[{x:px+.6+Math.min(t/5,1)*.5,y:py,type:'pull',strength:forceRamp(t)}]);}
assert(spread(peel)>peelStart*2,'Off-center ramped Pull peels apart a settled cluster');
bounded(peel);
console.log('PASS: off-center Pull separates a settled full-size ball cluster.');

const orbit=new ParticleWorld(10,10,1);orbit.settings.damping=0;
Object.assign(orbit.particles[0],{x:6,y:5,vx:0,vy:0});let lateRadius=0,crossed=false;
for(let i=0;i<7200;i++){orbit.step(1/120,[{x:5,y:5,type:'pull',strength:24}]);const p=orbit.particles[0];crossed ||= p.x<5;if(i>6000)lateRadius=Math.max(lateRadius,Math.hypot(p.x-5,p.y-5));}
assert(crossed,'Particle overshoots the attractor');assert(lateRadius>.95,'Zero damping preserves the original excursion rather than clustering through speed clipping');
const light=new ParticleWorld(10,10,1),heavy=new ParticleWorld(10,10,1);
for(const w of [light,heavy]){w.settings.damping=0;Object.assign(w.particles[0],{x:6,y:5,vx:0,vy:0});}
heavy.settings.mass=4;for(const w of [light,heavy])w.step(1/120,[{x:5,y:5,type:'pull',strength:24}]);
assert(Math.abs(light.particles[0].vx/heavy.particles[0].vx-4)<1e-9,'Tool acceleration follows F / mass');
console.log('PASS: zero-damping overshoot persists for 60s and mass scales tool acceleration.');
