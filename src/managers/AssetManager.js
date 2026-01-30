export class AssetManager {
    constructor() {
        this.images = new Map();
        this.fonts = new Map();
    }

    // load gambar pake native image API
    loadImage(key, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                this.images.set(key, img);
                resolve(img);
            };
            img.onerror = (err) => {
                console.error(`[AssetManager] Gagal load gambar: ${key}`, err);
                // kita resolve null biar app gak crash total, cuma gambarnya ilang
                resolve(null);
            };
        });
    }

    // load font pake native FontFace API
    loadFont(name, url) {
        return new Promise((resolve, reject) => {
            const font = new FontFace(name, `url(${url})`);
            font.load().then((loadedFont) => {
                document.fonts.add(loadedFont);
                this.fonts.set(name, loadedFont);
                console.log(`[AssetManager] Font loaded: ${name}`);
                resolve(loadedFont);
            }).catch((err) => {
                console.error(`[AssetManager] Gagal load font: ${name}`, err);
                resolve(null);
            });
        });
    }

    get(key) {
        return this.images.get(key);
    }
}