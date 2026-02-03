import { MathUtils } from '../utils/MathUtils.js';

export class BlockPainter {
    constructor() {
        this.shadingConfiguration = [
            [2, 40], [3, 15], [4, 20]
        ];
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
    }

    paint(ctx, x, z, y, blockId, blockSize) {
        // base color
        const color = this.getBlockColor(blockId);
        ctx.fillStyle = color;
        ctx.fillRect(x, z, blockSize, blockSize);
        // depth shading
        this.shadeForDepth(ctx, x, y, z, blockSize);
    }

    shadeForDepth(ctx, x, y, z, blockSize) {
        let alpha = 0;
        this.shadingConfiguration.forEach((settings) => {
            let step = settings[0];
            let gradient = settings[1];
            alpha += MathUtils.map(parseInt(y) % step, 0, step - 1, 30, step * gradient);
        });
        alpha = (alpha / this.shadingConfiguration.length);
        // convert alpha 0-255 ke 0.0-1.0 buat CSS rgba
        const normalizedAlpha = MathUtils.clamp(alpha / 255, 0, 1);
        ctx.fillStyle = `rgba(100, 100, 100, ${normalizedAlpha})`;
        ctx.fillRect(x, z, blockSize, blockSize);
    }

    getBlockColor(blockId) {
        return this.blockColorMap[blockId] ?? this.fallbackBlockColor;
    }
}