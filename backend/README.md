# Contract Generator Backend

Backend AI service for the Natural Language to Rust Smart Contract Generator.

## Features

- ✅ Gemini AI integration for code generation
- ✅ IPFS storage via Pinata
- ✅ REST API with rate limiting
- ✅ TypeScript for type safety
- 🚧 MultiversX event listener (coming soon)
- 🚧 Oracle callback mechanism (coming soon)

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required variables:

- `GEMINI_API_KEY` - Get from https://aistudio.google.com/apikey
- `PINATA_API_KEY` - Get from https://pinata.cloud
- `PINATA_SECRET_KEY` - Get from https://pinata.cloud
- `CONTRACT_ADDRESS` - Your deployed contract address (optional for testing)

### 3. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check

```
GET /health
```

### Test Code Generation

```
POST /api/test-generate
Content-Type: application/json

{
  "description": "Create a simple token contract with minting and burning",
  "category": "DeFi"
}
```

Response:

```json
{
  "success": true,
  "cid": "Qm...",
  "codeLength": 1234,
  "preview": "..."
}
```

### Retrieve Code from IPFS

```
GET /api/code/:cid
```

## Testing

### Test Gemini Integration

```bash
curl -X POST http://localhost:3000/api/test-generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a staking contract where users can stake EGLD and earn rewards",
    "category": "DeFi"
  }'
```

### Test IPFS Retrieval

```bash
curl http://localhost:3000/api/code/YOUR_CID_HERE
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts           # Main server
│   ├── config.ts          # Configuration
│   ├── gemini/
│   │   ├── prompts.ts     # AI prompts
│   │   └── generator.ts   # Code generator
│   └── ipfs/
│       └── storage.ts     # IPFS client
├── package.json
├── tsconfig.json
└── .env
```

## Next Steps

- [ ] Implement MultiversX event listener
- [ ] Add oracle callback mechanism
- [ ] Deploy to cloud (Railway/Render)
- [ ] Add comprehensive error handling
- [ ] Implement request queuing

## Development

```bash
# Development with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## License

MIT
