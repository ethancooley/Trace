import { useEffect, useRef, useState, useCallback } from 'react'
import { decodePolyline, formatDistance, formatDuration, formatPace, getSportColor } from '../utils/strava'

export function drawRoute(canvas, polyline, color, padding = 24) {
  const coords = decodePolyline(polyline)
  if (!coords.length) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)
  const lngs = coords.map(c => c[0]), lats = coords.map(c => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const scaleX = (W - padding * 2) / (maxLng - minLng || 1)
  const scaleY = (H - padding * 2) / (maxLat - minLat || 1)
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (W - (maxLng - minLng) * scale) / 2
  const offsetY = (H - (maxLat - minLat) * scale) / 2
  const toX = lng => (lng - minLng) * scale + offsetX
  const toY = lat => H - ((lat - minLat) * scale + offsetY)

  const draw = (width, alpha) => {
    ctx.beginPath()
    ctx.moveTo(toX(coords[0][0]), toY(coords[0][1]))
    for (let i = 1; i < coords.length; i++) ctx.lineTo(toX(coords[i][0]), toY(coords[i][1]))
    ctx.strokeStyle = color + alpha
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }
  draw(12, '18')
  draw(5, '33')
  draw(1.5, 'ff')

  ctx.beginPath()
  ctx.arc(toX(coords[0][0]), toY(coords[0][1]), 3, 0, Math.PI * 2)
  ctx.fillStyle = color; ctx.fill()

  const last = coords[coords.length - 1]
  ctx.beginPath()
  ctx.arc(toX(last[0]), toY(last[1]), 5, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'; ctx.fill()
  ctx.beginPath()
  ctx.arc(toX(last[0]), toY(last[1]), 5, 0, Math.PI * 2)
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke()
}

function RouteCanvas({ polyline, color, width = 320, height = 200, padding = 24 }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (canvasRef.current) drawRoute(canvasRef.current, polyline, color, padding)
  }, [polyline, color, padding])
  return <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%', display: 'block' }} />
}

function StatBlock({ label, value, color }) {
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</p>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '1rem', color, letterSpacing: '0.04em', lineHeight: 1.2 }}>{value}</p>
    </div>
  )
}

function getSportStats(activity, color) {
  const sport = activity.sport_type || activity.type
  const stats = [
    { label: 'Distance', value: formatDistance(activity.distance, sport) },
    { label: 'Time', value: formatDuration(activity.moving_time) },
  ]
  if (activity.average_speed) stats.push({ label: sport === 'Ride' || sport === 'VirtualRide' ? 'Avg Speed' : 'Avg Pace', value: formatPace(activity.average_speed, sport) })
  if (activity.max_speed) stats.push({ label: sport === 'Ride' || sport === 'VirtualRide' ? 'Max Speed' : 'Max Pace', value: formatPace(activity.max_speed, sport) })
  if (activity.total_elevation_gain) stats.push({ label: 'Elevation', value: `${Math.round(activity.total_elevation_gain)}m` })
  if (activity.average_heartrate) stats.push({ label: 'Avg HR', value: `${Math.round(activity.average_heartrate)} bpm` })
  if (activity.max_heartrate) stats.push({ label: 'Max HR', value: `${Math.round(activity.max_heartrate)} bpm` })
  if (activity.average_watts) stats.push({ label: 'Avg Power', value: `${Math.round(activity.average_watts)}w` })
  if (activity.weighted_average_watts) stats.push({ label: 'Norm Power', value: `${Math.round(activity.weighted_average_watts)}w` })
  if (activity.suffer_score) stats.push({ label: 'Suffer Score', value: activity.suffer_score })
  if (activity.calories) stats.push({ label: 'Calories', value: `${Math.round(activity.calories)} kcal` })
  if (activity.average_cadence) stats.push({ label: 'Avg Cadence', value: `${Math.round(activity.average_cadence)} rpm` })
  return stats.map(s => ({ ...s, color }))
}

