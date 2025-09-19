'use client'

import { useState } from 'react'
import { useConnect, useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { celoAlfajores, celo } from 'wagmi/chains'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Wallet, 
  ChevronDown, 
  Check, 
  ExternalLink, 
  AlertCircle,
  Loader2 
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface WalletConnectionProps {
  onConnectionChange?: (connected: boolean, address?: string) => void
  requiredChainId?: number
  className?: string
}

export function WalletConnection({ 
  onConnectionChange, 
  requiredChainId = celoAlfajores.id,
  className = "" 
}: WalletConnectionProps) {
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const { connectors, connect, status, error } = useConnect()
  const { address, isConnected, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isCorrectNetwork = chainId === requiredChainId
  const targetChain = requiredChainId === celoAlfajores.id ? celoAlfajores : celo

  // Handle connection
  const handleConnect = async (connectorToUse: typeof connectors[0]) => {
    try {
      setIsConnecting(connectorToUse.id)
      await connect({ connector: connectorToUse })
      onConnectionChange?.(true, address)
    } catch (err) {
      console.error('Connection failed:', err)
    } finally {
      setIsConnecting(null)
    }
  }

  // Handle disconnection
  const handleDisconnect = () => {
    disconnect()
    onConnectionChange?.(false)
  }

  // Handle network switch
  const handleSwitchNetwork = () => {
    if (switchChain) {
      switchChain({ chainId: requiredChainId as typeof celoAlfajores.id })
    }
  }

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Get wallet icon
  const getWalletIcon = (connectorName: string) => {
    switch (connectorName.toLowerCase()) {
      case 'metamask':
      case 'injected':
        return '🦊'
      case 'coinbase wallet':
      case 'coinbasewallet':
        return '🔷'
      default:
        return '👛'
    }
  }

  // Get network status
  const getNetworkStatus = () => {
    if (!isConnected) return null
    
    if (!isCorrectNetwork) {
      return (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-200">
            Please switch to {targetChain.name} network
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <Check className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-200">
          Connected to {targetChain.name}
        </AlertDescription>
      </Alert>
    )
  }

  if (!isConnected) {
    return (
      <Card className={`w-full max-w-md mx-auto bg-gray-900/50 border-gray-700 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </CardTitle>
          <CardDescription className="text-gray-400">
            Choose your preferred wallet to connect to T-Cash
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={isConnecting === connector.id || status === 'pending'}
              className="w-full justify-between bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white"
              variant="outline"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{getWalletIcon(connector.name)}</span>
                <span>{connector.name}</span>
              </div>
              {isConnecting === connector.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 opacity-50" />
              )}
            </Button>
          ))}

          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200">
                {error.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-gray-500 text-center pt-2">
            New to crypto? We recommend{' '}
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              MetaMask
            </a>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full max-w-md mx-auto bg-gray-900/50 border-gray-700 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getWalletIcon(connector?.name || '')}</span>
            <div>
              <CardTitle className="text-white text-sm">
                {connector?.name || 'Connected'}
              </CardTitle>
              <CardDescription className="text-xs">
                {formatAddress(address!)}
              </CardDescription>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-600">
              <DropdownMenuLabel className="text-gray-300">Wallet Actions</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-600" />
              <DropdownMenuItem 
                onClick={() => navigator.clipboard.writeText(address!)}
                className="text-gray-300 hover:bg-gray-700"
              >
                Copy Address
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => window.open(`${targetChain.blockExplorers?.default.url}/address/${address}`, '_blank')}
                className="text-gray-300 hover:bg-gray-700"
              >
                View on Explorer
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-600" />
              <DropdownMenuItem 
                onClick={handleDisconnect}
                className="text-red-400 hover:bg-gray-700"
              >
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Network Status */}
        {getNetworkStatus()}
        
        {/* Network Switch Button */}
        {!isCorrectNetwork && (
          <Button
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isSwitching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Switching...
              </>
            ) : (
              <>
                Switch to {targetChain.name}
              </>
            )}
          </Button>
        )}

        {/* Account Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Network:</span>
          <Badge variant={isCorrectNetwork ? "default" : "secondary"}>
            {isCorrectNetwork ? targetChain.name : `Wrong Network (${chainId})`}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Status:</span>
          <Badge variant="default" className="bg-green-600">
            <Check className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// Simplified wallet connect button for inline use
export function WalletConnectButton({ 
  className = "",
  onConnect 
}: { 
  className?: string
  onConnect?: (address: string) => void 
}) {
  const { connect, connectors } = useConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`bg-gray-800 border-gray-600 text-white ${className}`}>
            <Wallet className="h-4 w-4 mr-2" />
            {address.slice(0, 6)}...{address.slice(-4)}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-gray-800 border-gray-600">
          <DropdownMenuItem 
            onClick={() => navigator.clipboard.writeText(address)}
            className="text-gray-300 hover:bg-gray-700"
          >
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => disconnect()}
            className="text-red-400 hover:bg-gray-700"
          >
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={`bg-blue-600 hover:bg-blue-700 ${className}`}>
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-600">
        <DropdownMenuLabel className="text-gray-300">Choose Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-600" />
        {connectors.map((connector) => (
          <DropdownMenuItem
            key={connector.id}
            onClick={() => {
              connect({ connector })
              onConnect?.(address || '')
            }}
            className="text-gray-300 hover:bg-gray-700"
          >
            <span className="mr-2">{connector.name.includes('MetaMask') || connector.name.includes('Injected') ? '🦊' : connector.name.includes('Coinbase') ? '🔷' : '👛'}</span>
            {connector.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
