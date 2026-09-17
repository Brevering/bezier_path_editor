import gsap from "gsap";
import MotionPathPlugin from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_SVG_WIDTH = 900;
const DEFAULT_SVG_HEIGHT = 500;
const HANDLE_SCREEN_RADIUS = 7;

const svg = document.getElementById("svg");
const stage = document.querySelector(".stage");
const curve = document.getElementById("curve");
const output = document.getElementById("output");
const box = document.getElementById("box");
const backgroundImage = document.getElementById("backgroundImage");
const backgroundUpload = document.getElementById("backgroundUpload");
const clearBackground = document.getElementById("clearBackground");
const toggleBackground = document.getElementById("toggleBackground");
const toggleImageDragging = document.getElementById("toggleImageDragging");
const backgroundStatus = document.getElementById("backgroundStatus");
const backgroundOpacity = document.getElementById("backgroundOpacity");
const backgroundMode = document.getElementById("backgroundMode");
const scalePathOnUpload = document.getElementById("scalePathOnUpload");
const canvasSize = document.getElementById("canvasSize");
const startX = document.getElementById("startX");
const startY = document.getElementById("startY");
const endX = document.getElementById("endX");
const endY = document.getElementById("endY");

let snap = false;
const grid = 20;
let lockEndpoints = false;
let active = null;
let backgroundUrl = null;
let backgroundFileName = "";
let backgroundDrag = null;
let imageDraggingEnabled = false;

const backgroundSettings = {
  visible: true,
  opacity: 1,
  mode: "fit",
  x: 0,
  y: 0,
};

let points = [
  { x: 79, y: 117 },
  { x: 250, y: 50 },
  { x: 450, y: 50 },
  { x: 625, y: 175 },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCanvasSize() {
  return {
    width: svg.viewBox.baseVal.width || DEFAULT_SVG_WIDTH,
    height: svg.viewBox.baseVal.height || DEFAULT_SVG_HEIGHT,
  };
}

function getHandleRadius() {
  const { width } = getCanvasSize();
  const rect = svg.getBoundingClientRect();
  const screenScale = rect.width ? rect.width / width : 1;

  // Keep handles approximately the same visible size on screen even when
  // the SVG viewBox represents a much larger image in pixels.
  return HANDLE_SCREEN_RADIUS / screenScale;
}

function updateCanvasInfo() {
  const { width, height } = getCanvasSize();
  canvasSize.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
}

function setSvgCanvasSize(width, height) {
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  stage.style.setProperty("--canvas-width", `${width}px`);
  backgroundImage.setAttribute("width", String(width));
  backgroundImage.setAttribute("height", String(height));
  updateCanvasInfo();
}

function resetToDefaultCanvas() {
  setSvgCanvasSize(DEFAULT_SVG_WIDTH, DEFAULT_SVG_HEIGHT);
  backgroundSettings.x = 0;
  backgroundSettings.y = 0;
}

function scalePath(fromWidth, fromHeight, toWidth, toHeight) {
  if (!scalePathOnUpload.checked || !fromWidth || !fromHeight) return;

  const scaleX = toWidth / fromWidth;
  const scaleY = toHeight / fromHeight;
  points = points.map((point) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  }));
}

function updateEndpointInputs() {
  const start = points[0];
  const end = points[points.length - 1];
  startX.value = String(Math.round(start.x));
  startY.value = String(Math.round(start.y));
  endX.value = String(Math.round(end.x));
  endY.value = String(Math.round(end.y));
}

function updateBackgroundControls() {
  const hasImage = Boolean(backgroundUrl);

  clearBackground.disabled = !hasImage;
  toggleBackground.disabled = !hasImage;
  toggleImageDragging.disabled = !hasImage;
  backgroundOpacity.disabled = !hasImage;
  backgroundMode.disabled = !hasImage;

  backgroundOpacity.value = String(backgroundSettings.opacity);
  backgroundMode.value = backgroundSettings.mode;
  toggleBackground.textContent = backgroundSettings.visible ? "Hide" : "Show";
  toggleImageDragging.textContent = `Move Image: ${imageDraggingEnabled ? "ON" : "OFF"}`;
  backgroundStatus.textContent = hasImage ? backgroundFileName : "No image selected";
}

