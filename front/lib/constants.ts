// Contract constants
export const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

// ERC20 ABI (minimal for our needs)
export const ERC20_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "timeUntilNextRequest",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// eERC Converter ABI (matches the actual contract interface)
export const EERC_CONVERTER_ABI = [
  {
    "inputs": [
      {"name": "amount", "type": "uint256"},
      {"name": "tokenAddress", "type": "address"},
      {"name": "amountPCT", "type": "uint256[7]"}
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "tokenId", "type": "uint256"},
      {
        "components": [
          {
            "components": [
              {"name": "a", "type": "uint256[2]"},
              {"name": "b", "type": "uint256[2][2]"},
              {"name": "c", "type": "uint256[2]"}
            ],
            "name": "proofPoints",
            "type": "tuple"
          },
          {"name": "publicSignals", "type": "uint256[16]"}
        ],
        "name": "proof",
        "type": "tuple"
      },
      {"name": "balancePCT", "type": "uint256[7]"}
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isAuditorKeySet",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "auditorPublicKey",
    "outputs": [{"name": "", "type": "uint256[2]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenAddress", "type": "address"}],
    "name": "tokenIds",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "tokenId", "type": "uint256"}
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {"name": "x", "type": "uint256"},
              {"name": "y", "type": "uint256"}
            ],
            "name": "c1",
            "type": "tuple"
          },
          {
            "components": [
              {"name": "x", "type": "uint256"},
              {"name": "y", "type": "uint256"}
            ],
            "name": "c2",
            "type": "tuple"
          }
        ],
        "name": "eGCT",
        "type": "tuple"
      },
      {"name": "nonce", "type": "uint256"},
      {"name": "amountPCTs", "type": "tuple[]"},
      {"name": "balancePCT", "type": "uint256[7]"},
      {"name": "transactionIndex", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Helper function to format display amounts
export function formatDisplayAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === 0n) {
    return wholePart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  if (trimmedFractional === '') {
    return wholePart.toString();
  }
  
  return `${wholePart}.${trimmedFractional}`;
}
