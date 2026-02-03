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
    //     this.blockColorMap = {};
    //     this.blockColorMap["10282"] = "#00b894"; // hijau (daratan)
    //     this.blockColorMap["10531"] = "#0652DD"; // biru (water)
    //     this.blockColorMap["10521"] = "#ffeaa7"; // kuning (sand)
    //     this.blockColorMap["10284"] = "#636e72"; // abu (rare)
    //     this.fallbackBlockColor = this.blockColorMap['10282'];
    //     this.worldMinY = 0;
    //     this.worldMaxY = 256;
    //     this.waterIds = new Set([10531]);
        this.blockColorMap = {}; // manual override
        this.fallbackBlockColor = "#4b5563"; // abu netral
        this.worldMinY = 0;
        this.worldMaxY = 256;
        this.idToName = new Map();     // typeId -> "Sand"
        this.waterIds = new Set();     // typeId water
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
        let t = MathUtils.clamp((y - minY) / denom, 0, 1);
        // curve biar perbedaan di midrange lebih kerasa
        t = Math.pow(t, 0.75);
        // alpha gelap, lebih besar di dataran rendah
        const landDark = MathUtils.map(1 - t, 0, 1, 0.10, 0.48);
        ctx.fillStyle = `rgba(0,0,0,${landDark})`;
        ctx.fillRect(x, z, blockSize, blockSize);
        // brighten high
        const highLight = MathUtils.map(t, 0, 1, 0.00, 0.18);
        ctx.fillStyle = `rgba(255,255,255,${highLight})`;
        ctx.fillRect(x, z, blockSize, blockSize);
        // kusus air tambah gelap berdasarkan depth
        if (this.waterIds.has(Number(blockId)) && depth > 0) {
            let dd = MathUtils.clamp(depth / 12, 0, 1); // 30 lebih smooth
            dd = Math.pow(dd, 0.65); // curve biar lebih kerasa
            const darkA = MathUtils.map(dd, 0, 1, 0.10, 0.72);
            ctx.fillStyle = `rgba(0,0,0,${darkA})`;
            ctx.fillRect(x, z, blockSize, blockSize);
            // tint biru biar laut
            const tintA = MathUtils.map(dd, 0, 1, 0.06, 0.22);
            ctx.fillStyle = `rgba(0,80,200,${tintA})`;
            ctx.fillRect(x, z, blockSize, blockSize);
        }
    }

    ingestPalette(palette) {
        for (const [idStr, name] of Object.entries(palette)) {
            const id = Number(idStr);
            if (!this.idToName.has(id)) {
                this.idToName.set(id, String(name));
                const n = String(name).toLowerCase();
                if (n.includes("water")) this.waterIds.add(id);
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
        // debug 1x per id
        this._unknown ??= new Set();
        const key = String(blockId);
        if (!this._unknown.has(key)) {
            this._unknown.add(key);
            console.log("[BlockPainter] Unknown blockId:", key, "name:", name ?? "N/A");
        }
        return this.fallbackBlockColor;
    }

    _getAutoColorByName(nameLower) {
        // water
        if (nameLower.includes("water")) return "#0652DD";
        // sand / dirt / grass
        if (nameLower.includes("sand")) return "#ffeaa7";
        if (nameLower.includes("gravel")) return "#9ca3af";
        if (nameLower.includes("dirt")) return "#b7791f";
        if (nameLower.includes("grass")) return "#00b894";
        // foliage
        if (nameLower.includes("leaves") || nameLower.includes("leaf")) return "#0b7d3e";
        // snow / stone / wood
        if (nameLower.includes("snow")) return "#dfe6e9";
        if (nameLower.includes("stone")) return "#636e72";
        if (nameLower.includes("log") || nameLower.includes("wood")) return "#8d6e63";
        return null;
    }

    setWorldRange(minY, maxY) {
        this.worldMinY = minY;
        this.worldMaxY = maxY;
    }
}