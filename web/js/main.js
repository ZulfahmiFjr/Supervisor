var anchor;
var afterRender = [];
var beforeRender = [];

const defaultAddress = "ws://localhost:27095";

// function setup() {
//   // === BAGIAN YANG DIUBAH ===
//   // 1. Dapatkan elemen kontainer map yang baru
//   const mapContainer = document.getElementById("canvas-container");

//   // 2. Buat kanvas seukuran kontainer tersebut
//   var cnv = createCanvas(mapContainer.offsetWidth, mapContainer.offsetHeight);

//   // 3. Tempelkan kanvas ke kontainer map yang baru
//   cnv.parent(document.getElementById("canvas-container"));
//   // =========================

//   // === SISA KODE ANDA TETAP SAMA PERSIS ===
//   cnv.mouseWheel(UI.controlZoom);
//   cnv.mousePressed(UI.mousePressed);

//   mousePressed = UI.mousePressed;
//   keyPressed = UI.keyPressed;
//   mouseDragged = UI.mouseDragged;
//   mouseReleased = UI.mouseReleased;

//   // Prepare
//   renderer.setup();
//   UI.setup();
// }

function makeConnection() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return; // Jangan buat koneksi ganda
  }
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
  ws.onmessage = (event) => {
    // Biarkan pocketcore.js yang menangani pesan
    // console.log("Message from server:", event.data);
  };
}

function setup() {
  const mapContainer = document.getElementById("canvas-container");

  // 2. Buat kanvas seukuran kontainer tersebut
  var cnv = createCanvas(mapContainer.offsetWidth, mapContainer.offsetHeight);
  cnv.id("map-canvas");

  cnv.parent(document.getElementById("canvas-container"));

  cnv.mouseWheel(UI.controlZoom);
  cnv.mousePressed(UI.mousePressed);

  mousePressed = UI.mousePressed;
  keyPressed = UI.keyPressed;
  mouseDragged = UI.mouseDragged;
  mouseReleased = UI.mouseReleased;

  // Prepare
  renderer.setup();
  UI.setup();
  //makeConnection();
}

function windowResized() {
  // Dapatkan lagi elemen dan ukurannya yang baru
  const mapContainer = document.getElementById("canvas-container");
  const containerWidth = mapContainer.offsetWidth;
  const containerHeight = mapContainer.offsetHeight;

  // Ubah ukuran kanvas yang sudah ada
  resizeCanvas(containerWidth, containerHeight);
}
// function windowResized() {
//   resizeCanvas(windowWidth, windowHeight);
// }

function draw() {
  background("#1f1f1f");

  beforeRender.forEach((cb) => cb());
  beforeRender = [];

  UI.update();
  renderer.render();

  afterRender.forEach((cb) => cb());
  afterRender = [];
}