function updateBackgroundVisuals() {
  if (!backgroundUrl) {
    backgroundImage.setAttribute("visibility", "hidden");
    return;
  }

  const { width, height } = getCanvasSize();
  backgroundImage.setAttribute("href", backgroundUrl);
  backgroundImage.setAttribute("visibility", backgroundSettings.visible ? "visible" : "hidden");
  backgroundImage.setAttribute("opacity", String(backgroundSettings.opacity));
  backgroundImage.setAttribute(
    "preserveAspectRatio",
    backgroundSettings.mode === "cover" ? "xMidYMid slice" : "xMidYMid meet"
  );
  backgroundImage.setAttribute("width", String(width));
  backgroundImage.setAttribute("height", String(height));
  backgroundImage.setAttribute("x", String(backgroundSettings.x));
  backgroundImage.setAttribute("y", String(backgroundSettings.y));
  backgroundImage.style.cursor = imageDraggingEnabled ? "grab" : "default";
}

function buildPath() {
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 1; i < points.length; i += 3) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2];
    if (!p3) break;

    d += ` C ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}, ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`;
  }

  return d;
}

function update() {
  const path = buildPath();
  const handleRadius = getHandleRadius();

  curve.setAttribute("d", path);
  output.textContent = path;

  svg.querySelectorAll("circle").forEach((circle) => circle.remove());

  points.forEach((point, index) => {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(point.x));
    circle.setAttribute("cy", String(point.y));
    circle.setAttribute("r", String(handleRadius));
    circle.setAttribute("fill", index % 3 === 0 ? "#4f9dff" : "#4fd18b");
    circle.dataset.index = String(index);
    svg.appendChild(circle);
  });
}

function toSvgCoords(event) {
  const rect = svg.getBoundingClientRect();
  const { width, height } = getCanvasSize();

  return {
    x: (event.clientX - rect.left) * (width / rect.width || 1),
    y: (event.clientY - rect.top) * (height / rect.height || 1),
  };
}

function onPointerDown(event) {
  if (event.target === backgroundImage && backgroundUrl && backgroundSettings.visible && imageDraggingEnabled) {
    const point = toSvgCoords(event);
    backgroundDrag = {
      offsetX: point.x - backgroundSettings.x,
      offsetY: point.y - backgroundSettings.y,
    };
    return;
  }

  if (event.target.tagName !== "circle") return;

  const index = Number(event.target.dataset.index);
  if (lockEndpoints && (index === 0 || index === points.length - 1)) return;
  active = index;
}

function onPointerMove(event) {
  if (backgroundDrag) {
    const point = toSvgCoords(event);
    const { width, height } = getCanvasSize();
    backgroundSettings.x = clamp(point.x - backgroundDrag.offsetX, -width, width);
    backgroundSettings.y = clamp(point.y - backgroundDrag.offsetY, -height, height);
    updateBackgroundVisuals();
    return;
  }

  if (active === null) return;

  let { x, y } = toSvgCoords(event);
  if (snap) {
    x = Math.round(x / grid) * grid;
    y = Math.round(y / grid) * grid;
  }

  points[active] = { x, y };
  updateEndpointInputs();
  update();
}

function onPointerUp() {
  backgroundDrag = null;
  active = null;
}

function addSegment() {
  const last = points[points.length - 1];
  points.push(
    { x: last.x + 100, y: last.y - 150 },
    { x: last.x + 200, y: last.y + 150 },
    { x: last.x + 300, y: last.y }
  );
  update();
}

function removeSegment() {
  if (points.length <= 4) return;
  points.splice(-3, 3);
  updateEndpointInputs();
  update();
}

function toggleSnap(event) {
  snap = !snap;
  event.currentTarget.textContent = `Snap: ${snap ? "ON" : "OFF"}`;
}

function toggleLockEndpoints(event) {
  lockEndpoints = !lockEndpoints;
  event.currentTarget.textContent = `Lock Endpoints: ${lockEndpoints ? "ON" : "OFF"}`;
}

function toggleImageDraggingMode() {
  imageDraggingEnabled = !imageDraggingEnabled;
  backgroundDrag = null;
  updateBackgroundControls();
  updateBackgroundVisuals();
}

function applyEndpoints() {
  points[0] = { x: Number(startX.value), y: Number(startY.value) };
  points[points.length - 1] = { x: Number(endX.value), y: Number(endY.value) };
  update();
}

function swapStartEnd() {
  const reversed = [points[points.length - 1]];

  for (let i = points.length - 2; i >= 1; i -= 3) {
    reversed.push(points[i], points[i - 1], points[i - 2]);
  }

  points = reversed;
  updateEndpointInputs();
  update();
}

