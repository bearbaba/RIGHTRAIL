# RIGHTRAIL — Security boundaries

The **creator issuer is unverified**: wallet control and a hash do not establish copyright or authority to grant legal licensing rights. A malicious creator could publish policies for an asset they do not own. Claims should be labeled creator assertions, not certificates.

The GenLayer model is **consensus over policy interpretation**. Validators independently evaluate the *same* untrusted policy/request, so they may agree on a mistaken interpretation; it is not a judicial process. Adversarial instructions inside requests/policies must be treated as quoted data; ambiguous decisions must remain REVIEW with no access. A malicious or insufficiently measured fee profile may cause expensive or unresolved transactions.

Asset policy **version changes invalidate existing requests**. Access Gate receipts are bound to an EOA, request ID and the live permission state. No per-user grant can override retirement or a policy revision. A duplicate receipt for the same request/requester is rejected on chain.

Protected-content gateway must **fail closed** on any invalid or unavailable RPC data, unverified Studionet RPC identity, signature mismatch, wrong hostname, expired challenge, missing gate receipt, mismatched content digest, revoked policy version or missing secret.

The EIP-191 proof is reusable for up to two minutes by the original signing wallet or anyone possessing its signed message. It is a proof of wallet authorization, **not** an exactly-once session or a no-copy DRM mechanism. A distributed multi-tenant production deployment should use durable server-generated nonce storage, one-time claims, access logs and per-tenant isolation.

The single-asset secret from Vercel environment variables is a **pilot**. It is not a general-purpose file vault. Do not upload sensitive, copyrighted third-party or regulated user content until durable encrypted object storage, access logging, lifecycle management, quotas, scanning and threat review are implemented.

No owner private key, recovery phrase, RPC API key, signing service or demo secret may be committed. Never report SUCCESS from wallet confirmation or transaction finality alone. Read back a matching finalized state record.

RIGHTRAIL now requires official GenLayer Studionet (61999) RPC identity and correct signed contract addresses. A healthy chain ID alone does not prove a deployed contract or GenVM success.
