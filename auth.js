// Google OAuth configuration
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

async function authWithGoogle() {
    // Implement Google OAuth flow
    const provider = new google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'profile email',
        callback: (response) => {
            if (response.access_token) {
                handleGoogleAuth(response.access_token);
            }
        },
    });
    provider.requestAccessToken();
}

async function handleGoogleAuth(accessToken) {
    try {
        const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: accessToken }),
        });

        if (response.ok) {
            const data = await response.json();
            updateAuthState(data.user);
            window.location.href = '/';
        } else {
            console.error('Google authentication failed');
        }
    } catch (error) {
        console.error('Error during Google authentication:', error);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const data = await response.json();
            updateAuthState(data.user);
            window.location.href = '/';
        } else {
            console.error('Login failed');
        }
    } catch (error) {
        console.error('Error during login:', error);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const data = await response.json();
            updateAuthState(data.user);
            window.location.href = '/';
        } else {
            console.error('Signup failed');
        }
    } catch (error) {
        console.error('Error during signup:', error);
    }
}

function updateAuthState(user) {
    const loginBox = document.getElementById('loginBox');
    if (user) {
        loginBox.innerHTML = `
            <div class="profile-section">
                <img src="${user.profilePic || '/Assets/default-profile.png'}" class="profile-pic" alt="Profile">
                <span>${user.username}</span>
                <button onclick="logout()">Logout</button>
            </div>
        `;
    } else {
        loginBox.innerHTML = `
            <button onclick="window.location.href='/login'">Login</button>
            <button onclick="window.location.href='/signup'">Sign Up</button>
            <button onclick="authWithGoogle()">Google</button>
        `;
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        updateAuthState(null);
        window.location.href = '/';
    } catch (error) {
        console.error('Error during logout:', error);
    }
}

// Check auth state on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const user = await response.json();
            updateAuthState(user);
        }
    } catch (error) {
        console.error('Error checking auth state:', error);
    }
});
