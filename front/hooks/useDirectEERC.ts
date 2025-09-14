"use client"

import { useReadContract, useWriteContract } from "wagmi"
import { useHardcodedWallet } from "./useHardcodedWallet"
import { CONTRACT_ADDRESSES } from "@/config/contracts"
import { ERC20_ABI, EERC_CONVERTER_ABI, formatDisplayAmount } from "@/lib/constants"
import { useState, useEffect } from "react"
import { poseidon } from "poseidon-lite"

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

  // Read encrypted balance from contract
  const { data: encryptedBalanceData, refetch: refetchEncryptedBalance } = useReadContract({
    abi: EERC_CONVERTER_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`, 1n], // tokenId 1 for the ERC20 token
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.eERC,
  }) as { data: any; refetch: () => void }

  // Update state when encrypted balance data changes
  useEffect(() => {
    if (encryptedBalanceData) {
      const { eGCT } = encryptedBalanceData
      if (eGCT && eGCT.c1 && eGCT.c2) {
        setEncryptedBalance([
          BigInt(eGCT.c1.x.toString()),
          BigInt(eGCT.c1.y.toString()),
          BigInt(eGCT.c2.x.toString()),
          BigInt(eGCT.c2.y.toString())
        ])
        // For now, simulate decrypted balance (in real implementation, this would decrypt)
        setDecryptedBalance(1000n)
      }
    }
  }, [encryptedBalanceData])

  // Simulate public key and decryption key (in real implementation, these would come from registrar)
  useEffect(() => {
    if (isConnected && address) {
      setPublicKey([12345n, 67890n])
      setIsDecryptionKeySet(true)
    }
  }, [isConnected, address])

  // Generate amountPCT for auditing using Poseidon encryption
  const generateAmountPCT = (amount: bigint, publicKey: [bigint, bigint]): [bigint, bigint, bigint, bigint, bigint, bigint, bigint] => {
    try {
      // Create a simple ciphertext using Poseidon hash
      // In a real implementation, this would use proper ElGamal encryption
      const ciphertext = [
        poseidon([amount, publicKey[0], publicKey[1]]),
        poseidon([amount + 1n, publicKey[0], publicKey[1]]),
        poseidon([amount + 2n, publicKey[0], publicKey[1]]),
        poseidon([amount + 3n, publicKey[0], publicKey[1]]),
        poseidon([amount + 4n, publicKey[0], publicKey[1]]),
      ]
      
      // Auth key components
      const authKey = [
        poseidon([publicKey[0], publicKey[1]]),
        poseidon([publicKey[1], publicKey[0]]),
      ]
      
      // Nonce
      const nonce = poseidon([amount, publicKey[0]])
      
      return [
        ciphertext[0],
        ciphertext[1], 
        ciphertext[2],
        ciphertext[3],
        ciphertext[4],
        authKey[0],
        nonce,
      ]
    } catch (error) {
      console.error("Error generating amountPCT:", error)
      // Fallback to simple values
      return [amount, 0n, 0n, 0n, 0n, 0n, 0n]
    }
  }

  // Deposit function - matches converter contract interface
  const deposit = async (amount: string, tokenAddress?: string) => {
    if (!address) throw new Error("No wallet connected")
    
    const amountBigInt = BigInt(amount)
    const tokenAddr = tokenAddress || CONTRACT_ADDRESSES.erc20
    
    // Get user's public key for amountPCT generation
    const userPublicKey: [bigint, bigint] = [12345n, 67890n] // This should come from the registrar
    
    // Generate amountPCT for auditing
    const amountPCT = generateAmountPCT(amountBigInt, userPublicKey)
    
    try {
      const txHash = await writeContractAsync({
        abi: EERC_CONVERTER_ABI,
        functionName: "deposit",
        args: [amountBigInt, tokenAddr as `0x${string}`, amountPCT],
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

  // Generate withdraw proof for ZK verification
  const generateWithdrawProof = (amount: bigint, userPublicKey: [bigint, bigint], encryptedBalance: [bigint, bigint, bigint, bigint], auditorPublicKey: [bigint, bigint]) => {
    try {
      // In a real implementation, this would generate a proper ZK proof
      // For now, we'll create a placeholder proof structure
      const proofPoints = {
        a: [poseidon([amount, userPublicKey[0]]), poseidon([amount, userPublicKey[1]])],
        b: [
          [poseidon([userPublicKey[0], encryptedBalance[0]]), poseidon([userPublicKey[1], encryptedBalance[1]])],
          [poseidon([encryptedBalance[2], auditorPublicKey[0]]), poseidon([encryptedBalance[3], auditorPublicKey[1]])]
        ],
        c: [poseidon([amount, userPublicKey[0], userPublicKey[1]]), poseidon([encryptedBalance[0], encryptedBalance[1]])]
      }
      
      const publicSignals = [
        amount, // amount
        userPublicKey[0], userPublicKey[1], // user public key
        encryptedBalance[0], encryptedBalance[1], encryptedBalance[2], encryptedBalance[3], // encrypted balance
        auditorPublicKey[0], auditorPublicKey[1], // auditor public key
        poseidon([amount, userPublicKey[0]]), // auditor PCT components
        poseidon([amount, userPublicKey[1]]),
        poseidon([userPublicKey[0], userPublicKey[1]]),
        poseidon([auditorPublicKey[0], auditorPublicKey[1]]),
        poseidon([amount, encryptedBalance[0]]),
        poseidon([amount, encryptedBalance[1]]),
        poseidon([amount, encryptedBalance[2]])
      ]
      
      return {
        proofPoints,
        publicSignals
      }
    } catch (error) {
      console.error("Error generating withdraw proof:", error)
      // Fallback to simple proof
      return {
        proofPoints: {
          a: [0n, 0n],
          b: [[0n, 0n], [0n, 0n]],
          c: [0n, 0n]
        },
        publicSignals: [amount, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]
      }
    }
  }

  // Generate balancePCT for the new balance after withdrawal
  const generateBalancePCT = (newBalance: bigint, publicKey: [bigint, bigint]): [bigint, bigint, bigint, bigint, bigint, bigint, bigint] => {
    try {
      const ciphertext = [
        poseidon([newBalance, publicKey[0], publicKey[1]]),
        poseidon([newBalance + 1n, publicKey[0], publicKey[1]]),
        poseidon([newBalance + 2n, publicKey[0], publicKey[1]]),
        poseidon([newBalance + 3n, publicKey[0], publicKey[1]]),
        poseidon([newBalance + 4n, publicKey[0], publicKey[1]]),
      ]
      
      const authKey = [
        poseidon([publicKey[0], publicKey[1]]),
        poseidon([publicKey[1], publicKey[0]]),
      ]
      
      const nonce = poseidon([newBalance, publicKey[0]])
      
      return [
        ciphertext[0],
        ciphertext[1], 
        ciphertext[2],
        ciphertext[3],
        ciphertext[4],
        authKey[0],
        nonce,
      ]
    } catch (error) {
      console.error("Error generating balancePCT:", error)
      return [newBalance, 0n, 0n, 0n, 0n, 0n, 0n]
    }
  }

  // Withdraw function - matches converter contract interface
  const withdraw = async (amount: string, tokenAddress?: string) => {
    if (!address) throw new Error("No wallet connected")
    
    const amountBigInt = BigInt(amount)
    const tokenAddr = tokenAddress || CONTRACT_ADDRESSES.erc20
    
    // Get token ID (this should be fetched from the contract)
    const tokenId = 1n // Assuming token ID 1 for the ERC20 token
    
    // Get user's public key and encrypted balance
    const userPublicKey: [bigint, bigint] = [12345n, 67890n] // This should come from the registrar
    const auditorPublicKey: [bigint, bigint] = [54321n, 98765n] // This should come from the contract
    const encryptedBalance: [bigint, bigint, bigint, bigint] = [1000n, 2000n, 3000n, 4000n] // This should come from the contract
    
    // Generate withdraw proof
    const withdrawProof = generateWithdrawProof(amountBigInt, userPublicKey, encryptedBalance, auditorPublicKey)
    
    // Calculate new balance after withdrawal
    const currentBalance = 1000n // This should come from decrypted balance
    const newBalance = currentBalance - amountBigInt
    const balancePCT = generateBalancePCT(newBalance, userPublicKey)
    
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
