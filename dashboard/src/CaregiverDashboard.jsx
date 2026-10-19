/*function CaregiverDashboard({ user, onLogout }) {
  return (
    <div>
      <h1>Caregiver Dashboard</h1>

      <p>Welcome, {user.name}</p>

      <hr />

      <h2>Patient Monitoring</h2>

      <p>Patient: Shruthi</p>
      <p>Medication: Amoxicillin 500mg</p>

      <h3>Current Status</h3>
      <p>🌡️ Temperature: -- °C</p>
      <p>💊 Dose Status: --</p>
      <p>🍼 Bottle Status: --</p>
      <p>⚠️ Safety Status: --</p>

      <h3>Alerts</h3>
      <p>No alerts yet.</p>

      <button onClick={onLogout}>Logout</button>
    </div>
  )
}

export default CaregiverDashboard*/




import { useEffect, useState } from 'react'
import NotificationBell from './NotificationBell'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

function CaregiverDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('overview')
  const [sensorData, setSensorData] = useState(null)
  const [sensorError, setSensorError] = useState(false)
  const [temperatureHistory, setTemperatureHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [bottleEvent, setBottleEvent] = useState(null)
  const [safetyData, setSafetyData] = useState(null)
  const [historyError, setHistoryError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let mounted = true

    async function fetchSensorData() {
      try {
        const response = await fetch(`${API_BASE}/api/latest-sensor-data`)
        if (!response.ok) throw new Error('Sensor request failed')
        const data = await response.json()

        if (mounted) {
          setSensorData(data)
          setSensorError(false)
        }
      } catch {
        if (mounted) setSensorError(true)
      }
    }

    async function fetchHistoryData() {
      const requests = [
        fetch(`${API_BASE}/api/temperature-history?limit=20`).then(r => {
          if (!r.ok) throw new Error('Temperature history request failed')
          return r.json()
        }),
        fetch(`${API_BASE}/api/alerts?limit=20`).then(r => {
          if (!r.ok) throw new Error('Alerts request failed')
          return r.json()
        }),
        fetch(`${API_BASE}/api/bottle-status`).then(r => {
          if (!r.ok) throw new Error('Bottle status request failed')
          return r.json()
        }),
        fetch(`${API_BASE}/api/medication-safety`).then(r => {
          if (!r.ok) throw new Error('Safety request failed')
          return r.json()
        })
      ]

      const results = await Promise.allSettled(requests)

      if (!mounted) return

      let hasError = false

      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) {
        setTemperatureHistory(results[0].value)
      } else {
        hasError = true
      }

      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
        setAlerts(results[1].value)
      } else {
        hasError = true
      }

      if (results[2].status === 'fulfilled') {
        setBottleEvent(results[2].value)
      } else {
        hasError = true
      }

      if (results[3].status === 'fulfilled') {
        setSafetyData(results[3].value)
      } else {
        hasError = true
      }

      setHistoryError(hasError)
      setLastUpdated(new Date())
    }

    fetchSensorData()
    fetchHistoryData()

    const sensorInterval = setInterval(fetchSensorData, 3000)
    const historyInterval = setInterval(fetchHistoryData, 10000)

    return () => {
      mounted = false
      clearInterval(sensorInterval)
      clearInterval(historyInterval)
    }
  }, [])

  const pageTitles = {
    overview: 'Overview',
    monitoring: 'Patient monitoring',
    medication: 'Medication & doses',
    alerts: 'Alerts & history'
  }

  const temperature = sensorData?.temperature ?? '--'

  const bottleStatus =
    sensorData?.bottle_open == null
      ? '--'
      : Number(sensorData.bottle_open) === 1
        ? 'Open'
        : 'Closed'

  const safetyStatus = sensorData?.temperature_status ?? '--'

  function formatDate(value) {
    if (!value) return 'Time unavailable'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Time unavailable'

    return date.toLocaleString()
  }

  function getAlertLevel(alert) {
    const type = String(alert.alert_type || alert.type || '').toUpperCase()
    const message = String(alert.message || '').toUpperCase()

    if (type.includes('CRITICAL') || message.includes('CRITICAL')) {
      return 'Critical'
    }

    if (
      type.includes('TEMP') ||
      type.includes('WARNING') ||
      type.includes('MISSED') ||
      message.includes('WARNING')
    ) {
      return 'Warning'
    }

    return 'Notice'
  }

  function renderStatusCards() {
    return (
      <div className="cg-status-grid">
        <article className="cg-status-card">
          <div className="cg-card-top">
            <div className="cg-card-icon cg-temp-icon">♨</div>
            <span className="cg-card-label">TEMPERATURE</span>
          </div>
          <div className="cg-card-value">
            {temperature} <span>°C</span>
          </div>
          <div className="cg-card-foot">
            <span className="cg-status-dot cg-dot-grey" />
            {sensorError
              ? 'Connection failed'
              : sensorData
                ? 'Latest available reading'
                : 'Loading sensor data...'}
          </div>
        </article>

        <article className="cg-status-card">
          <div className="cg-card-top">
            <div className="cg-card-icon cg-bottle-icon">▤</div>
            <span className="cg-card-label">BOTTLE STATUS</span>
          </div>
          <div className="cg-card-value cg-card-text-value">
            {bottleStatus}
          </div>
          <div className="cg-card-foot">
            <span className="cg-status-dot cg-dot-grey" />
            {sensorError ? 'Connection failed' : 'Latest available reading'}
          </div>
        </article>

        <article className="cg-status-card">
          <div className="cg-card-top">
            <div className="cg-card-icon cg-safety-icon">♡</div>
            <span className="cg-card-label">SAFETY STATUS</span>
          </div>
          <div className="cg-card-value cg-card-text-value">
            {safetyStatus}
          </div>
          <div className="cg-card-foot">
            <span className="cg-status-dot cg-dot-grey" />
            {sensorError ? 'Connection failed' : 'From backend data'}
          </div>
        </article>

        <article className="cg-status-card">
          <div className="cg-card-top">
            <div className="cg-card-icon cg-dose-icon">✓</div>
            <span className="cg-card-label">DOSE ADHERENCE</span>
          </div>
          <div className="cg-card-value cg-card-text-value">--</div>
          <div className="cg-card-foot">
            <span className="cg-status-dot cg-dot-grey" />
            Dose history not connected
          </div>
        </article>
      </div>
    )
  }

  function renderAlertsPanel() {
    return (
      <section className="cg-panel">
        <div className="cg-panel-heading">
          <div>
            <h2>Recent alerts</h2>
            <p>Safety notifications for your patient</p>
          </div>
          <span className="cg-panel-symbol">⚠</span>
        </div>

        {alerts.length === 0 ? (
          <div className="cg-empty-state">
            <div className="cg-empty-icon">✓</div>
            <strong>No alert records available</strong>
            <p>
              Alerts will appear here when records are returned by the backend.
              This does not necessarily mean that no safety issue has occurred.
            </p>
          </div>
        ) : (
          <div className="cg-history-list">
            {alerts.map((alert, index) => {
              const level = getAlertLevel(alert)

              return (
                <article
                  className="cg-history-item"
                  key={alert.id || `${alert.alert_type}-${alert.created_at}-${index}`}
                >
                  <div className="cg-history-icon">⚠</div>
                  <div className="cg-history-details">
                    <strong>
                      {String(alert.alert_type || alert.type || 'Safety notice').replace(/_/g, ' ')}
                    </strong>
                    <p>{alert.message || 'No additional details provided.'}</p>
                    <span>{formatDate(alert.created_at || alert.timestamp)}</span>
                  </div>
                  <span className={`cg-alert-level cg-alert-${level.toLowerCase()}`}>
                    {level}
                  </span>
                </article>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  function renderTemperatureHistory() {
    return (
      <section className="cg-panel">
        <div className="cg-panel-heading">
          <div>
            <h2>Temperature history</h2>
            <p>Previous readings returned by the backend</p>
          </div>
          <span className="cg-panel-symbol">♨</span>
        </div>

        {temperatureHistory.length === 0 ? (
          <div className="cg-empty-state">
            <div className="cg-empty-icon">◷</div>
            <strong>No temperature history available</strong>
            <p>Temperature readings will appear here when available.</p>
          </div>
        ) : (
          <div className="cg-history-list">
            {[...temperatureHistory].reverse().map((reading, index) => (
              <article
                className="cg-history-item"
                key={reading.id || `${reading.created_at || reading.timestamp}-${index}`}
              >
                <div className="cg-history-icon">🌡️</div>
                <div className="cg-history-details">
                  <strong>
                    {reading.temperature == null
                      ? 'Temperature unavailable'
                      : `${reading.temperature} °C`}
                  </strong>
                  <p>
                    Status: {reading.temperature_status || 'Not provided'}
                  </p>
                  <span>
                    {formatDate(reading.created_at || reading.timestamp)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    )
  }

  function renderBottleHistory() {
    return (
      <section className="cg-panel">
        <div className="cg-panel-heading">
          <div>
            <h2>Latest bottle event</h2>
            <p>Most recent event returned by the backend</p>
          </div>
          <span className="cg-panel-symbol">▤</span>
        </div>

        {!bottleEvent || !bottleEvent.event_type ? (
          <div className="cg-empty-state">
            <div className="cg-empty-icon">◷</div>
            <strong>No bottle event available</strong>
            <p>No bottle event was returned by the backend.</p>
          </div>
        ) : (
          <div className="cg-history-list">
            <article className="cg-history-item">
              <div className="cg-history-icon">🍶</div>
              <div className="cg-history-details">
                <strong>
                  {String(bottleEvent.event_type).replace(/_/g, ' ')}
                </strong>
                <p>Latest recorded bottle event</p>
                <span>{formatDate(bottleEvent.created_at || bottleEvent.timestamp)}</span>
              </div>
            </article>
          </div>
        )}
      </section>
    )
  }

  function renderContent() {
    if (activePage === 'monitoring') {
      return (
        <>
          <div className="cg-welcome">
            <div>
              <div className="cg-eyebrow">PATIENT MONITORING</div>
              <h1>Patient monitoring 👤</h1>
              <p>Monitor your patient's medication storage and device status.</p>
            </div>
            <div className="cg-date-chip">⌁ &nbsp; Live monitoring</div>
          </div>

          <section className="cg-patient-card">
            <div className="cg-patient-avatar">S</div>
            <div className="cg-patient-info">
              <span className="cg-muted-label">MONITORED PATIENT</span>
              <h2>Shruthi</h2>
              <p>Amoxicillin 500 mg</p>
            </div>
            <div className="cg-patient-divider" />
            <div className="cg-medication-info">
              <span className="cg-muted-label">DEVICE</span>
              <strong>{sensorData?.device_id || 'SD001-ESP32'}</strong>
              <p>Medication monitoring device</p>
            </div>
            <div className="cg-patient-tag">
              {sensorError ? 'Connection issue' : sensorData ? 'Data available' : 'Connecting...'}
            </div>
          </section>

          <div className="cg-section-heading">
            <div>
              <h2>Live device information</h2>
              <p>Latest available information from the medication bottle.</p>
            </div>
          </div>

          {renderStatusCards()}
        </>
      )
    }

    if (activePage === 'medication') {
      return (
        <>
          <div className="cg-welcome">
            <div>
              <div className="cg-eyebrow">MEDICATION MANAGEMENT</div>
              <h1>Medication & doses 💊</h1>
              <p>View the patient's medication schedule and dose information.</p>
            </div>
            <div className="cg-date-chip">⌁ &nbsp; Medication centre</div>
          </div>

          <section className="cg-patient-card">
            <div className="cg-patient-avatar">S</div>
            <div className="cg-patient-info">
              <span className="cg-muted-label">PATIENT</span>
              <h2>Shruthi</h2>
              <p>Current medication</p>
            </div>
            <div className="cg-patient-divider" />
            <div className="cg-medication-info">
              <span className="cg-muted-label">MEDICATION</span>
              <strong>Amoxicillin 500 mg</strong>
              <p>Scheduled dose: 09:00</p>
            </div>
            <div className="cg-patient-tag">Active</div>
          </section>

          <div className="cg-section-heading">
            <div>
              <h2>Dose schedule</h2>
              <p>Medication adherence information for the patient.</p>
            </div>
          </div>

          <div className="cg-lower-grid">
            <section className="cg-panel">
              <div className="cg-panel-heading">
                <div>
                  <h2>Today's dose</h2>
                  <p>Scheduled medication</p>
                </div>
                <span className="cg-panel-symbol">✓</span>
              </div>
              <div className="cg-empty-state">
                <div className="cg-empty-icon">◷</div>
                <strong>09:00 — Amoxicillin 500 mg</strong>
                <p>Dose status will be updated when dose history is connected.</p>
              </div>
            </section>

            <section className="cg-panel">
              <div className="cg-panel-heading">
                <div>
                  <h2>Adherence summary</h2>
                  <p>Recent dose records</p>
                </div>
                <span className="cg-panel-symbol">▤</span>
              </div>
              <div className="cg-adherence-empty">
                <div className="cg-adherence-icon">◷</div>
                <strong>No dose history yet</strong>
                <p>On-time, missed and irregular dose records will appear when available.</p>
              </div>
            </section>
          </div>
        </>
      )
    }

    if (activePage === 'alerts') {
      return (
        <>
          <div className="cg-welcome">
            <div>
              <div className="cg-eyebrow">SAFETY & HISTORY</div>
              <h1>Alerts & history ⚠️</h1>
              <p>Review safety alerts and previous monitoring events.</p>
            </div>
            <div className="cg-date-chip">⌁ &nbsp; Safety centre</div>
          </div>

          {historyError && (
            <div className="cg-panel">
              <p>
                Some history information could not be loaded. Other available
                sections may still be displayed.
              </p>
            </div>
          )}

          <div className="cg-lower-grid">
            {renderAlertsPanel()}
            {renderBottleHistory()}
          </div>

          {renderTemperatureHistory()}

          <section className="cg-panel">
            <div className="cg-panel-heading">
              <div>
                <h2>Medication safety assessment</h2>
                <p>Safety calculation returned by the backend</p>
              </div>
              <span className="cg-panel-symbol">♡</span>
            </div>

            {safetyData ? (
              <>
                <div className="cg-history-item">
                  <div className="cg-history-icon">🛡️</div>
                  <div className="cg-history-details">
                    <strong>
                      {safetyData.state || 'State unavailable'}
                    </strong>
                    <p>{safetyData.message || 'No safety explanation provided.'}</p>
                    <span>
                      Exposure score: {safetyData.score ?? '--'} · Unsafe readings: {safetyData.unsafeReadings ?? '--'}
                    </span>
                  </div>
                </div>
                <p>
                  Temperature range configured by backend:{' '}
                  {safetyData.minTemp ?? '--'}°C – {safetyData.maxTemp ?? '--'}°C
                </p>
              </>
            ) : (
              <p>Safety assessment is not currently available.</p>
            )}
          </section>

          <p>
            Last refreshed: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}
          </p>
        </>
      )
    }

    return (
      <>
        <div className="cg-welcome">
          <div>
            <div className="cg-eyebrow">CAREGIVER OVERVIEW</div>
            <h1>Good to see you, {user?.name || 'Caregiver'} 👋</h1>
            <p>Here's your patient's medication safety overview.</p>
          </div>
          <div className="cg-date-chip">⌁ &nbsp; Monitoring centre</div>
        </div>

        <section className="cg-patient-card">
          <div className="cg-patient-avatar">S</div>
          <div className="cg-patient-info">
            <span className="cg-muted-label">MONITORED PATIENT</span>
            <h2>Shruthi</h2>
            <p>Amoxicillin 500 mg</p>
          </div>
          <div className="cg-patient-divider" />
          <div className="cg-medication-info">
            <span className="cg-muted-label">MEDICATION TRACKING</span>
            <strong>Medication overview</strong>
            <p>Schedule and adherence status</p>
          </div>
          <div className="cg-patient-tag">Patient profile</div>
        </section>

        <div className="cg-section-heading">
          <div>
            <h2>Medication & device status</h2>
            <p>Review the latest available monitoring information.</p>
          </div>
        </div>

        {renderStatusCards()}

        <div className="cg-lower-grid">
          <section className="cg-panel">
            <div className="cg-panel-heading">
              <div>
                <h2>Recent alerts</h2>
                <p>Safety notifications for your patient</p>
              </div>
              <span className="cg-panel-symbol">⚠</span>
            </div>
            {alerts.length > 0 ? (
              <div className="cg-history-list">
                {alerts.slice(0, 3).map((alert, index) => (
                  <article
                    className="cg-history-item"
                    key={alert.id || `${alert.alert_type}-${index}`}
                  >
                    <div className="cg-history-icon">⚠</div>
                    <div className="cg-history-details">
                      <strong>{alert.alert_type || alert.type || 'Safety notice'}</strong>
                      <p>{alert.message || 'No details provided.'}</p>
                      <span>{formatDate(alert.created_at || alert.timestamp)}</span>
                    </div>
                  </article>
                ))}
                <button type="button" className="cg-nav-item" onClick={() => setActivePage('alerts')}>
                  View all alerts →
                </button>
              </div>
            ) : (
              <div className="cg-empty-state">
                <div className="cg-empty-icon">✓</div>
                <strong>No alert records available</strong>
                <p>There are no alert records returned by the current API.</p>
              </div>
            )}
          </section>

          <section className="cg-panel">
            <div className="cg-panel-heading">
              <div>
                <h2>Medication adherence</h2>
                <p>Patient dose history</p>
              </div>
              <span className="cg-panel-symbol">▤</span>
            </div>
            <div className="cg-adherence-empty">
              <div className="cg-adherence-icon">◷</div>
              <strong>Adherence history</strong>
              <p>On-time, missed and irregular dose records will appear here when connected.</p>
            </div>
          </section>
        </div>
      </>
    )
  }

  return (
    <div className="cg-page">
      <aside className="cg-sidebar">
        <div className="cg-brand">
          <div className="cg-brand-icon">✚</div>
          <div>
            <h2>MediGuard</h2>
            <span>CARE PORTAL</span>
          </div>
        </div>

        <div className="cg-nav-label">WORKSPACE</div>

        <button
          type="button"
          className={`cg-nav-item ${activePage === 'overview' ? 'cg-nav-active' : ''}`}
          onClick={() => setActivePage('overview')}
        >
          <span>▦</span> Overview
        </button>

        <button
          type="button"
          className={`cg-nav-item ${activePage === 'monitoring' ? 'cg-nav-active' : ''}`}
          onClick={() => setActivePage('monitoring')}
        >
          <span>♡</span> Patient monitoring
        </button>

        <button
          type="button"
          className={`cg-nav-item ${activePage === 'medication' ? 'cg-nav-active' : ''}`}
          onClick={() => setActivePage('medication')}
        >
          <span>♧</span> Medication & doses
        </button>

        <button
          type="button"
          className={`cg-nav-item ${activePage === 'alerts' ? 'cg-nav-active' : ''}`}
          onClick={() => setActivePage('alerts')}
        >
          <span>♧</span> Alerts & history
        </button>

        <div className="cg-sidebar-bottom">
          <div className="cg-help-card">
            <span>🛡️</span>
            <strong>Medication safety matters</strong>
            <p>Monitor storage conditions and medication routines in one place.</p>
          </div>

          <button type="button" className="cg-logout" onClick={onLogout}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      <main className="cg-main">
        <header className="cg-topbar">
          <div className="cg-breadcrumb">
            Workspace / <strong>{pageTitles[activePage]}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
  <NotificationBell />
  <div className="cg-profile">
    <div className="cg-avatar">DC</div>
    <div className="cg-profile-info">
      <strong>{user?.name || 'Caregiver'}</strong>
      <span>Caregiver account</span>
    </div>
  </div>
</div>
        </header>

        <section className="cg-content">
          {renderContent()}

          <footer className="cg-footer">
            <span>MediGuard · Medication Safety Monitoring</span>
            <span>Monitoring data is subject to device and network availability.</span>
          </footer>
        </section>
      </main>
    </div>
  )
}

export default CaregiverDashboard
