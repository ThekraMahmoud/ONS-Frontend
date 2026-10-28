/** One audio channel for the kiosk: a new step always replaces the previous one. */
export class KioskNarrator {
  constructor({createAudio=()=>new Audio(),schedule=(callback,delay)=>setTimeout(callback,delay),cancel=(timer)=>clearTimeout(timer)}={}){
    this.audio=createAudio();this.schedule=schedule;this.cancel=cancel;this.listeners=new Set();
    this.state={playing:false,loading:false,failed:false,blocked:false,language:null};
    this.prepared=false;this.plan=[];this.key=null;this.index=0;this.generation=0;this.timer=null;this.paused=false;this.ended=false;
  }
  subscribe=(listener)=>{this.listeners.add(listener);return()=>this.listeners.delete(listener);};
  getSnapshot=()=>this.state;
  emit(patch){this.state={...this.state,...patch};for(const listener of this.listeners)listener();}
  stop(){
    this.generation++;this.cancel(this.timer);this.timer=null;
    this.audio.onloadedmetadata=null;this.audio.onended=null;this.audio.ontimeupdate=null;this.audio.onerror=null;
    this.audio.pause();this.emit({playing:false,loading:false});
  }
  clear(key){if(this.key!==key)return;this.stop();this.key=null;this.plan=[];}
  setPlan(plan,key,loop=false,autoplay=true){
    if(this.key===key)return;
    this.stop();this.key=key;this.plan=plan;this.loop=loop;this.index=0;this.paused=!autoplay;this.ended=false;this.prepared=false;
    this.emit({failed:false,blocked:false,language:plan[0]?.language||null});
    if(plan.length&&autoplay)this.playIndex(0);
  }
  playIndex(index){
    const item=this.plan[index];if(!item)return;
    const token=++this.generation;this.cancel(this.timer);this.timer=null;this.audio.pause();
    this.prepared=true;this.index=index;this.ended=false;this.finishing=false;
    const clip=typeof item.clip==='string'?{src:item.clip}:item.clip;
    this.emit({playing:false,loading:true,failed:false,blocked:false,language:item.language});
    const finish=()=>{
      if(token!==this.generation||this.finishing||this.paused)return;
      this.finishing=true;this.audio.pause();this.emit({playing:false,loading:false});
      if(index+1<this.plan.length||this.loop){
        this.timer=this.schedule(()=>{if(token===this.generation&&!this.paused)this.playIndex((index+1)%this.plan.length);},1500);
      }else this.ended=true;
    };
    this.audio.onended=finish;
    this.audio.ontimeupdate=()=>{if(clip.end!=null&&this.audio.currentTime>=clip.end-.04)finish();};
    this.audio.onerror=()=>{if(token===this.generation)this.emit({playing:false,loading:false,failed:true});};
    this.audio.onloadedmetadata=()=>{
      if(token!==this.generation)return;
      this.audio.currentTime=clip.start||0;
      if(!this.paused)this.playCurrent(token);
    };
    this.audio.preload='auto';this.audio.src=clip.src;this.audio.load();
  }
  async playCurrent(token=this.generation){
    try{await this.audio.play();if(token===this.generation&&!this.paused)this.emit({playing:true,loading:false,failed:false,blocked:false});}
    catch(error){if(token===this.generation)this.emit({playing:false,loading:false,blocked:error?.name==='NotAllowedError',failed:error?.name!=='NotAllowedError'});}
  }
  pause(){this.paused=true;this.cancel(this.timer);this.timer=null;this.audio.pause();this.emit({playing:false,loading:false});}
  resume(){
    this.paused=false;
    if(!this.plan.length)return;
    if(!this.prepared){this.playIndex(0);return;}
    if(this.ended){this.playIndex(0);return;}
    if(this.finishing){this.playIndex((this.index+1)%this.plan.length);return;}
    if(this.audio.readyState>=1)this.playCurrent();
    else this.playIndex(this.index);
  }
  replay(){if(!this.plan.length)return;this.paused=false;this.playIndex(this.index);}
  toggle(){if(this.state.playing||this.state.loading)this.pause();else this.resume();}
}
let narrator;
export function getKioskNarrator(){return narrator||(narrator=new KioskNarrator());}
