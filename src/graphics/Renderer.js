import { Viewport } from './Viewport.js';
import { MathUtils } from '../utils/MathUtils.js';

export const RenderSettings = {
    BLOCK_RESOLUTION: 1,
    CHUNK_SIZE: 16, // 16 blocks per chunk side
    CHUNKS_IN_BUFFER: 16, // 1 buffer = 16x16 chunks (besar banget)
    CHUNK_RENDER_RATE: 2, // berapa chunk dirender ke buffer per frame
};

export class Renderer {
    constructor(canvas, blockPainter, assetManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // alpha false biar performa kenceng
        this.blockPainter = blockPainter;
        this.assets = assetManager; // buat manager simple buat load gambar icon nanti
        this.viewport = new Viewport(canvas.width, canvas.height);
        // buffer cache (penyimpanan canvas canvas kcil)
        this.buffers = new Map(); 
        this.chunkRenderQueue = []; // antrian chunk yg harus digambar ke buffer
        // toggles
        this.showGrid = true;
        this.showOutlines = true;
        this.showAxis = true;
        this.showPlayers = true;
        this.showCrosshair = true;
        this.showCoords = true;
        // constants calculate
        this.BUFFER_PIXEL_SIZE = RenderSettings.CHUNKS_IN_BUFFER * RenderSettings.CHUNK_SIZE * RenderSettings.BLOCK_RESOLUTION;
    }

    resize(w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.viewport.resize(w, h);
    }

    // main render loop
    render(fps, players) {
        // clear screen
        this.ctx.fillStyle = '#1f1f1f'; // background color
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // process queue (render chunk ke buffer offscreen dulu)
        this._processChunkQueue();
        // draw buffers to main screen
        this._renderBuffers();
        // overlays
        if (this.showGrid) this._renderGrid();
        if (this.showOutlines) this._renderBufferOutlines();
        if (this.showAxis) this._renderAxis();
        if (this.showPlayers) this._renderPlayers(players);
        if (this.showCrosshair) this._renderCrosshair();
        if (this.showCoords) this._renderHUD(fps);
    }

    // buffer system, masukin chunk ke antrian buat digambar
    queueChunk(chunk) {
        this.chunkRenderQueue.push(chunk);
    }

    _getBuffer(bufferX, bufferY) {
        const key = `${bufferX}:${bufferY}`;
        if (!this.buffers.has(key)) {
            // create new offscreen canvas
            const buff = document.createElement('canvas');
            buff.width = this.BUFFER_PIXEL_SIZE;
            buff.height = this.BUFFER_PIXEL_SIZE;
            this.buffers.set(key, {
                canvas: buff,
                ctx: buff.getContext('2d'),
                x: bufferX,
                y: bufferY
            });
        }
        return this.buffers.get(key);
    }

    _processChunkQueue() {
        // proses beberapa chunk per frame biar gak ngelag
        for (let i = 0; i < RenderSettings.CHUNK_RENDER_RATE; i++) {
            if (this.chunkRenderQueue.length === 0) break;
            const chunk = this.chunkRenderQueue.shift(); // ambil chunk terdepan
            // hitung dia masuk buffer mana
            const bRes = RenderSettings.BLOCK_RESOLUTION;
            const bSize = this.BUFFER_PIXEL_SIZE;
            // logic index buffer lama: i = floor(worldX / bufferSize)
            const bI = Math.floor((chunk.x * 16 * bRes) / bSize);
            const bJ = Math.floor((chunk.z * 16 * bRes) / bSize);
            const buffer = this._getBuffer(bI, bJ);
            // gambar chunk ke dalem buffer canvas tsb
            this._paintChunkToBuffer(buffer, chunk);
        }
    }

