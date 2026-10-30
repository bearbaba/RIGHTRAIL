// Read-only contract introspection, no wallet or deployment.
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {readFile} from 'node:fs/promises';
const c=createClient({chain:studionet});
const expected={'contracts/rights_rail.py':['publish_asset','request_usage','adjudicate','permit_status'],
 'contracts/access_gate.py':['can_access','record_access','receipt_for','has_access_receipt']};
let failed=false;
for(const [path,required] of Object.entries(expected)){
 try{
  const code=await readFile(new URL('../'+path,import.meta.url),'utf8');
  const schema=await c.getContractSchemaForCode(code);
  const methods=Object.keys(schema?.methods??{});
  const missing=required.filter(x=>!methods.includes(x));
  if(missing.length)throw Error('Missing methods: '+missing.join(','));
  console.log('[PASS] '+path+' '+methods.join(', '));
 }catch(e){failed=true;console.error('[BLOCKED] '+path+': '+String(e?.message||e));}
}
if(failed){console.error('No deployment until BOTH schemas work. No GEN spent.');process.exitCode=1}
else console.log('Schema PASS; still requires wallet-signed deployment and real consensus tests.');
