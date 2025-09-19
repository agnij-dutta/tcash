"use client"
import { Shield, Home, ArrowLeftRight, BarChart3, Plus, Minus, User, ChevronDown, Wallet } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi'
import { config } from '../lib/wagmi-config'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const router = useRouter()
  const { address } = useAccount()
  const chainId = useChainId()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [isClient, setIsClient] = useState(false)
  const [showWalletOptions, setShowWalletOptions] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Close wallet options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showWalletOptions) {
        const target = event.target as Element
        if (!target.closest('.wallet-dropdown')) {
          setShowWalletOptions(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showWalletOptions])

  const walletOptions = [
    {
      name: 'MetaMask',
      connector: config.connectors[0], // metaMask connector
      icon: '🦊',
      description: 'Connect using MetaMask'
    },
    {
      name: 'Browser Wallet',
      connector: config.connectors[1], // injected connector
      icon: '🌐',
      description: 'Connect using any browser wallet'
    },
    {
      name: 'WalletConnect',
      connector: config.connectors[2], // walletConnect connector
      icon: '🔗',
      description: 'Connect using WalletConnect'
    },
    {
      name: 'Coinbase Wallet',
      connector: config.connectors[3], // coinbaseWallet connector
      icon: '🔵',
      description: 'Connect using Coinbase Wallet'
    }
  ]

  const handleWalletConnect = async (connector: any) => {
    try {
      console.log('Attempting to connect with:', connector.name || connector.type)
      await connect({ connector })
      toast.success("Wallet connected successfully!")
      setShowWalletOptions(false)
    } catch (error: any) {
      console.error('Connection error:', error)
      toast.error(`Failed to connect: ${error.message}`)
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div
          className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/")} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold text-xl text-white tracking-wide">tZunami</span>
            </button>
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
              <button
                onClick={() => router.push("/deposit")}
                className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
              >
                <Plus className="w-4 h-4" />
                Deposit
              </button>
              <button
                onClick={() => router.push("/withdraw")}
                className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
              >
                <Minus className="w-4 h-4" />
                Withdraw
              </button>
              <button
                onClick={() => router.push("/swap")}
                className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Swap
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
              <div className="flex items-center gap-2 relative">
                {isClient && address ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await disconnect()
                        toast("Disconnected")
                      }}
                      className="flex items-center gap-2 text-sm transition-colors px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/15 font-medium"
                    >
                      <Wallet className="w-4 h-4" />
                      {`${address.slice(0,6)}...${address.slice(-4)}`}
                    </button>
                    <span className="text-xs text-white/60">{chainId ? `Chain: ${chainId}` : ''}</span>
                  </div>
                ) : isClient ? (
                  <div className="relative wallet-dropdown">
                    <button
                      onClick={() => setShowWalletOptions(!showWalletOptions)}
                      className="flex items-center gap-2 text-sm transition-colors px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/15 font-medium"
                    >
                      <Wallet className="w-4 h-4" />
                      Connect Wallet
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {showWalletOptions && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-50">
                        <div className="p-2">
                          <div className="text-xs text-white/60 px-3 py-2 border-b border-white/10">
                            Choose your wallet
                          </div>
                          {walletOptions.map((wallet, index) => (
                            <button
                              key={index}
                              onClick={() => handleWalletConnect(wallet.connector)}
                              className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <span className="text-lg">{wallet.icon}</span>
                              <div>
                                <div className="text-sm font-medium text-white">{wallet.name}</div>
                                <div className="text-xs text-white/60">{wallet.description}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white/60">
                    <Wallet className="w-4 h-4" />
                    Loading...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
