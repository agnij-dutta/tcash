import { NextRequest, NextResponse } from 'next/server';

const MOCK_ORACLE_ADDRESS = '0xeCc097dCf57C9b896e5902b8E82FEacD60919891';
const RPC_URL = 'https://alfajores-forno.celo-testnet.org';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    // Call the mock oracle contract
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: MOCK_ORACLE_ADDRESS,
            data: `0xa5410a66000000000000000000000000${address.slice(2).toLowerCase()}` // isUserKYCCompliant(address)
          },
          'latest'
        ],
        id: 1
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Parse the result (0x01 = true, 0x00 = false)
    const isVerified = data.result === '0x0000000000000000000000000000000000000000000000000000000000000001';

    return NextResponse.json({ 
      isVerified,
      contractAddress: MOCK_ORACLE_ADDRESS,
      userAddress: address
    });

  } catch (error) {
    console.error('Error checking KYC:', error);
    return NextResponse.json({ 
      error: 'Failed to check KYC status',
      isVerified: false 
    }, { status: 500 });
  }
}
