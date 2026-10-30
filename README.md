# RIGHTRAIL — Intelligent Rights & Permission Network

**Define rights. Request usage. Verify permission.**

RIGHTRAIL is a separate GenLayer dApp where a creator publishes a content SHA-256 and a versioned policy, another wallet signs a use request, AI consensus adjudicates PERMIT / DENY / REVIEW, and a separate RightsAccessGate enforces a final permit with one wallet-bound on-chain receipt. Updating the creator policy invalidates old permissions and receipts.

**Network target:** stable GenLayer **Studionet chain 61999**. **Deployment status: Both RightsRail and RightsAccessGate are deployed and independently verified via latest-final Studionet reads.** RightsRail deployment TX: [`0x6a9020…f11011`](https://explorer-studio.genlayer.com/tx/0x6a9020c45ba101535d675022063545854ef289a32f5e83a7b530b51d31f11011). Do **not** treat this as the Gate TX. Source, frontend and backend migrated from Bradbury's release-candidate SDK to the same stable SDK used by RELYNX Console: `genlayer-stable` = `genlayer-js@1.1.8`.

- Website: https://rightrail.vercel.app/
- Repository: https://github.com/bearbaba/RIGHTRAIL
- Studio: https://studio.genlayer.com
- [Safe deployment and one-video acceptance](docs/STUDIONET_DEPLOYMENT.md)
- [Studionet RightsRail live verification](docs/STUDIONET_LIVE_EVIDENCE.md)
- [Security and limitations](docs/SECURITY.md)
- [Older Studio Dev / Bradbury schema failure](docs/GENVM_SCHEMA_BLOCKER_2026-10-30.md)

Run `npm install && npm test && npm run build` plus Python model tests. Use `npm run preflight:studionet` to check both contract schemas without spending GEN. RightsRail address: `0xef37288aB08A30697841C4fFe93C1D71E23C464b`. Verified Access Gate: `0xCA57aF8cEe6d83029700A859cBaf93506839364E` (its `stats().rights_address` matches RightsRail). Both addresses and the Studionet RPC are configured in Vercel. Verified source and constructor evidence: [linked live audit](https://github.com/bearbaba/RIGHTRAIL/actions/runs/41051709427). **Signed application flows and comparative AI decisions are still pending**; do not submit as a completed project until those pass.

The web app is now configured for real chain reads and wallet-signed testnet operations; only the actual user's signing and finalized readbacks can establish AI decisions and receipts. Never show fake signed transactions or AI outcomes. Its optional protected-resource pilot independently checks latest-final on-chain permission, Gate receipt, wallet signature and content SHA-256.

Creator rights are self-asserted, not a copyright certificate. No custodial funds, no legal license, no mainnet claims. RIGHTRAIL is **independent of RELYNX Console**, whose ongoing submission must not be resubmitted as part of this migration. The old Bradbury deployment instructions are kept for historical investigation only.
