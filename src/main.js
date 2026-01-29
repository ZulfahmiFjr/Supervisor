const fs = require("fs");
const WebSocket = require('ws');

const logger = require('./utils/logger.js');
const Supervisor = require('./supervisor.js');
const Packet = require('./network/packet.js');
const Input = require('./command/input.js');

/*
 * Setup the Http server to serve web view and associated assets
 */
const express = require("express");

const app = express();

app.use(express.static("web"));
app.use('/skins', express.static("skins"));
app.use('/assets', express.static('web/assets'));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/web/index.html")
});

const WEB_PORT = Number(process.env.ATLAS_WEB_PORT ?? 8080);
const WS_PORT  = Number(process.env.ATLAS_WS_PORT ?? 27095);
const HOST     = String(process.env.ATLAS_HOST ?? "127.0.0.1");
// buat akses LAN dari HP
const BIND_HOST = String(process.env.ATLAS_BIND_HOST ?? "0.0.0.0");

// kirim ke frontend supaya tau port WS dan info lain kalo perlu
const DASH_CONFIG = {
  wsPort: WS_PORT,
  webPort: WEB_PORT
};

app.get("/config.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(DASH_CONFIG));
});

app.listen(WEB_PORT, BIND_HOST, () => {
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