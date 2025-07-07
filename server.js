// server.js

// --- Dependencies ---
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch'); // Use node-fetch for server-side API calls

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const DATA_FILE_PATH = path.join(__dirname, 'wishlist', 'wishlist-data.json');

// Spotify Credentials from .env
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
const SPOTIFY_REDIRECT_URI = `http://localhost:${PORT}/auth/callback`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;


const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/wishlist', express.static(path.join(__dirname, 'wishlist')));

// --- Helper Functions ---

/**
 * Reads wishlist items from the JSON data file.
 */
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

/**
 * Writes wishlist items to the JSON data file.
 */
async function writeWishlistData(items) {
    try {
        await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing wishlist data file:', error);
        throw new Error('Failed to save wishlist data.');
    }
}

/**
 * Generates a unique ID.
 */
function generateUniqueId() {
    return crypto.randomBytes(16).toString('hex');
}

// --- Spotify API Helper Functions ---

/**
 * Gets a fresh access token from Spotify using the refresh token.
 */
const getAccessToken = async () => {
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

// GET /api/wishlist
app.get('/api/wishlist', async (req, res) => {
    try {
        const items = await readWishlistData();
        items.sort((a, b) => (new Date(b.addedAt) || 0) - (new Date(a.addedAt) || 0));
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wishlist items.', error: error.message });
    }
});

// POST /api/wishlist
app.post('/api/wishlist', async (req, res) => {
    try {
        const items = await readWishlistData();
        const newItem = {
            id: generateUniqueId(),
            name: req.body.name,
            description: req.body.description || '',
            imageUrl: req.body.imageUrl || '',
            price: req.body.price || '',
            link: req.body.link,
            addedAt: new Date().toISOString()
        };

        if (!newItem.name || !newItem.link) {
            return res.status(400).json({ message: 'Item name and link are required.' });
        }

        items.unshift(newItem);
        await writeWishlistData(items);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Error adding wishlist item.', error: error.message });
    }
});

// DELETE /api/wishlist/:id
app.delete('/api/wishlist/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let items = await readWishlistData();
        const initialLength = items.length;
        items = items.filter(item => item.id !== id);

        if (items.length === initialLength) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        await writeWishlistData(items);
        res.status(200).json({ message: 'Item deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting wishlist item.', error: error.message });
    }
});

// --- Spotify API Endpoints ---

// GET /api/spotify/now-playing - Secure endpoint for the client to fetch data
app.get('/api/spotify/now-playing', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res.status(503).json({ message: 'Could not retrieve access token from Spotify.' });
        }

        const response = await fetch(NOW_PLAYING_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (response.status === 204) {
            // 204 No Content - Nothing is playing
            return res.status(204).send();
        }
        
        if (response.status > 400) {
            const errorText = await response.text();
             return res.status(response.status).json({ message: 'Error from Spotify API.', details: errorText });
        }

        const song = await response.json();
        res.json(song);

    } catch (error) {
        console.error('Error in /api/spotify/now-playing:', error);
        res.status(500).json({ message: 'Internal server error while fetching from Spotify.', error: error.message });
    }
});

// --- Spotify Authentication Flow (for getting the initial refresh token) ---

// GET /auth/login - Step 1: Redirect user to Spotify to authorize
app.get('/auth/login', (req, res) => {
    const scope = 'user-read-currently-playing';
    res.redirect('https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: SPOTIFY_REDIRECT_URI
        }).toString());
});

// GET /auth/callback - Step 2: Exchange authorization code for tokens
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

        res.send(`
            <h1>Authentication Successful!</h1>
            <p><strong>Your Refresh Token is:</strong></p>
            <pre>${refresh_token}</pre>
            <p>Copy this token and add it to your <code>.env</code> file as <code>SPOTIFY_REFRESH_TOKEN</code>.</p>
            <hr>
            <p><strong>Your initial Access Token is:</strong></p>
            <pre>${access_token}</pre>
        `);
    } catch (error) {
        console.error('Error during auth callback:', error);
        res.status(500).send("Error getting refresh token.");
    }
});


// --- Serve HTML Pages ---
app.get('/wishlist/', (req, res) => res.sendFile(path.join(__dirname, 'wishlist', 'index.html')));
app.get('/wishlist/admin/', (req, res) => res.sendFile(path.join(__dirname, 'wishlist', 'admin', 'index.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('To get your Spotify Refresh Token, visit:');
    console.log(`http://localhost:${PORT}/auth/login`);
    readWishlistData().then(writeWishlistData).catch(err => {
        console.error("Error during initial check/creation of wishlist-data.json:", err);
    });
});
