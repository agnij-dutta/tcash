'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyToClipboard = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      // You could add a toast notification here
    }
  }

  const openExplorer = () => {
    if (address && chain) {
      const explorerUrl = chain.blockExplorers?.default?.url
      if (explorerUrl) {
        window.open(`${explorerUrl}/address/${address}`, '_blank')
      }
    }
  }

  if (isConnected && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <Button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 bg-white/10 border border-white/15 text-white hover:bg-white/15 px-4 py-2 rounded-full"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm font-medium">{formatAddress(address)}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-black/90 backdrop-blur-xl border border-white/15 rounded-xl shadow-xl z-50">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <div>
                  <div className="text-sm font-medium text-white">{formatAddress(address)}</div>
                  <div className="text-xs text-white/60">{chain?.name}</div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy Address
                </button>

                <button
                  onClick={openExplorer}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Explorer
                </button>

                <hr className="border-white/10 my-2" />

                <button
                  onClick={() => disconnect()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isPending}
        className="flex items-center gap-2 bg-white/10 border border-white/15 text-white hover:bg-white/15 px-4 py-2 rounded-full"
      >
        <Wallet className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-black/90 backdrop-blur-xl border border-white/15 rounded-xl shadow-xl z-50">
          <div className="p-4">
            <div className="text-sm font-medium text-white mb-3">Connect a Wallet</div>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector })
                    setIsDropdownOpen(false)
                  }}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  {connector.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
