import { NextResponse } from "next/server"
import { createPublicClient, http, parseAbi } from "viem"
import { avalancheFuji } from "viem/chains"

const ABI = parseAbi([
  "function tokenIds(address token) view returns (uint256)",
  "function balanceOf(address user, uint256 tokenId) view returns (((uint256 c1x,uint256 c1y,uint256 c2x,uint256 c2y) eGCT,uint256 nonce, (uint256[7] amountPCTs)[] amountPCTs, uint256[7] balancePCT, uint256 transactionIndex))",
])

export async function POST(req: Request) {
  try {
    const { encryptedErcAddress, user, token } = await req.json()
    if (!encryptedErcAddress || !user || !token) {
      return NextResponse.json({ error: "missing params" }, { status: 400 })
    }
    const client = createPublicClient({ chain: avalancheFuji, transport: http("https://api.avax-test.network/ext/bc/C/rpc") })

    const tokenId = await client.readContract({
      address: encryptedErcAddress,
      abi: ABI,
      functionName: "tokenIds",
      args: [token],
    }) as bigint

    const result = await client.readContract({
      address: encryptedErcAddress,
      abi: ABI,
      functionName: "balanceOf",
      args: [user, tokenId],
    }) as any

    // Return raw encrypted components; client can decrypt via SDK
    return NextResponse.json({ tokenId: tokenId.toString(), balance: result })
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
