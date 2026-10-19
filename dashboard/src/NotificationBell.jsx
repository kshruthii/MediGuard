import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

export default function NotificationBell() {
  const [alerts, setAlerts] = useState([])
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('safedose_read_alerts') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    let active = true

    const loadAlerts = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/alerts?limit=50`)
        if (!response.ok) return
        const data = await response.json()
        if (active && Array.isArray(data)) setAlerts(data)
      } catch (error) {
        console.error('Unable to load notifications:', error)
      }
    }

    loadAlerts()
    const timer = setInterval(loadAlerts, 5000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const getId = (alert) =>
    String(alert.id ?? `${alert.alert_type}-${alert.message}-${alert.created_at}`)

  const markRead = (id) => {
    setReadIds((previous) => {
      const updated = previous.includes(id) ? previous : [...previous, id]
      localStorage.setItem('safedose_read_alerts', JSON.stringify(updated))
      return updated
    })
  }

  const unreadCount = alerts.filter((alert) => !readIds.includes(getId(alert))).length

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-label={`Notifications, ${unreadCount} unread`}
        style={{
          position: 'relative',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          background: '#fff',
          padding: '10px 14px',
          cursor: 'pointer',
          fontSize: '20px'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-7px',
              right: '-7px',
              background: '#dc2626',
              color: '#fff',
              borderRadius: '50%',
              minWidth: '19px',
              height: '19px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1px'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: 0,
            width: '320px',
            maxWidth: '85vw',
            maxHeight: '400px',
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000,
            padding: '14px',
            color: '#1e293b'
          }}
        >
          <strong style={{ fontSize: '16px' }}>Notifications</strong>

          {alerts.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              No notifications yet.
            </p>
          ) : (
            alerts.map((alert) => {
              const id = getId(alert)
              const isRead = readIds.includes(id)

              return (
                <div
                  key={id}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    padding: '12px 0',
                    background: isRead ? '#fff' : '#f0f9ff'
                  }}
                >
                  <strong style={{ fontSize: '13px' }}>
                    {alert.alert_type === 'TEMPERATURE'
                      ? '🌡️ Temperature alert'
                      : alert.alert_type === 'BOTTLE_OPENED'
                        ? '🧴 Bottle opened'
                        : alert.alert_type === 'MISSED_DOSE'
                          ? '⏰ Missed dose'
                          : alert.alert_type || 'Alert'}
                  </strong>
                  <p style={{ fontSize: '13px', margin: '6px 0' }}>
                    {alert.message}
                  </p>
                  <small style={{ color: '#64748b' }}>
                    {alert.created_at
                      ? new Date(alert.created_at).toLocaleString()
                      : ''}
                  </small>
                  {!isRead && (
                    <div>
                      <button
                        type="button"
                        onClick={() => markRead(id)}
                        style={{
                          marginTop: '7px',
                          border: 0,
                          background: 'transparent',
                          color: '#2563eb',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Mark as read
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}