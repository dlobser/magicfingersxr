// Browser-sized 2D adaptations of Bodies, Strands and Boids.compute.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const DEFAULT_SETTINGS={startForce:.8,maxForce:32,rampTime:5,reach:1.5,gravity:.002,damping:1,mass:5.25,maxSpeed:1.5,bounce:.35,trailLength:50,idle:true};
export const forceRamp=(seconds,settings=DEFAULT_SETTINGS)=>settings.startForce+(settings.maxForce-settings.startForce)*clamp(settings.rampTime===0?1:seconds/settings.rampTime,0,1);
export function forceAt(x,y,f){
  const dx=f.x-x,dy=f.y-y,d=Math.hypot(dx,dy);
  if(d<1e-8)return {ax:0,ay:0,drag:0};
  const nx=dx/d,ny=dy/d,s=f.strength??1;
  // Ball Pull has a tighter, stronger field: near-side bodies peel away instead of
  // the whole clump receiving nearly the same acceleration. Free particles stay broader.
  const fall=Math.exp(-d*d/1.6),pull=(f.body?.85:.48)*d/(d*d+(f.body?.025:.08))*Math.exp(-d*d/(f.body?.16:.65));
  if(f.type==='pull')return {ax:nx*pull*s,ay:ny*pull*s,drag:0};
  const tangent=.25*d/(d*d+.22)*fall*(f.spin||1);
  // Always attracts, with a softened core; spin accompanies the inward force.
  const radial=.8*d/(d*d+.16)*fall;
  return {ax:(nx*radial+ny*tangent)*s,ay:(ny*radial-nx*tangent)*s,drag:0};
}
export class ParticleWorld{
  constructor(width=4.8,height=2.6,count){this.width=width;this.height=height;this.overrideCount=count;this.settings={...DEFAULT_SETTINGS};this.counts={particles:1000,ball:180,strands:240,comets:100,flocking:140};this.time=0;this.seed=1837;this.mode='particles';this.reset();}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  setMode(mode){if(!['particles','ball','strands','comets','flocking'].includes(mode))return;this.mode=mode;this.reset();}
  reset(){
    const count=this.overrideCount??this.counts[this.mode];
    this.particles=Array.from({length:count},(_,i)=>{
      const angle=this.random()*Math.PI*2,speed=this.mode==='flocking'?.48:.18+this.random()*.3;
      return {x:.1+this.random()*(this.width-.2),y:.1+this.random()*(this.height-.2),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:.018+this.random()*.022,trail:[]};
    });
    if(this.mode==='strands')for(let i=0;i<count;i+=20){const x=.3+this.random()*(this.width-.6),y=.3+this.random()*(this.height-.6);for(let j=0;j<20&&i+j<count;j++){const p=this.particles[i+j];p.x=clamp(x+(j-10)*.055,.05,this.width-.05);p.y=clamp(y+Math.sin(j*.4)*.1,.05,this.height-.05);p.vx=.15*Math.cos(i);p.vy=.15*Math.sin(i);}}
  }
  resize(width,height){const sx=width/this.width,sy=height/this.height;this.width=width;this.height=height;for(const p of this.particles){p.x=clamp(p.x*sx,.05,width-.05);p.y=clamp(p.y*sy,.05,height-.05);p.trail=[];}}
  controllers(){const t=this.time;return [
    {x:this.width*(.38+.23*Math.sin(t*.31)),y:this.height*(.5+.28*Math.sin(t*.43+.6)),type:'swirl',spin:-1,strength:forceRamp(t%9,this.settings)*.7,label:'L · SWIRL'},
    {x:this.width*(.62+.25*Math.cos(t*.47)),y:this.height*(.5+.3*Math.sin(t*.53+2)),type:'pull',spin:1,strength:forceRamp((t+4.5)%9,this.settings)*.6,label:'R · PULL'}];}
  step(dt,forces=this.controllers()){
    dt=clamp(dt,0,1/60);this.time+=dt;
    const ps=this.particles,acc=ps.map(p=>{let ax=0,ay=0;for(const f of forces){const a=forceAt(f.x+(p.x-f.x)/this.settings.reach,f.y+(p.y-f.y)/this.settings.reach,this.mode==='ball'?{...f,body:true}:f);ax+=a.ax/this.settings.mass;ay+=a.ay/this.settings.mass;}return {ax,ay};});
    // Equal/opposite softened gravity and contact repulsion, like the game's spheres.
    if(this.mode==='ball')for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
      const a=ps[i],b=ps[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy)),rest=a.r+b.r;
      const f=this.settings.gravity/(d*d+.04);
      acc[i].ax+=dx/d*f;acc[i].ay+=dy/d*f;acc[j].ax-=dx/d*f;acc[j].ay-=dy/d*f;
    }
    // Reynolds alignment/cohesion/separation; keep a cruise speed rather than settling.
    if(this.mode==='flocking')for(let i=0;i<ps.length;i++){
      const p=ps[i];let n=0,x=0,y=0,vx=0,vy=0,sx=0,sy=0;
      for(let j=0;j<ps.length;j++){if(i===j)continue;const q=ps[j],dx=q.x-p.x,dy=q.y-p.y,d2=dx*dx+dy*dy;if(d2>.3||d2<1e-8)continue;n++;x+=dx;y+=dy;vx+=q.vx;vy+=q.vy;if(d2<.018){sx-=dx/(d2+.002);sy-=dy/(d2+.002);}}
      if(n){acc[i].ax+=(vx/n-p.vx)*.9+x/n*.45+sx*.045;acc[i].ay+=(vy/n-p.vy)*.9+y/n*.45+sy*.045;}
      const margin=.35;acc[i].ax+=(Math.max(0,margin-p.x)-Math.max(0,p.x-this.width+margin))*3;acc[i].ay+=(Math.max(0,margin-p.y)-Math.max(0,p.y-this.height+margin))*3;
    }
    for(let i=0;i<ps.length;i++){
      const p=ps[i],a=acc[i];p.ox=p.x;p.oy=p.y;
      p.vx=(p.vx+a.ax*dt)*Math.exp(-(this.mode==='ball'?.16:.025)*this.settings.damping*dt);p.vy=(p.vy+a.ay*dt)*Math.exp(-(this.mode==='ball'?.16:.025)*this.settings.damping*dt);
      const speed=Math.hypot(p.vx,p.vy),target=this.mode==='flocking'?clamp(speed,Math.min(.36,this.settings.maxSpeed),Math.min(.75,this.settings.maxSpeed)):Math.min(speed,this.settings.maxSpeed);
      if(speed>1e-8){p.vx*=target/speed;p.vy*=target/speed;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
    }
    // Position-based distance constraints, following Strands.compute; 20 nodes per string.
    if(this.mode==='strands')for(let pass=0;pass<4;pass++)for(let i=0;i<ps.length-1;i++){
      if(i%20===19)continue;const a=ps[i],b=ps[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1e-8,Math.hypot(dx,dy)),k=(d-.058)/d*.45;
      a.x+=dx*k;a.y+=dy*k;b.x-=dx*k;b.y-=dy*k;
    }
    // Resolve contacts with positional projection and an inelastic normal impulse.
    // Gravity remains pairwise; impacts dissipate energy so an isolated cloud settles.
    if(this.mode==='ball')for(let pass=0;pass<5;pass++)for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
      const a=ps[i],b=ps[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),rest=a.r+b.r;
      if(d>=rest)continue;
      const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,correction=(rest-d)*.5;
      a.x-=nx*correction;a.y-=ny*correction;b.x+=nx*correction;b.y+=ny*correction;
      const closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(closing<0){const impulse=-(1+this.settings.bounce)*closing*.5;a.vx-=nx*impulse;a.vy-=ny*impulse;b.vx+=nx*impulse;b.vy+=ny*impulse;}
    }
    for(const p of ps){
      if(this.mode==='strands'&&dt>0){p.vx=(p.x-p.ox)/dt;p.vy=(p.y-p.oy)/dt;}
      const pad=this.mode==='ball'?Math.max(.025,p.r):.025;
      if(p.x<pad){p.x=pad;p.vx=Math.abs(p.vx)*.85;}else if(p.x>this.width-pad){p.x=this.width-pad;p.vx=-Math.abs(p.vx)*.85;}
      if(p.y<pad){p.y=pad;p.vy=Math.abs(p.vy)*.85;}else if(p.y>this.height-pad){p.y=this.height-pad;p.vy=-Math.abs(p.vy)*.85;}
      if(this.mode==='comets'){p.trail.unshift({x:p.x,y:p.y});if(p.trail.length>this.settings.trailLength)p.trail.length=this.settings.trailLength;}
    }
  }
}
