# Xandeum pNode Analytics

Real-time analytics dashboard for monitoring Xandeum pNodes on the Solana network.

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple)

🔗 **Live Demo:** [xandeum-pnodes.vercel.app](https://xandeum-pnodes.vercel.app)

## Features

- 📊 **Real-time Node Discovery** - Discovers nodes via Xandeum devnet and Solana cluster gossip
- 🔍 **Search & Filter** - Filter by pubkey, version, location, health status
- 📈 **Analytics Charts** - Version distribution and network visualization
- 🌍 **Geo-location** - Automatic IP geolocation for node mapping
- 🌙 **Dark/Light Theme** - Toggle between themes
- 📤 **Data Export** - Export node data as JSON or CSV
- ⚡ **Auto-refresh** - Automatic data refresh every 30 seconds

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build for Production

```bash
npm run build
npm run preview
```

## How It Works

The dashboard discovers Xandeum nodes through multiple sources:

1. **Xandeum Devnet RPC** - Primary source via `xand-rpc2.devnet.xandeum.com:8899`
2. **Solana Mainnet RPC** - Fallback, filters by Xandeum version patterns
3. **Version Detection** - Identifies nodes by version signatures:
   - pNodes: `0.xxx.xxxxx` (e.g., `0.806.30102`)
   - vNodes: `x.x.x-xxxxxxxx` (e.g., `2.2.0-7c3f39e8`)
4. **Geo Enrichment** - Fetches location data for node IPs

### Note on pNode RPC Access

Direct pNode RPC access (port 9001) is typically firewalled. The dashboard uses central RPC endpoints to discover nodes via the gossip network instead.

## Tech Stack

- **React 19** + TypeScript
- **Vite** with Rolldown
- **Lucide React** icons
- **Custom CSS** (no UI framework)

## Configuration

No environment variables required. The app uses public RPC endpoints by default.

You can configure a custom RPC endpoint in the Settings panel.

Default endpoints (in priority order):
1. `http://xand-rpc2.devnet.xandeum.com:8899` (Xandeum devnet)
2. `https://api.mainnet-beta.solana.com` (Solana mainnet)

## Project Structure

```
src/
├── components/     # UI components
├── hooks/          # React hooks
├── pages/          # Page components
├── services/       # API services
└── types/          # TypeScript types
```

## License

MIT

---

Built for the Xandeum Superteam Bounty
