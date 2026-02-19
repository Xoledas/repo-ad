const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/* ─── LOAD ENVIRONMENT VARIABLES ─────────────────────────────── */
const NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({
  path: path.join(__dirname, `.env.${NODE_ENV}`),
});

if (NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TOKEN_ENDPOINT = process.env.TOKEN_ENDPOINT;
const AUTH_SCOPES = process.env.AUTH_SCOPES;
const SSL_KEY_FILE = process.env.SSL_KEY_FILE;
const SSL_CERT_FILE = process.env.SSL_CERT_FILE;

const AUTH_CALLBACK_URL = `${BACKEND_URL}/auth/callback`;
const AUTH_LOGIN_URL = `https://ims-na1.adobelogin.com/ims/authorize/v2?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(AUTH_CALLBACK_URL)}&scope=${encodeURIComponent(AUTH_SCOPES)}&response_type=code`;

const app = express();

/* ─── MIDDLEWARE ─────────────────────────────────────────────── */
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

/* ─── AUTH ROUTES ────────────────────────────────────────────── */

app.get('/auth/login', (req, res) => {
  console.log(`Redirecting to auth provider: ${AUTH_LOGIN_URL}`);
  res.redirect(AUTH_LOGIN_URL);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  console.log('Received authorization code, exchanging for access token…');

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('code', code);

    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Token response missing access_token:', tokenData);
      return res.status(500).send('Failed to obtain access token');
    }

    console.log('Access token obtained successfully, redirecting to frontend…');

    const redirectUrl = `${FRONTEND_URL}/results?access_token=${encodeURIComponent(tokenData.access_token)}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).send('Failed to exchange code for access token');
  }
});

/* ─── AEM PROXY ENDPOINT ────────────────────────────────────── */
app.post('/api/assets/search', async (req, res) => {
  const { bearerToken } = req.body;

  if (!bearerToken) {
    return res.status(400).json({ error: 'Bearer token is required' });
  }

  const searchBody = {
    query: [
      {
        term: {
          'metadata.assetMetadata.xol:folderKey': ['xolAssets'],
        },
      },
      {
        term: {
          'metadata.repositoryMetadata.dc:format': ['image/jpeg'],
        },
      },
    ],
    limit: 20,
  };

  try {
    const response = await fetch(
      'https://delivery-p88906-e783512.adobeaemcloud.com/adobe/assets/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLIENT_ID,
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(searchBody),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling AEM API:', error);
    res.status(500).json({ error: 'Failed to fetch assets from AEM' });
  }
});

/* ─── AEM IMAGE PROXY ENDPOINT ───────────────────────────────── */
app.get('/api/getMedia', async (req, res) => {
  const { assetId, seoName, format, bearerToken } = req.query;

  if (!assetId || !seoName || !format || !bearerToken) {
    return res.status(400).json({ error: 'assetId, seoName, format, and bearerToken are required' });
  }

  const imageUrl = `https://delivery-p88906-e783512.adobeaemcloud.com/adobe/assets/${encodeURIComponent(assetId)}/as/${encodeURIComponent(seoName)}.${encodeURIComponent(format)}?width=319`;

  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      console.error(`Image fetch failed: ${response.status} ${response.statusText}`);
      return res.status(response.status).send('Failed to fetch image');
    }

    const contentType = response.headers.get('content-type') || `image/${format}`;
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');

    response.body.pipe(res);
  } catch (error) {
    console.error('Error fetching image from AEM:', error);
    res.status(500).send('Failed to fetch image');
  }
});

/* ─── START SERVER (HTTPS when certs are configured, HTTP otherwise) */
if (SSL_KEY_FILE && SSL_CERT_FILE) {
  const sslOptions = {
    key: fs.readFileSync(path.resolve(__dirname, SSL_KEY_FILE)),
    cert: fs.readFileSync(path.resolve(__dirname, SSL_CERT_FILE)),
  };
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`[${NODE_ENV}] Backend running on https://localhost:${PORT}`);
    console.log(`Auth callback URL: ${AUTH_CALLBACK_URL}`);
  });
} else {
  http.createServer(app).listen(PORT, () => {
    console.log(`[${NODE_ENV}] Backend running on http://localhost:${PORT}`);
    console.log(`Auth callback URL: ${AUTH_CALLBACK_URL}`);
  });
}
