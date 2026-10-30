# RIGHTRAIL — Single-video Testnet acceptance (chain 61999)

**Do not spend another GenLayer Projects submission spot until all live checks pass.**

## Verified deployment and website
- RightsRail: `0xef37288aB08A30697841C4fFe93C1D71E23C464b`
- RightsAccessGate: `0xCA57aF8cEe6d83029700A859cBaf93506839364E`
- Live pair audit: https://github.com/bearbaba/RIGHTRAIL/actions/runs/41051709427
- Production API audit: https://github.com/bearbaba/RIGHTRAIL/actions/runs/41052260841
- Website: https://rightrail.vercel.app/
- Original synthetic pilot content is **server-only** in Vercel, configured as `RIGHTRAIL_CONTENT_ASSET_ID=1`. It is not public source code.
- Server content SHA-256: `2d136099dbe0ae1d822d94716b235b43d026ca70a49812cc25b89dfbe6663b7f`

## Single continuous flow

1. **Creator wallet**, chain 61999, choose **Publish asset → Use pilot example**. The sample title is **Aurora Education Pack**, and the source is a synthetic pilot resource. The exact policy is: `Free, non-commercial educational tutorials may use Aurora Education Pack content if the original creator is clearly credited with a visible link. Paid advertising, resale, and AI-model training are explicitly prohibited. Sponsored educational content requires separate manual approval. Any unclear or incomplete use must remain under review.`
2. Before signing, check `Registered assets = 0`. This pilot works only if the **newly created asset is #1**, and its `content_sha256` equals `2d136099dbe0ae1d822d94716b235b43d026ca70a49812cc25b89dfbe6663b7f`. Sign `publish_asset`, require FINALIZED / SUCCESS, inspect Asset #1 readback.
3. Change to **requester wallet** (not creator); select **Request permission** for Asset ID 1. Enter intended use: `I will publish a free, non-commercial community tutorial using the Aurora Education Pack without sponsorship or advertising. I will credit its creator prominently.` Attribution: `A visible link and creator credit in the opening paragraph of the tutorial.` Sign `request_usage` and verify exact requester in finalized state.
4. Sign `adjudicate(request_id)` and require a **persisted PERMIT** verdict. This is a *real AI comparative consensus step* and may occasionally produce REVIEW; don't falsify a response. Preserve transaction/validator evidence.
5. As the **same requester wallet**, open **Access & receipts**. Check exact request ID and Gate `can_access = true`, sign `record_access(request_id, 'aurora-edu-access-01')`, and verify `receipt_for(request_id, actor)` is persisted. Click **Verify wallet & unlock protected content** and sign the EIP-191 proof; require the content returned with exact digest above. Wrong wallets must be denied.
6. To demonstrate **DENY**, create another request for Asset #1: `I will resell this pack in a paid subscription and use the contents in commercial advertisements and AI model training.` Attribution: `Creator name in credits`. Record actual adjudication and Gate denial. No access receipt should be created.
7. To demonstrate **REVIEW**, request: `I would like to use this pack in a sponsored educational livestream but I have not obtained case-by-case permission from the creator.` Attribution: `Visible creator link in the livestream description`. Record actual adjudication and Gate denial.
8. Attempt a duplicate Gate receipt and a wrong-wallet Gate action, confirm an on-chain rollback. Then reconnect creator, sign a changed version-2 policy, and verify the **old PERMIT and its stored receipt no longer grant access**.
9. Save all finalized TX hashes, exact contract addresses, verdicts, acceptance/rollback receipts and API readbacks. One full video is sufficient if it transparently demonstrates the consequential path.

**Boundary:** This proves consent-based access to a specific content gateway, not verified copyright ownership, an NFT license, or preventing content copying. Server synthetic content is not sensitive. The EIP-191 access challenge is time-bound, not strictly once-only. Any omitted or failed step remains unverified rather than assumed successful.
