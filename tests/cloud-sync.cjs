const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=fs.readFileSync(__dirname+'/../app/core.js','utf8'),start=file.indexOf('/* Server snapshots'),end=file.indexOf('/* ════════════════════ 구글 로그인',start);
const runtime=fs.readFileSync(__dirname+'/../app.js','utf8');for(const path of ['app/core.js','app/main/state.js'])assert.ok(runtime.includes(fs.readFileSync(__dirname+'/../'+path,'utf8').trim()),'Runtime/source mismatch: '+path);
const copy=x=>JSON.parse(JSON.stringify(x));let server={data:{individuals:[{id:'v',code:'01',sex:'M',bottleRecords:[{id:'r',weight:'0',photo:'keep'}]}],lines:[],parents:[],feedBrands:[]},updated_at:'1'},casRace=false,writes=0;
const sb={SUPABASE_URL:'https://example.com',idbSet:async()=>{},cloudFetch:async(key,url,opts)=>{
 if(opts.method==='GET')return{ok:true,json:async()=>server?[copy(server)]:[]};
 if(opts.method==='PATCH'){
   if(casRace){server.data.individuals[0].remote='race';server.updated_at='race';casRace=false;return{ok:true,json:async()=>[]};}
   const version=new URL(url).searchParams.get('updated_at').slice(3);if(version!==server.updated_at)return{ok:true,json:async()=>[]};
   writes++;server={...JSON.parse(opts.body),updated_at:String(writes+1)};return{ok:true,json:async()=>[copy(server)]};
 }
 throw Error('Unexpected method '+opts.method);
}};
vm.runInNewContext(file.slice(start,end)+'\nglobalThis.api={mergeCloudData,cloudUpload,cloudDownload,rememberCloudSnapshot};',sb);const a=sb.api;
(async()=>{
 const baseline=(await a.cloudDownload('user:test')).data;
 server.data.individuals[0].bottleRecords[0].weight='22.5';server.updated_at='remote';
 const local=copy(baseline);local.individuals[0].code='02';casRace=true;
 const merged=await a.cloudUpload('user:test',local);assert.equal(merged.individuals[0].code,'02');assert.equal(merged.individuals[0].bottleRecords[0].weight,'22.5');assert.equal(merged.individuals[0].bottleRecords[0].photo,'keep');assert.equal(merged.individuals[0].remote,'race');
 const other=copy(merged);other.individuals[0].bottleRecords[0].weight='30';server.data.individuals[0].bottleRecords[0].weight='28';server.updated_at='newer';const before=JSON.stringify(server),oldWrites=writes;
 await assert.rejects(a.cloudUpload('user:test',other),/같은 항목/);assert.equal(JSON.stringify(server),before);assert.equal(writes,oldWrites);
 const b={individuals:[{id:'a',weight:'0'},{id:'b',weight:'20'}],feedBrands:['A']};const l=copy(b),r=copy(b);l.individuals.splice(0,1);r.individuals[1].weight='21';r.feedBrands.push('B');
 const m=a.mergeCloudData(b,l,r);assert.equal(m.individuals.length,1);assert.equal(m.individuals[0].weight,'21');assert.ok(m.feedBrands.includes('B'));
 assert.throws(()=>a.mergeCloudData(b,{...b,individuals:[]},{...b,individuals:[{id:'a',weight:'1'},b.individuals[1]]}),/같은 항목/);
 const beforeUnknown=JSON.stringify(server);await assert.rejects(a.cloudUpload('new-key',local),/먼저/);assert.equal(JSON.stringify(server),beforeUnknown);
 console.log('PASS: cloud baseline merge, distinct-field preservation, CAS retry, same-field conflict, deletions, metadata and unknown-baseline protection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
