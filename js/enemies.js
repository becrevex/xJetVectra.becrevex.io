// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

function setupSpawnEnemyButton() {
  let spawnBtn = document.getElementById("spawnEnemyBtn");
  let startBtn = document.getElementById("startLevelBtn");

  if (!spawnBtn) {
    spawnBtn = document.createElement("button");
    spawnBtn.id = "spawnEnemyBtn";
    spawnBtn.textContent = "SPAWN ENEMY";
    document.body.appendChild(spawnBtn);
  }

  if (!startBtn) {
    startBtn = document.createElement("button");
    startBtn.id = "startLevelBtn";
    startBtn.textContent = "START GAME";
    document.body.appendChild(startBtn);
  }

  const baseStyle = {
    position: "fixed",
    left: "16px",
    zIndex: "9999",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.75)",
    background: "rgba(0,0,0,0.55)",
    color: "white",
    font: "bold 12px system-ui, sans-serif"
  };

  Object.assign(spawnBtn.style, baseStyle, {
    top: "112px"
  });

  Object.assign(startBtn.style, baseStyle, {
    top: "152px"
  });

  spawnBtn.addEventListener("click", e => {
    e.preventDefault();
    spawnEnemy();
  });

  spawnBtn.addEventListener("touchstart", e => {
    e.preventDefault();
    spawnEnemy();
  });

  startBtn.addEventListener("click", e => {
    e.preventDefault();
    startLevel(0);
  });

  startBtn.addEventListener("touchstart", e => {
    e.preventDefault();
    startLevel(0);
  });
}

function spawnEnemy(type = "SPHERE_SMALL", options = {}) {
  const spreadX = options.x ?? 0;
  const spreadY = options.y ?? 55;

  enemies.push({
    type,
    x: spreadX,
    y: spreadY,
    z: options.z ?? 2300,
    radius: type === "SPHERE_SMALL" ? 52 : 70,
    hp: type === "SPHERE_SMALL" ? 40 : 70,
    speed: options.speed ?? 24,
    active: true,
    spin: Math.random() * Math.PI * 2
  });
}

function applyPlayerDamage(amount) {
  if (playerStatus.invulnFrames > 0) return;

  let remaining = amount;

  if (playerStatus.shield > 0) {
    const absorbed = Math.min(playerStatus.shield, remaining);
    playerStatus.shield -= absorbed;
    remaining -= absorbed;
  }

  if (remaining > 0) {
    playerStatus.health = Math.max(0, playerStatus.health - remaining);
  }

  // Ship-hit particle explosion.
  // This handles enemy collision now, and future enemy projectile hits later.
  createShipHitExplosion(ship.x, ship.y, ship.z + 35, 1.0);

  playerStatus.invulnFrames = 34;

  if (playerStatus.health <= 0) {
    // Old/simple death effect for now.
    createBombExplosion(ship.x, ship.y, ship.z + 40);
  } else {
    screenFlash = Math.max(screenFlash, 0.25);
  }
}

function updateEnemies() {
  if (playerStatus.invulnFrames > 0) playerStatus.invulnFrames--;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (!enemy.active) {
      enemies.splice(i, 1);
      continue;
    }

    enemy.z -= enemy.speed * getWorldSpeedMultiplier();
    enemy.spin += 0.045;

    const dx = enemy.x - ship.x;
    const dy = enemy.y - ship.y;
    const dz = enemy.z - ship.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const tightenedPlayerRadius = PLAYER_RADIUS * 0.52;
    const tightenedEnemyRadius = enemy.radius * 0.62;
    
    if (dist < tightenedEnemyRadius + tightenedPlayerRadius) {
      createMissileExplosion(enemy.x, enemy.y, enemy.z, 1.25);
      applyPlayerDamage(24);
      enemies.splice(i, 1);
      continue;
    }

    if (enemy.z < -260) {
      enemies.splice(i, 1);
    }
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    const p = project(enemy);
    if (!p) continue;

    const r = Math.max(3, enemy.radius * p.scale);

    const gradient = ctx.createRadialGradient(
      p.x - r * 0.35,
      p.y - r * 0.4,
      r * 0.08,
      p.x,
      p.y,
      r
    );

    gradient.addColorStop(0, "rgba(255,255,255,0.98)");
    gradient.addColorStop(0.25, "rgba(230,235,240,0.96)");
    gradient.addColorStop(0.65, "rgba(135,145,155,0.94)");
    gradient.addColorStop(1, "rgba(45,50,58,0.95)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = Math.max(1, r * 0.055);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.03, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(210,220,230,0.42)";
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 0.82, r * 0.22, enemy.spin, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemies_older() {
  for (const enemy of enemies) {
    const p = project(enemy);
    if (!p) continue;

    const r = Math.max(3, enemy.radius * p.scale);

    ctx.fillStyle = "rgba(255, 235, 0, 0.98)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 180, 0.9)";
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.05, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemies_old() {
  for (const enemy of enemies) {
    const p = project(enemy);
    if (!p) continue;

    const r = Math.max(3, enemy.radius * p.scale);

    const grad = ctx.createRadialGradient(
      p.x - r * 0.35,
      p.y - r * 0.35,
      r * 0.1,
      p.x,
      p.y,
      r
    );

    grad.addColorStop(0, "rgba(255, 150, 130, 0.95)");
    grad.addColorStop(0.55, "rgba(170, 65, 85, 0.92)");
    grad.addColorStop(1, "rgba(60, 15, 35, 0.9)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 0.95, r * 0.28, enemy.spin, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,110,80,0.55)";
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.12, 0, Math.PI * 2);
    ctx.stroke();
  }
}
