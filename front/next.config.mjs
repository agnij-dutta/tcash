import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const webpack = require('webpack')
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
  webpack: (config) => {
    // Polyfill Node core modules used by snarkjs/@avalabs/eerc-sdk in the browser
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      assert: require.resolve("assert"),
      util: require.resolve("util"),
      process: require.resolve("process/browser"),
      buffer: require.resolve("buffer/"),
      path: require.resolve("path-browserify"),
      fs: false,
      worker_threads: false,
    }
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'node:crypto': require.resolve('crypto-browserify'),
      'node:stream': require.resolve('stream-browserify'),
      'node:assert': require.resolve('assert'),
      'node:util': require.resolve('util'),
      'node:process': require.resolve('process/browser'),
      'node:buffer': require.resolve('buffer/'),
      'node:path': require.resolve('path-browserify'),
      'node:fs': false,
    }
    // Provide Buffer and process globals
    config.plugins = config.plugins || []
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
        process: ["process/browser"],
      })
    )
    return config
  },
}

export default nextConfig
