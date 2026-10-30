// Read-only diagnostic: find exact reason why Studio cannot read Request #2.
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
const client=createClient({chain:studionet});
const RIGHTS='0xef37288aB08A30697841C4fFe93C1D71E23C464b';
const GATE='0xCA57aF8cEe6d83029700A859cBaf93506839364E';
const ACTOR='0xd6b8a3a5eb329410d9504784812b8569afa8c2af';
const read=(address,functionName,args=[])=>client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
const parse=v=>typeof v==='string'?JSON.parse(v):v;
const tasks=[
 ['onchain_totals',()=>read(RIGHTS,'totals').then(parse)],
 ['onchain_asset_1',()=>read(RIGHTS,'get_asset',[1]).then(parse)],
 ['onchain_request_1',()=>read(RIGHTS,'get_request',[1]).then(parse)],
 ['onchain_request_2',()=>read(RIGHTS,'get_request',[2]).then(parse)],
 ['onchain_gate_2',()=>read(GATE,'can_access',[2,ACTOR])],
 ['prod_totals',()=>fetch('https://rightrail.vercel.app/api/state?op=totals',{signal:AbortSignal.timeout(15000)}).then(async r=>({status:r.status,body:await r.json()}))],
 ['prod_request_2',()=>fetch('https://rightrail.vercel.app/api/state?op=request&id=2',{signal:AbortSignal.timeout(15000)}).then(async r=>({status:r.status,body:await r.json()}))],
];
const out={};
for(const [key,fn] of tasks){
 try{out[key]={ok:true,result:await fn()};}
 catch(e){out[key]={ok:false,error:String(e?.message||e).slice(0,420)};}
}
console.log('REQUEST_TWO_DIAGNOSTIC '+JSON.stringify(out));
const totals=out.onchain_totals?.result;
if(!totals)throw Error('No finalized totals; cannot establish Request #2 existence');
if(totals.requests < 2){
 console.log('CONCLUSION: Request #2 NOT CREATED in finalized state; can_access=false is not proof of a DENY adjudication. Sign request_usage again only after reviewing previous transaction status.');
} else if(out.onchain_request_2.ok){
 console.log('CONCLUSION: Request #2 DOES exist; status='+out.onchain_request_2.result.decision+'. If Studio read fails, use the website API or check Studio contract selection and exact method input.');
} else{
 console.log('CONCLUSION: Request #2 counter exists but direct get_request failed: investigate RPC or contract state error; do not re-sign blindly.');
}
