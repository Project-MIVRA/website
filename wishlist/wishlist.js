// --- Configuration ---
// IMPORTANT: Replace with your desired admin password
const ADMIN_PASSWORD = "test"; // CHANGE THIS!

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
        // Attempt to create a message box if one doesn't exist (basic fallback)
        // This is a basic fallback and might not look good on all pages.
        const fallbackMessageBox = document.createElement('div');
        fallbackMessageBox.style.position = 'fixed';
        fallbackMessageBox.style.top = '20px';
        fallbackMessageBox.style.right = '20px';
        fallbackMessageBox.style.padding = '12px 20px';
        fallbackMessageBox.style.borderRadius = '8px';
        fallbackMessageBox.style.color = 'white';
        fallbackMessageBox.style.zIndex = '2000'; // High z-index
        fallbackMessageBox.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        fallbackMessageBox.style.fontSize = '0.875rem';
        fallbackMessageBox.style.transform = 'translateX(100%)';


        document.body.appendChild(fallbackMessageBox);
        
        // Apply type styling
        if (type === 'success') fallbackMessageBox.style.backgroundColor = '#28a745';
        else if (type === 'error') fallbackMessageBox.style.backgroundColor = '#dc3545';
        else if (type === 'info') fallbackMessageBox.style.backgroundColor = '#17a2b8';
        else fallbackMessageBox.style.backgroundColor = '#333'; // Default
        
        fallbackMessageBox.textContent = text;
        // Trigger animation
        requestAnimationFrame(() => {
            fallbackMessageBox.style.opacity = '1';
            fallbackMessageBox.style.transform = 'translateX(0)';
        });

        if (!isSticky) {
            setTimeout(() => {
                fallbackMessageBox.style.opacity = '0';
                fallbackMessageBox.style.transform = 'translateX(100%)';
                setTimeout(() => fallbackMessageBox.remove(), 300); // Remove after transition
            }, 3500);
        }
        return; // Exit since we used the fallback
    }
    // If original messageBox exists, use it
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
        // Remove existing modal if any to prevent duplicates
        const existingModal = document.getElementById(confirmModalId);
        if (existingModal) existingModal.remove();

        // Using Tailwind-like classes via inline styles for portability if Tailwind isn't on the page
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


