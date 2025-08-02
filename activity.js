document.addEventListener('DOMContentLoaded', function() {
    const activityWidget = document.getElementById('activity-widget');
    if (!activityWidget) return;
    const activityText = activityWidget.querySelector('p');

    async function fetchActivity() {
        try {
            const response = await fetch('/api/activity');
            if (response.ok) {
                const data = await response.json();
                activityText.textContent = data.text;
            } else {
                activityText.textContent = 'Could not load activity.';
            }
        } catch (error) {
            console.error('Error fetching activity:', error);
            activityText.textContent = 'Could not load activity.';
        }
    }

    fetchActivity();
    setInterval(fetchActivity, 5000);
});
