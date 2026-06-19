import gsap from "gsap";
import MotionPathPlugin from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

const SVG_NS = "http://www.w3.org/2000/svg";

// --- DOM references ---
const svg = document.getElementById("svg");
const curve = document.getElementById("curve");
const output = document.getElementById("output");
const box = document.getElementById("box");

// --- state ---
let snap = false;
const grid = 20;
let lockEndpoints = false;
let active = null;

// points[0] = start, last = end, the rest are control-point pairs (cp1, cp2)
let points = [
  { x: 625, y: 175 }, // start
  { x: 450, y: 50 },  // cp1
  { x: 250, y: 50 },  // cp2
  { x: 79, y: 117 },  // end
];

// --- build the SVG path string ---
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

// --- render the path + drag handles ---
function update() {
  const path = buildPath();
  curve.setAttribute("d", path);
  output.textContent = path;

  svg.querySelectorAll("circle").forEach((c) => c.remove());

  points.forEach((p, i) => {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 6);
    c.setAttribute("fill", i % 3 === 0 ? "#4f9dff" : "#4fd18b");
    c.dataset.index = i;
    svg.appendChild(c);
  });
}

// --- convert a pointer event to SVG-local coordinates ---
function toSvgCoords(event) {
  const rect = svg.getBoundingClientRect();
  const scaleX = svg.viewBox.baseVal.width / rect.width || 1;
  const scaleY = svg.viewBox.baseVal.height / rect.height || 1;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

// --- dragging ---
function onPointerDown(event) {
  if (event.target.tagName !== "circle") return;

  const index = parseInt(event.target.dataset.index, 10);
  if (lockEndpoints && (index === 0 || index === points.length - 1)) return;

  active = index;
}

function onPointerMove(event) {
  if (active === null) return;

  let { x, y } = toSvgCoords(event);

  if (snap) {
    x = Math.round(x / grid) * grid;
    y = Math.round(y / grid) * grid;
  }

  points[active].x = x;
  points[active].y = y;
  update();
}

function onPointerUp() {
  active = null;
}

// --- add an S-curve segment to the end of the path ---
function addSegment() {
  const last = points[points.length - 1];
  points.push(
    { x: last.x + 100, y: last.y - 150 },
    { x: last.x + 200, y: last.y + 150 },
    { x: last.x + 300, y: last.y }
  );
  update();
}

// --- remove the last segment (keeps at least one base segment / 4 points) ---
function removeSegment() {
  if (points.length <= 4) return;
  points.splice(-3, 3);
  update();
}

// --- toggles ---
function toggleSnap(event) {
  snap = !snap;
  event.currentTarget.textContent = "Snap: " + (snap ? "ON" : "OFF");
}

function toggleLockEndpoints(event) {
  lockEndpoints = !lockEndpoints;
  event.currentTarget.textContent = "Lock Endpoints: " + (lockEndpoints ? "ON" : "OFF");
}

// --- apply start/end coordinates from the inputs ---
function applyEndpoints() {
  points[0].x = parseFloat(document.getElementById("startX").value);
  points[0].y = parseFloat(document.getElementById("startY").value);

  const last = points.length - 1;
  points[last].x = parseFloat(document.getElementById("endX").value);
  points[last].y = parseFloat(document.getElementById("endY").value);

  update();
}

// --- generate a curve (single arc, or alternating S-curve when segments > 1) ---
function generateCurve() {
  const curvature = parseFloat(document.getElementById("curvature").value);
  const segments = parseInt(document.getElementById("segments").value, 10);

  const start = points[0];
  const end = points[points.length - 1];
  const newPoints = [{ ...start }];

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;

    const sx = start.x + (end.x - start.x) * t0;
    const sy = start.y + (end.y - start.y) * t0;
    const ex = start.x + (end.x - start.x) * t1;
    const ey = start.y + (end.y - start.y) * t1;

    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.hypot(dx, dy) || 1;

    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    // alternate direction → S-curve when segments > 1
    const dir = i % 2 === 0 ? 1 : -1;
    const nx = (-dy / dist) * dir;
    const ny = (dx / dist) * dir;
    const arcHeight = dist * curvature;

    const cx = mx + nx * arcHeight;
    const cy = my + ny * arcHeight;

    const cp1 = { x: sx + (cx - sx) * 0.6, y: sy + (cy - sy) * 0.6 };
    const cp2 = { x: ex + (cx - ex) * 0.6, y: ey + (cy - ey) * 0.6 };

    newPoints.push(cp1, cp2, { x: ex, y: ey });
  }

  points = newPoints;
  update();
}

// --- GSAP preview along the current path ---
function preview() {
  const path = buildPath();

  gsap.killTweensOf(box);
  gsap.set(box, { x: points[0].x, y: points[0].y, scale: 1 });

  gsap.to(box, {
    duration: 2,
    ease: "power2.inOut",
    motionPath: {
      path,
      type: "cubic",
    },
    onUpdate() {
      const p = this.progress();
      gsap.set(box, { scale: 1 + 0.5 * Math.sin(Math.PI * p) });
    },
  });
}

// --- wire up events ---
svg.addEventListener("mousedown", onPointerDown);
svg.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);

document.getElementById("generate").addEventListener("click", generateCurve);
document.getElementById("addSegment").addEventListener("click", addSegment);
document.getElementById("removeSegment").addEventListener("click", removeSegment);
document.getElementById("snap").addEventListener("click", toggleSnap);
document.getElementById("preview").addEventListener("click", preview);
document.getElementById("applyEndpoints").addEventListener("click", applyEndpoints);
document.getElementById("lockEndpoints").addEventListener("click", toggleLockEndpoints);

update();
