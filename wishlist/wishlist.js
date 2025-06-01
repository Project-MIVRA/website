// --- Configuration ---
// IMPORTANT: Replace with your desired admin password
const ADMIN_PASSWORD = "YOUR_CHOSEN_ADMIN_PASSWORD"; // CHANGE THIS!
// WISHLIST_DATA_FILE is now determined dynamically based on page location

// --- Global State ---
let wishlistItems = []; // In-memory store for wishlist items

// --- Utility Functions ---
/**
 * Displays a temporary message to the user.
 * @param {string} text - The message to display.
 * @param {'success' | 'error' | 'info'} type - The type of message.
 * @param {HTMLElement|null} [container=document.getElementById('messageBox')] - The message box element.
 * @param {boolean} [isSticky=false] - If true, message stays until manually dismissed or page reload.
 */
function displayMessage(text, type = 'success', container = null, isSticky = false) {
    const messageBox = container || document.getElementById('messageBox');
    if (!messageBox) {
        console.warn("Message box element not found for:", text);
        return;
    }
    messageBox.textContent = text;
    messageBox.className = `message-box ${type} show`; // Add 'show' class

    if (!isSticky) {
        setTimeout(() => {
            messageBox.classList.remove('show');
        }, 3500);
    }
}

/**
 * Generates a unique ID for new items (simple version).
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// --- Custom Confirm Dialog (replaces window.confirm) ---
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const confirmModalId = 'customConfirmModal';
        const existingModal = document.getElementById(confirmModalId);
        if (existingModal) existingModal.remove();

        const modalHTML = `
            <div id="${confirmModalId}" class="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[100]">
                <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                    <p class="text-gray-700 text-lg mb-4">${message}</p>
                    <div class="flex justify-end space-x-3">
                        <button id="confirmCancelBtn" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Cancel</button>
                        <button id="confirmOkBtn" class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modalElement = document.getElementById(confirmModalId);
        const okButton = document.getElementById('confirmOkBtn');
        const cancelButton = document.getElementById('confirmCancelBtn');

        okButton.onclick = () => {
            modalElement.remove();
            resolve(true);
        };
        cancelButton.onclick = () => {
            modalElement.remove();
            resolve(false);
        };
    });
}


// --- Admin Page Specific Logic ---
function initializeAdminPage() {
    const passwordModal = document.getElementById('passwordModal');
    const passwordInput = document.getElementById('passwordInput');
    const loginButton = document.getElementById('loginButton');
    const passwordError = document.getElementById('passwordError');
    const adminContent = document.getElementById('adminContent');
    const addItemForm = document.getElementById('addItemForm');
    const adminWishlistContainer = document.getElementById('adminWishlistContainer');
    const adminLoadingMessage = document.getElementById('adminLoadingMessage'); // Keep for consistency
    const logoutButton = document.getElementById('logoutButton');
    const saveWishlistButton = document.getElementById('saveWishlistButton');

    if (!passwordModal) return; // Not on the admin page

    // Check if already logged in (using sessionStorage)
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        passwordModal.style.display = 'none';
        adminContent.classList.remove('hidden');
        loadWishlistData(true); // Load for admin
    } else {
        passwordModal.style.display = 'flex';
        adminContent.classList.add('hidden');
    }

    loginButton.addEventListener('click', () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            passwordModal.style.display = 'none';
            adminContent.classList.remove('hidden');
            passwordError.textContent = '';
            loadWishlistData(true); // Load for admin
            displayMessage("Login successful!", "success", adminContent.querySelector('.flex-col.sm\\:flex-row'));
        } else {
            passwordError.textContent = 'Incorrect password.';
            passwordInput.value = '';
            displayMessage("Login failed: Incorrect password.", "error", passwordModal.querySelector('.modal-content'));
        }
    });

    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('isAdminAuthenticated');
        passwordModal.style.display = 'flex';
        adminContent.classList.add('hidden');
        wishlistItems = []; // Clear in-memory data on logout
        if(adminWishlistContainer) adminWishlistContainer.innerHTML = '<p id="adminLoadingMessage" class="text-gray-500 col-span-full">Logged out. Please log in to manage items.</p>';
        displayMessage("Logged out successfully.", "info");
    });

    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') {
            displayMessage("Authentication required.", "error", addItemForm);
            return;
        }

        const itemName = document.getElementById('itemName').value.trim();
        const itemDescription = document.getElementById('itemDescription').value.trim();
        const itemImage = document.getElementById('itemImage').value.trim();
        const itemPrice = document.getElementById('itemPrice').value.trim();
        const itemLink = document.getElementById('itemLink').value.trim();

        if (!itemName || !itemLink) {
            displayMessage("Item Name and Product Link are required.", "error", addItemForm);
            return;
        }

        const newItem = {
            id: generateId(), // Simple unique ID
            name: itemName,
            description: itemDescription,
            imageUrl: itemImage,
            price: itemPrice,
            link: itemLink,
            addedAt: new Date().toISOString()
        };
        wishlistItems.unshift(newItem); // Add to the beginning of the array
        renderAdminItems();
        addItemForm.reset();
        displayMessage("Item added to current session. Remember to Save & Download.", "success", addItemForm);
    });

    saveWishlistButton.addEventListener('click', () => {
        if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') {
            displayMessage("Authentication required.", "error", adminContent.querySelector('.flex-col.sm\\:flex-row'));
            return;
        }
        const jsonData = JSON.stringify(wishlistItems, null, 2); // Pretty print JSON
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "wishlist-data.json"; // The file should always be named this
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        displayMessage(`Data prepared for download as wishlist-data.json. Upload it to the main 'wishlist/' directory.`, "info", adminContent.querySelector('.flex-col.sm\\:flex-row'), true);
    });

    function renderAdminItems() {
        if (!adminWishlistContainer) return;
        const loadingMsg = document.getElementById('adminLoadingMessage'); // This ID is in admin/index.html
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        adminWishlistContainer.innerHTML = ''; // Clear previous items

        if (wishlistItems.length === 0) {
            adminWishlistContainer.innerHTML = '<p class="text-gray-500 col-span-full">No wishlist items yet. Add some using the form above.</p>';
            return;
        }
        
        const sortedItems = [...wishlistItems].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

        sortedItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col justify-between';
            itemElement.innerHTML = `
                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" class="w-full h-40 object-cover rounded-md mb-3" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"> <div class="w-full h-40 bg-gray-200 flex items-center justify-center rounded-md mb-3 text-gray-400" style="display:none;">No Image</div>` : '<div class="w-full h-40 bg-gray-200 flex items-center justify-center rounded-md mb-3 text-gray-400">No Image</div>'}
                <h3 class="text-lg font-semibold text-gray-700 mb-1 truncate" title="${item.name}">${item.name}</h3>
                <p class="text-sm text-gray-500 mb-1 truncate" title="${item.description || ''}">${item.description || 'No description'}</p>
                <p class="text-md font-medium text-indigo-600 mb-3">${item.price || 'Price not set'}</p>
                <div class="mt-auto">
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="inline-block text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md mr-2 transition duration-150">View</a>
                    <button data-id="${item.id}" class="delete-item-btn text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md transition duration-150">Delete</button>
                </div>
            `;
            adminWishlistContainer.appendChild(itemElement);
        });

        document.querySelectorAll('.delete-item-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const itemId = e.target.dataset.id;
                if (await showCustomConfirm("Are you sure you want to delete this item from the current session? This won't be final until you Save & Download.")) {
                    wishlistItems = wishlistItems.filter(item => item.id !== itemId);
                    renderAdminItems();
                    displayMessage("Item removed from current session. Save & Download to make changes permanent.", "info", adminContent.querySelector('.flex-col.sm\\:flex-row'));
                }
            });
        });
    }
    window.renderAdminItems = renderAdminItems; 
}


// --- Public Wishlist Page Specific Logic ---
function initializePublicWishlistPage() {
    const publicWishlistContainer = document.getElementById('publicWishlistContainer');
    const publicLoadingMessage = document.getElementById('publicLoadingMessage'); // This ID is in public index.html

    if (!publicWishlistContainer) return; 

    loadWishlistData(false); 

    function renderPublicItems() {
        if (publicLoadingMessage) publicLoadingMessage.style.display = 'none';
        publicWishlistContainer.innerHTML = ''; 

        if (wishlistItems.length === 0) {
            publicWishlistContainer.innerHTML = '<p class="text-gray-500 col-span-full text-center py-10 text-xl">My wishlist is currently empty. Check back soon!</p>';
            return;
        }
        
        const sortedItems = [...wishlistItems].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

        sortedItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'wishlist-item bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl';
            const placeholderImageDiv = `<div class="w-full pt-[56.25%] bg-gray-200 flex items-center justify-center text-gray-400 relative"><span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">No Image Available</span></div>`;
            const imageHTML = item.imageUrl ?
                `<img src="${item.imageUrl}" alt="${item.name}" class="w-full h-48 sm:h-56 object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='${placeholderImageDiv.replace(/"/g, "&quot;")}';">`
                : placeholderImageDiv;

            itemElement.innerHTML = `
                <div class="relative">
                    ${imageHTML}
                </div>
                <div class="p-5 sm:p-6 flex flex-col flex-grow">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2 truncate" title="${item.name}">${item.name}</h3>
                    <p class="text-sm text-gray-600 mb-3 flex-grow min-h-[40px]">${item.description || 'No description provided.'}</p>
                    <p class="text-2xl font-bold text-indigo-600 mb-4">${item.price || 'Price not listed'}</p>
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="mt-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg text-center transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50">
                        View Product
                    </a>
                </div>
            `;
            publicWishlistContainer.appendChild(itemElement);
        });
    }
    window.renderPublicItems = renderPublicItems; 
}

// --- Common Data Loading Function ---
async function loadWishlistData(isAdminPage) {
    const loadingMessageElement = isAdminPage 
        ? document.getElementById('adminLoadingMessage') // In wishlist/admin/index.html
        : document.getElementById('publicLoadingMessage'); // In wishlist/index.html

    // Determine the correct path to wishlist-data.json
    // The data file is always in the main 'wishlist/' directory.
    // If isAdminPage is true, current HTML is wishlist/admin/index.html, so path is '../wishlist-data.json'
    // If isAdminPage is false, current HTML is wishlist/index.html, so path is 'wishlist-data.json'
    const dataFilePath = isAdminPage ? "../wishlist-data.json" : "wishlist-data.json";
    const dataFileDisplayName = "wishlist-data.json"; // For messages, always refer to the actual filename

    try {
        const response = await fetch(dataFilePath + `?t=${new Date().getTime()}`); // Cache buster
        if (response.ok) {
            const data = await response.json();
            wishlistItems = Array.isArray(data) ? data : [];
             if (loadingMessageElement) displayMessage(`Loaded ${wishlistItems.length} items from ${dataFileDisplayName}.`, "success", loadingMessageElement.parentElement, false);
        } else if (response.status === 404) {
            wishlistItems = []; 
            if (loadingMessageElement) displayMessage(`${dataFileDisplayName} not found at ${dataFilePath}. Starting with an empty wishlist. Admin can save data to create it.`, "info", loadingMessageElement.parentElement, isAdminPage);
        } else {
            throw new Error(`HTTP error ${response.status} when fetching ${dataFilePath}`);
        }
    } catch (error) {
        console.error(`Error loading ${dataFileDisplayName} from ${dataFilePath}:`, error);
        wishlistItems = []; 
        if (loadingMessageElement) displayMessage(`Could not load wishlist data from ${dataFileDisplayName}. Error: ${error.message}`, "error", loadingMessageElement.parentElement, true);
    } finally {
        if (isAdminPage) {
            if (typeof window.renderAdminItems === 'function') window.renderAdminItems();
        } else {
            if (typeof window.renderPublicItems === 'function') window.renderPublicItems();
        }
    }
}


// --- Page Initialization Router ---
function initializePage() {
    // Check for an element unique to the admin page (e.g., passwordModal)
    // The admin page is now at /wishlist/admin/ or /wishlist/admin/index.html
    if (document.getElementById('passwordModal') && window.location.pathname.includes('/admin')) { 
        initializeAdminPage();
    } 
    // Check for an element unique to the public wishlist page
    // The public page is at /wishlist/ or /wishlist/index.html
    else if (document.getElementById('publicWishlistContainer')) { 
        initializePublicWishlistPage();
    }
}

document.addEventListener('DOMContentLoaded', initializePage);
