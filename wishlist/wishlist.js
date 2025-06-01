// --- Configuration ---
// IMPORTANT: Replace with your desired admin password (for client-side UI gating)
const ADMIN_PASSWORD = "YOUR_CHOSEN_ADMIN_PASSWORD"; // CHANGE THIS!
const API_BASE_URL = "/api/wishlist"; // Base URL for your local backend API

// --- Global State ---
let wishlistItems = []; // In-memory store, will be populated from the backend

// --- Utility Functions ---
function displayMessage(text, type = 'success', targetElement = null, isSticky = false) {
    const messageBox = targetElement || document.getElementById('messageBox');

    if (!messageBox) {
        console.warn("Message box element not found for displaying message:", text);
        console.log(`Message (${type}): ${text}`);
        return;
    }
    messageBox.innerHTML = '';
    // Base classes for the message box itself, assuming Tailwind is used or these are defined
    messageBox.className = 'message-box-inline p-3 rounded-md text-sm shadow'; 
    
    // Type-specific classes for background, border, and text color
    if (type === 'success') {
        messageBox.classList.add('bg-green-100', 'border', 'border-green-400', 'text-green-700');
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-100', 'border', 'border-red-400', 'text-red-700');
    } else if (type === 'info') {
        messageBox.classList.add('bg-blue-100', 'border', 'border-blue-400', 'text-blue-700');
    } else { // Default styling if type is not matched
        messageBox.classList.add('bg-gray-100', 'border', 'border-gray-400', 'text-gray-700');
    }
    
    const messageContent = document.createElement('p');
    messageContent.textContent = text;
    messageBox.appendChild(messageContent);
    messageBox.style.display = 'block'; // Make it visible

    // Auto-hide if not sticky
    if (!isSticky) {
        setTimeout(() => {
            messageBox.style.display = 'none';
            messageBox.innerHTML = ''; // Clear content after hiding
        }, 4000); // Timeout for message visibility
    }
}

