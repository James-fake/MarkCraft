interface AlertMessageProps {
  type: 'warning' | 'error'
  message: string
}

export default function AlertMessage({ type, message }: AlertMessageProps) {
  const isWarning = type === 'warning'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 12px',
      backgroundColor: isWarning ? 'rgba(245, 158, 11, 0.08)' : 'rgba(220, 53, 69, 0.08)',
      border: `1px solid ${isWarning ? 'rgba(245, 158, 11, 0.2)' : 'rgba(220, 53, 69, 0.2)'}`,
      borderRadius: 6,
      fontSize: 12,
      color: isWarning ? '#b45309' : '#dc3545',
      fontFamily: "'Inter', -apple-system, sans-serif",
      lineHeight: 1.4,
    }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }}>
        {isWarning ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        )}
      </svg>
      <span>{message}</span>
    </div>
  )
}
