"""Deterministic Python model tests for RIGHTRAIL's state transitions.

This deliberately uses a tiny fake GenLayer host to check business-code guards.
It is NOT an on-chain GenVM, validator consensus, or fee-profile test.
"""
import importlib.util
import json
import pathlib
import re
import sys
import types
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
ISSUER = "0x" + "1" * 40
REQUESTER = "0x" + "2" * 40
ATTACKER = "0x" + "3" * 40
RIGHTS_ADDR = "0x" + "4" * 40


class UserError(Exception):
    pass


class Address(str):
    def __new__(cls, value):
        if not re.fullmatch(r"0x[0-9a-fA-F]{40}", str(value)):
            raise ValueError("invalid address")
        return str.__new__(cls, str(value).lower())

    @property
    def as_hex(self):
        return str(self)


class GenStorage(dict):
    def __class_getitem__(cls, item):
        return cls


class Public:
    @staticmethod
    def view(fn):
        return fn

    @staticmethod
    def write(fn):
        return fn


class Eq:
    def __init__(self):
        self.verdict = "PERMIT"

    def prompt_comparative(self, fn, principle):
        return fn()


class Nondet:
    def __init__(self, eq):
        self.eq = eq

    def exec_prompt(self, _):
        return self.eq.verdict


class Contract:
    def view(self):
        return self


eq = Eq()
msg = types.SimpleNamespace(sender_address=Address(ISSUER))
vm = types.SimpleNamespace(UserError=UserError)
world = {}
gl = types.SimpleNamespace(
    Contract=Contract, public=Public, message=msg, vm=vm,
    eq_principle=eq, nondet=Nondet(eq),
    get_contract_at=lambda address: world[str(address)]
)
fake = types.ModuleType("genlayer")
fake.gl = gl
fake.TreeMap = GenStorage
fake.u256 = int
fake.Address = Address
sys.modules["genlayer"] = fake


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "contracts" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


rights = load("rights_contract_model", "rights_rail.py")
gate_module = load("gate_contract_model", "access_gate.py")


class ContractModelTests(unittest.TestCase):
    def setUp(self):
        msg.sender_address = Address(ISSUER)
        eq.verdict = "PERMIT"
        self.rail = rights.RightsRail()
        self.rail.assets = {}
        self.rail.requests = {}
        world[RIGHTS_ADDR] = self.rail
        self.gate = gate_module.RightsAccessGate(RIGHTS_ADDR)
        self.gate.receipts = {}
        self.gate.by_request_actor = {}
        self.policy = ("Free educational community tutorials with visible creator credit "
                       "are permitted. Paid advertising, resale and AI model training "
                       "are not permitted. Sponsorship requests require manual review.")
        self.asset = self.rail.publish_asset("Demo rights asset", "a" * 64, self.policy)
        msg.sender_address = Address(REQUESTER)
        self.request = self.rail.request_usage(
            self.asset,
            "I will publish a free community learning tutorial with no sponsorship.",
            "Visible link to the creator in the opening paragraph"
        )

    def test_unauthorized_wallet_cannot_change_policy(self):
        with self.assertRaisesRegex(UserError, "owner only"):
            self.rail.update_policy(self.asset, self.policy + " Extra.")
        msg.sender_address = Address(ISSUER)
        self.assertEqual(self.rail.update_policy(self.asset, self.policy + " Extra."), 2)
        self.assertEqual(self.rail.get_asset(self.asset) and 2, 2)

    def test_valid_permit_and_single_wallet_receipt(self):
        eq.verdict = "PERMIT"
        self.assertEqual(self.rail.adjudicate(self.request), "PERMIT")
        self.assertTrue(self.rail.permit_status(self.request, REQUESTER))
        self.assertFalse(self.rail.permit_status(self.request, ATTACKER))
        self.assertTrue(self.gate.can_access(self.request, REQUESTER))
        self.assertEqual(self.gate.record_access(self.request, "demo-usage"), 1)
        self.assertTrue(self.gate.has_access_receipt(self.request, REQUESTER))
        with self.assertRaisesRegex(UserError, "already exists"):
            self.gate.record_access(self.request, "duplicate")
        msg.sender_address = Address(ATTACKER)
        with self.assertRaisesRegex(UserError, "not permitted"):
            self.gate.record_access(self.request, "spoofing")
        self.assertFalse(self.gate.has_access_receipt(self.request, ATTACKER))

    def test_policy_update_revokes_old_permission_and_receipt(self):
        self.rail.adjudicate(self.request)
        self.gate.record_access(self.request, "demo-usage")
        msg.sender_address = Address(ISSUER)
        self.rail.update_policy(self.asset, self.policy + " Policy v2.")
        self.assertFalse(self.rail.permit_status(self.request, REQUESTER))
        self.assertFalse(self.gate.can_access(self.request, REQUESTER))
        self.assertFalse(self.gate.has_access_receipt(self.request, REQUESTER))

    def test_ambiguous_consensus_output_does_not_grant_access(self):
        eq.verdict = "ALLOW THE USER"
        self.assertEqual(self.rail.adjudicate(self.request), "REVIEW")
        self.assertFalse(self.rail.permit_status(self.request, REQUESTER))
        with self.assertRaisesRegex(UserError, "not permitted"):
            self.gate.record_access(self.request, "forbidden")

    def test_denial_cannot_write_receipt(self):
        eq.verdict = "DENY"
        self.rail.adjudicate(self.request)
        with self.assertRaisesRegex(UserError, "not permitted"):
            self.gate.record_access(self.request, "denied")
        self.assertEqual(self.gate.receipt_count, 0)

    def test_request_is_evaluated_once_only(self):
        self.rail.adjudicate(self.request)
        with self.assertRaisesRegex(UserError, "already adjudicated"):
            self.rail.adjudicate(self.request)

    def test_retired_asset_blocks_active_request(self):
        msg.sender_address = Address(ISSUER)
        self.rail.retire_asset(self.asset)
        msg.sender_address = Address(REQUESTER)
        with self.assertRaisesRegex(UserError, "inactive"):
            self.rail.adjudicate(self.request)

    def test_bad_content_digest_fails_before_counter_increment(self):
        old_count = self.rail.asset_count
        with self.assertRaisesRegex(UserError, "SHA-256"):
            self.rail.publish_asset("Invalid demo", "0xBAD", self.policy)
        self.assertEqual(self.rail.asset_count, old_count)

    def test_pinned_version_rejects_old_pending_request(self):
        msg.sender_address = Address(ISSUER)
        self.rail.update_policy(self.asset, self.policy + " New version.")
        msg.sender_address = Address(REQUESTER)
        with self.assertRaisesRegex(UserError, "policy changed"):
            self.rail.adjudicate(self.request)


if __name__ == "__main__":
    unittest.main()
