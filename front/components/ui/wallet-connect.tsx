"use client"

import React from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Wallet, ChevronDown, ExternalLink, Copy, LogOut } from 'lucide-react'
import { NETWORK_CONFIG } from '@/config/contracts'

interface WalletConnectProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  showBalance?: boolean
}

export function WalletConnect({
  className = '',
  variant = 'default',
  size = 'default',
  showBalance = false
}: WalletConnectProps) {
  const { address, isConnected, chain } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId)
    if (connector) {
      connect({ connector })
    }
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      // Could add toast notification here
    }
  }

  const viewOnExplorer = () => {
    if (address) {
      window.open(`${NETWORK_CONFIG.blockExplorer}/address/${address}`, '_blank')
    }
  }

  // Show connect button if not connected
  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={`${className}`}
            disabled={isPending}
          >
            <Wallet className="w-4 h-4 mr-2" />
            {isPending ? 'Connecting...' : 'Connect Wallet'}
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.id}
              onClick={() => handleConnect(connector.id)}
              className="cursor-pointer"
            >
              <Wallet className="w-4 h-4 mr-2" />
              {connector.name}
              {connector.id === 'injected' && ' (Browser)'}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Show connected wallet info
  const displayAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
  const isCorrectNetwork = chain?.id === NETWORK_CONFIG.chainId

  // Debug logging for network detection
  console.log('Network Debug:', {
    connectedChainId: chain?.id,
    expectedChainId: NETWORK_CONFIG.chainId,
    chainName: chain?.name,
    isCorrectNetwork,
    chainDetails: chain
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isCorrectNetwork ? variant : 'destructive'}
          size={size}
          className={`${className} ${!isCorrectNetwork ? 'animate-pulse' : ''}`}
        >
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isCorrectNetwork ? 'bg-green-400' : 'bg-red-400'
          }`} />
          {isCorrectNetwork ? displayAddress : 'Wrong Network'}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2 text-sm">
          <div className="font-medium">Connected Wallet</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            {address}
          </div>
          {chain && (
            <div className="text-xs text-muted-foreground mt-1">
              Network: {chain.name} ({chain.id})
            </div>
          )}
          {!isCorrectNetwork && (
            <div className="text-xs text-red-500 mt-1 font-medium">
              ⚠️ Please switch to {NETWORK_CONFIG.name}
            </div>
          )}
        </div>

        <div className="border-t">
          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
            <Copy className="w-4 h-4 mr-2" />
            Copy Address
          </DropdownMenuItem>

          <DropdownMenuItem onClick={viewOnExplorer} className="cursor-pointer">
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Explorer
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => disconnect()}
            className="cursor-pointer text-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simplified version for inline use
export function WalletConnectButton({ className }: { className?: string }) {
  const { isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()

  if (isConnected) {
    return <WalletConnect className={className} />
  }

  return (
    <Button
      onClick={() => {
        // Connect with the first available connector (usually MetaMask)
        const connector = connectors.find(c => c.id === 'injected') || connectors[0]
        if (connector) connect({ connector })
      }}
      disabled={isPending}
      className={className}
    >
      <Wallet className="w-4 h-4 mr-2" />
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}