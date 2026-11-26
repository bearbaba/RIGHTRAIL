import {getAddress,formatEther} from 'viem';
import {createClient} from 'genlayer-v2';
import {studionet} from 'genlayer-v2/chains';
const RPC='https://studio.genlayer.com/api';
export async function verifyFeeNetwork(){
  const rpc=async(method)=>{const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method,params:[],id:1}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Studio RPC unavailable');const j=await r.json();if(j.error||!j.result)throw Error('Studio fee protocol not verified: '+method);return j.result};
  if(parseInt(await rpc('eth_chainId'),16)!==61999||studionet.id!==61999)throw Error('Wrong Studio network');
  const policy=await rpc('sim_getFeeConfig');
  if(typeof policy!=='object')throw Error('Fee protocol not verified');
  return policy;
}
export function feeClient(account,provider){return createClient({chain:studionet,account:getAddress(account),...(provider?{provider}:{})})}
export async function prepareFeeWrite(client,address,functionName,args){
  await verifyFeeNetwork();
  const write={address:getAddress(address),functionName,args,value:0n};
  const estimate=await client.estimateTransactionFeesForWrite({...write,rotations:[0n],appealRounds:0n});
  if(!estimate.distribution||typeof estimate.feeValue!=='bigint'||estimate.feeValue<0n||estimate.feeValue>100000000000000000n)throw Error('Invalid fee estimate or exceeds 0.1 test GEN safety cap. No transaction sent.');
  return {write:{...write,fees:{distribution:estimate.distribution,feeValue:estimate.feeValue},consensusMaxRotations:0},fee:formatEther(estimate.feeValue)};
}
