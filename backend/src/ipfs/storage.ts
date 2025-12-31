// IPFS Storage using Pinata

import axios from 'axios';

export interface CodeMetadata {
  generationId: number;
  description: string;
  category: string;
  creator: string;
}

export class IPFSStorage {
  private pinataApiKey: string;
  private pinataSecretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.pinataApiKey = apiKey;
    this.pinataSecretKey = secretKey;
  }

  /**
   * Upload generated contract code to IPFS
   */
  async uploadCode(code: string, metadata: CodeMetadata): Promise<string> {
    console.log(`Uploading code to IPFS for generation ${metadata.generationId}...`);

    const data = JSON.stringify({
      pinataContent: {
        code,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      pinataMetadata: {
        name: `contract-gen-${metadata.generationId}.json`,
        keyvalues: {
          generationId: metadata.generationId.toString(),
          category: metadata.category,
          creator: metadata.creator
        }
      },
      pinataOptions: {
        cidVersion: 1
      }
    });

    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );

      const cid = response.data.IpfsHash;
      console.log(`✅ Code uploaded to IPFS: ${cid}`);
      return cid;

    } catch (error: any) {
      console.error('❌ IPFS upload failed:', error.response?.data || error.message);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }

  /**
   * Retrieve code from IPFS
   */
  async retrieveCode(cid: string): Promise<any> {
    console.log(`Retrieving code from IPFS: ${cid}`);

    try {
      const response = await axios.get(
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        { timeout: 10000 }
      );

      return response.data;

    } catch (error: any) {
      console.error('❌ IPFS retrieval failed:', error.message);
      throw new Error(`IPFS retrieval failed: ${error.message}`);
    }
  }

  /**
   * Test connection to Pinata
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        'https://api.pinata.cloud/data/testAuthentication',
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );

      console.log('✅ Pinata connection successful:', response.data.message);
      return true;

    } catch (error: any) {
      console.error('❌ Pinata connection failed:', error.message);
      return false;
    }
  }
}
