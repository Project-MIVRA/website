// server.js

// --- Dependencies ---
require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const DATA_FILE_PATH = path.join(__dirname, 'wishlist', 'wishlist-data.json');

// Environment and Base URL from .env
const { NODE_ENV, BASE_URL, STEAM_API_KEY, STEAM_USER_ID } = process.env;

// Spotify Credentials
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
const SPOTIFY_REDIRECT_URI = `${BASE_URL}/auth/callback`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const DEVICES_ENDPOINT = `https://api.spotify.com/v1/me/player/devices`;

// Steam Endpoints
const STEAM_RECENTLY_PLAYED_ENDPOINT = `http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/`;
const STEAM_PLAYER_SUMMARY_ENDPOINT = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/`;


const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/wishlist', express.static(path.join(__dirname, 'wishlist')));

// --- Helper Functions ---
async function readWishlistData() {
    try {
        await fs.access(DATA_FILE_PATH);
        const data = await fs.readFile(DATA_FILE_PATH, 'utf8');
        return data.trim() === '' ? [] : JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        console.error('Error reading wishlist data file:', error);
        return [];
    }
}

async function writeWishlistData(items) {
    try {
        await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing wishlist data file:', error);
        throw new Error('Failed to save wishlist data.');
    }
}

function generateUniqueId() {
    return crypto.randomBytes(16).toString('hex');
}

const getSpotifyAccessToken = async () => {
    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: SPOTIFY_REFRESH_TOKEN
        })
    });
    const data = await response.json();
    return data.access_token;
};

// --- API Endpoints ---

// Previous Wishlist endpoints... (omitted for brevity, no changes needed)

// --- Spotify API Endpoints ---
app.get('/api/spotify/now-playing', async (req, res) => {
    try {
        const accessToken = await getSpotifyAccessToken();
        if (!accessToken) return res.status(503).json({ message: 'Could not retrieve access token from Spotify.' });
        const response = await fetch(NOW_PLAYING_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (response.status === 204) return res.status(204).send();
        if (response.status >= 400) return res.status(response.status).json({ message: 'Error from Spotify API.' });
        const song = await response.json();
        res.json(song);
    } catch (error) {
        console.error('Error in /api/spotify/now-playing:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

app.get('/api/spotify/devices', async (req, res) => {
    try {
        const accessToken = await getSpotifyAccessToken();
        if (!accessToken) return res.status(503).json({ message: 'Could not retrieve access token from Spotify.' });
        const response = await fetch(DEVICES_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (response.status >= 400) return res.status(response.status).json({ message: 'Error from Spotify API.' });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error in /api/spotify/devices:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// --- Steam API Endpoints ---
app.get('/api/steam/player-summary', async (req, res) => {
    if (!STEAM_API_KEY || !STEAM_USER_ID) {
        return res.status(500).json({ message: 'Steam API Key or User ID is not configured on the server.' });
    }
    try {
        const url = `${STEAM_PLAYER_SUMMARY_ENDPOINT}?key=${STEAM_API_KEY}&steamids=${STEAM_USER_ID}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching from Steam Player Summary API:', error);
        res.status(500).json({ message: 'Internal server error while fetching from Steam.' });
    }
});

app.get('/api/steam/recently-played', async (req, res) => {
    if (!STEAM_API_KEY || !STEAM_USER_ID) {
        return res.status(500).json({ message: 'Steam API Key or User ID is not configured on the server.' });
    }
    try {
        const url = `${STEAM_RECENTLY_PLAYED_ENDPOINT}?key=${STEAM_API_KEY}&steamid=${STEAM_USER_ID}&format=json`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching from Steam Recently Played API:', error);
        res.status(500).json({ message: 'Internal server error while fetching from Steam.' });
    }
});


// --- Spotify Authentication Flow ---
app.get('/auth/login', (req, res) => {
    const scope = 'user-read-playback-state user-read-currently-playing';
    res.redirect('https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: SPOTIFY_REDIRECT_URI
        }).toString());
});

app.get('/auth/callback', async (req, res) => {
    const code = req.query.code || null;
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + (Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });
        const data = await response.json();
        const { access_token, refresh_token } = data;
        res.send(`<h1>Authentication Successful!</h1><p>Your NEW Refresh Token is:</p><pre>${refresh_token}</pre><p>Copy this token and add it to your <code>.env</code> file.</p>`);
    } catch (error) {
        console.error('Error during auth callback:', error);
        res.status(500).send("Error getting refresh token.");
    }
});

// --- Serve HTML Pages ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(`To get your Spotify Refresh Token, visit: ${BASE_URL}/auth/login`);
});
