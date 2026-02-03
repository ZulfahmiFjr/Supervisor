import { MathUtils } from '../utils/MathUtils.js';

export class BlockPainter {
    constructor() {
        // this.shadingConfiguration = [
        //     [2, 40], [3, 15], [4, 20]
        // ];
        // this.blockColorMap = {
        //     '2': '#00b894', // Grass
        //     '78': '#dfe6e9', // Snow
        //     '1': '#636e72', // Stone
        //     '18': '#009432', // Oak leaves
        //     '9': '#0652DD', // Water
        //     '12': '#ffeaa7', // Sand
        //     '3': '#f0932b', // Dirt
        //     '159': '#edcecc', // Pink clay
        //     '172': '#c97947', // Hardened Clay
        //     '161': '#78e08f', // Acacia leaves
        //     '79': '#74b9ff', // Ice
        //     '174': '#0984e3', // Packed ice
        // };
        this.blockColorMap = {};
        this.blockColorMap["10282"] = "#00b894"; // hijau (daratan)
        this.blockColorMap["10531"] = "#0652DD"; // biru (water)
        this.blockColorMap["10521"] = "#ffeaa7"; // kuning (sand)
        this.blockColorMap["10284"] = "#636e72"; // abu (rare)
        this.fallbackBlockColor = this.blockColorMap['10282'];
        this.worldMinY = 0;
        this.worldMaxY = 256;
        this.waterIds = new Set([10531]);
    }

    paint(ctx, x, z, y, blockId, blockSize, depth = 0) {
        // base color
        const color = this.getBlockColor(blockId);
        ctx.fillStyle = color;
        ctx.fillRect(x, z, blockSize, blockSize);
        // depth shading berdasarkan ketinggian (semakin rendah = semakin gelap)
        const minY = this.worldMinY;
        const maxY = this.worldMaxY;
        const denom = Math.max(1, (maxY - minY));
        const t = MathUtils.clamp((y - minY) / denom, 0, 1);
        // alpha gelap, lebih besar di dataran rendah
        const landDark = MathUtils.map(1 - t, 0, 1, 0.05, 0.35);
        ctx.fillStyle = `rgba(0,0,0,${landDark})`;
        ctx.fillRect(x, z, blockSize, blockSize);
        // kusus air tambah gelap berdasarkan depth
        if (this.waterIds.has(Number(blockId)) && depth > 0) {
            const dd = MathUtils.clamp(depth / 30, 0, 1); // 30 lebih smooth
            const darkA = dd * 0.55;
            ctx.fillStyle = `rgba(0,0,0,${darkA})`;
            ctx.fillRect(x, z, blockSize, blockSize);
            // tint biru biar laut
            const tintA = dd * 0.20;
            ctx.fillStyle = `rgba(0,80,200,${tintA})`;
            ctx.fillRect(x, z, blockSize, blockSize);
        }
    }

    getBlockColor(blockId) {
        const key = String(blockId);
        const c = this.blockColorMap[key];
        if (c === undefined) {
            // debug 1x per id
            this._unknown ??= new Set();
            if (!this._unknown.has(key)) {
                this._unknown.add(key);
                console.log("[BlockPainter] Unknown blockId:", key);
            }
            return this.fallbackBlockColor;
        }
        return c;
    }

    setWorldRange(minY, maxY) {
        this.worldMinY = minY;
        this.worldMaxY = maxY;
    }
}