Tsunami: Private & Compliant Trading Wallet
Overview
Tsunami is a next-generation privacy-preserving trading wallet that leverages Uniswap v4 liquidity and zkSNARKs to enable private, compliant token swaps. Inspired by Tornado Cash, Tsunami introduces eERC tokens (encapsulated ERC-20s) that act as shielded representations of underlying assets. Users can deposit tokens, trade privately through Uniswap pools, and withdraw with selective disclosure options that balance compliance and privacy.

Problem Statement
Existing mixers like Tornado Cash provide privacy but were banned due to their abuse for illicit activities.


Users demand financial privacy, but regulators require AML/KYC safeguards.


Current DEX trading is fully transparent, leaking sensitive information about trading strategies, portfolio balances, and counterparties.


Tsunami’s goal: Deliver a wallet-like UX for private DeFi trading, where:
Small retail users get default privacy.


Institutions and large users can remain compliant via zk-attestations.


Trades route through existing liquidity (Uniswap), avoiding custom pools.



Product Description
Tsunami is a wallet and protocol that enables:
Deposits into a ShieldedVault, minting private eERC tokens.


Private swaps using zk-proofs through Uniswap v4 liquidity.


Withdrawals with compliance-aware thresholds.


Wallet UX that hides complexity behind a familiar interface.


Tagline: “Private. Compliant. DeFi-native.”

Implementation Approach
Core Design Principles
Privacy-first: Shielded balances and stealth addresses.


Compliance-friendly: zk-attestations to prove non-sanction status.


Liquidity-rich: Direct use of Uniswap v4 pools.


User-friendly: Mobile-first wallet UX.


MVP Scope
Fixed-denomination deposits (like Tornado) → mint eERC tokens.


PrivacyRouter verifies zk proof + executes Uniswap swap.


Withdrawals with compliance gating (>X USD).


Wallet UI for deposits, swaps, withdrawals, and proof generation.



User Flows
1. Deposit Flow
User selects token (e.g., USDC) and amount.


User generates zk commitment (note).


ShieldedVault locks underlying token and mints corresponding eERC.


Wallet shows updated private balance.


2. Private Swap Flow
User selects token pair (e.g., eUSDC → eDAI).


Wallet generates zk proof of eERC note ownership.


PrivacyRouter validates proof and routes swap through Uniswap.


Output tokens minted as new eERC note to stealth address.


3. Withdraw Flow
User initiates withdrawal.


If amount < threshold → auto-withdrawal.


If amount > threshold → requires zk-attestation proof (e.g., KYC attestation).


Underlying tokens transferred to recipient wallet.



Technical Implementation
Components
1. ShieldedVault
Holds underlying ERC-20 assets.


Maintains Merkle tree of commitments.


Interface:


deposit(token, amount, commitment)


withdraw(proof, recipient)


executeSpend(proof, tokenIn, tokenOut, amount)


2. eERC Tokens
ERC-20 wrappers representing shielded balances.


Minted/burned by ShieldedVault.


Gated transfers (only via PrivacyRouter).


3. PrivacyRouter
Verifies zk proofs.


Executes Uniswap v4 swaps using Vault funds.


Outputs result as new eERC notes.


4. zkSNARK Proof System
Circuits:


Deposit/withdraw ownership.


Spend/transfer correctness.


Uses Groth16 for efficiency.


Poseidon hashing for Merkle trees.


5. Compliance Oracle
Lightweight oracle for threshold-based exits.


Accepts zk-attestations proving user not in sanctions list.


Can integrate with decentralized identity providers (e.g., Polygon ID).


6. zk-Attestations
Proofs of compliance without revealing identity.


Examples:


“User is KYC’d with provider X.”


“User ∉ sanctions list.”


7. UI/UX
Wallet app (mobile + web).


Pages:


Onboarding: create wallet, backup key, set up stealth address.


Dashboard: balances of eERC tokens.


Deposit: select token/amount, deposit privately.


Swap: select tokens, route swap via Uniswap.


Withdraw: select token/amount, provide proof/attestation.


History: private log of user’s actions.



Technical Architecture
User Wallet → ZK Proof Generator → PrivacyRouter → ShieldedVault → Uniswap v4
        ↑                                                 ↓
   Compliance Oracle ← zk-Attestation Layer ← Withdrawal Request


Tech Stack Requirements
Smart Contracts: Solidity (Foundry/Hardhat)


zk Circuits: Circom + snarkjs (Groth16), or Noir/Halo2


Verifier Contracts: Solidity auto-generated


Hashing: Poseidon


DEX Integration: Uniswap v4 hooks


Relayers: Optional relayer infra for gas abstraction


Frontend: React/Next.js, Tailwind, WalletConnect


Mobile: React Native wrapper


Backend Services: Minimal; optional for relayer & attestation server


Identity/Compliance: Polygon ID / zk-KYC providers



Detailed Guide per Component
ShieldedVault - Agnij
Smart contract storing ERC-20 assets.


Implements deposit/withdraw logic.


Emits Merkle tree updates.


eERC Tokens - Agnij
ERC-20 with restricted transfer (only via Router).


Fully fungible representation of shielded balance.


UserRouter - Bhagya
Smart contract + off-chain relayer.


Validates zk proofs.

PrivacyRouter - Agnij + Roshan
Executes Uniswap trades.


Mints eERC outputs.


zk Proofs - Ayash
Circuits proving note ownership & spend correctness.


Groth16 for fast verification.


Trusted setup (per circuit) required.


Uniswap Integration - Roshan
Router directly interacts with Uniswap pools.


Uses Vault funds as liquidity source.


Executes standard swaps to leverage global liquidity.


Compliance Oracle - Bhagya
Gated withdrawals above threshold.


Accepts zk-attestation proofs.


Extensible to multiple identity providers.


UI/UX - Arko + Sam
Clean, wallet-like UX.


Emphasis on simplicity: deposit, swap, withdraw.


User sees balances in eERC tokens, not commitments.


Stealth address management automated.



Deliverables
Smart contract suite (Vault, eERC, Router, Oracle).


zkSNARK circuits (deposit, spend, withdraw).


Frontend wallet app (web + mobile).


Relayer infrastructure.


Documentation & developer SDK.



Roadmap
Phase 1 (MVP):
Fixed-denomination deposits.


Simple swaps via Router + Uniswap v4.


Withdrawals with threshold-based compliance stub.


Phase 2:
Variable denomination support.


zk-attestation integration.


Full relayer network.


Phase 3:
Mobile app launch.


Institutional integrations.


Governance and decentralization.



Conclusion
Tsunami provides a legally defensible, privacy-preserving trading wallet by combining:
Shielded eERC tokens.


Direct Uniswap v4 liquidity routing.


zkSNARK-based privacy.


Compliance-aware attestations.


This hybrid design enables mainstream users and institutions alike to trade privately, compliantly, and securely in DeFi.

