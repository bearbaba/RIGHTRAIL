import './v2.css';
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
import {encodePersonalSignMessage} from '../lib/unlock-wallet.js';
const $=id=>document.getElementById(id);
const chain=61999, key='rightrail-v2-pending', proofKey='rightrail-v2-message';
const address=s=>typeof s==='string'&&/^0x[0-9a-fA-F]{40}$/.test(s);
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const hash=async m=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m))));
const parse=x=>typeof x==='string'?JSON.parse(x):x;
const id=s=>{const n=Number(s);if(!Number.isSafeInteger(n)||n<1||n>99999999)throw Error('Enter a valid ID');return n};
let config=null,actor=null,busy=false;
const reader=createClient({chain:studionet});
const read=(address,functionName,args=[])=>reader.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
function status(msg){$('activity').textContent=msg}
function stash(k,v){sessionStorage.setItem(k,JSON.stringify(v))}
function load(k){try{return JSON.parse(sessionStorage.getItem(k)||'null')}catch{return null}}
function clear(k){sessionStorage.removeItem(k)}
function buttons(){
  document.querySelectorAll('[data-sign]').forEach(b=>b.disabled=busy||!config||!actor||!!load(key));
  $('deliver').disabled=busy||!config||!actor||!!load(key)||!load(proofKey);
  $('wallet').textContent=actor?'Disconnect':'Connect wallet';
  $('wallet').disabled=busy;
  $('account').textContent=actor||'No wallet connected';
  $('recheck').disabled=busy||!config||!load(key);
}
function resetContent(){$('content').textContent='No content delivered.'}
async function run(fn){if(busy)return;busy=true;buttons();try{await fn()}catch(e){status(e?.message||String(e))}finally{busy=false;buttons()}}
function ready(){if(!config)throw Error('V2 deployment not configured. No transaction sent.')}
async function connect(){
  if(actor){actor=null;resetContent();buttons();return}
  if(!window.ethereum)throw Error('Install an EIP-1193 wallet');
  const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
  if(!address(accounts?.[0]))throw Error('No valid account');
  actor=accounts[0].toLowerCase();buttons();
}
async function signer(){
  ready();
  if(!actor||!window.ethereum)throw Error('Connect wallet');
  const chainId=await window.ethereum.request({method:'eth_chainId'});
  if(parseInt(chainId,16)!==chain)throw Error('Select GenLayer Studionet 61999 in wallet first');
  const accounts=await window.ethereum.request({method:'eth_accounts'});
  if(accounts?.[0]?.toLowerCase()!==actor)throw Error('Wallet changed; reconnect');
  return createClient({chain:studionet,account:actor,provider:window.ethereum});
}
function link(tx){$('tx').hidden=false;$('tx').href='https://explorer-studio.genlayer.com/tx/'+tx}
async function grant(n){
  ready();const g=parse(await read(config.gate,'get_grant',[n]));
  if(g.id!==n)throw Error('Grant binding failed');
  $('grant').textContent=JSON.stringify(g,null,2);
  return g;
}
async function recheck(){
  ready();const p=load(key);
  if(!p)throw Error('No pending transaction');
  if(p.gate!==config.gate)throw Error('Pending deployment differs; inspect old hash manually.');
  link(p.tx);
  // Existing production endpoint resolves consensus execution result, not just hash.
  const r=await fetch('/api/state?op=tx&hash='+encodeURIComponent(p.tx),{cache:'no-store'});
  const b=await r.json();
  if(!r.ok||!b.ok)throw Error('Transaction status unavailable; keep pending hash');
  const s=String(b.value?.status||'').toUpperCase(),e=String(b.value?.execution||'').toUpperCase();
  if(e==='ERROR'||s.includes('CANCEL')||s.includes('UNDETERMINED')){
    clear(key);status('Transaction did not succeed: '+s+' / '+e);return;
  }
  if(!s.includes('FINALIZED')||e!=='SUCCESS'){status('Pending verification: '+s+' / '+e+'. Recheck the same hash.');return}
  if(p.method==='issue_grant'){
    const n=Number(await read(config.gate,'grant_for_request',[p.args[0]]));
    const g=await grant(id(n));
    if(g.request_id!==p.args[0]||g.owner!==p.actor||g.max_uses!==p.args[2]||g.expires_at-g.issued_at!==p.args[1])throw Error('Grant readback mismatch');
    $('grantId').value=n;
  }else if(p.method==='revoke_grant'){
    const g=await grant(p.args[0]);if(!g.revoked||g.owner!==p.actor)throw Error('Revocation not verified');
  }else if(p.method==='consume_access'){
    const n=Number(await read(config.gate,'receipt_for_challenge',[p.args[1]]));
    const rr=parse(await read(config.gate,'get_receipt',[id(n)]));
    if(rr.id!==n||rr.grant_id!==p.args[0]||rr.actor!==p.actor||rr.challenge_sha256!==p.args[1])throw Error('Receipt readback mismatch');
    if(await hash(p.message)!==p.args[1])throw Error('Stored proof mismatch');
    stash(proofKey,{message:p.message,actor:p.actor,grant:p.args[0],receipt:n,gate:p.gate});
    $('receipt').textContent=JSON.stringify(rr,null,2);
    await grant(p.args[0]);
  }else throw Error('Unknown pending action');
  clear(key);status('FINALIZED / SUCCESS · stored V2 state independently read back.');
}
async function write(method,args,message=null){
  if(load(key))throw Error('Recheck pending transaction first');
  const client=await signer(), owner=actor;
  // Test that recovery storage is available before signing.
  stash(key,{preparing:true});clear(key);
  status('Review '+method+' in your wallet. No automatic approval.');
  const tx=await client.writeContract({address:config.gate,functionName:method,args,value:0n});
  if(!/^0x[0-9a-fA-F]{64}$/.test(tx||''))throw Error('No valid transaction hash returned');
  link(tx);status('Submitted: '+tx+'. Save this hash. Waiting for finalized readback.');
  stash(key,{tx,method,args,message,actor:owner,gate:config.gate});
  for(let i=0;i<20&&load(key);i++){
    try{await recheck()}catch(e){status('Readback unavailable: '+e.message+' · rechecking same hash.')}
    if(load(key)&&i<19)await new Promise(resolve=>setTimeout(resolve,3500));
  }
  if(load(key))status('Still pending or readback unavailable. Recheck the same transaction; do not sign again.');
}
$('wallet').onclick=()=>run(connect);
$('issue').onsubmit=e=>{e.preventDefault();run(async()=>{
  ready();const requestId=id($('requestId').value),ttl=id($('ttl').value),uses=id($('uses').value);
  if(ttl<60||ttl>2592000||uses>100)throw Error('Grant bounds invalid');
  const req=parse(await read(config.rights,'get_request',[requestId]));
  const asset=parse(await read(config.rights,'get_asset',[req.asset_id]));
  if(asset.owner!==actor||!config.assetIds.includes(req.asset_id))throw Error('Not the owner of a configured V2 asset');
  if(await read(config.rights,'permit_status',[requestId,req.requester])!==true)throw Error('No live AI permit');
  await write('issue_grant',[requestId,ttl,uses]);
})};
$('inspect').onsubmit=e=>{e.preventDefault();run(()=>grant(id($('grantId').value)))};
$('revoke').onclick=()=>run(async()=>{
  const n=id($('grantId').value),g=await grant(n);
  if(g.owner!==actor||g.revoked)throw Error('Only original creator may revoke a live grant');
  await write('revoke_grant',[n]);
});
$('consume').onclick=()=>run(async()=>{
  const n=id($('grantId').value);await signer();resetContent();
  const old=load(proofKey);
  if(old){
    const issued=Number(old.message?.split('\n')[6]?.slice(7));
    if(Number.isFinite(issued)&&Date.now()-issued>1200000)clear(proofKey);
    else throw Error('A delivery proof already exists. Deliver it before consuming another grant, or wait for expiry.');
  }
  if(await read(config.gate,'can_consume',[n,actor])!==true)throw Error('Grant unavailable for this wallet');
  const message=['RIGHTRAIL V2 ACCESS','Host:'+location.host,'Chain:61999','Gate:'+config.gate,
    'Grant:'+n,'Actor:'+actor,'Issued:'+Date.now(),'Nonce:'+hex(crypto.getRandomValues(new Uint8Array(32)))].join('\n');
  await write('consume_access',[n,await hash(message)],message);
});
$('deliver').onclick=()=>run(async()=>{
  await signer();const p=load(proofKey);
  if(!p||p.actor!==actor||p.gate!==config.gate)throw Error('Proof is bound to another wallet or deployment');
  if(Date.now()-Number(p.message.split('\n')[6].slice(7))>1200000){clear(proofKey);throw Error('Proof expired; consumed quota cannot be restored')}
  resetContent();
  const signature=await window.ethereum.request({method:'personal_sign',params:[encodePersonalSignMessage(p.message),actor]});
  const r=await fetch('/api/v2-access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:p.message,signature})});
  const b=await r.json();
  if(!r.ok||!b.ok){if(r.status===409)clear(proofKey);throw Error(b.error||'Delivery blocked')}
  if(b.receiptId!==p.receipt||b.grantId!==p.grant||await hash(b.content)!==b.digest)throw Error('Delivery response binding mismatch');
  clear(proofKey);$('content').textContent=b.content;status('ACCESS DELIVERED · receipt '+b.receiptId+' · exact SHA-256 verified.');
});
$('recheck').onclick=()=>run(recheck);
window.ethereum?.on?.('accountsChanged',()=>{actor=null;resetContent();buttons()});
window.ethereum?.on?.('chainChanged',()=>{actor=null;resetContent();buttons()});
async function init(){
  try{
    const r=await fetch('/api/v2-access',{cache:'no-store'}),b=await r.json();
    if(!r.ok||!b.ok||b.chainId!==chain||!address(b.gate)||!address(b.rights)||!Array.isArray(b.assetIds))throw Error('V2 not configured');
    config=b;$('config').textContent='Gate configured · '+b.gate+' · delivery store not yet live-tested';
    $('config').dataset.ready='true';
  }catch{$('config').textContent='V2 LOCKED · deployment, protected assets and durable delivery store required. No transaction will be sent.';$('config').dataset.ready='false'}
  const p=load(key);if(p?.tx){link(p.tx);status('Saved transaction. Recheck same hash before any new action.')}
  buttons();
}
init();
