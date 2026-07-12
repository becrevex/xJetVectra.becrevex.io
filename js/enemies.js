// Enemy spawning, movement, drawing, player collision, and simple menus.

function setupSpawnEnemyButton() {
  let spawnBtn = document.getElementById("spawnEnemyBtn");
  let startBtn = document.getElementById("startLevelBtn");

  if (!spawnBtn) {
    spawnBtn = document.createElement("button");
    spawnBtn.id = "spawnEnemyBtn";
    spawnBtn.textContent = "Spawn";
    document.body.appendChild(spawnBtn);
  }

  if (!startBtn) {
    startBtn = document.createElement("button");
    startBtn.id = "startLevelBtn";
    startBtn.textContent = "Start";
    document.body.appendChild(startBtn);
  }

  spawnBtn.textContent = "Spawn";
  startBtn.textContent = "Start";

  const baseStyle = {
    position: "fixed",
    left: "16px",
    zIndex: "9999",
    padding: "4px 7px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.75)",
    background: "rgba(0,0,0,0.55)",
    color: "white",
    font: "bold 10px system-ui, sans-serif"
  };

  Object.assign(spawnBtn.style, baseStyle, { top: "92px" });
  Object.assign(startBtn.style, baseStyle, { top: "122px" });

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
    showLevelSelectMenu();
  });

  startBtn.addEventListener("touchstart", e => {
    e.preventDefault();
    showLevelSelectMenu();
  });
}

function getOrCreateOverlay(id, className) {
  let overlay = document.getElementById(id);
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = id;
  overlay.className = className;
  overlay.style.display = "none";
  document.body.appendChild(overlay);
  return overlay;
}

function showLevelSelectMenu() {
  const overlay = getOrCreateOverlay("levelSelectOverlay", "menuOverlay");

  overlay.innerHTML = `
    <div class="menuCard">
      <div class="menuTitle">Select Stage</div>
      <div class="menuSubtitle">Choose a starting point. Stages advance sequentially.</div>
      <div class="menuButtons">
        ${LEVELS.map((level, index) => `
          <button class="menuButton levelChoice" data-level-index="${index}">${level.name}</button>
        `).join("")}
      </div>
      <button class="menuButton secondary" id="cancelLevelSelectBtn">Cancel</button>
    </div>
  `;

  overlay.style.display = "flex";

  overlay.querySelectorAll(".levelChoice").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      startLevel(Number(btn.dataset.levelIndex || 0));
    });

    btn.addEventListener("touchstart", e => {
      e.preventDefault();
      startLevel(Number(btn.dataset.levelIndex || 0));
    }, { passive: false });
  });

  const cancel = overlay.querySelector("#cancelLevelSelectBtn");
  if (cancel) {
    cancel.addEventListener("click", hideLevelSelectMenu);
    cancel.addEventListener("touchstart", e => {
      e.preventDefault();
      hideLevelSelectMenu();
    }, { passive: false });
  }
}

function hideLevelSelectMenu() {
  const overlay = document.getElementById("levelSelectOverlay");
  if (overlay) overlay.style.display = "none";
}

function showGameOverMenu() {
  const overlay = getOrCreateOverlay("gameOverOverlay", "menuOverlay");

  overlay.innerHTML = `
    <div class="menuCard destroyedCard">
      <div class="menuTitle">Ship Destroyed</div>
      <div class="menuSubtitle">Score ${levelScore}</div>
      <div class="menuButtons horizontal">
        <button class="menuButton" id="playAgainBtn">Play Again</button>
        <button class="menuButton secondary" id="quitGameBtn">Quit</button>
      </div>
    </div>
  `;

  overlay.style.display = "flex";

  const again = overlay.querySelector("#playAgainBtn");
  const quit = overlay.querySelector("#quitGameBtn");

  if (again) {
    const playAgain = e => {
      e.preventDefault();
      startLevel(levelState.currentLevelIndex || 0);
    };

    again.addEventListener("click", playAgain);
    again.addEventListener("touchstart", playAgain, { passive: false });
  }

  if (quit) {
    const quitGame = e => {
      e.preventDefault();
      quitToFreePlay();
    };

    quit.addEventListener("click", quitGame);
    quit.addEventListener("touchstart", quitGame, { passive: false });
  }
}

