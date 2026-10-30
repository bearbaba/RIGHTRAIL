import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';
import { verifyAccessChallenge } from '../lib/access-proof.js';
import { createHash } from 'node:crypto';

const GENESIS = '0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4';
const RPC = process.env.RIGHTRAIL_NODE_RPC || '';
const RIGHTS = process.env.RIGHTRAIL_RIGHTS_ADDRESS || '';
const GATE = process.env.RIGHTRAIL_GATE_ADDRESS || '';
const CONTENT = process.env.RIGHTRAIL_CONTENT_TEXT || '';
const CONTENT_ID = Number(process.env.RIGHTRAIL_CONTENT_ASSET_ID || '0');
const address = s => /^0x[0-9a-fA-F]{40}$/.test(s || '');

function fail(res, status, code) {
  return res.status(status).json({ ok: false, error: code });
}
async function checkGenesis() {
  const response = await fetch(RPC, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: ['0x0', false], id: 2 }),
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.result?.hash?.toLowerCase() === GENESIS;
}
function reader() {
  const chain = { ...testnetBradbury, rpcUrls: {
    ...(testnetBradbury.rpcUrls || {}), default: { http: [RPC] }
  } };
  return createClient({ chain });
}
const parse = x => typeof x === 'string' ? JSON.parse(x) : x;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return fail(res, 405, 'POST only');
  if (!address(RIGHTS) || !address(GATE) || !RPC.startsWith('https://') ||
      !CONTENT || !Number.isSafeInteger(CONTENT_ID) || CONTENT_ID < 1) {
    return fail(res, 503, 'Protected content gateway is not configured');
  }
  try {
    if (!(await checkGenesis())) return fail(res, 503, 'Bradbury Phase 2 RPC not verified');
    const { message, signature } = req.body || {};
    let proof;
    try {
      proof = await verifyAccessChallenge({ message, signature, host: req.headers.host });
    } catch {
      return fail(res, 401, 'Invalid, expired, or mismatched wallet proof');
    }
    const { actor, requestId: id } = proof;
    const client = reader();
    const read = (address, functionName, args) => client.readContract({
      address, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL
    });
    const [permit, receipt, reqRecord] = await Promise.all([
      read(RIGHTS, 'permit_status', [id, actor]),
      read(GATE, 'has_access_receipt', [id, actor]),
      read(RIGHTS, 'get_request', [id])
    ]);
    const claim = parse(reqRecord);
    if (permit !== true || receipt !== true || claim.requester?.toLowerCase() !== actor.toLowerCase()) {
      return fail(res, 403, 'No currently valid on-chain permit and receipt');
    }
    if (claim.asset_id !== CONTENT_ID) return fail(res, 403, 'Protected asset not configured for this resource');
    const asset = parse(await read(RIGHTS, 'get_asset', [claim.asset_id]));
    const hash = createHash('sha256').update(Buffer.from(CONTENT, 'utf8')).digest('hex');
    if (asset.content_sha256 !== hash || !asset.active || asset.version !== claim.policy_version) {
      return fail(res, 403, 'Protected content digest or policy version mismatch');
    }
    return res.status(200).json({
      ok: true, assetId: asset.id, requestId: id, content: CONTENT,
      digest: hash, version: asset.version, access: 'VERIFIED'
    });
  } catch (error) {
    // Fail closed on every RPC / parsing / signature failure.
    return fail(res, 503, 'Cannot independently verify permission right now');
  }
}
