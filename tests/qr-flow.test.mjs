import test from 'node:test';
import assert from 'node:assert/strict';
import {readPilgrimQr} from '../src/utils/pilgrimQr.js';
import {savePilgrimRegistration} from '../src/services/pilgrimRegistrationService.js';
const originalFetch=globalThis.fetch;
test.after(()=>{globalThis.fetch=originalFetch;});
const pilgrim={fullName:'حاج للاختبار',nationality:'مصر',phoneNumber:'0500000000',visaNumber:'FIXTURE-VISA'};
const card={cardNumber:'447050104407759',cardType:'NUSUK',status:'ACTIVE',imageReference:'fixture.jpg'};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
test('structured QR fills real personal and card fields without importing identity or permissions',()=>{
 const parsed=readPilgrimQr(JSON.stringify({data:{...pilgrim,id:99,campaignId:90,role:'ADMIN',card:{...card,id:7}}}));
 assert.deepEqual(parsed.draft,pilgrim);assert.deepEqual(parsed.card,card);assert.deepEqual(parsed.missingFields,[]);
});
test('Arabic QR labels and digits are normalized; passport never becomes a visa',()=>{
 const parsed=readPilgrimQr(JSON.stringify({'الاسم':'حاج','الجنسية':'مصر','رقم الجوال':'٠٥٠٠٠٠٠٠٠٠',passport:'A35425754',HID:'٤٤٧٠٥٠١٠٤٤٠٧٧٥٩',status:'EXPIRED'}));
 assert.equal(parsed.draft.phoneNumber,'0500000000');assert.equal(parsed.card.cardNumber,card.cardNumber);assert.equal(parsed.card.status,'EXPIRED');assert.equal(parsed.draft.visaNumber,undefined);assert.deepEqual(parsed.missingFields,['visaNumber']);
});
test('HID-only QR preserves the card but honestly reports missing personal data',()=>{
 const parsed=readPilgrimQr(card.cardNumber);assert.equal(parsed.hasDetails,false);assert.equal(parsed.card.cardNumber,card.cardNumber);assert.equal(parsed.missingFields.length,4);
});
test('nested strings are parsed but overlength fields are rejected',()=>{
 assert.equal(readPilgrimQr(JSON.stringify({data:JSON.stringify(pilgrim)})).draft.fullName,pilgrim.fullName);
 assert.throws(()=>readPilgrimQr(JSON.stringify({data:JSON.stringify({fullName:'x'.repeat(121)})})));
});
test('registration creates pilgrim then links the card to its actual scoped saved ID',async()=>{
 const calls=[];globalThis.fetch=async(path,options)=>{calls.push([path,options]);return response(path==='/api/v1/pilgrims/get'?[{...pilgrim,id:42}]:path.endsWith('/pilgrim/42')?{hasCard:false,card:null}:{});};
 const done=await savePilgrimRegistration({pilgrim,card});assert.equal(done.cardSaved,true);assert.equal(done.pilgrimId,42);
 assert.deepEqual(calls.map(([p,o])=>[p,o.method]),[['/api/v1/pilgrims/add','POST'],['/api/v1/pilgrims/get','GET'],['/api/v1/pilgrim-cards/pilgrim/42','GET'],['/api/v1/pilgrim-cards/add?pilgrimId=42','POST']]);assert.deepEqual(JSON.parse(calls[3][1].body),card);
});
test('card request failure retains checkpoint; retry never inserts pilgrim twice',async()=>{
 let checkpoint;let creates=0;let cardCreates=0;
 globalThis.fetch=async(path)=>{if(path==='/api/v1/pilgrims/add')creates++;if(path==='/api/v1/pilgrims/get')return response([{...pilgrim,id:42}]);if(path.endsWith('/pilgrim/42'))return response({hasCard:false});if(path.includes('/pilgrim-cards/add')){cardCreates++;if(cardCreates===1)return response({message:'temporary failure'},500);}return response({});};
 await assert.rejects(savePilgrimRegistration({pilgrim,card,onCheckpoint:value=>{checkpoint=value;}}));assert.equal(checkpoint.pilgrimSaved,true);
 const done=await savePilgrimRegistration({pilgrim,card,checkpoint});assert.equal(creates,1);assert.equal(cardCreates,2);assert.equal(done.cardSaved,true);
});
test('existing different card never gets overwritten',async()=>{
 let writes=0;globalThis.fetch=async(path,options)=>{if(options.method!=='GET')writes++;return response({hasCard:true,card:{cardNumber:'OTHER'}});};
 await assert.rejects(savePilgrimRegistration({pilgrim,card,checkpoint:{pilgrimSaved:true,pilgrimId:42,visaNumber:pilgrim.visaNumber}}));assert.equal(writes,0);
});
test('failed pilgrim creation cannot create a card or publish a saved checkpoint',async()=>{
 let calls=0;let checkpoint;globalThis.fetch=async()=>{calls++;return response({message:'failure'},400);};
 await assert.rejects(savePilgrimRegistration({pilgrim,card,onCheckpoint:value=>{checkpoint=value;}}));assert.equal(calls,1);assert.equal(checkpoint,undefined);
});
test('missing saved ID stops card linking rather than guessing a pilgrim ID',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return response([]);};
 await assert.rejects(savePilgrimRegistration({pilgrim,card,checkpoint:{pilgrimSaved:true,visaNumber:pilgrim.visaNumber}}));assert.equal(calls,1);
});
