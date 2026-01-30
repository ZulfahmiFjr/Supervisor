const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// config Env dari PHP
const WEB_PORT = Number(process.env.ATLAS_WEB_PORT || 8080);
const WS_PORT = Number(process.env.ATLAS_WS_PORT || 27095);
const BIND_HOST = process.env.ATLAS_BIND_HOST || "0.0.0.0";

console.log(`[Supervisor] Starting on ${BIND_HOST}...`);

// setup HTTP Server buat serving file Web Dashboard
const server = http.createServer((req, res) => {
    // basic static file serving logic
    // di mode production nanti serve folder dist hasil build Vite
    // skarang serve simple response dulu biar gak error 404
    // let filePath = '.' + req.url;
    // if (filePath === './') filePath = './index.html';

    let urlPath = req.url.split('?')[0]; // hapus query string
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(__dirname, 'dist', urlPath);
    const extname = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
    }[extname] || 'application/octet-stream';
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code === 'ENOENT') {
                // halaman 404
                console.log(`[Web] 404 Not Found: ${urlPath}`);
                res.writeHead(404);
                res.end('404 Not Found (Run "npm run dev" for Vite development)');
            } else {
                res.writeHead(500);
                res.end('Internal Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(WEB_PORT, BIND_HOST, () => {
    console.log(`[Web] Server running at http://${BIND_HOST}:${WEB_PORT}/`);
});

// setup WebSocket Server, buat komunikasi sama Atlas
const wss = new WebSocket.Server({ host: BIND_HOST, port: WS_PORT });

console.log(`[WS] WebSocket listening on ws://${BIND_HOST}:${WS_PORT}`);

// store clients
let serverClient = null; // koneksi dari PocketMine (PHP)
let viewers = []; // koneksi dari Browser (Dashboard)

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const packet = JSON.parse(message);
            handlePacket(ws, packet);
        } catch (e) {
            console.error("Invalid JSON:", e.message);
        }
    });

    ws.on('close', () => {
        if (ws === serverClient) {
            console.log("[WS] Server (PHP) disconnected");
            serverClient = null;
        } else {
            viewers = viewers.filter(v => v !== ws);
        }
    });
});

function handlePacket(ws, packet) {
    const { type, body } = packet;
    // login logic
    if (type === 'login.server') {
        serverClient = ws;
        console.log(`[Auth] Server connected: ${body.name}`);
        // kirim status true
        ws.send(JSON.stringify({ 
            type: 'login.server', 
            body: { status: true, message: "Connected to Supervisor" } 
        }));
        return;
    }
    if (type === 'login.viewer') {
        viewers.push(ws);
        console.log(`[Auth] New viewer connected`);
        ws.send(JSON.stringify({ type: 'login.viewer', body: { status: true } }));
        // kirim info server terkini ke viewer baru
        if (serverClient && lastServerInfo) {
             ws.send(JSON.stringify({ type: 'info', body: lastServerInfo }));
        }
        return;
    }
    // routing logic, kalo dari server (PHP) -> broadcast ke semua viewer (Browser)
    if (ws === serverClient) {
        broadcastToViewers(packet); // forward paket mentah
    } 
    // kalo dari viewer (Browser) -> kirim ke server (PHP)
    else {
        if (serverClient) {
            serverClient.send(JSON.stringify(packet));
        }
    }
}

function broadcastToViewers(data) {
    const msg = JSON.stringify(data);
    viewers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

// keep track info server buat viewer yg baru join
let lastServerInfo = null;