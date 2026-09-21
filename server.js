'use strict';

import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import fs from 'fs';
import multer from 'multer';
import QRCode from 'qrcode';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// ============================================================
// PATH SETUP
// ============================================================

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// ============================================================
// APP
// ============================================================

const app = express();

const server = http.createServer(app);

const io = new Server(server);

const PORT = 3000;

// ============================================================
// UPLOAD DIRECTORY
// ============================================================

const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, {
    recursive: true,
  });
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  express.json({
    limit: '10mb',
  }),
);

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static(UPLOAD_DIR));

// ============================================================
// MULTER
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, UPLOAD_DIR);
  },

  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');

    const uniqueName =
      Date.now() +
      '-' +
      Math.random().toString(36).substring(2, 10) +
      '-' +
      safeName;

    callback(null, uniqueName);
  },
});

const upload = multer({
  storage,
});

// ============================================================
// DEVICES
// ============================================================

const devices = new Map();

// ============================================================
// GET LAN IP
// ============================================================

function getLanIp() {
  const interfaces = os.networkInterfaces();

  for (const interfaceName in interfaces) {
    const networks = interfaces[interfaceName];

    for (const network of networks) {
      if (network.family === 'IPv4' && !network.internal) {
        return network.address;
      }
    }
  }

  return '127.0.0.1';
}

// ============================================================
// BROADCAST DEVICES
// ============================================================

function broadcastDevices() {
  const connectedDevices = Array.from(devices.entries()).map(
    ([id, device]) => ({
      id: id,
      name: device.name,
      connectedAt: device.connectedAt,
    }),
  );

  console.log('Connected devices:', connectedDevices);

  io.emit('devices', connectedDevices);
}

// ============================================================
// SOCKET.IO
// ============================================================

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // --------------------------------------------------------
  // REGISTER DEVICE
  // --------------------------------------------------------

  socket.on('register', (data = {}) => {
    const deviceId = data.deviceId;

    const name = data.name;

    console.log('REGISTER REQUEST:', {
      deviceId,
      name,
    });

    if (!deviceId || deviceId === 'null' || deviceId === 'undefined') {
      console.log('Invalid device ID');

      return;
    }

    const existing = devices.get(deviceId);

    if (existing) {
      existing.socketId = socket.id;

      existing.name = name || 'Unknown Device';

      existing.connectedAt = new Date().toISOString();
    } else {
      devices.set(deviceId, {
        socketId: socket.id,

        name: name || 'Unknown Device',

        connectedAt: new Date().toISOString(),
      });
    }

    socket.data.deviceId = deviceId;

    console.log(
      'Device registered:',
      name || 'Unknown Device',
      '(ID:',
      deviceId,
      ')',
    );

    broadcastDevices();
  });

  // --------------------------------------------------------
  // SEND TEXT
  // --------------------------------------------------------

  socket.on('send-text', (data = {}) => {
    const targetId = data.targetId;

    const text = data.text;

    console.log('SEND TEXT:', {
      targetId,
      text,
    });

    if (!targetId) {
      console.log('Missing targetId');

      return;
    }

    const target = devices.get(targetId);

    if (!target) {
      console.log('Target device not found:', targetId);

      socket.emit('transfer-error', {
        type: 'text',

        message: 'Target device is no longer connected.',
      });

      return;
    }

    const senderId = socket.data.deviceId;

    const sender = devices.get(senderId);

    io.to(target.socketId).emit('receive-text', {
      senderId: senderId,

      senderName: sender ? sender.name : 'Unknown Device',

      text: text,

      receivedAt: new Date().toISOString(),
    });

    console.log('Text delivered to:', targetId);
  });

  // --------------------------------------------------------
  // DISCONNECT
  // --------------------------------------------------------

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', socket.id, reason);

    const deviceId = socket.data.deviceId;

    if (!deviceId) {
      return;
    }

    const device = devices.get(deviceId);

    if (device && device.socketId === socket.id) {
      devices.delete(deviceId);

      broadcastDevices();
    }
  });
});

// ============================================================
// FILE UPLOAD
// ============================================================

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    console.log('FILE UPLOAD REQUEST');

    console.log('Body:', req.body);

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    const targetId = req.body.targetId;

    const senderId = req.body.senderId;

    const senderName = req.body.senderName;

    if (!targetId) {
      return res.status(400).json({
        error: 'Missing targetId',
      });
    }

    const target = devices.get(targetId);

    if (!target) {
      return res.status(404).json({
        error: 'Target device not connected',
      });
    }

    const downloadUrl = '/uploads/' + encodeURIComponent(req.file.filename);

    console.log('File saved:', req.file.filename);

    io.to(target.socketId).emit('receive-file', {
      senderId: senderId || 'unknown',

      senderName: senderName || 'Unknown Device',

      fileName: req.file.originalname,

      fileSize: req.file.size,

      mimeType: req.file.mimetype,

      downloadUrl: downloadUrl,

      receivedAt: new Date().toISOString(),
    });

    console.log('File notification sent to:', targetId);

    return res.json({
      success: true,

      fileName: req.file.originalname,

      fileSize: req.file.size,

      downloadUrl: downloadUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);

    return res.status(500).json({
      error: 'File upload failed',
    });
  }
});

// ============================================================
// SERVER INFO / QR
// ============================================================

app.get('/api/info', (req, res) => {
  const ip = getLanIp();

  const url = 'http://' + ip + ':' + PORT;

  console.log('QR URL:', url);

  QRCode.toDataURL(
    url,
    {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
    },
    (error, qrDataUrl) => {
      if (error) {
        console.error('QR generation error:', error);

        return res.status(500).json({
          error: 'Failed to generate QR code',
        });
      }

      res.json({
        ip: ip,
        port: PORT,
        url: url,
        qrDataUrl: qrDataUrl,
      });
    },
  );
});

// ============================================================
// EXPRESS 5 FALLBACK
// ============================================================

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// START SERVER
// ============================================================

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLanIp();

  console.log('');
  console.log('====================================');

  console.log('          NearDrop Server');

  console.log('====================================');

  console.log('Local:   http://localhost:' + PORT);

  console.log('Network: http://' + ip + ':' + PORT);

  console.log('====================================');

  console.log('');
});