    _paintChunkToBuffer(bufferObj, chunk) {
        // if (chunk.topMinY !== undefined && chunk.topMaxY !== undefined) {
        //     this.blockPainter.setWorldRange(chunk.topMinY, chunk.topMaxY);
        // } else if (chunk.minY !== undefined && chunk.maxY !== undefined) {
        //     this.blockPainter.setWorldRange(chunk.minY, chunk.maxY);
        // }
        if (chunk.palette) {    
            this.blockPainter.ingestPalette(chunk.palette);
        }
        const ctx = bufferObj.ctx;
        const bRes = RenderSettings.BLOCK_RESOLUTION;
        // hitung offset posisi chunk di dalam buffer itu
        // ini logic matematika yg agak ribet dari kode lama, tapi intinya 
        // kita cari posisi relatif chunk terhadap pojok kiri atas buffer
        // quadrant logic simplified
        const chunksInBuffer = RenderSettings.CHUNKS_IN_BUFFER;
        // itung koordinat awal, pojok kiri atas dari buffer ini dalam satuan Chunk
        const bufferStartX = bufferObj.x * chunksInBuffer;
        const bufferStartY = bufferObj.y * chunksInBuffer;
        // posisi relatif chunk di dalam buffer, bisa 0 sampe 15
        const relX = chunk.x - bufferStartX;
        const relZ = chunk.z - bufferStartY;
        // konversi ke pixel canvas
        const pixelX = relX * 16 * bRes;
        const pixelZ = relZ * 16 * bRes;
        // const absX = Math.abs(chunk.x % RenderSettings.CHUNKS_IN_BUFFER) * 16 * bRes;
        // const absZ = Math.abs(chunk.z % RenderSettings.CHUNKS_IN_BUFFER) * 16 * bRes;
        // kita asumsi koordinat positif dulu buat MVP, bisa dibenerin nanti buat negatif
        // BlockPainter sekarang nerima (ctx, x, y, ...)
        // const height = Array.from({ length: 16 }, () => Array(16).fill(0));
        //     for (let x = 0; x < 16; x++) {
        //         for (let z = 0; z < 16; z++) {
        //             const cell = chunk.layer?.[x]?.[z];
        //             height[x][z] = cell ? cell.y : 0;
        //         }
        // }
        const height = new Int16Array(256);
        // isi data ketinggian dulu ke array
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const cell = chunk.layer?.[x]?.[z];
                // rumus array 1D, index = x * 16 + z
                height[x * 16 + z] = cell ? cell.y : 0;
            }
        }
        // render & hitung tetangga
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                // ambil block ID & Y (ketinggian) dari data chunk layer
                const cell = chunk.layer?.[x]?.[z];
                if (!cell) continue;
                const y = cell.y;
                const blockId = cell.id;
                const depth = cell.d || 0;
                // ambil tetangga, clamp edge biar aman
                // const hL = height[Math.max(0, x - 1)][z];
                // const hR = height[Math.min(15, x + 1)][z];
                // const hU = height[x][Math.max(0, z - 1)];
                // const hD = height[x][Math.min(15, z + 1)];
                const xL = Math.max(0, x - 1);
                const xR = Math.min(15, x + 1);
                const zU = Math.max(0, z - 1);
                const zD = Math.min(15, z + 1);
                const hL = height[xL * 16 + z]; // kiri
                const hR = height[xR * 16 + z]; // kanan
                const hU = height[x * 16 + zU]; // atas
                const hD = height[x * 16 + zD]; // bawah
                // const isContour = (y !== hR) || (y !== hD);
                const step = 8;
                const a = Math.floor(y / step);
                const isContour =
                    Math.floor(hR / step) !== a ||
                    Math.floor(hD / step) !== a;
                const shade = this.blockPainter.hillshade(hL, hR, hU, hD);
                this.blockPainter.paint(
                    ctx, 
                    pixelX + (x * bRes), // posisi X di canvas buffer
                    pixelZ + (z * bRes), // posisi Y di canvas buffer (z map jadi y screen)
                    y, // ketinggian buat shading
                    blockId,
                    bRes, // ukuran pixel per block
                    depth,
                    shade,
                    isContour
                );
            }
        }
    }

    _renderBuffers() {
        this.ctx.imageSmoothingEnabled = false; // biar pixelated style terjaga
        for (const [key, buffer] of this.buffers) {
            // hitung posisi buffer di layar utama berdasarkan Viewport
            const screenX = (buffer.x * this.BUFFER_PIXEL_SIZE * this.viewport.scale) + 
                            this.viewport.offsetX + this.viewport.tempOffsetX;
            const screenY = (buffer.y * this.BUFFER_PIXEL_SIZE * this.viewport.scale) + 
                            this.viewport.offsetY + this.viewport.tempOffsetY;
            const screenW = this.BUFFER_PIXEL_SIZE * this.viewport.scale;
            const screenH = this.BUFFER_PIXEL_SIZE * this.viewport.scale;
            // optimization: culling (cuma gambar kalo kelihatan di layar)
            if (this.viewport.isVisible(screenX, screenY, screenW, screenH)) {
                this.ctx.drawImage(buffer.canvas, screenX, screenY, screenW, screenH);
            }
        }
    }

    // overlays (grid, players, etc) ---
    _renderGrid() {
        const chunkSizeScreen = RenderSettings.CHUNK_SIZE * RenderSettings.BLOCK_RESOLUTION * this.viewport.scale;
        // calculate offset modulo biar gridnya jalan ngikutin kamera
        const offsetX = (this.viewport.offsetX + this.viewport.tempOffsetX) % chunkSizeScreen;
        const offsetY = (this.viewport.offsetY + this.viewport.tempOffsetY) % chunkSizeScreen;
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#282828'; // warna grid abu gelap
        this.ctx.lineWidth = 1;
        // vertical lines
        for (let x = offsetX; x < this.canvas.width; x += chunkSizeScreen) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        // horizontal lines
        for (let y = offsetY; y < this.canvas.height; y += chunkSizeScreen) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();
    }

    _renderAxis() {
        const cx = this.viewport.offsetX + this.viewport.tempOffsetX;
        const cy = this.viewport.offsetY + this.viewport.tempOffsetY;
        this.ctx.lineWidth = 2;
        // Z axis (blue - vertical on screen)
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'blue';
        this.ctx.moveTo(0, cy);
        this.ctx.lineTo(this.canvas.width, cy);
        this.ctx.stroke();
        // X axis (red - horizontal on screen)
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'red';
        this.ctx.moveTo(cx, 0);
        this.ctx.lineTo(cx, this.canvas.height);
        this.ctx.stroke();
    }

    _renderPlayers(players) {
        if (!players) return;
        const icon = this.assets.get('map_icons'); // ambil dari asset manager
        players.forEach(player => {
            const [px, py] = this.viewport.worldToCanvas(player.position.x, player.position.z);
            this.ctx.save();
            this.ctx.translate(px, py);
            // rotation
            if (player.position.yaw !== undefined) {
                const angle = (player.position.yaw - 180) * (Math.PI / 180);
                this.ctx.rotate(angle);
            }
            if (icon) {
                // gambar icon player (centered)
                this.ctx.drawImage(icon, 0, 0, 16, 16, -16, -16, 32, 32);
            } else {
                // fallback kalo gambar belum load, kotak merah
                this.ctx.fillStyle = 'red';
                this.ctx.beginPath();
                this.ctx.moveTo(0, -10);
                this.ctx.lineTo(8, 10);
                this.ctx.lineTo(-8, 10);
                this.ctx.fill();
            }
            this.ctx.restore();
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, px, py - 20);
        });
    }

    _renderCrosshair() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    _renderBufferOutlines() {
        // sama logicnya kyak _renderBuffers tapi cuman strokeRect
        this.ctx.strokeStyle = 'green';
        this.ctx.lineWidth = 2;
        for (const [key, buffer] of this.buffers) {
            const screenX = (buffer.x * this.BUFFER_PIXEL_SIZE * this.viewport.scale) + 
                            this.viewport.offsetX + this.viewport.tempOffsetX;
            const screenY = (buffer.y * this.BUFFER_PIXEL_SIZE * this.viewport.scale) + 
                            this.viewport.offsetY + this.viewport.tempOffsetY;
            const size = this.BUFFER_PIXEL_SIZE * this.viewport.scale;
            if (this.viewport.isVisible(screenX, screenY, size, size)) {
                this.ctx.strokeRect(screenX, screenY, size, size);
            }
        }
    }
    
    _renderHUD(fps) {
        // FPS counter simple di atas tengah
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect((this.canvas.width / 2) - 30, 0, 60, 25);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`FPS: ${fps}`, this.canvas.width / 2, 17);
    }
}