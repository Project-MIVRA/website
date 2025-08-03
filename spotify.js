// website/spotify.js

document.addEventListener('DOMContentLoaded', () => {
    const spotifyWidget = document.getElementById('spotify-widget');
    const nowPlayingEndpoint = '/api/spotify/now-playing';
    const devicesEndpoint = '/api/spotify/devices'; // Endpoint to get available devices

    // A variable to hold the interval that updates the progress bar
    let progressInterval = null;
    let currentSongId = null; // To track the current song and avoid re-rendering

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

    const showNothingPlaying = () => {
        if (currentSongId !== null) { // Only update if state changes from playing to not
            spotifyWidget.innerHTML = `<h2>Now Playing</h2><p>Nothing is currently playing on Spotify.</p>`;
            if (progressInterval) clearInterval(progressInterval);
            progressInterval = null;
            currentSongId = null;
        }
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
            const [songResponse, devicesResponse] = await Promise.all([
                fetch(nowPlayingEndpoint),
                fetch(devicesEndpoint)
            ]);

            if (songResponse.status === 204) {
                showNothingPlaying();
                return;
            }

            if (!songResponse.ok) {
                throw new Error('Failed to fetch song data.');
            }

            const song = await songResponse.json();

            if (song && song.item) {
                const songId = song.item.id;

                if (songId !== currentSongId) {
                    // NEW SONG: Full re-render is needed
                    currentSongId = songId;
                    if (progressInterval) clearInterval(progressInterval);

                    const artists = song.item.artists?.map(artist => artist?.name).filter(Boolean).join(', ') || 'Unknown Artist';
                    let progressMs = song.progress_ms;
                    const durationMs = song.item.duration_ms;
                    const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;
                    const albumImage = song.item.album?.images?.[0]?.url || 'https://placehold.co/640x640/191414/ffffff?text=No+Art';
                    const albumName = song.item.album?.name || 'Unknown Album';
                    const songName = song.item.name || 'Unknown Song';
                    const songUrl = song.item.external_urls?.spotify || '#';
                    const isPlaying = song.is_playing;

                    let deviceName = null;
                    if (devicesResponse.ok) {
                        const devicesData = await devicesResponse.json();
                        const activeDevice = devicesData.devices?.find(d => d.is_active);
                        if (activeDevice) deviceName = activeDevice.name;
                    } else {
                        console.warn('Could not fetch device list. Using fallback from now-playing endpoint.');
                        deviceName = song.device?.name;
                    }

                    const statusIcon = isPlaying 
                        ? `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.7 3A.7.7 0 005 3.7v16.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V3.7a.7.7 0 00-.7-.7H5.7zm10 0a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V3.7a.7.7 0 00-.7-.7h-2.6z"></path></svg>` // Pause icon
                        : `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path></svg>`; // Play icon

                    const deviceHTML = deviceName
                        ? `<p class="spotify-device">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                              <path d="M12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4z"/>
                              <path d="M8 4.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm0 2.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM8 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                            </svg>
                            Listening on ${deviceName}
                        </p>`
                        : '';

                    spotifyWidget.innerHTML = `
                        <h2>Now Playing</h2>
                        <div class="spotify-now-playing-container">
                            <div class="spotify-album-art">
                                <a href="${songUrl}" target="_blank" rel="noopener noreferrer">
                                    <img src="${albumImage}" alt="${albumName}">
                                </a>
                            </div>
                            <div class="spotify-song-info">
                                <div class="spotify-status">
                                    <div class="spotify-title-container">
                                        <h3 title="${songName}"><span>${songName}</span></h3>
                                    </div>
                                </div>
                                <p class="spotify-artist" title="${artists}"><span>${artists}</span></p>
                            </div>
                        </div>
                        <div class="spotify-controls">
                            ${statusIcon}
                            <div class="spotify-progress-wrapper">
                                <div class="spotify-progress-bar-container">
                                    <div class="spotify-progress-bar" style="width: ${progressPercent}%;"></div>
                                </div>
                                <div class="spotify-progress-time">
                                    <span>${formatTime(progressMs)} / ${formatTime(durationMs)}</span>
                                </div>
                            </div>
                        </div>
                        ${deviceHTML}
                    `;

                    // Use requestAnimationFrame to ensure the DOM is fully rendered before checking for overflow
                    requestAnimationFrame(() => {
                        const songTitleElement = spotifyWidget.querySelector('.spotify-song-info h3');
                        const artistElement = spotifyWidget.querySelector('.spotify-artist');
                        const songInfoContainer = spotifyWidget.querySelector('.spotify-song-info');

                        const handleScrollingText = (container) => {
                            if (!container) return false;
                            const span = container.querySelector('span');
                            if (!span) return false;

                            // Use scrollWidth and clientWidth of the container to detect overflow
                            if (container.scrollWidth > container.clientWidth) {
                                // First, measure the element's dimensions *before* changing its styles.
                                const containerWidth = container.clientWidth;
                                const textWidth = container.scrollWidth;

                                // Now, add the class that changes its flex behaviour.
                                container.classList.add('scrolling');

                                // Set the CSS variables for the animation.
                                container.style.setProperty('--container-width', `${containerWidth}px`);
                                container.style.setProperty('--text-width', `${textWidth}px`);

                                const travelDistance = textWidth - containerWidth;
                                // Bi-directional scroll: (2 * distance) / 50px/s
                                const duration = (travelDistance / 25);
                                span.style.animationDuration = `${Math.max(5, duration)}s`;
                                return true;
                            } else {
                                container.classList.remove('scrolling');
                                return false;
                            }
                        };

                        const isTitleScrolling = handleScrollingText(songTitleElement);
                        const isArtistScrolling = handleScrollingText(artistElement);

                        if (songInfoContainer) {
                            if (isTitleScrolling || isArtistScrolling) {
                                songInfoContainer.classList.add('is-scrolling');
                            } else {
                                songInfoContainer.classList.remove('is-scrolling');
                            }
                        }
                    });

                    if (isPlaying) {
                        const progressBar = spotifyWidget.querySelector('.spotify-progress-bar');
                        const progressTime = spotifyWidget.querySelector('.spotify-progress-time span');

                        progressInterval = setInterval(() => {
                            progressMs += 1000;
                            if (progressMs > durationMs) {
                                progressMs = durationMs;
                                clearInterval(progressInterval);
                            }
                            const currentProgressPercent = (progressMs / durationMs) * 100;
                            
                            if (progressBar) progressBar.style.width = `${currentProgressPercent}%`;
                            if (progressTime) progressTime.textContent = `${formatTime(progressMs)} / ${formatTime(durationMs)}`;
                        }, 1000);
                    }
                } else {
                    // SAME SONG: only update dynamic elements
                    let progressMs = song.progress_ms;
                    const durationMs = song.item.duration_ms;
                    const isPlaying = song.is_playing;

                    if (progressInterval) clearInterval(progressInterval);

                    const progressBar = spotifyWidget.querySelector('.spotify-progress-bar');
                    const progressTime = spotifyWidget.querySelector('.spotify-progress-time span');
                    const statusIconContainer = spotifyWidget.querySelector('.spotify-controls');

                    if (progressBar) progressBar.style.width = `${(progressMs / durationMs) * 100}%`;
                    if (progressTime) progressTime.textContent = `${formatTime(progressMs)} / ${formatTime(durationMs)}`;

                    const statusIcon = statusIconContainer.querySelector('svg');
                    if (statusIcon) { // Check if icon exists
                        const isCurrentlyPlayIcon = statusIcon.innerHTML.includes('011.05-.606z'); // Check for play icon path data
                        if (isPlaying && isCurrentlyPlayIcon) {
                            statusIcon.outerHTML = `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.7 3A.7.7 0 005 3.7v16.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V3.7a.7.7 0 00-.7-.7H5.7zm10 0a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V3.7a.7.7 0 00-.7-.7h-2.6z"></path></svg>`;
                        } else if (!isPlaying && !isCurrentlyPlayIcon) {
                            statusIcon.outerHTML = `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path></svg>`;
                        }
                    }

                    if (isPlaying) {
                        const progressBar = spotifyWidget.querySelector('.spotify-progress-bar');
                        const progressTime = spotifyWidget.querySelector('.spotify-progress-time span');
                        progressInterval = setInterval(() => {
                            progressMs += 1000;
                            if (progressMs > durationMs) {
                                progressMs = durationMs;
                                clearInterval(progressInterval);
                            }
                            const currentProgressPercent = (progressMs / durationMs) * 100;
                            if (progressBar) progressBar.style.width = `${currentProgressPercent}%`;
                            if (progressTime) progressTime.textContent = `${formatTime(progressMs)} / ${formatTime(durationMs)}`;
                        }, 1000);
                    }
                }
            } else {
                // Case where song object is null/empty but response was not 204
                showNothingPlaying();
            }
        } catch (error) {
            console.error('Error rendering song:', error);
            spotifyWidget.innerHTML = `<h2>Now Playing</h2><p>Could not load Spotify data. Retrying automatically.</p>`;
            if (progressInterval) clearInterval(progressInterval);
            currentSongId = null; // Reset on error to allow re-render on next successful poll
        }
    };

    const poll = async () => {
        await renderSong();
        setTimeout(poll, 3000);
    };

    poll();
});
