const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// config Env dari PHP
const WEB_PORT = Number(process.env.ATLAS_WEB_PORT || 8080);
const WS_PORT = Number(process.env.ATLAS_WS_PORT || 27095);
const ATLAS_HOST = process.env.ATLAS_HOST || "127.0.0.1";
const ATLAS_BIND_HOST = process.env.ATLAS_BIND_HOST || "0.0.0.0";
const DATA_FILE = path.join(__dirname, "map_data.json"); // File penyimpanan

// HTTP server (8080) serve ke /config.json
const server = http.createServer((req, res) => {
    const urlPath = (req.url || "/").split("?")[0];
    // endpoint buat proxy vite + runtime
    if (urlPath === "/config.json") {
        const payload = JSON.stringify({
            host: ATLAS_HOST,
            bindHost: ATLAS_BIND_HOST,
            wsPort: WS_PORT,
            webPort: WEB_PORT,
        });
        res.writeHead(200, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
        });
        res.end(payload);
        return;
    }
    // buat cek health
    if (urlPath === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        res.end("ok");
        return;
    }
    // buat serve file production build dari ./dist, kalo dist ga ada biarin 404
    let fileRel = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.join(__dirname, "dist", fileRel);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end('404 Not Found (Run "npm run dev" for Vite development)');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType =
            ext === ".html" ? "text/html" :
            ext === ".js" ? "text/javascript" :
            ext === ".css" ? "text/css" :
            ext === ".json" ? "application/json" :
            ext === ".png" ? "image/png" :
            ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
            "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    });
});
server.listen(WEB_PORT, ATLAS_BIND_HOST, () => {
    console.log(`[Supervisor] Web: http://${ATLAS_HOST}:${WEB_PORT}`);
    console.log(`[Supervisor] Config: http://${ATLAS_HOST}:${WEB_PORT}/config.json`);
    console.log(`[Supervisor] Health: http://${ATLAS_HOST}:${WEB_PORT}/health`);
});
// WebSocket server (27095), buat komunikasi Atlas (PHP) <-> Viewer (Browser)
const wss = new WebSocket.Server({ host: ATLAS_BIND_HOST, port: WS_PORT });
console.log(`[Supervisor] WS: ws://${ATLAS_HOST}:${WS_PORT}`);
// store clients
let serverClient = null; // koneksi dari Atlas/PocketMine
let viewers = []; // koneksi dari Browser
let lastServerInfo = null;
// cache map data biar gak terus terusan dikirim ulang
const mapCache = new Map();

// buat load data pas start
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        console.log("[System] Found saved map data, loading...");
        try {
            const raw = fs.readFileSync(DATA_FILE, "utf-8");
            const data = JSON.parse(raw);
            // convert array kembali ke map
            data.forEach(entry => {
                if(entry && entry.chunk) { // validasi dikit
                     const key = `${entry.chunk.x}:${entry.chunk.z}`;
                     mapCache.set(key, entry.chunk);
                }
            });
            console.log(`[System] Loaded ${mapCache.size} chunks from disk.`);
        } catch (e) {
            console.error("[System] Failed to load data:", e.message);
        }
    }
}

// buat save data snapshot
function saveData() {
    if (mapCache.size === 0) return;
    console.log(`[System] Saving ${mapCache.size} chunks to disk...`);
    try {
        // convert map ke array biar bisa dijsonin, simpen valuenya aja
        const data = Array.from(mapCache.values()).map(chunk => ({ chunk })); 
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
        console.log("[System] Save complete.");
    } catch (e) {
        console.error("[System] Failed to save data:", e.message);
    }
}

// load data pas script jalan pertama kali
loadData();
// autosave tiap 5 menit, biar kalo crash gak ilang semua
setInterval(saveData, 5 * 60 * 1000);

// save pas proses dimatiin (ctrl+c atau command stop)
if (process.platform === "win32") {
    const rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.on("SIGINT", () => {
        process.emit("SIGINT");
    });
}
process.on('SIGINT', () => {
    console.log("\n[System] Stopping...");
    saveData();
    process.exit();
});
process.on('SIGTERM', () => {
    saveData();
    process.exit();
});

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      const packet = JSON.parse(message);
      handlePacket(ws, packet);
    } catch (e) {
      console.error("[WS] Invalid JSON:", e.message);
    }
  });
  ws.on("close", () => {
    if (ws === serverClient) {
      console.log("[WS] Server (PHP) disconnected");
      serverClient = null;
    } else {
      viewers = viewers.filter((v) => v !== ws);
    }
  });
});

// handle packet dari client (server atau viewer)
function handlePacket(ws, packet) {
    const { type, body } = packet;
    // login logic
    if (type === "login.server") {
        serverClient = ws;
        console.log(`[Auth] Server connected: ${body?.name || "unknown"}`);
        // kirim status true
        ws.send(JSON.stringify({
            type: "login.server",
            body: { status: true, message: "Connected to Supervisor" },
        }));
        return;
    }
    if (type === "login.viewer") {
        viewers = viewers.filter(v => v !== ws);
        viewers.push(ws);
        console.log("[Auth] New viewer connected");
        ws.send(JSON.stringify({ type: "login.viewer", body: { status: true } }));
        // kirim info server terkini ke viewer baru
        if (serverClient && lastServerInfo) {
            ws.send(JSON.stringify({ type: "info", body: lastServerInfo }));
        }
        // sync cached map
        if (mapCache.size > 0) {
            console.log(`[Sync] Sending ${mapCache.size} chunks to new viewer...`);
            syncMapToViewer(ws);
        }
        return;
    }
    // server -> viewer
    if (ws === serverClient) {
        if (type === "info") lastServerInfo = body || null;
        // simpen ke otak supervisor sebelum dibroadcast
        if (type === "chunk" && body.chunk) {
            const key = `${body.chunk.x}:${body.chunk.z}`;
            mapCache.set(key, body.chunk);
        }
        broadcastToViewers(packet);
        return;
    }
    // viewer -> server
    if (serverClient) {
        serverClient.send(JSON.stringify(packet));
    }
}

// biar browser gak not responding kalo nerima 5000 chunk sekaligus
function syncMapToViewer(ws) {  
    const chunks = Array.from(mapCache.values());
    const BATCH_SIZE = 50; // kirim 50 chunk per paket
    let index = 0;
    function sendNextBatch() {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (index >= chunks.length) return;
        const batch = chunks.slice(index, index + BATCH_SIZE);
        // bungkus dalem packet sector (bulk chunks), gak pake base64 karna boros CPU jadi better kirim raw JSON array
        const packet = JSON.stringify({
            type: "sector",
            body: { chunks: batch } 
        });
        ws.send(packet);
        index += BATCH_SIZE;
        // pake setImmediate biar event loop Node.js nafas dulu
        setImmediate(sendNextBatch);
    }

    sendNextBatch();
}

function broadcastToViewers(data) {
    const msg = JSON.stringify(data);
    viewers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
        }
    });
}
