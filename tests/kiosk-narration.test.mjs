import test from 'node:test';
import assert from 'node:assert/strict';
import {KioskNarrator} from '../src/utils/kioskNarrator.js';
class AudioDouble{
  readyState=1;currentTime=0;plays=[];paused=true;
  load(){this.currentTime=0;this.onloadedmetadata?.();}
  async play(){this.paused=false;this.plays.push({src:this.src,time:this.currentTime});}
  pause(){this.paused=true;}
}
function setup(){const audio=new AudioDouble(),timers=new Map();let id=0;const narrator=new KioskNarrator({createAudio:()=>audio,schedule:fn=>{timers.set(++id,fn);return id;},cancel:key=>timers.delete(key)});return {audio,narrator,timers};}
const flush=()=>Promise.resolve();
test('welcome cycles languages, then selection cancels the cycle and starts only the selected step',async()=>{
 const {audio,narrator,timers}=setup();
 narrator.setPlan([{language:'ar',clip:'/ar.mp3'},{language:'en',clip:'/en.mp3'}],'welcome',true);await flush();
 assert.equal(narrator.state.language,'ar');audio.onended();const next=[...timers.values()][0];next();await flush();assert.equal(narrator.state.language,'en');
 const stale=audio.onended;narrator.setPlan([{language:'fr',clip:{src:'/fr-steps.mp3',start:8,end:16}}],'fr-menu');await flush();stale();
 assert.equal(narrator.state.language,'fr');assert.equal(audio.src,'/fr-steps.mp3');assert.equal(audio.currentTime,8);assert.equal(timers.size,0);
});
test('a later screen uses its own segment and does not replay welcome',async()=>{
 const {audio,narrator}=setup();narrator.setPlan([{language:'ur',clip:'/ur.mp3'}],'ur-welcome');await flush();
 narrator.setPlan([{language:'ur',clip:{src:'/ur-steps.mp3',start:14,end:21}}],'ur-review');await flush();
 assert.deepEqual(audio.plays.at(-1),{src:'/ur-steps.mp3',time:14});audio.currentTime=20.98;audio.ontimeupdate();assert.equal(audio.paused,true);assert.equal(narrator.ended,true);
});
test('pause and resume keep the place in the current instruction',async()=>{
 const {audio,narrator}=setup();narrator.setPlan([{language:'ar',clip:{src:'/ar-steps.mp3',start:5,end:15}}],'ar-identity');await flush();audio.currentTime=9.5;
 narrator.toggle();assert.equal(audio.paused,true);narrator.toggle();await flush();assert.equal(audio.currentTime,9.5);assert.equal(audio.plays.at(-1).time,9.5);
});
test('late metadata from an old page cannot start its narration after navigation',async()=>{
 const {audio,narrator}=setup();audio.load=()=>{};narrator.setPlan([{language:'en',clip:'/welcome.mp3'}],'welcome');const oldReady=audio.onloadedmetadata;
 narrator.setPlan([{language:'en',clip:{src:'/steps.mp3',start:20,end:25}}],'tracking');oldReady();assert.equal(audio.plays.length,0);audio.onloadedmetadata();await flush();assert.equal(audio.plays.length,1);assert.equal(audio.plays[0].time,20);
});
test('blocked autoplay is recoverable with the explicit listening action',async()=>{
 const {audio,narrator}=setup();audio.play=async()=>{throw Object.assign(new Error('gesture required'),{name:'NotAllowedError'});};narrator.setPlan([{language:'en',clip:'/en.mp3'}],'welcome');await flush();assert.equal(narrator.state.blocked,true);assert.equal(narrator.state.failed,false);
 audio.play=AudioDouble.prototype.play;narrator.resume();await flush();assert.equal(narrator.state.playing,true);
});

test('all kiosk languages ship local audio and distinct instructions for every public step',async()=>{
 const {readFileSync,existsSync}=await import('node:fs');
 const {kioskLanguages}=await import('../src/i18n/kioskLocales.js');
 const root=new URL('../public/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('audio/kiosk/index.json',root),'utf8'));
 const phases=['welcome','menu','assistance','identity-qr','identity-manual','identity-review','report-tracking','places'];
 for(const {code} of kioskLanguages){
   for(const phase of phases){const clip=manifest[code]?.[phase];assert.ok(clip,`${code}: ${phase}`);const url=typeof clip==='string'?clip:clip.src;assert.match(url,/^\/audio\/kiosk\//);assert.ok(existsSync(new URL(url.slice(1),root)),`${code}: missing ${url}`);if(typeof clip==='object'){assert.ok(clip.end>clip.start);assert.ok(clip.text?.length>10);}}
   assert.notEqual(manifest[code]['identity-qr'].start,manifest[code]['identity-manual'].start);
   assert.notEqual(manifest[code]['identity-qr'].text,manifest[code]['identity-manual'].text);
 }
});

test('press-to-listen stays silent on navigation and starts only the new page on demand',async()=>{
 const {audio,narrator}=setup();
 narrator.setPlan([{language:'ar',clip:{src:'/ar-steps.mp3',start:5,end:12}}],'manual',false,false);
 await flush();assert.equal(audio.plays.length,0);assert.equal(narrator.state.playing,false);
 narrator.toggle();await flush();assert.deepEqual(audio.plays.at(-1),{src:'/ar-steps.mp3',time:5});
 narrator.setPlan([{language:'ar',clip:{src:'/ar-steps.mp3',start:30,end:38}}],'tracking',false,false);
 await flush();assert.equal(audio.paused,true);assert.equal(audio.plays.length,1);
 narrator.toggle();await flush();assert.deepEqual(audio.plays.at(-1),{src:'/ar-steps.mp3',time:30});
});

test('replay restarts the current instruction from its own start',async()=>{
 const {audio,narrator}=setup();
 narrator.setPlan([{language:'ur',clip:{src:'/ur-steps.mp3',start:20,end:30}}],'ur-menu');await flush();
 audio.currentTime=26;narrator.replay();await flush();
 assert.deepEqual(audio.plays.at(-1),{src:'/ur-steps.mp3',time:20});
 assert.equal(narrator.state.playing,true);
});
