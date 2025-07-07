// website/clock.js
document.addEventListener('DOMContentLoaded', () => {
    const clockElement = document.getElementById('clock-widget-time');

    function updateClock() {
        if (!clockElement) return;
        const now = new Date();
        // Using toLocaleTimeString for a standard, localized time format
        clockElement.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Update the clock immediately and then every second
    updateClock();
    setInterval(updateClock, 1000);
});
