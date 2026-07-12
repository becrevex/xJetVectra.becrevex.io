// Enemy spawning, movement, drawing, and player collision.

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

  Object.assign(spawnBtn.style, baseStyle, { top: "112px" });
  Object.assign(startBtn.style, baseStyle, { top: "152px" });

  spawnBtn.addEventListener("click", e => {
    e.preventDefault();
    spawnEnemy(randomEnemyType());
  });

  spawnBtn.addEventListener("touchstart", e => {
    e.preventDefault();
    spawnEnemy(randomEnemyType());
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

function randomEnemyType() {
  const types = Object.keys(ENEMY_TYPES);
  return types[Math.floor(Math.random() * types.length)];
}

function getEnemyConfig(type) {
  return ENEMY_TYPES[type] || ENEMY_TYPES.SPHERE_SMALL;
}

function spawnEnemy(type = "SPHERE_SMALL", options = {}) {
  const cfg = getEnemyConfig(type);

  enemies.push({
    type,
    label: cfg.label,
    x: options.x ?? 0,
    y: options.y ?? 55,
    z: options.z ?? 2300,
    radius: options.radius ?? cfg.radius,
    hp: options.hp ?? cfg.hp,
    maxHp: options.hp ?? cfg.hp,
    speed: options.speed ?? cfg.speed,
    damage: options.damage ?? cfg.damage,
    scoreValue: options.score ?? cfg.score,
    palette: cfg.palette,
    active: true,
    spin: Math.random() * Math.PI * 2
  });
}

function applyPlayerDamage(amount) {
  if (playerStatus.invulnFrames > 0) return;

  if (typeof playDamage === "function") {
    playDamage();
  }

  let remaining = amount;

  if (playerStatus.shield > 0) {
    const absorbed = Math.min(playerStatus.shield, remaining);
    playerStatus.shield -= absorbed;
    remaining -= absorbed;
  }

  if (remaining > 0) {
    playerStatus.health = Math.max(0, playerStatus.health - remaining);
  }

  createShipHitExplosion(ship.x, ship.y, ship.z + 35, 1.0);
  playerStatus.invulnFrames = 34;

  if (playerStatus.health <= 0) {
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
    enemy.spin += 0.035 + enemy.speed * 0.0008;

    const dx = enemy.x - ship.x;
    const dy = enemy.y - ship.y;
    const dz = enemy.z - ship.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const tightenedPlayerRadius = PLAYER_RADIUS * 0.52;
    const tightenedEnemyRadius = enemy.radius * 0.62;

    if (dist < tightenedEnemyRadius + tightenedPlayerRadius) {
      createMissileExplosion(enemy.x, enemy.y, enemy.z, enemy.radius / 52);

      if (typeof playEnemyDestroyedForType === "function") {
        playEnemyDestroyedForType(enemy.type);
      }

      applyPlayerDamage(enemy.damage || 24);
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
    const palette = enemy.palette || getEnemyConfig(enemy.type).palette;

    const gradient = ctx.createRadialGradient(
      p.x - r * 0.35,
      p.y - r * 0.4,
      r * 0.08,
      p.x,
      p.y,
      r
    );

    gradient.addColorStop(0, palette.highlight);
    gradient.addColorStop(0.28, palette.mid);
    gradient.addColorStop(0.72, palette.dark);
    gradient.addColorStop(1, "rgba(15,18,24,0.96)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.ring;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.03, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 0.82, r * 0.22, enemy.spin, 0, Math.PI * 2);
    ctx.stroke();

    // Simple health chip for medium/large enemies once damaged.
    if (enemy.hp < enemy.maxHp && enemy.radius >= 60) {
      const pct = clamp(enemy.hp / enemy.maxHp, 0, 1);
      const w = r * 1.25;
      const h = Math.max(2, r * 0.08);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(p.x - w / 2, p.y - r - h * 2.5, w, h);
      ctx.fillStyle = palette.ring;
      ctx.fillRect(p.x - w / 2, p.y - r - h * 2.5, w * pct, h);
    }
  }
}
