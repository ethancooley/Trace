const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.post('/exchange_token', async (req, res) => {
  const { code } = req.body;
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

app.post('/refresh_token', async (req, res) => {
  const { refresh_token } = req.body;
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Trace backend running on port ${PORT}`));
