# RIGHTRAIL — GenLayer Projects reviewer guide

**Project:** a two-contract dApp where GenLayer AI consensus determines a policy-scoped use request and a separate Gate + backend give that decision a consequential, wallet-bound access outcome.

## Entry points

- **Demo:** https://www.youtube.com/watch?v=VBQ-TrTiwCU
- **Web:** https://rightrail.vercel.app/
- **Repo:** https://github.com/bearbaba/RIGHTRAIL
- **Network:** Studionet 61999
- **RightsRail (consensus contract):** https://explorer-studio.genlayer.com/address/0xef37288aB08A30697841C4fFe93C1D71E23C464b
- **RightsAccessGate (cross-contract consequence):** https://explorer-studio.genlayer.com/address/0xCA57aF8cEe6d83029700A859cBaf93506839364E

## Implementation map

| User-facing action | Deployed method/backend | Persisted or checked consequence |
|---|---|---|
| Creator creates policy | `RightsRail.publish_asset()` | Asset ID, hash, owner and v1 policy pinned |
| Creator revises policy | `RightsRail.update_policy()` | Creator-only; policy version increments, prior requests invalidated |
| Requester asks for use | `RightsRail.request_usage()` | Wallet-bound request and pinned policy version |
| GenLayer AI review | `RightsRail.adjudicate()` | `gl.nondet.exec_prompt` + `gl.eq_principle.prompt_comparative` persist PERMIT/DENY/REVIEW |
| Gate checks current permission | `RightsAccessGate.can_access()` | Live `RightsRail.permit_status`, not a historical string match |
| Requester obtains receipt | `RightsAccessGate.record_access()` | One receipt per request/requester; duplicate and unauthorized attempts reject |
| Wallet verifies and opens content | `api/unlock` (protected server pilot) | EIP-191 signature, live allow, receipt and SHA-256; fail closed |

## Verified examples / IDs

- Aurora Education Pack: Asset **#1**, policy updated by its creator to **v3**.
- Current request **#4** under v3: **PERMIT**. Wallet `0xD6b8a3a5eB329410d9504784812b8569afA8C2aF`.
- Access Gate receipt **#2** for Request #4; recorded protected content reaches **ACCESS VERIFIED** with SHA-256 `2d136099dbe0ae1d822d94716b235b43d026ca70a49812cc25b89dfbe6663b7f`.
- Earlier Request #1 was PERMIT under v1 but became invalid under v2 despite retaining its historical Receipt #1. This is **asset-wide** invalidation, not monitoring or selective penalty for non-performance.
- The short demonstration is edited from genuine website footage and omits some waiting/signing details. Do not infer missing signature footage from editing alone.

## Independent checks

- Deployed source/schema and Gate constructor: https://github.com/bearbaba/RIGHTRAIL/actions/runs/41051709427
- Signed on-chain receipt #1 readback: https://github.com/bearbaba/RIGHTRAIL/actions/runs/41057189846
- Live previous v2 revision and Gate denial: https://github.com/bearbaba/RIGHTRAIL/actions/runs/41063113456
- Wrong-wallet access denied in Production: https://github.com/bearbaba/RIGHTRAIL/actions/runs/41058190687
- Current automated tests/build: https://github.com/bearbaba/RIGHTRAIL/actions/runs/41067255581
- Full code: [`contracts/rights_rail.py`](contracts/rights_rail.py), [`contracts/access_gate.py`](contracts/access_gate.py), [`src/main.js`](src/main.js), [`api/`](api/)

## Honest boundaries

Creator wallet self-assertion is not independently verified IP ownership; consensus interprets a proposed request, it does not guarantee real-world attribution compliance. Protected asset is a synthetic single-resource pilot, not DRM or a general file-storage platform. EIP-191 signed challenges are time-bounded, not exactly-once. `PERMIT` only controls access while the exact asset version remains active. `DENY` / `REVIEW` never grant access. No mainnet, legal certification, ownership transfer, escrow, or future-use monitoring is claimed.

MetaMask's malicious-website warning is under review, not cleared: https://github.com/MetaMask/eth-phishing-detect/issues/307121.
