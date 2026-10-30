# RIGHTRAIL deployment — stable GenLayer Studio (61999)

Studio: https://studio.genlayer.com · RPC: https://studio.genlayer.com/api · Explorer: https://explorer-studio.genlayer.com

**Status: RIGHTRAIL is NOT deployed.** The new RC network failure is documented in [the schema blocker report](GENVM_SCHEMA_BLOCKER_2026-10-30.md). Porting to Studionet does not prove the contract will deploy. The two Python contracts use the stable legacy runner; their unparameterized `TreeMap()` assignments were removed because typed storage maps are zero-initialized.

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

1. Deploy `contracts/rights_rail.py`. Check FINALIZED and GenVM SUCCESS; read `totals()` (expected `{"assets":0,"requests":0}`). Record contract address and TX.
2. Deploy `contracts/access_gate.py`, passing verified RightsRail address as the string constructor `rights_contract`. Check FINALIZED and GenVM SUCCESS; `stats().rights_address` must match.
3. Configure Vercel project `rightrail` with `RIGHTRAIL_RIGHTS_ADDRESS` and `RIGHTRAIL_GATE_ADDRESS`. Delete a stale `RIGHTRAIL_NODE_RPC` or set it to exact `https://studio.genlayer.com/api`. Never reuse Bradbury addresses.
4. Redeploy Vercel and confirm `/api/state?op=config` returns `configured:true`, `studionetVerified:true`, `chainId:61999`. Verify real `totals` reads.
5. Only if using the optional private-content pilot, set server-only `RIGHTRAIL_CONTENT_ASSET_ID` and `RIGHTRAIL_CONTENT_TEXT` with SHA-256 equal to the registered content digest.

## Single-video final acceptance

1. Creator publishes exact hash and versioned policy; finalized `get_asset` readback.
2. Separate requester signs `request_usage`, finalized `get_request` readback.
3. GenLayer comparative AI adjudicates; require finalized persisted `PERMIT` (not just SUCCESS).
4. Separate Gate `can_access` true, wallet-signed `record_access` and persisted `receipt_for`. Unlock pilot resource only on valid live permit + receipt + signed proof.
5. Demonstrate `DENY` and ambiguous `REVIEW` deny access; wrong-wallet and duplicate receipt reject.
6. Creator updates policy; old permits/receipts immediately lose authority. Record TX hashes, finality, contract method schemas, and video.

The prior accepted RELYNX IC and ongoing RELYNX Console submission are completely separate. No re-submission or duplicate score for RELYNX is claimed. Testnet only; no legal copyright certification, no security audit or mainnet readiness.
