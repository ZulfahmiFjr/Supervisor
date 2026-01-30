import { MathUtils } from '../utils/MathUtils.js';

export class Viewport {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // settings
        this.scale = 5; // default scl
        this.scaleMin = 1;
        this.scaleMax = 5;
        
        // offsets posisi kamera
        this.offsetX = width / 2;
        this.offsetY = height / 2;
        
        // temporary offset buat dragging mouse
        this.tempOffsetX = 0;
        this.tempOffsetY = 0;
    }

    // update ukuran layar kalo window diresize
    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    setScale(val) {
        this.scale = MathUtils.clamp(parseFloat(val), this.scaleMin, this.scaleMax);
    }

    setOffsets(x, y) {
        if (x !== null) this.offsetX = x;
        if (y !== null) this.offsetY = y;
    }

    // geser kamera ke koordinat dunia tertentu misal: tp ke player
    moveTo(worldX, worldZ) {
        const [targetX, targetY] = this.worldToCanvas(worldX, worldZ, true);
        this.offsetX -= targetX - (this.width / 2);
        this.offsetY -= targetY - (this.height / 2);
    }

    // konversi canvas (mouse) -> world (block coordinate)
    canvasToWorld(canvasX, canvasY) {
        const totalOffsetX = this.offsetX + this.tempOffsetX;
        const totalOffsetY = this.offsetY + this.tempOffsetY;
        return {
            x: Math.floor((canvasX - totalOffsetX) / this.scale),
            z: Math.floor((canvasY - totalOffsetY) / this.scale)
        };
    }

    // konversi world (block) -> canvas (screen)
    worldToCanvas(worldX, worldZ, includeOffset = true) {
        let x = worldX * this.scale;
        let y = worldZ * this.scale;
        if (includeOffset) {
            x += (this.offsetX + this.tempOffsetX);
            y += (this.offsetY + this.tempOffsetY);
        }
        return [x, y];
    }

    // helper buat ngecek apa sebuah area keliatan di layar (culling)
    isVisible(x, y, w, h) {
        return (x + w > 0 && x < this.width && y + h > 0 && y < this.height);
    }

    diagnol() {
        const left = this.canvasToWorld(0, 0);
        const right = this.canvasToWorld(this.width, this.height);
        return [
            Math.abs(right.x - left.x), 
            Math.abs(right.y - left.y) // di JS objectnya x,z atau x,y trgantung implementasi canvasToWorld
        ];
    }

    toPacket() {
        // cari titik tengah, world coordinate
        const center = this.canvasToWorld(this.width / 2, this.height / 2);
        // itung radius render, biar server tau harus kirim chunk seberapa jauh
        const diag = this.diagnol();
        const maxDiag = Math.max(diag[0], diag[1]); // ambil sisi terpanjang
        const radius = (maxDiag / 2) >> 4; // konversi block ke chunk radius (roughly)
        return {
            worldX: center.x,
            worldZ: center.z,
            radius: radius + 2 // tambah buffer dikit biar aman
        };
    }
}