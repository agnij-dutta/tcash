/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Handle node modules for browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        buffer: 'buffer',
        process: 'process/browser',
        path: 'path-browserify',
        assert: 'assert',
        util: 'util',
        'node:crypto': 'crypto-browserify',
        'node:fs': false,
        'node:path': 'path-browserify',
        'node:stream': 'stream-browserify',
        'node:util': 'util'
      }
      
      // Add externals to exclude node: imports
      config.externals = {
        ...config.externals,
        'node:crypto': 'crypto-browserify',
        'node:fs': '{}',
        'node:path': 'path-browserify',
        'node:stream': 'stream-browserify',
        'node:util': 'util'
      }
    }
    
    // Ignore specific warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/
    ]
    
    return config
  },
  experimental: {
    esmExternals: 'loose'
  }
}

export default nextConfig
