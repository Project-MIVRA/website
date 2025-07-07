// website/spotify.js

document.addEventListener('DOMContentLoaded', () => {
    const spotifyWidget = document.getElementById('spotify-widget');
    const nowPlayingEndpoint = '/api/spotify/now-playing';

    /**
     * Formats the progress of the song into MM:SS format.
     * @param {number} progressMs - The progress of the song in milliseconds.
     * @returns {string} The formatted time string.
     */
    const formatTime = (progressMs) => {
        if (typeof progressMs !== 'number') return '0:00';
        const totalSeconds = Math.floor(progressMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    /**
     * Fetches the currently playing song from the server and updates the widget.
     */
    const renderSong = async () => {
        if (!spotifyWidget) {
            console.error('Spotify widget element not found.');
            return;
        }

        try {
            const response = await fetch(nowPlayingEndpoint);
            
            if (response.status === 204) {
                 spotifyWidget.innerHTML = `
                    <h2>Now Playing</h2>
                    <p>Nothing is currently playing on Spotify.</p>
                `;
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch song data.');
            }

            const song = await response.json();

            if (song && song.item) {
                const artists = song.item.artists?.map(artist => artist?.name).filter(Boolean).join(', ') || 'Unknown Artist';
                const progress = formatTime(song.progress_ms);
                const duration = formatTime(song.item.duration_ms);
                const albumImage = song.item.album?.images?.[0]?.url || 'https://placehold.co/640x640/191414/ffffff?text=No+Art';
                const albumName = song.item.album?.name || 'Unknown Album';
                const songName = song.item.name || 'Unknown Song';
                const songUrl = song.item.external_urls?.spotify || '#';
                const deviceName = song.device?.name || 'an unknown device';

                spotifyWidget.innerHTML = `
                    <h2>Now Playing on Spotify</h2>
                    <a href="${songUrl}" target="_blank" rel="noopener noreferrer">
                        <img src="${albumImage}" alt="${albumName}">
                    </a>
                    <h3 title="${songName}">${songName}</h3>
                    <p class="spotify-artist" title="${artists}">${artists}</p>
                    <div class="spotify-progress">
                        <span>${progress} / ${duration}</span>
                    </div>
                    <p class="spotify-device">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                          <path d="M12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4z"/>
                          <path d="M8 4.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm0 2.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM8 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                        </svg>
                        Listening on ${deviceName}
                    </p>
                `;
            } else {
                 spotifyWidget.innerHTML = `
                    <h2>Now Playing</h2>
                    <p>Nothing is currently playing on Spotify.</p>
                `;
            }
        } catch (error) {
            console.error('Error rendering song:', error);
            spotifyWidget.innerHTML = `
                <h2>Now Playing</h2>
                <p>Could not load Spotify data.</p>
            `;
        }
    };

    // Initial render and then refresh every 5 seconds
    renderSong();
    setInterval(renderSong, 5000);
});
