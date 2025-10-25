import { createClient } from 'bedrock-protocol';
import dotenv from 'dotenv';
dotenv.config();

// Your server configuration
const BOT_CONFIG = {
  host: 'bigahas443-89hG.aternos.me',
  port: 22665,
  username: process.env.BOT_USERNAME || 'BedrockBot_' + Math.floor(Math.random() * 1000),
  offline: true, // For cracked/non-Xbox auth servers
  version: '1.21.114' // Your Bedrock version
};

let client;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50;
let isFollowing = false;
let followTarget = null;
let followInterval = null;

// Memory monitoring
function logMemoryUsage() {
  const usage = process.memoryUsage();
  console.log(`[MEMORY] RSS: ${(usage.rss / 1024 / 1024).toFixed(2)}MB | Heap: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
}

// Create bot connection
function createBedrockBot() {
  console.log(`[BEDROCK] Connecting to server (Attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
  console.log(`[INFO] Server: ${BOT_CONFIG.host}:${BOT_CONFIG.port}`);
  console.log(`[INFO] Version: ${BOT_CONFIG.version}`);
  
  try {
    client = createClient(BOT_CONFIG);
    
    // Connection successful
    client.on('join', () => {
      console.log('[SUCCESS] Bot joined the server!');
      reconnectAttempts = 0;
      
      // Start behaviors
      startAFKMovement();
      startPlayerFollowing();
      
      // Memory monitoring every 5 minutes
      setInterval(logMemoryUsage, 300000);
      
      // Send chat message
      setTimeout(() => {
        sendChat('Bot active! Ready to assist.');
      }, 2000);
    });
    
    // Spawn event
    client.on('spawn', () => {
      console.log('[SPAWN] Bot spawned in world');
    });
    
    // Chat handler
    client.on('text', (packet) => {
      if (packet.type === 'chat' && packet.message) {
        console.log(`[CHAT] ${packet.message}`);
        
        // Extract username and message
        const match = packet.message.match(/<(.+?)> (.+)/);
        if (match) {
          const username = match[1];
          const message = match[2];
          
          // /stop command
          if (message === '/stop') {
            stopFollowing();
            console.log(`[COMMAND] ${username} stopped the bot`);
          }
          
          // /teamup command - Crouch gesture
          if (message === '/teamup') {
            performTeamupGesture();
            console.log(`[COMMAND] ${username} requested teamup gesture`);
          }
          
          // !status command
          if (message === '!status') {
            sendChat(`Following: ${isFollowing ? 'Yes' : 'No'}`);
          }
          
          // !memory command
          if (message === '!memory') {
            const usage = process.memoryUsage();
            sendChat(`RAM: ${(usage.heapUsed / 1024 / 1024).toFixed(1)}MB / 450MB`);
          }
        }
      }
    });
    
    // Error handler
    client.on('error', (err) => {
      console.error('[ERROR]', err.message || err.code);
      if (err.message && err.message.includes('ECONNRESET')) {
        console.log('[TIP] Check if Aternos server is online');
      }
    });
    
    // Disconnect handler
    client.on('disconnect', (packet) => {
      console.log('[DISCONNECT]', packet?.message || 'Connection closed');
      stopFollowing();
      handleReconnect();
    });
    
    // Close handler
    client.on('close', () => {
      console.log('[CLOSE] Connection closed');
      stopFollowing();
      handleReconnect();
    });
    
  } catch (err) {
    console.error('[FATAL]', err.message);
    handleReconnect();
  }
}

// Send chat message
function sendChat(message) {
  try {
    if (client && client.queue) {
      client.queue('text', {
        type: 'chat',
        needs_translation: false,
        source_name: client.username,
        message: message,
        xuid: '',
        platform_chat_id: ''
      });
    }
  } catch (err) {
    console.error('[CHAT ERROR]', err.message);
  }
}

// Anti-AFK movement
function startAFKMovement() {
  let moveInterval;
  
  moveInterval = setInterval(() => {
    if (!client || !client.entityId || isFollowing) return;
    
    try {
      // Send movement packet to prevent AFK kick
      client.queue('move_player', {
        runtime_id: client.entityId,
        position: {
          x: (Math.random() - 0.5) * 2,
          y: 0,
          z: (Math.random() - 0.5) * 2
        },
        pitch: Math.random() * 90 - 45,
        yaw: Math.random() * 360,
        head_yaw: Math.random() * 360,
        mode: 'normal',
        on_ground: true,
        riding_eid: 0n,
        tick: BigInt(Date.now())
      });
      
      console.log('[AFK MOVEMENT] Moving around');
    } catch (err) {
      console.error('[MOVEMENT ERROR]', err.message);
    }
  }, Math.random() * 15000 + 45000); // 45-60 seconds
  
  // Cleanup
  client.once('close', () => {
    if (moveInterval) clearInterval(moveInterval);
    if (followInterval) clearInterval(followInterval);
  });
}

// Player following (basic implementation for Bedrock)
function startPlayerFollowing() {
  followInterval = setInterval(() => {
    if (!client || !client.entityId) return;
    
    // Note: Bedrock protocol has limited entity tracking
    // This is a simplified version
    // You may need additional packets to track nearby players
    
  }, 2000);
}

// Stop following
function stopFollowing() {
  if (!isFollowing) return;
  
  isFollowing = false;
  followTarget = null;
  console.log('[FOLLOW] Stopped following');
}

// Teamup gesture - Crouch 6-7 times
async function performTeamupGesture() {
  if (!client || !client.entityId) return;
  
  console.log('[TEAMUP] Performing crouch gesture...');
  
  const crouchCount = 6 + Math.floor(Math.random() * 2);
  const crouchDelay = 150;
  
  try {
    for (let i = 0; i < crouchCount; i++) {
      // Crouch down
      client.queue('player_action', {
        runtime_id: client.entityId,
        action: 'start_sneak',
        position: { x: 0, y: 0, z: 0 },
        face: 0
      });
      
      await sleep(crouchDelay);
      
      // Stand up
      client.queue('player_action', {
        runtime_id: client.entityId,
        action: 'stop_sneak',
        position: { x: 0, y: 0, z: 0 },
        face: 0
      });
      
      await sleep(crouchDelay);
    }
    
    console.log(`[TEAMUP] Gesture completed (${crouchCount} crouches)`);
  } catch (err) {
    console.error('[TEAMUP ERROR]', err.message);
  }
}

// Helper sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle reconnection
function handleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('[FATAL] Max reconnection attempts reached. Exiting...');
    process.exit(1);
  }
  
  reconnectAttempts++;
  const delay = Math.min(reconnectAttempts * 5000, 60000);
  
  console.log(`[RECONNECT] Retrying in ${delay / 1000} seconds...`);
  
  setTimeout(() => {
    createBedrockBot();
  }, delay);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Shutting down gracefully...');
  if (client) {
    try {
      client.close();
    } catch (err) {
      // Ignore errors on shutdown
    }
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Shutting down gracefully...');
  if (client) {
    try {
      client.close();
    } catch (err) {
      // Ignore errors on shutdown
    }
  }
  process.exit(0);
});

// Start the bot
console.log('[STARTUP] Bedrock bot starting up...');
logMemoryUsage();
createBedrockBot();
