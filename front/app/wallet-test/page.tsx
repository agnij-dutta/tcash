'use client'

import { WalletConnect } from '@/components/wallet-connect'

export default function WalletTestPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Wallet Connection Test</h1>
          <p className="text-gray-400">
            Test the wallet connection functionality for T-Cash
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Wallet Connection Component */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
            <WalletConnect />
          </div>

          {/* Instructions */}
          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Instructions</h3>
            <div className="space-y-4 text-gray-300">
              <div>
                <h4 className="font-medium text-white">1. Install MetaMask</h4>
                <p className="text-sm">
                  If you don't have MetaMask installed, download it from{' '}
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    metamask.io
                  </a>
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-white">2. Connect Wallet</h4>
                <p className="text-sm">
                  Click on "MetaMask" or "Coinbase Wallet" to connect your wallet to T-Cash.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-white">3. Add Celo Alfajores</h4>
                <p className="text-sm">
                  The app will automatically prompt you to add the Celo Alfajores testnet.
                  This is where T-Cash operates for testing.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-white">4. Get Test Tokens</h4>
                <p className="text-sm">
                  Get free CELO tokens from the{' '}
                  <a 
                    href="https://faucet.celo.org/alfajores" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Celo Alfajores Faucet
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Network Information */}
        <div className="mt-12 bg-gray-900/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4">Network Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-white mb-2">Celo Alfajores Testnet</h4>
              <div className="space-y-1 text-gray-300">
                <p><span className="text-white">Chain ID:</span> 44787</p>
                <p><span className="text-white">RPC URL:</span> https://alfajores-forno.celo-testnet.org</p>
                <p><span className="text-white">Currency:</span> CELO</p>
                <p><span className="text-white">Explorer:</span> https://alfajores.celoscan.io/</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-white mb-2">Contract Addresses</h4>
              <div className="space-y-1 text-gray-300">
                <p><span className="text-white">Self KYC Verifier:</span></p>
                <p className="font-mono text-xs">0x31fE360492189a0c03BACaE36ef9be682Ad3727B</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
