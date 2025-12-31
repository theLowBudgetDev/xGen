export function GenerationsList() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>My Generations</h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Generations today: 0/3</p>
      
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9ca3af' }}>
        <svg style={{ width: '96px', height: '96px', margin: '0 auto 1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>No generations yet</p>
        <p style={{ fontSize: '0.875rem' }}>Generate your first contract to see it here!</p>
      </div>
    </div>
  )
}
