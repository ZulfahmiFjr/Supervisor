var anchor;
var afterRender = [];
var beforeRender = [];
var ws;

function makeConnection() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("WebSocket is already connected.");
    return;
  }
  const addressInput = document.getElementById("connection-input");
  if (!addressInput) {
    console.error(
      "Fatal Error: Elemen #connection-input tidak ditemukan di HTML."
    );
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
  const mapContainer = document.getElementById("canvas-container");
  var cnv = createCanvas(mapContainer.offsetWidth, mapContainer.offsetHeight);
  cnv.id("map-canvas");
  cnv.parent(document.getElementById("canvas-container"));
  renderer.setup();
  UI.setup();
  cnv.mouseWheel(UI.controlZoom);
  cnv.mousePressed(UI.mousePressed);
  mousePressed = UI.mousePressed;
  keyPressed = UI.keyPressed;
  mouseDragged = UI.mouseDragged;
  mouseReleased = UI.mouseReleased;
  const consoleInput = document.getElementById("console-input");
  if (consoleInput) {
    consoleInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        const command = consoleInput.value.trim();
        if (command && ws && ws.readyState === WebSocket.OPEN) {
          console.log(`Sending command to server: ${command}`);
          ws.send(command);
          UI.log(`> ${command}`);
          consoleInput.value = "";
        } else if (!ws || ws.readyState !== WebSocket.OPEN) {
          console.log("Connection not found. Creating a new connection...");
          makeConnection();
        }
      }
    });
  }
}

function windowResized() {
  const mapContainer = document.getElementById("canvas-container");
  if (mapContainer) {
    resizeCanvas(mapContainer.offsetWidth, mapContainer.offsetHeight);
  }
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
