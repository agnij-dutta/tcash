"use client"

import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Button } from "./ui/button"
import { Wallet, LogOut } from "lucide-react"
import { useState } from "react"

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await connect({ connector: connectors[0] })
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/15">
          <Wallet className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">
            {`${address.slice(0, 6)}...${address.slice(-4)}`}
          </span>
        </div>
        <Button
          onClick={handleDisconnect}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/15 text-white hover:bg-white/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isPending || isConnecting}
      className="bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition-all"
    >
      <Wallet className="w-4 h-4 mr-2" />
      {isPending || isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  )
}
