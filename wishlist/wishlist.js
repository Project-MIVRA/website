const API_BASE_URL = "/api/wishlist"; 

function getPriorityBadgeHTML(priority) {
    if (priority === undefined || priority === null || priority === '' || priority === 999) return '';
    return `<div style="position: absolute; top: 15px; left: 15px; background-color: #3367e1; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 0.9em; font-weight: bold; font-family: Arial, sans-serif; box-shadow: 0 4px 8px rgba(0,0,0,0.6); z-index: 10;">#${priority}</div>`;
}

function renderPublicItems(items, container, loadingMsgId) {
    const loadingMsgElement = document.getElementById(loadingMsgId);
    if (loadingMsgElement) loadingMsgElement.style.display = 'none';
    container.innerHTML = ''; 

    if (items.length === 0) {
        container.innerHTML = '<p id="publicLoadingMessage" style="color: #FFFFFF; text-align: center; font-size: 1.2em; padding: 40px 0; width: 100%;">My wishlist is currently empty. Check back soon!</p>';
        return;
    }
    
    items.forEach(item => {
        const itemElement = document.createElement('li');
        itemElement.className = 'wishlist-item'; 
        itemElement.style.position = 'relative';
        if (item.purchased) itemElement.classList.add('purchased');

        const placeholderImage = 'https://placehold.co/300x200/EFEFEF/AAAAAA?text=Image+Not+Found';
        const imageSrc = item.imageUrl && item.imageUrl.trim() !== '' ? item.imageUrl : placeholderImage;

        itemElement.innerHTML = `
            ${getPriorityBadgeHTML(item.priority)} <a href="${item.link || '#'}" target="_blank" rel="noopener noreferrer">
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

async function loadPublicWishlist() {
    const container = document.getElementById('publicWishlistContainer');
    if (!container) return;

    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error("Error loading wishlist");
        const items = await response.json(); 
        
        items.sort((a, b) => {
            const prioA = (a.priority !== undefined && a.priority !== null && a.priority !== '') ? Number(a.priority) : 999;
            const prioB = (b.priority !== undefined && b.priority !== null && b.priority !== '') ? Number(b.priority) : 999;
            if (prioA !== prioB) return prioA - prioB; 
            
            const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
            const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
            return timeB - timeA;
        });

        renderPublicItems(items, container, 'publicLoadingMessage');
    } catch (error) {
        console.error("Error fetching items: ", error);
        document.getElementById('publicLoadingMessage').innerText = "Error loading wishlist items.";
    }
}

document.addEventListener('DOMContentLoaded', loadPublicWishlist);