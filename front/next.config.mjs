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

    // Add support for WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    }

    // Ensure proper handling of .wasm and .zkey files
    config.module.rules.push(
      {
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/wasm/[name].[hash][ext]'
        }
      },
      {
        test: /\.zkey$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/zkey/[name].[hash][ext]'
        }
      }
    )
    
    // Ignore specific warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/
    ]
    
    return config
  },
  experimental: {
    esmExternals: 'loose'
  },
  async headers() {
    return [
      {
        source: '/circuits/:path*.wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/circuits/:path*.zkey',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/octet-stream'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  }
}

export default nextConfig
