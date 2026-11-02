import {ParticleWorld,clamp} from './physics.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
document.querySelector('#year').textContent=new Date().getFullYear();
const canvas=document.querySelector('#particle-canvas'),ctx=canvas.getContext('2d');
const world=new ParticleWorld();
const pointers=new Map(),keys=new Set();
const pauseButton=document.querySelector('#pause-sim'),status=document.querySelector('#sim-status');
let selected='pull',paused=reduced.matches,visible=false,frame,last=0,accumulator=0,w=0,h=0,scale=1;
let keyboard={x:2.4,y:1.1},casting=false,forces=[];
const colors=['#efe4cc','#d8ba91','#cf7850','#85aca2','#598f91','#cf956c'];
function updateStatus(){
  status.textContent=paused?'PAUSED · PRESS PLAY TO CONTINUE':pointers.size||casting?`YOU’RE CASTING · ${selected.toUpperCase()}`:'AUTO SHOW · TWO IMAGINARY HANDS';
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
canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;if(pointers.size>=2)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,position(e));updateStatus();});
canvas.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId)){pointers.set(e.pointerId,position(e));if(paused)draw();}});
function release(e){pointers.delete(e.pointerId);updateStatus();}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space')casting=true;updateStatus();}});
canvas.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'){e.preventDefault();casting=false;}updateStatus();});
canvas.addEventListener('blur',()=>{keys.clear();casting=false;pointers.clear();updateStatus();});
document.querySelectorAll('[data-force]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.force;document.querySelectorAll('[data-force]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));updateStatus();}));
pauseButton.addEventListener('click',()=>{paused=!paused;updateStatus();schedule();});
document.querySelector('#reset-sim').addEventListener('click',()=>{world.reset();draw();});
function activeForces(){
  if(pointers.size)return [...pointers.values()].map((p,i)=>({...p,type:selected,spin:i===0?1:-1,strength:1,label:`${i===0?'L':'R'} · ${selected.toUpperCase()}`}));
  if(casting)return [{...keyboard,type:selected,spin:1,strength:1,label:selected.toUpperCase()}];
  return world.controllers();
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
  // Short velocity strokes, not retained framebuffer trails: nothing survives outside the walls.
  ctx.save();ctx.beginPath();ctx.rect(3,3,w-6,h-6);ctx.clip();
  world.particles.forEach((p,i)=>{
    const x=p.x*scale,y=p.y*scale;
    ctx.globalAlpha=.7;ctx.strokeStyle=colors[i%colors.length];ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(clamp(x-p.vx*scale*.035,3,w-3),clamp(y-p.vy*scale*.035,3,h-3));ctx.stroke();
    ctx.globalAlpha=.9;ctx.fillStyle=colors[i%colors.length];ctx.beginPath();ctx.arc(x,y,i%11===0?1.7:1.05,0,Math.PI*2);ctx.fill();
  });ctx.restore();ctx.globalAlpha=1;
  forces=activeForces();
  for(let i=0;i<forces.length;i++){
    const f=forces[i],x=f.x*scale,y=f.y*scale;
    ctx.strokeStyle=i===0?'#85aca2':'#cf956c';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=1.3;
    ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.stroke();
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
