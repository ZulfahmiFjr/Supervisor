const fs = require("fs");
const WebSocket = require('ws');
const os = require("os");

const logger = require('./utils/logger.js');
const Supervisor = require('./supervisor.js');
const Packet = require('./network/packet.js');
const Input = require('./command/input.js');

/*
 * Setup the Http server to serve web view and associated assets
 */
// const express = require("express");

// const app = express();

// app.use(express.static("web"));
// app.use('/skins', express.static("skins"));
// app.use('/assets', express.static('web/assets'));

// app.get("/", (req, res) => {
//     res.sendFile(__dirname + "/web/index.html")
// });

const http = require("node:http");
const path = require("node:path");
const fsp = require("node:fs/promises");

// root folder supervisor (src/..)
const ROOT = path.resolve(__dirname, "..");
const WEB_ROOT = path.join(ROOT, "web");
const SKINS_ROOT = path.join(ROOT, "skins");
const ASSETS_ROOT = path.join(WEB_ROOT, "assets");

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".map": "application/json; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf"
};

const WEB_PORT = Number(process.env.ATLAS_WEB_PORT ?? 8080);
const WS_PORT = Number(process.env.ATLAS_WS_PORT ?? 27095);
const BIND_HOST = String(process.env.ATLAS_BIND_HOST ?? "0.0.0.0"); // buat akses LAN dari HP

// kirim ke frontend supaya tau port WS dan info lain kalo perlu
const DASH_CONFIG = {
  wsPort: WS_PORT,
  webPort: WEB_PORT
};

function safeResolve(baseDir, urlPath) {
    // urlPath: "/assets/a.css" -> rel "a.css"
    const rel = urlPath.replace(/^\/+/, "");
    const full = path.resolve(baseDir, rel);
    // prevent path traversal
    const base = path.resolve(baseDir) + path.sep;
    if (!full.startsWith(base)) return null;
    return full;
}

async function sendFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
    // stream file
    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
        res.statusCode = 500;
        res.end("Internal Server Error");
    });
    stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
    try {
        const u = new URL(req.url ?? "/", "http://localhost");
        const pathname = decodeURIComponent(u.pathname);
        // dashboard config
        if (pathname === "/config.json") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.end(JSON.stringify(DASH_CONFIG));
            return;
        }
        // routing static
        let baseDir = WEB_ROOT;
        let subPath = pathname;
        if (pathname.startsWith("/skins/")) {
            baseDir = SKINS_ROOT;
            subPath = pathname.slice("/skins/".length);
        } else if (pathname.startsWith("/assets/")) {
            baseDir = ASSETS_ROOT;
            subPath = pathname.slice("/assets/".length);
        } else {
            // web root
            subPath = pathname === "/" ? "index.html" : pathname.slice(1);
        }
        const resolved = safeResolve(baseDir, subPath);
        if (!resolved) {
            res.statusCode = 403;
            res.end("Forbidden");
            return;
        }
        // if folder -> index.html
        let stat;
        try {
            stat = await fsp.stat(resolved);
        } catch {
            res.statusCode = 404;
            res.end("Not Found");
            return;
        }
        if (stat.isDirectory()) {
            const idx = path.join(resolved, "index.html");
            try {
                await fsp.stat(idx);
                await sendFile(res, idx);
                return;
            } catch {
                res.statusCode = 404;
                res.end("Not Found");
                return;
            }
        }
        await sendFile(res, resolved);
    } catch (e) {
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
});

function guessLanIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return null;
}

const lanIp = guessLanIp();
// bind vs cara akses
logger.info(`Web bind: http://${BIND_HOST}:${WEB_PORT}`);
if (lanIp) logger.info(`Web LAN:  http://${lanIp}:${WEB_PORT}`);
logger.info(`WS bind:  ws://${BIND_HOST}:${WS_PORT}`);
if (lanIp) logger.info(`WS LAN:   ws://${lanIp}:${WS_PORT}`);

// app.get("/config.json", (req, res) => {
//   res.setHeader("Content-Type", "application/json");
//   res.setHeader("Cache-Control", "no-store");
//   res.end(JSON.stringify(DASH_CONFIG));
// });

// app.listen(WEB_PORT, BIND_HOST, () => {
//     logger.info(`Web listening on http://${BIND_HOST}:${WEB_PORT}`);
// });

server.listen(WEB_PORT, BIND_HOST, () => {
    logger.info(`Web listening on http://${BIND_HOST}:${WEB_PORT}`);
});

const wss = new WebSocket.Server({ host: BIND_HOST, port: WS_PORT });
logger.info(`WS listening on ws://${BIND_HOST}:${WS_PORT}`);

/*
 * Configure data folders
 */
if (!fs.existsSync("cache")) {
    fs.mkdirSync("cache");
}
if (!fs.existsSync("skins")) {
    fs.mkdirSync("skins");
}

// Placeholder
const config = {};

Supervisor._setup(wss, config);

// function handleLevelPacket(pk, ws) {
//     ws.send(levelCache.toPacket());
// }

// function handleChunkPacket(pk, ws) {
//     let chunk = pk.body.chunk;
//     // console.log(`Chunk (${chunk.x}, ${chunk.z}) recieved`);
//     levelCache.setChunk(chunk.x, chunk.z, chunk);
// }

// function handleSubscriptions(pk, ws) {
//     if (viewers.indexOf(ws) === -1) {
//         viewers.push(ws);
//         logger.info('Client subscribed to broadcasts');

//         return true;
//     }
//     logger.notice('Client tried subscribing twice, thats not allowed!');

//     return false;
// }