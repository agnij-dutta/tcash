import { NextResponse } from "next/server"
import { groth16 } from "snarkjs"
import { poseidon3 } from "poseidon-lite"
import { Base8, mulPointEscalar, subOrder } from "@zk-kit/baby-jubjub"
import { formatPrivKeyForBabyJub } from "maci-crypto"
import { keccak256 } from "viem"
import { parseAbi, encodeFunctionData } from "viem"

// Minimal registrar ABI
const registrarAbi = parseAbi([
  "function isUserRegistered(address) view returns (bool)",
  "function register((uint256[2] a,uint256[2][2] b,uint256[2] c,uint256[5] publicSignals) proof)",
])

// Derive private key from signature (same as eerc-backend-converter)
function i0(signature: string): bigint {
  if (typeof signature !== "string" || signature.length < 132)
    throw new Error("Invalid signature hex string")

  const hash = keccak256(signature as `0x${string}`)
  const cleanSig = hash.startsWith("0x") ? hash.slice(2) : hash
  let bytes = new Uint8Array(cleanSig.length / 2)
  for (let i = 0; i < cleanSig.length; i += 2) {
    bytes[i / 2] = parseInt(cleanSig.substr(i, 2), 16)
  }

  bytes[0] &= 0b11111000
  bytes[31] &= 0b01111111
  bytes[31] |= 0b01000000

  const le = Array.from(bytes).reverse()
  let sk = BigInt(`0x${le.map(b => b.toString(16).padStart(2, '0')).join('')}`)

  sk %= subOrder
  if (sk === BigInt(0)) sk = BigInt(1)
  return sk
}

export async function POST(req: Request) {
  try {
    const { user, signature } = await req.json()
    if (!user || !signature) {
      return NextResponse.json({ error: "missing user or signature" }, { status: 400 })
    }

    // Derive keys from signature (same as eerc-backend-converter)
    const privateKey = i0(signature)
    const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder
    const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) => BigInt(x)) as [bigint, bigint]

    // Get chain ID from request headers or default to Fuji
    const chainId = 43113 // Fuji testnet

    const registrationHash = poseidon3([
      BigInt(chainId),
      formattedPrivateKey,
      BigInt(user),
    ])

    // Paths to wasm/zkey served by our circuit router
    const wasmUrl = new URL("/api/eerc/circuits/registration/wasm", req.url)
    const zkeyUrl = new URL("/api/eerc/circuits/registration/zkey", req.url)

    const wasmResp = await fetch(wasmUrl)
    const zkeyResp = await fetch(zkeyUrl)
    if (!wasmResp.ok || !zkeyResp.ok) throw new Error("circuit fetch failed")
    const wasm = await wasmResp.arrayBuffer()
    const zkey = await zkeyResp.arrayBuffer()

    const input = {
      SenderPrivateKey: String(formattedPrivateKey),
      SenderPublicKey: [String(publicKey[0]), String(publicKey[1])],
      SenderAddress: String(BigInt(user)),
      ChainID: String(BigInt(chainId)),
      RegistrationHash: String(registrationHash),
    }

    // Generate proof in-memory
    const { proof, publicSignals } = await groth16.fullProve(input, new Uint8Array(wasm), new Uint8Array(zkey))

    const a = [proof.pi_a[0], proof.pi_a[1]]
    const b = [
      [proof.pi_b[0][0], proof.pi_b[0][1]],
      [proof.pi_b[1][0], proof.pi_b[1][1]],
    ]
    const c = [proof.pi_c[0], proof.pi_c[1]]
    const pub = publicSignals.map((x: string) => BigInt(x))

    // Return calldata blob; client will send tx with their wallet
    const data = encodeFunctionData({
      abi: registrarAbi,
      functionName: "register",
      args: [{ a, b, c, publicSignals: pub } as any],
    })

    return NextResponse.json({ 
      calldata: data, 
      registrationHash: String(registrationHash),
      publicKey: [String(publicKey[0]), String(publicKey[1])],
      privateKey: String(formattedPrivateKey)
    })
  } catch (e: any) {
    console.error("Registration error:", e)
    return NextResponse.json({ error: e?.message || "registration failed" }, { status: 500 })
  }
}