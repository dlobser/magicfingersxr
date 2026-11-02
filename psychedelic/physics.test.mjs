import assert from 'node:assert/strict';
import {ParticleWorld,forceAt} from './physics.js';
const pull={x:0,y:0,type:'pull',strength:1};
const near=forceAt(.1,0,pull),core=forceAt(.15,0,pull);
assert(near.ax<0&&near.ay===0,'Pull points toward the controller');
assert(Math.abs(near.ax-core.ax)<1e-9,'Pull uses the softened constant core');
assert(Math.abs(forceAt(.25,0,pull).ax/forceAt(.5,0,{...pull,type:'pull'}).ax)>1,'Near pull exceeds far pull');
const right=forceAt(.3,0,{...pull,type:'swirl',spin:1}),left=forceAt(.3,0,{...pull,type:'swirl',spin:-1});
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
console.log('PASS: core, attraction, mirrored swirl, 60s idle, two-controller motion, extreme forces, portrait/landscape boundaries, resize.');
