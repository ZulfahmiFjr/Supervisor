var anchor;
var afterRender = [];
var beforeRender = [];
var ws;
let resizeTimeout;
let mainLayout; // Variabel untuk nyimpen div layout utama
let consoleContainer; // Variabel untuk nyimpen div konsol

function performResize() {
  console.log("Executing manual height calculation resize...");
  if (mainLayout && consoleContainer) {
    const leftColumn =
      document.getElementById("canvas-container").parentElement;
    const canvasContainer = document.getElementById("canvas-container");
    const mainLayoutStyles = getComputedStyle(mainLayout);
    const mainLayoutPadding =
      parseFloat(mainLayoutStyles.paddingTop) +
      parseFloat(mainLayoutStyles.paddingBottom);
    const consoleHeight = consoleContainer.getBoundingClientRect().height;
    const gap = parseFloat(getComputedStyle(leftColumn).gap);
    const newCanvasHeight =
      mainLayout.clientHeight - mainLayoutPadding - consoleHeight - gap;
    canvasContainer.style.height = `${newCanvasHeight}px`;
    const bounds = canvasContainer.getBoundingClientRect();
    resizeCanvas(bounds.width, bounds.height);
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

function setup() {
  const canvasContainer = document.getElementById("canvas-container");
  mainLayout = canvasContainer?.parentElement?.parentElement;
  consoleContainer = document.getElementById("console-input")?.parentElement;
  var cnv = createCanvas(
    canvasContainer.offsetWidth,
    canvasContainer.offsetHeight
  );
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
}

function draw() {
  background("#1f1f1f");
  renderer.render();
  UI.update();
}
