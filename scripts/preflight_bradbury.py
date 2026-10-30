#!/usr/bin/env python3
"""RIGHTRAIL Bradbury pre-deployment gate. No signing, no private keys, no GEN.

This tool FAILS CLOSED if a Bradbury Phase 2 node cannot parse both contract
ABIs. A healthy chain ID/genesis by itself does NOT make a contract deployable.
Requires curl in PATH (Git Bash on Windows includes curl).
"""
import argparse
import base64
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
GENESIS = "0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4"
NODE = "https://rpc-bradbury.genlayer.com"
CHAIN = "https://rpc.testnet-chain.genlayer.com"


def rpc(url: str, method: str, params: list):
    payload = json.dumps({"jsonrpc": "2.0", "id": 42, "method": method, "params": params})
    p = subprocess.run(
        ["curl", "--silent", "--show-error", "--fail-with-body", "--max-time", "55",
         "-H", "Content-Type: application/json", "--data-binary", "@-", url],
        input=payload, capture_output=True, text=True, timeout=65,
        check=False,
    )
    if p.returncode:
        raise RuntimeError(
            f"HTTP / connection failure to {url}: {p.stderr.strip()[:350]}"
            f" {p.stdout.strip()[:120]}"
        )
    try:
        reply = json.loads(p.stdout)
    except ValueError as ex:
        raise RuntimeError(f"Malformed JSON-RPC response: {p.stdout[:200]!r}") from ex
    if reply.get("error"):
        error = reply["error"]
        raise RuntimeError(
            f"{method} returned JSON-RPC error {error.get('code')}: "
            + str(error.get("message", "unknown"))[:500]
        )
    return reply.get("result")


def check_network(node: str):
    for name, endpoint in [("GenLayer Node", node), ("GenLayer Chain", CHAIN)]:
        chain = rpc(endpoint, "eth_chainId", [])
        block = rpc(endpoint, "eth_getBlockByNumber", ["0x0", False])
        genesis = (block or {}).get("hash", "").lower()
        if int(chain, 16) != 4221 or genesis != GENESIS:
            raise RuntimeError(
                f"{name}: WRONG NETWORK, chainId={chain}, genesis={genesis}. "
                "STOP; Bradbury Phase 1 also uses chain ID 4221."
            )
        print(f"[PASS] {name}: chain 4221 and exact Phase 2 genesis confirmed.")


def check_source(node: str, path: Path):
    source = path.read_bytes()
    payload = base64.b64encode(source).decode("ascii")
    schema = rpc(node, "gen_getContractSchema", [{"code": payload}])
    methods = schema.get("methods", {}) if isinstance(schema, dict) else {}
    if not methods:
        raise RuntimeError("No method schema returned; refusing to deploy.")
    print(f"[PASS] {path.name}: GenVM schema parsed, methods: {', '.join(sorted(methods))}")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--node", default=NODE, help="Trusted GenLayer Node RPC URL")
    args = p.parse_args()
    if not args.node.startswith("https://"):
        p.error("A HTTPS node URL is required")
    try:
        check_network(args.node)
        for rel in ["contracts/rights_rail.py", "contracts/access_gate.py"]:
            check_source(args.node, ROOT / rel)
    except Exception as ex:
        print(f"\n[BLOCKED] Bradbury deployment preflight failed: {ex}", file=sys.stderr)
        print("Do NOT sign or retry deploy until this check passes. No transaction was sent.", file=sys.stderr)
        return 1
    print("\n[PASS] Source schema preflight passed. Proceed to wallet-controlled "
          "deployment ONLY with appropriate fee estimates and independent validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
