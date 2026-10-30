# RIGHTRAIL deployment — stable GenLayer Studio (61999)

Studio: https://studio.genlayer.com · RPC: https://studio.genlayer.com/api · Explorer: https://explorer-studio.genlayer.com

**Status: BOTH RightsRail and RightsAccessGate deployed, with their published sources and constructor link verified on-chain.** The new RC network failure is documented in [the schema blocker report](GENVM_SCHEMA_BLOCKER_2026-10-30.md). Porting to Studionet does not prove the contract will deploy. The two Python contracts use the stable legacy runner; their unparameterized `TreeMap()` assignments were removed because typed storage maps are zero-initialized.

## Read-only checks before signatures

```bash
npm install
npm test
npm run build
python -m py_compile contracts/*.py
python -m unittest discover -s tests -p 'test_*.py' -v
npm run preflight:studionet
```

Require BOTH schema checks to pass. In Studio 61999, inspect `rights_rail.py` and `access_gate.py` in Run/Debug. If anything fails, stop rather than signing blind. Offline unit tests are not actual GenVM execution.

## Deploy with the user's wallet (no private keys in chat)

1. **DONE, do not redeploy:** RightsRail at `0xef37288aB08A30697841C4fFe93C1D71E23C464b`. Latest-final `totals()` returned `{"assets":0,"requests":0}`, deployed schema verified. See [live verification](STUDIONET_LIVE_EVIDENCE.md). RightsRail deployment TX `0x6a9020c45ba101535d675022063545854ef289a32f5e83a7b530b51d31f11011` was subsequently verified.
2. **DONE, do not redeploy:** RightsAccessGate at `0xCA57aF8cEe6d83029700A859cBaf93506839364E`, its latest-final `stats()` confirms the constructor references RightsRail and current receipt count 0. [Independent live pair audit](https://github.com/bearbaba/RIGHTRAIL/actions/runs/41051709427). Preserve full Gate deploy TX hash from Studio's transaction detail before final submission.
3. **DONE:** Configured Vercel project `rightrail` with both verified addresses and the exact RPC `https://studio.genlayer.com/api`. Never reuse Bradbury addresses.
4. Redeploy Vercel after environment changes and confirm `/api/state?op=config` returns `configured:true`, `studionetVerified:true`, `chainId:61999`. Verify real `totals` reads.
5. Only if using the optional private-content pilot, set server-only `RIGHTRAIL_CONTENT_ASSET_ID` and `RIGHTRAIL_CONTENT_TEXT` with SHA-256 equal to the registered content digest.

## Single-video final acceptance

1. Creator publishes exact hash and versioned policy; finalized `get_asset` readback.
2. Separate requester signs `request_usage`, finalized `get_request` readback.
3. GenLayer comparative AI adjudicates; require finalized persisted `PERMIT` (not just SUCCESS).
4. Separate Gate `can_access` true, wallet-signed `record_access` and persisted `receipt_for`. Unlock pilot resource only on valid live permit + receipt + signed proof.
5. Demonstrate `DENY` and ambiguous `REVIEW` deny access; wrong-wallet and duplicate receipt reject.
6. Creator updates policy; old permits/receipts immediately lose authority. Record TX hashes, finality, contract method schemas, and video.

The prior accepted RELYNX IC and ongoing RELYNX Console submission are completely separate. No re-submission or duplicate score for RELYNX is claimed. Testnet only; no legal copyright certification, no security audit or mainnet readiness.

## Synthetic protected-content pilot

The Vercel project now includes `RIGHTRAIL_CONTENT_ASSET_ID=1` and server-only `RIGHTRAIL_CONTENT_TEXT`, hashed as `2d136099dbe0ae1d822d94716b235b43d026ca70a49812cc25b89dfbe6663b7f`. After confirming chain totals still have 0 assets, Publish asset → **Use pilot example** creates a claim whose digest matches that server asset. Follow the [single-video runbook](SINGLE_VIDEO_REHEARSAL.md). If Asset #1 is created with a different digest, access remains denied: never claim the pilot works by changing records or disguising the mismatch.
