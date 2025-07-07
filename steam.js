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
    setInterval(renderSteamStatus, 300000); 
});
