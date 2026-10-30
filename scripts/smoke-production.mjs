// Read-only Production smoke. Tests actual Vercel API and finalized GenLayer state.
const BASE='https://rightrail.vercel.app';
const RIGHTS='0xef37288aB08A30697841C4fFe93C1D71E23C464b',GATE='0xCA57aF8cEe6d83029700A859cBaf93506839364E',ACTOR='0x4C7cb73aC8F8999af21cfc9fF4cF2333a9508Dcb';
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function get(path){
 const response=await fetch(BASE+path,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});
 const json=await response.json();
 return {status:response.status,json};
}
const parse=v=>typeof v==='string'?JSON.parse(v):v;
let good=false;
for(let attempt=0;attempt<16;attempt++){
 try{
  const c=await get('/api/state?op=config');
  const body=c.json;
  if(c.status!==200||!body?.ok||!body.configured||!body.studionetVerified||body.chainId!==61999||
     body.rights?.toLowerCase()!==RIGHTS.toLowerCase()||body.gate?.toLowerCase()!==GATE.toLowerCase())
    throw Error('Production not ready or config invalid: '+JSON.stringify(c));
  const total=await get('/api/state?op=totals');
  if(total.status!==200||!total.json?.ok)throw Error('Totals unavailable: '+JSON.stringify(total));
  const rights=parse(total.json.value.rights),gate=parse(total.json.value.gate);
  if(!Number.isSafeInteger(rights.assets)||!Number.isSafeInteger(rights.requests)||!Number.isSafeInteger(gate.receipts)||
     gate.rights_address?.toLowerCase()!==RIGHTS.toLowerCase())throw Error('Invalid finalized totals '+JSON.stringify({rights,gate}));
  const id=await get('/api/state?op=hasReceipt&id=1&actor='+ACTOR);
  if(id.status!==200||id.json?.ok!==true||typeof id.json.value!=='boolean')throw Error('Valid positive ID read failed: '+JSON.stringify(id));
  const invalid=await get('/api/state?op=hasReceipt&id=01&actor='+ACTOR);
  if(invalid.status!==400||invalid.json?.ok!==false)throw Error('Noncanonical ID accepted: '+JSON.stringify(invalid));
  const unsafe=await get('/api/state?op=hasReceipt&id=1e3&actor='+ACTOR);
  if(unsafe.status!==400||unsafe.json?.ok!==false)throw Error('Scientific ID accepted: '+JSON.stringify(unsafe));
  console.log('PRODUCTION_SMOKE_PASS '+JSON.stringify({url:BASE,chainId:61999,configured:true,rights:RIGHTS,gate:GATE,totals:{rights,gate},validIdStatus:id.status,invalidIdStatus:invalid.status}));
  good=true;break;
 }catch(e){
   console.log('attempt '+(attempt+1)+' /16: '+String(e?.message||e).slice(0,400));
   if(attempt<15)await sleep(12000);
 }
}
if(!good){console.error('PRODUCTION_SMOKE_FAILED after retries');process.exitCode=1;}
