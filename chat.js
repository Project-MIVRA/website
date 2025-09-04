document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send'); // Re-added the send button element
  const chatModeSelect = document.getElementById('chat-mode');

  // --- Input History ---
  let messageHistory = [];
  let historyIndex = -1;

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

    if (chatModeSelect.value === 'discord') {
      socket.send(msg);
      appendMessage(`You: ${msg}`); // Echo message locally
      chatInput.value = "";
      // Add to history
      if (messageHistory.length === 0 || messageHistory[messageHistory.length - 1] !== msg) {
          messageHistory.push(msg);
      }
      historyIndex = messageHistory.length;
      return;
    }

    // --- Command Handling (Client-side) for Global Chat ---
    if (msg.startsWith("/login ")) {
      const parts = msg.split(" ");
      if (parts[1]) {
        setCookie("chatHash", parts[1], 30); // Save hash in a cookie
        appendMessage("[System] Login hash manually set.", true);
      }
      chatInput.value = ""; // Clear input after handling
      return; // Stop message from being sent to chat
    }

    // Add to history if it's not a duplicate of the last message
    if (messageHistory.length === 0 || messageHistory[messageHistory.length - 1] !== msg) {
        messageHistory.push(msg);
    }
    historyIndex = messageHistory.length; // Reset history index

    // Send chat message to WebSocket server for Global Chat
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

  function connectDiscordBridge() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    socket = new WebSocket(`${protocol}//${host}`);

    socket.onopen = () => {
      console.log('Discord bridge WebSocket connection established');
      appendMessage("🟢 Connected to Discord Bridge.", true);
      reconnectDelay = 1000;
    };

    socket.onmessage = (event) => {
      appendMessage(event.data);
    };

    socket.onclose = () => {
      console.log('Discord bridge WebSocket closed. Reconnecting in', reconnectDelay, 'ms');
      appendMessage("🔴 Disconnected from Discord bridge.", true);
      setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
          connectDiscordBridge(); // Reconnect to discord bridge
      }, reconnectDelay);
    };
    
    socket.onerror = (err) => {
        console.error('Discord bridge WebSocket error:', err);
        appendMessage("⚠️ Discord bridge WebSocket error.", true);
        socket.close();
    };
  }

  function connectGlobalChat() {
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
        // Attempt to parse the incoming message data as JSON
        data = JSON.parse(event.data);
      } catch (error) {
        // If parsing fails, it's not in the expected format.
        return; // Stop processing this message
      }

      // Handle server ping
      if (data.type === 'ping' && typeof data.timestamp === 'number') {
        socket.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
        return;
      }

      // Handle incoming chat messages
      if (data.type === 'chat') {
        const originalMessage = data.message;
        // Regex to find TTS commands like [:t329,500]
        const ttsRegex = /\[:t\d+,\d+\]/g;
        
        // Check if the message contains TTS commands
        const containedTts = ttsRegex.test(originalMessage);
        
        // Clean the message by removing the TTS commands
        const cleanedMessage = originalMessage.replace(ttsRegex, '').trim();

        // Determine the display name based on whether TTS commands were present
        const displayName = containedTts ? `${data.name} (TTS)` : data.name;

        // If there's text left after cleaning, display it.
        if (cleanedMessage) {
          appendMessage(`${displayName}: ${cleanedMessage}`);
        } 
        // Otherwise, if the original message had TTS tones but no other text, show a placeholder.
        else if (containedTts) {
          appendMessage(`${displayName}: [TTS Tones]`);
        }
        // If the message was empty to begin with, it will be ignored.

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
        connectGlobalChat();
      }, reconnectDelay);
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      appendMessage("⚠️ WebSocket error.", true);
      socket.close(); // Ensure socket is closed on error to trigger onclose
    };
  }

  function connect() {
    if (socket) {
      socket.onclose = null; // Prevent automatic reconnection
      socket.close();
    }
    chatContainer.innerHTML = ''; // Clear chat on mode switch
    reconnectDelay = 1000; // Reset reconnect delay

    if (chatModeSelect.value === 'global') {
      connectGlobalChat();
    } else {
      connectDiscordBridge();
    }
  }

  // --- Event Listeners ---
  chatModeSelect?.addEventListener('change', connect);
  chatSend?.addEventListener("click", sendMessage);
  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault(); // Prevent default action
        sendMessage();
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            chatInput.value = messageHistory[historyIndex];
        }
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex < messageHistory.length - 1) {
            historyIndex++;
            chatInput.value = messageHistory[historyIndex];
        } else {
            // If at the end of history, clear the input
            historyIndex = messageHistory.length;
            chatInput.value = "";
        }
    }
  });

  // Initial connection attempt
  connect();
});
