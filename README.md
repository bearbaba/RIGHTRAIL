# RIGHTRAIL — AI-consensus usage rights and on-chain access control

**Define rights. Request usage. Verify permission.**

RIGHTRAIL is an open-source GenLayer Studionet dApp that links creator-declared, versioned usage policies to **consequential access to a protected synthetic resource**. A requester signs a usage request; a GenLayer Intelligent Contract independently adjudicates `PERMIT`, `DENY`, or `REVIEW` through comparative AI consensus. A separate Gate contract performs a fresh cross-contract permit check before persisting a wallet-bound access receipt. The protected-content API verifies live permission, matching receipt, an EIP-191 wallet signature, and the exact content SHA-256.

## Try it / reviewer links

- **App:** https://rightrail.vercel.app/
- **90-second edited demonstration (Creator + Requester):** https://www.youtube.com/watch?v=VBQ-TrTiwCU
- **Reviewer guide:** [REVIEWER.md](REVIEWER.md)
- **Network:** GenLayer Studionet, chain ID **61999** (testnet only)
- **RightsRail:** `0xef37288aB08A30697841C4fFe93C1D71E23C464b` — https://explorer-studio.genlayer.com/address/0xef37288aB08A30697841C4fFe93C1D71E23C464b
- **RightsAccessGate:** `0xCA57aF8cEe6d83029700A859cBaf93506839364E` — https://explorer-studio.genlayer.com/address/0xCA57aF8cEe6d83029700A859cBaf93506839364E
- **Source:** [contracts/rights_rail.py](contracts/rights_rail.py), [contracts/access_gate.py](contracts/access_gate.py), [src/main.js](src/main.js), [api/](api/)

## Real signed application workflow

1. Creator publishes Asset #1, **Aurora Education Pack**, including a local SHA-256 and an on-chain policy. The creator subsequently signs policy revisions; the current demonstrated version is **v3**.
2. A **different requester wallet** signs a detailed noncommercial educational-use request (Request **#4**) under policy v3.
3. `adjudicate(4)` compares AI decisions using `gl.eq_principle.prompt_comparative`; its persisted verdict is **PERMIT**. Text and policies remain untrusted inputs and ambiguity must resolve to **REVIEW**, not permission.
4. `RightsAccessGate` checks `RightsRail.permit_status()` against **latest policy state** and records a wallet-bound receipt (Receipt **#2** for Request #4). A historical receipt alone never grants current access.
5. The requester signs an EIP-191 message; the backend enforces current policy version, same-wallet request and receipt, validated signature and matching content digest. The recorded UI reaches **ACCESS VERIFIED** for the synthetic pilot content.

The edited demo shows the persisted request, consensus verdict, receipt and protected-content result. It omits some signature/waiting footage; it is not proof of every negative-path test. Full contract methods, source, and reproducible checks are linked below.

## Why GenLayer matters

Ordinary deterministic contracts cannot reliably interpret open-ended use clauses, attribution plans and exceptional cases. RightsRail locks the written policy and request version, has independent validators interpret the same inputs through GenLayer comparative consensus, and persists a decision that controls a separate on-chain Gate and a real backend response. This is a use-specific permission and access workflow, **not** a general web-page classifier.

## Policy revision and conservative denials

- Only the asset's creator wallet may call `update_policy` or `retire_asset`.
- Changing the asset's version invalidates every older request, even one historically marked PERMIT. Existing receipts remain archived but lose authority.
- Gate refuses unpermitted/wrong-wallet/duplicate receipt operations. Backend fails closed on invalid current permission, absent receipt, bad signature, chain mismatch, or digest mismatch.
- DENY and REVIEW do not grant permission. No contract monitors future user compliance, and changes are **asset-wide**, not selective per-user revocations.

## Tests and reproducible evidence

- [Current CI — 19/19 JavaScript tests and build](https://github.com/bearbaba/RIGHTRAIL/actions/runs/41067255581)
- [Deployed RightsRail + Gate schemas/source/constructor linked and read back](https://github.com/bearbaba/RIGHTRAIL/actions/runs/41051709427)
- [Earlier signed Gate receipt and cross-wallet verification](https://github.com/bearbaba/RIGHTRAIL/actions/runs/41057189846)
- [Prior asset policy v2 invalidated historical PERMIT and receipt](https://github.com/bearbaba/RIGHTRAIL/actions/runs/41063113456)
- [Production negative signed-wallet proof](https://github.com/bearbaba/RIGHTRAIL/actions/runs/41058190687)
- [Studionet live contract evidence (historical deployment snapshot)](docs/STUDIONET_LIVE_EVIDENCE.md)
- [Security boundaries](docs/SECURITY.md)

Local checks:

```bash
npm install
npm test
npm run build
python -m unittest discover -s tests -p 'test_*.py' -v
npm run preflight:studionet
```

CI and static unit tests do not substitute for independent on-chain finality or real wallet signatures. Deployment readbacks use `LATEST_FINAL`. Frontend signing verifies the resulting persisted state rather than treating a broadcast or `FINALIZED` alone as a successful decision.

## Scope and limitations

**Experimental testnet only.** The creator self-asserts control of the asset; RIGHTRAIL does **not** independently certify legal copyright ownership or issue an enforceable legal license. It protects **one configured synthetic server-side content asset**, not arbitrary uploads or universally copy-protected media. The short-lived EIP-191 proof is not a durable, one-use authentication session and must not be interpreted as DRM or a proof that the requester complied with their promised attribution. No escrow, custodial funds, token approvals, or production/mainnet guarantees.

MetaMask has displayed a malicious-site warning during signing; a [false-positive review request](https://github.com/MetaMask/eth-phishing-detect/issues/307121) is open, **not yet resolved**. Reviewers should independently evaluate trust and should never bypass a security warning merely because this README asks them to.

RIGHTRAIL is a distinct project from RELYNX / RELYNX Console; no duplicate contribution or recycled code submission is claimed.
