// Core SDK exports
export { TsunamiSDK } from './core/TsunamiSDK'
export { ProofEngine } from './core/ProofEngine'
export { ContractManager } from './core/ContractManager'
export { EncryptionUtils } from './core/EncryptionUtils'
export { BatchManager } from './core/BatchManager'

// React hooks exports
export {
  useTsunamiSDK,
  useDeposit,
  useWithdraw,
  useSwap,
  useEncryptedBalance,
  useBatchStatus,
  useRegistration,
  useSupportedTokens
} from './hooks/useTsunamiSDK'

// Type exports
export type {
  SDKConfig,
  DepositParams,
  WithdrawParams,
  SwapParams,
  TransferParams,
  EncryptedBalance,
  ProofResult,
  BatchStatus,
  KeyPair,
  Commitment,
  Nullifier,
  ProofParams,
  ContractConfig,
  BatchConfig,
  EpochInfo,
  TokenInfo,
  SwapQuote,
  TransactionStatus,
  PrivacySettings,
  ComplianceCheck,
  AuditInfo
} from './core/types'

// Contract exports
export { REGISTRAR_CONTRACT, EERC_CONTRACT, ERC20_TEST } from '../contracts'

