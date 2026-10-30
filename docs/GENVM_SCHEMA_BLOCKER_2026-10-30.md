# GenLayer Studio Dev / Bradbury: schema introspection failure (2026-10-30)

**Status:** Reproduced; unsigned, read-only checks only. **Do not interpret this as evidence of a deployed RIGHTRAIL contract.**

## Environment

- Studio Dev chain ID **61997**, `https://studio-dev.genlayer.com/api`
- Bradbury Phase 2 chain ID **4221**, `https://rpc-bradbury.genlayer.com`
- Studio UI version shown: `v0.123.0-rc.8`
- GenVM introspector log: `v0.3.0-rc10-x86_64-linux-release`
- Client: `genlayer-js@2.0.0-rc.2`

## Observed behavior

In Studio Dev **Run and Debug** for `contracts/rights_rail.py`:

```text
Could not load contract schema
Unexpected error in gen_getContractSchemaForCode:
('execution failed', {'stdout':'', 'stderr':'', 'genvm_log': ...})
result: {"kind":"VM_ERROR","message":"invalid_contract runner malformed"}
```

The same result was independently reproduced using `getContractSchemaForCode(source)` on the official SDK; `genlayer-js` correctly dispatches **hex-encoded code** to Studio Dev via `gen_getContractSchemaForCode`. This is a distinct API shape from Bradbury, where the SDK uses **Base64 code** with `gen_getContractSchema`.

Reproduced with three minimal contracts, including runner pins:

- `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` (legacy)
- `py-genlayer:9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0`
- `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`

Even `getContractSchema(address)` against a **previously finalized Studio Dev contract** (`0x22473F53712A5cf944D8f7eDCc38681C28C1Ce16`, see [finalized deployment](https://explorer-studio-dev.genlayer.com/tx/0xaed25bf1b95614d61bc6e72306d594635758a2ecd5d7b52cc0ab18351cab33ba)) returned the **same error** on 2026-10-30.

On Bradbury Phase 2, both Node and Chain RPCs returned chain ID 4221 and documented genesis `0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4`. Yet calling Node RPC `gen_getContractSchema` with Base64-encoded official minimal source returned:

```text
JSON-RPC error -32000: VMError: invalid_contract runner malformed
```

## Conclusion / request to GenLayer DevRel

Schema introspection is failing for more than just the RIGHTRAIL source, including a known deployed Studio Dev contract. That suggests a runtime/runner/configuration regression or incompatibility affecting the introspection path, **but it does not prove all transaction execution is down**.

Please confirm:
1. Whether Studio Dev `v0.123.0-rc.8` / GenVM `v0.3.0-rc10` supports `gen_getContractSchemaForCode` using the matching RC SDK and current runner pins.
2. Which Python runner pin and GenVM code-header format are required for both Studio Dev and Bradbury Phase 2 on October 30, 2026.
3. Whether introspection for **existing deployed contracts** is working on the current Studio Dev node.
4. Whether Bradbury `gen_getContractSchema` currently has a known service issue.

**No test GEN was spent on deployment and no RIGHTRAIL deployment address or success receipt exists.**

## Developer verification steps after fix

- With Studio Dev, run `getContractSchemaForCode` against an official minimal Python contract. Require a real constructor + method list.
- With Bradbury, run `python scripts/preflight_bradbury.py` and require both contracts' source schemas to parse.
- Run GenVM semantic/runtime tests and fee profiling against the supported versions.
- Only then execute wallet-signed RightsRail deployment, confirm successful execution, and deploy Access Gate with the verified RightsRail address.
