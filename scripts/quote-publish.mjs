// Unsigned preflight of the REAL deployed RightsRail publish method.
// Does not call writeContract, cannot consume GEN or sign.
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
const client=createClient({chain:studionet});
const address='0xef37288aB08A30697841C4fFe93C1D71E23C464b';
const title='Aurora Education Pack';
const digest='2d136099dbe0ae1d822d94716b235b43d026ca70a49812cc25b89dfbe6663b7f';
const policy='Free, non-commercial educational tutorials may use Aurora Education Pack content if the original creator is clearly credited with a visible link. Paid advertising, resale, and AI-model training are explicitly prohibited. Sponsored educational content requires separate manual approval. Any unclear or incomplete use must remain under review.';
const intent={address,functionName:'publish_asset',args:[title,digest,policy],value:0n};
console.log('PREVIEW_START '+JSON.stringify({address,functionName:intent.functionName,chainId:61999,title,digest}));
try{
 const estimate=await client.estimateTransactionFeesForWrite(intent);
 const safe=JSON.parse(JSON.stringify(estimate,(_,v)=>typeof v==='bigint'?String(v):v));
 console.log('PUBLISH_FEE_ESTIMATE_PASS '+JSON.stringify(safe).slice(0,1800));
}catch(e){
 console.log('PUBLISH_FEE_ESTIMATE_BLOCKED '+String(e?.message||e).slice(0,2000));
 // Fee quoting isn't supported on every stable Studio SDK path; do not claim signed readiness.
 process.exitCode=1;
}
