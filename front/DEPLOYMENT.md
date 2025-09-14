# TCash Frontend - Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/tcash&project-name=tcash-frontend&repository-name=tcash&demo-title=TCash%20Privacy%20DeFi&demo-description=Privacy-preserving%20DeFi%20transactions%20on%20Avalanche&demo-url=https://tcash-demo.vercel.app)

### Option 2: Manual Deployment

1. **Fork/Clone the Repository**
   ```bash
   git clone https://github.com/your-username/tcash.git
   cd tcash/front
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Test Local Build**
   ```bash
   npm run build
   npm run start
   ```

4. **Deploy to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Connect your GitHub account
   - Import the project
   - Set the root directory to `front/`
   - Deploy!

## 📋 Deployment Configuration

### Required Files (✅ Already Configured)
- `package.json` - Build scripts and dependencies
- `next.config.mjs` - Next.js configuration
- `vercel.json` - Vercel deployment configuration
- `.vercelignore` - Files to exclude from deployment
- `tsconfig.json` - TypeScript configuration

### Environment Variables

The following environment variables can be set in Vercel dashboard (optional):

```bash
# Copy from env.example
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_CHAIN_ID=43113
NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_APP_NAME=TCash
NEXT_PUBLIC_DEBUG=false
```

**Note**: Most configuration is hardcoded for demo purposes, so environment variables are optional.

## 🔧 Build Configuration

### Vercel Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install`
- **Root Directory**: `front/` (if deploying from monorepo)

### Performance Optimizations
- Static asset caching (31536000s for circuits and Next.js static files)
- Security headers (XSS Protection, Content-Type Options, etc.)
- Function optimization (1024MB memory, 30s timeout for API routes)
- Image optimization disabled (for demo compatibility)

## 🏗️ Project Structure

```
front/
├── app/                    # Next.js 13+ App Router
│   ├── dashboard/         # Dashboard page
│   ├── deposit/           # Deposit functionality
│   ├── swap/             # Privacy swap interface
│   ├── withdraw/         # Withdraw functionality
│   └── layout.tsx        # Root layout
├── components/           # React components
├── hooks/               # Custom React hooks
├── public/              # Static assets
│   └── circuits/        # ZK circuit files (.wasm, .zkey)
├── config/              # App configuration
├── providers/           # React providers
├── vercel.json          # Vercel configuration
└── package.json         # Dependencies and scripts
```

## 🔐 Features Deployed

### Core Functionality
✅ Privacy-preserving swaps  
✅ Encrypted token deposits  
✅ Private withdrawals  
✅ Transaction history  
✅ Dashboard analytics  
✅ Hardcoded wallet (no MetaMask required)  
✅ ZK proof simulation  

### Technical Features
✅ Next.js 14 with App Router  
✅ TypeScript support  
✅ Tailwind CSS styling  
✅ Responsive design  
✅ Security headers  
✅ Performance optimized  
✅ Static asset caching  

## 🚨 Important Notes

1. **Demo Mode**: The app uses hardcoded balances and mock transactions for demonstration
2. **ZK Circuits**: Circuit files are included in `/public/circuits/` for complete functionality
3. **No External Dependencies**: Everything needed for deployment is included
4. **Browser Compatibility**: Configured with proper polyfills for crypto operations
5. **Security**: Includes security headers and content protection

## 🐛 Troubleshooting

### Build Errors
If you encounter build errors:
1. Check Node.js version (18+ recommended)
2. Clear cache: `rm -rf .next node_modules && npm install`
3. Verify all dependencies: `npm run build`

### Deployment Issues
- Ensure root directory is set to `front/` if deploying from monorepo
- Check Vercel function logs for runtime errors
- Verify environment variables are set correctly

### Performance Issues
- Circuit files are cached for 1 year
- Static assets are optimized
- Images are served unoptimized for compatibility

## 📈 Post-Deployment

After successful deployment:
1. Test all functionality (deposit, swap, withdraw)
2. Check browser console for errors
3. Verify transaction history persistence
4. Test responsive design on mobile

## 🔗 Live Demo

Once deployed, your TCash privacy DeFi application will be available at:
`https://your-project-name.vercel.app`

Enjoy your privacy-preserving DeFi experience! 🎉