function hideGameOverMenu() {
  const overlay = document.getElementById("gameOverOverlay");
  if (overlay) overlay.style.display = "none";
}

function quitToFreePlay() {
  gameOver.active = false;
  gameOver.handled = false;
  hideGameOverMenu();

  levelState.active = false;
  stageComplete.active = false;
  stageIntro.active = false;

  enemies.length = 0;
  shots.length = 0;
  explosions.length = 0;

  playerStatus.shield = playerStatus.maxShield;
  playerStatus.health = playerStatus.maxHealth;
  playerStatus.invulnFrames = 0;

  ship.x = 0;
  ship.y = SHIP_BASE_Y;
  ship.z = 0;
  ship.targetX = 0;
  ship.targetY = SHIP_BASE_Y;
  ship.roll = 0;
  ship.pitch = 0;
  ship.yaw = 0;
  ship.targetRoll = 0;
  ship.targetPitch = 0;
  ship.targetYaw = 0;

  cameraSettings.zoom = DEFAULT_CAMERA_ZOOM;
  cameraSettings.height = DEFAULT_CAMERA_HEIGHT;
}

function randomEnemyType() {
  const types = ["SPHERE_SMALL", "SPHERE_MEDIUM", "SPHERE_LARGE"];
  return types[Math.floor(Math.random() * types.length)];
}

function getEnemyConfig(type) {
  return ENEMY_TYPES[type] || ENEMY_TYPES.SPHERE_SMALL;
}

function getPerspectiveSpawnPoint(z = ENEMY_SPAWN_Z, spreadX = 360, spreadY = 210) {
  const depth = z - camera.z;
  const scale = FOV / depth;

  const originX = camera.x + starfieldPerspectiveX / scale;
  const originY = camera.y + starfieldPerspectiveY / scale;

  return {
    x: originX + randomRange(-spreadX, spreadX),
    y: originY + randomRange(-spreadY, spreadY),
    z
  };
}

function buildEnemy(type = "SPHERE_SMALL", options = {}) {
  const cfg = getEnemyConfig(type);
  const spawnZ = options.z ?? ENEMY_SPAWN_Z;
  const spawnPoint = getPerspectiveSpawnPoint(
    spawnZ,
    options.spreadX ?? 360,
    options.spreadY ?? 210
  );

  const x = options.x ?? spawnPoint.x;
  const y = options.y ?? spawnPoint.y;
  const z = options.z ?? spawnZ;

  const targetX = options.targetX ?? ship.x;
  const targetY = options.targetY ?? ship.y;
  const targetZ = options.targetZ ?? ship.z;

  const dx = targetX - x;
  const dy = targetY - y;
  const dz = targetZ - z;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));

  const speed = options.speed ?? cfg.speed;

  return {
    type,
    label: cfg.label,
    shape: cfg.shape || "sphere",
    x,
    y,
    z,
    radius: options.radius ?? cfg.radius,
    hp: options.hp ?? cfg.hp,
    maxHp: options.hp ?? cfg.hp,
    speed,
    damage: options.damage ?? cfg.damage,
    scoreValue: options.score ?? cfg.score,
    palette: cfg.palette,
    active: true,
    spin: Math.random() * Math.PI * 2,
    wobble: Math.random() * Math.PI * 2,
    targetX,
    targetY,
    targetZ,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    vz: (dz / len) * speed
  };
}

function spawnEnemy(type = "SPHERE_SMALL", options = {}) {
  if (type === "SPHERE_SMALL" && !options.single && !options.noFormation) {
    spawnSmallEnemyLine(options);
    return;
  }

  enemies.push(buildEnemy(type, options));
}

function spawnSmallEnemyLine(options = {}) {
  const lead = buildEnemy("SPHERE_SMALL", { ...options, single: true });
  enemies.push(lead);

  const speed = Math.max(1, lead.speed);
  const dir = {
    x: lead.vx / speed,
    y: lead.vy / speed,
    z: lead.vz / speed
  };

  const spacing = options.spacing ?? 165;

  for (let i = 1; i < 3; i++) {
    enemies.push(buildEnemy("SPHERE_SMALL", {
      ...options,
      single: true,
      x: lead.x - dir.x * spacing * i,
      y: lead.y - dir.y * spacing * i,
      z: lead.z - dir.z * spacing * i,
      targetX: lead.targetX,
      targetY: lead.targetY,
      targetZ: lead.targetZ
    }));
  }
}

