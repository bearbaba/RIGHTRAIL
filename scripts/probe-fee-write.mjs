import {feeClient,prepareFeeWrite,verifyFeeNetwork} from '../lib/fee-write.js';
const account='0xd6b8a3a5eb329410d9504784812b8569afa8c2af';
const policy=await verifyFeeNetwork();console.log('STUDIO_V06_DETECTED',JSON.stringify({enabled:policy.enabled}));
const write=await prepareFeeWrite(feeClient(account),'0xef37288aB08A30697841C4fFe93C1D71E23C464b','request_usage',[4,'Use this resource in a free, non-commercial classroom lesson for students. No advertising, sponsorship, resale or AI model training.','Display visible creator credit on every slide and handout.']);
console.log('UNSIGNED_FEE_QUOTE_OK',write.fee);
const r=await fetch('https://studio.genlayer.com/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'eth_getTransactionReceipt',params:['0x6179779f9be2c075f822ec75184cf41b6956167c7cf11914cbddbacc1bddf17c'],id:1})});
const j=await r.json();console.log('OLD_ENVELOPE_RECEIPT',JSON.stringify({status:j.result?.status,found:!!j.result,error:j.error?.message}));
