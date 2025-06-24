var anchor;
var afterRender = [];
var beforeRender = [];
var ws;
let resizeTimeout;
let mainLayout; // Variabel untuk nyimpen div layout utama
let consoleContainer; // Variabel untuk nyimpen div konsol

function performResize() {
    const canvasContainer = document.getElementById("canvas-container");
    const consoleBox = document.getElementById("console-box");
    if (canvasContainer && consoleBox) {
        requestAnimationFrame(() => {
            const bodyStyles = window.getComputedStyle(document.body);
            const bodyPaddingTop = parseFloat(bodyStyles.paddingTop) || 0;
            const bodyPaddingBottom = parseFloat(bodyStyles.paddingBottom) || 0;
            const gap = 8;
            const consoleHeight = consoleBox.getBoundingClientRect().height;
            const newCanvasHeight = window.innerHeight - bodyPaddingTop - bodyPaddingBottom - consoleHeight - gap;
            canvasContainer.style.height = `${newCanvasHeight}px`;
            const bounds = canvasContainer.getBoundingClientRect();
            if (typeof resizeCanvas === "function") {
                resizeCanvas(bounds.width, bounds.height);
            }
            if (renderer && renderer.ViewPort && typeof renderer.ViewPort.setOffsets === "function") {
                renderer.ViewPort.setOffsets(bounds.width / 2, bounds.height / 2);
                console.log("Map centered via setOffsets:", bounds.width / 2, bounds.height / 2);
            }
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
