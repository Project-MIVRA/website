// server.js

// --- Dependencies ---
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const fetch = require('node-fetch');
const multer = require('multer');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

// Directory where uploaded temp files are stored
const UPLOADS_DIR = path.join(__dirname, 'uploads');

/**
 * Safely delete a temporary upload file, ensuring the path stays within UPLOADS_DIR.
 */
async function safeUnlinkTemp(tempPath) {
    if (!tempPath) return;

    try {
        const resolvedTemp = path.resolve(tempPath);
        let realTemp;
        try {
            realTemp = await fs.realpath(resolvedTemp);
        } catch (e) {
            realTemp = resolvedTemp;
        }

        const normalizedUploadsDir = path.resolve(UPLOADS_DIR) + path.sep;
        if (realTemp === path.resolve(UPLOADS_DIR) || realTemp.startsWith(normalizedUploadsDir)) {
            try {
                await fs.unlink(realTemp);
            } catch (e) {
            }
        }
    } catch (e) {
    }
}
// Simple HTML escaping to prevent HTML injection in generated content (e.g., emails)
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const DATA_FILE_PATH = path.join(__dirname, 'wishlist', 'wishlist-data.json');
const ART_DATA_FILE_PATH = path.join(__dirname, 'art', 'art-data.json');
const GIFS_DIR = path.join(__dirname, 'gifs');
const ART_DIR = path.join(__dirname, 'art');
const TEMP_DIR = path.join(__dirname, 'temp_uploads');

(async () => {
    try {
        await fs.mkdir(GIFS_DIR, { recursive: true });
        await fs.mkdir(ART_DIR, { recursive: true });
        await fs.mkdir(TEMP_DIR, { recursive: true });
    } catch (e) { console.error("Error creating directories", e); }
})();

// Environment
const { 
    BASE_URL, STEAM_API_KEY, STEAM_USER_ID,
    SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN,
    GIF_UPLOAD_PASSWORD
} = process.env;

// Spotify Credentials
const SPOTIFY_REDIRECT_URI = `${BASE_URL}/auth/callback`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const DEVICES_ENDPOINT = `https://api.spotify.com/v1/me/player/devices`;

// Steam Endpoints
const STEAM_RECENTLY_PLAYED_ENDPOINT = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/`;
const STEAM_PLAYER_SUMMARY_ENDPOINT = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/`;

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

const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true, 
    legacyHeaders: false, 
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    message: { message: 'Upload limit reached. Please try again later.' }
});

const suggestionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: 'Too many suggestions submitted. Please try again later.' }
});

app.use('/api', apiLimiter);

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/wishlist', express.static(path.join(__dirname, 'wishlist')));
app.use('/art', express.static(path.join(__dirname, 'art'))); // Serve art folder

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

async function readArtData() {
    try {
        await fs.access(ART_DATA_FILE_PATH);
        const data = await fs.readFile(ART_DATA_FILE_PATH, 'utf8');
        try {
            return JSON.parse(data);
        } catch (parseError) {
            console.error('Error parsing art data file (invalid JSON):', parseError);
            return {};
        }
    } catch (error) {
        if (error.code === 'ENOENT') return {}; // Return empty object if no data yet
        console.error('Error reading art data file:', error);
        return {};
    }
}

async function writeArtData(data) {
    try {
        await fs.mkdir(path.dirname(ART_DATA_FILE_PATH), { recursive: true });
        await fs.writeFile(ART_DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing art data file:', error);
        throw new Error('Failed to save art data.');
    }
}

function generateUniqueId() {
    return crypto.randomBytes(16).toString('hex');
}

const getSpotifyAccessToken = async () => {
    // Note: Updated URLs to actual Spotify endpoints in constants above
    try {
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

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error('Failed to parse Spotify token response as JSON:', parseError);
            throw new Error('Failed to parse Spotify token response.');
        }

        if (!response.ok) {
            console.error('Spotify token request failed:', {
                status: response.status,
                statusText: response.statusText,
                body: data
            });
            throw new Error(`Spotify token request failed with status ${response.status}`);
        }

        if (!data || typeof data.access_token !== 'string' || data.access_token.length === 0) {
            console.error('Spotify token response missing access_token field:', data);
            throw new Error('Spotify token response did not contain an access token.');
        }

        return data.access_token;
    } catch (error) {
        // Log and rethrow to ensure callers are aware of token retrieval failures
        console.error('Error while retrieving Spotify access token:', error);
        throw error;
    }
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
app.post('/api/gifs', uploadLimiter, upload.single('file'), async (req, res) => {
    const tempPath = req.file ? req.file.path : null;
    
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
        
        const { password, filename } = req.body;

        if (password !== GIF_UPLOAD_PASSWORD) {
            await safeUnlinkTemp(tempPath);
            return res.status(403).json({ message: 'Invalid upload code.' });
        }

        // Derive a safe base name from user input or original filename
        const rawName = filename && typeof filename === 'string'
            ? filename.trim()
            : req.file.originalname.replace(/\.[^/.]+$/, "");

        // Allow only letters, digits, dash and underscore in the base name
        let safeBaseName = rawName.replace(/[^a-zA-Z0-9_-]/g, "");

        // Reject if the resulting name is empty or unreasonably long
        if (!safeBaseName || safeBaseName.length === 0 || safeBaseName.length > 100) {
            await safeUnlinkTemp(tempPath);
            return res.status(400).json({ message: "Invalid filename." });
        }

        const finalName = safeBaseName.toLowerCase().endsWith('.gif')
            ? safeBaseName
            : safeBaseName + '.gif';

        const finalPath = path.join(GIFS_DIR, finalName);

        try {
            await fs.access(finalPath);
            await safeUnlinkTemp(tempPath);
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
            await safeUnlinkTemp(tempPath);
            return res.status(400).json({ message: 'Unsupported file type. Use Image or Video.' });
        }

        await safeUnlinkTemp(tempPath);
        
        res.json({ message: 'File uploaded and converted successfully!', filename: finalName });

    } catch (error) {
        console.error("Upload error:", error);
        await safeUnlinkTemp(tempPath);
        res.status(500).json({ message: 'Server error during processing.' });
    }
});

