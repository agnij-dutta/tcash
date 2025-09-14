"use client"

import { CONTRACT_ADDRESSES, CIRCUIT_URLS } from "@/config/contracts"
import { useEffect, useState, useCallback } from "react"
import { useHardcodedWallet } from "./useHardcodedWallet"
import { useWriteContract, useReadContract } from "wagmi"
import { ERC20_ABI, EERC_CONVERTER_ABI, formatDisplayAmount } from "@/lib/constants"

// Types for eERC
interface RegistrationProof {
  proofPoints: {
    a: [bigint, bigint]
    b: [[bigint, bigint], [bigint, bigint]]
    c: [bigint, bigint]
  }
  publicSignals: [bigint, bigint, bigint, bigint, bigint]
}

interface WithdrawProof {
  proofPoints: {
    a: [bigint, bigint]
    b: [[bigint, bigint], [bigint, bigint]]
    c: [bigint, bigint]
  }
  publicSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
}

interface RegistrationResult {
  key: string
  publicKey: [bigint, bigint]
  transactionHash?: string
}

export function useEERC() {
  const { address, isConnected, publicClient, walletClient } = useHardcodedWallet()
  const { writeContractAsync } = useWriteContract()
  const [decryptionKey, setDecryptionKey] = useState<string | undefined>()
  const [publicKey, setPublicKey] = useState<[bigint, bigint]>([BigInt(0), BigInt(0)])
  const [isInitialized, setIsInitialized] = useState(false)
  const [encryptedBalance, setEncryptedBalance] = useState<bigint[]>([])
  const [decryptedBalance, setDecryptedBalance] = useState<bigint>(BigInt(0))

  // Read user's encrypted balance
  const { data: encryptedBalanceData, refetch: refetchEncryptedBalance } = useReadContract({
    abi: EERC_CONVERTER_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`, BigInt(1)], // tokenId 1 for the main ERC20 token
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.eERC,
  }) as { data: any; refetch: () => void }

  // Read ERC20 balance for comparison
  const { data: erc20Balance, refetch: refetchErc20Balance } = useReadContract({
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
    address: CONTRACT_ADDRESSES.erc20,
  }) as { data: bigint; refetch: () => void }

  // Read ERC20 symbol and decimals
  const { data: erc20Symbol } = useReadContract({
    abi: ERC20_ABI,
    functionName: "symbol",
    args: [],
    address: CONTRACT_ADDRESSES.erc20,
  }) as { data: string }

  const { data: erc20Decimals } = useReadContract({
    abi: ERC20_ABI,
    functionName: "decimals",
    args: [],
    address: CONTRACT_ADDRESSES.erc20,
  }) as { data: number }

  // Load decryption key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('eerc-decryption-key')
    const storedPublicKey = localStorage.getItem('eerc-public-key')
    
    if (storedKey) {
      setDecryptionKey(storedKey)
    }
    
    if (storedPublicKey) {
      const [x, y] = storedPublicKey.split(',').map(BigInt)
      setPublicKey([x, y])
    }
    
    setIsInitialized(true)
  }, [])

  // Update encrypted balance when data changes
  useEffect(() => {
    if (encryptedBalanceData) {
      const { eGCT } = encryptedBalanceData
      if (eGCT && eGCT.c1 && eGCT.c2) {
        const balance = [
          BigInt(eGCT.c1.x.toString()),
          BigInt(eGCT.c1.y.toString()),
          BigInt(eGCT.c2.x.toString()),
          BigInt(eGCT.c2.y.toString())
        ]
        setEncryptedBalance(balance)
        
        // Simulate balance decryption (in real implementation, this would use the decryption key)
        // For now, we'll use a mock decrypted value
        if (decryptionKey) {
          setDecryptedBalance(BigInt(Math.floor(Math.random() * 1000)) * BigInt(10**18)) // Mock balance
        }
      }
    }
  }, [encryptedBalanceData, decryptionKey])

  // Generate a mock private key pair for registration
  const generateKeyPair = useCallback((): { privateKey: string; publicKey: [bigint, bigint] } => {
    // In a real implementation, this would use proper cryptographic key generation
    const privateKey = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')
    
    // Mock public key generation (should use Baby JubJub curve)
    const x = BigInt('0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''))
    const y = BigInt('0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''))
    
    return { privateKey, publicKey: [x, y] }
  }, [])

  // Generate ZK proof for registration (mock implementation)
  const generateRegistrationProof = useCallback(async (publicKey: [bigint, bigint]): Promise<RegistrationProof> => {
    // In a real implementation, this would use the actual circuit files
    console.log('Generating registration proof for public key:', publicKey)
    
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Return mock proof structure
    return {
      proofPoints: {
        a: [BigInt(Math.floor(Math.random() * 1000)), BigInt(Math.floor(Math.random() * 1000))],
        b: [
          [BigInt(Math.floor(Math.random() * 1000)), BigInt(Math.floor(Math.random() * 1000))],
          [BigInt(Math.floor(Math.random() * 1000)), BigInt(Math.floor(Math.random() * 1000))]
        ],
        c: [BigInt(Math.floor(Math.random() * 1000)), BigInt(Math.floor(Math.random() * 1000))]
      },
      publicSignals: [
        publicKey[0], // public key x
        publicKey[1], // public key y
        BigInt(Math.floor(Math.random() * 1000)), // additional signals
        BigInt(Math.floor(Math.random() * 1000)),
        BigInt(Math.floor(Math.random() * 1000))
      ] as [bigint, bigint, bigint, bigint, bigint]
    }
  }, [])

  // Registration function
  const register = useCallback(async (): Promise<RegistrationResult> => {
    if (!address || !writeContractAsync) {
      throw new Error('Wallet not connected')
    }

    try {
      console.log('Starting eERC registration...')
      
      // Generate key pair
      const { privateKey, publicKey: newPublicKey } = generateKeyPair()
      
      // Generate registration proof
      const proof = await generateRegistrationProof(newPublicKey)
      
      // Register with the registrar contract
      const txHash = await writeContractAsync({
        abi: [
          {
            "inputs": [
              {
                "components": [
                  {
                    "components": [
                      {"name": "a", "type": "uint256[2]"},
                      {"name": "b", "type": "uint256[2][2]"},
                      {"name": "c", "type": "uint256[2]"}
                    ],
                    "name": "proofPoints",
                    "type": "tuple"
                  },
                  {"name": "publicSignals", "type": "uint256[5]"}
                ],
                "name": "proof",
                "type": "tuple"
              }
            ],
            "name": "register",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: "register",
        args: [proof as any], // Type assertion for now - in real implementation, types would match
        address: CONTRACT_ADDRESSES.registrar,
        account: address as `0x${string}`,
      })
      
      // Save keys to localStorage
      setDecryptionKey(privateKey)
      setPublicKey(newPublicKey)
      localStorage.setItem('eerc-decryption-key', privateKey)
      localStorage.setItem('eerc-public-key', `${newPublicKey[0]},${newPublicKey[1]}`)
      
      console.log('Registration successful:', txHash)
      
      return {
        key: privateKey,
        publicKey: newPublicKey,
        transactionHash: txHash
      }
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }, [address, writeContractAsync, generateKeyPair, generateRegistrationProof])

  // Generate decryption key
  const generateDecryptionKey = useCallback(async (): Promise<string> => {
    const { privateKey, publicKey: newPublicKey } = generateKeyPair()
    
    setDecryptionKey(privateKey)
    setPublicKey(newPublicKey)
    localStorage.setItem('eerc-decryption-key', privateKey)
    localStorage.setItem('eerc-public-key', `${newPublicKey[0]},${newPublicKey[1]}`)
    
    return privateKey
  }, [generateKeyPair])

  // Deposit function
  const deposit = useCallback(async (amount: string, tokenAddress?: string) => {
    if (!address || !writeContractAsync) {
      throw new Error('Wallet not connected')
    }

    const amountBigInt = BigInt(amount)
    const tokenAddr = tokenAddress || CONTRACT_ADDRESSES.erc20
    
    // Generate amountPCT for auditing (mock implementation)
    const amountPCT: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
      amountBigInt,
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000))
    ]
    
    try {
      const txHash = await writeContractAsync({
        abi: EERC_CONVERTER_ABI,
        functionName: "deposit",
        args: [amountBigInt, tokenAddr as `0x${string}`, amountPCT],
        address: CONTRACT_ADDRESSES.eERC,
        account: address as `0x${string}`,
      })
      
      // Refresh balances
      await refetchErc20Balance()
      await refetchEncryptedBalance()
      
      return { transactionHash: txHash }
    } catch (error) {
      console.error('Deposit failed:', error)
      throw error
    }
  }, [address, writeContractAsync, refetchErc20Balance, refetchEncryptedBalance])

  // Withdraw function with ZK proof
  const withdraw = useCallback(async (amount: string, tokenAddress?: string) => {
    if (!address || !writeContractAsync) {
      throw new Error('Wallet not connected')
    }

    const amountBigInt = BigInt(amount)
    const tokenId = BigInt(1) // Main ERC20 token ID
    
    // Generate withdraw proof (mock implementation)
    const proof: WithdrawProof = {
      proofPoints: {
        a: [BigInt(Math.floor(Math.random() * 1000)), BigInt(Math.floor(Math.random() * 1000))],
        b: [
          [BigInt(Math.floor(Math.random() * 1000)), BigInt(Math.floor(Math.random() * 1000))],
          [BigInt(Math.floor(Math.random() * 1000)), BigInt(Math.floor(Math.random() * 1000))]
        ],
        c: [BigInt(Math.floor(Math.random() * 1000)), BigInt(Math.floor(Math.random() * 1000))]
      },
      publicSignals: Array.from({length: 16}, () => BigInt(Math.floor(Math.random() * 1000))) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
    }
    
    // Generate balancePCT for new balance after withdrawal
    const balancePCT: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
      decryptedBalance - amountBigInt,
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000)),
      BigInt(Math.floor(Math.random() * 1000))
    ]
    
    try {
      const txHash = await writeContractAsync({
        abi: EERC_CONVERTER_ABI,
        functionName: "withdraw",
        args: [tokenId, proof as any, balancePCT], // Type assertion for now - in real implementation, types would match
        address: CONTRACT_ADDRESSES.eERC,
        account: address as `0x${string}`,
      })
      
      // Refresh balances
      await refetchErc20Balance()
      await refetchEncryptedBalance()
      
      return { transactionHash: txHash }
    } catch (error) {
      console.error('Withdraw failed:', error)
      throw error
    }
  }, [address, writeContractAsync, decryptedBalance, refetchErc20Balance, refetchEncryptedBalance])

  // Private transfer function
  const transfer = useCallback(async (to: string, amount: string) => {
    console.log('Private transfer:', { to, amount })
    // Mock implementation - in real version, this would generate transfer proof
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { transactionHash: '0x' + Math.random().toString(16).slice(2, 66) }
  }, [])

  return {
    // State
    isInitialized: isInitialized && !!publicClient && !!walletClient,
    isConnected,
    address,
    
    // Registration
    register,
    generateDecryptionKey,
    isRegistered: !!decryptionKey && publicKey[0] !== BigInt(0) && publicKey[1] !== BigInt(0),
    
    // Keys and encryption
    decryptionKey,
    publicKey,
    
    // Balances
    encryptedBalance,
    decryptedBalance,
    erc20Balance: formatDisplayAmount(erc20Balance || 0n, erc20Decimals || 18),
    erc20Symbol: erc20Symbol || 'USDC',
    erc20Decimals: erc20Decimals || 18,
    
    // Operations
    deposit,
    withdraw,
    transfer,
    
    // Utils
    refetchBalance: refetchEncryptedBalance,
    refetchErc20Balance,
  }
}
