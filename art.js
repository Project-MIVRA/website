document.addEventListener('DOMContentLoaded', () => {
    const artWidget = document.getElementById('art-widget');
    const endpoint = '/api/art';

    const renderArt = async () => {
        if (!artWidget) return;

        try {
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch art data');
            
            const data = await response.json();
            
            // Default placeholder if no data is set
            const imageUrl = data.imageUrl || 'https://placehold.co/400x400/1a1a1a/ffffff?text=No+Art+Set';
            const artistName = data.artistName || 'Unknown Artist';
            const artistLink = data.artistLink || '#';
            const description = data.description || '';

            artWidget.innerHTML = `
                <h2>Art of the Month</h2>
                <div class="art-container">
                    <img src="${imageUrl}" alt="Art of the Month" class="art-image">
                    <div class="art-info">
                        <strong>${artistName}</strong>
                        <p>${description}</p>
                        ${artistLink && artistLink !== '#' ? `<a href="${artistLink}" target="_blank">View Artist</a>` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error fetching art of the month:', error);
            artWidget.innerHTML = `
                <h2>Art of the Month</h2>
                <p style="text-align:center; color:#ccc;">Could not load art.</p>
            `;
        }
    };

    renderArt();
});