// --- ART OF THE MONTH API ---

// Helper to ensure temporary upload paths stay within the art directory
function getSafeTempPath(tempPath) {
    if (!tempPath) return null;
    // Only operate on the basename to avoid any directory traversal
    const fileName = path.basename(tempPath);
    const resolved = path.resolve(ART_DIR, fileName);
    const base = path.resolve(ART_DIR);
    const relative = path.relative(base, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        return null;
    }
    return resolved;
}

/**
 * Sanitize generic text input for art metadata.
 * - Coerces to string
 * - Trims whitespace
 * - Truncates to a maximum length
 * - Escapes HTML to avoid injection when rendered
 */
function sanitizeArtField(value, maxLength) {
    if (!value) return undefined;
    let str = String(value).trim();
    if (!str) return undefined;
    if (typeof maxLength === 'number' && maxLength > 0 && str.length > maxLength) {
        str = str.slice(0, maxLength);
    }
    // escapeHtml is defined elsewhere in this file and used for email content.
    return escapeHtml(str);
}

/**
 * Sanitize artist link:
 * - Validates URL
 * - Allows only http/https
 * - Applies generic field sanitization and length limits
 */
function sanitizeArtLink(value, maxLength) {
    const sanitized = sanitizeArtField(value, maxLength);
    if (!sanitized) return undefined;
    try {
        const url = new URL(sanitized);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return undefined;
        }
        return url.toString();
    } catch (e) {
        // Invalid URL; drop it rather than storing unsafe content
        return undefined;
    }
}

// GET /api/art - Get current art info
app.get('/api/art', async (req, res) => {
    try {
        const artData = await readArtData();
        res.json(artData);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch art data." });
    }
});

// POST /api/art - Update art of the month (Upload image or set link)
app.post('/api/art', uploadLimiter, upload.single('image'), async (req, res) => {
    const safeTempPath = req.file ? getSafeTempPath(req.file.path) : null;

    try {
        const { password, artistName, artistLink, description, imageUrl } = req.body;

        if (password !== GIF_UPLOAD_PASSWORD) { // Reuse existing password for simplicity
            if (safeTempPath) await fs.unlink(safeTempPath);
            return res.status(403).json({ message: 'Invalid upload code.' });
        }

        let currentData = await readArtData();
        let newImageUrl = imageUrl || currentData.imageUrl;

        // Sanitize text fields before storing or rendering
        const cleanArtistName = sanitizeArtField(artistName, 100);
        const cleanDescription = sanitizeArtField(description, 1000);
        const cleanArtistLink = sanitizeArtLink(artistLink, 300);

        // If a new file is uploaded, process it
        if (req.file && safeTempPath) {
            const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
            const filename = `art_month_${Date.now()}${ext}`;
            const finalPath = path.join(ART_DIR, filename);

            // Move file to art directory
            await fs.rename(safeTempPath, finalPath);
            newImageUrl = `/art/${filename}`;
        } else if (safeTempPath) {
             await fs.unlink(safeTempPath); // Clean up if file existed but not used (edge case)
        }

        const updatedData = {
            imageUrl: newImageUrl,
            artistName: cleanArtistName || currentData.artistName,
            artistLink: cleanArtistLink || currentData.artistLink,
            description: cleanDescription || currentData.description
        };

        await writeArtData(updatedData);
        res.json({ message: 'Art of the month updated successfully!', data: updatedData });

    } catch (error) {
        console.error("Art upload error:", error);
        if (safeTempPath) {
            try { await fs.unlink(safeTempPath); } catch (e) {}
        }
        res.status(500).json({ message: 'Server error updating art.' });
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
        const newItem = {
            id: generateUniqueId(),
            name,
            description: description || '',
            price: price || '',
            link: link || '',
            imageUrl: imageUrl || '',
            purchased: false,
            addedAt: new Date().toISOString(),
        };
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

    const controller = new AbortController();
    const options = { hostname: printer.ip, path: printer.camPath, method: 'GET', signal: controller.signal };
    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
        console.error(`Camera proxy error ${printer.id}:`, e);
        if (!res.headersSent) res.status(500).send('Error proxying stream');
    });
    req.on('close', () => controller.abort());
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
app.post('/api/suggestions', suggestionLimiter, async (req, res) => {
    const { suggestion, name, contact } = req.body;
    if (!suggestion) return res.status(400).json({ message: 'Suggestion text is required.' });

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const safeSuggestionHtml = escapeHtml(suggestion);
    const safeNameHtml = name ? escapeHtml(name) : 'Anonymous';
    const safeContactHtml = contact ? escapeHtml(contact) : 'Not provided';

    const mailOptions = {
        from: '"Suggestion Box" <responses@mivra.net>',
        to: 'mini@mivra.net',
        subject: 'New Suggestion Received!',
        text: `Suggestion:\n\n${suggestion}\n\nFrom: ${name || 'Anonymous'}\nContact: ${contact || 'Not provided'}`,
        html: `<p>New suggestion:</p>
               <blockquote style="border-left: 2px solid #ccc; padding-left: 1em;">${safeSuggestionHtml.replace(/\n/g, '<br>')}</blockquote>
               <p><strong>From:</strong> ${safeNameHtml}</p>
               <p><strong>Contact:</strong> ${safeContactHtml}</p>`,
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
        const { refresh_token } = data;
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