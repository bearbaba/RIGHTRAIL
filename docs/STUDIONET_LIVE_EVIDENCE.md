# RIGHTRAIL Studionet — independent deployed contract readback (2026-10-30)

**Network:** stable GenLayer Studio / Studionet, chain 61999.  
**Deployed RightsRail:** `0xef37288aB08A30697841C4fFe93C1D71E23C464b`.  
**Studio import:** https://studio.genlayer.com/?import-contract=0xef37288aB08A30697841C4fFe93C1D71E23C464b  
**Explorer:** https://explorer-studio.genlayer.com/address/0xef37288aB08A30697841C4fFe93C1D71E23C464b  
**Reproducible check:** `node scripts/verify_rights_deployment.mjs`  
**CI proof:** https://github.com/bearbaba/RIGHTRAIL/actions/runs/41050634696

## Evidence and attribution

The user supplied an image of the Studio **Run and Debug** panel for `RIGHTRAIL.py`: `Deployed at 0xef...464b`, transaction `ACCEPTED` and `Contract deployed` in GenVM log. The screenshot did not expose the full deploy transaction hash or finality detail.

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
