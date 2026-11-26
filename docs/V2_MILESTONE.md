# RIGHTRAIL V2 — release candidate, NOT a verified live milestone

Baseline: main commit 4fa0b1cfdf0a1cf9ac1a06d1a8e85cf567f39737.
The existing AI-adjudicated RightsRail and legacy Access Gate are preserved.
The new ScopedRightsGate anchors scoped grants to a live V1 permit and atomically
consumes quota with a unique challenge receipt. Scope equals the original approved
usage and attribution; this does not add a second independent AI adjudication.
Time in the contract is transaction time; the delivery server checks wall-clock
expiry separately. The content server does not certify legal ownership or DRM.

## Setup (Studionet only; no paid services)
1. Run candidate CI and unsigned schema check. If schema fails, stop and fix the
   pinned GenVM SDK rather than deploying unchecked source.
2. Confirm the existing RightsRail address and source in Studionet Explorer.
   Deploy contracts/scoped_rights_gate.py using the current Studio UI; constructor
   rights_contract = the verified existing RightsRail address. Only user signs.
   Read stats() back at LATEST_FINAL and compare rights_address.
3. Create a dedicated synthetic V2 text asset (not the old V1 protected bytes).
   Compute SHA-256 locally, publish through V1 with a new asset ID and actual
   policy. A second V2 asset is required to verify resource isolation.
4. Set server-only production variables in Vercel:
   - RIGHTRAIL_V2_GATE_ADDRESS = verified new gate
   - RIGHTRAIL_RIGHTS_ADDRESS = verified V1 rights contract (existing)
   - RIGHTRAIL_V2_HOST = rightrail.vercel.app
   - RIGHTRAIL_V2_CONTENT_JSON = JSON object mapping finalized asset IDs to private text
   - RIGHTRAIL_V2_REDIS_URL / RIGHTRAIL_V2_REDIS_TOKEN = dedicated free Upstash REST store
   Do not put tokens or private content in GitHub or frontend variables.
   Confirm free quota, persistence and no eviction/reset during proof validity;
   fail closed on Redis errors. Claim keys expire after 24 hours, far beyond the
   maximum 20 minute signed proof lifetime. A reset or eviction during this
   period can undermine one-time delivery; this is a trust assumption.
5. Review changes, merge candidate after schema and CI pass. Deploy only production.
   GET /api/v2-access verifies configuration, network and contract linkage; it
   does not prove Redis health. Open /v2.html and use explicit wallet actions.

## Evidence matrix (not yet run on-chain)
- Creator, requester A, requester B, one shared asset, distinct PERMIT requests.
- DENY and REVIEW: grant issuance fails, no grant ID recorded.
- Issue two grants for same asset; owner-only issuance and revoke.
- A consumes a signed challenge; finalized receipt and quota readback.
- Send the exact same signed delivery request concurrently; exactly one HTTP 200,
  remaining requests denied. Verify actual Redis key and no content in failure body.
- A duplicate challenge fails on-chain. Wrong actor, wrong grant, mismatched digest,
  exhausted quota, expiry, stale policy and withdrawn request fail closed.
- Revoke A while B remains active, demonstrate A blocked and B delivers independently.
- Separate V2 asset verifies asset isolation; V1 unlock must not deliver V2 bytes.
- Record actual transaction IDs, final execution results, on-chain state snapshots,
  HTTP responses, CI links and demo video. No mock results in final submission.

## Security and release boundaries
Atomic on-chain quota consumption is distinct from atomic HTTP delivery claim.
A claim can be burned without successful delivery; no automatic refund. Revocation
is enforced at the latest finalized read, not at an impossible instantaneous atomic
boundary across blockchain, Redis and HTTP. Already downloaded content cannot be
recalled. No seed phrase, private key, token approvals, Mainnet or new paid service.
Existing MetaMask warning must be resolved; never bypass a security warning.
Do not submit the milestone until the real tests above are verified.
