import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
const c=createClient({chain:studionet}),r='0xef37288aB08A30697841C4fFe93C1D71E23C464b',g='0xCA57aF8cEe6d83029700A859cBaf93506839364E',a='0xd6b8a3a5eb329410d9504784812b8569afa8c2af';
const rd=(address,functionName,args=[])=>c.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
const [asset,req,permit,gate,receipt,has]=await Promise.all([rd(r,'get_asset',[1]),rd(r,'get_request',[1]),rd(r,'permit_status',[1,a]),rd(g,'can_access',[1,a]),rd(g,'receipt_for',[1,a]),rd(g,'has_access_receipt',[1,a])]);
const obj=x=>typeof x==='string'?JSON.parse(x):x;
const s={asset:obj(asset),request:obj(req),permit,gate,receipt:obj(receipt),has};
console.log('REVOCATION_READBACK '+JSON.stringify(s));
if(s.asset.version!==2||s.request.decision!=='PERMIT'||s.request.policy_version!==1||permit!==false||gate!==false||has!==false||s.receipt.id!==1)throw Error('Revocation invariant failed');
console.log('REVOCATION_PASS');

const api=async(op)=>{
 const u=new URL('https://rightrail.vercel.app/api/state');
 u.searchParams.set('op',op);
 u.searchParams.set('id','1');
 u.searchParams.set('actor',a);
 const response=await fetch(u);
 const body=await response.json();
 if(response.status!==200||body.ok!==true)throw Error(op+' API failure');
 return obj(body.value);
};
const [assetLive,requestLive,permitLive,gateLive,receiptLive,hasLive]=await Promise.all(
 ['asset','request','permit','gate','receipt','hasReceipt'].map(api));
const result={assetVersion:assetLive.version,oldDecision:requestLive.decision,oldPolicyVersion:requestLive.policy_version,
 permit:permitLive,gate:gateLive,receiptId:receiptLive.id,hasReceipt:hasLive};
console.log('PRODUCTION_REVOCATION '+JSON.stringify(result));
if(assetLive.version!==2||requestLive.decision!=='PERMIT'||requestLive.policy_version!==1||
 permitLive!==false||gateLive!==false||receiptLive.id!==1||hasLive!==false)throw Error('Production gate mismatch');
console.log('PRODUCTION_PASS');
