const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;

/* ─── SSL CERTIFICATES ──────────────────────────────────────── */
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '..', 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'certs', 'cert.pem')),
};

/* ─── CONFIGURABLE SETTINGS ─────────────────────────────────── */
const FRONTEND_URL = 'https://localhost:3000';
const AUTH_CALLBACK_URL = `https://localhost:${PORT}/auth/callback`;

/*
 * Set AUTH_LOGIN_URL to your Adobe IMS authorization endpoint.
 * The redirect_uri parameter in this URL should match AUTH_CALLBACK_URL.
 *
 * Example:
 *   https://ims-na1.adobelogin.com/ims/authorize/v2
 *     ?client_id=a3157759fd0f46f0b393603c4f2df8d0
 *     &redirect_uri=https://localhost:4000/auth/callback
 *     &scope=openid,AdobeID
 *     &response_type=code
 */
const AUTH_LOGIN_URL = 'https://ims-na1.adobelogin.com/ims/authorize/v2?client_id=a3157759fd0f46f0b393603c4f2df8d0&redirect_uri=https://localhost:4000/auth/callback&scope=openid,aem.assets.delivery,AdobeID&response_type=code';

const TOKEN_ENDPOINT = 'https://ims-na1.adobelogin.com/ims/token/v3';
const CLIENT_ID = 'a3157759fd0f46f0b393603c4f2df8d0';
const CLIENT_SECRET = 'p8e-zc3JOZcpp5Z3mg_nFkrLFSeMjwlvwHrY';

/* ─── MIDDLEWARE ─────────────────────────────────────────────── */
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

/* ─── AUTH ROUTES ────────────────────────────────────────────── */

// Step 1: Redirect the user to the external authentication page
app.get('/auth/login', (req, res) => {
  console.log(`Redirecting to auth provider: ${AUTH_LOGIN_URL}`);
  res.redirect(AUTH_LOGIN_URL);
});

// Step 2: Callback — the auth provider redirects here with ?code=...
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  console.log('Received authorization code, exchanging for access token…');

  try {
    // Step 3: Exchange the code for an access token
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

    // Step 4: Redirect to PageTwo with the access token
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

/* ─── START HTTPS SERVER ─────────────────────────────────────── */
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Backend server running on https://localhost:${PORT}`);
  console.log(`Auth callback URL: ${AUTH_CALLBACK_URL}`);
});