// --- Admin Page Specific Logic ---
function initializeAdminPage() {
    const passwordModal = document.getElementById('passwordModal'); 
    const passwordInput = document.getElementById('passwordInput');
    const loginButton = document.getElementById('loginButton');
    const passwordError = document.getElementById('passwordError');
    const adminContent = document.getElementById('adminContent');
    const addItemForm = document.getElementById('addItemForm');
    const adminWishlistContainer = document.getElementById('adminWishlistContainer');
    // const adminLoadingMessage = document.getElementById('adminLoadingMessage'); // Already handled by loadWishlistData
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

    function renderAdminItems() { // This function renders items for the admin page
        if (!adminWishlistContainer) return;
        const loadingMsg = document.getElementById('adminLoadingMessage'); // This ID is in admin/index.html
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        adminWishlistContainer.innerHTML = ''; // Clear previous items

        if (wishlistItems.length === 0) {
            adminWishlistContainer.innerHTML = '<p class="text-gray-500 col-span-full">No wishlist items yet. Add some using the form above.</p>';
            return;
        }
        
        // Sort by addedAt descending (newest first) before rendering
        const sortedItems = [...wishlistItems].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));


        sortedItems.forEach(item => {
            const itemElement = document.createElement('div');
            // Admin items use Tailwind classes as defined in admin.html context
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

        // Add event listeners to new delete buttons
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
    window.renderAdminItems = renderAdminItems; // Make it accessible for loadWishlistData
}


// --- Public Wishlist Page Specific Logic ---
function initializePublicWishlistPage() {
    const publicWishlistContainer = document.getElementById('publicWishlistContainer');
    const publicLoadingMessage = document.getElementById('publicLoadingMessage'); // This ID is in public index.html

    if (!publicWishlistContainer) return; // Not on the public wishlist page

    loadWishlistData(false); // Load for public display

    function renderPublicItems() {
        if (!publicWishlistContainer) return; // Guard against race conditions or missing element
        if (publicLoadingMessage) publicLoadingMessage.style.display = 'none';
        publicWishlistContainer.innerHTML = ''; // Clear previous items

        if (wishlistItems.length === 0) {
            // Re-insert the loading message if the list is empty, styled as per the original HTML
            publicWishlistContainer.innerHTML = '<p id="publicLoadingMessage" style="color: #FFFFFF; text-align: center; font-size: 1.2em; padding: 40px 0; width: 100%;">My wishlist is currently empty. Check back soon!</p>';
            return;
        }
        
        // Sort by addedAt descending (newest first) before rendering
        const sortedItems = [...wishlistItems].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

        sortedItems.forEach(item => {
            const itemElement = document.createElement('li');
            itemElement.className = 'wishlist-item'; // Matches user's CSS from public index.html

            const placeholderImage = 'https://placehold.co/300x200/EFEFEF/AAAAAA?text=Image+Not+Found';
            // Use item.imageUrl if available, otherwise use the placeholder.
            // The onerror in the img tag will also catch broken item.imageUrl links.
            const imageSrc = item.imageUrl && item.imageUrl.trim() !== '' ? item.imageUrl : placeholderImage;

            // Constructing innerHTML to match the user's provided structure for public items
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
    window.renderPublicItems = renderPublicItems; // Make it accessible for loadWishlistData
}

// --- Common Data Loading Function ---
async function loadWishlistData(isAdminPage) {
    const loadingMessageElement = isAdminPage 
        ? document.getElementById('adminLoadingMessage') // In wishlist/admin/index.html
        : document.getElementById('publicLoadingMessage'); // In wishlist/index.html

    // Determine the correct path to wishlist-data.json
    // The data file is always in the main 'wishlist/' directory.
    const dataFilePath = isAdminPage ? "../wishlist-data.json" : "wishlist-data.json";
    const dataFileDisplayName = "wishlist-data.json"; // For messages, always refer to the actual filename

    try {
        const response = await fetch(dataFilePath + `?t=${new Date().getTime()}`); // Cache buster
        if (response.ok) {
            const data = await response.json();
            wishlistItems = Array.isArray(data) ? data : [];
             // Ensure loadingMessageElement's parent exists before trying to show message there
             if (loadingMessageElement && loadingMessageElement.parentElement) {
                displayMessage(`Loaded ${wishlistItems.length} items from ${dataFileDisplayName}.`, "success", loadingMessageElement.parentElement, false);
             } else if (isAdminPage && document.getElementById('adminContent')) { // Fallback for admin page
                displayMessage(`Loaded ${wishlistItems.length} items from ${dataFileDisplayName}.`, "success", document.getElementById('adminContent').querySelector('.flex-col.sm\\:flex-row'), false);
             } else { // General fallback
                displayMessage(`Loaded ${wishlistItems.length} items from ${dataFileDisplayName}.`, "success", null, false);
             }
        } else if (response.status === 404) {
            wishlistItems = []; 
            if (loadingMessageElement && loadingMessageElement.parentElement) {
                displayMessage(`${dataFileDisplayName} not found at ${dataFilePath}. Starting with an empty wishlist. Admin can save data to create it.`, "info", loadingMessageElement.parentElement, isAdminPage);
            } else if (isAdminPage && document.getElementById('adminContent')) {
                displayMessage(`${dataFileDisplayName} not found at ${dataFilePath}. Starting with an empty wishlist. Admin can save data to create it.`, "info", document.getElementById('adminContent').querySelector('.flex-col.sm\\:flex-row'), isAdminPage);
            } else {
                 displayMessage(`${dataFileDisplayName} not found at ${dataFilePath}. Starting with an empty wishlist. Admin can save data to create it.`, "info", null, isAdminPage);
            }
        } else {
            throw new Error(`HTTP error ${response.status} when fetching ${dataFilePath}`);
        }
    } catch (error) {
        console.error(`Error loading ${dataFileDisplayName} from ${dataFilePath}:`, error);
        wishlistItems = []; 
        if (loadingMessageElement && loadingMessageElement.parentElement) {
            displayMessage(`Could not load wishlist data from ${dataFileDisplayName}. Error: ${error.message}`, "error", loadingMessageElement.parentElement, true);
        } else if (isAdminPage && document.getElementById('adminContent')) {
            displayMessage(`Could not load wishlist data from ${dataFileDisplayName}. Error: ${error.message}`, "error", document.getElementById('adminContent').querySelector('.flex-col.sm\\:flex-row'), true);
        } else {
            displayMessage(`Could not load wishlist data from ${dataFileDisplayName}. Error: ${error.message}`, "error", null, true);
        }
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

// Run initialization logic when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializePage);
