# RIGHTRAIL — Intelligent Rights & Permission Network

**Define rights. Request usage. Verify permission.**

RIGHTRAIL is a new GenLayer project for creators, communities and AI-agent developers. It lets a wallet publish an immutable content digest and versioned natural-language usage policy; requesters sign a precise use case; GenLayer AI validators independently adjudicate the request; and a separate access gate enforces the final decision by writing a wallet-bound receipt.

**Stage:** Bradbury Phase 2 **builder preview — DEPLOYMENT BLOCKED by unsigned GenVM schema preflight (30 Oct 2026)**. Frontend, contracts and API source are pushed; deployment/build CI is connected. **Neither contract has been deployed on Bradbury**. The Node RPC verifies Phase 2 genesis but rejects both contract schemas and the official minimal contract sample with `VMError: invalid_contract runner malformed`. Do **not** spend test GEN deploying until `python scripts/preflight_bradbury.py` passes. See [current blocking evidence and safe deploy runbook](docs/BRADBURY_DEPLOYMENT.md). The web app must not claim on-chain success or release protected content until configured and independently verified. Do not submit to GenLayer Projects as a completed live contract app at this stage.

- **App:** https://rightrail.vercel.app/
- **Source:** https://github.com/bearbaba/RIGHTRAIL
- **Target network:** Bradbury Phase 2, chain ID **4221**
- **SDK:** pinned \`genlayer-js@2.0.0-rc.2\` for v0.6 protocol
- **Contracts:** [RightsRail](contracts/rights_rail.py) and [RightsAccessGate](contracts/access_gate.py)
- [Bradbury setup & deployment](docs/BRADBURY_DEPLOYMENT.md) · [Security boundaries](docs/SECURITY.md) · [Single-video acceptance](docs/ACCEPTANCE.md)

## Why RIGHTRAIL exists

Copyright and usage terms are often nuanced. Traditional contracts can store a yes/no flag but cannot reliably determine whether a sponsored tutorial counts as commercial use under a creator's written policy. RIGHTRAIL gives that interpretation to GenLayer's Equivalence Principle, then makes the result consequential for a separate wallet-bound authorization contract and an actual protected-resource gateway.

This is **permission to access a resource served by RIGHTRAIL**, not legal certification of copyright, permission to train foundation models, an NFT license, or a promise that someone cannot copy content after access.

## End-to-end roles

| Role | Writes | Reads |
|---|---|---|
| Creator | \`publish_asset\`, \`update_policy\`, \`retire_asset\` | Own asset and policy version |
| Requester | \`request_usage\`, \`withdraw_request\` | Own request, verdict |
| Any caller | \`adjudicate\` once per request | GenLayer-consensus result |
| Authorized requester | \`record_access\` via separate Gate | Proof of receipt and current permit |
| Content gateway | No wallet keys or chain writes | Verify fresh on-chain permit and receipt before returning server-side protected content |

## Key safety invariants

- The registering wallet is the *claimant* of creator rights, not a verified copyright owner.
- Asset policies are immutable **per version**. Only the original wallet may update or retire them.
- A new policy version invalidates all old requests and Gate receipts until new requests are approved.
- An adjudication snapshot binds an asset, its exact policy version, usage and attribution. A request can only be adjudicated once.
- \`PERMIT\` requires unambiguous policy permission. \`DENY\` and \`REVIEW\` never grant access.
- Validators independently evaluate the same policy/request using \`prompt_comparative\`. Agreement is about the **decision**, not free-form prose. The policy/request are untrusted text.
- The Gate does a **fresh cross-contract view** at the moment of signing, checks the exact actor, and rejects duplicate receipts for that request/actor.
- The content gateway verifies a short-lived EIP-191 signed message bound to request, wallet, and hostname; verifies two separate latest-final read results and the SHA-256 of privately provisioned content; every failure is fail-closed.
- No secret data, copyrighted source files, private keys or custodial funds appear in the repository.

## Local development

Node.js 22+.

\`\`\`bash
npm install
npm test
npm run build
npm run dev
\`\`\`

The builder preview works without deployed contracts. You can author a policy draft and calculate a local file's SHA-256 without uploading the file, but all chain signatures and protected-content unlocking are unavailable until the contracts and verified Bradbury RPC are configured. The dashboard never presents preview data as finalized chain records.

## Deployment status and environment

See [the step-by-step checklist](docs/BRADBURY_DEPLOYMENT.md). After deploying both ICs on verified Phase 2, set these **server-side** Vercel variables (never commit private keys):

\`\`\`env
RIGHTRAIL_NODE_RPC=https://<verified-Phase-2-GenLayer-node-RPC>
RIGHTRAIL_RIGHTS_ADDRESS=0x<deployed-RightsRail>
RIGHTRAIL_GATE_ADDRESS=0x<deployed-RightsAccessGate>
# Optional protected pilot content: only for one provisioned asset
RIGHTRAIL_CONTENT_ASSET_ID=1
RIGHTRAIL_CONTENT_TEXT=<private resource bytes that hash to the asset digest>
\`\`\`

**Do not use the generic GenLayer Chain L2 RPC for \`gen_call\`: it is not a GenLayer node.** The backend checks Bradbury Phase 2's block-0 hash before allowing reads. The actual node endpoint and fee profile must be established from current release notes and validated on chain.

The protected-resource feature is currently a **single-asset pilot using private Vercel environment data**; it is not yet multi-tenant object storage. The broader community release requires private storage, per-creator uploads, policies and abuse controls.

## Proof of progress

- Type-check/build coverage and real EIP-191 signature-boundary tests through GitHub Actions.
- Public preview deploy with clear pre-deployment state.
- Live Bradbury deployment IDs, signed tx hashes, consensus outputs, receipt readbacks and video: **pending**.
- A successful Vercel build or a passing JavaScript test does **not** prove successful GenLayer consensus or a deployed contract.

## Community roadmap

After Phase 2 on-chain acceptance: per-creator private object storage, scoped short-lived delivery tokens, abuse and rate controls, better wallet onboarding, English/Vietnamese localization and production security review. Mainnet only after threat modeling and repeated external-user testing.

License: MIT.
