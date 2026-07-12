// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.


function createMissileExplosion(x, y, z, size = 1) {
  explosions.push({
    type: "MISSILE",
    x,
    y,
    z,
    age: 0,
    duration: 28,
    maxRadius: 85 * size,
    particles: Array.from({ length: 16 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.35 + Math.random() * 0.9,
      radius: 0.35 + Math.random() * 0.65
    }))
  });
}

function createBombExplosion(x, y, z) {
  if (typeof playBombExplosion === "function") {
    playBombExplosion();
  }

  const p = project({ x, y, z });

  explosions.push({
    type: "BOMB",
    x,
    y,
    z,
    screenX: p ? p.x : canvas.width / 2,
    screenY: p ? p.y : canvas.height / 2,
    age: 0,
    duration: 58,
    maxRadius: Math.max(canvas.width, canvas.height) * 1.35
  });
}

function createShipHitExplosion(x, y, z, size = 1) {
  explosions.push({
    type: "SHIP_HIT",
    x,
    y,
    z,
    age: 0,
    duration: 14,
    maxRadius: 260 * size,
    particles: Array.from({ length: 90 }, () => ({
      angle: Math.random() * Math.PI * 2,

      // Very fast, wide scatter
      speed: 1.35 + Math.random() * 3.85,

      // Mostly thin, violent streaks
      radius: 0.35 + Math.random() * 0.95,
      streak: 1.8 + Math.random() * 4.5,

      // Mostly white, occasional yellow
      whiteBias: Math.random() > 0.18
    }))
  });

  // Strong white flash
  screenFlash = Math.max(screenFlash, 0.55);
}


function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i];
    ex.age++;

    if (ex.type === "BOMB" && ex.age > ex.duration * 0.72) {
      screenFlash = Math.max(screenFlash, 1 - ex.age / ex.duration);
    }

    if (ex.age >= ex.duration) {
      explosions.splice(i, 1);
    }
  }

  screenFlash *= 0.88;
}

function updateStars() {
  // Perspective drift should follow where the ship is spatially drifting, not
  // how it is rolled. This keeps the starfield stable when the player holds L
  // but rolls right, or holds R but rolls left—the ship changes attitude, but
  // it does not change lanes.
  const spatialAmount = clamp(ship.targetX / DRIFT_X, -1.35, 1.35);
  const verticalAmount = clamp((SHIP_BASE_Y - ship.y) / DRIFT_Y, -1, 1);

  const targetPerspectiveX = -spatialAmount * canvas.width * STARFIELD_BANK_SHIFT;

  // When the ship ascends, push the vanishing point down.
  // When the ship descends, push the vanishing point up.
  const targetPerspectiveY = verticalAmount * canvas.height * STARFIELD_VERTICAL_SHIFT;

  starfieldPerspectiveX += (targetPerspectiveX - starfieldPerspectiveX) * 0.08;
  starfieldPerspectiveY += (targetPerspectiveY - starfieldPerspectiveY) * 0.08;

  for (const star of stars) {
    const boostMultiplier = getWorldSpeedMultiplier();
    const starSpeed = stageComplete.active
      ? SPEED * 4.5
      : SPEED * boostMultiplier;

    star.z -= starSpeed;

    if (star.z <= 10) {
      star.x = (Math.random() - 0.5) * 2400;
      star.y = (Math.random() - 0.5) * 1500;
      star.z = 2400;
    }
  }
}

function projectStar(point) {
  const z = point.z - camera.z;

  if (z <= 1) return null;

  const scale = FOV / z;

  return {
    x: canvas.width / 2 + starfieldPerspectiveX + (point.x - camera.x) * scale,
    y: canvas.height / 2 + starfieldPerspectiveY + (point.y - camera.y) * scale,
    scale
  };
}

function drawStars() {
  for (const star of stars) {
    const current = projectStar(star);
    const previous = projectStar({
      x: star.x,
      y: star.y,
      z: star.z + (stageComplete.active ? 260 : 70 * getWorldSpeedMultiplier())
    });

    if (!current || !previous) continue;

    ctx.strokeStyle = "white";
    ctx.lineWidth = Math.max(1, current.scale * 2.4);

    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
  }
}

// fast radial streaks
function drawExplosions() {
  for (const ex of explosions) {
    const t = clamp(ex.age / ex.duration, 0, 1);
    const alpha = 1 - t;

    if (ex.type === "MISSILE") {
      const p = project(ex);
      if (!p) continue;

      const radius = Math.max(2, ex.maxRadius * smoothstep(t) * p.scale);

      ctx.fillStyle = `rgba(255, 210, 70, ${alpha * 0.95})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 90, 20, ${alpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.62, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 230, ${alpha * 0.75})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.28, 0, Math.PI * 2);
      ctx.fill();

      for (const particle of ex.particles || []) {
        const px = p.x + Math.cos(particle.angle) * radius * particle.speed;
        const py = p.y + Math.sin(particle.angle) * radius * particle.speed;
        const pr = Math.max(1, radius * 0.08 * particle.radius);

        ctx.fillStyle = `rgba(255, 120, 35, ${alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (ex.type === "SHIP_HIT") {
      const p = project(ex);
      if (!p) continue;
    
      const burst = smoothstep(t);
      const radius = Math.max(2, ex.maxRadius * burst * p.scale);
    
      // Pure particle-only burst: no bloom circles, no smoke, no shock ring.
      for (const particle of ex.particles || []) {
        const distance = radius * particle.speed;
    
        const px = p.x + Math.cos(particle.angle) * distance;
        const py = p.y + Math.sin(particle.angle) * distance;
    
        const tailDistance = Math.max(12, radius * 0.26 * particle.streak);
    
        const tx = px - Math.cos(particle.angle) * tailDistance;
        const ty = py - Math.sin(particle.angle) * tailDistance;
    
        const lineWidth = Math.max(1.5, radius * 0.014 * particle.radius);
    
        // Mostly white, with a few hot yellow-white sparks.
        ctx.strokeStyle = particle.whiteBias
          ? `rgba(255, 255, 255, ${alpha})`
          : `rgba(255, 245, 90, ${alpha})`;
    
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.stroke();
    
        // White-hot spark head.
        ctx.fillStyle = particle.whiteBias
          ? `rgba(255, 255, 255, ${alpha})`
          : `rgba(255, 250, 150, ${alpha})`;
    
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.75, lineWidth * 1.7), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (ex.type === "BOMB") {
      const radius = ex.maxRadius * smoothstep(t);
      const ringWidth = Math.max(4, 26 * (1 - t));

      ctx.fillStyle = `rgba(255, 245, 205, ${alpha * 0.24})`;
      ctx.beginPath();
      ctx.arc(ex.screenX, ex.screenY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.85})`;
      ctx.lineWidth = ringWidth;
      ctx.beginPath();
      ctx.arc(ex.screenX, ex.screenY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (screenFlash > 0.02) {
    ctx.fillStyle = `rgba(255,255,255,${screenFlash})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
