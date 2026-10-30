import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
const RPC='https://studio.genlayer.com/api';
const configuredRpc=process.env.RIGHTRAIL_NODE_RPC||RPC;
const RIGHTS=process.env.RIGHTRAIL_RIGHTS_ADDRESS||'',GATE=process.env.RIGHTRAIL_GATE_ADDRESS||'';
const addr=v=>/^0x[0-9a-fA-F]{40}$/.test(v||'');
import { validPositiveId } from '../lib/api-inputs.js';
const hash=v=>/^0x[0-9a-fA-F]{64}$/.test(v||'');
const ready=()=>configuredRpc===RPC&&addr(RIGHTS)&&addr(GATE);
const client=createClient({chain:studionet});
const read=(address,functionName,args=[])=>client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
async function verifyNetwork(){
 if(configuredRpc!==RPC)return false;
 const resp=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]}),signal:AbortSignal.timeout(9000)});
 if(!resp.ok)return false;
 const j=await resp.json();return !j.error&&parseInt(j.result,16)===61999;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const fail=(status,error)=>res.status(status).json({ok:false,error});
 if(req.method!=='GET')return fail(405,'GET only');
 const op=req.query?.op||'config';
 if(typeof op!=='string')return fail(400,'Invalid operation');
 if(op==='config'){
  let verified=false;try{verified=await verifyNetwork()}catch{}
  return res.status(200).json({ok:true,configured:Boolean(ready()&&verified),network:'GenLayer Studionet',
   chainId:61999,studionetVerified:verified,detail:verified?'Studionet identity verified':'RPC unavailable, wrong chain, or old RPC configured',
   rights:addr(RIGHTS)?RIGHTS:null,gate:addr(GATE)?GATE:null,
   protectedContentConfigured:Boolean(process.env.RIGHTRAIL_CONTENT_TEXT&&process.env.RIGHTRAIL_CONTENT_ASSET_ID)});
 }
 if(!ready())return fail(503,'Studionet contracts not configured');
 try{
  if(!(await verifyNetwork()))return fail(503,'Studionet RPC not verified');
  let value;const n=Number(req.query.id);
  if(op==='totals')value={rights:await read(RIGHTS,'totals'),gate:await read(GATE,'stats')};
  else if(op==='asset'&&validPositiveId(req.query.id))value=await read(RIGHTS,'get_asset',[n]);
  else if(op==='request'&&validPositiveId(req.query.id))value=await read(RIGHTS,'get_request',[n]);
  else if(op==='permit'&&validPositiveId(req.query.id)&&addr(req.query.actor))value=await read(RIGHTS,'permit_status',[n,req.query.actor]);
  else if(op==='gate'&&validPositiveId(req.query.id)&&addr(req.query.actor))value=await read(GATE,'can_access',[n,req.query.actor]);
  else if(op==='receipt'&&validPositiveId(req.query.id)&&addr(req.query.actor))value=await read(GATE,'receipt_for',[n,req.query.actor]);
  else if(op==='hasReceipt'&&validPositiveId(req.query.id)&&addr(req.query.actor))value=await read(GATE,'has_access_receipt',[n,req.query.actor]);
  else if(op==='tx'&&hash(req.query.hash)){
    const t=await client.getTransaction({hash:req.query.hash});
    if(!t)return res.status(200).json({ok:true,value:{found:false}});
    const c=t.consensus_data??t.consensusData??{},leader=c.leader_receipt??c.leaderReceipt??null;
    const outcomes=(Array.isArray(leader)?leader:[leader]).filter(Boolean).map(x=>String(x.execution_result??x.executionResult??'UNKNOWN').toUpperCase());
    const explicit=t.txExecutionResultName;let execution='UNKNOWN';
    if(explicit==='FINISHED_WITH_RETURN')execution='SUCCESS';
    else if(explicit==='FINISHED_WITH_ERROR')execution='ERROR';
    else if(outcomes.length&&outcomes.every(x=>x==='SUCCESS'))execution='SUCCESS';
    else if(outcomes.some(x=>['ERROR','FAILURE','FINISHED_WITH_ERROR'].includes(x)))execution='ERROR';
    value={found:true,status:String(t.statusName??t.status_name??t.status??'UNKNOWN'),execution};
  }else return fail(400,'Unsupported read or invalid parameters');
  return res.status(200).json({ok:true,value});
 }catch(e){return fail(502,'Read unavailable: '+String(e?.message||'RPC error').slice(0,170))}
}
