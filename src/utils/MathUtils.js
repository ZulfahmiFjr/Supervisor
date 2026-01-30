export const MathUtils = {
    // pengganti map() di p5.js
    map: (value, start1, stop1, start2, stop2) => {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    },

    // pngganti dist() di p5.js
    dist: (x1, y1, x2, y2) => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    // biar zoomnya gak bablas
    clamp: (val, min, max) => {
        return Math.min(Math.max(val, min), max);
    },

    // buat handling warna
    rgba: (r, g, b, a = 1) => `rgba(${r},${g},${b},${a})`
};