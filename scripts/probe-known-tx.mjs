import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
const hash='0x6a9020c45ba101535d675022063545854ef289a32f5e83a7b530b51d31f11011';
const client=createClient({chain:studionet});
const tx=await client.getTransaction({hash});
if(!tx)throw Error('Known successful deployment transaction missing');
const rawLeader=tx.consensus_data?.leader_receipt??tx.consensusData?.leaderReceipt??null;
const leaders=(Array.isArray(rawLeader)?rawLeader:[rawLeader]).filter(Boolean);
const result={hash, status:tx.status,statusName:tx.statusName,txExecutionResult:tx.txExecutionResult,
 txExecutionResultName:tx.txExecutionResultName,
 result:tx.result,resultName:tx.resultName,
 leaderReceipts:leaders.map(x=>({execution_result:x.execution_result,executionResult:x.executionResult})),
 dataContractAddress:tx.data?.contract_address,
 from:tx.from_address,to:tx.to_address};
console.log('SUCCESS_DEPLOY_STATUS '+JSON.stringify(result));
const response=await fetch('https://rightrail.vercel.app/api/state?op=tx&hash='+hash);
console.log('LIVE_TX_API '+JSON.stringify({status:response.status,data:await response.json()}));
const totalsRes=await fetch('https://rightrail.vercel.app/api/state?op=totals');
console.log('LIVE_TOTALS '+JSON.stringify({status:totalsRes.status,data:await totalsRes.json()}));
