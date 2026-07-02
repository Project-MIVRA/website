document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const adminDashboard = document.getElementById('adminDashboard');
    let token = localStorage.getItem('adminToken');
    let wishlistItems = []; // Stored globally for the edit modal

    // Headers with Auth
    const authHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    });

    // Check login state
    if (token) {
        showDashboard();
    }

    // Login Logic
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const u = document.getElementById('loginUsername').value;
        const p = document.getElementById('loginPassword').value;
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        if (res.ok) {
            const data = await res.json();
            token = data.token;
            localStorage.setItem('adminToken', token);
            showDashboard();
        } else {
            document.getElementById('loginError').innerText = 'Invalid credentials';
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/admin/logout', { method: 'POST', headers: authHeaders() });
        localStorage.removeItem('adminToken');
        token = null;
        adminDashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    });

    function showDashboard() {
        loginScreen.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        loadWishlist();
        loadPolls();
    }

    // Tab Logic
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

    // Activity Logic
    document.getElementById('setActivityBtn').addEventListener('click', async () => {
        const text = document.getElementById('activityInput').value;
        const res = await fetch('/api/activity', {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ text })
        });
        document.getElementById('activityMsg').innerText = res.ok ? 'Activity updated!' : 'Error updating.';
        document.getElementById('activityMsg').style.color = res.ok ? '#1DB954' : '#e53935';
        setTimeout(() => document.getElementById('activityMsg').innerText = '', 3000);
    });

    // --- WISHLIST LOGIC (RESTORED OLD DESIGN) ---
    function getPriorityBadgeHTML(priority) {
        if (priority === undefined || priority === null || priority === '' || priority === 999) return '';
        return `<div style="position: absolute; top: 15px; left: 15px; background-color: #3367e1; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 0.9em; font-weight: bold; font-family: Arial, sans-serif; box-shadow: 0 4px 8px rgba(0,0,0,0.6); z-index: 10;">#${priority}</div>`;
    }

    async function loadWishlist() {
        const wlList = document.getElementById('wlList');
        wlList.innerHTML = '<p style="color: #ccc;">Loading items from database...</p>';

        try {
            const res = await fetch('/api/wishlist');
            wishlistItems = await res.json();
            
            // Sort logic exactly as before
            wishlistItems.sort((a, b) => {
                const prioA = (a.priority !== undefined && a.priority !== null && a.priority !== '') ? Number(a.priority) : 999;
                const prioB = (b.priority !== undefined && b.priority !== null && b.priority !== '') ? Number(b.priority) : 999;
                if (prioA !== prioB) return prioA - prioB; 
                
                const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
                const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
                return timeB - timeA;
            });

            if (wishlistItems.length === 0) {
                wlList.innerHTML = '<p style="color: #ccc; grid-column: 1 / -1;">No wishlist items found in the database.</p>';
                return;
            }

            wlList.innerHTML = '';
            
            wishlistItems.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'box';
                itemElement.style.position = 'relative';
                itemElement.style.margin = '0'; // Override generic box margin for grid
                
                if (item.purchased) {
                    itemElement.style.opacity = '0.6';
                }

                const placeholderImage = 'https://placehold.co/300x200/444/ccc?text=No+Image';
                const imageSrc = item.imageUrl && item.imageUrl.trim() !== '' ? item.imageUrl : placeholderImage;

                itemElement.innerHTML = `
                    ${getPriorityBadgeHTML(item.priority)} 
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
                wlList.appendChild(itemElement);
            });
        } catch (error) {
            wlList.innerHTML = '<p style="color: #e53935;">Error loading items.</p>';
        }
    }

    document.getElementById('addWlBtn').addEventListener('click', async () => {
        const data = {
            name: document.getElementById('wlName').value,
            description: document.getElementById('wlDesc').value,
            price: document.getElementById('wlPrice').value,
            link: document.getElementById('wlLink').value,
            imageUrl: document.getElementById('wlImage').value,
            priority: document.getElementById('wlPriority').value
        };
        const res = await fetch('/api/wishlist', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
        if (res.ok) {
            loadWishlist();
            document.querySelectorAll('#wishlistTab input').forEach(i => i.value = '');
            document.getElementById('wlMsg').innerText = 'Item added successfully!';
            setTimeout(() => document.getElementById('wlMsg').innerText = '', 3000);
        }
    });

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
                                <label style="display: block; font-size: 0.875rem; color: #fff; margin-bottom: 0.5rem;">Name</label>
                                <input type="text" id="editItemName" value="${item.name}" required style="${inputStyle}">
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.875rem; color: #fff; margin-bottom: 0.5rem;">Description</label>
                                <textarea id="editItemDescription" rows="3" style="${inputStyle}">${item.description || ''}</textarea>
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.875rem; color: #fff; margin-bottom: 0.5rem;">Price</label>
                                <input type="text" id="editItemPrice" value="${item.price || ''}" style="${inputStyle}">
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.875rem; color: #fff; margin-bottom: 0.5rem;">Product Link</label>
                                <input type="text" id="editItemLink" value="${item.link || ''}" required style="${inputStyle}">
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.875rem; color: #fff; margin-bottom: 0.5rem;">Image URL</label>
                                <input type="text" id="editItemImage" value="${item.imageUrl || ''}" style="${inputStyle}">
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.875rem; color: #fff; margin-bottom: 0.5rem;">Priority (1 is highest)</label>
                                <input type="number" id="editItemPriority" value="${item.priority !== undefined && item.priority !== 999 ? item.priority : ''}" style="${inputStyle}" placeholder="Optional">
                            </div>
                            <div style="margin-bottom: 1rem; display: flex; align-items: center;">
                                <input type="checkbox" id="editItemPurchased" ${item.purchased ? 'checked' : ''} style="height: 1rem; width: 1rem; accent-color: #3367e1;">
                                <label for="editItemPurchased" style="margin-left: 0.5rem; font-size: 0.875rem; color: #fff;">Mark as Purchased</label>
                            </div>
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
                resolve(null);
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
                    priority: document.getElementById('editItemPriority').value.trim(),
                };
                modalElement.remove();
                resolve(updatedItemData);
            };
        });
    }

    // Event Delegation for Edit & Delete Buttons
    document.getElementById('wlList').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-item-btn')) {
            const id = e.target.getAttribute('data-id');
            if(confirm('Delete item permanently?')) {
                await fetch(`/api/wishlist/${id}`, { method: 'DELETE', headers: authHeaders() });
                loadWishlist();
            }
        } 
        
        else if (e.target.classList.contains('edit-item-btn')) {
            const id = e.target.getAttribute('data-id');
            const itemToEdit = wishlistItems.find(item => item.id === id);
            if (itemToEdit) {
                const updatedData = await showEditModal(itemToEdit);
                if (updatedData) {
                    await fetch(`/api/wishlist/${id}`, {
                        method: 'PUT',
                        headers: authHeaders(),
                        body: JSON.stringify(updatedData)
                    });
                    loadWishlist();
                }
            }
        }
    });

    // --- POLLS LOGIC ---
    let qCount = 0;
    document.getElementById('addQuestionBtn').addEventListener('click', () => {
        qCount++;
        const div = document.createElement('div');
        div.className = 'poll-question';
        div.innerHTML = `
            <h4>Question ${qCount}</h4>
            <input type="text" class="form-input q-text" placeholder="Question text (e.g. What is your age?)">
            <select class="form-input q-type" onchange="toggleOptions(this)">
                <option value="text">Text Answer</option>
                <option value="number">Number Only</option>
                <option value="radio">Single Choice (Radio)</option>
                <option value="checkbox">Multiple Choice (Checkboxes)</option>
            </select>
            <input type="text" class="form-input q-options" placeholder="Comma-separated options (if Radio/Checkbox)" style="display:none;">
        `;
        document.getElementById('pollQuestions').appendChild(div);
    });

    window.toggleOptions = (select) => {
        const opts = select.nextElementSibling;
        if (select.value === 'radio' || select.value === 'checkbox') opts.style.display = 'block';
        else opts.style.display = 'none';
    };

    document.getElementById('createPollBtn').addEventListener('click', async () => {
        const title = document.getElementById('pollTitle').value;
        const description = document.getElementById('pollDesc').value;
        const questions = Array.from(document.querySelectorAll('.poll-question')).map(q => ({
            text: q.querySelector('.q-text').value,
            type: q.querySelector('.q-type').value,
            options: q.querySelector('.q-options').value.split(',').map(s=>s.trim()).filter(Boolean)
        }));

        const res = await fetch('/api/polls', {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ title, description, questions })
        });
        if (res.ok) {
            document.getElementById('pollMsg').innerText = "Poll Created Successfully!";
            document.getElementById('pollQuestions').innerHTML = '';
            loadPolls();
            setTimeout(() => document.getElementById('pollMsg').innerText = '', 3000);
        }
    });

    async function loadPolls() {
        const res = await fetch('/api/admin/polls', { headers: authHeaders() });
        const polls = await res.json();
        const list = document.getElementById('pollsList');
        list.innerHTML = polls.map(p => `
            <div style="background: rgba(0,0,0,0.5); padding: 15px; margin-bottom: 10px; border-radius: 5px;">
                <strong style="font-size: 1.2em;">${p.title}</strong><br>
                Link: <a href="/poll/?id=${p.id}" target="_blank">/poll/?id=${p.id}</a><br><br>
                <button onclick="viewPollResults('${p.id}')" class="button" style="background:#3367e1;">View Results</button>
                <button onclick="deletePoll('${p.id}')" class="button button-danger">Delete</button>
                <div id="results-${p.id}" style="margin-top: 15px; display:none; background: #222; padding: 10px; border-radius: 5px;"></div>
            </div>
        `).join('');
    }

    window.deletePoll = async (id) => {
        if(confirm('Delete poll permanently?')) {
            await fetch(`/api/polls/${id}`, { method: 'DELETE', headers: authHeaders() });
            loadPolls();
        }
    };

    window.viewPollResults = async (id) => {
        const resDiv = document.getElementById(`results-${id}`);
        if (resDiv.style.display === 'block') { resDiv.style.display = 'none'; return; }
        
        const res = await fetch(`/api/polls/${id}/results`, { headers: authHeaders() });
        const data = await res.json();
        
        let html = `<h4>Total Responses: ${data.totalResponses}</h4>`;
        
        data.poll.questions.forEach(q => {
            html += `<div style="margin-bottom: 10px;"><strong>${q.text}</strong><br>`;
            
            const answers = data.responses.map(r => r.responses.find(rq => rq.questionId === q.id)?.value).filter(v => v !== undefined);
            
            if (q.type === 'radio' || q.type === 'checkbox') {
                const counts = {};
                answers.forEach(ans => {
                    const ansArr = Array.isArray(ans) ? ans : [ans];
                    ansArr.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
                });
                for (const [opt, count] of Object.entries(counts)) {
                    html += `- ${opt}: ${count} votes<br>`;
                }
            } else {
                html += answers.map(a => `- ${a}`).join('<br>');
            }
            html += `</div>`;
        });
        
        resDiv.innerHTML = html;
        resDiv.style.display = 'block';
    };
});