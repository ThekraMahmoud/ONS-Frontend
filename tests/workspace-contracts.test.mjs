import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, setApiCredentials, clearApiCredentials } from '../src/services/apiClient.js';
import { getAssistanceReportById, startFieldReport, resolveFieldReport } from '../src/services/assistanceReportService.js';
import { addAccommodation, updateAccommodation, deleteAccommodation } from '../src/services/accommodationService.js';
import { presentApiError } from '../src/utils/errorMessages.js';
import { reportLocation, reportMapLink, reportDate } from '../src/utils/workspacePresentation.js';
const requests = [];
const originalFetch = globalThis.fetch;
test.after(() => { globalThis.fetch = originalFetch; clearApiCredentials(); });
test('field report workflow uses protected GET and POST contracts with current Basic credentials', async () => {
 globalThis.fetch = async (path, options) => { requests.push({path,options}); return new Response(JSON.stringify({reportId:12,status:'ASSIGNED'}),{status:200}); };
 setApiCredentials('fixture@example.invalid','test-only');
 await getAssistanceReportById(12); await startFieldReport(12); await resolveFieldReport(12);
 assert.deepEqual(requests.map(({path,options})=>[path,options.method]),[['/report/get/12','GET'],['/api/v1/reports/12/start','POST'],['/api/v1/reports/12/resolve','POST']]);
 for(const {options} of requests) { assert.equal(options.credentials,'include'); assert.match(options.headers.Authorization,/^Basic /); }
 clearApiCredentials();
});
test('invalid report identifiers never send requests', async () => {
 const before=requests.length;
 for(const id of [null,undefined,'',0,-1,'bad','1/resolve',1.2]) assert.throws(()=>startFieldReport(id));
 assert.equal(requests.length,before);
});
test('401, 403, 404 and 500 preserve rejection and produce safe Arabic UI messages', async () => {
 for(const status of [401,403,404,500]) {
  globalThis.fetch = async ()=>new Response(JSON.stringify({message:'java.sql.Exception /api/private localhost'}),{status});
  await assert.rejects(apiRequest('/test'),failure=>{
   assert.equal(failure.status,status); const {message}=presentApiError(failure,'تعذر إكمال العملية.');
   assert.match(message,/[\u0600-\u06ff]/); assert.doesNotMatch(message,/java|sql|localhost|\/api\//i); return true;
  });
 }
});
test('network errors stay rejected and do not appear as success', async () => {
 globalThis.fetch = async ()=>{throw new TypeError('network');};
 await assert.rejects(apiRequest('/test'));
});
test('owner accommodation CRUD sends actual body and backend methods', async () => {
 const seen=[];globalThis.fetch=async(path,options)=>{seen.push({path,options});return new Response('{}',{status:200});};
 const body={name:'Fixture',address:'Fixture address',city:'Makkah',status:'ACTIVE',latitude:21.4,longitude:39.8};
 await addAccommodation(body);await updateAccommodation(8,body);await deleteAccommodation(8);
 assert.deepEqual(seen.map(x=>[x.path,x.options.method]),[['/api/v1/accommodations/add','POST'],['/api/v1/accommodations/update/8','PUT'],['/api/v1/accommodations/delete/8','DELETE']]);
 assert.deepEqual(JSON.parse(seen[0].options.body),body);
});
test('map links require valid actual coordinates and presentation does not mutate reports',()=>{
 assert.equal(reportMapLink(null),null);assert.equal(reportMapLink({kiosk:{latitude:91,longitude:39}}),null);assert.equal(reportMapLink({kiosk:{latitude:null,longitude:null}}),null);
 const report={kiosk:{locationName:'مكة (تجريبي)',latitude:21.42,longitude:39.82}};const before=JSON.stringify(report);
 assert.equal(reportLocation(report),'مكة');const url=new URL(reportMapLink(report));assert.equal(url.searchParams.get('destination'),'21.42,39.82');assert.equal(url.searchParams.get('travelmode'),'walking');assert.equal(JSON.stringify(report),before);assert.equal(reportDate(null),'غير مسجل');
});
test('login identifies roles from permitted backend responses, not a client role selector', async () => {
 const {login,getCurrentUser,logout}=await import('../src/auth/auth.js');
 for(const expected of ['ADMIN','CAMPAIGN_OWNER','SUPERVISOR','REPRESENTATIVE','FIELD_STAFF']) {
  globalThis.fetch=async(path)=>{
   let status=200,body={};
   if(path==='/api/v1/dashboard/summary' && expected!=='ADMIN') status=403;
   if(path==='/api/v1/campaigns/me') {
    if(expected==='FIELD_STAFF') status=403;
    else body={id:2,user:{email:expected==='CAMPAIGN_OWNER'?'fixture@example.invalid':'owner@example.invalid',name:'Fixture owner'}};
   }
   if(path==='/api/v1/authorized-staff/get/employees') {
    if(expected==='REPRESENTATIVE'){status=400;body={message:'you are not authorized'};}else body=[];
   }
   return new Response(JSON.stringify(body),{status});
  };
  const user=await login('fixture@example.invalid','test-only');assert.equal(user.role,expected);assert.equal(getCurrentUser().role,expected);await logout();assert.equal(getCurrentUser(),null);
 }
});
test('401 during login stops role probing and clears the account', async()=>{
 const {login,getCurrentUser}=await import('../src/auth/auth.js');let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('{}',{status:401});};
 await assert.rejects(login('fixture@example.invalid','test-only'),error=>{assert.equal(error.status,401);assert.doesNotMatch(error.message,/401|خادم|HTTP/);assert.match(error.message,/البريد الإلكتروني/);return true;});assert.equal(calls,1);assert.equal(getCurrentUser(),null);
});

test('card creation omits manual IDs and preserves card fields and pilgrim reference', async () => {
 const {addPilgrimCard}=await import('../src/services/pilgrimCardService.js');let call;
 globalThis.fetch=async(path,options)=>{call={path,options};return new Response('{"message":"created"}',{status:200});};
 const card={Id:9,cardNumber:'CARD-TEST-9',cardType:'NUSUK',status:'INACTIVE',imageReference:'test-card.jpg'};
 await addPilgrimCard(20,card);assert.equal(call.path,'/api/v1/pilgrim-cards/add?pilgrimId=20');assert.equal(call.options.method,'POST');const expected={...card};delete expected.Id;assert.deepEqual(JSON.parse(call.options.body),expected);assert.equal(Object.hasOwn(JSON.parse(call.options.body),'id'),false);
 globalThis.fetch=async()=>new Response('{"message":"This pilgrim already has a card"}',{status:400});
 await assert.rejects(addPilgrimCard(20,card),error=>error.status===400);
});
test('card lookup distinguishes an existing card from confirmed absence', async () => {
 const {getPilgrimCardForPilgrim}=await import('../src/services/pilgrimCardService.js');
 for(const hasCard of [true,false]) {
  globalThis.fetch=async(path,options)=>{assert.equal(path,'/api/v1/pilgrim-cards/pilgrim/20');assert.equal(options.method,'GET');return new Response(JSON.stringify({pilgrimId:20,hasCard,card:hasCard?{id:9,cardNumber:'CARD-TEST-9',cardType:'NUSUK',status:'EXPIRED',imageReference:null}:null}),{status:200});};
  const response=await getPilgrimCardForPilgrim(20);assert.equal(response.hasCard,hasCard);if(!hasCard)assert.equal(response.card,null);else assert.equal(response.card.status,'EXPIRED');
 }
});
