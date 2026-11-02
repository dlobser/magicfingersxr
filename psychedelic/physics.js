// 2D projection of MagicFingers/Shaders/Compute/Lib/Forces.hlsl:
// CsGravity, CsSwirl, RangeMask, FarPullTo and near-core collect damping.
// World coordinates are meters; display scaling is uniform on both axes.
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export function forceAt(x,y,f) {
  const dx=f.x-x,dy=f.y-y,d=Math.hypot(dx,dy),fd=Math.max(.2,d);
  if(d<1e-8)return {ax:0,ay:0,drag:f.type==='pull'?1.5:0};
  const nx=dx/d,ny=dy/d,range=1-clamp((d-(f.type==='pull'?.45:.6))*35,0,1);
  // Unity uses refHz^2 to convert Cosmic Sugar frame units to SI acceleration.
  const conversion=72*72*1e-4;
  let ax,ay;
  if(f.type==='pull') {
    const gain=1.4*conversion*range/(fd*fd*fd);
    ax=nx*gain;ay=ny*gain;
  }else{
    // Row-vector Rodrigues rotation around the screen normal. Left mirrors right.
    const angle=fd*.4*(f.spin||1),cs=Math.cos(angle),sn=Math.sin(angle);
    const gain=conversion*range/(fd*fd);
    ax=(nx*cs+ny*sn)*gain;ay=(-nx*sn+ny*cs)*gain;
  }
  const far=f.type==='pull'?.2:.12;
  const shortfall=d>=.05?Math.max(0,far-(ax*nx+ay*ny)):0;
  const strength=f.strength??1;
  return {ax:(ax+nx*shortfall)*strength,ay:(ay+ny*shortfall)*strength,
    drag:f.type==='pull'?1.5*clamp(1-d/.3,0,1)*strength:0};
}

export class ParticleWorld {
  constructor(width=4.8,height=2.2,count=1000){
    this.width=width;this.height=height;this.count=count;this.time=0;this.seed=1837;this.particles=[];this.reset();
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  reset(){this.particles=Array.from({length:this.count},()=>({x:.08+this.random()*(this.width-.16),y:.08+this.random()*(this.height-.16),vx:(this.random()-.5)*.15,vy:(this.random()-.5)*.15}));}
  resize(width,height){const sx=width/this.width,sy=height/this.height;this.width=width;this.height=height;for(const p of this.particles){p.x=clamp(p.x*sx,.025,width-.025);p.y=clamp(p.y*sy,.025,height-.025);}}
  controllers(){
    const t=this.time;
    // The game's LightShow uses a slow lead + faster dancer, pulses and mirrored spin.
    return [
      {x:this.width*(.38+.18*Math.sin(t*.19)),y:this.height*(.5+.22*Math.sin(t*.23+.6)),type:'swirl',spin:-1,strength:.65+.3*Math.sin(t*.4),label:'L · SWIRL'},
      {x:this.width*(.62+.20*Math.cos(t*.31)),y:this.height*(.5+.23*Math.sin(t*.37+2)),type:'pull',spin:1,strength:.3+.65*Math.pow(.5+.5*Math.sin(t*.8),4),label:'R · PULL'}
    ];
  }
  step(dt,forces=this.controllers()){
    dt=Math.min(Math.max(dt,0),1/60);this.time+=dt;
    // Crowding kick follows Sugar.compute's idea; stops coincident particles locking together.
    const cells=new Map();
    for(const p of this.particles){const key=`${Math.floor(p.x/.035)},${Math.floor(p.y/.035)}`;cells.set(key,(cells.get(key)||0)+1);}
    for(let i=0;i<this.particles.length;i++){
      const p=this.particles[i];let ax=0,ay=0,drag=.35;
      for(const f of forces){const a=forceAt(p.x,p.y,f);ax+=a.ax;ay+=a.ay;drag+=a.drag;}
      p.vx=(p.vx+ax*dt)*Math.exp(-drag*dt);p.vy=(p.vy+ay*dt)*Math.exp(-drag*dt);
      const crowded=cells.get(`${Math.floor(p.x/.035)},${Math.floor(p.y/.035)}`)||0;
      if(crowded>9){const a=i*2.39996+this.time*3,k=Math.min(1,(crowded-9)/9)*dt*.9;p.vx+=Math.cos(a)*k;p.vy+=Math.sin(a)*k;}
      const speed=Math.hypot(p.vx,p.vy);if(speed>3){p.vx*=3/speed;p.vy*=3/speed;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      // Browser-specific hard walls, with a margin for the rendered particle radius.
      const pad=.025;
      if(p.x<pad){p.x=pad;p.vx=Math.abs(p.vx)*.7;}else if(p.x>this.width-pad){p.x=this.width-pad;p.vx=-Math.abs(p.vx)*.7;}
      if(p.y<pad){p.y=pad;p.vy=Math.abs(p.vy)*.7;}else if(p.y>this.height-pad){p.y=this.height-pad;p.vy=-Math.abs(p.vy)*.7;}
    }
  }
}
