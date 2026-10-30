// Read-only verification of the first successful Gate write; no wallet or new transaction.
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
const TX='0x983633552f7ad4177f7f8745b9c63c4d33e2d5ea6f126fb81462a290205a60e5';
const RIGHTS='0xef37288aB08A30697841C4fFe93C1D71E23C464b';
const GATE='0xCA57aF8cEe6d83029700A859cBaf93506839364E';
const REQUESTER='0xd6b8a3a5eb329410d9504784812b8569afa8c2af';
const CREATOR='0x4C7cb73aC8F8999af21cfc9fF4cF2333a9508Dcb';
const KEY='aurora-edu-access-01';
const client=createClient({chain:studionet});
const read=(address,functionName,args=[])=>client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
const parse=x=>typeof x==='string'?JSON.parse(x):x;
const tx=await client.getTransaction({hash:TX});
if(!tx||tx.statusName!=='FINALIZED')throw Error('TX NOT FINALIZED');
if(String(tx.from_address||'').toLowerCase()!==REQUESTER)throw Error('WRONG TRANSACTION SIGNER');
if(String(tx.to_address||'').toLowerCase()!==GATE.toLowerCase())throw Error('WRONG CONTRACT DESTINATION');
const leader=tx.consensus_data?.leader_receipt||[];
const leaders=(Array.isArray(leader)?leader:[leader]).filter(Boolean).map(x=>String(x.execution_result||x.executionResult||'').toUpperCase());
if(leaders.length&&!leaders.every(x=>x==='SUCCESS'))throw Error('GENVM NOT SUCCESS: '+leaders);
const [receiptRaw,has,gateAllowed,creatorHas,creatorAllowed,requestRaw,statsRaw]=await Promise.all([
  read(GATE,'receipt_for',[1,REQUESTER]),
  read(GATE,'has_access_receipt',[1,REQUESTER]),
  read(GATE,'can_access',[1,REQUESTER]),
  read(GATE,'has_access_receipt',[1,CREATOR]),
  read(GATE,'can_access',[1,CREATOR]),
  read(RIGHTS,'get_request',[1]),
  read(GATE,'stats')
]);
const receipt=parse(receiptRaw), request=parse(requestRaw), stats=parse(statsRaw);
if(receipt.id!==1||receipt.request_id!==1||receipt.actor.toLowerCase()!==REQUESTER||receipt.action_key!==KEY)
  throw Error('RECEIPT CONTENT MISMATCH '+JSON.stringify(receipt));
if(request.decision!=='PERMIT'||request.requester.toLowerCase()!==REQUESTER||has!==true||gateAllowed!==true||creatorHas!==false||creatorAllowed!==false)
  throw Error('RIGHTS ENFORCEMENT MISMATCH '+JSON.stringify({request,has,gateAllowed,creatorHas,creatorAllowed}));
if(stats.receipts<1||String(stats.rights_address).toLowerCase()!==RIGHTS.toLowerCase())throw Error('BAD GATE STATS');
console.log('CHAIN_RECEIPT_VERIFIED '+JSON.stringify({tx:TX,status:tx.statusName,execution:leaders,receipt,requestDecision:request.decision,requesterHasCurrentReceipt:has,requesterAllowed:gateAllowed,creatorHasCurrentReceipt:creatorHas,creatorAllowed:creatorAllowed,latestFinal:true,stats}));
const query=async op=> {
 const u=new URL('https://rightrail.vercel.app/api/state');u.searchParams.set('op',op);u.searchParams.set('id','1');u.searchParams.set('actor',REQUESTER);
 const r=await fetch(u,{signal:AbortSignal.timeout(18000)});const body=await r.json();
 if(!r.ok||body.ok!==true)throw Error('PROD API '+op+': '+JSON.stringify(body));
 return body.value;
};
const [apiReceipt,apiHas,apiGate]=await Promise.all([query('receipt'),query('hasReceipt'),query('gate')]);
if(parse(apiReceipt)?.id!==1||apiHas!==true||apiGate!==true)throw Error('PRODUCTION API RECEIPT MISMATCH');
console.log('PRODUCTION_GATE_VERIFIED '+JSON.stringify({receipt:parse(apiReceipt),hasReceipt:apiHas,canAccess:apiGate}));
