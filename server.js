// server.js

// --- Dependencies ---
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const fetch = require('node-fetch');
const multer = require('multer');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const DATA_FILE_PATH = path.join(__dirname, 'wishlist', 'wishlist-data.json');
const GIFS_DIR = path.join(__dirname, 'gifs');
const TEMP_DIR = path.join(__dirname, 'temp_uploads');

(async () => {
    try {
        await fs.mkdir(GIFS_DIR, { recursive: true });
        await fs.mkdir(TEMP_DIR, { recursive: true });
    } catch (e) { console.error("Error creating directories", e); }
})();

// Environment
const { 
    NODE_ENV, BASE_URL, STEAM_API_KEY, STEAM_USER_ID,
    SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN,
    GIF_UPLOAD_PASSWORD
} = process.env;

// Spotify Credentials
const SPOTIFY_REDIRECT_URI = `${BASE_URL}/auth/callback`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const DEVICES_ENDPOINT = `https://api.spotify.com/v1/me/player/devices`;

// Steam Endpoints
const STEAM_RECENTLY_PLAYED_ENDPOINT = `http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/`;
const STEAM_PLAYER_SUMMARY_ENDPOINT = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/`;

// 3D Printers config
const printers = [
    { id: 1, name: 'Neptune 4 Plus', ip: '100.107.58.101', camPath: '/webcam/?action=stream' },
    { id: 2, name: 'SV06', ip: '100.107.26.72', camPath: '/webcam2/?action=stream' },
    { id: 3, name: 'Ultimaker 3', ip: '100.107.235.80', camPath: '/webcam/?action=stream' }
];

let currentActivity = { text: 'Meowing' };

// Multer Config (Uploads)
const upload = multer({ dest: TEMP_DIR });

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
    // Note: Updated URLs to actual Spotify endpoints in constants above
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

// --- GIF & UPLOAD LOGIC ---

// GET /api/gifs - List all gifs
app.get('/api/gifs', async (req, res) => {
    try {
        const files = await fs.readdir(GIFS_DIR);
        const gifs = files.filter(f => f.toLowerCase().endsWith('.gif'));
        res.json(gifs);
    } catch (error) {
        console.error("Error reading gifs directory:", error);
        res.status(500).json({ message: "Error listing gifs" });
    }
});

// POST /api/gifs - Upload and convert
app.post('/api/gifs', upload.single('file'), async (req, res) => {
    const tempPath = req.file ? req.file.path : null;
    
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
        
        const { password, filename } = req.body;

        if (password !== GIF_UPLOAD_PASSWORD) {
            if (tempPath) await fs.unlink(tempPath);
            return res.status(403).json({ message: 'Invalid upload code.' });
        }

        let finalName = filename ? filename.trim() : req.file.originalname.replace(/\.[^/.]+$/, "");
        finalName = finalName.replace(/[^a-z0-9\-_]/gi, '_');
        if (!finalName.toLowerCase().endsWith('.gif')) finalName += '.gif';

        const finalPath = path.join(GIFS_DIR, finalName);

        try {
            await fs.access(finalPath);
            if (tempPath) await fs.unlink(tempPath);
            return res.status(409).json({ message: 'Filename already in use. Please choose another.' });
        } catch (e) {
        }

        const mime = req.file.mimetype;

        if (mime.startsWith('image/')) {
            await sharp(tempPath, { animated: true })
                .toFormat('gif')
                .toFile(finalPath);
            
        } else if (mime.startsWith('video/')) {
            await new Promise((resolve, reject) => {
                ffmpeg(tempPath)
                    .outputOption('-vf', 'fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse')
                    .toFormat('gif')
                    .save(finalPath)
                    .on('end', resolve)
                    .on('error', reject);
            });
        } else {
            if (tempPath) await fs.unlink(tempPath);
            return res.status(400).json({ message: 'Unsupported file type. Use Image or Video.' });
        }

        await fs.unlink(tempPath);
        
        res.json({ message: 'File uploaded and converted successfully!', filename: finalName });

    } catch (error) {
        console.error("Upload error:", error);
        if (tempPath) {
            try { await fs.unlink(tempPath); } catch (e) {}
        }
        res.status(500).json({ message: 'Server error during processing.' });
    }
});


// --- Wishlist API Endpoints ---
app.get('/api/wishlist', async (req, res) => {
    try {
        const items = await readWishlistData();
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve wishlist items.' });
    }
});

app.post('/api/wishlist', async (req, res) => {
    try {
        const { name, description, price, link, imageUrl } = req.body;
        if (!name) return res.status(400).json({ message: 'Item name is required.' });
        
        const items = await readWishlistData();
        const newItem = { id: generateUniqueId(), name, description: description || '', price: price || '', link: link || '', imageUrl: imageUrl || '', purchased: false, addedAt: new Date().toISOString() };
        items.push(newItem);
        await writeWishlistData(items);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add item to wishlist.' });
    }
});

app.put('/api/wishlist/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, link, imageUrl, purchased } = req.body;
        let items = await readWishlistData();
        const itemIndex = items.findIndex(item => item.id === id);
        if (itemIndex === -1) return res.status(404).json({ message: 'Item not found.' });

        const updatedItem = { ...items[itemIndex] };
        if (name !== undefined) updatedItem.name = name;
        if (description !== undefined) updatedItem.description = description;
        if (price !== undefined) updatedItem.price = price;
        if (link !== undefined) updatedItem.link = link;
        if (imageUrl !== undefined) updatedItem.imageUrl = imageUrl;
        if (purchased !== undefined) updatedItem.purchased = purchased;
        
        items[itemIndex] = updatedItem;
        await writeWishlistData(items);
        res.json(updatedItem);
    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).json({ message: 'Failed to update item.' });
    }
});

app.delete('/api/wishlist/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let items = await readWishlistData();
        const filteredItems = items.filter(item => item.id !== id);
        if (items.length === filteredItems.length) return res.status(404).json({ message: 'Item not found.' });
        await writeWishlistData(filteredItems);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete item.' });
    }
});

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
    if (!STEAM_API_KEY || !STEAM_USER_ID) return res.status(500).json({ message: 'Steam config missing.' });
    try {
        const url = `${STEAM_PLAYER_SUMMARY_ENDPOINT}?key=${STEAM_API_KEY}&steamids=${STEAM_USER_ID}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching from Steam:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

