// BlockPainter.js
import { MathUtils } from '../utils/MathUtils.js';

export class BlockPainter {
    constructor() {
        this.blockColorMap = {};
        this.fallbackBlockColor = "#4b5563";
        this.idToName = new Map();
        this.waterIds = new Set();
        // arah cahaya buat hillshade, barat-laut -> tenggara
        this.sun = this._normalize3(-1, 1, 1);
        // strength, makin besar makin kontras
        this.hillStrength = 1.0; // coba 1.0 - 2.0
        this.ambient = 0.6; // minimal terang biar gak item pekat
    }

    paint(ctx, x, z, y, blockId, blockSize, depth = 0, shade = 1, isContour = false) {
        // warna dasar
        let color = this.getBlockColor(blockId);
        // terapin hillshade (multiply)
        color = this._mulColor(color, shade);
        ctx.fillStyle = color;
        ctx.fillRect(x, z, blockSize, blockSize);
        // tambah gradasi kedelaman
        if (this.waterIds.has(Number(blockId)) && depth > 0) {
            const waterRatio = MathUtils.clamp(depth / 15, 0, 1);
            ctx.fillStyle = `rgba(0, 0, 0, ${waterRatio * 0.45})`;
            ctx.fillRect(x, z, blockSize, blockSize);
            ctx.fillStyle = `rgba(0, 80, 200, ${waterRatio * 0.22})`;
            ctx.fillRect(x, z, blockSize, blockSize);
        }
        // kalo ini batas ketinggian timpa pake warna item transparan
        if (isContour) {
            // pake alpha 0.3 s/d 0.5 biar kaliatan kayak garis item tegas tapi nyatu
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(x, z + (blockSize - 1), blockSize, 1);
        }
    }

    hillshade(hL, hR, hU, hD) {
        // central difference
        const dx = (hR - hL) * this.hillStrength;
        const dz = (hD - hU) * this.hillStrength;
        const n = this._normalize3(-dx, 2, -dz); // biar lebih soft
        // dot pake arah matahari -> 0..1
        let d = (n.x * this.sun.x) + (n.y * this.sun.y) + (n.z * this.sun.z);
        d = MathUtils.clamp(d, 0, 1);
        // campur ambient supaya gak terlalu gelap
        return this.ambient + (1 - this.ambient) * d;
    }

    _mulColor(hex, shade) {
        const c = this._hexToRgb(hex);
        const r = MathUtils.clamp(Math.round(c.r * shade), 0, 255);
        const g = MathUtils.clamp(Math.round(c.g * shade), 0, 255);
        const b = MathUtils.clamp(Math.round(c.b * shade), 0, 255);
        return `rgb(${r}, ${g}, ${b})`;
    }

    _hexToRgb(hex) {
        const h = hex.replace('#', '');
        const v = parseInt(h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h, 16);
        return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
    }

    _normalize3(x, y, z) {
        const len = Math.sqrt(x*x + y*y + z*z) || 1;
        return { x: x / len, y: y / len, z: z / len };
    }

    ingestPalette(palette) {
        for (const [idStr, name] of Object.entries(palette)) {
            const id = Number(idStr);
            if (!this.idToName.has(id)) {
                this.idToName.set(id, String(name));
                const n = String(name).toLowerCase();
                if (n.includes("water") || n.includes("flow") || n.includes("liquid")) {
                    this.waterIds.add(id);
                }
            }
        }
    }

    getBlockColor(blockId) {
        const id = Number(blockId);
        const manual = this.blockColorMap[String(blockId)];
        if (manual !== undefined) return manual;
        const name = this.idToName.get(id);
        if (name) {
            const c = this._getAutoColorByName(name.toLowerCase());
            if (c) return c;
        }
        return this.fallbackBlockColor;
    }

    _getAutoColorByName(nameLower) {
        if (nameLower.includes("water")) return "#0652DD";
        if (nameLower.includes("sand")) return "#ffeaa7";
        if (nameLower.includes("gravel")) return "#9ca3af";
        if (nameLower.includes("dirt")) return "#b7791f"; // coklat dirt
        if (nameLower.includes("grass")) return "#2ecc71"; // hijau cerah
        if (nameLower.includes("leaves") || nameLower.includes("leaf")) return "#27ae60"; // hijau tua
        if (nameLower.includes("snow")) return "#dfe6e9";
        if (nameLower.includes("stone")) return "#636e72";
        if (nameLower.includes("log") || nameLower.includes("wood") || nameLower.includes("plank")) return "#8d6e63";
        if (nameLower.includes("lava")) return "#e17055";
        return null;
    }

    // hapus biar gak belang belang antar chunk
    // setWorldRange(minY, maxY) {
    // }
}