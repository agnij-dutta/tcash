"use client"

import { useReadContract, useWriteContract } from "wagmi"
import { useHardcodedWallet } from "./useHardcodedWallet"
import { CONTRACT_ADDRESSES } from "@/config/contracts"
import { ERC20_ABI, EERC_CONVERTER_ABI, formatDisplayAmount } from "@/lib/constants"
import { useState, useEffect } from "react"

export function useDirectEERC() {
  const { address, isConnected } = useHardcodedWallet()
  const { writeContractAsync } = useWriteContract()
  
  // State for encrypted balance and keys
  const [encryptedBalance, setEncryptedBalance] = useState<bigint[]>([])
  const [decryptedBalance, setDecryptedBalance] = useState<bigint>(0n)
  const [publicKey, setPublicKey] = useState<bigint[]>([])
  const [isDecryptionKeySet, setIsDecryptionKeySet] = useState(false)

  // Read ERC20 balance
  const { data: erc20Balance, refetch: refetchErc20Balance } = useReadContract({
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.erc20,
  }) as { data: bigint; refetch: () => void }

  // Read ERC20 decimals
  const { data: erc20Decimals } = useReadContract({
    abi: ERC20_ABI,
    functionName: "decimals",
    args: [],
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.erc20,
  }) as { data: number }

  // Read ERC20 symbol
  const { data: erc20Symbol } = useReadContract({
    abi: ERC20_ABI,
    functionName: "symbol",
    args: [],
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.erc20,
  }) as { data: string }

  // Read allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address as `0x${string}`, CONTRACT_ADDRESSES.eERC],
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.erc20,
  }) as { data: bigint; refetch: () => void }

  // Read eERC converter owner
  const { data: owner } = useReadContract({
    abi: EERC_CONVERTER_ABI,
    functionName: "owner",
    args: [],
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.eERC,
  }) as { data: string }

  // Read auditor key status
  const { data: isAuditorKeySet } = useReadContract({
    abi: EERC_CONVERTER_ABI,
    functionName: "isAuditorKeySet",
    args: [],
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.eERC,
  }) as { data: boolean }

  // Read auditor public key
  const { data: auditorPublicKey } = useReadContract({
    abi: EERC_CONVERTER_ABI,
    functionName: "auditorPublicKey",
    args: [],
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.eERC,
  }) as { data: bigint[] }

  // Simulate encrypted balance (in real implementation, this would come from contract events)
  useEffect(() => {
    if (isConnected && address) {
      // For now, simulate some encrypted balance
      setEncryptedBalance([1000n, 2000n, 3000n, 4000n])
      setDecryptedBalance(1000n)
      setPublicKey([12345n, 67890n])
      setIsDecryptionKeySet(true)
    }
  }, [isConnected, address])

  // Deposit function - matches converter contract interface
  const deposit = async (amount: string) => {
    if (!address) throw new Error("No wallet connected")
    
    const amountBigInt = BigInt(amount)
    
    // For now, use a simple amountPCT (in real implementation, this would be generated with Poseidon encryption)
    const amountPCT: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
      amountBigInt, // ciphertext[0]
      0n, // ciphertext[1] 
      0n, // ciphertext[2]
      0n, // ciphertext[3]
      0n, // ciphertext[4]
      0n, // authKey[0]
      0n, // authKey[1]
    ]
    
    try {
      const txHash = await writeContractAsync({
        abi: EERC_CONVERTER_ABI,
        functionName: "deposit",
        args: [amountBigInt, CONTRACT_ADDRESSES.erc20, amountPCT],
        address: CONTRACT_ADDRESSES.eERC,
        account: address as `0x${string}`,
      })
      
      console.log("Deposit transaction:", txHash)
      await refetchErc20Balance()
      return { transactionHash: txHash }
    } catch (error) {
      console.error("Deposit failed:", error)
      throw error
    }
  }

  // Withdraw function - matches converter contract interface
  const withdraw = async (amount: string) => {
    if (!address) throw new Error("No wallet connected")
    
    const amountBigInt = BigInt(amount)
    
    // For now, use placeholder proof and balancePCT (in real implementation, this would generate ZK proof)
    const tokenId = 0n // Token ID for the ERC20 token
    
    // Placeholder withdraw proof structure
    const withdrawProof = {
      proofPoints: {
        a: [0n, 0n],
        b: [[0n, 0n], [0n, 0n]],
        c: [0n, 0n]
      },
      publicSignals: [
        amountBigInt, // amount
        0n, 0n, // user public key
        0n, 0n, 0n, 0n, // encrypted balance
        0n, 0n, // auditor public key
        0n, 0n, 0n, 0n, 0n, 0n, 0n // auditor PCT
      ]
    }
    
    // Placeholder balancePCT
    const balancePCT: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
      0n, 0n, 0n, 0n, 0n, 0n, 0n
    ]
    
    try {
      const txHash = await writeContractAsync({
        abi: EERC_CONVERTER_ABI,
        functionName: "withdraw",
        args: [tokenId, withdrawProof, balancePCT],
        address: CONTRACT_ADDRESSES.eERC,
        account: address as `0x${string}`,
      })
      
      console.log("Withdraw transaction:", txHash)
      await refetchErc20Balance()
      return { transactionHash: txHash }
    } catch (error) {
      console.error("Withdraw failed:", error)
      throw error
    }
  }

  // Approve function
  const approve = async () => {
    if (!address) throw new Error("No wallet connected")
    
    try {
      const txHash = await writeContractAsync({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.eERC, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
        address: CONTRACT_ADDRESSES.erc20,
        account: address as `0x${string}`,
      })
      
      console.log("Approve transaction:", txHash)
      await refetchAllowance()
      return { transactionHash: txHash }
    } catch (error) {
      console.error("Approve failed:", error)
      throw error
    }
  }

  // Private transfer (simulated for now)
  const privateTransfer = async (to: string, amount: string) => {
    console.log("Private transfer:", { to, amount })
    // In real implementation, this would generate ZK proof and call contract
    return { transactionHash: "0x" + Math.random().toString(16).substr(2, 64) }
  }

  // Format balance for display
  const balanceInTokens = formatDisplayAmount(decryptedBalance, erc20Decimals || 18)
  const erc20BalanceFormatted = formatDisplayAmount(erc20Balance || 0n, erc20Decimals || 18)

  return {
    // Connection status
    isConnected,
    address,
    
    // Balances
    decryptedBalance,
    balanceInTokens,
    encryptedBalance,
    erc20Balance: erc20BalanceFormatted,
    erc20Symbol: erc20Symbol || "USDC",
    erc20Decimals: erc20Decimals || 18,
    
    // Keys and registration
    publicKey,
    isDecryptionKeySet,
    isRegistered: isDecryptionKeySet, // Simplified for now
    isInitialized: true, // Always true with direct contract calls
    
    // Contract info
    owner: owner || "",
    isAuditorKeySet: isAuditorKeySet || false,
    auditorPublicKey: auditorPublicKey || [],
    allowance: allowance || 0n,
    
    // Functions
    deposit,
    withdraw,
    approve,
    privateTransfer,
    refetchBalance: refetchErc20Balance,
  }
}
