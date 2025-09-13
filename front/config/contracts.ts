// Contract addresses from deployed converter contracts on Fuji testnet
export const CONTRACT_ADDRESSES = {
  eERC: '0x271B03d3A18b2270764669EDa1696f0b43634764', // EncryptedERC
  registrar: '0x698CDfd5d082D6c796cFCe24f78aF77400BD149d',
  babyJubJub: '0x6F1290E2ee936f6a24a6eAa8B090Cea6DC733ae9',
  erc20: '0x7dF4f65Df627E53d1fb12CF5c4895E1ceB861c71', // TestERC20
  verifiers: {
    registration: '0x652902f169274A4D3019c47fbBB84282F238b7C6',
    mint: '0x95f229A96d46ae87C382240fbAA1fd707F43D4DA',
    withdraw: '0x4F29f555F373Dc0Dab5585a645fcEadf24012E74',
    transfer: '0xbDa482D4dB5F7930c152D3316dcDD59D039f4ce5'
  }
} as const

// Circuit URLs for ZK proof generation
// These should point to the actual circuit files from the EncryptedERC repository
export const CIRCUIT_URLS = {
  register: {
    wasm: '/circuits/registration/registration.wasm',
    zkey: '/circuits/registration/circuit_final.zkey'
  },
  transfer: {
    wasm: '/circuits/transfer/transfer.wasm',
    zkey: '/circuits/transfer/circuit_final.zkey'
  },
  mint: {
    wasm: '/circuits/mint/mint.wasm',
    zkey: '/circuits/mint/circuit_final.zkey'
  },
  withdraw: {
    wasm: '/circuits/withdraw/withdraw.wasm',
    zkey: '/circuits/withdraw/circuit_final.zkey'
  },
  burn: {
    wasm: '/circuits/burn/burn.wasm',
    zkey: '/circuits/burn/circuit_final.zkey'
  }
} as const

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 43113, // Avalanche Fuji Testnet
  name: 'Avalanche Fuji',
  rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  blockExplorer: 'https://testnet.snowtrace.io'
} as const
