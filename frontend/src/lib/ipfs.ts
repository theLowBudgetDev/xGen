// Fetch code from IPFS
export async function fetchCodeFromIPFS(cid: string): Promise<string> {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`)
    if (!response.ok) {
      throw new Error('Failed to fetch from IPFS')
    }
    return await response.text()
  } catch (error) {
    console.error('Error fetching from IPFS:', error)
    throw error
  }
}

// Download code as file
export function downloadCode(code: string, filename: string = 'contract.rs') {
  const blob = new Blob([code], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
