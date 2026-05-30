import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActivities, formatDistance, formatDuration } from '../utils/strava'
import ActivityCard from '../components/ActivityCard'

const SPORT_FILTERS = ['All', 'Run', 'Ride', 'Swim', 'Hike', 'Walk']

function SummaryBar({ activities, filter, color }) {
  const stats = useMemo(() => {
    if (!activities.length) return null
    const totalDist = activities.reduce((s, a) => s + (a.distance || 0), 0)
    const totalTime = activities.reduce((s, a) => s + (a.moving_time || 0), 0)
    const totalElev = activities.reduce((s, a) => s + (a.total_elevation_gain || 0), 0)
    const count = activities.length
    return { totalDist, totalTime, totalElev, count }
  }, [activities])

  if (!stats) return null

  const sport = filter === 'All' ? null : filter
  const items = [
    { label: 'Activities', value: stats.count },
    { label: 'Total Distance', value: formatDistance(stats.totalDist, sport) },
    { label: 'Total Time', value: formatDuration(stats.totalTime) },
    { label: 'Total Elevation', value: `${Math.round(stats.totalElev).toLocaleString()}m` },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '1px',
      background: 'var(--border)',
      border: '1px solid var(--border)',
      marginBottom: '2.5rem',
    }}>
      {items.map(item => (
        <div key={item.label} style={{
          background: 'var(--surface)',
          padding: '1.25rem 1.5rem',
          transition: 'background 0.2s',
        }}>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.55rem',
            color: 'var(--muted)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '0.4rem',
          }}>{item.label}</p>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '1.1rem',
            color: color,
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState('All')

  const athlete = JSON.parse(localStorage.getItem('strava_athlete') || '{}')

  const fetchActivities = useCallback(async (pageNum, reset = false) => {
    try {
      const data = await getActivities(pageNum, 100)
      if (data.length < 100) setHasMore(false)
      setActivities(prev => reset ? data : [...prev, ...data])
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        navigate('/')
      } else {
        setError('Failed to load activities.')
      }
    }
  }, [navigate])

  useEffect(() => {
    fetchActivities(1, true).finally(() => setLoading(false))
  }, [fetchActivities])

  const loadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    await fetchActivities(nextPage)
    setPage(nextPage)
    setLoadingMore(false)
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const filtered = useMemo(() => {
    const withRoute = activities.filter(a => !!a.map?.summary_polyline)
    return filter === 'All' ? withRoute : withRoute.filter(a => (a.sport_type || a.type) === filter)
  }, [activities, filter])

  // Color for the active filter
  const filterColor = filter === 'All' ? 'var(--accent)' :
    filter === 'Run' ? '#2E7DA3' :
    filter === 'Ride' ? '#4A8FA8' :
    filter === 'Swim' ? '#6eb5d4' :
    filter === 'Hike' ? '#5a8a6a' : 'var(--accent)'

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(#242824 1px, transparent 1px), linear-gradient(90deg, #242824 1px, transparent 1px)',
        backgroundSize: '80px 80px', opacity: 0.35, pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.25rem 4rem',
        background: 'rgba(13,15,14,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Trace
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {athlete.firstname && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
              {athlete.firstname} {athlete.lastname}
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >Disconnect</button>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '8rem 4rem 4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Your activities
          </p>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            Every mile,<br />
            <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>beautifully traced.</em>
          </h1>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {SPORT_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '0.4rem 1rem',
                background: filter === f ? 'var(--accent)' : 'var(--tag-bg)',
                color: filter === f ? 'var(--bg)' : 'var(--accent)',
                border: `1px solid ${filter === f ? 'var(--accent)' : '#1a2f3d'}`,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >{f}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Loading activities...
          </div>
        ) : error ? (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', color: '#e07070', letterSpacing: '0.1em' }}>{error}</div>
        ) : (
          <>
            {/* Summary bar */}
            {filtered.length > 0 && <SummaryBar activities={filtered} filter={filter} color={filterColor} />}

            {/* Activity grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              {filtered.map(activity => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>

            {filtered.length === 0 && (
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
                No {filter.toLowerCase()} activities found.
              </p>
            )}

            {hasMore && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'var(--accent)', background: 'none',
                    border: '1px solid var(--accent)', padding: '0.75rem 2rem',
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    opacity: loadingMore ? 0.5 : 1, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!loadingMore) { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--bg)' }}}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--accent)' }}
                >{loadingMore ? 'Loading...' : 'Load more'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
