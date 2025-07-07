// website/steam.js
document.addEventListener('DOMContentLoaded', () => {
    const steamWidget = document.getElementById('steam-widget');
    const steamEndpoint = '/api/steam/currently-playing';

    const renderSteamStatus = async () => {
        if (!steamWidget) return;

        try {
            const response = await fetch(steamEndpoint);
            if (!response.ok) {
                steamWidget.innerHTML = `<h2>Steam Status</h2><p>Could not load Steam data.</p>`;
                return;
            }

            const data = await response.json();
            const games = data.response?.games;

            // The Steam API returns a list of recently played games.
            // The first game in the list with a 'playtime_2weeks' property is often the most recent or current one.
            // If 'playtime_forever' is greater than 'playtime_2weeks', it's a good indicator.
            // A more reliable method requires checking the user's profile status, which is more complex.
            // For this widget, we'll display the most recently played game.
            
            if (games && games.length > 0) {
                const mostRecentGame = games[0];
                const gameName = mostRecentGame.name;
                const gameIconUrl = `https://media.steampowered.com/steamcommunity/public/images/apps/${mostRecentGame.appid}/${mostRecentGame.img_icon_url}.jpg`;
                const hoursPlayed = (mostRecentGame.playtime_forever / 60).toFixed(1);

                steamWidget.innerHTML = `
                    <h2>Recently on Steam</h2>
                    <div class="steam-game">
                        <img src="${gameIconUrl}" alt="Icon for ${gameName}">
                        <div class="steam-game-info">
                            <h3>${gameName}</h3>
                            <p>${hoursPlayed} hours played</p>
                        </div>
                    </div>
                `;
            } else {
                steamWidget.innerHTML = `<h2>Recently on Steam</h2><p>No recent games played.</p>`;
            }
        } catch (error) {
            console.error('Error rendering Steam status:', error);
            steamWidget.innerHTML = `<h2>Steam Status</h2><p>Could not load Steam data.</p>`;
        }
    };

    renderSteamStatus();
    // Refresh every 5 minutes as Steam data doesn't change as frequently
    setInterval(renderSteamStatus, 300000); 
});
