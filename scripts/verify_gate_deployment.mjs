// Public, unsigned Studionet transaction and contract readback. No wallet, GEN or secrets.
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
const HASH='0x6a9020c45ba101535d675022063545854ef289a32f5e83a7b530b51d31f11011';
const RIGHTS='0xef37288aB08A30697841C4fFe93C1D71E23C464b';
const c=createClient({chain:studionet});
const x=await c.getTransaction({hash:HASH});
if(!x)throw Error('Deployment transaction not found');
const clean=JSON.parse(JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v));
console.log('DEPLOY_TX_PUBLIC_FIELDS '+JSON.stringify(clean).slice(0,12500));
const status=String(x.statusName??x.status_name??x.status??'UNKNOWN').toUpperCase();
if(status!=='FINALIZED')throw Error('Deployment not FINALIZED: '+status);
const explicit=String(x.txExecutionResultName??'');
const leader=x.consensus_data?.leader_receipt??x.consensusData?.leaderReceipt??null;
const ls=(Array.isArray(leader)?leader:[leader]).filter(Boolean).map(v=>String(v.execution_result??v.executionResult??'').toUpperCase());
if(explicit==='FINISHED_WITH_ERROR'||ls.includes('ERROR'))throw Error('GenVM failed');
const addr=/^0x[0-9a-fA-F]{40}$/;
const choices=[x.toAddress,x.to_address,x.to,x.contractAddress,x.contract_address,x.result?.contract_address,x.receipt?.contractAddress,clean.toAddress,clean.to_address,clean.to,clean.contract_address].filter(v=>typeof v==='string'&&addr.test(v));
const candidates=[...new Set(choices.map(v=>v.toLowerCase()))];
console.log('DEPLOY_CANDIDATES '+JSON.stringify(candidates));
if(!candidates.length)throw Error('No deployed address exposed by transaction; inspect DEPLOY_TX_PUBLIC_FIELDS');
for(const address of candidates){
 try{
  const code=await c.getContractCode(address);
  if(!code||!code.includes('class RightsAccessGate(gl.Contract)')){console.log('NOT_RIGHTS_GATE '+address);continue;}
  const schema=await c.getContractSchema(address);
  const methods=Object.keys(schema?.methods??{});
  const expected=['can_access','record_access','receipt_for','stats'];
  if(expected.some(v=>!methods.includes(v)))throw Error('Gate method missing: '+methods.join(','));
  const raw=await c.readContract({address,functionName:'stats',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
  const stats=typeof raw==='string'?JSON.parse(raw):raw;
  if(String(stats?.rights_address??'').toLowerCase()!==RIGHTS.toLowerCase())throw Error('GATE_WRONG_RIGHTS: '+JSON.stringify(stats));
  if(Number(stats?.receipts)!==0)throw Error('Unexpected receipt count for new gate');
  console.log('GATE_VERIFIED '+JSON.stringify({address,rightsAddress:stats.rights_address,finalizedStats:stats,methods,sourceHasExpectedClass:true}));
  process.exit(0);
 }catch(e){console.error('CANDIDATE_FAILED '+address+': '+String(e.message??e));}
}
throw Error('No candidate was independently verified as RightsAccessGate with expected RightsRail address');
