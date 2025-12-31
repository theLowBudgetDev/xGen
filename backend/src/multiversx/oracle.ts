// MultiversX Oracle Callback

import { 
  Account, 
  Address, 
  SmartContract,
  Transaction,
  TransactionPayload,
  TokenTransfer
} from '@multiversx/sdk-core';
import { UserSigner } from '@multiversx/sdk-wallet';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import * as fs from 'fs';

export class OracleCallback {
  private provider: ApiNetworkProvider;
  private contract: SmartContract;
  private signer: UserSigner;
  private signerAddress: Address;
  private chainId: string;

  constructor(
    apiUrl: string,
    contractAddress: string,
    walletPemPath: string,
    chainId: string = 'D' // D = devnet, 1 = mainnet
  ) {
    this.provider = new ApiNetworkProvider(apiUrl);
    this.contract = new SmartContract({ 
      address: new Address(contractAddress) 
    });
    this.chainId = chainId;

    // Load wallet from PEM file
    const pemContent = fs.readFileSync(walletPemPath, 'utf-8');
    this.signer = UserSigner.fromPem(pemContent);
    const signerAddr = this.signer.getAddress();
    this.signerAddress = new Address(signerAddr.bech32());

    console.log(`🔑 Oracle wallet: ${this.signerAddress.bech32()}`);
  }

  /**
   * Call completeGeneration on the smart contract
   */
  async completeGeneration(
    generationId: number,
    codeHash: string,
    success: boolean
  ): Promise<string> {
    console.log(`📤 Sending oracle callback for generation ${generationId}...`);

    try {
      // Get account nonce
      const account = await this.provider.getAccount(this.signerAddress);
      
      // Build transaction
      const tx = new Transaction({
        data: new TransactionPayload(
          `completeGeneration@${this.numberToHex(generationId)}@${this.stringToHex(codeHash)}@${success ? '01' : '00'}`
        ),
        gasLimit: 10_000_000,
        receiver: this.contract.getAddress(),
        sender: this.signerAddress,
        value: TokenTransfer.egldFromAmount(0),
        chainID: this.chainId,
        nonce: account.nonce
      });

      // Sign transaction
      const serializedTx = tx.serializeForSigning();
      const signature = await this.signer.sign(serializedTx);
      tx.applySignature(signature);

      // Send transaction
      const txHash = await this.provider.sendTransaction(tx);
      
      console.log(`✅ Oracle callback sent: ${txHash}`);
      console.log(`   Generation ID: ${generationId}`);
      console.log(`   Success: ${success}`);
      console.log(`   Code Hash: ${codeHash.substring(0, 20)}...`);

      return txHash;

    } catch (error: any) {
      console.error(`❌ Oracle callback failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get oracle wallet balance
   */
  async getBalance(): Promise<string> {
    const account = await this.provider.getAccount(this.signerAddress);
    const balance = account.balance.toString();
    const egld = (parseInt(balance) / 1e18).toFixed(4);
    return `${egld} EGLD`;
  }

  /**
   * Test oracle connection and permissions
   */
  async testOracle(): Promise<boolean> {
    try {
      const account = await this.provider.getAccount(this.signerAddress);
      const balance = await this.getBalance();
      
      console.log(`✅ Oracle wallet loaded`);
      console.log(`   Address: ${this.signerAddress.bech32()}`);
      console.log(`   Balance: ${balance}`);
      console.log(`   Nonce: ${account.nonce}`);

      return true;
    } catch (error: any) {
      console.error('❌ Oracle test failed:', error.message);
      return false;
    }
  }

  /**
   * Convert number to hex string
   */
  private numberToHex(num: number): string {
    return num.toString(16).padStart(16, '0');
  }

  /**
   * Convert string to hex
   */
  private stringToHex(str: string): string {
    return Buffer.from(str, 'utf-8').toString('hex');
  }
}
