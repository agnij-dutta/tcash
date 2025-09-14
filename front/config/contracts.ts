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
// These point to the actual circuit files in the public directory
export const CIRCUIT_URLS = {
  register: {
    wasm: '/circuits/registration/registration.wasm',
    zkey: '/circuits/registration/circuit_final.zkey'
  },
  transfer: {
    wasm: '/circuits/transfer/transfer.wasm',
    zkey: '/circuits/transfer/transfer.zkey'
  },
  mint: {
    wasm: '/circuits/mint/mint.wasm',
    zkey: '/circuits/mint/mint.zkey'
  },
  withdraw: {
    wasm: '/circuits/withdraw/withdraw.wasm',
    zkey: '/circuits/withdraw/circuit_final.zkey'
  },
  burn: {
    wasm: '/circuits/burn/burn.wasm',
    zkey: '/circuits/burn/burn.zkey'
  }
} as const

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 43113, // Avalanche Fuji Testnet
  name: 'Avalanche Fuji Testnet',
  rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  blockExplorer: 'https://testnet.snowscan.xyz'
} as const