function handleBackgroundUpload(event) {
  const [file] = event.target.files;
  if (!file) return;

  if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);

  const { width: oldWidth, height: oldHeight } = getCanvasSize();
  backgroundUrl = URL.createObjectURL(file);
  backgroundFileName = file.name;
  backgroundSettings.visible = true;
  backgroundSettings.opacity = Number(backgroundOpacity.value) || 1;
  backgroundSettings.x = 0;
  backgroundSettings.y = 0;
  imageDraggingEnabled = false;
  backgroundDrag = null;

  const image = new Image();
  image.onload = () => {
    const width = image.naturalWidth || DEFAULT_SVG_WIDTH;
    const height = image.naturalHeight || DEFAULT_SVG_HEIGHT;

    scalePath(oldWidth, oldHeight, width, height);
    setSvgCanvasSize(width, height);
    updateEndpointInputs();
    updateBackgroundVisuals();
    updateBackgroundControls();
    update();
  };
  image.src = backgroundUrl;
}

function removeBackground() {
  if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);

  backgroundUrl = null;
  backgroundFileName = "";
  backgroundUpload.value = "";
  backgroundSettings.visible = true;
  backgroundSettings.opacity = 1;
  backgroundSettings.mode = "fit";
  backgroundSettings.x = 0;
  backgroundSettings.y = 0;
  imageDraggingEnabled = false;
  backgroundDrag = null;

  resetToDefaultCanvas();
  updateEndpointInputs();
  updateBackgroundVisuals();
  updateBackgroundControls();
  update();
}

function toggleBackgroundVisibility() {
  if (!backgroundUrl) return;
  backgroundSettings.visible = !backgroundSettings.visible;
  backgroundDrag = null;
  updateBackgroundVisuals();
  updateBackgroundControls();
}

function updateBackgroundOpacity(event) {
  backgroundSettings.opacity = Number(event.target.value);
  updateBackgroundVisuals();
}

function updateBackgroundMode(event) {
  backgroundSettings.mode = event.target.value;
  updateBackgroundVisuals();
}

function generateCurve() {
  const curvature = Number(document.getElementById("curvature").value);
  const segments = Number(document.getElementById("segments").value);
  const start = points[0];
  const end = points[points.length - 1];
  const next = [{ ...start }];

  for (let i = 0; i < segments; i += 1) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const sx = start.x + (end.x - start.x) * t0;
    const sy = start.y + (end.y - start.y) * t0;
    const ex = start.x + (end.x - start.x) * t1;
    const ey = start.y + (end.y - start.y) * t1;
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.hypot(dx, dy) || 1;
    const dir = i % 2 === 0 ? 1 : -1;
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const nx = (-dy / dist) * dir;
    const ny = (dx / dist) * dir;
    const height = dist * curvature;
    const cx = mx + nx * height;
    const cy = my + ny * height;

    next.push(
      { x: sx + (cx - sx) * 0.6, y: sy + (cy - sy) * 0.6 },
      { x: ex + (cx - ex) * 0.6, y: ey + (cy - ey) * 0.6 },
      { x: ex, y: ey }
    );
  }

  points = next;
  updateEndpointInputs();
  update();
}

function preview() {
  gsap.killTweensOf(box);
  gsap.set(box, { x: points[0].x, y: points[0].y, scale: 1 });
  gsap.to(box, {
    duration: 2,
    ease: "power2.inOut",
    motionPath: { path: buildPath(), type: "cubic" },
    onUpdate() {
      gsap.set(box, { scale: 1 + 0.5 * Math.sin(Math.PI * this.progress()) });
    },
  });
}

svg.addEventListener("mousedown", onPointerDown);
svg.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);
window.addEventListener("resize", update);

document.getElementById("generate").addEventListener("click", generateCurve);
document.getElementById("addSegment").addEventListener("click", addSegment);
document.getElementById("removeSegment").addEventListener("click", removeSegment);
document.getElementById("snap").addEventListener("click", toggleSnap);
document.getElementById("preview").addEventListener("click", preview);
document.getElementById("applyEndpoints").addEventListener("click", applyEndpoints);
document.getElementById("swapEndpoints").addEventListener("click", swapStartEnd);
document.getElementById("lockEndpoints").addEventListener("click", toggleLockEndpoints);
backgroundUpload.addEventListener("change", handleBackgroundUpload);
clearBackground.addEventListener("click", removeBackground);
toggleBackground.addEventListener("click", toggleBackgroundVisibility);
toggleImageDragging.addEventListener("click", toggleImageDraggingMode);
backgroundOpacity.addEventListener("input", updateBackgroundOpacity);
backgroundMode.addEventListener("change", updateBackgroundMode);

resetToDefaultCanvas();
updateBackgroundVisuals();
updateBackgroundControls();
updateEndpointInputs();
update();
