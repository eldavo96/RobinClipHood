/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/ffmpeg/:path*',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
  webpack(config, { isServer }) {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
      }
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
        'onnxruntime-node/binding': false,
      }
    }
    config.module.rules.push(
      { test: /\.node$/, use: 'ignore-loader' },
      { test: /onnxruntime-node/, use: 'ignore-loader' }
    )
    return config
  },
}

module.exports = nextConfig