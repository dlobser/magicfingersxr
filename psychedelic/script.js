const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelector('#year').textContent = new Date().getFullYear();
const spellInfo = {
  gravity: ['Gravity gardens', 'Attraction is a beautiful thing.', 'Gather particles into gravitational clusters. Pull them close, let them orbit, then send a whole new world spinning.'],
  shoal: ['Electric shoals', 'A little wild. A little otherworldly.', 'Guide schools of stingrays through the air. Watch a hundred small movements find a rhythm of their own.'],
  threads: ['Cosmic spaghetti', 'Follow a very unusual thread.', 'Stretch, twist, and tangle stringy streams of light. Some of the best discoveries begin with a glorious mess.'],
  comets: ['Comet trails', 'Make a wish. Then give it a nudge.', 'Send comets arcing through your space. Draw in motion, leave a luminous trail, and see where the next gesture takes you.']
};
const studies = [];
const palette = ['#d9df78', '#eeb897', '#b8a5d2', '#7abfd1', '#a9c6b1', '#e77d54'];

class Study {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.kind = canvas.dataset.art;
    this.stage = canvas.closest('.media-stage');
    this.button = this.stage.querySelector('.motion-toggle');
    this.time = 1.5;
    this.paused = reducedMotion.matches;
    this.visible = false;
    this.pointer = {x: .5, y: .5, active: false};
    this.button?.addEventListener('click', () => {this.paused = !this.paused; this.syncButton(); this.schedule();});
    this.stage.addEventListener('pointermove', e => {
      const r = this.stage.getBoundingClientRect();
      this.pointer = {x: (e.clientX-r.left)/r.width, y: (e.clientY-r.top)/r.height, active: true};
      if (this.paused) this.render();
    });
    this.stage.addEventListener('pointerleave', () => {this.pointer.active = false;});
    new ResizeObserver(() => this.resize()).observe(canvas);
    new IntersectionObserver(entries => {this.visible = entries[0].isIntersecting; this.schedule();}, {rootMargin:'80px'}).observe(canvas);
    document.addEventListener('visibilitychange', () => this.schedule());
    reducedMotion.addEventListener('change', () => {this.paused = reducedMotion.matches;this.syncButton();this.schedule();});
    this.syncButton();
    this.resize();
  }
  syncButton() {
    if (!this.button) return;
    this.button.textContent = this.paused ? 'Play motion ▷' : 'Pause motion Ⅱ';
    this.button.setAttribute('aria-pressed', String(this.paused));
    this.button.setAttribute('aria-label', `${this.paused ? 'Play' : 'Pause'} ${this.kind === 'music' ? 'resonance' : 'particle'} animation`);
  }
  resize() {
    this.w = this.canvas.clientWidth; this.h = this.canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = this.w * ratio; this.canvas.height = this.h * ratio;
    this.ctx.setTransform(ratio,0,0,ratio,0,0);
    this.render();
  }
  schedule() {
    cancelAnimationFrame(this.frame); this.last = null;
    if (this.visible && !this.paused && !document.hidden && this.canvas.isConnected) this.frame = requestAnimationFrame(t => this.tick(t));
    else this.render();
  }
  tick(now) {
    this.time += this.last === null ? 0 : Math.min((now-this.last)/1000,.05);
    this.last = now; this.render();
    this.frame = requestAnimationFrame(t => this.tick(t));
  }
  render() {
    const c=this.ctx, w=this.w, h=this.h, t=this.time;
    if (!w || !h) return;
    c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.fillStyle='#101f38';c.fillRect(0,0,w,h);
    const glow=c.createRadialGradient(w*.55,h*.48,0,w*.55,h*.48,w*.55);
    glow.addColorStop(0,'#264a6540');glow.addColorStop(1,'#101f3800');c.fillStyle=glow;c.fillRect(0,0,w,h);
    // Fine plotted points recall printed astronomical diagrams.
    c.fillStyle='#a9c6b1';c.globalAlpha=.2;
    for(let i=0;i<65;i++){const x=((i*137.37)%997)/997*w,y=((i*71.41)%601)/601*h;c.fillRect(x,y,1,1);}
    c.globalAlpha=1;
    const px=this.pointer.active?(this.pointer.x-.5)*w*.16:0;
    const py=this.pointer.active?(this.pointer.y-.5)*h*.16:0;
    if(this.kind==='gravity') {
      for(let g=0;g<3;g++){
        const cx=w*(.29+g*.23)+Math.sin(t*.25+g)*w*.025+px,cy=h*(g===1?.43:.49)+py;
        const size=Math.min(w*.15,h*.29)*(g===1?1.2:.85);
        for(let i=0;i<420;i++){
          const a=i*2.39996+t*(g%2?-.16:.13), r=Math.sqrt(i/420)*size;
          const ripple=1+Math.sin(a*3+t*.8)*.08;
          const x=cx+Math.cos(a)*r*ripple,y=cy+Math.sin(a)*r*.69+Math.sin(i*.6+t)*size*.22;
          c.fillStyle=palette[(g*2+Math.floor(i/100))%palette.length];c.globalAlpha=.35+(i%7)/12;
          c.beginPath();c.arc(x,y,i%11===0?2.4:1.2,0,Math.PI*2);c.fill();
        }
        c.globalAlpha=.3;c.strokeStyle=palette[g*2];c.lineWidth=.7;
        c.beginPath();c.ellipse(cx,cy,size*1.2,size*.56,-.4+g*.4,0,Math.PI*2);c.stroke();
      }
    } else if(this.kind==='shoal') {
      for(let i=0;i<54;i++){
        const phase=i*2.399, x=(w*(.5+Math.sin(phase+t*.17)*.39))+px,y=h*(.46+Math.cos(phase*1.7+t*.21)*.28)+py;
        const size=8+(i%7)*2.8,wing=Math.sin(t*1.8+i)*.45;
        c.save();c.translate(x,y);c.rotate(Math.sin(phase+t*.17)*.7);c.strokeStyle=palette[i%6];c.fillStyle=palette[i%6];c.globalAlpha=.25+(i%5)*.12;c.lineWidth=.7;
        c.beginPath();c.moveTo(0,-size*.6);c.quadraticCurveTo(size*.35,size*wing,size,0);c.quadraticCurveTo(size*.3,size*.3,0,size*.7);c.quadraticCurveTo(-size*.3,size*.3,-size,0);c.quadraticCurveTo(-size*.35,size*wing,0,-size*.6);c.fill();
        c.globalAlpha=.6;c.beginPath();c.moveTo(0,size*.5);c.quadraticCurveTo(size*.25,size*1.5,Math.sin(t+i)*size*.4,size*2);c.stroke();c.restore();
      }
    } else if(this.kind==='threads') {
      for(let k=0;k<32;k++){
        c.strokeStyle=palette[Math.floor(k/6)%6];c.lineWidth=k%6===0?2.7:.75;c.globalAlpha=.3+(k%5)*.12;c.beginPath();
        for(let j=0;j<=170;j++){
          const a=j/170*Math.PI*2;
          const x=w*.5+Math.sin(a*2+t*.13+k*.035)*w*.32+Math.cos(a*5+k*.1)*w*.035+px;
          const y=h*.47+Math.cos(a*3-t*.12+k*.04)*h*.27+Math.sin(a*2+k*.15)*h*.025+py;
          j?c.lineTo(x,y):c.moveTo(x,y);
        }c.stroke();
      }
    } else if(this.kind==='comets') {
      for(let k=0;k<12;k++){
        c.strokeStyle=palette[k%6];c.lineWidth=1.2;
        for(let j=0;j<50;j++){
          const a=t*.22+k*.51-j*.012;
          const x=w*.5+Math.sin(a)*w*(.18+(k%4)*.055)+px;
          const y=h*.45+Math.cos(a*1.4+k*.4)*h*.29+py;
          c.globalAlpha=(1-j/50)*.85;c.fillStyle=palette[k%6];c.beginPath();c.arc(x,y,(1-j/50)*2.5+.25,0,Math.PI*2);c.fill();
        }
      }
    } else {
      // Abstract resonance: time-based, explicitly not a live audio simulation.
      const narrow=w<600;
      c.save();c.translate(w*(narrow?.53:.67),h*(narrow?.66:.5));c.rotate(t*.035);
      const radius=Math.min(w*(narrow?.37:.3),h*.41);
      for(let k=0;k<64;k++){
        c.strokeStyle=palette[Math.floor(k/9)%6];c.lineWidth=k%9===0?2.5:1;c.globalAlpha=.35+(k%8)*.07;c.beginPath();
        for(let j=0;j<=180;j++){
          const a=j/180*Math.PI*2;
          const r=radius*(.22+k*.012)*(1+.21*Math.sin(a*6+t*.4+k*.055));
          const x=Math.cos(a)*r,y=Math.sin(a)*r;j?c.lineTo(x,y):c.moveTo(x,y);
        }c.closePath();c.stroke();
      }c.restore();
    }
    c.globalAlpha=1;
    const fade=c.createLinearGradient(0,h*.65,0,h);fade.addColorStop(0,'#101f3800');fade.addColorStop(1,'#101f38d9');c.fillStyle=fade;c.fillRect(0,0,w,h);
  }
}

