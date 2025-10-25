const socket = io();

let startTime = 0;

socket.on('stats', (stats) => {
    // Update status
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    statusText.textContent = stats.status;
    
    if (stats.status === 'Connected' || stats.status === 'In-Game') {
        statusDot.classList.add('connected');
    } else {
        statusDot.classList.remove('connected');
    }
    
    // Update stats
    if (stats.uptime > 0 && startTime === 0) {
        startTime = stats.uptime;
    }
    
    if (startTime > 0) {
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('uptime').textContent = formatUptime(uptime);
    }
    
    document.getElementById('memory').textContent = stats.memory + ' MB';
    document.getElementById('following').textContent = stats.following ? 'Yes' : 'No';
    document.getElementById('reconnectAttempts').textContent = stats.reconnectAttempts;
});

socket.on('chat', (messages) => {
    const chatBox = document.getElementById('chatBox');
    
    if (messages.length === 0) {
        chatBox.innerHTML = '<p class="chat-empty">No messages yet...</p>';
        return;
    }
    
    chatBox.innerHTML = messages.map(msg => `
        <div class="chat-message">
            <span class="chat-timestamp">${msg.timestamp}</span>
            <span>${msg.message}</span>
        </div>
    `).join('');
    
    chatBox.scrollTop = chatBox.scrollHeight;
});

async function sendCommand(command) {
    try {
        const response = await fetch('/api/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        
        const data = await response.json();
        console.log(data.message);
    } catch (err) {
        console.error('Command error:', err);
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    try {
        await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        input.value = '';
    } catch (err) {
        console.error('Chat error:', err);
    }
}

function handleChatKey(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
      }
