import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
const client=createClient({chain:studionet});
const hashes=['0x6179779f9be2c075f822ec75184cf41b6956167c7cf11914cbddbacc1bddf17c','0xfed129afd192ce482a4b7d7f84a2f0a788a6b5305fd82f6bb7edfece1eb4d499'];
const safe=x=>JSON.stringify(x,(_,v)=>typeof v==='bigint'?String(v):v)?.slice(0,12000);
for(const hash of hashes){
  try {console.log('SDK',hash,safe(await client.getTransaction({hash})));}catch(e){console.log('SDK_ERROR',hash,e.message);}
  for(const [method,params] of [['eth_getTransactionByHash',[hash]],['gen_getTransactionByHash',[hash]],['gen_getTransactionStatus',[{txId:hash}]],['gen_getTransactionReceipt',[{txId:hash}]]]){
    try{const r=await fetch('https://studio.genlayer.com/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method,params,id:1}),signal:AbortSignal.timeout(10000)});console.log('RPC',hash,method,r.status,safe(await r.json()));}catch(e){console.log('RPC_ERROR',hash,method,e.message);}
  }
}
