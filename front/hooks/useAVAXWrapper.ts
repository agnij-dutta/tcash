"use client"

import { useReadContract, useWriteContract } from "wagmi"
import { useHardcodedWallet } from "./useHardcodedWallet"
import { useState, useEffect } from "react"
import { parseAbi } from "viem"

// AVAX Wrapper ABI
const AVAX_WRAPPER_ABI = parseAbi([
  "function wrap() external payable",
  "function unwrap(uint256 amount) external",
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function getContractBalance() external view returns (uint256)",
  "event Wrapped(address indexed user, uint256 amount)",
  "event Unwrapped(address indexed user, uint256 amount)"
])

// Contract address (will be set after deployment)
const AVAX_WRAPPER_ADDRESS = "0x0000000000000000000000000000000000000000" // Update this after deployment

export function useAVAXWrapper() {
  const { address, isConnected, publicClient } = useHardcodedWallet()
  const { writeContractAsync } = useWriteContract()
  
  // State for AVAX balance
  const [nativeAVAXBalance, setNativeAVAXBalance] = useState<bigint>(0n)
  const [wrappedAVAXBalance, setWrappedAVAXBalance] = useState<bigint>(0n)
  
  // Read wrapped AVAX balance
  const { data: wavaxBalance, refetch: refetchWAVAXBalance } = useReadContract({
    abi: AVAX_WRAPPER_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address && AVAX_WRAPPER_ADDRESS !== "0x0000000000000000000000000000000000000000" },
    address: AVAX_WRAPPER_ADDRESS as `0x${string}`,
  }) as { data: bigint; refetch: () => void }
  
  // Read contract info
  const { data: wavaxSymbol } = useReadContract({
    abi: AVAX_WRAPPER_ABI,
    functionName: "symbol",
    args: [],
    query: { enabled: AVAX_WRAPPER_ADDRESS !== "0x0000000000000000000000000000000000000000" },
    address: AVAX_WRAPPER_ADDRESS as `0x${string}`,
  }) as { data: string }
  
  // Update wrapped balance when data changes
  useEffect(() => {
    if (wavaxBalance !== undefined) {
      setWrappedAVAXBalance(wavaxBalance)
    }
  }, [wavaxBalance])
  
  // Get native AVAX balance
  useEffect(() => {
    const fetchNativeBalance = async () => {
      if (publicClient && address) {
        try {
          const balance = await publicClient.getBalance({ address: address as `0x${string}` })
          setNativeAVAXBalance(balance)
        } catch (error) {
          console.error("Failed to fetch native AVAX balance:", error)
        }
      }
    }
    
    fetchNativeBalance()
  }, [publicClient, address])
  
  // Wrap native AVAX to WAVAX
  const wrapAVAX = async (amount: string) => {
    if (!address) throw new Error("No wallet connected")
    
    const amountWei = BigInt(amount)
    
    try {
      const txHash = await writeContractAsync({
        abi: AVAX_WRAPPER_ABI,
        functionName: "wrap",
        args: [],
        address: AVAX_WRAPPER_ADDRESS as `0x${string}`,
        account: address as `0x${string}`,
        value: amountWei,
      })
      
      console.log("Wrap AVAX transaction:", txHash)
      await refetchWAVAXBalance()
      return { transactionHash: txHash }
    } catch (error) {
      console.error("Wrap AVAX failed:", error)
      throw error
    }
  }
  
  // Unwrap WAVAX to native AVAX
  const unwrapAVAX = async (amount: string) => {
    if (!address) throw new Error("No wallet connected")
    
    const amountWei = BigInt(amount)
    
    try {
      const txHash = await writeContractAsync({
        abi: AVAX_WRAPPER_ABI,
        functionName: "unwrap",
        args: [amountWei],
        address: AVAX_WRAPPER_ADDRESS as `0x${string}`,
        account: address as `0x${string}`,
      })
      
      console.log("Unwrap AVAX transaction:", txHash)
      await refetchWAVAXBalance()
      return { transactionHash: txHash }
    } catch (error) {
      console.error("Unwrap AVAX failed:", error)
      throw error
    }
  }
  
  // Format balances for display
  const formatAVAXBalance = (balance: bigint) => {
    return (Number(balance) / Math.pow(10, 18)).toFixed(6)
  }
  
  return {
    // Connection status
    isConnected,
    address,
    
    // Balances
    nativeAVAXBalance,
    wrappedAVAXBalance,
    nativeAVAXFormatted: formatAVAXBalance(nativeAVAXBalance),
    wrappedAVAXFormatted: formatAVAXBalance(wrappedAVAXBalance),
    
    // Token info
    wavaxSymbol: wavaxSymbol || "WAVAX",
    
    // Functions
    wrapAVAX,
    unwrapAVAX,
    refetchWAVAXBalance,
  }
}
