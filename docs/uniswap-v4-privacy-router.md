## Uniswap v4 integration in PrivacyV4Router

This document explains how the Uniswap v4 callback-based flow is integrated into the existing contracts, and how to invoke the direct swap and private spend→swap→deposit flows.

### Key components

-   **PrivacyV4Router (`src/PrivacyV4Router.sol`)**: Entry point for swaps. Inherits Uniswap v4 periphery `V4Router`, which itself builds on `BaseActionsRouter`, `SafeCallback`, and `DeltaResolver`.
-   **ShieldedVault (`src/ShieldedVault.sol`)**: Verifies the ZK spend, enforces nullifier/root rules, and moves `tokenIn` into the router for swapping.
-   **PoolManager (Uniswap v4 core)**: Executes swaps via `poolManager.unlock(...)` and calls back into the router (`unlockCallback`) to run the requested actions.
-   **IEERCConverter**: Receives the swapped `tokenOut` and converts it to private balance for the recipient using `deposit` with encrypted recipient data.

### How the Uniswap v4 callback flow is wired

-   `PrivacyV4Router` builds an actions byte-string and corresponding params array:
    -   **SETTLE**: Pay `tokenIn` to the PoolManager (via `DeltaResolver._settle` → `_pay`).
    -   **SWAP_EXACT_IN_SINGLE**: Execute a single-hop exact-in swap using `IV4Router.ExactInputSingleParams`.
    -   **TAKE**: Withdraw the positive delta of `tokenOut` from the PoolManager back to the router or recipient.
-   The router calls `poolManager.unlock(abi.encode(actions, params))`.
-   `SafeCallback` ensures only the PoolManager can enter the `unlockCallback`.
-   `BaseActionsRouter` decodes the actions/params in `unlockCallback` and dispatches to `V4Router._handleAction`.
-   `DeltaResolver` provides `_settle` and `_take`. `_pay` is implemented in `PrivacyV4Router` to transfer ERC20 tokens to the PoolManager.
-   `ReentrancyLock` stores the original caller during entry; `msgSender()` returns this value so hooks/logic can reference the external caller inside callbacks.

### Flow A: Private spend → single-hop swap → deposit to EERC

Entry: `PrivacyV4Router.spendSwapAndDepositSingle(...)`

Inputs (abridged):

-   **proof, root, nullifier**: ZK spend artifacts/identifiers for the shielded vault.
-   **tokenIn, tokenOut, amountIn, minAmountOut**: Swap parameters.
-   **poolKey, zeroForOne, hookData**: Uniswap v4 pool selection and swap direction.
-   **encryptedRecipientData**: Used by the converter to credit private balance to the target.
-   **deadline**: Expiry guard.

Steps:

1. Validate `deadline` and snapshot `tokenOut` balance.
2. Call `vault.executeSpend(...)` which:
    - Verifies root/nullifier semantics.
    - Marks the nullifier as used.
    - Moves `amountIn` of `tokenIn` to the router.
3. Build actions:
    - `SETTLE(tokenIn, amountIn, payerIsUser=false)` → pay from the router’s balance to PoolManager.
    - `SWAP_EXACT_IN_SINGLE(poolKey, zeroForOne, amountIn, minAmountOut, hookData)`.
    - `TAKE(tokenOut, recipient=this, amount=OPEN_DELTA)` → withdraw all positive delta of `tokenOut` to the router.
4. Execute `poolManager.unlock(abi.encode(actions, params))`.
5. Compute `amountOut` from balance delta.
6. If `converter` is set and `amountOut > 0`, call `converter.deposit(tokenOut, amountOut, encryptedRecipientData)`.

Result: The user’s shielded spend is honored, a swap is performed, and the proceeds are deposited to a private balance in the converter.

### Flow B: Direct single-hop exact-in swap (public)

Entry: `PrivacyV4Router.swapExactInSingle(...)`

Inputs (abridged): `payer, recipient, tokenIn, tokenOut, amountIn, minAmountOut, poolKey, zeroForOne, hookData`.

Steps:

1. Snapshot `recipient`’s `tokenOut` balance.
2. If `payer != msg.sender`, the function pulls `amountIn` of `tokenIn` from `payer` into the router and sets `payerIsUser=false`. Otherwise, it settles from the external caller (`payerIsUser=true`).
3. Build actions:
    - `SETTLE(tokenIn, amountIn, payerIsUser)`.
    - `SWAP_EXACT_IN_SINGLE(...)`.
    - `TAKE(tokenOut, recipient, amount=OPEN_DELTA)`.
4. Execute `poolManager.unlock(abi.encode(actions, params))`.
5. Compute `amountOut` from `recipient`’s balance delta and return it.

### Notes on PoolKey and direction

-   `PoolKey` identifies the pool `{currency0, currency1, fee, tickSpacing, hooks}`.
-   `zeroForOne=true` swaps `currency0 → currency1`; `false` swaps `currency1 → currency0`.
-   The router intentionally does not expose a price limit; `V4Router` sets conservative bounds internally for exact-in/out safety with standard pools.

### Approvals and token movement

-   In Flow A, the vault transfers `tokenIn` to the router before settlement.
-   In Flow B with `payerIsUser=true`, the PoolManager pull during `_pay` requires `IERC20(tokenIn).approve(address(PrivacyV4Router), amountIn)` from `msg.sender`. With `payerIsUser=false`, the router pays from its own balance (having `transferFrom`’d from `payer` first).
-   `_pay` implementation in `PrivacyV4Router`:
    -   If paying from the router, it uses `Currency.transfer` to the PoolManager.
    -   If paying from an external `payer`, it uses `IERC20(Currency.unwrap(token)).transferFrom(payer, address(poolManager), amount)`.

### Security considerations

-   `SafeCallback` gates `unlockCallback` to be callable only by the PoolManager.
-   `ReentrancyLock` ensures the entry flow is single-threaded and preserves the external caller via `msgSender()`.
-   `ShieldedVault` enforces root/nullifier checks and allowed tokens; it is the only contract allowed to move shielded funds out and hand them to the router.
-   `deadline` prevents stale swaps.

### Minimal integration checklist

-   Deploy `PrivacyV4Router(poolManager, vault)`.
-   Call `setConverter(converter)` on the router.
-   Ensure the vault is configured to transfer `tokenIn` to the router within `executeSpend`.
-   Ensure users (or payers) have given ERC20 approvals as required for settlement.
-   Provide correct `PoolKey`, `zeroForOne`, and `hookData` (if applicable to the pool) when calling either flow.

### Example: private spend + swap + deposit (pseudo)

```solidity
router.spendSwapAndDepositSingle({
  proof: ..., root: ..., nullifier: ...,
  tokenIn: USDC, tokenOut: WETH,
  amountIn: 1_000e6, minAmountOut: 500e15,
  poolKey: poolKeyUSDC_WETH, zeroForOne: true,
  hookData: "", // empty if no hooks
  encryptedRecipientData: encRecipient,
  deadline: block.timestamp + 300
});
```

### Example: direct public swap (pseudo)

```solidity
// If payer == msg.sender, grant approval to the router for tokenIn
IERC20(USDC).approve(address(router), 1_000e6);

router.swapExactInSingle({
  payer: msg.sender,
  recipient: msg.sender,
  tokenIn: USDC,
  tokenOut: WETH,
  amountIn: 1_000e6,
  minAmountOut: 500e15,
  poolKey: poolKeyUSDC_WETH,
  zeroForOne: true,
  hookData: ""
});
```
