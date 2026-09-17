import gsap from "gsap";
import MotionPathPlugin from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_SVG_WIDTH = 900;
const DEFAULT_SVG_HEIGHT = 500;
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

let snap = false;
const grid = 20;
let lockEndpoints = false;
let active = null;
let backgroundUrl = null;
let backgroundFileName = "";
let backgroundDrag = null;
let imageDraggingEnabled = false;
const backgroundSettings = { visible: true, opacity: 1, mode: "fit", x: 0, y: 0 };
let points = [
  { x: 79, y: 117 },
  { x: 250, y: 50 },
  { x: 450, y: 50 },
  { x: 625, y: 175 },
];

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function getCanvasSize() {
  return { width: svg.viewBox.baseVal.width || DEFAULT_SVG_WIDTH, height: svg.viewBox.baseVal.height || DEFAULT_SVG_HEIGHT };
}
function updateCanvasInfo() {
  const { width, height } = getCanvasSize();
  canvasSize.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
}
function setSvgCanvasSize(width, height) {
  svg.setAttribute("width", width); svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  stage.style.setProperty("--canvas-width", `${width}px`);
  backgroundImage.setAttribute("width", width); backgroundImage.setAttribute("height", height);
  updateCanvasInfo();
}
function resetToDefaultCanvas() { setSvgCanvasSize(DEFAULT_SVG_WIDTH, DEFAULT_SVG_HEIGHT); backgroundSettings.x = 0; backgroundSettings.y = 0; }
function scalePath(fromWidth, fromHeight, toWidth, toHeight) {
  if (!scalePathOnUpload.checked || !fromWidth || !fromHeight) return;
  const scaleX = toWidth / fromWidth, scaleY = toHeight / fromHeight;
  points = points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }));
}
function updateEndpointInputs() {
  const start = points[0], end = points[points.length - 1];
  startX.value = Math.round(start.x); startY.value = Math.round(start.y);
  endX.value = Math.round(end.x); endY.value = Math.round(end.y);
}
function updateBackgroundControls() {
  const hasImage = Boolean(backgroundUrl);
  clearBackground.disabled = !hasImage; toggleBackground.disabled = !hasImage;
  toggleImageDragging.disabled = !hasImage; backgroundOpacity.disabled = !hasImage; backgroundMode.disabled = !hasImage;
  backgroundOpacity.value = String(backgroundSettings.opacity); backgroundMode.value = backgroundSettings.mode;
  toggleBackground.textContent = backgroundSettings.visible ? "Hide" : "Show";
  toggleImageDragging.textContent = `Move Image: ${imageDraggingEnabled ? "ON" : "OFF"}`;
  backgroundStatus.textContent = hasImage ? backgroundFileName : "No image selected";
}
function updateBackgroundVisuals() {
  if (!backgroundUrl) { backgroundImage.setAttribute("visibility", "hidden"); return; }
  const { width, height } = getCanvasSize();
  backgroundImage.setAttribute("href", backgroundUrl);
  backgroundImage.setAttribute("visibility", backgroundSettings.visible ? "visible" : "hidden");
  backgroundImage.setAttribute("opacity", backgroundSettings.opacity);
  backgroundImage.setAttribute("preserveAspectRatio", backgroundSettings.mode === "cover" ? "xMidYMid slice" : "xMidYMid meet");
  backgroundImage.setAttribute("width", width); backgroundImage.setAttribute("height", height);
  backgroundImage.setAttribute("x", backgroundSettings.x); backgroundImage.setAttribute("y", backgroundSettings.y);
  backgroundImage.style.cursor = imageDraggingEnabled ? "grab" : "default";
}
function buildPath() {
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i += 3) {
    const p1 = points[i], p2 = points[i + 1], p3 = points[i + 2];
    if (!p3) break;
    d += ` C ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}, ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`;
  }
  return d;
}
function update() {
  curve.setAttribute("d", buildPath()); output.textContent = buildPath();
  svg.querySelectorAll("circle").forEach((c) => c.remove());
  points.forEach((p, i) => {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", 6);
    c.setAttribute("fill", i % 3 === 0 ? "#4f9dff" : "#4fd18b"); c.dataset.index = i; svg.appendChild(c);
  });
}
function toSvgCoords(event) {
  const rect = svg.getBoundingClientRect(), { width, height } = getCanvasSize();
  return { x: (event.clientX - rect.left) * (width / rect.width || 1), y: (event.clientY - rect.top) * (height / rect.height || 1) };
}
function onPointerDown(event) {
  if (event.target === backgroundImage && backgroundUrl && backgroundSettings.visible && imageDraggingEnabled) {
    const p = toSvgCoords(event); backgroundDrag = { offsetX: p.x - backgroundSettings.x, offsetY: p.y - backgroundSettings.y }; return;
  }
  if (event.target.tagName !== "circle") return;
  const index = Number(event.target.dataset.index);
  if (lockEndpoints && (index === 0 || index === points.length - 1)) return;
  active = index;
}
function onPointerMove(event) {
  if (backgroundDrag) {
    const p = toSvgCoords(event), { width, height } = getCanvasSize();
    backgroundSettings.x = clamp(p.x - backgroundDrag.offsetX, -width, width);
    backgroundSettings.y = clamp(p.y - backgroundDrag.offsetY, -height, height); updateBackgroundVisuals(); return;
  }
  if (active === null) return;
  let { x, y } = toSvgCoords(event);
  if (snap) { x = Math.round(x / grid) * grid; y = Math.round(y / grid) * grid; }
  points[active] = { x, y }; updateEndpointInputs(); update();
}
function onPointerUp() { backgroundDrag = null; active = null; }
function addSegment() { const p = points[points.length - 1]; points.push({ x: p.x + 100, y: p.y - 150 }, { x: p.x + 200, y: p.y + 150 }, { x: p.x + 300, y: p.y }); update(); }
function removeSegment() { if (points.length <= 4) return; points.splice(-3, 3); updateEndpointInputs(); update(); }
function toggleSnap(event) { snap = !snap; event.currentTarget.textContent = `Snap: ${snap ? "ON" : "OFF"}`; }
function toggleLockEndpoints(event) { lockEndpoints = !lockEndpoints; event.currentTarget.textContent = `Lock Endpoints: ${lockEndpoints ? "ON" : "OFF"}`; }
function toggleImageDraggingMode() { imageDraggingEnabled = !imageDraggingEnabled; backgroundDrag = null; updateBackgroundControls(); updateBackgroundVisuals(); }
function applyEndpoints() {
  points[0] = { x: Number(startX.value), y: Number(startY.value) };
  points[points.length - 1] = { x: Number(endX.value), y: Number(endY.value) }; update();
}
function swapStartEnd() {
  const reversed = [points[points.length - 1]];
  for (let i = points.length - 2; i >= 1; i -= 3) {
    reversed.push(points[i], points[i - 1], points[i - 2]);
  }
  points = reversed;
  updateEndpointInputs(); update();
}
function handleBackgroundUpload(event) {
  const [file] = event.target.files; if (!file) return;
  if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
  const { width: oldWidth, height: oldHeight } = getCanvasSize();
  backgroundUrl = URL.createObjectURL(file); backgroundFileName = file.name;
  backgroundSettings.visible = true; backgroundSettings.opacity = Number(backgroundOpacity.value) || 1; backgroundSettings.x = 0; backgroundSettings.y = 0;
  imageDraggingEnabled = false; backgroundDrag = null;
  const image = new Image();
  image.onload = () => { const width = image.naturalWidth || DEFAULT_SVG_WIDTH, height = image.naturalHeight || DEFAULT_SVG_HEIGHT; scalePath(oldWidth, oldHeight, width, height); setSvgCanvasSize(width, height); updateEndpointInputs(); updateBackgroundVisuals(); updateBackgroundControls(); update(); };
  image.src = backgroundUrl;
}
function removeBackground() {
  if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
  backgroundUrl = null; backgroundFileName = ""; backgroundUpload.value = "";
  backgroundSettings.visible = true; backgroundSettings.opacity = 1; backgroundSettings.mode = "fit"; backgroundSettings.x = 0; backgroundSettings.y = 0;
  imageDraggingEnabled = false; backgroundDrag = null; resetToDefaultCanvas(); updateEndpointInputs(); updateBackgroundVisuals(); updateBackgroundControls(); update();
}
function toggleBackgroundVisibility() { if (!backgroundUrl) return; backgroundSettings.visible = !backgroundSettings.visible; updateBackgroundVisuals(); updateBackgroundControls(); }
function updateBackgroundOpacity(event) { backgroundSettings.opacity = Number(event.target.value); updateBackgroundVisuals(); }
function updateBackgroundMode(event) { backgroundSettings.mode = event.target.value; updateBackgroundVisuals(); }
function generateCurve() {
  const curvature = Number(document.getElementById("curvature").value), segments = Number(document.getElementById("segments").value);
  const start = points[0], end = points[points.length - 1], next = [{ ...start }];
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments, t1 = (i + 1) / segments;
    const sx = start.x + (end.x - start.x) * t0, sy = start.y + (end.y - start.y) * t0;
    const ex = start.x + (end.x - start.x) * t1, ey = start.y + (end.y - start.y) * t1;
    const dx = ex - sx, dy = ey - sy, dist = Math.hypot(dx, dy) || 1, dir = i % 2 === 0 ? 1 : -1;
    const mx = (sx + ex) / 2, my = (sy + ey) / 2, nx = (-dy / dist) * dir, ny = (dx / dist) * dir, h = dist * curvature;
    const cx = mx + nx * h, cy = my + ny * h;
    next.push({ x: sx + (cx - sx) * 0.6, y: sy + (cy - sy) * 0.6 }, { x: ex + (cx - ex) * 0.6, y: ey + (cy - ey) * 0.6 }, { x: ex, y: ey });
  }
  points = next; updateEndpointInputs(); update();
}
function preview() {
  gsap.killTweensOf(box); gsap.set(box, { x: points[0].x, y: points[0].y, scale: 1 });
  gsap.to(box, { duration: 2, ease: "power2.inOut", motionPath: { path: buildPath(), type: "cubic" }, onUpdate() { gsap.set(box, { scale: 1 + 0.5 * Math.sin(Math.PI * this.progress()) }); } });
}
svg.addEventListener("mousedown", onPointerDown); svg.addEventListener("mousemove", onPointerMove); window.addEventListener("mouseup", onPointerUp);
document.getElementById("generate").addEventListener("click", generateCurve);
document.getElementById("addSegment").addEventListener("click", addSegment);
document.getElementById("removeSegment").addEventListener("click", removeSegment);
document.getElementById("snap").addEventListener("click", toggleSnap);
document.getElementById("preview").addEventListener("click", preview);
document.getElementById("applyEndpoints").addEventListener("click", applyEndpoints);
document.getElementById("swapEndpoints").addEventListener("click", swapStartEnd);
document.getElementById("lockEndpoints").addEventListener("click", toggleLockEndpoints);
backgroundUpload.addEventListener("change", handleBackgroundUpload); clearBackground.addEventListener("click", removeBackground); toggleBackground.addEventListener("click", toggleBackgroundVisibility); toggleImageDragging.addEventListener("click", toggleImageDraggingMode); backgroundOpacity.addEventListener("input", updateBackgroundOpacity); backgroundMode.addEventListener("change", updateBackgroundMode);
resetToDefaultCanvas(); updateBackgroundVisuals(); updateBackgroundControls(); updateEndpointInputs(); update();
