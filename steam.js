// website/steam.js
document.addEventListener('DOMContentLoaded', () => {
    const steamWidget = document.getElementById('steam-widget');
    const playerSummaryEndpoint = '/api/steam/player-summary';
    const recentlyPlayedEndpoint = '/api/steam/recently-played';

    const renderSteamStatus = async () => {
        if (!steamWidget) return;

        try {
            // First, check if the user is currently playing a game
            const summaryResponse = await fetch(playerSummaryEndpoint);
            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                const player = summaryData.response?.players?.[0];

                // The 'gameextrainfo' field is present only when a user is in-game.
                if (player && player.gameextrainfo) {
                    const gameName = player.gameextrainfo;
                    
                    steamWidget.innerHTML = `
                        <h2>Now on Steam</h2>
                        <div class="steam-game">
                            <div class="steam-game-info">
                                <h3>${gameName} <span class="steam-live-indicator">LIVE</span></h3>
                                <p>Currently playing</p>
                            </div>
                        </div>
                    `;
                    return; // Exit because we found a live game
                }
            }

            // If not currently playing, fall back to the most recently played game.
            // Note: The Steam API doesn't guarantee this list is in chronological order,
            // but the first item is generally the most relevant recent game.
            const recentResponse = await fetch(recentlyPlayedEndpoint);
            if (recentResponse.ok) {
                const recentData = await recentResponse.json();
                const games = recentData.response?.games;

                if (games && games.length > 0) {
                    const mostRecentGame = games[0];
                    const gameName = mostRecentGame.name;
                    const gameIconUrl = `https://media.steampowered.com/steamcommunity/public/images/apps/${mostRecentGame.appid}/${mostRecentGame.img_icon_url}.jpg`;
                    const hoursPlayed = (mostRecentGame.playtime_forever / 60).toFixed(1);

                    steamWidget.innerHTML = `
                        <h2>Recent Steam Activity</h2>
                        <div class="steam-game">
                            <img src="${gameIconUrl}" alt="Icon for ${gameName}" onerror="this.style.display='none'">
                            <div class="steam-game-info">
                                <h3>${gameName}</h3>
                                <p>${hoursPlayed} hours played</p>
                            </div>
                        </div>
                    `;
                } else {
                    steamWidget.innerHTML = `<h2>On Steam</h2><p>No recent games played.</p>`;
                }
            } else {
                 steamWidget.innerHTML = `<h2>On Steam</h2><p>Could not load recent games.</p>`;
            }

        } catch (error) {
            console.error('Error rendering Steam status:', error);
            steamWidget.innerHTML = `<h2>Steam Status</h2><p>Could not load Steam data.</p>`;
        }
    };

    renderSteamStatus();
    // Refresh every 2 minutes
    setInterval(renderSteamStatus, 120000); 
});
