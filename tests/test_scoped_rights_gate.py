"""Exercise the actual V2 contract with a stub runtime; not GenVM consensus."""
import importlib.util
import json
import pathlib
import sys
import types
import unittest
from unittest.mock import patch

class Address:
    def __init__(self, value): self.as_hex = value.lower()

class TreeMap(dict):
    @classmethod
    def __class_getitem__(cls, args): return cls

class UserError(Exception): pass

OWNER = "0x" + "1"*40
A = "0x" + "2"*40
B = "0x" + "3"*40

class Rights:
    active = True
    def get_request(self, n):
        return json.dumps(dict(asset_id=1, policy_version=1, requester=A if n==1 else B,
                               usage="educational use", attribution="creator"))
    def get_asset(self, n):
        return json.dumps(dict(owner=OWNER, content_sha256="a"*64))
    def permit_status(self, n, actor):
        return self.active and n in (1,2) and actor == (A if n==1 else B)
    def view(self): return self

class TestScopedGate(unittest.TestCase):
    def setUp(self):
        self.rights = Rights()
        self.gl = types.SimpleNamespace(Contract=object, public=types.SimpleNamespace(
            write=lambda fn:fn, view=lambda fn:fn), vm=types.SimpleNamespace(UserError=UserError),
            message=types.SimpleNamespace(sender_address=Address(OWNER)),
            get_contract_at=lambda address:self.rights)
        runtime = types.ModuleType("genlayer")
        runtime.gl, runtime.Address, runtime.TreeMap, runtime.u256 = self.gl, Address, TreeMap, int
        path = pathlib.Path(__file__).parents[1]/"contracts"/"scoped_rights_gate.py"
        spec=importlib.util.spec_from_file_location("scoped_rights_gate_test",path)
        self.mod=importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules,{"genlayer":runtime}): spec.loader.exec_module(self.mod)
        self.clock=1000
        self.mod.now=lambda:self.clock
        self.g=self.mod.ScopedRightsGate(OWNER)
        for name in ("grants","receipts","by_request","by_challenge"):
            setattr(self.g,name,TreeMap())
    def actor(self,actor): self.gl.message.sender_address=Address(actor)
    def issue(self,n=1,ttl=60,uses=2): return self.g.issue_grant(n,ttl,uses)
    def test_selective_revocation(self):
        a,b=self.issue(),self.issue(2)
        self.actor(A)
        r=self.g.consume_access(a,"1"*64)
        self.assertTrue(self.g.can_deliver(r,A))
        self.actor(OWNER);self.g.revoke_grant(a)
        self.assertFalse(self.g.can_deliver(r,A))
        self.assertTrue(self.g.can_consume(b,B))
    def test_quota_and_replay(self):
        a=self.issue(uses=2);self.actor(A)
        self.g.consume_access(a,"1"*64)
        with self.assertRaisesRegex(UserError,"challenge consumed"):self.g.consume_access(a,"1"*64)
        r=self.g.consume_access(a,"2"*64)
        self.assertTrue(self.g.can_deliver(r,A))
        with self.assertRaisesRegex(UserError,"quota exhausted"):self.g.consume_access(a,"3"*64)
        self.assertEqual(json.loads(self.g.get_grant(a))["used"],2)
    def test_owner_and_wrong_wallet(self):
        self.actor(B)
        with self.assertRaisesRegex(UserError,"owner only"):self.issue()
        self.actor(OWNER);a=self.issue();self.actor(B)
        with self.assertRaisesRegex(UserError,"requester only"):self.g.consume_access(a,"1"*64)
        with self.assertRaisesRegex(UserError,"owner only"):self.g.revoke_grant(a)
        self.assertEqual(self.g.receipt_count,0)
    def test_expiry_and_stale_policy(self):
        a=self.issue();self.actor(A);r=self.g.consume_access(a,"1"*64)
        self.rights.active=False
        self.assertFalse(self.g.can_deliver(r,A))
        self.rights.active=True;self.clock=1060
        self.assertFalse(self.g.can_deliver(r,A))
        self.assertFalse(self.g.can_consume(a,A))
    def test_no_permit_no_grant(self):
        with self.assertRaisesRegex(UserError,"no live AI permit"):self.issue(3)
    def test_duplicate_request_and_bounds(self):
        for ttl,uses in [(59,1),(2592001,1),(60,0),(60,101)]:
            with self.assertRaises(UserError):self.issue(ttl=ttl,uses=uses)
        self.issue()
        with self.assertRaisesRegex(UserError,"request already used"):self.issue()
    def test_challenge_and_receipt_binding(self):
        a=self.issue();self.actor(A)
        with self.assertRaisesRegex(UserError,"invalid challenge"):self.g.consume_access(a,"bad")
        r=self.g.consume_access(a,"f"*64)
        self.assertEqual(self.g.receipt_for_challenge("f"*64),r)
        self.assertFalse(self.g.can_deliver(r,B))
        self.assertEqual(json.loads(self.g.get_receipt(r))["content_sha256"],"a"*64)