// The flying detail overlay — animates from card rect to fullscreen
function ActivityDetail({ activity, originRect, color, onClose }) {
  const overlayRef = useRef(null)
  const [phase, setPhase] = useState('entering') // entering | open | closing

  const vw = window.innerWidth
  const vh = window.innerHeight

  // Start rect (card position)
  const startStyle = {
    position: 'fixed',
    left: originRect.left,
    top: originRect.top,
    width: originRect.width,
    height: originRect.height,
    zIndex: 200,
    overflow: 'hidden',
    background: 'var(--surface)',
    border: `1px solid ${color}`,
    transition: 'left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1), width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1)',
  }

  // End rect (fullscreen)
  const endStyle = {
    position: 'fixed',
    left: 0,
    top: 0,
    width: vw,
    height: vh,
    zIndex: 200,
    overflow: 'hidden',
    background: 'var(--bg)',
    border: `1px solid ${color}33`,
    transition: 'left 0.55s cubic-bezier(0.4,0,0.2,1), top 0.55s cubic-bezier(0.4,0,0.2,1), width 0.55s cubic-bezier(0.4,0,0.2,1), height 0.55s cubic-bezier(0.4,0,0.2,1)',
  }

  useEffect(() => {
    // Frame 1: render at card position (no transition)
    // Frame 2: apply end styles (transition fires)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase('open')
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = useCallback(() => {
    setPhase('closing')
    setTimeout(onClose, 460)
  }, [onClose])

  // Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleClose])

  const isOpen = phase === 'open'
  const isClosing = phase === 'closing'

  const currentStyle = (isOpen && !isClosing) ? endStyle : isClosing ? startStyle : startStyle

  const sport = activity.sport_type || activity.type
  const date = new Date(activity.start_date_local)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const detailStats = getSportStats(activity, color)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 199,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen && !isClosing ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: isOpen && !isClosing ? 'auto' : 'none',
        }}
      />

      {/* Flying card */}
      <div ref={overlayRef} style={currentStyle}>
        {/* Route hero — full height when entering, top portion when open */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: isOpen && !isClosing ? 1 : 0,
          transition: 'opacity 0.3s ease 0.3s',
        }}>
          {/* Large route canvas */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <RouteCanvas
              polyline={activity.map.summary_polyline}
              color={color}
              width={vw * 2}
              height={Math.round(vh * 0.55) * 2}
              padding={80}
            />
          </div>

          {/* Bottom gradient */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            background: 'linear-gradient(transparent, var(--bg))',
            pointerEvents: 'none',
          }} />

          {/* Sport badge */}
          <div style={{
            position: 'absolute', top: '5rem', left: '4rem',
            fontFamily: "'DM Mono', monospace", fontSize: '0.6rem',
            color, background: 'var(--tag-bg)',
            border: `1px solid ${color}44`,
            padding: '0.25rem 0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>{sport}</div>

          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute', top: '6rem', right: '4rem',
              fontFamily: "'DM Mono', monospace", fontSize: '0.65rem',
              color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'none', border: '1px solid var(--border)',
              padding: '0.4rem 1rem', cursor: 'pointer', transition: 'all 0.2s',
              zIndex: 10,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.borderColor = color }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >← Back</button>
        </div>

        {/* Detail content — slides up from bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          padding: '3rem 4rem 4rem',
          transform: isOpen && !isClosing ? 'translateY(0)' : 'translateY(40px)',
          opacity: isOpen && !isClosing ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1) 0.25s, opacity 0.4s ease 0.25s',
          maxHeight: '50vh',
          overflowY: 'auto',
        }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>{dateStr}</p>
          <h2 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            letterSpacing: '-0.02em', lineHeight: 1.05,
            color: 'var(--text)', marginBottom: '2rem',
          }}>{activity.name}</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '1.5rem 2.5rem',
            paddingTop: '1.5rem',
            borderTop: `1px solid ${color}33`,
          }}>
            {detailStats.map(s => <StatBlock key={s.label} label={s.label} value={s.value} color={s.color} />)}
          </div>

          {activity.description && (
            <p style={{
              marginTop: '2rem', fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9rem', color: 'var(--text-secondary)',
              lineHeight: 1.7, paddingTop: '1.5rem',
              borderTop: '1px solid var(--border)',
            }}>{activity.description}</p>
          )}
        </div>
      </div>
    </>
  )
}

export default function ActivityCard({ activity }) {
  const [hovered, setHovered] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [originRect, setOriginRect] = useState(null)
  const cardRef = useRef(null)

  const color = getSportColor(activity.sport_type || activity.type)
  const sport = activity.sport_type || activity.type

  const previewStats = [
    { label: 'Dist', value: formatDistance(activity.distance, sport) },
    { label: 'Time', value: formatDuration(activity.moving_time) },
    activity.average_speed && { label: sport === 'Ride' || sport === 'VirtualRide' ? 'Speed' : 'Pace', value: formatPace(activity.average_speed, sport) },
    activity.total_elevation_gain && { label: 'Elev', value: `${Math.round(activity.total_elevation_gain)}m` },
  ].filter(Boolean)

  const handleClick = () => {
    const rect = cardRef.current.getBoundingClientRect()
    setOriginRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    setDetailOpen(true)
  }

  return (
    <>
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
        style={{
          background: hovered ? 'var(--surface2)' : 'var(--surface)',
          border: `1px solid ${hovered ? color : 'var(--border)'}`,
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          cursor: 'pointer',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        }}
      >
        <div style={{ height: '180px', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
          <RouteCanvas polyline={activity.map.summary_polyline} color={color} />
          <div style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
            fontFamily: "'DM Mono', monospace", fontSize: '0.55rem',
            color, background: 'var(--tag-bg)',
            border: `1px solid ${color}33`, padding: '0.2rem 0.5rem',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{sport}</div>
        </div>

        <div style={{ padding: '1rem 1.25rem' }}>
          <p style={{
            fontFamily: "'DM Serif Display', serif", fontSize: '1rem',
            color: 'var(--text)', marginBottom: '0.25rem',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{activity.name}</p>
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: '0.6rem',
            color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '0.85rem',
          }}>{new Date(activity.start_date_local).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {previewStats.map(stat => (
              <div key={stat.label}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.55rem', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{stat.label}</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem', color, letterSpacing: '0.04em' }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {detailOpen && originRect && (
        <ActivityDetail
          activity={activity}
          originRect={originRect}
          color={color}
          onClose={() => { setDetailOpen(false); setOriginRect(null) }}
        />
      )}
    </>
  )
}
