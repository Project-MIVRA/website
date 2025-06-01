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
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is invalid JSON, return an empty array
        if (error.code === 'ENOENT') {
            console.log('wishlist-data.json not found. Starting with an empty list.');
            return []; // Return empty array if file doesn't exist
        }
        console.error('Error reading wishlist data file:', error);
        return []; // Return empty array on other errors to prevent crashes
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
    // Check if wishlist-data.json exists, create if not
    readWishlistData().then(items => {
        if (items.length === 0) { // Or if it was just created empty
            // This ensures the file exists for subsequent writes
            return writeWishlistData([]);
        }
    }).catch(err => {
        console.error("Initial check/create of wishlist-data.json failed:", err);
    });
});