const stage = document.querySelector('#spell-stage');
const tabs = [...document.querySelectorAll('[role=tab]')];
function selectSpell(tab) {
  tabs.forEach(t => {t.setAttribute('aria-selected',String(t===tab));t.tabIndex=t===tab?0:-1;});
  const kind=tab.dataset.style, info=spellInfo[kind];
  stage.setAttribute('aria-labelledby',tab.id);
  stage.querySelector('.media-label').textContent=`MOTION STUDY / ${info[0].toUpperCase()}`;
  document.querySelector('#spell-title').textContent=info[1];
  document.querySelector('#spell-copy').textContent=info[2];
  const study=studies.find(s=>s.stage===stage);if(study){study.kind=kind;study.render();}
}
tabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>selectSpell(tab));
  tab.addEventListener('keydown',e=>{
    let next;
    if(e.key==='ArrowRight')next=(i+1)%tabs.length;
    if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
    if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;
    if(next!==undefined){e.preventDefault();selectSpell(tabs[next]);tabs[next].focus();}
  });
});

function installMedia(panel, config) {
  if(!config?.src)return false;
  if(!['video','image','youtube'].includes(config.type))return false;
  if(config.type==='youtube'&&!/^[\w-]{11}$/.test(config.src))return false;
  const fallback=panel.innerHTML;
  const restore=()=>{
    panel.innerHTML=fallback;panel.classList.remove('has-media');
    if(panel===stage){document.querySelector('.spell-tabs').hidden=false;stage.setAttribute('role','tabpanel');stage.setAttribute('aria-labelledby','tab-gravity');stage.removeAttribute('aria-label');}
    panel.querySelectorAll('canvas').forEach(c=>studies.push(new Study(c)));
  };
  panel.replaceChildren();panel.classList.add('has-media');
  if(config.type==='youtube'){
    const button=document.createElement('button');button.className='film-placeholder youtube-play';
    const star=document.createElement('span');star.className='film-star';star.textContent='▷';star.setAttribute('aria-hidden','true');
    const title=document.createElement('h3');title.textContent='See the magic in the hands.';
    const copy=document.createElement('p');copy.textContent='Play the film';button.append(star,title,copy);button.setAttribute('aria-label',config.alt||'Play film');
    panel.style.background='var(--paper)';panel.style.color='var(--ink)';panel.append(button);
    button.addEventListener('click',()=>{
      const iframe=document.createElement('iframe');iframe.src=`https://www.youtube-nocookie.com/embed/${config.src}?autoplay=1&rel=0`;iframe.title=config.alt||'Magic Fingers film';iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;panel.replaceChildren(iframe);iframe.focus();
    });
  }else{
    const element=document.createElement(config.type==='video'?'video':'img');
    if(config.type==='video'){
      element.muted=true;element.loop=true;element.playsInline=true;element.controls=true;element.preload='metadata';element.autoplay=!reducedMotion.matches;
      if(config.poster)element.poster=config.poster;
      new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)element.pause();else if(!reducedMotion.matches)element.play().catch(()=>{});}).observe(panel);
      reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)element.pause();});
    }else{element.className='configured-image';element.alt=config.alt||'Magic Fingers in action';element.loading='lazy';}
    element.addEventListener('error',restore,{once:true});element.src=config.src;panel.append(element);
    const label=document.createElement('span');label.className='media-label mono room-label';label.textContent=config.label||'MAGIC FINGERS / IN MOTION';panel.append(label);
  }
  return true;
}
document.querySelectorAll('[data-media]').forEach(panel=>{
  const installed=installMedia(panel,window.MAGIC_MEDIA?.[panel.dataset.media]);
  if(installed&&panel===stage){document.querySelector('.spell-tabs').hidden=true;stage.removeAttribute('role');stage.removeAttribute('aria-labelledby');stage.setAttribute('aria-label','Magic Fingers interaction footage');}
});
document.querySelectorAll('canvas[data-art]').forEach(canvas=>studies.push(new Study(canvas)));
