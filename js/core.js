// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function lerp(a, b, t) {
  t = clamp(t, 0, 1);
  return a + (b - a) * t;
}

function project(point) {
  const z = point.z - camera.z;

  if (z <= 1) return null;

  const scale = FOV / z;

  return {
    x: canvas.width / 2 + (point.x - camera.x) * scale,
    y: canvas.height / 2 + (point.y - camera.y) * scale,
    scale
  };
}

function rotatePoint(p) {
  let { x, y, z } = p;

  const cosY = Math.cos(ship.yaw);
  const sinY = Math.sin(ship.yaw);

  let x1 = x * cosY - z * sinY;
  let z1 = x * sinY + z * cosY;

  x = x1;
  z = z1;

  const cosP = Math.cos(ship.pitch);
  const sinP = Math.sin(ship.pitch);

  let y1 = y * cosP - z * sinP;
  let z2 = y * sinP + z * cosP;

  y = y1;
  z = z2;

  const cosR = Math.cos(ship.roll);
  const sinR = Math.sin(ship.roll);

  let x2 = x * cosR - y * sinR;
  let y2 = x * sinR + y * cosR;

  return {
    x: x2 + ship.x,
    y: y2 + ship.y,
    z: z2 + ship.z
  };
}

window.addEventListener("resize", resize);
resize();

for (let i = 0; i < 280; i++) {
  stars.push({
    x: (Math.random() - 0.5) * 2400,
    y: (Math.random() - 0.5) * 1500,
    z: Math.random() * 2400 + 200
  });
}
