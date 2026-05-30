import axios from 'axios'

const BACKEND_URL = 'http://localhost:3001'
const STRAVA_API = 'https://www.strava.com/api/v3'

export const getStravaAuthURL = () => {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
    redirect_uri: 'http://localhost:5173/callback',
    response_type: 'code',
    scope: 'activity:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export const exchangeToken = async (code) => {
  const res = await axios.post(`${BACKEND_URL}/exchange_token`, { code })
  return res.data
}

export const refreshAccessToken = async () => {
  const refresh_token = localStorage.getItem('strava_refresh_token')
  if (!refresh_token) throw new Error('No refresh token')
  const res = await axios.post(`${BACKEND_URL}/refresh_token`, { refresh_token })
  localStorage.setItem('strava_access_token', res.data.access_token)
  localStorage.setItem('strava_token_expires_at', res.data.expires_at)
  return res.data.access_token
}

export const getValidToken = async () => {
  const expiresAt = parseInt(localStorage.getItem('strava_token_expires_at') || '0')
  const now = Math.floor(Date.now() / 1000)
  if (now >= expiresAt - 300) {
    return await refreshAccessToken()
  }
  return localStorage.getItem('strava_access_token')
}

export const getActivities = async (page = 1, perPage = 20) => {
  const token = await getValidToken()
  const res = await axios.get(`${STRAVA_API}/athlete/activities`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { page, per_page: perPage },
  })
  return res.data
}

export const getAthlete = async () => {
  const token = await getValidToken()
  const res = await axios.get(`${STRAVA_API}/athlete`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

// Decode Google encoded polyline to array of [lng, lat] pairs for deck.gl
export const decodePolyline = (encoded) => {
  if (!encoded) return []
  const coords = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1
    shift = 0; result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1
    coords.push([lng / 1e5, lat / 1e5])
  }
  return coords
}

export const formatDistance = (meters, sport) => {
  if (sport === 'Swim') return `${meters}m`
  const miles = meters / 1609.344
  return `${miles.toFixed(2)} mi`
}

export const formatPace = (metersPerSecond, sport) => {
  if (sport === 'Ride' || sport === 'VirtualRide') {
    return `${(metersPerSecond * 2.23694).toFixed(1)} mph`
  }
  const secPerMile = 1609.344 / metersPerSecond
  const m = Math.floor(secPerMile / 60)
  const s = Math.round(secPerMile % 60)
  return `${m}:${String(s).padStart(2, '0')} /mi`
}

export const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export const getSportColor = (sport) => {
  const colors = {
    Run: '#2E7DA3',
    Ride: '#4A8FA8',
    Swim: '#6eb5d4',
    Walk: '#8a9aa3',
    Hike: '#5a8a6a',
    VirtualRide: '#3d7a8a',
    WeightTraining: '#6a5a8a',
  }
  return colors[sport] || '#2E7DA3'
}
