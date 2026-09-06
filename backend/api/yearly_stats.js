const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Longer cache than the other endpoints — this one paginates through
  // Strava, so we don't want every page load re-triggering it.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');

  try {
    const tokenData = await getAccessToken();
    if (!tokenData.access_token) {
      return res.status(200).json({ available: false });
    }

    const jan1 = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const afterEpoch = Math.floor(jan1.getTime() / 1000);

    let all = [];
    // Cap at 3 pages (600 activities) — plenty of headroom for a year
    // of personal training, while keeping Strava API usage bounded.
    for (let page = 1; page <= 3; page++) {
      const url = `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=200&page=${page}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
      if (!r.ok) break;
      const batch = await r.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < 200) break;
    }

    let totalDistanceM = 0;
    let totalElevationM = 0;
    let totalMovingSec = 0;
    const byType = {};

    for (const a of all) {
      totalDistanceM += a.distance || 0;
      totalElevationM += a.total_elevation_gain || 0;
      totalMovingSec += a.moving_time || 0;
      const t = a.type || a.sport_type || 'Other';
      byType[t] = (byType[t] || 0) + 1;
    }

    return res.status(200).json({
      available: true,
      year: new Date().getUTCFullYear(),
      totalActivities: all.length,
      totalDistanceMiles: Math.round(metersToMiles(totalDistanceM)),
      totalElevationFt: Math.round(metersToFeet(totalElevationM)),
      totalHours: Math.round((totalMovingSec / 3600) * 10) / 10,
      byType,
    });
  } catch (err) {
    return res.status(200).json({ available: false });
  }
};
