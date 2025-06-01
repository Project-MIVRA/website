// --- Configuration ---
// IMPORTANT: Replace with your desired admin password
const ADMIN_PASSWORD = "secret"; // CHANGE THIS!
const LOCAL_STORAGE_KEY = 'adminUnsavedWishlistItems';

// --- Global State ---
let wishlistItems = []; // In-memory store for wishlist items

// --- Utility Functions ---
/**
 * Displays a message to the user within a designated message box element.
 * @param {string} text - The message to display.
 * @param {'success' | 'error' | 'info'} type - The type of message.
 * @param {HTMLElement|null} [targetElement=document.getElementById('messageBox')] - The message box element.
 * @param {boolean} [isSticky=false] - If true, message stays until manually dismissed or page reload.
 */
function displayMessage(text, type = 'success', targetElement = null, isSticky = false) {
    const messageBox = targetElement || document.getElementById('messageBox');

    if (!messageBox) {
        console.warn("Message box element not found for displaying message:", text);
        // Fallback to a simple console log if no message box is available
        console.log(`Message (${type}): ${text}`);
        return;
    }

    // Clear previous classes and content
    messageBox.innerHTML = '';
    messageBox.className = 'message-box-inline'; // Base class for inline messages

    // Create the message content
    const messageContent = document.createElement('p');
    messageContent.textContent = text;

    // Apply type-specific styling (could be classes if you have them defined in CSS)
    messageBox.classList.add(`message-${type}`);
    
    messageBox.appendChild(messageContent);
    messageBox.style.display = 'block'; // Make it visible

    // Auto-hide if not sticky
    if (!isSticky) {
        setTimeout(() => {
            messageBox.style.display = 'none';
            messageBox.innerHTML = ''; // Clear content
            messageBox.classList.remove(`message-${type}`);
        }, 4000); // Increased timeout for better readability
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
        // Remove existing modal if any to prevent duplicates
        const existingModal = document.getElementById(confirmModalId);
        if (existingModal) existingModal.remove();

        const modalHTML = `
            <div id="${confirmModalId}" style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 100;">
                <div style="background-color: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); width: 100%; max-width: 24rem; font-family: 'Inter', sans-serif;">
                    <p style="color: #374151; font-size: 1.125rem; margin-bottom: 1rem; line-height: 1.5;">${message}</p>
                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                        <button id="confirmCancelBtn" style="padding: 0.5rem 1rem; background-color: #E5E7EB; color: #374151; border-radius: 0.375rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500;">Cancel</button>
                        <button id="confirmOkBtn" style="padding: 0.5rem 1rem; background-color: #EF4444; color: white; border-radius: 0.375rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500;">OK</button>
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

// --- localStorage Functions for Admin ---
function saveAdminChangesToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(wishlistItems));
    } catch (error) {
        console.error("Error saving changes to localStorage:", error);
        displayMessage("Could not save unsaved changes locally. Your browser's storage might be full or disabled.", "error", document.getElementById('adminContent')?.querySelector('.flex-col.sm\\:flex-row'), true);
    }
}

function loadAdminChangesFromLocalStorage() {
    try {
        const savedItems = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedItems) {
            wishlistItems = JSON.parse(savedItems);
            return true; // Indicate that items were loaded
        }
    } catch (error) {
        console.error("Error loading changes from localStorage:", error);
        wishlistItems = []; // Reset if loading fails
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
    }
    return false; // Indicate no items were loaded or an error occurred
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
    const logoutButton = document.getElementById('logoutButton');
    const saveWishlistButton = document.getElementById('saveWishlistButton');
    const adminMessageBox = adminContent ? adminContent.querySelector('#messageBox') : document.getElementById('messageBox'); // Prefer message box within admin content


    if (!passwordModal) return; // Not on the admin page

    // Check if already logged in (using sessionStorage)
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        passwordModal.style.display = 'none';
        adminContent.classList.remove('hidden');
        if (loadAdminChangesFromLocalStorage()) {
            displayMessage("Loaded unsaved changes from your previous session.", "info", adminMessageBox, false);
            renderAdminItems(); // Render items loaded from localStorage
        } else {
            loadWishlistData(true); // Load from wishlist-data.json if no local changes
        }
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
            if (loadAdminChangesFromLocalStorage()) {
                displayMessage("Login successful! Loaded unsaved changes from your previous session.", "success", adminMessageBox, false);
                renderAdminItems();
            } else {
                displayMessage("Login successful!", "success", adminMessageBox, false);
                loadWishlistData(true); 
            }
        } else {
            passwordError.textContent = 'Incorrect password.';
            passwordInput.value = '';
            // Display login error within the password modal itself
            const passwordModalContent = passwordModal.querySelector('.modal-content');
            const modalMessageBox = passwordModalContent.querySelector('#modalMessageBox') || document.createElement('div');
            if (!modalMessageBox.id) {
                 modalMessageBox.id = 'modalMessageBox';
                 modalMessageBox.className = 'message-box-inline mt-3'; // Add some margin
                 passwordModalContent.appendChild(modalMessageBox);
            }
            displayMessage("Login failed: Incorrect password.", "error", modalMessageBox, false);
        }
    });

    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('isAdminAuthenticated');
        // Optionally, ask if user wants to clear unsaved local changes
        // localStorage.removeItem(LOCAL_STORAGE_KEY); 
        passwordModal.style.display = 'flex';
        adminContent.classList.add('hidden');
        wishlistItems = []; 
        if(adminWishlistContainer) adminWishlistContainer.innerHTML = '<p id="adminLoadingMessage" class="text-gray-500 col-span-full">Logged out. Please log in to manage items.</p>';
        displayMessage("Logged out successfully.", "info", adminMessageBox);
    });

    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') {
            displayMessage("Authentication required.", "error", adminMessageBox);
            return;
        }

        const itemName = document.getElementById('itemName').value.trim();
        const itemDescription = document.getElementById('itemDescription').value.trim();
        const itemImage = document.getElementById('itemImage').value.trim();
        const itemPrice = document.getElementById('itemPrice').value.trim();
        const itemLink = document.getElementById('itemLink').value.trim();

        if (!itemName || !itemLink) {
            displayMessage("Item Name and Product Link are required.", "error", addItemForm.querySelector('#messageBox') || adminMessageBox);
            return;
        }

        const newItem = {
            id: generateId(), 
            name: itemName,
            description: itemDescription,
            imageUrl: itemImage,
            price: itemPrice,
            link: itemLink,
            addedAt: new Date().toISOString()
        };
        wishlistItems.unshift(newItem); 
        saveAdminChangesToLocalStorage(); // Save to localStorage
        renderAdminItems();
        addItemForm.reset();
        displayMessage("Item added. Changes saved locally. Remember to 'Save & Download Data' to make them public.", "success", addItemForm.querySelector('#messageBox') || adminMessageBox);
    });

    saveWishlistButton.addEventListener('click', () => {
        if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') {
            displayMessage("Authentication required.", "error", adminMessageBox);
            return;
        }
        const jsonData = JSON.stringify(wishlistItems, null, 2); 
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "wishlist-data.json"; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        displayMessage(`Data prepared for download as wishlist-data.json. Upload it to the main 'wishlist/' directory to make changes public. Your local unsaved changes are still preserved.`, "info", adminMessageBox, true);
        // localStorage.removeItem(LOCAL_STORAGE_KEY); // Optionally clear local storage after download
    });

    function renderAdminItems() { 
        if (!adminWishlistContainer) return;
        const loadingMsg = document.getElementById('adminLoadingMessage'); 
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        adminWishlistContainer.innerHTML = ''; 

        if (wishlistItems.length === 0) {
            adminWishlistContainer.innerHTML = '<p class="text-gray-500 col-span-full">No wishlist items yet. Add some using the form above. Unsaved changes are stored locally.</p>';
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
                if (await showCustomConfirm("Are you sure you want to delete this item? This will remove it from your locally saved changes.")) {
                    wishlistItems = wishlistItems.filter(item => item.id !== itemId);
                    saveAdminChangesToLocalStorage(); // Save to localStorage
                    renderAdminItems();
                    displayMessage("Item removed and local changes saved. 'Save & Download Data' to make public.", "info", adminMessageBox);
                }
            });
        });
    }
    window.renderAdminItems = renderAdminItems; 
}


// --- Public Wishlist Page Specific Logic ---
function initializePublicWishlistPage() {
    const publicWishlistContainer = document.getElementById('publicWishlistContainer');
    const publicLoadingMessage = document.getElementById('publicLoadingMessage'); 

    if (!publicWishlistContainer) return; 

    loadWishlistData(false); 

    function renderPublicItems() {
        if (!publicWishlistContainer) return; 
        if (publicLoadingMessage) publicLoadingMessage.style.display = 'none';
        publicWishlistContainer.innerHTML = ''; 

        if (wishlistItems.length === 0) {
            publicWishlistContainer.innerHTML = '<p id="publicLoadingMessage" style="color: #FFFFFF; text-align: center; font-size: 1.2em; padding: 40px 0; width: 100%;">My wishlist is currently empty. Check back soon!</p>';
            return;
        }
        
        const sortedItems = [...wishlistItems].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

        sortedItems.forEach(item => {
            const itemElement = document.createElement('li');
            itemElement.className = 'wishlist-item'; 

            const placeholderImage = 'https://placehold.co/300x200/EFEFEF/AAAAAA?text=Image+Not+Found';
            const imageSrc = item.imageUrl && item.imageUrl.trim() !== '' ? item.imageUrl : placeholderImage;

            itemElement.innerHTML = `
                <a href="${item.link || '#'}" target="_blank" rel="noopener noreferrer">
                    <img src="${imageSrc}" alt="${item.name || 'Wishlist Item'}" onerror="this.onerror=null;this.src='${placeholderImage}';">
                    <div class="item-info">
                        <div class="item-title">${item.name || 'Untitled Item'}</div>
                        ${item.description ? `<p class="item-description">${item.description}</p>` : '<p class="item-description">No description available.</p>'}
                        ${item.price ? `<p class="item-price">${item.price}</p>` : '<p class="item-price">Price not listed</p>'}
                    </div>
                </a>
            `;
            publicWishlistContainer.appendChild(itemElement);
        });
    }
    window.renderPublicItems = renderPublicItems; 
}

// --- Common Data Loading Function ---
async function loadWishlistData(isAdminPage) {
    const adminMessageBox = document.getElementById('adminContent') ? document.getElementById('adminContent').querySelector('#messageBox') : null;
    const publicMessageBox = document.getElementById('publicWishlistContainer') ? document.getElementById('messageBox') : null; // Assuming #messageBox is global for public page
    
    const loadingMessageElement = isAdminPage 
        ? document.getElementById('adminLoadingMessage') 
        : document.getElementById('publicLoadingMessage'); 

    const dataFilePath = isAdminPage ? "../wishlist-data.json" : "wishlist-data.json";
    const dataFileDisplayName = "wishlist-data.json"; 

    // If on admin page and local storage has items, don't fetch from JSON unless forced (e.g., after clearing local)
    // This check is now primarily handled in initializeAdminPage before calling loadWishlistData.
    // loadWishlistData is now mainly for fetching the public JSON or as a fallback.

    try {
        const response = await fetch(dataFilePath + `?t=${new Date().getTime()}`); 
        if (response.ok) {
            const data = await response.json();
            // Only update wishlistItems if not on admin page OR if admin page has no local changes it's relying on.
            // For admin page, if it reaches here, it means no local changes were loaded, so it's safe to use fetched data.
            wishlistItems = Array.isArray(data) ? data : [];
            const msgBox = isAdminPage ? adminMessageBox : publicMessageBox;
            displayMessage(`Loaded ${wishlistItems.length} items from ${dataFileDisplayName}.`, "success", msgBox, false);
             
        } else if (response.status === 404) {
            // If file not found, and it's the admin page, it will rely on localStorage or start empty.
            // If it's public page, it will show empty.
            wishlistItems = []; 
            const msgBox = isAdminPage ? adminMessageBox : publicMessageBox;
            displayMessage(`${dataFileDisplayName} not found. Starting with an empty wishlist. ${isAdminPage ? 'Admin can add items and "Save & Download Data" to create it.' : ''}`, "info", msgBox, isAdminPage);
            
        } else {
            throw new Error(`HTTP error ${response.status} when fetching ${dataFilePath}`);
        }
    } catch (error) {
        console.error(`Error loading ${dataFileDisplayName} from ${dataFilePath}:`, error);
        wishlistItems = []; 
        const msgBox = isAdminPage ? adminMessageBox : publicMessageBox;
        displayMessage(`Could not load wishlist data. Error: ${error.message}`, "error", msgBox, true);
    } finally {
        // Render based on what's in wishlistItems (either from local, from JSON, or empty)
        if (isAdminPage) {
            if (typeof window.renderAdminItems === 'function') window.renderAdminItems();
        } else {
            if (typeof window.renderPublicItems === 'function') window.renderPublicItems();
        }
    }
}


// --- Page Initialization Router ---
function initializePage() {
    if (document.getElementById('passwordModal') && window.location.pathname.includes('/admin')) { 
        initializeAdminPage();
    } 
    else if (document.getElementById('publicWishlistContainer')) { 
        initializePublicWishlistPage();
    }
}

document.addEventListener('DOMContentLoaded', initializePage);
