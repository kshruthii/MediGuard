/*import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Login failed')
        return
      }
      onLogin(data.user)
    } catch {
      setError('Could not connect to the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">💊</span>
          <h1>SafeDose</h1>
          <p>Smart Temperature-Aware Medication Safety &amp; Dose Tracking</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">MediGuard IoT Monitoring System</p>
      </div>
    </div>
  )
}

export default LoginPage*/

import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

function LoginPage({ onLogin }) {
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Login failed')
        return
      }

      if (data.user.role !== role) {
        setError(`This account is not registered as a ${role}. Please choose the correct role.`)
        return
      }

      onLogin(data.user)
    } catch {
      setError('Could not connect to the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function chooseRole(selectedRole) {
    setRole(selectedRole)
    setEmail('')
    setPassword('')
    setError('')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">💊</span>
          <h1>MediGuard</h1>
          <p>Smart Medication Safety &amp; Adherence Monitoring</p>
        </div>

        
{!role ? (
  <div className="role-selection">
    <h2>Welcome back!</h2>
    <p>How would you like to sign in?</p>

    <div className="role-options">
      <button
        type="button"
        className="login-btn"
        onClick={() => chooseRole('patient')}
      >
        👤 Sign in as Patient
      </button>

      <button
        type="button"
        className="login-btn caregiver-login-btn"
        onClick={() => chooseRole('caregiver')}
      >
        🩺 Sign in as Caregiver
      </button>
    </div>
  </div>
) : (

          <form onSubmit={handleSubmit}>
            <h2>
              {role === 'patient' ? 'Patient Login' : 'Caregiver Login'}
            </h2>
            <p>Enter your account details to continue.</p>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <button
              type="button"
              className="back-btn"
              onClick={() => chooseRole('')}
              disabled={loading}
            >
              ← Back to role selection
            </button>
          </form>
        )}

        <p className="login-footer">MediGuard IoT Monitoring System</p>
      </div>
    </div>
  )
}

export default LoginPage
