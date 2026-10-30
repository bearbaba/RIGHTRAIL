# RIGHTRAIL — Bradbury Phase 2 deployment runbook

This is a **future acceptance checklist**, not a claim that a deployment already happened.

## Live preflight status — 30 October 2026

**DEPLOYMENT BLOCKED — do not sign yet.** Two independent Bradbury endpoints return the correct Phase 2 chain ID (4221) and genesis hash. However the GenLayer Node RPC currently reports

\`\`\`text
gen_getContractSchema -> JSON-RPC -32000:
VMError: invalid_contract runner malformed
\`\`\`

for **both RIGHTRAIL sources**, and it also reports the same error for the **exact minimal Base64 contract from GenLayer's official API documentation**. We tested both the older Studionet runner pin and a recent v0.3 Studio-dev pin: neither cleared this error. This does not by itself establish a defect in either RIGHTRAIL source; the node's GenVM/schema path may be unavailable or incompatible. AST lint passed, 15 local/model tests passed, but **full GenVM semantic validation is not yet verified** (the currently released gltest attempts to download an obsolete GenVM asset).

A signed deployment would spend GEN before this uncertainty is resolved. **No RIGHTRAIL contract has been deployed on Bradbury and no deploy transaction hash exists.**

To recheck without funding a wallet or submitting any transaction:

\`\`\`bash
git clone https://github.com/bearbaba/RIGHTRAIL.git
cd RIGHTRAIL
python scripts/preflight_bradbury.py
\`\`\`

**Proceed only if this prints \`[PASS]\` for both contract schemas.** If it reports \`[BLOCKED]\`, do not try to work around the error by using the Chain RPC, by changing a wallet's chain ID alone, or by signing deployment repeatedly. Verify the supported runner/GenVM runtime against the GenLayer Phase 2 release notes or contact GenLayer DevRel with the reproducible unsigned JSON-RPC result.

After preflight passes, obtain test GEN from the official faucet and use your own wallet (never share a private key). In a local desktop terminal with a web browser:

\`\`\`bash
npm install -g genlayer@0.40.0-rc.5
genlayer network set testnet-bradbury
genlayer network info

# Always explicitly target GenLayer Node RPC for Intelligent Contracts.
genlayer deploy --contract contracts/rights_rail.py --rpc https://rpc-bradbury.genlayer.com --wallet browser --fee-preset standard
# Verify FINALIZED + successful execution and read back the new RightsRail address.
genlayer deploy --contract contracts/access_gate.py --rpc https://rpc-bradbury.genlayer.com --wallet browser --fee-preset standard --args "<VERIFIED_RIGHTSRAIL_ADDRESS>"
\`\`\`

The CLI's \`--wallet browser\` launches a local browser bridge for the wallet to authorize. This **cannot run headlessly on Vercel**; we tried and the browser opener was absent. The CLI commands above are **not** evidence that the contract is deployed and are subject to the successful schema preflight and network-specific fee/GenVM validation. Deploy RightsRail first, then pass its verified address to Gate. Never automatically retry a transaction whose hash already exists.


## Network facts

- Bradbury Phase 2 **chain ID 4221**. That number is shared with older Bradbury deployments.
- Required **genesis hash**: \`0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4\`.
- Current GenLayer phase2 node endpoint must be verified against that hash **before using a wallet or funding**. GenLayer Chain RPC (\`eth_*\`) is not a replacement for GenLayer Node RPC (\`gen_call\`).
- SDK family: \`genlayer-js@2.0.0-rc.2\`, matching v0.6. Use the compatible release-candidate CLI v0.40 rather than stable tooling.
- Faucet: https://testnet-faucet.genlayer.foundation/
- Explorer: https://scan.bradbury.genlayer.com/
- Official docs: https://docs.genlayer.com/developers/networks

## Pre-deployment

1. From a local, trusted shell install the **exact CLI RC** documented by GenLayer; check \`genlayer network list\`, \`genlayer network set testnet-bradbury\`, and \`genlayer network info\` for RPC, chain and consensus addresses.
2. Verify block zero and current AddressManager against the official Phase 2 network page; do **not** rely on chain ID alone.
3. Obtain testnet GEN in the developer wallet. Do not put its private key in GitHub, Vercel env or chat.
4. Run \`npm test\`, \`npm run build\`, \`python3 -m py_compile contracts/*.py\` and actual \`gltest\`/GenVM runtime tests using the Phase 2-compatible GenVM/CLI. **Python syntax compilation is not a GenVM validation test.**
5. Generate/measure fee profiles for publishing, requests, nondeterministic adjudication (the expensive branch), policy update, retire, and Gate writes. Store the measured profile; no estimated numbers should be invented.

## Deployment order

\`\`\`bash
genlayer network set testnet-bradbury
genlayer network info
genlayer deploy --contract contracts/rights_rail.py
# Verify FINALIZED AND execution SUCCESS, save confirmed address + TX.
genlayer deploy --contract contracts/access_gate.py
# Constructor: rights_contract = <confirmed RightsRail address>.
# Verify FINALIZED AND execution SUCCESS, save confirmed Gate address + TX.
\`\`\`

**Important:** the exact CLI constructor/fee flags can vary by RC; check \`genlayer deploy --help\` for your installed pinned version. Do not reuse an address from Studionet or an old Bradbury deployment. If submission returns a hash and then loses connection, resume that hash rather than automatically deploying twice.

## Configure app

Set on Vercel Production and Preview (where appropriate):
- \`RIGHTRAIL_NODE_RPC\`: verified GenLayer **node** HTTPS endpoint for Phase 2 (keep auth/private URL server side).
- \`RIGHTRAIL_RIGHTS_ADDRESS\`: successful RightsRail address.
- \`RIGHTRAIL_GATE_ADDRESS\`: successful Gate address.
- For a single pilot protected resource only: \`RIGHTRAIL_CONTENT_ASSET_ID\` and \`RIGHTRAIL_CONTENT_TEXT\`. The text's SHA-256 must **exactly equal** the digest committed during asset creation; do not use public GitHub source as a private resource.

Redeploy after setting variables. Call \`/api/state?op=config\` and require \`configured=true\` and \`phase2Verified=true\`. Then test \`/api/state?op=totals\`. These APIs must fail closed if RPC identity is mismatched.

## Single-video acceptance

1. Creator connects on chain 4221 and publishes a sample asset. Confirm both wallet TX and \`get_asset(id)\` readback; store the content hash.
2. A separate requester submits a **free educational** use with attribution. Sign \`adjudicate(id)\`; require validators' \`PERMIT\` and request state readback before proceeding.
3. Gate \`can_access(id, requester)\` returns true. The requester signs \`record_access(id, action_key)\`; verify exactly one wallet-bound receipt persisted.
4. A wallet-bound proof unlocks the privately provisioned content through \`/api/unlock\` only after fresh latest-final permit and receipt checks. Another wallet or request must be rejected.
5. A clearly prohibited paid advertisement request yields \`DENY\`. A sponsored or ambiguous educational request yields \`REVIEW\`. Neither can write a Gate receipt.
6. Creator revises the policy. Both the old PERMIT and the old receipt must immediately lose effectiveness; content gateway denies further access.
7. Attempt duplicate receipt, wrong wallet, tampered request ID, policy-version mismatch, invalid digest, missing nonce and reused expired wallet proof. All must fail safely.
8. Confirm exact transaction hashes, block/network identity, finalization, execution result and new state on Bradbury Explorer. Record successful and denied flows transparently.

Do **not** create a fictitious receipt or claim that the project is live before this checklist passes.
