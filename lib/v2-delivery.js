import { createHash } from 'node:crypto';
import { verifyMessage } from 'viem';

export const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
const addr = value => typeof value === 'string' && /^0x[0-9a-f]{40}$/.test(value);
export const MAX_AGE = 20 * 60 * 1000;

// One canonical representation; all fields, including deployment, are signed.
export function parseV2Proof(message, signature, {host, gate, now = Date.now()}) {
  if (typeof message !== 'string' || message.length > 420 ||
      typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature))
    throw Error('Invalid proof');
  const lines = message.split('\n');
  if (lines.length !== 8 || lines[0] !== 'RIGHTRAIL V2 ACCESS' ||
      lines[1] !== 'Host:'+host || lines[2] !== 'Chain:61999' ||
      !addr(gate) || lines[3] !== 'Gate:'+gate ||
      !/^Grant:[1-9][0-9]{0,7}$/.test(lines[4]) ||
      !lines[5].startsWith('Actor:') || !addr(lines[5].slice(6)) ||
      !/^Issued:[0-9]{13}$/.test(lines[6]) ||
      !/^Nonce:[0-9a-f]{64}$/.test(lines[7])) throw Error('Malformed proof');
  const issued = Number(lines[6].slice(7));
  if (issued > now + 10000 || now - issued > MAX_AGE) throw Error('Expired proof');
  return {grantId:Number(lines[4].slice(6)),actor:lines[5].slice(6),
          digest:sha256(message),issued};
}
export async function verifyV2Proof(message, signature, config) {
  const proof = parseV2Proof(message, signature, config);
  if (!await verifyMessage({address:proof.actor,message,signature}))
    throw Error('Wrong signer');
  return proof;
}

// Return no content until all exact bindings, current state, and durable claim pass.
export async function authorizeDelivery({proof, gate, rights, read, claim, contentFor, now=Date.now}) {
  const parse = x => typeof x === 'string' ? JSON.parse(x) : x;
  const id = Number(await read(gate,'receipt_for_challenge',[proof.digest]));
  if (!Number.isSafeInteger(id) || id < 1) return {ok:false,error:'RECEIPT_NOT_FOUND'};
  const receipt = parse(await read(gate,'get_receipt',[id]));
  const grant = parse(await read(gate,'get_grant',[proof.grantId]));
  if (!receipt || !grant || receipt.id!==id || grant.id!==proof.grantId ||
      receipt.grant_id!==grant.id || receipt.actor!==proof.actor || grant.actor!==proof.actor ||
      receipt.challenge_sha256!==proof.digest || receipt.asset_id!==grant.asset_id ||
      receipt.policy_version!==grant.policy_version || receipt.content_sha256!==grant.content_sha256 ||
      !Number.isSafeInteger(receipt.use_number) || receipt.use_number<1 ||
      receipt.use_number>grant.used || grant.used>grant.max_uses ||
      !Number.isSafeInteger(receipt.consumed_at) || receipt.consumed_at*1000<proof.issued-10000 ||
      !Number.isSafeInteger(grant.expires_at) || now()>=grant.expires_at*1000 ||
      grant.revoked!==false) return {ok:false,error:'RECEIPT_BINDING_FAILED'};
  const asset = parse(await read(rights,'get_asset',[grant.asset_id]));
  const content = contentFor(grant.asset_id);
  if (typeof content!=='string' || !content || !asset || asset.id!==grant.asset_id ||
      asset.active!==true || asset.version!==grant.policy_version ||
      asset.content_sha256!==grant.content_sha256 || sha256(content)!==grant.content_sha256)
    return {ok:false,error:'ASSET_BINDING_FAILED'};
  if (await read(gate,'can_deliver',[id,proof.actor])!==true)
    return {ok:false,error:'GRANT_NOT_LIVE'};
  // Re-check proof and wall-clock expiry just before claiming delivery.
  const at=now();
  if(at-proof.issued>MAX_AGE || at>=grant.expires_at*1000)
    return {ok:false,error:'PROOF_EXPIRED'};
  const key='rightrail:v2:61999:'+gate+':receipt:'+id;
  if (await claim(key)!==true) return {ok:false,error:'DELIVERY_ALREADY_CLAIMED'};
  // Fail closed after claim if a fresh finalized read observes revocation.
  // A failed delivery burns the claim; never retry by releasing it.
  if (await read(gate,'can_deliver',[id,proof.actor])!==true ||
      now()>=grant.expires_at*1000 || now()-proof.issued>MAX_AGE)
    return {ok:false,error:'GRANT_NOT_LIVE'};
  return {ok:true,receiptId:id,grantId:grant.id,assetId:grant.asset_id,
          digest:grant.content_sha256,content};
}
