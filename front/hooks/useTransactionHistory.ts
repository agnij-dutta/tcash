"use client"

import { useState, useEffect, useCallback } from "react"

export interface Transaction {
  id: string
  type: "deposit" | "withdraw" | "swap" | "transfer"
  detail: string
  status: "pending" | "confirmed" | "failed"
  timestamp: number
  amount?: string
  token?: string
  hash?: string
}

export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Load transactions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("eerc_transactions")
      if (stored) {
        const parsed = JSON.parse(stored)
        setTransactions(parsed)
      }
    } catch (error) {
      console.error("Failed to load transaction history:", error)
    }
  }, [])

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("eerc_transactions", JSON.stringify(transactions))
    } catch (error) {
      console.error("Failed to save transaction history:", error)
    }
  }, [transactions])

  const addTransaction = useCallback((transaction: Omit<Transaction, "id" | "timestamp">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    setTransactions(prev => [newTransaction, ...prev.slice(0, 49)]) // Keep only latest 50
    return newTransaction.id // Return the ID for updates
  }, [])

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => 
      prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx)
    )
  }, [])

  const clearHistory = useCallback(() => {
    setTransactions([])
    localStorage.removeItem("eerc_transactions")
  }, [])

  // Format timestamp for display
  const formatTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Get recent transactions for display
  const recentTransactions = transactions.slice(0, 10).map(tx => ({
    ...tx,
    time: formatTime(tx.timestamp)
  }))

  return {
    transactions: recentTransactions,
    addTransaction,
    updateTransaction,
    clearHistory,
    totalTransactions: transactions.length
  }
}
