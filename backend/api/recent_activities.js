const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const ACTIVITIES_ENDPOINT = 'https://www.strava.com/api/v3/athlete/activities?per_page=10';

async function getAccessToken() {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: STRAVA_REFRESH_TOKEN,
    }),
  });
  return response.json();
}

function metersToMiles(m) { return m / 1609.344; }
function metersToFeet(m) { return m * 3.28084; }
function metersToYards(m) { return m * 1.09361; }

function formatPace(activity) {
  const type = activity.type || activity.sport_type || '';
  const movingTime = activity.moving_time || 0;
  const distanceMi = metersToMiles(activity.distance || 0);
  const speedMph = (activity.average_speed || 0) * 2.23694;

  const runLike = ['Run', 'TrailRun', 'Walk', 'Hike'];
  if (runLike.includes(type) && distanceMi > 0) {
    const paceSecPerMi = movingTime / distanceMi;
    const min = Math.floor(paceSecPerMi / 60);
    const sec = Math.round(paceSecPerMi % 60);
    return `${min}:${sec.toString().padStart(2, '0')} /mi`;
  }

  const rideLike = ['Ride', 'VirtualRide', 'EBikeRide', 'Handcycle'];
  if (rideLike.includes(type)) {
    return `${speedMph.toFixed(1)} mph avg`;
  }

  if (type === 'Swim' && activity.distance) {
    const distanceYd = metersToYards(activity.distance);
    const paceSecPer100 = movingTime / (distanceYd / 100);
    const min = Math.floor(paceSecPer100 / 60);
    const sec = Math.round(paceSecPer100 % 60);
    return `${min}:${sec.toString().padStart(2, '0')} /100yd`;
  }

  return speedMph > 0 ? `${speedMph.toFixed(1)} mph avg` : '';
}

// Fetch photos for one activity. Strava only exposes still images
// (no video) through the API. Placeholder/default images are skipped.
async function getPhotos(activityId, accessToken) {
  const url = `https://www.strava.com/api/v3/activities/${activityId}/photos?photo_sources=true&size=1600`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) return [];
  const data = await r.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((p) => p && !p.default_photo && p.urls)
    .map((p) => {
      const sizes = Object.keys(p.urls).map(Number).filter(Boolean).sort((a, b) => b - a);
      const best = p.urls[String(sizes[0])] || Object.values(p.urls)[0];
      return { url: best, caption: p.caption || '' };
    })
    .filter((p) => typeof p.url === 'string' && p.url.startsWith('https://'));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');

  try {
    const tokenData = await getAccessToken();
    if (!tokenData.access_token) {
      return res.status(200).json({ activities: [], latestRoute: null });
    }

    const actRes = await fetch(ACTIVITIES_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!actRes.ok) {
      return res.status(200).json({ activities: [], latestRoute: null });
    }

    const raw = await actRes.json();
    if (!Array.isArray(raw)) {
      return res.status(200).json({ activities: [], latestRoute: null });
    }

    const activities = raw.slice(0, 5).map((a) => {
      const type = a.type || a.sport_type || 'Activity';
      return {
        id: a.id,
        name: a.name,
        type,
        distanceMiles: Math.round(metersToMiles(a.distance || 0) * 10) / 10,
        distanceYards: type === 'Swim' ? Math.round(metersToYards(a.distance || 0)) : null,
        movingTimeMin: Math.round((a.moving_time || 0) / 60),
        elevationFt: Math.round(metersToFeet(a.total_elevation_gain || 0)),
        date: a.start_date_local,
        pace: formatPace(a),
      };
    });

    // Find the most recent activity (within the last 10 pulled) that
    // actually has a GPS route attached — skips weight training, etc.
    const routeSource = raw.find((a) => a.map && a.map.summary_polyline);
    const latestRoute = routeSource
      ? {
          id: routeSource.id,
          name: routeSource.name,
          type: routeSource.type || routeSource.sport_type || 'Activity',
          date: routeSource.start_date_local,
          distanceMiles: Math.round(metersToMiles(routeSource.distance || 0) * 10) / 10,
          polyline: routeSource.map.summary_polyline,
        }
      : null;

    // Photos: look at the 10 most recent activities, fetch photos for the
// first few that have any (keeps Strava API usage bounded), cap the total.
let photos = [];
try {
  const withPhotos = raw.filter((a) => (a.total_photo_count || 0) > 0).slice(0, 4);
  const results = await Promise.allSettled(withPhotos.map((a) => getPhotos(a.id, tokenData.access_token)));
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const a = withPhotos[i];
    r.value.forEach((p) => photos.push({
      url: p.url,
      caption: p.caption,
      activityId: a.id,
      activityName: a.name,
      type: a.type || a.sport_type || 'Activity',
      date: a.start_date_local,
    }));
  });
  photos = photos.slice(0, 9);
} catch (e) { photos = []; }

const photoCounts = {};
photos.forEach((p) => { photoCounts[p.activityId] = (photoCounts[p.activityId] || 0) + 1; });
activities.forEach((a) => { a.photoCount = photoCounts[a.id] || 0; });

return res.status(200).json({ activities, latestRoute, photos });
  } catch (err) {
    return res.status(200).json({ activities: [], latestRoute: null });
  }
};
