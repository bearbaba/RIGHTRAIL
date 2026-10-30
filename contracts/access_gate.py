# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""RIGHTRAIL Access Gate — consequential, wallet-bound cross-contract receipts.

Deploy this only AFTER RightsRail and pass the actual address to its constructor.
Read-only permits do not create receipts. A successful signed action creates one
receipt for exactly one (request_id, actor) pair; repeated signatures roll back.
"""
from genlayer import *
import json


def _require(ok: bool, reason: str):
    if not ok:
        raise gl.vm.UserError(reason)


class RightsAccessGate(gl.Contract):
    rights_address: Address
    receipt_count: u256
    receipts: TreeMap[u256, str]
    by_request_actor: TreeMap[str, u256]

    def __init__(self, rights_contract: str):
        self.rights_address = Address(rights_contract)
        self.receipt_count = u256(0)

    def _key(self, request_id: int, actor: str) -> str:
        _require(request_id > 0, "invalid request")
        return str(request_id) + ":" + Address(actor).as_hex.lower()

    def _permitted(self, request_id: int, actor: str) -> bool:
        rights = gl.get_contract_at(self.rights_address)
        return bool(rights.view().permit_status(request_id, actor))

    @gl.public.view
    def can_access(self, request_id: int, actor: str) -> bool:
        # This is a fresh cross-contract read, not a cached decision.
        return self._permitted(request_id, actor)

    @gl.public.write
    def record_access(self, request_id: int, action_key: str) -> int:
        _require(4 <= len(action_key) <= 80, "action key length 4-80")
        actor = gl.message.sender_address.as_hex.lower()
        key = self._key(request_id, actor)
        _require(self.by_request_actor.get(key, u256(0)) == u256(0), "receipt already exists")
        _require(self._permitted(request_id, actor), "not permitted by current policy")
        self.receipt_count += u256(1)
        receipt_id = int(self.receipt_count)
        receipt = {
            "id": receipt_id, "request_id": request_id,
            "actor": actor, "action_key": action_key,
        }
        self.receipts[u256(receipt_id)] = json.dumps(
            receipt, sort_keys=True, separators=(",", ":")
        )
        self.by_request_actor[key] = u256(receipt_id)
        return receipt_id

    @gl.public.view
    def receipt_for(self, request_id: int, actor: str) -> str:
        index = self.by_request_actor.get(self._key(request_id, actor), u256(0))
        if index == u256(0):
            return ""
        return self.receipts[index]

    @gl.public.view
    def get_receipt(self, receipt_id: int) -> str:
        _require(receipt_id > 0 and receipt_id <= int(self.receipt_count), "receipt not found")
        return self.receipts[u256(receipt_id)]

    @gl.public.view
    def has_access_receipt(self, request_id: int, actor: str) -> bool:
        key = self._key(request_id, actor)
        # Old receipts lose effectiveness after policy edits or retirement.
        return (self.by_request_actor.get(key, u256(0)) != u256(0)
                and self._permitted(request_id, actor))

    @gl.public.view
    def stats(self) -> str:
        return json.dumps({"receipts": int(self.receipt_count),
                           "rights_address": self.rights_address.as_hex},
                          sort_keys=True)
