// Mock Code Generator for Testing (No API calls)
import { StreamManager } from '../services/generation/streamManager';

export class MockCodeGenerator {
  async generateContract(
    description: string,
    category: string,
    streamManager: StreamManager,
    sessionId?: string
  ): Promise<string> {
    const sid = sessionId || 'mock-session';
    
    // Simulate AI thinking
    await this.delay(1000);
    streamManager.sendStatus(sid, 'Analyzing requirements...', 10);
    
    await this.delay(800);
    streamManager.sendStatus(sid, 'Generating contract structure...', 30);
    
    await this.delay(1000);
    streamManager.sendStatus(sid, 'Writing smart contract code...', 50);
    
    // Generate mock contract code
    const contractCode = this.generateMockContract(description, category);
    
    await this.delay(500);
    streamManager.sendStatus(sid, 'Code generation complete!', 100);
    
    return contractCode;
  }

  private generateMockContract(description: string, category: string): string {
    return `#![no_std]

multiversx_sc::imports!();

/// ${category} Smart Contract
/// 
/// Description: ${description}
#[multiversx_sc::contract]
pub trait ${this.toCamelCase(category)}Contract {
    #[init]
    fn init(&self) {
        // Initialize contract
    }

    /// Main contract function
    #[endpoint]
    fn execute(&self, amount: BigUint) {
        let caller = self.blockchain().get_caller();
        
        // Validate input
        require!(amount > 0u64, "Amount must be positive");
        
        // Execute logic
        self.process_transaction(&caller, &amount);
        
        // Emit event
        self.transaction_executed_event(&caller, &amount);
    }

    /// Get contract status
    #[view]
    fn get_status(&self) -> bool {
        true
    }

    // Storage

    #[storage_mapper("transactions")]
    fn transactions(&self) -> MapMapper<ManagedAddress, BigUint>;

    // Events

    #[event("transactionExecuted")]
    fn transaction_executed_event(&self, #[indexed] caller: &ManagedAddress, amount: &BigUint);

    // Private functions

    fn process_transaction(&self, caller: &ManagedAddress, amount: &BigUint) {
        let current = self.transactions().get(caller).unwrap_or_default();
        self.transactions().insert(caller.clone(), current + amount);
    }
}`;
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Mock compilation results
export function getMockCompilationResult(success: boolean = true) {
  if (success) {
    return {
      success: true,
      output: 'Compilation successful!\nBuilding contract...\nWASM file generated.',
      errors: [],
      warnings: ['Note: Using multiversx-sc v0.64.0'],
      wasmPath: '/mock/output/contract.wasm',
      abiPath: '/mock/output/contract.abi.json'
    };
  } else {
    return {
      success: false,
      output: 'Compilation failed',
      errors: ['error: cannot find type `BigUint` in this scope'],
      warnings: [],
      wasmPath: null,
      abiPath: null
    };
  }
}

// Mock test generation
export function getMockTests(): string {
  return `use multiversx_sc_scenario::*;

#[test]
fn test_init() {
    let mut world = world();
    
    world.start_trace();
    
    let contract_code = world.code_expression("file:output/contract.wasm");
    
    world
        .account("owner")
        .nonce(1)
        .new_address("owner", 1, "contract");
    
    world
        .tx()
        .from("owner")
        .typed(contract_proxy::ContractProxy)
        .init()
        .code(contract_code)
        .run();
}

#[test]
fn test_execute() {
    let mut world = world();
    
    world
        .tx()
        .from("user")
        .to("contract")
        .typed(contract_proxy::ContractProxy)
        .execute(100u64)
        .run();
}`;
}
