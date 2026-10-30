import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';

// Server-only, allowlisted Bradbury reads. Never submit a write from an API route.
const GENESIS = '0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4';
const address = v => /^0x[0-9a-fA-F]{40}$/.test(v || '');
const id = v => /^\d{1,8}$/.test(String(v ?? '')) && Number(v) > 0 && Number(v) <= 100000000;
const txhash = v => /^0x[0-9a-fA-F]{64}$/.test(v || '');
const RIGHTS = process.env.RIGHTRAIL_RIGHTS_ADDRESS || '';
const GATE = process.env.RIGHTRAIL_GATE_ADDRESS || '';
const RPC = process.env.RIGHTRAIL_NODE_RPC || '';
const configured = () => address(RIGHTS) && address(GATE) && /^https:\/\//.test(RPC);

function reject(res, code, error) {
  return res.status(code).json({ ok: false, error });
}
function noCache(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}
async function probe() {
  if (!/^https:\/\//.test(RPC)) return { verified: false, reason: 'Phase 2 node RPC not configured' };
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['0x0', false] }),
    signal: AbortSignal.timeout(9000) });
  if (!r.ok) return { verified: false, reason: 'RPC HTTP ' + r.status };
  const json = await r.json();
  const hash = json.result?.hash?.toLowerCase();
  return { verified: hash === GENESIS, reason: hash === GENESIS ? 'Bradbury Phase 2 verified by genesis hash' : 'RPC genesis mismatch or not available' };
}
function readClient() {
  // Explicit node URL is required for IC gen_call; the generic L2 RPC is insufficient.
  const chain = { ...testnetBradbury, rpcUrls: {
    ...(testnetBradbury.rpcUrls || {}),
    default: { http: [RPC] },
  } };
  return createClient({ chain });
}
export default async function handler(req, res) {
  noCache(res);
  if (req.method !== 'GET') return reject(res, 405, 'GET only');
  const op = String(req.query.op || 'config');
  if (op === 'config') {
    let check = { verified: false, reason: 'Not configured' };
    if (/^https:\/\//.test(RPC)) {
      try { check = await probe(); } catch { check = { verified: false, reason: 'RPC unavailable' }; }
    }
    return res.status(200).json({
      ok: true, configured: configured() && check.verified,
      network: 'Bradbury Phase 2', chainId: 4221,
      phase2Verified: check.verified, detail: check.reason,
      rights: address(RIGHTS) ? RIGHTS : null, gate: address(GATE) ? GATE : null,
      protectedContentConfigured: !!(process.env.RIGHTRAIL_CONTENT_TEXT && process.env.RIGHTRAIL_CONTENT_ASSET_ID)
    });
  }
  if (!configured()) return reject(res, 503, 'Bradbury contract addresses or node RPC not configured');
  try {
    const check = await probe();
    if (!check.verified) return reject(res, 503, check.reason);
    const client = readClient();
    const read = (addr, method, args) => client.readContract({
      address: addr, functionName: method, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL
    });
    let value;
    const n = Number(req.query.id);
    if (op === 'totals') {
      value = { rights: await read(RIGHTS, 'totals', []), gate: await read(GATE, 'stats', []) };
    } else if (op === 'asset' && id(req.query.id)) {
      value = await read(RIGHTS, 'get_asset', [n]);
    } else if (op === 'request' && id(req.query.id)) {
      value = await read(RIGHTS, 'get_request', [n]);
    } else if (op === 'permit' && id(req.query.id) && address(req.query.actor)) {
      value = await read(RIGHTS, 'permit_status', [n, req.query.actor]);
    } else if (op === 'gate' && id(req.query.id) && address(req.query.actor)) {
      value = await read(GATE, 'can_access', [n, req.query.actor]);
    } else if (op === 'receipt' && id(req.query.id) && address(req.query.actor)) {
      value = await read(GATE, 'receipt_for', [n, req.query.actor]);
    } else if (op === 'hasReceipt' && id(req.query.id) && address(req.query.actor)) {
      value = await read(GATE, 'has_access_receipt', [n, req.query.actor]);
    } else if (op === 'tx' && txhash(req.query.hash)) {
      const tx = await client.getTransaction({ hash: req.query.hash });
      const status = tx.statusName || tx.status || 'UNKNOWN';
      const result = tx.txExecutionResultName || tx.consensus_data?.leader_receipt?.[0]?.execution_result || null;
      return res.status(200).json({ ok: true, status, execution: result, found: true });
    } else {
      return reject(res, 400, 'Unsupported read method or invalid parameters');
    }
    return res.status(200).json({ ok: true, value });
  } catch (e) {
    return reject(res, 502, 'Read unavailable: ' + String(e?.message || 'RPC error').slice(0, 170));
  }
}
