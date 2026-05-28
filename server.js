const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// In-memory store: roomId -> { sharer: ws, viewers: Set<ws>, lastLocation: {...} }
const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));

// API: Create a new sharing room
app.get('/api/create-room', (req, res) => {
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  rooms.set(roomId, { sharer: null, viewers: new Set(), lastLocation: null });
  res.json({ roomId });
});

// Serve the app for any route
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket handler
wss.on('connection', (ws) => {
  let currentRoom = null;
  let role = null; // 'sharer' or 'viewer'

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    // --- JOIN as sharer ---
    if (msg.type === 'join-sharer') {
      const roomId = msg.roomId?.toUpperCase();
      if (!rooms.has(roomId)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Raum nicht gefunden' }));
        return;
      }
      currentRoom = roomId;
      role = 'sharer';
      rooms.get(roomId).sharer = ws;
      ws.send(JSON.stringify({ type: 'joined', role: 'sharer', roomId }));
    }

    // --- JOIN as viewer ---
    else if (msg.type === 'join-viewer') {
      const roomId = msg.roomId?.toUpperCase();
      if (!rooms.has(roomId)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Raum nicht gefunden. Bitte den Link erneut prüfen.' }));
        return;
      }
      currentRoom = roomId;
      role = 'viewer';
      rooms.get(roomId).viewers.add(ws);

      // Send last known location immediately
      const room = rooms.get(roomId);
      if (room.lastLocation) {
        ws.send(JSON.stringify({ type: 'location', ...room.lastLocation }));
      } else {
        ws.send(JSON.stringify({ type: 'waiting' }));
      }
      ws.send(JSON.stringify({ type: 'joined', role: 'viewer', roomId }));
    }

    // --- LOCATION UPDATE (from sharer) ---
    else if (msg.type === 'location' && role === 'sharer' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room) return;

      const locationData = {
        type: 'location',
        lat: msg.lat,
        lng: msg.lng,
        accuracy: msg.accuracy,
        battery: msg.battery || null,
        name: msg.name || 'Unbekannt',
        timestamp: new Date().toISOString(),
      };
      room.lastLocation = locationData;

      // Broadcast to all viewers
      room.viewers.forEach((viewer) => {
        if (viewer.readyState === 1) {
          viewer.send(JSON.stringify(locationData));
        }
      });
    }
  });

  ws.on('close', () => {
    if (!currentRoom || !rooms.has(currentRoom)) return;
    const room = rooms.get(currentRoom);
    if (role === 'sharer') {
      room.sharer = null;
      // Notify viewers that sharer disconnected
      room.viewers.forEach((v) => {
        if (v.readyState === 1) {
          v.send(JSON.stringify({ type: 'sharer-offline' }));
        }
      });
    } else if (role === 'viewer') {
      room.viewers.delete(ws);
    }
  });
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`\n✅ Server läuft auf http://localhost:${PORT}\n`);
});
