import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const GATE='0xfaf2E73666CBBa767790c0Dc84BB838446b23Df3';
const RIGHTS='0xef37288aB08A30697841C4fFe93C1D71E23C464b';
const client=createClient({chain:studionet});
const normalize=s=>s.replace(/\r\n/g,'\n').trimEnd();
const sha=s=>createHash('sha256').update(s).digest('hex');
const read=(address,functionName,args=[])=>client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
const parse=x=>typeof x==='string'?JSON.parse(x):x;
const response=await fetch('https://studio.genlayer.com/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}),signal:AbortSignal.timeout(10000)});
const rpc=await response.json();
if(!response.ok||rpc.error||parseInt(rpc.result,16)!==61999)throw Error('Wrong network');
for(const [address,file,required] of [[GATE,'contracts/scoped_rights_gate.py',['issue_grant','revoke_grant','consume_access','get_grant','grant_for_request','get_receipt','receipt_for_challenge','can_consume','can_deliver','stats']],[RIGHTS,'contracts/rights_rail.py',['publish_asset','adjudicate','permit_status','get_asset','totals']]]){
 const code=await client.getContractCode(address), local=await readFile(new URL('../'+file,import.meta.url),'utf8');
 if(typeof code!=='string'||normalize(code)!==normalize(local))throw Error('SOURCE_MISMATCH '+address);
 const schema=await client.getContractSchema(address);
 const methods=Object.keys(schema?.methods??{});
 if(required.some(m=>!methods.includes(m)))throw Error('SCHEMA_MISMATCH '+address);
 console.log(JSON.stringify({address,file,exactBytesMatch:code===local,normalizedMatch:true,liveSha256:sha(code),repoSha256:sha(local),methods}));
}
const stats=parse(await read(GATE,'stats')),totals=parse(await read(RIGHTS,'totals'));
if(String(stats.rights_address).toLowerCase()!==RIGHTS.toLowerCase()||!Number.isSafeInteger(stats.grants)||!Number.isSafeInteger(stats.receipts)||!Number.isSafeInteger(totals.assets)||!Number.isSafeInteger(totals.requests))throw Error('STATE_OR_CONSTRUCTOR_MISMATCH');
console.log('V2_LIVE_VERIFIED '+JSON.stringify({chainId:61999,gate:GATE,rights:RIGHTS,stats,totals,latestFinal:true}));

// Read-only regression proof for the real Grant #1 lifecycle, not a simulated receipt.
const g1=parse(await read(GATE,'get_grant',[1])),r1=parse(await read(GATE,'get_receipt',[1]));
const allowed=await read(GATE,'can_consume',[1,g1.actor]),deliverable=await read(GATE,'can_deliver',[1,g1.actor]);
if(g1.request_id!==5||g1.asset_id!==4||g1.revoked!==true||g1.used!==1||g1.max_uses!==2||r1.grant_id!==1||r1.use_number!==1||allowed!==false||deliverable!==false)throw Error('LIVE_GRANT_ONE_REVOCATION_MISMATCH');
console.log('LIVE_GRANT_ONE_REVOCATION_VERIFIED '+JSON.stringify({grant:g1,receipt:r1,canConsume:allowed,canDeliver:deliverable}));
