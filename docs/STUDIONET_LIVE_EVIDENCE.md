# RIGHTRAIL Studionet — independent deployed contract readback (2026-10-30)

**Network:** stable GenLayer Studio / Studionet, chain 61999.  
**Deployed RightsRail:** `0xef37288aB08A30697841C4fFe93C1D71E23C464b`.  
**Studio import:** https://studio.genlayer.com/?import-contract=0xef37288aB08A30697841C4fFe93C1D71E23C464b  
**Explorer:** https://explorer-studio.genlayer.com/address/0xef37288aB08A30697841C4fFe93C1D71E23C464b  
**Reproducible check:** `node scripts/verify_rights_deployment.mjs`  
**CI proof:** https://github.com/bearbaba/RIGHTRAIL/actions/runs/41050634696

## Evidence and attribution

The user supplied an image of the Studio **Run and Debug** panel for `RIGHTRAIL.py`: `Deployed at 0xef...464b`, transaction `ACCEPTED` and `Contract deployed` in GenVM log. The full RightsRail deployment hash was later provided and independently read via Studionet: `0x6a9020c45ba101535d675022063545854ef289a32f5e83a7b530b51d31f11011`. Transaction status FINALIZED, execution SUCCESS, consensus Accepted. The deployed contract address from transaction `data.contract_address` is the same RightsRail address above. **This hash is NOT a deployment of RightsAccessGate.**

An independent unsigned CI job (using `genlayer-stable` / Studionet RPC) fetched the *deployed* contract source via `getContractCode`, parsed live schema via `getContractSchema`, then read `totals()` using `TransactionHashVariant.LATEST_FINAL`. This verified that the contract exists and finalized state is readable:

```json
{
  "verified": true,
  "chainId": 61999,
  "address": "0xef37288aB08A30697841C4fFe93C1D71E23C464b",
  "contract": "RightsRail",
  "localSourceSha256": "3377325fb9d9f55e8ef3f91993265552e0d26cacf8f56fc4e9f878c6313a5b2a",
  "deployedSourceSha256": "7d76c52f2ad55e107991335f4d0f42d6fa79ab2f7f41417fb51215b3cab4dfcb",
  "exactByteMatch": false,
  "normalizedSourceMatch": true,
  "finalizedTotals": {"assets": 0, "requests": 0}
}
```

**Source fidelity:** deployed code and current committed `contracts/rights_rail.py` match *after CRLF-to-LF conversion and trailing-whitespace trimming*. They do **not** match byte-for-byte. Never call this an exact byte match. No write transaction, non-deterministic AI consensus, or cross-contract permission enforcement was exercised by this job.

The deployed source exposes `adjudicate`, `get_asset`, `get_request`, `permit_status`, `policy_at`, `publish_asset`, `request_usage`, `retire_asset`, `totals`, `update_policy`, and `withdraw_request`.

## Next required evidence

1. Deploy `contracts/access_gate.py` **with `rights_contract` constructor set to the verified RightsRail address above**. Do not redeploy RightsRail. Confirm Gate deployment on Explorer and read `stats()` at latest-final state.
2. Set `RIGHTRAIL_GATE_ADDRESS` in Vercel; the RightsRail address is already staged as `RIGHTRAIL_RIGHTS_ADDRESS`. Redeploy and verify `/api/state?op=config`.
3. Perform actual signed app transactions: publish, request, AI adjudication (PERMIT / DENY / REVIEW), allow/block cross-contract Gate, durable receipt, duplicate and wrong-wallet rejection, policy invalidation, pilot protected-content unlock when provisioned. Preserve exact transaction hashes and readbacks before claiming a completed GenLayer Project.

RELYNX Console and its pending steward-requested changes are unrelated and must not be resubmitted as part of this project.


## Verified second deployment — RightsAccessGate (2026-10-30)

**Access Gate address:** `0xCA57aF8cEe6d83029700A859cBaf93506839364E`  
**Studio:** https://studio.genlayer.com/?import-contract=0xCA57aF8cEe6d83029700A859cBaf93506839364E  
**Explorer:** https://explorer-studio.genlayer.com/address/0xCA57aF8cEe6d83029700A859cBaf93506839364E  
**Reproducible audit:** `node scripts/verify_live_pair.mjs`  
**CI result:** https://github.com/bearbaba/RIGHTRAIL/actions/runs/41051709427

The user supplied a Studio screenshot of deployed `RightsAccessGate`, with FINALIZED deployment transaction in the UI and public methods `can_access`, `get_receipt`, `has_access_receipt`, `receipt_for`, `stats` and `record_access`. The exact Gate deploy TX hash was not supplied as text and must be retrieved from Explorer before final reviewer evidence.

Independent RPC verification fetched both deployed code blobs via `getContractCode`, inspected deployed schemas, and read `RightsRail.totals()` and `RightsAccessGate.stats()` using `LATEST_FINAL`:

```json
{
  "chainId": 61999,
  "rights": "0xef37288aB08A30697841C4fFe93C1D71E23C464b",
  "gate": "0xCA57aF8cEe6d83029700A859cBaf93506839364E",
  "totals": {"assets": 0, "requests": 0},
  "stats": {
    "receipts": 0,
    "rights_address": "0xef37288aB08A30697841C4fFe93C1D71E23C464b"
  },
  "latestFinal": true
}
```

**Source matching:** both contract files match their deployed sources after normalization, not byte-for-byte. Gate deployed code SHA-256: `3128ad6c17038c749678455296ec14f586d6af76d3f5f1101879fa065e2c7ecc`. Repo Gate SHA-256: `09f1814f40d4c4d2cd361d458ecf2de0dd49be8767bdc9805b48de6b7bfc1a18`. These differing hashes reflect line ending/trailing newline differences and must not be described as exact byte equivalence.

**Next:** verify Production config and read-only totals, then carry out user-wallet signed publish/request/AI adjudication/Gate receipt/policy invalidation tests. There are **no persisted AI decisions or access receipts yet**, and the project must not be submitted as an end-to-end verified application until those are demonstrated.
