import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStravaAuthURL } from '../utils/strava'

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('strava_access_token')) {
      navigate('/dashboard')
    }
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Grid background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(#242824 1px, transparent 1px), linear-gradient(90deg, #242824 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        opacity: 0.35,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '480px', padding: '2rem' }}>

        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.65rem',
          color: 'var(--accent)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
          opacity: 0.8,
        }}>
          Your activities. Beautifully rendered.
        </p>

        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 'clamp(4rem, 12vw, 7rem)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          marginBottom: '3rem',
          color: 'var(--text)',
        }}>
          Trace
        </h1>

        <a
          href={getStravaAuthURL()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--bg)',
            background: 'var(--accent)',
            padding: '0.9rem 2rem',
            textDecoration: 'none',
            transition: 'opacity 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z"/>
            <path d="M11.591 7.992l1.914 3.768h2.5L11.591 3 7.16 11.76h2.5l1.931-3.768z"/>
          </svg>
          Connect with Strava
        </a>

        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.6rem',
          color: 'var(--muted)',
          letterSpacing: '0.08em',
          marginTop: '2rem',
        }}>
          Read-only access · Your data stays yours
        </p>
      </div>
    </div>
  )
}
