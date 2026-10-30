import { verifyMessage } from 'viem';

export function parseChallenge(message, signature, host, now = Date.now()) {
  if (typeof message !== 'string' || message.length > 380 || !/^0x[0-9a-fA-F]{130}$/.test(signature || '')) {
    throw new Error('Invalid wallet proof');
  }
  const lines = message.split('\n');
  if (lines.length !== 6 || lines[0] !== 'RIGHTRAIL ACCESS' ||
      lines[1] !== 'Host:' + host ||
      !/^Request:[1-9]\d{0,7}$/.test(lines[2]) ||
      !/^Actor:0x[0-9a-fA-F]{40}$/.test(lines[3]) ||
      !/^Issued:\d{13}$/.test(lines[4]) ||
      !/^Nonce:[0-9a-f]{32}$/.test(lines[5])) {
    throw new Error('Wallet challenge mismatch');
  }
  const requestId = Number(lines[2].slice(8));
  const actor = lines[3].slice(6);
  const issued = Number(lines[4].slice(7));
  if (Math.abs(now - issued) > 120000) throw new Error('Wallet proof expired');
  return { actor, requestId };
}
export async function verifyAccessChallenge({ message, signature, host, now = Date.now() }) {
  const result = parseChallenge(message, signature, host, now);
  if (!(await verifyMessage({ address: result.actor, message, signature }))) {
    throw new Error('Signature did not match requester');
  }
  return result;
}
