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
    // Style the message box to match the site's dark theme
    messageBox.className = 'message-box-inline';
    messageBox.style.padding = '15px';
    messageBox.style.borderRadius = '10px';
    messageBox.style.marginBottom = '15px';
    messageBox.style.border = '1px solid';

    if (type === 'success') {
        messageBox.style.backgroundColor = 'rgba(29, 185, 84, 0.2)';
        messageBox.style.borderColor = '#1DB954';
        messageBox.style.color = '#1DB954';
    } else if (type === 'error') {
        messageBox.style.backgroundColor = 'rgba(229, 57, 53, 0.2)';
        messageBox.style.borderColor = '#e53935';
        messageBox.style.color = '#e53935';
    } else if (type === 'info') {
        messageBox.style.backgroundColor = 'rgba(51, 103, 225, 0.2)';
        messageBox.style.borderColor = '#3367e1';
        messageBox.style.color = '#3367e1';
    } else { // Default styling
        messageBox.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        messageBox.style.borderColor = '#ccc';
        messageBox.style.color = '#fff';
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

        // Modal HTML structure styled to match the site's theme
        const modalHTML = `
            <div id="${confirmModalId}" style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 100;">
                <div class="box" style="width: 100%; max-width: 24rem;">
                    <p style="color: #fff; font-size: 1.125rem; margin-bottom: 1rem; line-height: 1.5;">${message}</p>
                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                        <button id="confirmCancelBtn" style="padding: 8px 12px; font-family: monospace; font-size: 14px; background: black; color: #fff; border: 1px solid #3367e1; border-radius: 10px; cursor: pointer;">Cancel</button>
                        <button id="confirmOkBtn" style="padding: 8px 12px; font-family: monospace; font-size: 14px; background: black; color: #e53935; border: 1px solid #e53935; border-radius: 10px; cursor: pointer;">OK</button>
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

function showEditModal(item) {
    return new Promise((resolve) => {
        const modalId = 'editItemModal';
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const inputStyle = `width: 100%; padding: 8px; font-family: monospace; font-size: 14px; background: black; text-align: left; color: #fff; border: 1px solid #3367e1; border-radius: 10px; box-sizing: border-box;`;
        const modalHTML = `
            <div id="${modalId}" style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 100;">
                <div class="box" style="width: 100%; max-width: 32rem; max-height: 90vh; overflow-y: auto;">
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: #fff; margin-bottom: 1rem;">Edit Wishlist Item</h3>
                    <form id="editItemForm">
                        <div style="margin-bottom: 1rem;">
                            <label for="editItemName" style="display: block; font-size: 0.875rem; font-weight: 500; color: #fff; margin-bottom: 0.5rem;">Name</label>
                            <input type="text" id="editItemName" value="${item.name}" required style="${inputStyle}">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="editItemDescription" style="display: block; font-size: 0.875rem; font-weight: 500; color: #fff; margin-bottom: 0.5rem;">Description</label>
                            <textarea id="editItemDescription" rows="3" style="${inputStyle}">${item.description || ''}</textarea>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="editItemPrice" style="display: block; font-size: 0.875rem; font-weight: 500; color: #fff; margin-bottom: 0.5rem;">Price</label>
                            <input type="text" id="editItemPrice" value="${item.price || ''}" style="${inputStyle}">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="editItemLink" style="display: block; font-size: 0.875rem; font-weight: 500; color: #fff; margin-bottom: 0.5rem;">Product Link</label>
                            <input type="text" id="editItemLink" value="${item.link || ''}" required style="${inputStyle}">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="editItemImage" style="display: block; font-size: 0.875rem; font-weight: 500; color: #fff; margin-bottom: 0.5rem;">Image URL</label>
                            <input type="text" id="editItemImage" value="${item.imageUrl || ''}" style="${inputStyle}">
                        </div>
                        <div style="margin-bottom: 1rem; display: flex; align-items: center;">
                            <input type="checkbox" id="editItemPurchased" ${item.purchased ? 'checked' : ''} style="height: 1rem; width: 1rem; accent-color: #3367e1;">
                            <label for="editItemPurchased" style="margin-left: 0.5rem; font-size: 0.875rem; color: #fff;">Mark as Purchased</label>
                        </div>
                        <div id="editFormMessageBox" class="message-box-inline my-2 p-3 rounded-md text-sm" style="display: none;"></div>
                        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                            <button type="button" id="editCancelBtn" style="padding: 8px 12px; font-family: monospace; font-size: 14px; background: black; color: #fff; border: 1px solid #3367e1; border-radius: 10px; cursor: pointer;">Cancel</button>
                            <button type="submit" id="editSaveBtn" style="padding: 8px 12px; font-family: monospace; font-size: 14px; background: #3367e1; color: white; border: 1px solid #3367e1; border-radius: 10px; cursor: pointer;">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modalElement = document.getElementById(modalId);
        const form = document.getElementById('editItemForm');
        const cancelButton = document.getElementById('editCancelBtn');

        cancelButton.onclick = () => {
            modalElement.remove();
            resolve(null); // Resolve with null on cancel
        };

        form.onsubmit = (e) => {
            e.preventDefault();
            const updatedItemData = {
                name: document.getElementById('editItemName').value.trim(),
                description: document.getElementById('editItemDescription').value.trim(),
                price: document.getElementById('editItemPrice').value.trim(),
                link: document.getElementById('editItemLink').value.trim(),
                imageUrl: document.getElementById('editItemImage').value.trim(),
                purchased: document.getElementById('editItemPurchased').checked,
            };

            // Basic validation
            if (!updatedItemData.name || !updatedItemData.link) {
                const editFormMessageBox = document.getElementById('editFormMessageBox');
                displayMessage("Item Name and Product Link are required.", "error", editFormMessageBox, true);
                return; // Prevent closing modal
            }
            modalElement.remove();
            resolve(updatedItemData);
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
            const passwordModalContent = passwordModal.querySelector('.box');
            let modalMessageBox = passwordModalContent.querySelector('#modalMessageBox');
            if (!modalMessageBox) { // Create message box inside modal if it doesn't exist
                 modalMessageBox = document.createElement('div');
                 modalMessageBox.id = 'modalMessageBox';
                 modalMessageBox.className = 'message-box-inline';
                 modalMessageBox.style.marginTop = '15px';
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
            formMessageBox.className = 'message-box-inline';
            formMessageBox.style.marginBottom = '1rem';
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
            if (e.target && e.target.classList.contains('edit-item-btn')) {
                if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') {
                    displayMessage("Authentication required to edit items.", "error", adminMessageBox);
                    return;
                }
                const itemId = e.target.dataset.id;
                const itemToEdit = wishlistItems.find(item => item.id === itemId);

                if (itemToEdit) {
                    const updatedItemData = await showEditModal(itemToEdit);
                    if (updatedItemData) { // Proceed only if the modal was saved, not cancelled
                        try {
                            const response = await fetch(`${API_BASE_URL}/${itemId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(updatedItemData),
                            });
                            if (!response.ok) {
                                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                                throw new Error(errorData.message || `HTTP error ${response.status}`);
                            }
                            displayMessage("Item updated successfully.", "success", adminMessageBox);
                            loadAndRenderItemsFromBackend(true, adminWishlistContainer, 'adminLoadingMessage', adminMessageBox);
                        } catch (error) {
                            console.error("Error updating item:", error);
                            displayMessage(`Error updating item: ${error.message}`, "error", adminMessageBox, true);
                        }
                    }
                } else {
                    displayMessage("Could not find item to edit.", "error", adminMessageBox);
                }

            } else if (e.target && e.target.classList.contains('delete-item-btn')) {
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
    if (loadingMsgElement) loadingMsgElement.style.display = 'none';

    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full">No wishlist items found in the database.</p>';
        return;
    }
    
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'box';
        if (item.purchased) {
            itemElement.style.opacity = '0.6';
        }

        const placeholderImage = 'https://placehold.co/300x200/444/ccc?text=No+Image';
        const imageSrc = item.imageUrl && item.imageUrl.trim() !== '' ? item.imageUrl : placeholderImage;

        itemElement.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <img src="${imageSrc}" alt="${item.name || 'Wishlist Item'}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 4px; margin-bottom: 15px;" onerror="this.onerror=null;this.src='${placeholderImage}';">
                <div style="flex-grow: 1;">
                    <h3 style="font-weight: bold; font-size: 1.2em; margin: 0 0 5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;" title="${item.name}">${item.name}</h3>
                    <p style="font-size: 0.9em; color: #ccc; margin: 0 0 10px 0; min-height: 40px;">${item.description || 'No description'}</p>
                    <p style="font-size: 1em; font-weight: 500; color: #33A1DE; margin: 0 0 15px 0;">${item.price || 'Price not set'}</p>
                    <p style="font-size: 0.8em; color: #ccc; margin: 0 0 15px 0;">Status: <span style="font-weight: bold; color: ${item.purchased ? '#1DB954' : '#f5c518'};">${item.purchased ? 'Purchased' : 'Not Purchased'}</span></p>
                </div>
                <div class="admin-actions" style="margin-top: auto; border-top: 1px solid #3367e140; padding-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="padding: 6px 10px; font-family: monospace; font-size: 12px; background: #222; color: #fff; border: 1px solid #444; border-radius: 10px; text-decoration: none;">View</a>
                    <button data-id="${item.id}" class="edit-item-btn" style="padding: 6px 10px; font-family: monospace; font-size: 12px; background: black; color: #fff; border: 1px solid #3367e1; border-radius: 10px; cursor: pointer;">Edit</button>
                    <button data-id="${item.id}" class="delete-item-btn" style="padding: 6px 10px; font-family: monospace; font-size: 12px; background: black; color: #e53935; border: 1px solid #e53935; border-radius: 10px; cursor: pointer;">Delete</button>
                </div>
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
        if (item.purchased) {
            itemElement.classList.add('purchased');
        }

        const placeholderImage = 'https://placehold.co/300x200/EFEFEF/AAAAAA?text=Image+Not+Found';
        const imageSrc = item.imageUrl && item.imageUrl.trim() !== '' ? item.imageUrl : placeholderImage;

        itemElement.innerHTML = `
            <a href="${item.link || '#'}" target="_blank" rel="noopener noreferrer">
                <img src="${imageSrc}" alt="${item.name || 'Wishlist Item'}" onerror="this.onerror=null;this.src='${placeholderImage}';">
                <div class="item-info">
                    <div class="item-title">${item.name || 'Untitled Item'}</div>
                    ${item.description ? `<p class="item-description">${item.description}</p>` : '<p class="item-description">No description available.</p>'}
                    <div class="item-price-and-status">
                        ${item.price ? `<p class="item-price">${item.price}</p>` : '<p class="item-price">Price not listed</p>'}
                        ${item.purchased ? `<p class="item-status-purchased">Purchased</p>` : ''}
                    </div>
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
