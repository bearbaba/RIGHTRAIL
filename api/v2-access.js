import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
import {verifyV2Proof,authorizeDelivery,sha256} from '../lib/v2-delivery.js';

const RPC='https://studio.genlayer.com/api';
const addr=v=>typeof v==='string'&&/^0x[0-9a-f]{40}$/.test(v);
const parse=x=>typeof x==='string'?JSON.parse(x):x;
const gate=(process.env.RIGHTRAIL_V2_GATE_ADDRESS||'').toLowerCase();
const rights=(process.env.RIGHTRAIL_RIGHTS_ADDRESS||'').toLowerCase();
const host=process.env.RIGHTRAIL_V2_HOST||'';
// Accept standard Upstash integration variables only as a paired fallback.
const redisPairs=[
  [process.env.RIGHTRAIL_V2_REDIS_URL,process.env.RIGHTRAIL_V2_REDIS_TOKEN],
  [process.env.KV_REST_API_URL,process.env.KV_REST_API_TOKEN],
  [process.env.UPSTASH_REDIS_REST_URL,process.env.UPSTASH_REDIS_REST_TOKEN]
];
const [redis,token]=redisPairs.find(([url,secret])=>url||secret)||['',''];
const storeConfigured=()=>/^https:\/\/[a-z0-9-]+\.upstash\.io\/?$/.test(redis)&&Boolean(token);

function contentMap(){
  const x=JSON.parse(process.env.RIGHTRAIL_V2_CONTENT_JSON||'{}');
  if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid content map');
  // V2 requires separate content so an old V1 endpoint cannot bypass V2 quota.
  const legacy=process.env.RIGHTRAIL_CONTENT_TEXT||'';
  for(const [id,value] of Object.entries(x)){
    if(!/^[1-9][0-9]{0,7}$/.test(id)||typeof value!=='string'||!value||
       (legacy&&sha256(value)===sha256(legacy)))throw Error('Invalid V2 content');
  }
  return x;
}
async function checkNetwork(){
  const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}),
    signal:AbortSignal.timeout(7000)});
  if(!r.ok)return false;
  const j=await r.json();
  return !j.error&&parseInt(j.result,16)===61999;
}
const client=createClient({chain:studionet});
const read=(address,functionName,args=[])=>client.readContract({
  address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
async function claim(key){
  const r=await fetch(redis,{method:'POST',headers:{
    authorization:'Bearer '+token,'content-type':'application/json'},
    body:JSON.stringify(['SET',key,'claimed','NX','EX',86400]),
    signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw Error('Claim store unavailable');
  const j=await r.json();
  if(j.error||!('result' in j))throw Error('Claim store unavailable');
  if(j.result==='OK')return true;
  if(j.result===null)return false;
  throw Error('Unexpected claim result');
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  const fail=(status,error)=>res.status(status).json({ok:false,error});
  if(!['GET','POST'].includes(req.method))return fail(405,'METHOD_NOT_ALLOWED');
  let content;
  try{
    content=contentMap();
    if(!addr(gate)||!addr(rights)||!host||req.headers.host!==host||
       !Object.keys(content).length)throw Error('Config missing');
    if(!await checkNetwork())throw Error('Wrong network');
    const stats=parse(await read(gate,'stats'));
    if(stats.rights_address!==rights)throw Error('Wrong rights deployment');
  }catch{return fail(503,'V2_NOT_READY');}
  if(req.method==='GET'){
    const assets=await Promise.all(Object.entries(content).map(async ([id,value])=>{
      const digest=sha256(value);
      try {
        const asset=parse(await read(rights,'get_asset',[Number(id)]));
        return {id:Number(id),digest,registered:asset?.id===Number(id),
          verified:asset?.id===Number(id)&&asset.active===true&&asset.content_sha256===digest};
      }catch{return {id:Number(id),digest,registered:false,verified:false};}
    }));
    const assetIds=assets.filter(x=>x.verified).map(x=>x.id);
    return res.status(200).json({ok:true,gate,rights,chainId:61999,assetIds,assets,
      storeConfigured:storeConfigured(),ready:storeConfigured()&&assetIds.length>0});
  }
  if(!storeConfigured())return fail(503,'DELIVERY_STORE_NOT_CONFIGURED');
  let proof;
  try{proof=await verifyV2Proof(req.body?.message,req.body?.signature,{host,gate});}
  catch{return fail(401,'INVALID_WALLET_PROOF');}
  try{
    const result=await authorizeDelivery({proof,gate,rights,read,claim,
      contentFor:id=>Object.hasOwn(content,String(id))?content[String(id)]:null});
    if(!result.ok)return fail(result.error==='DELIVERY_ALREADY_CLAIMED'?409:403,result.error);
    return res.status(200).json(result);
  }catch{return fail(503,'DELIVERY_VERIFICATION_UNAVAILABLE');}
}
