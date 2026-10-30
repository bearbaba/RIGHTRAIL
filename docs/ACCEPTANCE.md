# RIGHTRAIL — One-video Project acceptance

**Desired result:** one continuously understandable recording showing a new content policy, AI adjudication, actual access enforcement, a rejected action and policy invalidation, all signed on *Bradbury Phase 2*.

## Evidence scenes (do not stage fake data)

| Scene | Expected effect | Proof |
| --- | --- | --- |
| Creator publishes content policy | One new registered asset | publish_asset hash, FINALIZED/SUCCESS, get_asset readback |
| Requester submits legitimate use | One PENDING request | request_usage hash, actor/address readback |
| AI validators adjudicate | PERMIT for clearly allowed use | adjudicate hash + consensus output + persisted request |
| Separate Gate used | One wallet-bound receipt | record_access hash + receipt_for readback |
| Protected resource accessed | HTTP 200 only for verified signer + correct current policy | Valid EIP-191 proof + matching SHA-256 |
| Prohibited request | DENY / blocked gate | GenLayer result; no new receipt |
| Ambiguous sponsored use | REVIEW / blocked gate | GenLayer result; no new receipt |
| Creator changes policy | Prior permit/receipt no longer effective | update_policy transaction + fresh failed read/unlock |
| Malicious replay or wrong wallet | No access | denied server response + original on-chain state unchanged |

**Never claim a new AI verdict from a registration transaction.** Record exact receipts and hash links. If a transaction is delayed or missing, preserve the original submitted hash and clearly label the state UNKNOWN.

## Submission materials

- Source repository and README
- Two deployed IC addresses and precise Bradbury Explorer links
- CI, GenVM runtime/fee profiling reports
- Public dApp URL and a short English-captioned walkthrough
- Failure/counterexample evidence
- Reviewer guide with steps executable without access to the developer's private key

**Current status:** not ready for GenLayer Projects submission; contracts are not yet deployed or signed on Bradbury.
