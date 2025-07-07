// website/steam.js
document.addEventListener('DOMContentLoaded', () => {
    const steamWidget = document.getElementById('steam-widget');
    const playerSummaryEndpoint = '/api/steam/player-summary';
    const recentlyPlayedEndpoint = '/api/steam/recently-played';

    const renderSteamStatus = async () => {
        if (!steamWidget) return;

        try {
            // Fetch both summary and recent games data in parallel to be more efficient
            const [summaryResponse, recentResponse] = await Promise.all([
                fetch(playerSummaryEndpoint),
                fetch(recentlyPlayedEndpoint)
            ]);

            // Check player summary for a live game
            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                const player = summaryData.response?.players?.[0];

                // The 'gameextrainfo' field is present only when a user is in-game.
                if (player && player.gameextrainfo) {
                    const gameName = player.gameextrainfo;
                    const gameId = player.gameid;
                    let gameIconUrl = 'https://placehold.co/48x48/1b2838/ffffff?text=??'; // Default placeholder

                    // If we found a live game, we need to find its icon hash from the recently played list
                    if (recentResponse.ok) {
                        const recentData = await recentResponse.json();
                        const gameInRecentList = recentData.response?.games?.find(g => g.appid == gameId);
                        if (gameInRecentList) {
                            gameIconUrl = `https://media.steampowered.com/steamcommunity/public/images/apps/${gameId}/${gameInRecentList.img_icon_url}.jpg`;
                        }
                    }

                    steamWidget.innerHTML = `
                        <h2>Now on Steam</h2>
                        <div class="steam-game">
                            <img src="${gameIconUrl}" alt="Icon for ${gameName}" onerror="this.style.display='none'">
                            <div class="steam-game-info">
                                <h3>${gameName} <span class="steam-live-indicator">LIVE</span></h3>
                                <p>Currently playing</p>
                            </div>
                        </div>
                    `;
                    return; // Exit because we've displayed the live game
                }
            }

            // If no live game was found, fall back to showing the most recent game from the list.
            // Note: The order of this list is determined by the Steam API and may not update instantly.
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
