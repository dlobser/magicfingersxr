import {ParticleWorld,clamp,forceRamp,DEFAULT_SETTINGS} from './physics.js?v=20261102e';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
document.querySelector('#year').textContent=new Date().getFullYear();
const canvas=document.querySelector('#particle-canvas'),ctx=canvas.getContext('2d');
const world=new ParticleWorld();
const pointers=new Map(),keys=new Set();
const pauseButton=document.querySelector('#pause-sim'),status=document.querySelector('#sim-status');
let selected='pull',paused=reduced.matches,visible=false,frame,last=0,accumulator=0,w=0,h=0,scale=1;
let keyboard={x:2.4,y:1.1},casting=false,castStarted=0,forces=[];
const colors=['#efe4cc','#d8ba91','#cf7850','#85aca2','#598f91','#cf956c'];
function updateStatus(){
  status.textContent=paused?'PAUSED · PRESS PLAY TO CONTINUE':pointers.size||casting?`YOU’RE CASTING · ${selected.toUpperCase()}`:world.settings.idle?'AUTO SHOW · TWO IMAGINARY HANDS':'FREE MOTION · HOLD TO CAST';
  pauseButton.textContent=paused?'Play ▷':'Pause Ⅱ';pauseButton.setAttribute('aria-pressed',String(paused));
}
function resize(){
  w=canvas.clientWidth;h=canvas.clientHeight;if(!w||!h)return;
  const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
  // Same meters-to-pixels scale horizontally and vertically: circles stay circles.
  scale=Math.min(w,h)/2.6;world.resize(w/scale,h/scale);
  keyboard={x:world.width*.5,y:world.height*.5};pointers.clear();casting=false;draw();updateStatus();
}
function position(e){const r=canvas.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/scale,.08,world.width-.08),y:clamp((e.clientY-r.top)/scale,.08,world.height-.08)};}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;if(pointers.size>=2)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{...position(e),started:world.time});updateStatus();});
canvas.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId)){pointers.set(e.pointerId,{...position(e),started:pointers.get(e.pointerId).started});if(paused)draw();}});
function release(e){pointers.delete(e.pointerId);updateStatus();}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!casting){casting=true;castStarted=world.time;}updateStatus();}});
canvas.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'){e.preventDefault();casting=false;}updateStatus();});
canvas.addEventListener('blur',()=>{keys.clear();casting=false;pointers.clear();updateStatus();});
document.querySelectorAll('[data-force]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.force;document.querySelectorAll('[data-force]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));updateStatus();}));
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  world.setMode(button.dataset.mode);syncTuning();
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelector('#mode-description').textContent={particles:'A thousand free particles. Gather, scatter, and swirl the light.',ball:'N-body gravity: spheres attract, collide, and settle into a solid cluster.',strands:'Connected strings that bend, curl, and tumble together.',comets:'Free-flying lights with long, luminous tails.',flocking:'A school of rays: following, gathering, and giving each other space.'}[world.mode];
  draw();
}));
// Temporary tuning panel: hide #sim-tuning later without changing the engine.
const tuningFields=[
 ['startForce','Starting force',0,10,.1],['maxForce','Maximum force',0,60,1],
 ['rampTime','Ramp time (seconds)',0,12,.5],['reach','Force reach',.2,3,.1],
 ['gravity','Ball attraction',0,.01,.0001],['damping','Motion damping',0,5,.1],
 ['maxSpeed','Maximum speed',.2,8,.1],['bounce','Ball bounce',0,1,.05],
 ['trailLength','Comet tail length',5,150,5]
];
const tuningGrid=document.querySelector('#tuning-grid');
for(const [key,label,min,max,step] of tuningFields){
 const field=document.createElement('label');field.htmlFor='tune-'+key;
 field.innerHTML=`<span>${label}<output id="value-${key}" for="tune-${key}"></output></span><input id="tune-${key}" type="range" min="${min}" max="${max}" step="${step}">`;
 tuningGrid.append(field);
 field.querySelector('input').addEventListener('input',e=>{world.settings[key]=Number(e.target.value);syncTuning();draw();});
}
const countSlider=document.querySelector('#tune-count');
function syncTuning(){
 for(const [key] of tuningFields){document.querySelector('#tune-'+key).value=world.settings[key];document.querySelector('#value-'+key).value=String(world.settings[key]);}
 countSlider.max={particles:2000,ball:300,strands:1200,comets:200,flocking:240}[world.mode];
 countSlider.value=world.counts[world.mode];document.querySelector('#value-count').value=String(world.counts[world.mode]);
 document.querySelector('#tune-idle').checked=world.settings.idle;
 document.querySelector('#tuning-mode').textContent=world.mode;
 document.querySelector('#sim-help').textContent=`Hold & drag · Power builds over ${world.settings.rampTime}s · Two fingers for two forces · Keyboard: arrows + hold Space`;
}
countSlider.addEventListener('input',()=>{world.counts[world.mode]=Number(countSlider.value);world.reset();syncTuning();draw();});
document.querySelector('#tune-idle').addEventListener('change',e=>{world.settings.idle=e.target.checked;updateStatus();draw();});
document.querySelector('#reset-tuning').addEventListener('click',()=>{Object.assign(world.settings,DEFAULT_SETTINGS);world.counts={particles:1000,ball:180,strands:240,comets:100,flocking:140};world.reset();syncTuning();updateStatus();draw();});
syncTuning();
pauseButton.addEventListener('click',()=>{paused=!paused;updateStatus();schedule();});
document.querySelector('#reset-sim').addEventListener('click',()=>{world.reset();draw();});
function activeForces(){
  if(pointers.size)return [...pointers.values()].map((p,i)=>({...p,type:selected,spin:i===0?1:-1,strength:forceRamp(world.time-p.started,world.settings),label:`${i===0?'L':'R'} · ${selected.toUpperCase()}`}));
  if(casting)return [{...keyboard,type:selected,spin:1,strength:forceRamp(world.time-castStarted,world.settings),label:selected.toUpperCase()}];
  return world.settings.idle?world.controllers():[];
}
function tick(now){
  const elapsed=last?Math.min((now-last)/1000,.05):0;last=now;accumulator+=elapsed;
  const speed=elapsed*1.2;
  keyboard.x=clamp(keyboard.x+(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*speed,.08,world.width-.08);
  keyboard.y=clamp(keyboard.y+(Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp')))*speed,.08,world.height-.08);
  while(accumulator>=1/120){forces=activeForces();world.step(1/120,forces);accumulator-=1/120;}
  draw();frame=requestAnimationFrame(tick);
}
function draw(){
  if(!w||!h)return;
  ctx.fillStyle='#182b3b';ctx.fillRect(0,0,w,h);
  // All geometry and stored comet trails are clipped inside the same hard walls.
  ctx.save();ctx.beginPath();ctx.rect(3,3,w-6,h-6);ctx.clip();
  world.particles.forEach((p,i)=>{
    const x=p.x*scale,y=p.y*scale;
    const color=colors[(world.mode==='strands'?Math.floor(i/20):i)%colors.length];
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=.9;
    if(world.mode==='strands'){
      if(i%20===0){ctx.beginPath();ctx.moveTo(x,y);for(let j=i+1;j<Math.min(i+20,world.particles.length);j++){const q=world.particles[j];ctx.lineTo(q.x*scale,q.y*scale);}ctx.lineWidth=1.8;ctx.lineJoin='round';ctx.stroke();}
    }else if(world.mode==='comets'){
      for(let j=1;j<p.trail.length;j++){ctx.globalAlpha=(1-j/p.trail.length)*.65;ctx.lineWidth=2.5*(1-j/p.trail.length);ctx.beginPath();ctx.moveTo(p.trail[j-1].x*scale,p.trail[j-1].y*scale);ctx.lineTo(p.trail[j].x*scale,p.trail[j].y*scale);ctx.stroke();}
      ctx.globalAlpha=1;ctx.beginPath();ctx.arc(x,y,2.3,0,Math.PI*2);ctx.fill();
    }else if(world.mode==='flocking'){
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(p.vy,p.vx));const flap=3+Math.sin(world.time*6+i)*1.3;
      ctx.beginPath();ctx.moveTo(5,0);ctx.quadraticCurveTo(0,flap,-5,flap+1);ctx.lineTo(-2,0);ctx.lineTo(-5,-flap-1);ctx.quadraticCurveTo(0,-flap,5,0);ctx.fill();ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(-9,Math.sin(world.time*5+i)*2);ctx.lineWidth=.7;ctx.stroke();ctx.restore();
    }else if(world.mode==='particles'){
      ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-p.vx*scale*.035,y-p.vy*scale*.035);ctx.stroke();ctx.beginPath();ctx.arc(x,y,i%11===0?1.7:1.05,0,Math.PI*2);ctx.fill();
    }else{
      const r=Math.max(2,p.r*scale);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.5;ctx.fillStyle='#fff7e3';ctx.beginPath();ctx.arc(x-r*.3,y-r*.3,r*.22,0,Math.PI*2);ctx.fill();
    }
  });ctx.restore();ctx.globalAlpha=1;
  forces=activeForces();
  for(let i=0;i<forces.length;i++){
    const f=forces[i],x=f.x*scale,y=f.y*scale;
    ctx.strokeStyle=i===0?'#85aca2':'#cf956c';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=1.3;
    ctx.beginPath();ctx.arc(x,y,10+(f.strength||1)*2,0,Math.PI*2);ctx.stroke();
    if(f.type==='swirl'){ctx.beginPath();for(let j=0;j<45;j++){const a=j/7,r=2+j*.14;j?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x+r,y);}ctx.stroke();}
    else{ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+6,y);ctx.moveTo(x,y-6);ctx.lineTo(x,y+6);ctx.stroke();}
    ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(f.label,clamp(x,40,w-40),clamp(y+26,45,h-10));
  }
  if(document.activeElement===canvas&&!casting&&!pointers.size){ctx.strokeStyle='#efe4cc';ctx.strokeRect(keyboard.x*scale-4,keyboard.y*scale-4,8,8);}
}
function schedule(){cancelAnimationFrame(frame);last=0;accumulator=0;if(visible&&!paused&&!document.hidden)frame=requestAnimationFrame(tick);else draw();}
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(canvas);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pointers.clear();keys.clear();casting=false;updateStatus();}schedule();});
reduced.addEventListener('change',()=>{paused=reduced.matches;updateStatus();schedule();});
resize();updateStatus();

