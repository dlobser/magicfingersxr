// Browser-sized 2D adaptations of Bodies, Strands and Boids.compute.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function forceAt(x,y,f){
  const dx=f.x-x,dy=f.y-y,d=Math.hypot(dx,dy);
  if(d<1e-8)return {ax:0,ay:0,drag:0};
  const nx=dx/d,ny=dy/d,s=f.strength??1;
  // Smooth core, finite reach and gentle acceleration; no global vacuum or collect drag.
  const fall=Math.exp(-d*d/1.6),pull=.38*d/(d*d+.16)*fall;
  if(f.type==='pull')return {ax:nx*pull*s,ay:ny*pull*s,drag:0};
  const tangent=.72*d/(d*d+.22)*fall*(f.spin||1);
  const radial=.22*(d-.32)*fall;
  return {ax:(nx*radial+ny*tangent)*s,ay:(ny*radial-nx*tangent)*s,drag:0};
}
export class ParticleWorld{
  constructor(width=4.8,height=2.6,count){this.width=width;this.height=height;this.overrideCount=count;this.time=0;this.seed=1837;this.mode='ball';this.reset();}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  setMode(mode){if(!['ball','strands','comets','flocking'].includes(mode))return;this.mode=mode;this.reset();}
  reset(){
    const count=this.overrideCount??({ball:180,strands:240,comets:100,flocking:140}[this.mode]);
    this.particles=Array.from({length:count},(_,i)=>{
      const angle=this.random()*Math.PI*2,speed=this.mode==='flocking'?.48:.18+this.random()*.3;
      return {x:.1+this.random()*(this.width-.2),y:.1+this.random()*(this.height-.2),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:.018+this.random()*.022,trail:[]};
    });
    if(this.mode==='strands')for(let i=0;i<count;i+=20){const x=.3+this.random()*(this.width-.6),y=.3+this.random()*(this.height-.6);for(let j=0;j<20&&i+j<count;j++){const p=this.particles[i+j];p.x=clamp(x+(j-10)*.055,.05,this.width-.05);p.y=clamp(y+Math.sin(j*.4)*.1,.05,this.height-.05);p.vx=.15*Math.cos(i);p.vy=.15*Math.sin(i);}}
  }
  resize(width,height){const sx=width/this.width,sy=height/this.height;this.width=width;this.height=height;for(const p of this.particles){p.x=clamp(p.x*sx,.05,width-.05);p.y=clamp(p.y*sy,.05,height-.05);p.trail=[];}}
  controllers(){const t=this.time;return [
    {x:this.width*(.38+.23*Math.sin(t*.31)),y:this.height*(.5+.28*Math.sin(t*.43+.6)),type:'swirl',spin:-1,strength:.65,label:'L · SWIRL'},
    {x:this.width*(.62+.25*Math.cos(t*.47)),y:this.height*(.5+.3*Math.sin(t*.53+2)),type:'pull',spin:1,strength:.12+.35*Math.pow(.5+.5*Math.sin(t*1.1),4),label:'R · PULL'}];}
  step(dt,forces=this.controllers()){
    dt=clamp(dt,0,1/60);this.time+=dt;
    const ps=this.particles,acc=ps.map(p=>{let ax=0,ay=0;for(const f of forces){const a=forceAt(p.x,p.y,f);ax+=a.ax;ay+=a.ay;}return {ax,ay};});
    // Equal/opposite softened gravity and contact repulsion, like the game's spheres.
    if(this.mode==='ball')for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
      const a=ps[i],b=ps[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy)),rest=a.r+b.r;
      const f=d<rest?-22*(rest-d):.0008/(d*d+.05)*Math.exp(-d*d/2);
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
      p.vx=(p.vx+a.ax*dt)*Math.exp(-.025*dt);p.vy=(p.vy+a.ay*dt)*Math.exp(-.025*dt);
      const speed=Math.hypot(p.vx,p.vy),target=this.mode==='flocking'?clamp(speed,.36,.75):Math.min(speed,1.4);
      if(speed>1e-8){p.vx*=target/speed;p.vy*=target/speed;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
    }
    // Position-based distance constraints, following Strands.compute; 20 nodes per string.
    if(this.mode==='strands')for(let pass=0;pass<4;pass++)for(let i=0;i<ps.length-1;i++){
      if(i%20===19)continue;const a=ps[i],b=ps[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1e-8,Math.hypot(dx,dy)),k=(d-.058)/d*.45;
      a.x+=dx*k;a.y+=dy*k;b.x-=dx*k;b.y-=dy*k;
    }
    for(const p of ps){
      if(this.mode==='strands'&&dt>0){p.vx=(p.x-p.ox)/dt;p.vy=(p.y-p.oy)/dt;}
      const pad=this.mode==='ball'?Math.max(.025,p.r):.025;
      if(p.x<pad){p.x=pad;p.vx=Math.abs(p.vx)*.85;}else if(p.x>this.width-pad){p.x=this.width-pad;p.vx=-Math.abs(p.vx)*.85;}
      if(p.y<pad){p.y=pad;p.vy=Math.abs(p.vy)*.85;}else if(p.y>this.height-pad){p.y=this.height-pad;p.vy=-Math.abs(p.vy)*.85;}
      if(this.mode==='comets'){p.trail.unshift({x:p.x,y:p.y});if(p.trail.length>50)p.trail.pop();}
    }
  }
}
