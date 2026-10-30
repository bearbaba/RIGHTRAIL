// Read-only Studionet deployment check; no wallet, private key, or transaction.
import { createClient } from 'genlayer-stable';
import { studionet } from 'genlayer-stable/chains';
import { TransactionHashVariant } from 'genlayer-stable/types';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const address = '0xef37288aB08A30697841C4fFe93C1D71E23C464b';
const client = createClient({chain:studionet});
const checksum=s=>createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
let failed=false;
try {
  const code=await client.getContractCode(address);
  if(typeof code!=='string'||!code.includes('class RightsRail(gl.Contract)'))
    throw new Error('No RightsRail source found at given address');
  const local=await readFile(new URL('../contracts/rights_rail.py',import.meta.url),'utf8');
  const normal=s=>s.replace(/\r\n/g,'\n').trimEnd();
  const semanticMatch=normal(code)===normal(local);
  const schema=await client.getContractSchema(address);
  const methods=Object.keys(schema?.methods||{});
  const expected=['publish_asset','request_usage','adjudicate','permit_status','get_asset','totals'];
  if(expected.some(x=>!methods.includes(x)))throw new Error('Unexpected/missing public methods: '+methods.join(','));
  const totals=await client.readContract({address,functionName:'totals',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
  const parsed=typeof totals==='string'?JSON.parse(totals):totals;
  if(!Number.isSafeInteger(parsed?.assets)||!Number.isSafeInteger(parsed?.requests))
    throw new Error('Malformed finalized totals readback: '+JSON.stringify(parsed));
  console.log(JSON.stringify({verified:true,chainId:61999,address,contract:'RightsRail',
   localSourceSha256:checksum(local),deployedSourceSha256:checksum(code),exactByteMatch:code===local,
   normalizedSourceMatch:semanticMatch,methodNames:methods,finalizedTotals:parsed},null,2));
  if(!semanticMatch)console.error('[WARNING] Deployed source differs from current repo; inspect before writing.');
}catch(e){failed=true;console.error('[BLOCKED] '+String(e?.message||e));}
if(failed)process.exitCode=1;
