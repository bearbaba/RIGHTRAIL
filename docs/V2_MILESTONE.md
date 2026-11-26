# RIGHTRAIL V2 — implementation candidate (not deployed)
Baseline: 4fa0b1cfdf0a1cf9ac1a06d1a8e85cf567f39737. V1 is untouched.
The new ScopedRightsGate anchors every grant to a live AI-adjudicated V1 request.
Only the asset issuer can create one bounded grant per permitted request. Requester
consumption atomically records a challenge digest and decrements the available
quota in the same contract state transition. Revocation affects one grant, while
V1 policy updates, withdrawal, or retirement invalidate all affected grants.
The grant scope is the original adjudicated usage and attribution; no claim of
new AI structured-output consensus is made. Time is transaction time, not wall clock.
No copyright ownership certification, DRM, or delivery guarantee.

## Release blockers
- Validate SDK pin/schema on current Studionet; deploy new gate with V1 rights address.
- Integrate signed host-bound challenge and FINALIZED receipt readback into gateway.
- Durable atomic delivery claim (one HTTP delivery per receipt), content digest and
  current grant checks; fail closed if replay store is absent. On-chain consumption
  alone does not prevent HTTP delivery replay. Do not expose V2 content through V1.
- Add dedicated V2 frontend and live wallet flows. Verify same-asset A/B grants,
  revoke A, B still works; DENY/REVIEW cannot issue; quota, expired, stale and replay.
- Record actual transaction hashes, source/schema readback and CI; no submission yet.
- Resolve existing MetaMask warning; don't bypass security warnings.
- No paid services, mainnet, or preview deployments.
Local Python stub tests exercise actual contract methods, not GenVM validation.
