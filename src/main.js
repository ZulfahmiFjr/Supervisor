import './style.css';

import { Renderer } from './graphics/Renderer.js';
import { BlockPainter } from './graphics/BlockPainter.js';
import { ChunkManager } from './managers/ChunkManager.js';
import { AssetManager } from './managers/AssetManager.js';
import { Viewport } from './graphics/Viewport.js';
import { Network } from './core/Network.js';
import { UIManager } from './ui/UIManager.js';
import { EntityManager } from './managers/EntityManager.js';
import { MathUtils } from "./utils/MathUtils.js";

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
    canvas.style.touchAction = "none";
     // simpen pointer aktif (touch bisa lebih dari 1)
    const pointers = new Map();
    let isPanning = false;
    let lastPan = { x: 0, y: 0 };
    // pinch state
    let isPinching = false;
    let pinchStartDist = 0;
    let pinchStartScale = 1;

    function getTwoPointers() {
        const arr = Array.from(pointers.values());
        return [arr[0], arr[1]];
    }

    canvas.addEventListener("pointerdown", (e) => {
        canvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) {
            isPanning = true;
            isPinching = false;
            const p = pointers.get(e.pointerId);
            lastPan.x = p.x;
            lastPan.y = p.y;
        } else if (pointers.size === 2) {
            isPinching = true;
            isPanning = false;
            const [a, b] = getTwoPointers();
            pinchStartDist = MathUtils.dist(a.x, a.y, b.x, b.y);
            pinchStartScale = viewport.scale;
        }
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("pointermove", (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (isPinching && pointers.size === 2) {
            const [a, b] = getTwoPointers();
            const d = MathUtils.dist(a.x, a.y, b.x, b.y);
            if (pinchStartDist > 0) {
                const factor = d / pinchStartDist;
                const newScale = MathUtils.clamp(pinchStartScale * factor, 0.2, 6);
                viewport.setScale(newScale);
            }
        } else if (isPanning && pointers.size === 1) {
            const p = pointers.get(e.pointerId);
            const dx = p.x - lastPan.x;
            const dy = p.y - lastPan.y;
            // apply langsung biar smooth di mobile
            viewport.setOffsets(viewport.offsetX + dx, viewport.offsetY + dy);
            lastPan.x = p.x;
            lastPan.y = p.y;
        }

        e.preventDefault();
    }, { passive: false });

    function endPointer(e) {
        pointers.delete(e.pointerId);
        if (pointers.size === 0) {
            isPanning = false;
            isPinching = false;
        } else if (pointers.size === 1) {
            // balik ke pan kalo tinggal 1 finger
            isPinching = false;
            isPanning = true;
            const only = Array.from(pointers.values())[0];
            lastPan.x = only.x;
            lastPan.y = only.y;
        }
    }

    canvas.addEventListener("pointerup", (e) => {
        endPointer(e);
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("pointercancel", (e) => {
        endPointer(e);
        e.preventDefault();
    }, { passive: false });

    // zoom wheel
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const direction = e.deltaY > 0 ? -1 : 1;
        const newScale = MathUtils.clamp(viewport.scale + direction * zoomSpeed, 0.2, 6);
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
    const initialWidth = container.clientWidth;
    const initialHeight = container.clientHeight;
    app.renderer.resize(initialWidth, initialHeight);
    // paksa geser titik (0,0) ke tengah layar pas pertama kali dibuka
    if (app.renderer.viewport) {
        app.renderer.viewport.setOffsets(initialWidth / 2, initialHeight / 2);
    }
}

// bootstrap
window.addEventListener('DOMContentLoaded', () => {
    // jalanin game loop dulu
    init();
    // logika menu mobile
    const menuBtn = document.getElementById('mobile-menu-btn');
    const dashboard = document.getElementById('mobile-dashboard');
    let isMenuOpen = false; // status awal: nutup
    if (menuBtn && dashboard) {
        menuBtn.addEventListener('click', () => {
            isMenuOpen = !isMenuOpen; // switch on/off
            if (isMenuOpen) {
                // pas buka: hapus hidden, paksa flex, ganti ikon X
                dashboard.classList.remove('hidden');
                dashboard.classList.add('flex');
                menuBtn.innerHTML = '&#10005;'; 
            } else {
                // pas tutup: pasang hidden, buang flex, ganti ikon garis 3
                dashboard.classList.add('hidden');
                dashboard.classList.remove('flex');
                menuBtn.innerHTML = '&#9776;'; 
            }
        });
    }
});
// expose app buat debugging di console browser
window.Atlas = app;