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

    const activities = raw.slice(0, 5).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type || a.sport_type || 'Activity',
      distanceMiles: Math.round(metersToMiles(a.distance || 0) * 10) / 10,
      movingTimeMin: Math.round((a.moving_time || 0) / 60),
      elevationFt: Math.round(metersToFeet(a.total_elevation_gain || 0)),
      date: a.start_date_local,
      pace: formatPace(a),
    }));

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

    return res.status(200).json({ activities, latestRoute });
  } catch (err) {
    return res.status(200).json({ activities: [], latestRoute: null });
  }
};
