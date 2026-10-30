import './style.css';
import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const $ = id => document.getElementById(id);
const bySel = s => document.querySelector(s);
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parse = v => typeof v === 'string' ? JSON.parse(v) : v;
const pendingKey = 'rightrail-bradbury-pending-v1';
const explorer = 'https://scan.bradbury.genlayer.com/tx/';
let config = null, account = null, wallet = null, busy = false, currentRequest = 0;
const pages = ['explore','publish','request','access'];
const title = x => x.charAt(0).toUpperCase() + x.slice(1);
const hexAddress = x => /^0x[a-fA-F0-9]{40}$/.test(x || '');
const inputId = s => { const n = Number(s); if (!Number.isSafeInteger(n) || n < 1 || n > 100000000) throw new Error('Enter a valid positive ID.'); return n; };
function notify(message, kind='info') {
  const n=$('notice'); n.textContent=message; n.className='notice '+(kind==='error'?'error':kind==='ok'?'ok':'');
}
function showPage(page, scroll = true) {
  if (!pages.includes(page)) return;
  pages.forEach(x=>$(x).hidden=x!==page);
  document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
  $('crumb').textContent=title(page);
  if (scroll) window.scrollTo({top:0,behavior:'smooth'});
  if (window.location.hash!=='#'+page) history.replaceState(null,'','#'+page);
}
document.querySelectorAll('[data-page],[data-jump]').forEach(el=>el.addEventListener('click',()=>showPage(el.dataset.page||el.dataset.jump)));
window.addEventListener('hashchange',()=>showPage(window.location.hash.slice(1)||'explore',false));
function setActivity(heading, detail, state='idle', stage=0, hash='') {
  bySel('.activity').dataset.state=state;
  $('txHeading').textContent=heading;
  $('txInfo').textContent=detail;
  for(let i=1;i<=3;i++)$('s'+i).className=i<stage?'done':i===stage?'current':'';
  $('txExplorer').hidden=!hash;
  if(hash)$('txExplorer').href=explorer+encodeURIComponent(hash);
  $('recheckTx').hidden=!(hash&&state!=='working');
}
function setBusy(v){busy=v;document.querySelectorAll('form button[type=submit]').forEach(b=>b.disabled=v);$('unlockBtn').disabled=v;}
async function api(op, params={}) {
  const url=new URL('/api/state',window.location.origin);
  url.searchParams.set('op',op);
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k,String(v));
  const response=await fetch(url,{cache:'no-store'});
  const body=await response.json().catch(()=>({ok:false,error:'Invalid server response'}));
  if(!response.ok||body.ok!==true) throw new Error(body.error||'Network read failed');
  return body.value;
}
async function refreshConfig() {
  try {
    const response=await fetch('/api/state?op=config',{cache:'no-store'});
    config=await response.json();
    const ok=Boolean(config.configured&&config.phase2Verified&&hexAddress(config.rights)&&hexAddress(config.gate));
    $('networkState').textContent=ok?'Bradbury Phase 2 · Verified':'Bradbury deployment pending';
    $('networkState').classList.toggle('ready',ok);
    notify(ok
      ? 'Connected to verified Bradbury Phase 2. Contract reads use finalized state; signing requires test GEN.'
      : 'Builder preview · Contracts are not deployed/configured on verified Bradbury Phase 2. You may prepare a local policy draft; signing and protected access remain disabled.',ok?'ok':'info');
    if (ok) await loadTotals();
  }catch(error){config={configured:false};notify('Configuration unavailable. No on-chain actions will be sent.','error');}
}
function checkReady() {
  if (!config?.configured||!config?.phase2Verified||!hexAddress(config.rights)||!hexAddress(config.gate))
    throw new Error('Bradbury deployment is not verified yet. No wallet transaction was sent.');
}
async function connectWallet() {
  if (account) {
    account=null;wallet=null;$('walletBtn').textContent='Connect wallet';notify('Wallet disconnected from this page.');return;
  }
  if(!window.ethereum) throw new Error('Install an EIP-1193 wallet (e.g. MetaMask) to sign.');
  const acc=await window.ethereum.request({method:'eth_requestAccounts'});
  if (!acc?.[0]||!hexAddress(acc[0])) throw new Error('No valid wallet account returned.');
  account=acc[0];
  // Wallet is only connected locally; this never signs a transaction.
  $('walletBtn').textContent=account.slice(0,6)+'…'+account.slice(-4)+' · Disconnect';
  notify('Wallet connected: '+account+' (no transaction sent).','ok');
}
$('walletBtn').onclick=async()=>{try{await connectWallet()}catch(e){notify(e.message,'error')}};
window.ethereum?.on?.('accountsChanged',()=>{account=null;wallet=null;$('walletBtn').textContent='Connect wallet';notify('Wallet changed. Reconnect before signing.','error')});
window.ethereum?.on?.('chainChanged',()=>{wallet=null;notify('Wallet network changed. The next signature will recheck Bradbury.','error')});
async function signer() {
  checkReady();
  if (!account) await connectWallet();
  if (!account) throw new Error('Connect a wallet first.');
  if (!window.ethereum) throw new Error('Wallet provider missing');
  // Chain definition and account must match. Phase 2 RPC identity is verified on the server.
  wallet=createClient({chain:testnetBradbury,account,provider:window.ethereum});
  await wallet.connect('testnetBradbury');
  const network=await window.ethereum.request({method:'eth_chainId'});
  if (parseInt(network,16)!==4221) throw new Error('Wrong wallet network; expected Bradbury chain ID 4221.');
  // Chain ID alone is insufficient: the server verifies the configured RPC genesis.
  return wallet;
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function loadTotals(){
  if(!config?.configured)return;
  try{
    const raw=await api('totals');
    const a=parse(raw.rights),g=parse(raw.gate);
    $('assetsCount').textContent=a.assets;
    $('requestsCount').textContent=a.requests;
    $('receiptsCount').textContent=g.receipts;
  }catch(e){notify('Finalized counts unavailable: '+e.message,'error')}
}
function infoRow(label,value){return '<div class="step-row"><span class="step-glyph">✓</span><div><b>'+escape(label)+'</b><p>'+escape(value)+'</p></div></div>'}
async function inspectAsset(id) {
  checkReady();
  const data=parse(await api('asset',{id}));
  $('assetResult').innerHTML='<span class="badge">'+(data.active?'ACTIVE':'RETIRED')+'</span><h3>'+escape(data.title)+'</h3>'+
    '<p><b>Publisher:</b> '+escape(data.owner)+'</p><p><b>Version:</b> '+escape(data.version)+'</p>'+
    '<p><b>Content digest:</b> '+escape(data.content_sha256)+'</p><p><b>Policy:</b> '+escape(data.policy)+'</p>';
  return data;
}
$('inspectAsset').onsubmit=async e=>{e.preventDefault();try{await inspectAsset(inputId($('inspectAssetId').value))}catch(err){$('assetResult').textContent=err.message}};
$('examplePolicy').onclick=()=>{
  $('assetPolicy').value='Community members may use this content in free, non-commercial educational tutorials if the original creator is clearly credited with a visible link. Paid advertisements, resale, and training AI models are not permitted. Sponsorship-funded educational articles require explicit case-by-case approval; ambiguous requests must not be automatically granted.';
};
$('contentFile').onchange=async()=>{
  const file=$('contentFile').files?.[0];
  if(!file)return;
  if(file.size>10*1024*1024)return notify('For this preview, select a file no larger than 10 MB.','error');
  try{
    const bytes=await file.arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    $('contentDigest').value=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    notify('SHA-256 computed locally for '+file.name+'. File bytes were not uploaded.','ok');
  }catch{notify('Could not hash this file in your browser.','error')}
};
function saveLocalDraft(){
  const draft={title:$('assetTitle').value.trim(),digest:$('contentDigest').value.trim(),policy:$('assetPolicy').value.trim()};
  try{sessionStorage.setItem('rightrail-draft-v1',JSON.stringify(draft))}catch{}
}
function writeRecord(){try{return JSON.parse(sessionStorage.getItem(pendingKey)||'null')}catch{return null}}
function keepRecord(v){try{sessionStorage.setItem(pendingKey,JSON.stringify(v))}catch{}}
function clearRecord(){try{sessionStorage.removeItem(pendingKey)}catch{}}
async function verifyRecord(record){
  const {functionName,args,actor}=record;
  if(functionName==='publish_asset'){
    const totals=parse((await api('totals')).rights);
    const limit=Math.min(12,totals.assets);
    for(let i=totals.assets;i>totals.assets-limit;i--){
      const item=parse(await api('asset',{id:i}));
      if(item.owner===actor.toLowerCase()&&item.title===args[0]&&item.content_sha256===args[1]&&item.policy===args[2]){
        $('inspectAssetId').value=i;return {id:i,message:'Asset #'+i+' confirmed in finalized storage'};
      }
    }
  }
  if(functionName==='request_usage'){
    const totals=parse((await api('totals')).rights);
    const limit=Math.min(12,totals.requests);
    for(let i=totals.requests;i>totals.requests-limit;i--){
      const req=parse(await api('request',{id:i}));
      if(req.requester===actor.toLowerCase()&&req.asset_id===args[0]&&req.usage===args[1]&&req.attribution===args[2]){
        currentRequest=i;['decisionRequestId','lookupRequestId','gateRequestId'].forEach(x=>$(x).value=i);
        return {id:i,message:'Request #'+i+' confirmed in finalized storage'};
      }
    }
  }
  if(functionName==='adjudicate'){
    const req=parse(await api('request',{id:args[0]}));
    if(req.decision!=='PENDING')return {id:args[0],message:'Consensus decision: '+req.decision};
  }
  if(functionName==='record_access'){
    const rec=await api('receipt',{id:args[0],actor});
    if(rec){
      const rr=parse(rec);
      if(rr.actor===actor.toLowerCase()&&rr.request_id===args[0]&&rr.action_key===args[1])
        return {id:rr.id,message:'Access receipt #'+rr.id+' stored and verified on-chain'};
    }
  }
  return null;
}
async function followTransaction(record){
  if(busy)return;
  setBusy(true);
  const hash=record.hash;
  setActivity('Finalizing on GenLayer','Waiting for validators, successful execution and finalized storage read-back. Do not sign the same action twice.','working',2,hash);
  let stale=false;
  for(let k=0;k<55;k++){
    try {
      const tx=await api('tx',{hash});
      const status=String(tx.status||'').toUpperCase(),execution=String(tx.execution||'').toUpperCase();
      if(status.includes('CANCEL')||status.includes('UNDETERMINED')||execution.includes('ERROR')||execution.includes('REVERT')){
        clearRecord();setActivity('Transaction did not execute','Status: '+status+' · execution: '+execution,'error',2,hash);setBusy(false);return;
      }
      if(status.includes('FINALIZED')){
        if(execution==='SUCCESS'||execution==='FINISHED_WITH_RETURN'){
          for(let j=0;j<8;j++){
            try{
              const verified=await verifyRecord(record);
              if(verified){
                clearRecord();setActivity('FINALIZED / SUCCESS',verified.message,'success',3,hash);
                notify(verified.message,'ok');setBusy(false);loadTotals();
                if(record.functionName==='publish_asset')showPage('explore');
                if(record.functionName==='request_usage')showPage('request');
                if(record.functionName==='adjudicate'||record.functionName==='record_access')showPage('access');
                return;
              }
            }catch{}
            await sleep(2200);
          }
          stale=true;break;
        }
        stale=true;break;
      }
    }catch{}
    await sleep(3500);
  }
  setActivity(stale?'Finalized · state needs recheck':'Still waiting for finality',
    'The transaction hash is saved. No additional wallet signature was requested. Recheck the SAME hash to verify execution and stored state.',
    'unknown',2,hash);
  setBusy(false);
}
async function signWrite(address,functionName,args){
  if(writeRecord())throw new Error('An existing signed transaction needs rechecking before you can send another.');
  const client=await signer();
  setBusy(true);
  setActivity('Confirm in your wallet','Review the contract method, estimated GEN fees and network before signing.','working',1);
  try{
    const intent={address,functionName,args,value:0n};
    const estimate=await client.estimateTransactionFeesForWrite(intent);
    const hash=await client.writeContract({
      ...intent,fees:{distribution:estimate.distribution,feeValue:estimate.feeValue}
    });
    if(!/^0x[0-9a-fA-F]{64}$/.test(hash||''))throw new Error('Wallet did not return a valid transaction hash.');
    const record={hash,functionName,args,actor:account,address,created:Date.now()};
    keepRecord(record);
    setBusy(false);
    await followTransaction(record);
  }catch(error){
    setBusy(false);
    setActivity('Signature or submission failed',error.message||String(error),'error',1);
    throw error;
  }
}
$('publishForm').onsubmit=async e=>{
  e.preventDefault();
  const title=$('assetTitle').value.trim(),hash=$('contentDigest').value.trim(),policy=$('assetPolicy').value.trim();
  if(!/^[0-9a-f]{64}$/.test(hash))return notify('Enter an exact lowercase SHA-256 digest.','error');
  saveLocalDraft();
  if(!config?.configured)return notify('Draft saved only in this browser. Bradbury contracts are not deployed/configured; no signature was requested.','info');
  try{await signWrite(config.rights,'publish_asset',[title,hash,policy])}catch(err){notify(err.message,'error')}
};
$('requestForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    checkReady();
    await signWrite(config.rights,'request_usage',[
      inputId($('requestAssetId').value),$('usageText').value.trim(),$('attributionText').value.trim()
    ]);
  }catch(err){notify(err.message,'error')}
};
$('adjudicateForm').onsubmit=async e=>{
  e.preventDefault();
  try{checkReady();await signWrite(config.rights,'adjudicate',[inputId($('decisionRequestId').value)])}
  catch(err){notify(err.message,'error')}
};
async function lookupRequest(requestId){
  checkReady();
  currentRequest=requestId;
  const record=parse(await api('request',{id:requestId}));
  const asset=parse(await api('asset',{id:record.asset_id}));
  const allowed=Boolean(account&&await api('permit',{id:requestId,actor:account}));
  let receipt='';
  if(account)receipt=await api('receipt',{id:requestId,actor:account});
  $('requestResult').innerHTML='<span class="badge '+(record.decision==='DENY'?'bad':record.decision!=='PERMIT'?'warn':'')+'">'+escape(record.decision)+'</span>'+
    infoRow('Asset',' #'+record.asset_id+' · '+asset.title)+infoRow('Requester',record.requester)+
    infoRow('Policy snapshot','v'+record.policy_version+' · current v'+asset.version)+
    infoRow('Usage',record.usage)+infoRow('Attribution',record.attribution)+
    infoRow('Wallet permit',allowed?'VALID for connected wallet':'NOT GRANTED for connected wallet')+
    infoRow('Access receipt',receipt?JSON.stringify(parse(receipt)):'No matching receipt for connected wallet');
  $('gateRequestId').value=requestId;
  return {record,asset,allowed,receipt};
}
$('lookupRequestForm').onsubmit=async e=>{
  e.preventDefault();try{await lookupRequest(inputId($('lookupRequestId').value))}catch(err){$('requestResult').textContent=err.message}
};
$('accessForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    checkReady();
    if(!account)await connectWallet();
    const reqId=inputId($('gateRequestId').value);
    const permit=await api('gate',{id:reqId,actor:account});
    if(permit!==true)throw new Error('Consumer Gate refused this wallet/request. No transaction was sent.');
    const existing=await api('receipt',{id:reqId,actor:account});
    if(existing)throw new Error('A receipt already exists for this wallet/request. Do not sign again.');
    await signWrite(config.gate,'record_access',[reqId,$('actionKey').value.trim()]);
  }catch(err){notify(err.message,'error')}
};
$('unlockBtn').onclick=async()=>{
  try{
    checkReady();if(!account)await connectWallet();if(!account)throw new Error('Connect wallet.');
    const requestId=inputId($('gateRequestId').value);
    const status=await api('hasReceipt',{id:requestId,actor:account});
    if(status!==true)throw new Error('No current on-chain permit and matching access receipt. Unlock denied.');
    if(!config.protectedContentConfigured)throw new Error('Protected content is not provisioned on this server.');
    const arr=new Uint8Array(16);crypto.getRandomValues(arr);
    const nonce=Array.from(arr,v=>v.toString(16).padStart(2,'0')).join('');
    const message=['RIGHTRAIL ACCESS','Host:'+location.host,'Request:'+requestId,
      'Actor:'+account,'Issued:'+Date.now(),'Nonce:'+nonce].join('\n');
    const signature=await window.ethereum.request({method:'personal_sign',params:[message,account]});
    const response=await fetch('/api/unlock',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({message,signature}),cache:'no-store'});
    const result=await response.json();
    if(!response.ok||!result.ok)throw new Error(result.error||'Access denied');
    $('unlockResult').innerHTML='<span class="badge">ACCESS VERIFIED</span><p></p><small></small>';
    $('unlockResult').querySelector('p').textContent=result.content;
    $('unlockResult').querySelector('small').textContent='Verified SHA-256: '+result.digest;
    notify('Protected content successfully unlocked after current on-chain checks.','ok');
  }catch(err){$('unlockResult').textContent='ACCESS DENIED: '+err.message;notify(err.message,'error')}
};
$('clearTx').onclick=()=>{if(!busy){setActivity('Ready when you are.','Wallet actions will appear here with their real hash and execution status.');$('recheckTx').hidden=true}};
$('recheckTx').onclick=async()=>{const record=writeRecord();if(record&&!busy)await followTransaction(record)};
(async()=>{
 showPage(window.location.hash.slice(1)||'explore',false);
 try{
  const draft=JSON.parse(sessionStorage.getItem('rightrail-draft-v1')||'null');
  if(draft){$('assetTitle').value=draft.title||'';$('contentDigest').value=draft.digest||'';$('assetPolicy').value=draft.policy||''}
 }catch{}
 await refreshConfig();
 const record=writeRecord();
 if(record?.hash)followTransaction(record);
})();
