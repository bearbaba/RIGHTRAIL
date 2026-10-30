// Check the SDK interface used by the live dApp; no simulation, signing or GEN.
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
const c=createClient({chain:studionet});
const result={
  chainId:61999,
  hasWriteContract:typeof c.writeContract==='function',
  hasGetTransaction:typeof c.getTransaction==='function',
  hasLatestFinalReads:typeof c.readContract==='function',
  hasEstimateTransactionFeesForWrite:typeof c.estimateTransactionFeesForWrite==='function'
};
console.log('STABLE_SDK_CAPABILITIES '+JSON.stringify(result));
if(!result.hasWriteContract||!result.hasGetTransaction||!result.hasLatestFinalReads)
  throw Error('Missing basic SDK methods required by RIGHTRAIL.');
if(!result.hasEstimateTransactionFeesForWrite)
  console.log('INFO: Fee estimate helper not present in pinned genlayer-js@1.1.8. Do not call it in stable dApp.');
console.log('READ_ONLY_CHECK_PASS No wallet or live AI write was performed.');
