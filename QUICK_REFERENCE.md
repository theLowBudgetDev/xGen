# Quick Reference - Contract Generator

## 🔑 API Keys

**Gemini**: https://aistudio.google.com/apikey
**Pinata**: https://pinata.cloud → API Keys

## 🌐 MultiversX Devnet URLs

- **Wallet**: https://devnet-wallet.multiversx.com
- **Faucet**: https://devnet-wallet.multiversx.com/faucet
- **Explorer**: https://devnet-explorer.multiversx.com
- **API**: https://devnet-api.multiversx.com
- **Gateway**: https://devnet-gateway.multiversx.com




## 📝 Common Commands

### Deploy Contract

```bash
cd contract
sc-meta all build
mxpy contract deploy --bytecode=output/contract.wasm --pem=../backend/wallet.pem --gas-limit=60000000 --proxy=https://devnet-gateway.multiversx.com --chain=D --recall-nonce --send
```

### Generate Contract (User)

```bash
mxpy contract call <CONTRACT_ADDRESS> --function=generateContract --pem=wallet.pem --gas-limit=10000000 --arguments str:"Create a staking contract" str:DeFi --proxy=https://devnet-gateway.multiversx.com --chain=D --recall-nonce --send
```

### Mint NFT

```bash
mxpy contract call <CONTRACT_ADDRESS> --function=mintTemplateNFT --pem=wallet.pem --gas-limit=15000000 --value=50000000000000000 --arguments 1 str:"My Contract" --proxy=https://devnet-gateway.multiversx.com --chain=D --recall-nonce --send
```

### Start Backend

```bash
cd backend
npm run dev
```

### Test Generation (Standalone)

```bash
curl -X POST http://localhost:3000/api/test-generate -H "Content-Type: application/json" -d '{"description":"Create a token","category":"DeFi"}'
```

## 📊 Gas Limits

| Function           | Gas Limit  |
| ------------------ | ---------- |
| generateContract   | 10,000,000 |
| completeGeneration | 10,000,000 |
| mintTemplateNFT    | 15,000,000 |
| listTemplate       | 15,000,000 |
| purchaseTemplate   | 15,000,000 |
| rateTemplate       | 5,000,000  |

## 💰 Costs

| Action               | Cost         |
| -------------------- | ------------ |
| Deploy contract      | ~0.001 EGLD  |
| Issue NFT collection | 0.05 EGLD    |
| Generate contract    | ~0.0001 EGLD |
| Mint NFT             | 0.05 EGLD    |
| Oracle callback      | ~0.0001 EGLD |

## 🔍 Debugging

### Check Backend Logs

```bash
cd backend
npm run dev
# Watch for event detection and processing
```

### Check Transaction

```
https://devnet-explorer.multiversx.com/transactions/<TX_HASH>
```

### Check Contract

```
https://devnet-explorer.multiversx.com/accounts/<CONTRACT_ADDRESS>
```

### Check Wallet Balance

```bash
mxpy wallet pem-address wallet.pem
# Then check on explorer
```

## 📁 File Locations

- Contract: `c:/Users/onahe/OneDrive/Desktop/xEnR/contract/`
- Backend: `c:/Users/onahe/OneDrive/Desktop/xEnR/backend/`
- Wallet: `c:/Users/onahe/OneDrive/Desktop/xEnR/backend/wallet.pem`
- .env: `c:/Users/onahe/OneDrive/Desktop/xEnR/backend/.env`

## ✅ Success Indicators

**Backend Started**:

```
✅ Gemini AI initialized
✅ Pinata connection successful
✅ MultiversX event listener initialized
✅ Oracle callback initialized
👂 Starting event listener...
```

**Generation Detected**:

```
📨 NEW GENERATION REQUEST
🤖 Generating Rust code with Gemini AI...
✅ Code generated successfully
📤 Uploading code to IPFS...
✅ Code uploaded to IPFS: QmXXX...
📡 Calling smart contract oracle...
✅ GENERATION COMPLETED SUCCESSFULLY
```

## 🐛 Common Issues

**"Missing API key"**: Check `.env` file
**"Event not detected"**: Wait 6+ seconds, check contract address
**"Oracle failed"**: Check wallet has EGLD, verify PEM file
**"Gemini error"**: Check API key, verify quota
**"IPFS failed"**: Verify Pinata keys

## 📞 Support

- MultiversX Docs: https://docs.multiversx.com
- Gemini Docs: https://ai.google.dev/docs
- Pinata Docs: https://docs.pinata.cloud
