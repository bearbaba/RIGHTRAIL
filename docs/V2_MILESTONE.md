# RIGHTRAIL V2 — live lifecycle evidence and remaining verification

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

## Original evidence matrix (see subsequent evidence for completed checks)
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
Before submission, disclose any tests in this matrix that remain unverified.

## Deployment and asset evidence (2026-11-26)
- V2 gate: 0xfaf2E73666CBBa767790c0Dc84BB838446b23Df3.
- Deployment: 0x9086b548676cf35bf5d0cb386e81717ae78ac117afbe16ab75a5590d81e420b4 (user-supplied Explorer evidence: FINALIZED/SUCCESS).
- Independent live source (normalized line endings/trailing whitespace), schema and constructor: https://github.com/bearbaba/RIGHTRAIL/actions/runs/45750184145 . Latest-final grants=0, receipts=0 at readback.
- Asset #2 tx: 0x3c5ad50e8c97c04a821283eabbd5ac952aff696698b730bd2f0c61df163fc257; #3 tx: 0x153c8fb37dbfb27f7a15df245d6883af4aea001ee141ef26f090728e3b0032e4. Both reported FINALIZED/SUCCESS; neither has a recovered matching private fixture. Do not deliver content for them.
- New server-side synthetic fixture (exact value read back from encrypted Vercel env): expected asset #4, digest f12c180f71b61c4599103941c58378439eadc3107a6cc61802128aa22302511e. It must be registered and verified before access. If the actual ID differs, remap the server-side fixture. Never change a digest to disguise a mismatch.
- Redis must be dedicated to this project, on the Free plan. Standard KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are supported. Do not share TrustGate's store. Readiness indicates configuration only, not a successful concurrency test. No V2 wallet writes through the UI until a matching asset and store are configured.

## Production lifecycle evidence — 26 Nov 2026
- Request #5: https://rightrail.vercel.app/api/state?op=request&id=5 (finalized PERMIT; asset #4).
- Grant #1 issue: https://explorer-studio.genlayer.com/tx/0x19e3adb638f88bb118e05ca0c32ae8120592bb921e17f574cb1c84991c036e6c
- Receipt #1 consume: https://explorer-studio.genlayer.com/tx/0x05b5d4e379bc9085ef948932aab42c07cdd4f4398accae904941fced78af6308
- Grant #1 revoke: https://explorer-studio.genlayer.com/tx/0x3ada6c1d1c66ae8dd661fb3b7746be67d9c9b40512d8d4906006b2995c87b374
- All three hashes independently verified FINALIZED/SUCCESS by production API. User observed real protected delivery with exact digest before revocation. Grant retained one unused unit (1/2 used). Live revocation readback asserted in candidate CI.
- GET /api/v2-access now checks actual Redis PING and matching registered digest. PING alone is not a replay test.
- Optional Testnet replay test sends four identical signed POSTs concurrently with one signature. PASS requires one HTTP 200 and three HTTP 409 DELIVERY_ALREADY_CLAIMED without content. No persisted signature or new on-chain transaction for the duplicates. Actual user-run result recorded below.

## Grant #2 and concurrent replay — 26 Nov 2026
- Request #6: https://rightrail.vercel.app/api/state?op=request&id=6 (PERMIT, asset #4, same requester as #5).
- Grant #2 issue: https://explorer-studio.genlayer.com/tx/0xecdd8cae0e5f3b3fc77b74c4b5f379242c31b8196bb1f4d446a0adab01d44c76
- Receipt #2 consume: https://explorer-studio.genlayer.com/tx/0xe64c8caba7d13f3732407849f5d284a07aa13d4c0fc63c24e1231dec9ff1419d
- Both hashes independently confirmed FINALIZED/SUCCESS through production API. Grant #2 max_uses=1, used=1; receipt #2 use_number=1.
- **Observed user-run production replay test** (browser output, not an independent server-side log export): one signed proof submitted four times concurrently. Responses in submission order: 409 DELIVERY_ALREADY_CLAIMED (no content), 200 DELIVERED (content), 409 DELIVERY_ALREADY_CLAIMED (no content), 409 DELIVERY_ALREADY_CLAIMED (no content). Result PASS; exact SHA-256 verified by client. Production commit 22d953320ba0fb62846502db61f460a11ad3b859.
- Grant #1 independent revocation proof: https://github.com/bearbaba/RIGHTRAIL/actions/runs/45761302875 (canConsume=false, canDeliver=false).
- Remaining: live expiry proof independent of revocation/quota; separate-requester and separate-asset isolation; live negative DENY/REVIEW and duplicate challenge. Unit tests are not equivalent to those live tests. No mainnet, DRM or legal ownership guarantees.

## Distinct requester and expiry test — 26 Nov 2026
- Request #7: https://rightrail.vercel.app/api/state?op=request&id=7 — PERMIT for requester B, distinct from requester A.
- Grant #3 issue: https://explorer-studio.genlayer.com/tx/0x5b32710d37f34438ff56e78e6fdc964f3c6c390e8ae019760028e077c97811bf
- Receipt #3 consume: https://explorer-studio.genlayer.com/tx/0xcd3e11011ab5c2c73036233d834ac748046c36e2f32c79a7624f9bb2d995ac50
- Both transactions independently confirmed FINALIZED/SUCCESS. User reported ACCESS DELIVERED with exact digest for requester B, while requester A's Grant #1 remained revoked. Grant #3 has one unused unit; actual TTL 3600 seconds, expires 2026-11-26T06:43:25Z. Do not consume remaining quota or revoke during expiry test.
- Independent read-only regression now checks cross-actor denial and correct actor authorization before/after expiry, with policy still live. Post-expiry evidence remains pending until the actual read is performed after expiry. No claim of simultaneous pre-revocation grants; Grant #3 was issued after Grant #1 revocation.
