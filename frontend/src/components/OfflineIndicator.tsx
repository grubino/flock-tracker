import { useOffline } from '../contexts/OfflineContext';

export function OfflineIndicator() {
  const { isOnline, queueSize, syncStatus, triggerSync } = useOffline();

  // Don't show anything if online and queue is empty
  if (isOnline && queueSize === 0 && !syncStatus.isSyncing) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: isOnline ? '#10b981' : '#f59e0b',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '350px',
      }}
    >
      <div style={{ flex: 1 }}>
        {!isOnline && (
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            📴 Offline Mode
          </div>
        )}

        {isOnline && queueSize > 0 && !syncStatus.isSyncing && (
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            ✅ Back Online
          </div>
        )}

        {syncStatus.isSyncing && (
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            🔄 Syncing...
          </div>
        )}

        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          {syncStatus.isSyncing ? (
            <>
              Syncing {syncStatus.progress} of {syncStatus.total} requests
            </>
          ) : queueSize > 0 ? (
            <>
              {queueSize} {queueSize === 1 ? 'change' : 'changes'} pending
            </>
          ) : (
            'Changes will be saved when you reconnect'
          )}
        </div>
      </div>

      {isOnline && queueSize > 0 && !syncStatus.isSyncing && (
        <button
          onClick={triggerSync}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Sync Now
        </button>
      )}

      {syncStatus.isSyncing && (
        <div
          style={{
            width: '20px',
            height: '20px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
