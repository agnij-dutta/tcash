// Contract addresses from your deployment
export const CONTRACT_ADDRESSES = {
  eERC: '0xf8a046309a39A9E7C31BeA40256225332376b836',
  registrar: '0x420058F5FB767773150d1a6987bCf10f4EA088aC',
  babyJubJub: '0xd7e2472447604DbEB303930379C9A0F16B328C5A',
  erc20: '0x64230e8A79EF26ADc0a5bd6BeA06fa08311F2d17',
  verifiers: {
    registration: '0x6F212fEc35A4872a9475bd92CA370a6ea004A1AE',
    mint: '0x137821E5B2dAb864B00cd56A03f61ACc9FB80854',
    withdraw: '0x6918e91a0C7776041CB4787E8606B572a6C9E99b',
    transfer: '0xA15404225102e1C386E578618911816097E23De6'
  }
} as const

// Circuit URLs for ZK proof generation
// These should point to the actual circuit files from the EncryptedERC repository
export const CIRCUIT_URLS = {
  register: {
    wasm: '/circuits/registration.wasm',
    zkey: '/circuits/registration.zkey'
  },
  transfer: {
    wasm: '/circuits/transfer.wasm',
    zkey: '/circuits/transfer.zkey'
  },
  mint: {
    wasm: '/circuits/mint.wasm',
    zkey: '/circuits/mint.zkey'
  },
  withdraw: {
    wasm: '/circuits/withdraw.wasm',
    zkey: '/circuits/withdraw.zkey'
  },
  burn: {
    wasm: '/circuits/burn.wasm',
    zkey: '/circuits/burn.zkey'
  }
} as const

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 43114, // Avalanche Mainnet
  name: 'Avalanche',
  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  blockExplorer: 'https://snowtrace.io'
} as const
