import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {readFile} from 'node:fs/promises';
const client=createClient({chain:studionet});
const code=await readFile(new URL('../contracts/scoped_rights_gate.py',import.meta.url),'utf8');
const result=await client.getContractSchemaForCode(code);
const methods=Object.keys(result?.methods??{});
const required=['issue_grant','revoke_grant','consume_access','get_grant','grant_for_request',
  'get_receipt','receipt_for_challenge','can_consume','can_deliver','stats'];
const missing=required.filter(x=>!methods.includes(x));
if(missing.length)throw Error('Studionet schema missing: '+missing.join(','));
console.log('Studionet schema verified (unsigned, no deployment): '+methods.join(', '));
