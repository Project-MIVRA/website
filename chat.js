document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  function appendMessage(message, isLocal = false) {
    if (!chatContainer) return;
    const p = document.createElement("p");
    p.textContent = message;
    p.style.margin = "4px 0";
    if (isLocal) p.style.color = "#f0f"; // System/local message color
    chatContainer.appendChild(p);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll to bottom
  }

  function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg || !socket || socket.readyState !== 1) return;

    // --- Command Handling (Client-side) ---
    if (msg.startsWith("/login ")) {
      const parts = msg.split(" ");
      if (parts[1]) {
        setCookie("chatHash", parts[1], 30); // Save hash in a cookie
        appendMessage("[System] Login hash manually set.", true);
      }
      chatInput.value = ""; // Clear input after handling
      return; // Stop message from being sent to chat
    }

    // Send chat message to WebSocket server
    socket.send(JSON.stringify({
      type: "chat",
      message: msg
    }));
    chatInput.value = ""; // Clear input after sending
  }

  // --- Cookie Helper Functions ---
  function setCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
  }

  function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=');
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
  }

  function generateGuestName() {
    return 'Guest' + Math.floor(Math.random() * 900000 + 100000);
  }

  // --- WebSocket Connection Logic ---
  const MAX_RECONNECT_DELAY = 30000; // Max delay 30 seconds
  let reconnectDelay = 1000; // Initial delay 1 second
  let socket;

  function connect() {
    // Establish connection to the WebSocket server
    socket = new WebSocket('wss://ws.khauni.coffee:2053');

    socket.onopen = () => {
      console.log('WebSocket connection established');
      appendMessage("🟢 Connected to Khauni's Chatroom.", true);
      reconnectDelay = 1000; // Reset reconnect delay on successful connection

      const storedHash = getCookie('chatHash');
      const storedName = getCookie('chatName');

      // Authenticate with hash or set a guest name
      if (storedHash) {
        socket.send(JSON.stringify({ type: 'login_hash', hash: storedHash }));
      } else {
        let name = storedName;
        if (!name) {
          name = generateGuestName();
          setCookie('chatName', name, 365);
        }
        socket.send(JSON.stringify({ type: 'set_name', name }));
      }

      // Welcome messages
      appendMessage("💬 Your name is: restoring...", true);
      appendMessage("💬 do /setname to change it!", true);
      appendMessage("📘 Type /help for available commands.", true);
    };

    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        appendMessage(event.data); // Display raw message if not JSON
        return;
      }

      // Handle server ping
      if (data.type === 'ping' && typeof data.timestamp === 'number') {
        socket.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
        return;
      }

      // Handle incoming chat messages
      if (data.type === 'chat') {
        if (data.message && data.message.trim() !== '') {
          appendMessage(`${data.name}: ${data.message}`);
        }
      } else if (data.type === 'system') {
        appendMessage(`[System] ${data.message}`, true);
        // Update name cookie if server confirms a name change
        if (data.message?.startsWith("Name changed to '")) {
          const extracted = data.message.match(/Name changed to '(.+)'/);
          if (extracted && extracted[1]) {
            setCookie('chatName', extracted[1], 365);
          }
        }
        if (data.message?.startsWith("Your name has been set to:")) {
          const extracted = data.message.match(/Your name has been set to: (.+)/);
          if (extracted && extracted[1]) {
            setCookie('chatName', extracted[1], 365);
          }
        }
      }

      // Handle successful login
      if (data.type === 'login_success' && data.hashedPassword) {
        setCookie('chatHash', data.hashedPassword, 30);
        setCookie('chatName', data.name || 'User', 30);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket closed. Reconnecting in', reconnectDelay, 'ms');
      appendMessage("🔴 Disconnected from chat server.", true);
      // Attempt to reconnect with exponential backoff
      setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
        connect();
      }, reconnectDelay);
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      appendMessage("⚠️ WebSocket error.", true);
      socket.close(); // Ensure socket is closed on error to trigger onclose
    };
  }

  // --- Event Listeners ---
  chatSend?.addEventListener("click", sendMessage);
  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Initial connection attempt
  connect();
});