// Media slots retain their source aspect ratio. No stretching, including animated images.
document.querySelectorAll('[data-media]').forEach(panel=>{
  const config=window.MAGIC_MEDIA?.[panel.dataset.media];
  if(!config?.src||!['video','image','youtube'].includes(config.type))return;
  if(config.type==='youtube'&&!/^[\w-]{11}$/.test(config.src))return;
  const fallback=panel.innerHTML;panel.replaceChildren();panel.classList.add('has-media');
  if(config.type==='youtube'){
    const button=document.createElement('button');button.className='youtube-play';button.textContent='▷ Watch the show';button.setAttribute('aria-label','Play Magic Fingers film');
    button.addEventListener('click',()=>{const player=document.createElement('iframe');player.title='Magic Fingers film';player.src=`https://www.youtube-nocookie.com/embed/${config.src}?autoplay=1&rel=0`;player.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';player.allowFullscreen=true;panel.replaceChildren(player);player.focus();});panel.append(button);return;
  }
  const el=document.createElement(config.type==='video'?'video':'img');
  let observer;
  el.addEventListener('error',()=>{observer?.disconnect();panel.innerHTML=fallback;panel.classList.remove('has-media');},{once:true});
  if(config.type==='video'){
    el.muted=true;el.loop=true;el.playsInline=true;el.controls=true;el.preload='metadata';if(config.poster)el.poster=config.poster;
    let manuallyPaused=false,autoPausing=false;
    el.addEventListener('pause',()=>{if(!autoPausing)manuallyPaused=true;});el.addEventListener('play',()=>{manuallyPaused=false;});
    observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){autoPausing=true;el.pause();setTimeout(()=>autoPausing=false,0);}else if(!reduced.matches&&!manuallyPaused)el.play().catch(()=>{});});observer.observe(panel);
    reduced.addEventListener('change',()=>{if(reduced.matches)el.pause();});
  }else{el.className='configured-image';el.alt=config.alt||'Magic Fingers demonstration';el.loading='lazy';}
  el.src=config.src;panel.append(el);
});
