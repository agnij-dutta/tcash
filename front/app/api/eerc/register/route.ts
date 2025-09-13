import { NextResponse } from "next/server"
import { groth16 } from "snarkjs"
import { poseidon3 } from "poseidon-lite"
import path from "path"
import { createPublicClient, http, getAbiItem, parseAbi, encodeFunctionData } from "viem"
import { avalancheFuji } from "viem/chains"

// Minimal registrar ABI
const registrarAbi = parseAbi([
  "function isUserRegistered(address) view returns (bool)",
  "function register((uint256[2] a,uint256[2][2] b,uint256[2] c,uint256[5] publicSignals) proof)",
])

export async function POST(req: Request) {
  try {
    const { user, registrar, chainId, publicKey, formattedPrivateKey } = await req.json()
    if (!user || !registrar || !chainId || !publicKey || !formattedPrivateKey) {
      return NextResponse.json({ error: "missing params" }, { status: 400 })
    }

    const registrationHash = poseidon3([
      BigInt(chainId),
      BigInt(formattedPrivateKey),
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

    return NextResponse.json({ calldata: data, registrationHash: String(registrationHash) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "registration failed" }, { status: 500 })
  }
}


