# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Scoped grants and atomic access accounting, anchored to the existing RightsRail."""
from genlayer import *
from datetime import datetime, timezone
import json
import re


def require(ok: bool, reason: str):
    if not ok:
        raise gl.vm.UserError(reason)


def encode(value: dict) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


class ScopedRightsGate(gl.Contract):
    rights_address: Address
    grant_count: u256
    receipt_count: u256
    grants: TreeMap[u256, str]
    receipts: TreeMap[u256, str]
    by_request: TreeMap[u256, u256]
    by_challenge: TreeMap[str, u256]

    def __init__(self, rights_contract: str):
        self.rights_address = Address(rights_contract)
        self.grant_count = u256(0)
        self.receipt_count = u256(0)

    def _rights(self):
        return gl.get_contract_at(self.rights_address).view()

    def _grant(self, grant_id: int) -> dict:
        require(0 < grant_id <= int(self.grant_count), "grant not found")
        return json.loads(self.grants[u256(grant_id)])

    def _live(self, grant: dict) -> bool:
        return (not grant["revoked"] and now() < grant["expires_at"]
                and bool(self._rights().permit_status(grant["request_id"], grant["actor"])))

    @gl.public.write
    def issue_grant(self, request_id: int, ttl_seconds: int, max_uses: int) -> int:
        require(request_id > 0, "invalid request")
        require(60 <= ttl_seconds <= 2592000, "ttl outside 60s-30d")
        require(1 <= max_uses <= 100, "uses outside 1-100")
        require(self.by_request.get(u256(request_id), u256(0)) == u256(0), "request already used")
        rights = self._rights()
        req = json.loads(rights.get_request(request_id))
        asset = json.loads(rights.get_asset(req["asset_id"]))
        owner = gl.message.sender_address.as_hex.lower()
        require(asset["owner"] == owner, "asset owner only")
        require(bool(rights.permit_status(request_id, req["requester"])), "no live AI permit")
        self.grant_count += u256(1)
        grant_id = int(self.grant_count)
        issued = now()
        grant = {"id": grant_id, "request_id": request_id, "asset_id": req["asset_id"],
                 "policy_version": req["policy_version"], "content_sha256": asset["content_sha256"],
                 "owner": owner, "actor": req["requester"], "usage": req["usage"],
                 "attribution": req["attribution"], "issued_at": issued,
                 "expires_at": issued + ttl_seconds, "max_uses": max_uses,
                 "used": 0, "revoked": False, "revoked_at": 0}
        self.grants[u256(grant_id)] = encode(grant)
        self.by_request[u256(request_id)] = u256(grant_id)
        return grant_id

    @gl.public.write
    def revoke_grant(self, grant_id: int) -> None:
        grant = self._grant(grant_id)
        require(grant["owner"] == gl.message.sender_address.as_hex.lower(), "asset owner only")
        require(not grant["revoked"], "already revoked")
        grant["revoked"] = True
        grant["revoked_at"] = now()
        self.grants[u256(grant_id)] = encode(grant)

    @gl.public.write
    def consume_access(self, grant_id: int, challenge_sha256: str) -> int:
        grant = self._grant(grant_id)
        actor = gl.message.sender_address.as_hex.lower()
        require(actor == grant["actor"], "requester only")
        require(bool(re.fullmatch(r"[0-9a-f]{64}", challenge_sha256)), "invalid challenge digest")
        require(self._live(grant), "grant not live")
        require(grant["used"] < grant["max_uses"], "quota exhausted")
        require(self.by_challenge.get(challenge_sha256, u256(0)) == u256(0), "challenge consumed")
        self.receipt_count += u256(1)
        receipt_id = int(self.receipt_count)
        grant["used"] += 1
        self.grants[u256(grant_id)] = encode(grant)
        self.receipts[u256(receipt_id)] = encode({
            "id": receipt_id, "grant_id": grant_id, "actor": actor,
            "asset_id": grant["asset_id"], "policy_version": grant["policy_version"],
            "content_sha256": grant["content_sha256"], "challenge_sha256": challenge_sha256,
            "consumed_at": now(), "use_number": grant["used"]})
        self.by_challenge[challenge_sha256] = u256(receipt_id)
        return receipt_id

    @gl.public.view
    def get_grant(self, grant_id: int) -> str:
        return encode(self._grant(grant_id))

    @gl.public.view
    def grant_for_request(self, request_id: int) -> int:
        return int(self.by_request.get(u256(request_id), u256(0)))

    @gl.public.view
    def get_receipt(self, receipt_id: int) -> str:
        require(0 < receipt_id <= int(self.receipt_count), "receipt not found")
        return self.receipts[u256(receipt_id)]

    @gl.public.view
    def receipt_for_challenge(self, challenge_sha256: str) -> int:
        return int(self.by_challenge.get(challenge_sha256, u256(0)))

    @gl.public.view
    def can_consume(self, grant_id: int, actor: str) -> bool:
        grant = self._grant(grant_id)
        return (grant["actor"] == Address(actor).as_hex.lower()
                and grant["used"] < grant["max_uses"] and self._live(grant))

    @gl.public.view
    def can_deliver(self, receipt_id: int, actor: str) -> bool:
        receipt = json.loads(self.get_receipt(receipt_id))
        grant = self._grant(receipt["grant_id"])
        return receipt["actor"] == Address(actor).as_hex.lower() and self._live(grant)

    @gl.public.view
    def stats(self) -> str:
        return encode({"grants": int(self.grant_count), "receipts": int(self.receipt_count),
                       "rights_address": self.rights_address.as_hex.lower()})