function generateId() {
    // This function is less critical if the backend assigns IDs.
    // It can be used for client-side temporary IDs if needed, but persistent IDs should come from the backend.
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const confirmModalId = 'customConfirmModal';
        // Remove existing modal if any to prevent duplicates
        const existingModal = document.getElementById(confirmModalId);
        if (existingModal) existingModal.remove();

        // Modal HTML structure with inline styles for broad compatibility
        const modalHTML = `
            <div id="${confirmModalId}" style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 100; font-family: 'Inter', sans-serif;">
                <div style="background-color: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); width: 100%; max-width: 24rem;">
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

        // Event listeners for modal buttons
        okButton.onclick = () => { modalElement.remove(); resolve(true); };
        cancelButton.onclick = () => { modalElement.remove(); resolve(false); };
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
    const logoutButton = document.getElementById('logoutButton');
    // The "Save & Download Data" button should be removed from admin.html as data is now saved via backend.
    const adminMessageBox = adminContent ? adminContent.querySelector('#messageBox') : document.getElementById('messageBox');

    if (!adminContent) {
        console.error("Admin content area not found. Admin page might not initialize correctly.");
        return;
    }
    if (!passwordModal) {
        console.error("Password modal not found. Admin page might not initialize correctly.");
        return;
    }

    // Check if admin is already authenticated
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        passwordModal.style.display = 'none';
        adminContent.classList.remove('hidden');
        loadAndRenderItemsFromBackend(true, adminWishlistContainer, 'adminLoadingMessage', adminMessageBox);
    } else {
        passwordModal.style.display = 'flex';
        adminContent.classList.add('hidden');
    }

    // Login button event listener
    loginButton.addEventListener('click', () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            passwordModal.style.display = 'none';
            adminContent.classList.remove('hidden');
            passwordError.textContent = ''; // Clear any previous error
            displayMessage("Login successful!", "success", adminMessageBox, false);
            loadAndRenderItemsFromBackend(true, adminWishlistContainer, 'adminLoadingMessage', adminMessageBox);
        } else {
            passwordError.textContent = 'Incorrect password.';
            passwordInput.value = ''; // Clear password input
            const passwordModalContent = passwordModal.querySelector('.modal-content');
            let modalMessageBox = passwordModalContent.querySelector('#modalMessageBox');
            if (!modalMessageBox) { // Create message box inside modal if it doesn't exist
                 modalMessageBox = document.createElement('div');
                 modalMessageBox.id = 'modalMessageBox';
                 modalMessageBox.className = 'message-box-inline mt-3 p-3 rounded-md text-sm'; // Base class
                 passwordModalContent.appendChild(modalMessageBox);
            }
            displayMessage("Login failed: Incorrect password.", "error", modalMessageBox, false);
        }
    });

    // Logout button event listener
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('isAdminAuthenticated');
        passwordModal.style.display = 'flex';
        adminContent.classList.add('hidden');
        if(adminWishlistContainer) adminWishlistContainer.innerHTML = '<p id="adminLoadingMessage" class="text-gray-500 col-span-full">Logged out. Please log in to manage items.</p>';
        displayMessage("Logged out successfully.", "info", adminMessageBox);
    });

    // Add item form submission
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission
        if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') {
            displayMessage("Authentication required to add items.", "error", adminMessageBox);
            return;
        }

        // Get form values
        const itemName = document.getElementById('itemName').value.trim();
        const itemDescription = document.getElementById('itemDescription').value.trim();
        const itemImage = document.getElementById('itemImage').value.trim();
        const itemPrice = document.getElementById('itemPrice').value.trim();
        const itemLink = document.getElementById('itemLink').value.trim();
        
        // Ensure a message box exists within the form for form-specific messages
        let formMessageBox = addItemForm.querySelector('#formMessageBox');
        if (!formMessageBox) { 
            formMessageBox = document.createElement('div');
            formMessageBox.id = 'formMessageBox';
            formMessageBox.className = 'message-box-inline my-2 p-3 rounded-md text-sm'; // Tailwind classes
            // Insert before the submit button or at the end of the form
            const submitButton = addItemForm.querySelector('button[type="submit"]');
            if (submitButton) {
                addItemForm.insertBefore(formMessageBox, submitButton);
            } else {
                addItemForm.appendChild(formMessageBox);
            }
        }


        if (!itemName || !itemLink) { // Basic validation
            displayMessage("Item Name and Product Link are required.", "error", formMessageBox);
            return;
        }

        const newItem = {
            // id will be generated by the backend.
            name: itemName,
            description: itemDescription,
            imageUrl: itemImage,
            price: itemPrice,
            link: itemLink,
            // addedAt timestamp should be set by the backend upon creation.
        };

        try {
            // Send POST request to the backend API
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newItem),
            });

            if (!response.ok) { // Check if request was successful
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `HTTP error ${response.status}`);
            }
            
            // const addedItem = await response.json(); // Optionally use returned item from backend
            addItemForm.reset(); // Clear the form
            displayMessage("Item added successfully via backend!", "success", formMessageBox);
            loadAndRenderItemsFromBackend(true, adminWishlistContainer, 'adminLoadingMessage', adminMessageBox); // Refresh the list
        } catch (error) {
            console.error("Error adding item via backend: ", error);
            displayMessage(`Error adding item: ${error.message}`, "error", formMessageBox, true);
        }
    });
    
    // Event delegation for delete buttons on admin items
    if (adminWishlistContainer) {
        adminWishlistContainer.addEventListener('click', async (e) => {
            if (e.target && e.target.classList.contains('delete-item-btn')) {
                if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') {
                    displayMessage("Authentication required to delete items.", "error", adminMessageBox);
                    return;
                }
                const itemId = e.target.dataset.id; // Get item ID from data attribute
                if (!itemId) {
                    displayMessage("Error: Item ID missing for delete operation.", "error", adminMessageBox);
                    return;
                }

                if (await showCustomConfirm("Are you sure you want to delete this item permanently from the database?")) {
                    try {
                        // Send DELETE request to the backend API
                        const response = await fetch(`${API_BASE_URL}/${itemId}`, {
                            method: 'DELETE',
                        });

                        if (!response.ok) { // Check if request was successful
                            const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                            throw new Error(errorData.message || `HTTP error ${response.status}`);
                        }
                        displayMessage("Item deleted successfully via backend.", "info", adminMessageBox);
                        loadAndRenderItemsFromBackend(true, adminWishlistContainer, 'adminLoadingMessage', adminMessageBox); // Refresh the list
                    } catch (error) {
                        console.error("Error deleting item via backend: ", error);
                        displayMessage(`Error deleting item: ${error.message}`, "error", adminMessageBox, true);
                    }
                }
            }
        });
    }
}

function renderAdminItems(items, container, loadingMsgId, msgBox) { 
    const loadingMsgElement = document.getElementById(loadingMsgId);
    if (loadingMsgElement) loadingMsgElement.style.display = 'none'; // Hide loading message
    
    container.innerHTML = ''; // Clear existing items

    if (items.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full">No wishlist items found in the database.</p>';
        return;
    }
    
    // Render each item
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col justify-between'; // Tailwind classes for item card
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
        container.appendChild(itemElement);
    });
}


// --- Public Wishlist Page Specific Logic ---
function initializePublicWishlistPage() {
    const publicWishlistContainer = document.getElementById('publicWishlistContainer');
    const publicMessageBox = document.getElementById('messageBox'); // Assuming a global messageBox for public page if needed

    if (!publicWishlistContainer) {
        console.error("Public wishlist container not found.");
        return;
    }
    loadAndRenderItemsFromBackend(false, publicWishlistContainer, 'publicLoadingMessage', publicMessageBox);
}

function renderPublicItems(items, container, loadingMsgId, msgBox) {
    const loadingMsgElement = document.getElementById(loadingMsgId);
    if (loadingMsgElement) loadingMsgElement.style.display = 'none'; // Hide loading message
    container.innerHTML = ''; // Clear existing items

    if (items.length === 0) {
        // Display message if no items, using the style from the user's HTML
        container.innerHTML = '<p id="publicLoadingMessage" style="color: #FFFFFF; text-align: center; font-size: 1.2em; padding: 40px 0; width: 100%;">My wishlist is currently empty. Check back soon!</p>';
        return;
    }
    
    // Render each item
    items.forEach(item => {
        const itemElement = document.createElement('li');
        itemElement.className = 'wishlist-item'; // Class from user's public HTML for styling

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
        container.appendChild(itemElement);
    });
}

// --- Common Data Loading and Rendering Function (for Local Backend) ---
async function loadAndRenderItemsFromBackend(isAdminPage, container, loadingMsgId, msgBox) {
    const loadingElement = document.getElementById(loadingMsgId);
    if (loadingElement) loadingElement.textContent = "Loading items from server...";

    try {
        // Fetch items from the backend API
        const response = await fetch(API_BASE_URL);
        if (!response.ok) { // Check for HTTP errors
            const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        const items = await response.json(); // Parse JSON response
        
        // Sort items by 'addedAt' client-side. Assumes backend provides 'addedAt'.
        items.sort((a, b) => {
            const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
            const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
            return timeB - timeA; // Sorts newest first
        });

        wishlistItems = items; // Update global state (primarily for reference)

        // Call the appropriate render function based on the page
        if (isAdminPage) {
            renderAdminItems(items, container, loadingMsgId, msgBox);
        } else {
            renderPublicItems(items, container, loadingMsgId, msgBox);
        }
        // Optionally, display a success message after loading
        // displayMessage(`Wishlist updated: ${items.length} items loaded.`, "info", msgBox, false);

    } catch (error) {
        console.error("Error fetching items from backend: ", error);
        displayMessage(`Error loading wishlist: ${error.message}`, "error", msgBox, true);
        if (loadingElement) loadingElement.textContent = "Error loading items.";
        // Render an empty state if there's an error
        if (isAdminPage) renderAdminItems([], container, loadingMsgId, msgBox);
        else renderPublicItems([], container, loadingMsgId, msgBox);
    }
}


// --- Page Initialization Router ---
// Determines which page-specific functions to call based on elements present in the DOM.
function initializePage() {
    if (document.getElementById('passwordModal') && window.location.pathname.includes('/admin')) { 
        initializeAdminPage();
    } 
    else if (document.getElementById('publicWishlistContainer')) { 
        initializePublicWishlistPage();
    } else {
        console.log("No specific page content recognized for initialization by wishlist.js.");
    }
}

// Add event listener to initialize the page logic once the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', initializePage);
