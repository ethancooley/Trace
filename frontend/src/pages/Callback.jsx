import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeToken } from '../utils/strava'

export default function Callback() {
  const navigate = useNavigate()
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error || !code) {
      navigate('/')
      return
    }

    exchangeToken(code)
      .then((data) => {
        localStorage.setItem('strava_access_token', data.access_token)
        localStorage.setItem('strava_refresh_token', data.refresh_token)
        localStorage.setItem('strava_token_expires_at', data.expires_at)
        localStorage.setItem('strava_athlete', JSON.stringify(data.athlete))
        navigate('/dashboard')
      })
      .catch(() => navigate('/'))
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: '0.72rem',
        color: 'var(--accent)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        Connecting...
      </p>
    </div>
  )
}
