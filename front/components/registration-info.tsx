"use client"

import { 
  Shield, 
  Key, 
  Lock, 
  Eye, 
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Alert, AlertDescription } from "./ui/alert"

export function RegistrationInfo() {
  return (
    <div className="space-y-6">
      {/* Main Info Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="w-5 h-5" />
            What is eERC Registration?
          </CardTitle>
          <CardDescription className="text-white/70">
            Registration establishes your cryptographic identity for private encrypted operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/80">
            eERC registration is the starting point for using encrypted ERC tokens. It links your wallet address 
            with a unique public key and creates your cryptographic identity that enables all private operations.
          </p>
          
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <Key className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">Cryptographic Keys</h4>
                <p className="text-xs text-white/70">
                  Generate a unique private/public key pair using BabyJubJub elliptic curve cryptography
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <Lock className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">Zero-Knowledge Proof</h4>
                <p className="text-xs text-white/70">
                  Create a ZK proof that validates your registration without exposing your private key
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <Shield className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">Registrar Contract</h4>
                <p className="text-xs text-white/70">
                  Submit your public key to the eERC registrar contract for verification
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card className="bg-emerald-500/10 border-emerald-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Security Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-xs text-emerald-200">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" />
              Private key never leaves your device
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" />
              Zero-knowledge proofs ensure privacy
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" />
              Chain-specific registration prevents replay attacks
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" />
              Poseidon hash validation ensures authenticity
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Info className="w-4 h-4" />
            Technical Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-white/90 mb-1">Registration Circuit</h4>
            <div className="bg-black/20 p-2 rounded font-mono text-xs text-white/70">
              <div>type RegistrationCircuit struct {'{'}</div>
              <div className="ml-2">Sender RegistrationSender</div>
              <div>{'}'}</div>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold text-white/90 mb-1">Validation Process</h4>
            <ul className="text-xs text-white/70 space-y-1">
              <li>• Verify public key is mathematically well-formed on BabyJubJub curve</li>
              <li>• Validate registration hash (Poseidon hash of chain ID, private key, address)</li>
              <li>• Prevent cross-chain proof reuse and unauthorized registrations</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Alert className="bg-yellow-500/10 border-yellow-500/20">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="text-yellow-200 text-xs">
          <strong>Important:</strong> Save your decryption key securely. You'll need it to decrypt your private 
          transactions and recover your encrypted balance. If you lose this key, you may lose access to your 
          encrypted tokens.
        </AlertDescription>
      </Alert>
    </div>
  )
}
