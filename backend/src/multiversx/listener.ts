// MultiversX Event Listener

import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import { Address } from '@multiversx/sdk-core';

export interface GenerationRequestEvent {
  generationId: number;
  creator: string;
  description: string;
  category: string;
  txHash: string;
}

export class EventListener {
  private provider: ApiNetworkProvider;
  private contractAddress: Address;
  private lastProcessedTimestamp: number = 0;
  private isListening: boolean = false;

  constructor(apiUrl: string, contractAddress: string) {
    this.provider = new ApiNetworkProvider(apiUrl);
    this.contractAddress = new Address(contractAddress);
  }

  /**
   * Start listening for generationRequested events
   */
  async startListening(
    callback: (event: GenerationRequestEvent) => Promise<void>,
    intervalMs: number = 6000
  ): Promise<void> {
    if (this.isListening) {
      console.log('⚠️  Event listener already running');
      return;
    }

    this.isListening = true;
    console.log(`👂 Starting event listener for ${this.contractAddress.bech32()}`);
    console.log(`📡 Polling every ${intervalMs}ms`);

    // Initial timestamp
    this.lastProcessedTimestamp = Math.floor(Date.now() / 1000);

    const poll = async () => {
      if (!this.isListening) return;

      try {
        const events = await this.fetchNewEvents();
        
        for (const event of events) {
          console.log(`📨 New generation request: ID ${event.generationId}`);
          await callback(event);
        }
      } catch (error: any) {
        console.error('❌ Error fetching events:', error.message);
      }

      // Schedule next poll
      setTimeout(poll, intervalMs);
    };

    // Start polling
    poll();
  }

  /**
   * Stop listening for events
   */
  stopListening(): void {
    this.isListening = false;
    console.log('🛑 Event listener stopped');
  }

  /**
   * Fetch new events from the contract
   */
  private async fetchNewEvents(): Promise<GenerationRequestEvent[]> {
    try {
      // Get recent transactions for the contract
      // Note: Using getAccountTransactions may not be available in all SDK versions
      // Alternative: Use getAddress().transactions() or query API directly
      const response = await this.provider.doGetGeneric(
        `accounts/${this.contractAddress.bech32()}/transactions?size=25&status=success`
      );
      
      const transactions = response.data || [];

      const events: GenerationRequestEvent[] = [];

      for (const tx of transactions) {
        // Skip if already processed
        if (tx.timestamp <= this.lastProcessedTimestamp) continue;

        // Parse events from transaction
        const generationEvents = this.parseGenerationEvents(tx);
        events.push(...generationEvents);

        // Update last processed timestamp
        this.lastProcessedTimestamp = Math.max(
          this.lastProcessedTimestamp,
          tx.timestamp
        );
      }

      return events;
    } catch (error: any) {
      console.error('Error fetching transactions:', error.message);
      return [];
    }
  }

  /**
   * Parse generationRequested events from transaction
   */
  private parseGenerationEvents(tx: any): GenerationRequestEvent[] {
    const events: GenerationRequestEvent[] = [];

    if (!tx.logs || !tx.logs.events) return events;

    for (const event of tx.logs.events) {
      if (event.identifier === 'generationRequested') {
        try {
          // Parse event topics
          // topics[0] = generation_id (indexed)
          // topics[1] = creator (indexed)
          // topics[2] = description_and_category (data)

          const generationId = this.parseU64(event.topics[0]);
          const creator = this.parseAddress(event.topics[1]);
          const [description, category] = this.parseDescriptionAndCategory(
            event.topics[2]
          );

          events.push({
            generationId,
            creator,
            description,
            category,
            txHash: tx.txHash
          });
        } catch (error: any) {
          console.error('Error parsing event:', error.message);
        }
      }
    }

    return events;
  }

  /**
   * Parse u64 from base64 topic
   */
  private parseU64(topic: string): number {
    const buffer = Buffer.from(topic, 'base64');
    return buffer.readBigUInt64BE(0).toString() as any;
  }

  /**
   * Parse address from base64 topic
   */
  private parseAddress(topic: string): string {
    const buffer = Buffer.from(topic, 'base64');
    const address = new Address(buffer);
    return address.bech32();
  }

  /**
   * Parse combined description and category
   */
  private parseDescriptionAndCategory(topic: string): [string, string] {
    const decoded = Buffer.from(topic, 'base64').toString('utf-8');
    const parts = decoded.split('|||');
    
    if (parts.length >= 2) {
      return [parts[0], parts[1]];
    }
    
    // Fallback if separator not found
    return [decoded, 'Unknown'];
  }

  /**
   * Test connection to MultiversX API
   */
  async testConnection(): Promise<boolean> {
    try {
      const networkConfig = await this.provider.getNetworkConfig();
      console.log(`✅ Connected to MultiversX ${networkConfig.ChainID}`);
      return true;
    } catch (error: any) {
      console.error('❌ MultiversX connection failed:', error.message);
      return false;
    }
  }
}