function applyPlayerDamage(amount) {
  if (gameOver.active || playerStatus.invulnFrames > 0) return;

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
    triggerGameOver();
  } else {
    screenFlash = Math.max(screenFlash, 0.25);
  }
}

function updateEnemies() {
  if (gameOver.active) return;

  if (playerStatus.invulnFrames > 0) playerStatus.invulnFrames--;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (!enemy.active) {
      enemies.splice(i, 1);
      continue;
    }

    const speedMultiplier = getWorldSpeedMultiplier();

    if (typeof enemy.vx === "number" && typeof enemy.vy === "number" && typeof enemy.vz === "number") {
      enemy.x += enemy.vx * speedMultiplier;
      enemy.y += enemy.vy * speedMultiplier;
      enemy.z += enemy.vz * speedMultiplier;
    } else {
      enemy.z -= enemy.speed * speedMultiplier;
    }

    enemy.spin += 0.035 + enemy.speed * 0.0008;
    enemy.wobble += 0.025;

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

    if (enemy.z < camera.z - 180) {
      enemies.splice(i, 1);
    }
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    const p = project(enemy);
    if (!p) continue;

    if (enemy.shape === "rock") {
      drawRockEnemy(enemy, p);
      continue;
    }

    if (enemy.shape === "wreckage") {
      drawWreckageEnemy(enemy, p);
      continue;
    }

    drawSphereEnemy(enemy, p);
  }
}

function drawSphereEnemy(enemy, p) {
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

  drawEnemyHealthChip(enemy, p, r);
}

function drawRockEnemy(enemy, p) {
  const r = Math.max(5, enemy.radius * p.scale);
  const points = 9;
  const palette = enemy.palette;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(enemy.spin * 0.25);

  ctx.fillStyle = palette.mid;
  ctx.strokeStyle = palette.ring;
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();

  for (let i = 0; i < points; i++) {
    const a = (Math.PI * 2 * i) / points;
    const rough = 0.72 + 0.28 * Math.sin(enemy.wobble + i * 1.91);
    const px = Math.cos(a) * r * rough;
    const py = Math.sin(a) * r * rough;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.15);
  ctx.lineTo(r * 0.18, -r * 0.32);
  ctx.lineTo(r * 0.38, r * 0.08);
  ctx.stroke();

  ctx.restore();
  drawEnemyHealthChip(enemy, p, r);
}

function drawWreckageEnemy(enemy, p) {
  const r = Math.max(6, enemy.radius * p.scale);
  const palette = enemy.palette;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(enemy.spin * 0.35);

  ctx.fillStyle = palette.mid;
  ctx.strokeStyle = palette.ring;
  ctx.lineWidth = Math.max(1, r * 0.035);

  ctx.beginPath();
  ctx.moveTo(-r * 0.95, -r * 0.2);
  ctx.lineTo(r * 0.65, -r * 0.42);
  ctx.lineTo(r * 0.95, -r * 0.08);
  ctx.lineTo(-r * 0.35, r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.dark;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.05);
  ctx.lineTo(r * 0.8, r * 0.22);
  ctx.lineTo(r * 0.35, r * 0.46);
  ctx.lineTo(-r * 0.72, r * 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.12);
  ctx.lineTo(r * 0.45, -r * 0.24);
  ctx.stroke();

  ctx.restore();
  drawEnemyHealthChip(enemy, p, r);
}

function drawEnemyHealthChip(enemy, p, r) {
  if (enemy.hp >= enemy.maxHp || enemy.radius < 60) return;

  const palette = enemy.palette || getEnemyConfig(enemy.type).palette;
  const pct = clamp(enemy.hp / enemy.maxHp, 0, 1);
  const w = r * 1.25;
  const h = Math.max(2, r * 0.08);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(p.x - w / 2, p.y - r - h * 2.5, w, h);
  ctx.fillStyle = palette.ring;
  ctx.fillRect(p.x - w / 2, p.y - r - h * 2.5, w * pct, h);
}
