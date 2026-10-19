import { useEffect, useState } from 'react'
import LoginPage from './LoginPage'
import './App.css'
import CaregiverDashboard from './CaregiverDashboard.jsx'
import NotificationBell from './NotificationBell'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const POLL_MS = 5000

/* ── Smooth Cubic Bezier Path Helper for SVG Charts ────────────────────── */
function getSmoothPath(points) {
  if (!points || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`

  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]

    const cp1x = p1.x + (p2.x - p0.x) * 0.16
    const cp1y = p1.y + (p2.y - p0.y) * 0.16
    const cp2x = p2.x - (p3.x - p1.x) * 0.16
    const cp2y = p2.y - (p3.y - p1.y) * 0.16

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

/* ── SVG Temperature Chart ─────────────────────────────────────────────── */
function TemperatureChart({ history }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!history || history.length < 2) {
    return <div className="chart-placeholder">Waiting for enough telemetry data to plot…</div>
  }

  const width = 800
  const height = 240
  const padLeft = 46
  const padRight = 24
  const padTop = 28
  const padBottom = 36

  const temps = history.map((h) => Number(h.temperature))
  const minTempVal = Math.min(...temps, 20) - 2
  const maxTempVal = Math.max(...temps, 30) + 2
  const range = maxTempVal - minTempVal || 1

  const xPos = (i) => padLeft + (i / (temps.length - 1)) * (width - padLeft - padRight)
  const yPos = (t) => height - padBottom - ((t - minTempVal) / range) * (height - padTop - padBottom)

  const points = history.map((h, i) => ({
    x: xPos(i),
    y: yPos(Number(h.temperature)),
    data: h,
    index: i,
  }))

  const linePath = getSmoothPath(points)
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - padBottom} L ${points[0].x},${height - padBottom} Z`

  const safeMinY = yPos(20)
  const safeMaxY = yPos(30)
  const safeZoneHeight = Math.abs(safeMinY - safeMaxY)
  const safeZoneY = Math.min(safeMinY, safeMaxY)

  // Horizontal grid lines
  const gridTicks = [15, 20, 25, 30, 35].filter((t) => t >= minTempVal && t <= maxTempVal)

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null

  return (
    <div className="chart-container">
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-indicator legend-line"></span>
          <span>Temperature (°C)</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator legend-safe-zone"></span>
          <span>Room Range (20°C – 30°C)</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator legend-unsafe-dot"></span>
          <span>Excursion Alert</span>
        </div>
      </div>

      <div className="svg-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="temp-chart">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0D9488" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0D9488" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Grid lines */}
          {gridTicks.map((t) => (
            <g key={t}>
              <line
                x1={padLeft}
                y1={yPos(t)}
                x2={width - padRight}
                y2={yPos(t)}
                stroke="#E2E8F0"
                strokeDasharray={t === 20 || t === 30 ? 'none' : '3 3'}
                strokeWidth={t === 20 || t === 30 ? '1' : '0.75'}
              />
              <text x={padLeft - 8} y={yPos(t) + 4} textAnchor="end" className="chart-tick-label">
                {t}°C
              </text>
            </g>
          ))}

          {/* Safe zone background band */}
          <rect
            x={padLeft}
            y={safeZoneY}
            width={width - padLeft - padRight}
            height={safeZoneHeight}
            fill="#F0FDF4"
            rx="6"
          />
          <line
            x1={padLeft}
            y1={safeMaxY}
            x2={width - padRight}
            y2={safeMaxY}
            stroke="#86EFAC"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <line
            x1={padLeft}
            y1={safeMinY}
            x2={width - padRight}
            y2={safeMinY}
            stroke="#86EFAC"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Area under curve */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Smooth line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#shadow)"
          />

          {/* Hover highlight line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={padTop}
              x2={hoveredPoint.x}
              y2={height - padBottom}
              stroke="#CBD5E1"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          )}

          {/* Data Points */}
          {points.map((p, i) => {
            const isUnsafe = p.data.temperature_status === 'UNSAFE'
            const isHovered = hoveredIdx === i

            return (
              <g key={i} className="chart-point-group" onMouseEnter={() => setHoveredIdx(i)}>
                {/* Hit target */}
                <circle cx={p.x} cy={p.y} r="10" fill="transparent" />

                {/* Point ring */}
                {isUnsafe ? (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 4.5}
                    fill="#EF4444"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="pulse-point"
                  />
                ) : (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill={isHovered ? '#0D9488' : '#0284C7'}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Dynamic Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 15}%`,
          }}
        >
          <div className="tooltip-temp">{hoveredPoint.data.temperature}°C</div>
          <div className="tooltip-status">
            Status: <span className={hoveredPoint.data.temperature_status.toLowerCase()}>{hoveredPoint.data.temperature_status}</span>
          </div>
          <div className="tooltip-time">
            {new Date(hoveredPoint.data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Status Badge Component ────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const config = {
    SAFE:            { cls: 'badge-safe',    icon: '✓', label: 'Optimal' },
    WARNING:         { cls: 'badge-warning', icon: '⚠️', label: 'Warning' },
    QUARANTINED:     { cls: 'badge-danger',  icon: '🔒', label: 'Quarantined' },
    UNSAFE:          { cls: 'badge-danger',  icon: '⚠️', label: 'Unsafe' },
    TAKEN:           { cls: 'badge-safe',    icon: '✓', label: 'Taken' },
    MISSED:          { cls: 'badge-danger',  icon: '✕', label: 'Missed' },
    SAFETY_BLOCKED:  { cls: 'badge-blocked', icon: '🔒', label: 'Blocked' },
    PENDING:         { cls: 'badge-pending', icon: '⏳', label: 'Pending' },
    OPEN:            { cls: 'badge-warning', icon: '🔓', label: 'Open' },
    CLOSED:          { cls: 'badge-safe',    icon: '🔒', label: 'Closed' },
    ONLINE:          { cls: 'badge-safe',    icon: '●', label: 'Receiving data' },
    OFFLINE:         { cls: 'badge-danger',  icon: '○', label: 'No recent data' },
  }

  const c = config[status] || { cls: 'badge-pending', icon: '•', label: status }

  return (
    <span className={`status-pill ${c.cls}`}>
      <span className="pill-icon">{c.icon}</span>
      <span className="pill-label">{c.label}</span>
    </span>
  )
}

/* ── Live Hardware (real ESP32) panel ──────────────────────────────────── */
function formatAge(seconds) {
  if (seconds == null) return '—'
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`
}

function formatClock(iso) {
  return iso
    ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'
}

function HardwarePanel({ device, bottle }) {
  const hw = device?.esp32 || null
  const sim = device?.simulator || null
  const windowSec = device?.onlineWindowSeconds ?? 30

  let linkStatus = null // null = nothing received yet
  if (hw) linkStatus = hw.online ? 'ONLINE' : 'OFFLINE'

  // Bottle: prefer the live ESP32 state; otherwise fall back to the last stored bottle event.
  const lastStoredEvent = bottle?.event_type === 'BOTTLE_OPENED' ? 'Opened'
    : bottle?.event_type === 'BOTTLE_CLOSED' ? 'Closed' : null

  return (
    <section className="card-panel hw-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Live Hardware · ESP32</h2>
          <p className="panel-subtitle">Real readings from the bottle-mounted ESP32 (DS18B20 temperature probe + tilt switch)</p>
        </div>
        {linkStatus ? (
          <StatusBadge status={linkStatus} />
        ) : (
          <span className="status-pill badge-pending">Waiting for ESP32</span>
        )}
      </div>

      {!hw ? (
        <div className="empty-state hw-empty">
          No data has been received from the ESP32 since the backend started.
          {sim?.online && ' (Simulator test data is currently being received instead.)'}
        </div>
      ) : (
        <>
          <div className="hw-grid">
            <div className="metric-subcard">
              <span className="subcard-label">Hardware Temperature</span>
              <span className="subcard-val text-primary">
                {hw.temperature != null ? `${Number(hw.temperature).toFixed(2)}°C` : '—'}
              </span>
              <span className="hw-sub">
                {hw.sensorFault
                  ? 'Temperature sensor fault — check DS18B20 wiring'
                  : hw.temperatureAt ? `Measured ${formatClock(hw.temperatureAt)}` : 'No reading yet'}
              </span>
            </div>

            <div className="metric-subcard">
              <span className="subcard-label">Bottle Status</span>
              <span className="hw-bottle-row">
                {hw.bottleState === 'OPEN' || hw.bottleState === 'CLOSED'
                  ? <StatusBadge status={hw.bottleState} />
                  : <span className="status-pill badge-pending">Unknown</span>}
                {!hw.online && <span className="hw-sub">(last known)</span>}
              </span>
              <span className="hw-sub">
                {hw.lastOpenedAt
                  ? `Last opened ${formatClock(hw.lastOpenedAt)}`
                  : lastStoredEvent && bottle?.created_at
                    ? `Last stored event: ${lastStoredEvent}`
                    : 'No opening since backend start'}
              </span>
            </div>

            <div className="metric-subcard">
              <span className="subcard-label">Last Hardware Update</span>
              <span className="subcard-val">{formatClock(hw.lastSeenAt)}</span>
              <span className="hw-sub">{formatAge(hw.ageSeconds)}</span>
            </div>

            <div className="metric-subcard">
              <span className="subcard-label">ESP32 Link</span>
              <span className={`subcard-val ${hw.online ? 'hw-online' : 'text-danger'}`}>
                {hw.online ? 'Online' : 'Offline'}
              </span>
              <span className="hw-sub">
                {hw.rssi != null ? `Wi-Fi ${hw.rssi} dBm · ` : ''}offline after {windowSec}s of silence
              </span>
            </div>
          </div>

          {sim?.online && (
            <p className="hw-note">Simulator test data is also being received. Stop simulator.js to see real hardware data only.</p>
          )}
        </>
      )}

      <p className="hw-note">
        A bottle opening is recorded as an access event only — it does not confirm that a dose was taken.
      </p>
    </section>
  )
}

/* ── Dashboard (shown after login) ─────────────────────────────────────── */
function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('overview')
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [bottle, setBottle] = useState(null)
  const [dose, setDose] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [doseHistory, setDoseHistory] = useState([])
  const [safety, setSafety] = useState(null)
  const [device, setDevice] = useState(null)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      try {
        const requests = [
          fetch(`${API_BASE}/api/latest-sensor-data`),
          fetch(`${API_BASE}/api/temperature-history?limit=50`),
          fetch(`${API_BASE}/api/bottle-status`),
          fetch(`${API_BASE}/api/dose-status`),
          fetch(`${API_BASE}/api/alerts?limit=5`),
          fetch(`${API_BASE}/api/dose-history?limit=14`),
          fetch(`${API_BASE}/api/medication-safety`),
          fetch(`${API_BASE}/api/device-status`).catch(() => null)
        ]

        const responses = await Promise.all(requests)

        if (!responses[0].ok) {
          throw new Error('Latest sensor data request failed')
        }

        const data = await Promise.all(
          responses.slice(0, 7).map(async response => {
            if (!response.ok) {
              throw new Error('A dashboard request failed')
            }
            return response.json()
          })
        )

        const deviceData =
          responses[7]?.ok ? await responses[7].json() : null

        if (cancelled) return

        setLatest(data[0])
        setHistory(Array.isArray(data[1]) ? data[1] : [])
        setBottle(data[2])
        setDose(data[3])
        setAlerts(Array.isArray(data[4]) ? data[4] : [])
        setDoseHistory(Array.isArray(data[5]) ? data[5] : [])
        setSafety(data[6])
        setDevice(deviceData)
        setError(null)
        setLastUpdated(new Date())
      } catch {
        if (!cancelled) {
          setError(
            'Could not reach the backend. Please check that the server is running.'
          )
        }
      }
    }

    fetchAll()
    const interval = setInterval(fetchAll, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const pageTitles = {
    overview: 'Overview',
    temperature: 'Temperature history',
    medication: 'My medications',
    safety: 'Medication safety',
    alerts: 'Alerts & history'
  }

  const tempStatus = latest?.temperature_status || 'PENDING'
  const safetyState = safety?.state || 'PENDING'
  const doseStatus = dose?.status || 'PENDING'

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'P'

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

  function Welcome({ eyebrow, title, description, chip }) {
    return (
      <div className="cg-welcome">
        <div>
          <div className="cg-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="cg-date-chip">⌁ &nbsp; {chip}</div>
      </div>
    )
  }

  function PanelHeading({ title, description, symbol }) {
    return (
      <div className="cg-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="cg-panel-symbol">{symbol}</span>
      </div>
    )
  }

  function renderStatusCards() {
    const temperature =
      latest?.temperature == null
        ? '--'
        : Number(latest.temperature).toFixed(2)

    const bottleStatus =
      latest?.bottle_open == null
        ? '--'
        : Number(latest.bottle_open) === 1
          ? 'Open'
          : 'Closed'

    const cards = [
      {
        icon: '♨',
        iconClass: 'cg-temp-icon',
        label: 'TEMPERATURE',
        value: `${temperature}°C`,
        foot: error ? 'Connection issue' : 'Latest available reading'
      },
      {
        icon: '▤',
        iconClass: 'cg-bottle-icon',
        label: 'BOTTLE STATUS',
        value: bottleStatus,
        foot: 'Latest available bottle reading'
      },
      {
        icon: '♡',
        iconClass: 'cg-safety-icon',
        label: 'MEDICATION SAFETY',
        value: safetyState,
        foot: `Exposure score: ${safety?.score ?? '--'}`
      },
      {
        icon: '✓',
        iconClass: 'cg-dose-icon',
        label: 'DOSE STATUS',
        value: doseStatus,
        foot: 'Based on available dose data'
      }
    ]

    return (
      <div className="cg-status-grid">
        {cards.map(card => (
          <article className="cg-status-card" key={card.label}>
            <div className="cg-card-top">
              <div className={`cg-card-icon ${card.iconClass}`}>
                {card.icon}
              </div>
              <span className="cg-card-label">{card.label}</span>
            </div>
            <div className="cg-card-value cg-card-text-value">
              {card.value}
            </div>
            <div className="cg-card-foot">
              <span className="cg-status-dot cg-dot-grey" />
              {card.foot}
            </div>
          </article>
        ))}
      </div>
    )
  }

  function renderAlerts() {
    return (
      <section className="cg-panel">
        <PanelHeading
          title="Recent alerts"
          description="Safety notifications from your monitoring system"
          symbol="⚠"
        />

        {alerts.length === 0 ? (
          <div className="cg-empty-state">
            <div className="cg-empty-icon">✓</div>
            <strong>No alert records available</strong>
            <p>
              No alert records were returned by the backend. This does not
              necessarily mean that no safety issue has occurred.
            </p>
          </div>
        ) : (
          <div className="cg-history-list">
            {alerts.map((alert, index) => {
              const level = getAlertLevel(alert)

              return (
                <article
                  className="cg-history-item"
                  key={
                    alert.id ||
                    `${alert.alert_type}-${alert.created_at}-${index}`
                  }
                >
                  <div className="cg-history-icon">⚠</div>
                  <div className="cg-history-details">
                    <strong>
                      {String(
                        alert.alert_type || alert.type || 'Safety notice'
                      ).replace(/_/g, ' ')}
                    </strong>
                    <p>{alert.message || 'No additional details provided.'}</p>
                    <span>
                      {formatDate(alert.created_at || alert.timestamp)}
                    </span>
                  </div>
                  <span
                    className={`cg-alert-level cg-alert-${level.toLowerCase()}`}
                  >
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
        <PanelHeading
          title="Temperature history"
          description="Previous readings returned by the backend"
          symbol="♨"
        />

        {history.length === 0 ? (
          <div className="cg-empty-state">
            <div className="cg-empty-icon">◷</div>
            <strong>No temperature history available</strong>
            <p>Previously recorded readings will appear here when available.</p>
          </div>
        ) : (
          <>
            <TemperatureChart history={history} />
            <div className="cg-history-list">
              {[...history].reverse().map((reading, index) => (
                <article
                  className="cg-history-item"
                  key={
                    reading.id ||
                    `${reading.created_at || reading.timestamp}-${index}`
                  }
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
          </>
        )}
      </section>
    )
  }

  function renderMedication() {
    return (
      <>
        <section className="cg-patient-card">
          <div className="cg-patient-avatar">{userInitials.slice(0, 1)}</div>
          <div className="cg-patient-info">
            <span className="cg-muted-label">MY MEDICATION</span>
            <h2>Amoxicillin 500 mg</h2>
            <p>Medication information currently configured in the dashboard</p>
          </div>
          <div className="cg-patient-divider" />
          <div className="cg-medication-info">
            <span className="cg-muted-label">DOSE STATUS</span>
            <strong>{doseStatus}</strong>
            <p>Refer to the dose records below</p>
          </div>
          <div className="cg-patient-tag">Medication overview</div>
        </section>

        <div className="cg-section-heading">
          <div>
            <h2>Dose history</h2>
            <p>Previously recorded medication dose events</p>
          </div>
        </div>

        <section className="cg-panel">
          <PanelHeading
            title="Dose adherence log"
            description="Records returned by the backend"
            symbol="✓"
          />

          {doseHistory.length === 0 ? (
            <div className="cg-empty-state">
              <div className="cg-empty-icon">◷</div>
              <strong>No dose history available</strong>
              <p>
                Dose records will appear here when the backend returns them.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="adherence-table">
                <thead>
                  <tr>
                    <th>Scheduled date</th>
                    <th>Scheduled time</th>
                    <th>Recorded time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {doseHistory.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        {item.scheduled_date
                          ? new Date(item.scheduled_date).toLocaleDateString()
                          : '--'}
                      </td>
                      <td>{item.scheduled_time || '--'}</td>
                      <td>
                        {item.taken_time
                          ? new Date(item.taken_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '--'}
                      </td>
                      <td>
                        <StatusBadge status={item.status || 'PENDING'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )
  }

  function renderSafety() {
    return (
      <>
        <section className="cg-panel">
          <PanelHeading
            title="Medication safety assessment"
            description="Safety information calculated by the backend"
            symbol="♡"
          />

          {safety ? (
            <>
              <div className="cg-history-item">
                <div className="cg-history-icon">🛡️</div>
                <div className="cg-history-details">
                  <strong>{safety.state || 'State unavailable'}</strong>
                  <p>
                    {safety.message || 'No safety explanation was provided.'}
                  </p>
                  <span>
                    Exposure score: {safety.score ?? '--'} · Unsafe readings:{' '}
                    {safety.unsafeReadings ?? '--'}
                  </span>
                </div>
              </div>

              <div className="cg-status-grid">
                <article className="cg-status-card">
                  <div className="cg-card-top">
                    <div className="cg-card-icon cg-safety-icon">🌡️</div>
                    <span className="cg-card-label">MINIMUM TEMPERATURE</span>
                  </div>
                  <div className="cg-card-value cg-card-text-value">
                    {safety.minTemp ?? '--'}°C
                  </div>
                </article>

                <article className="cg-status-card">
                  <div className="cg-card-top">
                    <div className="cg-card-icon cg-temp-icon">🌡️</div>
                    <span className="cg-card-label">MAXIMUM TEMPERATURE</span>
                  </div>
                  <div className="cg-card-value cg-card-text-value">
                    {safety.maxTemp ?? '--'}°C
                  </div>
                </article>

                <article className="cg-status-card">
                  <div className="cg-card-top">
                    <div className="cg-card-icon cg-dose-icon">✓</div>
                    <span className="cg-card-label">TOTAL READINGS</span>
                  </div>
                  <div className="cg-card-value cg-card-text-value">
                    {safety.totalReadings ?? '--'}
                  </div>
                </article>
              </div>
            </>
          ) : (
            <div className="cg-empty-state">
              <div className="cg-empty-icon">◷</div>
              <strong>Safety assessment unavailable</strong>
              <p>The backend has not returned a safety assessment.</p>
            </div>
          )}
        </section>

        <p>
          Last refreshed:{' '}
          {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}
        </p>
      </>
    )
  }

  function renderContent() {
    if (activePage === 'temperature') {
      return (
        <>
          <Welcome
            eyebrow="TEMPERATURE MONITORING"
            title="Temperature history 🌡️"
            description="Review current and previously recorded temperature readings."
            chip="Temperature centre"
          />
          {renderTemperatureHistory()}
        </>
      )
    }

    if (activePage === 'medication') {
      return (
        <>
          <Welcome
            eyebrow="MEDICATION MANAGEMENT"
            title="My medications 💊"
            description="View your medication information and recorded dose history."
            chip="Medication centre"
          />
          {renderMedication()}
        </>
      )
    }

    if (activePage === 'safety') {
      return (
        <>
          <Welcome
            eyebrow="MEDICATION SAFETY"
            title="Medication safety 🛡️"
            description="Review the current safety state and configured temperature limits."
            chip="Safety centre"
          />
          {renderSafety()}
        </>
      )
    }

    if (activePage === 'alerts') {
      return (
        <>
          <Welcome
            eyebrow="SAFETY & HISTORY"
            title="Alerts & history ⚠️"
            description="Review safety notifications and previously recorded bottle events."
            chip="History centre"
          />

          {error && <p role="status">{error}</p>}

          {renderAlerts()}

          <section className="cg-panel">
            <PanelHeading
              title="Latest bottle event"
              description="Most recent event returned by the backend"
              symbol="▤"
            />

            {!bottle || !bottle.event_type ? (
              <div className="cg-empty-state">
                <div className="cg-empty-icon">◷</div>
                <strong>No bottle event available</strong>
                <p>No bottle event was returned by the backend.</p>
              </div>
            ) : (
              <div className="cg-history-item">
                <div className="cg-history-icon">🍶</div>
                <div className="cg-history-details">
                  <strong>
                    {String(bottle.event_type).replace(/_/g, ' ')}
                  </strong>
                  <p>Latest recorded bottle event</p>
                  <span>
                    {formatDate(bottle.created_at || bottle.timestamp)}
                  </span>
                </div>
              </div>
            )}
          </section>

          
        </>
      )
    }

    return (
      <>
        <Welcome
          eyebrow="PATIENT OVERVIEW"
          title={`Welcome back, ${user?.name || 'Patient'} 👋`}
          description="Here is your medication and device safety overview."
          chip="My health dashboard"
        />

        <section className="cg-patient-card">
          <div className="cg-patient-avatar">{userInitials.slice(0, 1)}</div>
          <div className="cg-patient-info">
            <span className="cg-muted-label">YOUR MEDICATION</span>
            <h2>Amoxicillin 500 mg</h2>
            <p>Medication monitoring overview</p>
          </div>
          <div className="cg-patient-divider" />
          <div className="cg-medication-info">
            <span className="cg-muted-label">MONITORING DEVICE</span>
            <strong>{latest?.device_id || 'SD001-ESP32'}</strong>
            <p>Medication storage monitoring</p>
          </div>
          <div className="cg-patient-tag">
            {error ? 'Connection issue' : 'Monitoring dashboard'}
          </div>
        </section>

        <div className="cg-section-heading">
          <div>
            <h2>Current status</h2>
            <p>Latest available information from your medication bottle.</p>
          </div>
        </div>

        {renderStatusCards()}

        {error && (
          <section className="cg-panel">
            <p role="status">{error}</p>
          </section>
        )}

        <section className="cg-panel">
          <PanelHeading
            title="Live device information"
            description="Latest available information from the ESP32"
            symbol="⌁"
          />
          <HardwarePanel device={device} bottle={bottle} />
        </section>

        <div className="cg-lower-grid">
          {renderAlerts()}

          <section className="cg-panel">
            <PanelHeading
              title="Medication safety"
              description="Current medication storage assessment"
              symbol="♡"
            />
            <div className="cg-history-item">
              <div className="cg-history-icon">🛡️</div>
              <div className="cg-history-details">
                <strong>{safetyState}</strong>
                <p>
                  {safety?.message ||
                    'Safety information will appear when returned by the backend.'}
                </p>
                <span>Exposure score: {safety?.score ?? '--'}</span>
              </div>
            </div>
            <button
              type="button"
              className="cg-nav-item"
              onClick={() => setActivePage('safety')}
            >
              View safety assessment →
            </button>
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
            <span>PATIENT PORTAL</span>
          </div>
        </div>

        <div className="cg-nav-label">MY WORKSPACE</div>

        <button
          type="button"
          className={`cg-nav-item ${activePage === 'overview' ? 'cg-nav-active' : ''}`}
          onClick={() => setActivePage('overview')}
        >
          <span>▦</span> Overview
        </button>

        <button
          type="button"
          className={`cg-nav-item ${activePage === 'temperature' ? 'cg-nav-active' : ''}`}
          onClick={() => setActivePage('temperature')}
        >
          <span>♨</span> Temperature history
        </button>

        <button
          type="button"
          className={`cg-nav-item ${activePage === 'medication' ? 'cg-nav-active' : ''}`}
          onClick={() => setActivePage('medication')}
        >
          <span>♧</span> My medications
        </button>

        <button
          type="button"
          className={`cg-nav-item ${activePage === 'safety' ? 'cg-nav-active' : ''}`}
          onClick={() => setActivePage('safety')}
        >
          <span>♡</span> Medication safety
        </button>

        <button
          type="button"
          className={`cg-nav-item ${activePage === 'alerts' ? 'cg-nav-active' : ''}`}
          onClick={() => setActivePage('alerts')}
        >
          <span>⚠</span> Alerts & history
        </button>

        <div className="cg-sidebar-bottom">
          <div className="cg-help-card">
            <span>🛡️</span>
            <strong>Your medication safety matters</strong>
            <p>Keep track of storage conditions and medication records.</p>
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
    <div className="cg-avatar">{userInitials}</div>
    <div className="cg-profile-info">
      <strong>{user?.name || 'Patient'}</strong>
      <span>Patient account</span>
    </div>
  </div>
</div>
        </header>

        <section className="cg-content">
          {renderContent()}

          <footer className="cg-footer">
            <span>MediGuard · Medication Safety Monitoring</span>
            <span>
              Monitoring data depends on device and network availability.
            </span>
          </footer>
        </section>
      </main>
    </div>
  )
}

/* ── App Root — login gate ─────────────────────────────────────────────── */
function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('safedose_user')
    return saved ? JSON.parse(saved) : null
  })

  function handleLogin(u) {
    localStorage.setItem('safedose_user', JSON.stringify(u))
    setUser(u)
  }

  function handleLogout() {
    localStorage.removeItem('safedose_user')
    setUser(null)
  }

  /*if (!user) return <LoginPage onLogin={handleLogin} />
  return <Dashboard user={user} onLogout={handleLogout} />*/
  if (!user) return <LoginPage onLogin={handleLogin} />

if (user.role === 'caregiver') {
  return <CaregiverDashboard user={user} onLogout={handleLogout} />
}

return <Dashboard user={user} onLogout={handleLogout} />
}

export default App