app.get('/api/steam/recently-played', async (req, res) => {
    if (!STEAM_API_KEY || !STEAM_USER_ID) return res.status(500).json({ message: 'Steam config missing.' });
    try {
        const url = `${STEAM_RECENTLY_PLAYED_ENDPOINT}?key=${STEAM_API_KEY}&steamid=${STEAM_USER_ID}&format=json`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching from Steam:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// --- 3D Printer Endpoints ---
app.get('/api/printers/status', async (req, res) => {
    try {
        const statuses = await Promise.all(printers.map(async (printer) => {
            const url = `http://${printer.ip}:7125/printer/objects/query?print_stats&toolhead&heater_bed&extruder&display_status&virtual_sdcard`;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) return { id: printer.id, name: printer.name, status: 'error', message: `API ${response.status}` };
                const data = await response.json();
                if (data?.result?.status) return { id: printer.id, name: printer.name, status: 'ok', data: data.result.status };
                return { id: printer.id, name: printer.name, status: 'error', message: 'Invalid response' };
            } catch (error) {
                return { id: printer.id, name: printer.name, status: 'error', message: error.name === 'AbortError' ? 'Timeout' : error.message };
            }
        }));
        res.json(statuses);
    } catch (error) {
        console.error('Error fetching printer statuses:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

app.get('/api/printers/:id/camera', (req, res) => {
    const printerId = parseInt(req.params.id, 10);
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return res.status(404).send('Printer not found');

    const options = { hostname: printer.ip, path: printer.camPath, method: 'GET' };
    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
        console.error(`Camera proxy error ${printer.id}:`, e);
        if (!res.headersSent) res.status(500).send('Error proxying stream');
    });
    req.on('close', () => proxyReq.abort());
    proxyReq.end();
});

// --- Activity API Endpoints ---
app.get('/api/activity', (req, res) => res.json(currentActivity));
app.post('/api/activity', (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ message: 'Text required.' });
    currentActivity = { text };
    res.status(200).json({ message: 'Activity updated' });
});

// --- Suggestions API Endpoint ---
app.post('/api/suggestions', async (req, res) => {
    const { suggestion, name, contact } = req.body;
    if (!suggestion) return res.status(400).json({ message: 'Suggestion text is required.' });

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT == 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const mailOptions = {
        from: '"Suggestion Box" <responses@mivra.net>',
        to: 'mini@mivra.net',
        subject: 'New Suggestion Received!',
        text: `Suggestion:\n\n${suggestion}\n\nFrom: ${name || 'Anonymous'}\nContact: ${contact || 'Not provided'}`,
        html: `<p>New suggestion:</p>
               <blockquote style="border-left: 2px solid #ccc; padding-left: 1em;">${suggestion.replace(/\n/g, '<br>')}</blockquote>
               <p><strong>From:</strong> ${name || 'Anonymous'}</p>
               <p><strong>Contact:</strong> ${contact || 'Not provided'}</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Suggestion submitted!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send suggestion.' });
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
        const response = await fetch(TOKEN_ENDPOINT, {
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
        res.send(`<h1>Authentication Successful!</h1><p>Your Refresh Token:</p><pre>${refresh_token}</pre>`);
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
});