'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  AlertCircle,
  Check,
  X,
  ChevronDown
} from 'lucide-react'

// Simple wallet interface
interface WalletInfo {
  address: string
  chainId: number
  connected: boolean
}

export function SimpleWalletConnect() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection()
  }, [])

  // Check current wallet connection
  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          setWallet({
            address: accounts[0],
            chainId: parseInt(chainId, 16),
            connected: true
          })
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err)
      }
    }
  }

  // Connect to MetaMask
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        
        setWallet({
          address: accounts[0],
          chainId: parseInt(chainId, 16),
          connected: true
        })

        // Try to switch to Celo Alfajores
        await switchToCeloAlfajores()
      }
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection rejected. Please try again and approve the connection.')
      } else {
        setError(err.message || 'Failed to connect wallet')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  // Switch to Celo Alfajores network
  const switchToCeloAlfajores = async () => {
    if (!window.ethereum) return

    const celoAlfajores = {
      chainId: '0xAEF3', // 44787 in hex
      chainName: 'Celo Alfajores Testnet',
      nativeCurrency: {
        name: 'Celo',
        symbol: 'CELO',
        decimals: 18,
      },
      rpcUrls: ['https://alfajores-forno.celo-testnet.org'],
      blockExplorerUrls: ['https://alfajores.celoscan.io/'],
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: celoAlfajores.chainId }],
      })
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [celoAlfajores],
          })
        } catch (addError) {
          console.error('Failed to add Celo Alfajores network:', addError)
        }
      } else {
        console.error('Failed to switch to Celo Alfajores:', switchError)
      }
    }
  }

  // Disconnect wallet
  const disconnect = () => {
    setWallet(null)
    setError(null)
  }

  // Copy address to clipboard
  const copyAddress = async () => {
    if (wallet?.address) {
      try {
        await navigator.clipboard.writeText(wallet.address)
        // Could add a toast notification here
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }
  }

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Get network name
  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 44787:
        return 'Celo Alfajores'
      case 42220:
        return 'Celo Mainnet'
      case 1:
        return 'Ethereum Mainnet'
      case 11155111:
        return 'Sepolia'
      default:
        return `Chain ${chainId}`
    }
  }

  // Check if on correct network
  const isCorrectNetwork = wallet?.chainId === 44787

  if (wallet?.connected) {
    return (
      <div className="relative">
        <Button
          onClick={() => setShowDropdown(!showDropdown)}
          variant="outline"
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {formatAddress(wallet.address)}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>

        {showDropdown && (
          <div className="absolute top-full mt-2 right-0 z-50">
            <Card className="w-80 bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Connected
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {formatAddress(wallet.address)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Network Status */}
                {!isCorrectNetwork ? (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-200">
                      Please switch to Celo Alfajores network
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <Check className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-200">
                      Connected to {getNetworkName(wallet.chainId)}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Network Switch Button */}
                {!isCorrectNetwork && (
                  <Button
                    onClick={switchToCeloAlfajores}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Switch to Celo Alfajores
                  </Button>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={copyAddress}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    onClick={() => window.open(`https://alfajores.celoscan.io/address/${wallet.address}`, '_blank')}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Explorer
                  </Button>
                </div>

                <Button
                  onClick={disconnect}
                  variant="outline"
                  className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  Disconnect
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-900/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription className="text-gray-400">
          Choose your wallet to connect to T-Cash
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MetaMask Button */}
        <Button
          onClick={connectMetaMask}
          disabled={isConnecting}
          className="w-full justify-between bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white"
          variant="outline"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🦊</span>
            <span>Connect with MetaMask</span>
          </div>
          {isConnecting ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <ExternalLink className="h-4 w-4 opacity-50" />
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 text-center pt-2">
          Don't have MetaMask?{' '}
          <a 
            href="https://metamask.io/download/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Download it here
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

// Simple wallet button for navbar
export function SimpleWalletButton() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    checkConnection()
    
    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setWallet(null)
        } else {
          checkConnection()
        }
      }
      
      const handleChainChanged = () => {
        checkConnection()
      }
      
      window.ethereum.on?.('accountsChanged', handleAccountsChanged)
      window.ethereum.on?.('chainChanged', handleChainChanged)
      
      return () => {
        window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener?.('chainChanged', handleChainChanged)
      }
    }
  }, [])

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          setWallet({
            address: accounts[0],
            chainId: parseInt(chainId, 16),
            connected: true
          })
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err)
      }
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed! Please install MetaMask to connect your wallet.')
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        setWallet({
          address: accounts[0],
          chainId: parseInt(chainId, 16),
          connected: true
        })
        
        // Try to switch to Celo Alfajores after connecting
        await switchToCeloAlfajores()
      }
    } catch (err: any) {
      console.error('Failed to connect wallet:', err)
      if (err.code === 4001) {
        alert('Connection rejected. Please try again and approve the connection.')
      } else {
        alert('Failed to connect wallet. Please try again.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const switchToCeloAlfajores = async () => {
    if (!window.ethereum) return

    const celoAlfajores = {
      chainId: '0xAEF3', // 44787 in hex
      chainName: 'Celo Alfajores Testnet',
      nativeCurrency: {
        name: 'Celo',
        symbol: 'CELO',
        decimals: 18,
      },
      rpcUrls: ['https://alfajores-forno.celo-testnet.org'],
      blockExplorerUrls: ['https://alfajores.celoscan.io/'],
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: celoAlfajores.chainId }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [celoAlfajores],
          })
        } catch (addError) {
          console.error('Failed to add Celo Alfajores network:', addError)
        }
      }
    }
  }

  const disconnect = () => {
    setWallet(null)
    setShowDropdown(false)
  }

  const copyAddress = async () => {
    if (wallet?.address) {
      try {
        await navigator.clipboard.writeText(wallet.address)
        alert('Address copied to clipboard!')
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }
  }

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 44787:
        return 'Celo Alfajores'
      case 42220:
        return 'Celo Mainnet'
      case 1:
        return 'Ethereum'
      case 11155111:
        return 'Sepolia'
      default:
        return `Chain ${chainId}`
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (wallet?.connected) {
    return (
      <div className="relative">
        <Button
          onClick={() => setShowDropdown(!showDropdown)}
          variant="outline"
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {formatAddress(wallet.address)}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>

        {showDropdown && (
          <div className="absolute top-full mt-2 right-0 z-50 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
            <div className="p-4 space-y-3">
              <div className="text-sm">
                <div className="text-white font-medium">Connected Wallet</div>
                <div className="text-gray-400 font-mono text-xs">{formatAddress(wallet.address)}</div>
                <div className="text-gray-400 text-xs">{getNetworkName(wallet.chainId)}</div>
              </div>
              
              {wallet.chainId !== 44787 && (
                <Button
                  onClick={switchToCeloAlfajores}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Switch to Celo Alfajores
                </Button>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={copyAddress}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  onClick={() => window.open(`https://alfajores.celoscan.io/address/${wallet.address}`, '_blank')}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Explorer
                </Button>
              </div>
              
              <Button
                onClick={disconnect}
                variant="outline"
                size="sm"
                className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
        
        {/* Backdrop to close dropdown */}
        {showDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>
    )
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      <Wallet className="h-4 w-4 mr-2" />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}

// Add types for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
