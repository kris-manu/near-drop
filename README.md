# NearDrop

A simple two-way local-network sharing app for sending:

- Files
- Photos
- Videos
- Documents
- Text
- Links

between a PC and phone on the same Wi-Fi network.

## Requirements

- Node.js 20+
- PC and phone connected to the same Wi-Fi/LAN

## Start

```bash
npm install
npm start
```

The terminal will show something like:

```text
NearDrop is running
PC:     http://localhost:3000
Phone:  http://192.168.1.25:3000
```

Open the LAN URL on the phone.

The app also displays a QR code that can be scanned from the phone.

## How it works

- Socket.IO handles device discovery, text messages and transfer notifications.
- HTTP handles file uploads/downloads.
- Files are stored temporarily under `data/uploads`.
- No cloud service is required.
- No automatic clipboard synchronization is used.

## Windows firewall

If the phone cannot connect, allow Node.js through Windows Defender Firewall for Private networks, or allow TCP port 3000.

## Current MVP limitation

Files are stored on the PC while they are available for download. There is no authentication/encryption yet, so use this only on a trusted LAN.

Recommended next features:

1. Device pairing/authentication
2. HTTPS or an authenticated local transport
3. File expiration/cleanup
4. Better transfer progress on the receiving device
5. Native Android app
6. mDNS device discovery
7. Windows tray application
