# Bezier Path Editor

An interactive cubic Bézier / motion path editor built with [GSAP](https://gsap.com/).
Drag the handles to shape a path, generate curves procedurally, and preview an
element animating along the path with the MotionPathPlugin.

## Features

- **Drag handles** — blue dots are anchors (start/end), green dots are control points.
- **Generate** — build a single arc or an alternating S-curve from a curvature value and segment count.
- **+ Segment** — extend the path with another cubic segment.
- **Lock Endpoints** — freeze the start/end points while dragging.
- **Snap** — snap dragging to a 20px grid.
- **Start / End inputs** — set the endpoints numerically.
- **Preview** — animate a box along the path with a pulse effect.

The generated SVG path string is shown live below the canvas.

## Getting started

There is no build step. GSAP is loaded from a CDN via an
[import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
in `index.html`, so you just need to serve the folder over HTTP (ES modules
don't load from `file://`).

```bash
npm start
```

This runs a static server via `npx serve`. Any static server works equally well:

```bash
python -m http.server 8000     # then open http://localhost:8000
```

## Project structure

| File           | Purpose                                       |
| -------------- | --------------------------------------------- |
| `index.html`   | Markup, layout, and the GSAP import map       |
| `style.css`    | Styles                                        |
| `script.js`    | Editor logic and GSAP animation (ES module)   |
| `package.json` | Project metadata and the `start` script       |
