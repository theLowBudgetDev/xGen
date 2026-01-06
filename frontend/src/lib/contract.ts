const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS
const API_URL = import.meta.env.VITE_API_URL || 'https://devnet-api.multiversx.com'

export interface Generation {
  id: number
  creator: string
  description: string
  category: string
  timestamp: number
  status: 'Pending' | 'Completed' | 'Failed'
  codeHash: string
  nftNonce: number
}

// Get user's daily generation count
export async function getUserGenerationsToday(address: string): Promise<number> {
  try {
    console.log('Fetching daily count for:', address)
    
    const response = await fetch(
      `${API_URL}/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CONTRACT_ADDRESS,
          funcName: 'getUserGenerationsToday',
          args: [Buffer.from(address, 'utf8').toString('base64')],
        }),
      }
    )
    
    const data = await response.json()
    console.log('Daily count response:', data)
    
    if (data.data && data.data.returnData && data.data.returnData.length > 0) {
      const count = parseInt(data.data.returnData[0], 16)
      console.log('Daily count:', count)
      return count
    }
    return 0
  } catch (error) {
    console.error('Error fetching daily count:', error)
    return 0
  }
}

// Get generation by ID
export async function getGeneration(id: number): Promise<Generation | null> {
  try {
    console.log('Fetching generation:', id)
    
    const response = await fetch(
      `${API_URL}/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CONTRACT_ADDRESS,
          funcName: 'getGeneration',
          args: [Buffer.from(id.toString(16).padStart(16, '0'), 'hex').toString('base64')],
        }),
      }
    )
    
    const data = await response.json()
    console.log(`Generation ${id} response:`, data)
    
    if (!data.data || !data.data.returnData || data.data.returnData.length === 0) {
      console.log(`Generation ${id} not found`)
      return null
    }

    // Parse the returned struct
    const returnData = data.data.returnData
    
    const generation = {
      id,
      creator: Buffer.from(returnData[0], 'base64').toString('hex'),
      description: Buffer.from(returnData[1], 'base64').toString('utf8'),
      category: Buffer.from(returnData[2], 'base64').toString('utf8'),
      timestamp: parseInt(Buffer.from(returnData[3], 'base64').toString('hex'), 16),
      status: parseStatus(Buffer.from(returnData[4], 'base64').toString('hex')),
      codeHash: Buffer.from(returnData[5], 'base64').toString('utf8'),
      nftNonce: parseInt(Buffer.from(returnData[6], 'base64').toString('hex'), 16),
    }
    
    console.log(`Parsed generation ${id}:`, generation)
    return generation
  } catch (error) {
    console.error(`Error fetching generation ${id}:`, error)
    return null
  }
}

// Parse status enum
function parseStatus(hex: string): 'Pending' | 'Completed' | 'Failed' {
  const value = parseInt(hex, 16)
  switch (value) {
    case 0: return 'Pending'
    case 1: return 'Completed'
    case 2: return 'Failed'
    default: return 'Pending'
  }
}

// Get all generations for a user
export async function getUserGenerations(address: string): Promise<Generation[]> {
  try {
    console.log('Fetching all generations for:', address)
    
    // Use backend endpoint if available, otherwise fallback to direct query
    const backendUrl = import.meta.env.VITE_API_URL
    if (backendUrl) {
      try {
        const response = await fetch(`${backendUrl}/api/generation/user/${address}`)
        if (response.ok) {
          const data = await response.json()
          return data.generations || []
        }
      } catch (e) {
        console.log('Backend not available, using direct query')
      }
    }
    
    // Fallback: direct query (limited to last 10 for performance)
    const generations: Generation[] = []
    const addressHex = address.toLowerCase()
    
    for (let i = 1; i <= 10; i++) {
      const gen = await getGeneration(i)
      if (gen && gen.creator.toLowerCase().includes(addressHex)) {
        generations.push(gen)
      }
    }
    
    return generations.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Error fetching user generations:', error)
    return []
  }
}
