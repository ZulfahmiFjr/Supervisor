// ==========================================================
// KODE main.js FINAL - DENGAN LOGIKA TOMBOL SEND
// ==========================================================

var ws;
let resizeTimeout;

/**
 * Fungsi ini HANYA mengubah ukuran kanvas agar pas dengan wadahnya.
 */
function performResize() {
    const mapContainer = document.getElementById("canvas-container");
    if (mapContainer) {
        const containerWidth = mapContainer.offsetWidth;
        const containerHeight = mapContainer.offsetHeight;

        if (width !== containerWidth || height !== containerHeight) {
            console.log(`Resizing canvas to ${containerWidth}x${containerHeight}`);
            resizeCanvas(containerWidth, containerHeight);
        }
    }
}

/**
 * Fungsi yang dipicu saat jendela diubah ukurannya.
 */
function windowResized() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(performResize, 150);
}

/**
 * Fungsi untuk membuat koneksi WebSocket.
 */
function makeConnection() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    const addressInput = document.getElementById("connection-input");
    if (!addressInput) {
        console.error("Fatal Error: Elemen #connection-input tidak ditemukan.");
        return;
    }
    const address = addressInput.value;
    console.log(`Attempting to connect to ${address}...`);
    ws = new WebSocket(address);
    ws.onopen = () => console.log("SUCCESS: WebSocket Connection Established.");
    ws.onclose = () => console.warn("WebSocket Connection Closed.");
    ws.onerror = (err) => console.error("WebSocket Error: ", err);
}

/**
 * Fungsi untuk mengambil teks dari input, mengirimkannya sebagai perintah, dan membersihkan input.
 * Akan dipanggil oleh event Enter dan klik tombol.
 */
function sendCommand() {
    const inputBox = document.getElementById("console-input");
    const text = inputBox.value.trim();

    if (text.length > 0) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const packet = { type: "command", payload: text };
            ws.send(JSON.stringify(packet));
            UI.log(`> ${text}`);
        } else {
            UI.log("Error: Not connected to server.");
        }
        inputBox.value = ""; // Kosongkan input setelah dikirim
    }
}

/**
 * Fungsi setup utama p5.js.
 */
function setup() {
    const canvasContainer = document.getElementById("canvas-container");
    var cnv = createCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
    cnv.id("map-canvas");
    cnv.parent("canvas-container");

    renderer.setup();
    UI.setup();

    cnv.mouseWheel(UI.controlZoom);
    mousePressed = UI.mousePressed;
    keyPressed = UI.keyPressed;
    mouseDragged = UI.mouseDragged;
    mouseReleased = UI.mouseReleased;

    makeConnection();

    // ▼▼▼ PERUBAHAN DI SINI: MENANGANI EVENT UNTUK INPUT DAN TOMBOL BARU ▼▼▼
    const inputBox = document.getElementById("console-input");
    const sendButton = document.getElementById("send-button");

    // Menangani penekanan tombol Enter
    inputBox?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            sendCommand();
        }
    });

    // Menangani klik pada tombol Send
    sendButton?.addEventListener("click", () => {
        sendCommand();
    });
    // ▲▲▲ AKHIR DARI PERUBAHAN ▲▲▲
}

/**
 * Fungsi draw utama p5.js.
 */
function draw() {
    background("#1f1f1f");
    renderer.render();
    UI.update();
}
