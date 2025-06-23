var anchor;
var afterRender = [];
var beforeRender = [];
var ws;
let resizeTimeout;
let mainLayout; // Variabel untuk nyimpen div layout utama
let consoleContainer; // Variabel untuk nyimpen div konsol

const supabase = window.supabase.createClient(
    "https://hqbsoacvwsieepsmxebn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxYnNvYWN2d3NpZWVwc214ZWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDI5MzQsImV4cCI6MjA2NjI3ODkzNH0.9C_z9oU0VkhoIEHo0vntUng4ZSvec_F7ZCaFLKmZFE4"
);

function performResize() {
    const canvasContainer = document.getElementById("canvas-container");
    const consoleBox = document.getElementById("console-box");

    if (canvasContainer && consoleBox) {
        requestAnimationFrame(() => {
            const consoleHeight = consoleBox.getBoundingClientRect().height;
            const newCanvasHeight = window.innerHeight - consoleHeight - 16;
            canvasContainer.style.height = `${newCanvasHeight}px`;
            const bounds = canvasContainer.getBoundingClientRect();
            resizeCanvas(bounds.width, bounds.height);
        });
    }
}

function windowResized() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(performResize, 100); // Jeda
}

function makeConnection() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    const addressInput = document.getElementById("connection-input");
    if (!addressInput) {
        console.error("Fatal Error: Element #connection-input not found.");
        return;
    }
    const address = addressInput.value;
    console.log(`Attempting to connect to ${address}...`);
    ws = new WebSocket(address);
    ws.onopen = () => console.log("SUCCESS: WebSocket Connection Established.");
    ws.onclose = () => console.warn("WebSocket Connection Closed.");
    ws.onerror = (err) => console.error("WebSocket Error: ", err);
}

function setup() {
    const canvasContainer = document.getElementById("canvas-container");
    mainLayout = canvasContainer?.parentElement?.parentElement;
    consoleContainer = document.getElementById("console-box");
    var cnv = createCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
    cnv.id("map-canvas");
    cnv.parent("canvas-container");
    renderer.setup();
    UI.setup();
    performResize();
    cnv.mouseWheel(UI.controlZoom);
    mousePressed = UI.mousePressed;
    keyPressed = UI.keyPressed;
    mouseDragged = UI.mouseDragged;
    mouseReleased = UI.mouseReleased;
    makeConnection();
    const observer = new ResizeObserver(() => {
        resizeCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight);
    });
    observer.observe(canvasContainer);
    UI.loadLogsFromSupabase();
    const inputBox = document.getElementById("console-input");
    const sendButton = document.getElementById("console-send");
    inputBox.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            const text = inputBox.value.trim();
            if (text.length > 0) {
                UI.log(text);
                inputBox.value = "";
            }
        }
    });
    if (sendButton) {
        sendButton.addEventListener("click", () => {
            const text = inputBox.value.trim();
            if (text.length > 0) {
                UI.log(text);
                inputBox.value = "";
            }
        });
    }
    window.addEventListener("resize", windowResized);
    const clearButton = document.getElementById("console-clear");
    if (clearButton) {
        clearButton.addEventListener("click", async () => {
            if (confirm("Yakin ingin menghapus semua log dari Supabase?")) {
                try {
                    const { error } = await supabase
                        .from("logs")
                        .delete()
                        .neq("id", "00000000-0000-0000-0000-000000000000");
                    if (error) {
                        console.error("Gagal menghapus log:", error);
                        alert("Gagal menghapus log dari Supabase.");
                    } else {
                        document.getElementById("log-output").innerHTML = "";
                        alert("Semua log berhasil dihapus dari Supabase.");
                    }
                } catch (err) {
                    console.error("Terjadi kesalahan:", err);
                    alert("Terjadi kesalahan saat menghapus log.");
                }
            }
        });
    }
}

function draw() {
    background("#1f1f1f");
    renderer.render();
    UI.update();
}
