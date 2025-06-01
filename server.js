// server.js

// --- Dependencies ---
const express = require('express');
const fs = require('fs').promises; // Using promises for cleaner async file operations
const path = require('path');
const crypto = require('crypto'); // For generating unique IDs

// --- Configuration ---
const PORT = process.env.PORT || 3000; // Port to run the server on
const DATA_FILE_PATH = path.join(__dirname, 'wishlist', 'wishlist-data.json'); // Path to your data file
// Ensure the 'wishlist' directory exists at the same level as this server.js file.
// The wishlist-data.json will be inside the 'wishlist' directory.

const app = express();

// --- Middleware ---
app.use(express.json()); // Middleware to parse JSON request bodies

// Middleware to serve static files (HTML, CSS, client-side JS)
// This assumes your server.js is in the root of your project,
// and your website files (including the 'wishlist' folder) are also in the root.
app.use(express.static(path.join(__dirname))); // Serves files from the root directory
app.use('/wishlist', express.static(path.join(__dirname, 'wishlist'))); // Specifically serve /wishlist path

// --- Helper Functions ---

/**
 * Reads wishlist items from the JSON data file.
 * @returns {Promise<Array>} A promise that resolves to an array of wishlist items.
 */
async function readWishlistData() {
    try {
        // Check if the file exists
        await fs.access(DATA_FILE_PATH);
        const data = await fs.readFile(DATA_FILE_PATH, 'utf8');
        // If the file is empty or contains only whitespace, treat it as an empty list
        if (data.trim() === '') {
            console.log('wishlist-data.json is empty. Starting with an empty list.');
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return an empty array
        if (error.code === 'ENOENT') {
            console.log('wishlist-data.json not found. Starting with an empty list.');
            return []; 
        }
        // For other errors (like malformed JSON that isn't just an empty string), log and return empty.
        console.error('Error reading wishlist data file:', error);
        return []; 
    }
}

/**
 * Writes wishlist items to the JSON data file.
 * @param {Array} items - The array of wishlist items to write.
 * @returns {Promise<void>}
 */
async function writeWishlistData(items) {
    try {
        // Ensure the directory exists
        await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing wishlist data file:', error);
        throw new Error('Failed to save wishlist data.'); // Propagate error
    }
}

/**
 * Generates a unique ID.
 * @returns {string} A unique ID.
 */
function generateUniqueId() {
    return crypto.randomBytes(16).toString('hex');
}

// --- API Endpoints ---

// GET /api/wishlist - Get all wishlist items
app.get('/api/wishlist', async (req, res) => {
    try {
        const items = await readWishlistData();
        // Sort items by addedAt (descending) before sending, if addedAt exists
        items.sort((a, b) => {
            const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
            const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
            return timeB - timeA;
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wishlist items.', error: error.message });
    }
});

// POST /api/wishlist - Add a new wishlist item
app.post('/api/wishlist', async (req, res) => {
    try {
        const items = await readWishlistData();
        const newItem = {
            id: generateUniqueId(), // Generate a unique ID on the server
            name: req.body.name,
            description: req.body.description || '',
            imageUrl: req.body.imageUrl || '',
            price: req.body.price || '',
            link: req.body.link,
            addedAt: new Date().toISOString() // Add a timestamp on the server
        };

        if (!newItem.name || !newItem.link) {
            return res.status(400).json({ message: 'Item name and link are required.' });
        }

        items.unshift(newItem); // Add to the beginning of the array (newest first)
        await writeWishlistData(items);
        res.status(201).json(newItem); // Respond with the created item
    } catch (error) {
        res.status(500).json({ message: 'Error adding wishlist item.', error: error.message });
    }
});

// DELETE /api/wishlist/:id - Delete a wishlist item by ID
app.delete('/api/wishlist/:id', async (req, res) => {
    try {
        const itemIdToDelete = req.params.id;
        let items = await readWishlistData();
        const initialLength = items.length;
        items = items.filter(item => item.id !== itemIdToDelete);

        if (items.length === initialLength) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        await writeWishlistData(items);
        res.status(200).json({ message: 'Item deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting wishlist item.', error: error.message });
    }
});


// --- Serve HTML Pages ---
// Serve the public wishlist page
app.get('/wishlist/', (req, res) => {
    res.sendFile(path.join(__dirname, 'wishlist', 'index.html'));
});

// Serve the admin page
app.get('/wishlist/admin/', (req, res) => {
    res.sendFile(path.join(__dirname, 'wishlist', 'admin', 'index.html'));
});

// Fallback for other routes under /wishlist (e.g. /wishlist/wishlist.js)
// will be handled by the static middleware if the file exists.

// Basic root route
app.get('/', (req, res) => {
    // You might want to redirect to /wishlist/ or serve your main website's index.html
    res.send('Welcome to the Wishlist App Backend! Visit /wishlist to see the wishlist.');
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Check if wishlist-data.json exists and is valid, create/initialize if not
    readWishlistData().then(async items => { // Made this callback async
        // If readWishlistData returned [] because file was non-existent, empty or malformed,
        // we ensure it's initialized with a valid empty JSON array.
        const fileExists = await fs.access(DATA_FILE_PATH).then(() => true).catch(() => false);
        let needsInitialization = !fileExists;
        if (fileExists) {
            const currentData = await fs.readFile(DATA_FILE_PATH, 'utf8');
            if (currentData.trim() === '') { // Also initialize if it exists but is empty
                needsInitialization = true;
            }
        }

        if (needsInitialization) {
            console.log('Initializing wishlist-data.json with an empty array.');
            return writeWishlistData([]);
        }
    }).catch(err => {
        // This catch is for errors during the fs.access or fs.readFile in the .then block,
        // or if writeWishlistData itself throws an unhandled error.
        console.error("Error during initial check/creation of wishlist-data.json:", err);
    });
});
