import './style.css';

import { Renderer } from './graphics/Renderer.js';
import { BlockPainter } from './graphics/BlockPainter.js';
import { ChunkManager } from './managers/ChunkManager.js';
import { AssetManager } from './managers/AssetManager.js';
import { Viewport } from './graphics/Viewport.js';
import { Network } from './core/Network.js';
import { UIManager } from './ui/UIManager.js';
import { EntityManager } from './managers/EntityManager.js';

// state global buat modular tapi accessible
const app = {
    renderer: null,
    chunkManager: null,
    entityManager: null,
    assetManager: null,
    network: null,
    ui: null,
    isRunning: false,
    lastTime: 0,
    fps: 0,
    // input state
    isDragging: false,
    dragStart: { x: 0, y: 0 },
};

// initialization
async function init() {
    console.log("[Atlas] Starting Supervisor Dashboard...");
    // setup DOM elements
    const container = document.getElementById('canvas-container');
    if (!container) throw new Error("Canvas container not found!");
    // buat canvas element secara dynamic biar bersih
    const canvas = document.createElement('canvas');
    canvas.id = 'map-canvas';
    // style biar pas sama container
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    // initialize managers
    app.chunkManager = new ChunkManager();
    app.entityManager = new EntityManager();
    app.assetManager = new AssetManager();
    const blockPainter = new BlockPainter();
    app.renderer = new Renderer(canvas, blockPainter, app.assetManager);
    // setup UI & Network
    app.ui = new UIManager(app);
    app.ui.setup(); // bind events
    app.network = new Network(app);
    // start connection
    app.network.connect(); // auto connect ke localhost/LAN
    // load assets, tunggu selesai baru lanjut
    await Promise.all([
        app.assetManager.loadImage('map_icons', '/assets/map_icons.png'),
        app.assetManager.loadFont('Minecraft', '/assets/minecraft_font.otf')
    ]);
    // setup event listeners, input & resize
    setupInputs(canvas);
    setupResize(container);
    // start loop
    app.isRunning = true;
    requestAnimationFrame(gameLoop);

    // TODO: Init Network Connection disini nanti
    // Network.connect();
    
    console.log("[Atlas] Ready to serve.");
}

// game loop
function gameLoop(timestamp) {
    if (!app.isRunning) return;
    // hitung FPS manual
    const deltaTime = timestamp - app.lastTime;
    app.lastTime = timestamp;
    app.fps = Math.round(1000 / deltaTime);
    // ambil data player asli dari EntityManager
    const players = app.entityManager ? app.entityManager.getAllPlayers() : [];
    // pass data chunks & players ke renderer
    app.renderer.render(app.fps, players);
    // render queue chunk, biar chunk yg baru masuk diproses
    // logic ambil chunk dari ChunkManager yg belum dirender, nnti diimplementasi di Network logic
    requestAnimationFrame(gameLoop);
}

// input handling pengganti UI.mouseDragged p5.js
function setupInputs(canvas) {
    const viewport = app.renderer.viewport;
    // mouse down mulai drag
    canvas.addEventListener('mousedown', (e) => {
        app.isDragging = true;
        app.dragStart.x = e.clientX;
        app.dragStart.y = e.clientY;
    });
    // mouse move proses drag
    window.addEventListener('mousemove', (e) => {
        if (!app.isDragging) return;
        const dx = e.clientX - app.dragStart.x;
        const dy = e.clientY - app.dragStart.y;
        // update temp offset di viewport
        viewport.tempOffsetX = dx;
        viewport.tempOffsetY = dy;
    });
    // mouse up selesai drag
    window.addEventListener('mouseup', () => {
        if (!app.isDragging) return;
        // apply temp offset jadi permanent
        viewport.setOffsets(
            viewport.offsetX + viewport.tempOffsetX,
            viewport.offsetY + viewport.tempOffsetY
        );
        // reset temp
        viewport.tempOffsetX = 0;
        viewport.tempOffsetY = 0;
        app.isDragging = false;
    });
    // zoom wheel
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const direction = e.deltaY > 0 ? -1 : 1; // scroll bawah = zoom out
        const oldScale = viewport.scale;
        const newScale = oldScale + (direction * zoomSpeed);
        // logic zoom ke tengah layar, simplified dari p5 logic
        // kalo mau zoom ke cursor mouse, butuh matematika viewport yg lebih kompleks
        // skarang zoom center screen dulu biar aman
        viewport.setScale(newScale);
    }, { passive: false });
}

// resize handling
function setupResize(container) {
    const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            // update ukuran canvas & viewport renderer
            app.renderer.resize(width, height);
        }
    });
    resizeObserver.observe(container);
    // trigger initial resize
    app.renderer.resize(container.clientWidth, container.clientHeight);
}

// bootstrap
window.addEventListener('DOMContentLoaded', init);
// expose app buat debugging di console browser
window.Atlas = app;