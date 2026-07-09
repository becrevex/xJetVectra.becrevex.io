const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const FOV = 520;
const SPEED = 26;
const MAX_ROLL = Math.PI / 4;
const MAX_YAW = Math.PI / 8;
const MAX_PITCH = Math.PI / 7;
const TOUCH_AIM_RANGE = 95;
const DRIFT_X = 180;
const EDGE_X = 280;
const DRIFT_Y = 150;
const DEFAULT_CAMERA_ZOOM = -520;
const DEFAULT_CAMERA_HEIGHT = 120;
const BARREL_TAP_WINDOW = 260;
const BARREL_DURATION = 520;
const PLAYER_RADIUS = 70;
const weaponTypes = ["PRIMARY", "MISSILE", "BOMB"];
const FIRE_AIM_RANGE = 58;
const FIRE_AIM_STRENGTH = 0.28;

const fireAim = {
  active: false,
  x: 0,
  y: 0
};

let selectedWeaponIndex = 0;
let levelScore = 0;

const stageComplete = {
  active: false,
  startTime: 0
}

const CAMERA_ZOOM_MAX = -120;
const CAMERA_ZOOM_MIN = -900;
const CAMERA_ZOOM_PLAY = -588; // about 40%

const LEVELS = [
  {
    name: "Level 1",
    duration: 120,
    events: [
      {
        start: 5,
        end: 8,
        type: "wave",
        enemy: "SPHERE_SMALL",
        count: 1,
        interval: 1.0
      },
      {
        start: 15,
        end: 25,
        type: "wave",
        enemy: "SPHERE_SMALL",
        count: 4,
        interval: 2.0
      },
      {
        start: 35,
        end: 50,
        type: "random",
        pool: ["SPHERE_SMALL"],
        interval: 2.5
      }
    ]
  }
];

const levelState = {
  currentLevelIndex: 0,
  active: false,
  startTime: 0,
  elapsed: 0,
  eventRuntime: new Map(),
  introCamera: true,
  introStartTime: 0
};

const ship = {
  x: 0,
  y: 55,
  z: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  targetX: 0,
  targetY: 55,
  targetYaw: 0,
  targetPitch: 0,
  targetRoll: 0
};

const camera = {
  x: 0,
  y: DEFAULT_CAMERA_HEIGHT,
  z: DEFAULT_CAMERA_ZOOM
};

const cameraSettings = {
  zoom: DEFAULT_CAMERA_ZOOM,
  height: DEFAULT_CAMERA_HEIGHT
};

const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  fire: false,
  aimPitch: 0
};

const playerStatus = {
  maxShield: 100,
  shield: 100,
  maxHealth: 100,
  health: 100,
  invulnFrames: 0
};

const stars = [];
const shots = [];
const explosions = [];
const enemies = [];

let screenFlash = 0;
let fireCooldown = 0;
let lastLeftTap = 0;
let lastRightTap = 0;

const barrelRoll = {
  active: false,
  direction: 0,
  startTime: 0,
  startX: 0,
  startRoll: 0
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function startBarrelRoll(direction) {
  if (barrelRoll.active) return;

  barrelRoll.active = true;
  barrelRoll.direction = direction;
  barrelRoll.startTime = performance.now();
  barrelRoll.startX = ship.x;
  barrelRoll.startRoll = ship.roll;
}

function checkDoubleTap(sideKey) {
  const now = performance.now();

  if (sideKey === "left") {
    if (now - lastLeftTap < BARREL_TAP_WINDOW) {
      startBarrelRoll(-1);
      lastLeftTap = 0;
    } else {
      lastLeftTap = now;
    }
  }

  if (sideKey === "right") {
    if (now - lastRightTap < BARREL_TAP_WINDOW) {
      startBarrelRoll(1);
      lastRightTap = 0;
    } else {
      lastRightTap = now;
    }
  }
}

function bindDirectionalTouchButton(id, sideKey) {
  const btn = document.getElementById(id);
  if (!btn) return;

  let startX = 0;
  let startY = 0;
  let active = false;

  function clearTouchAiming() {
    keys.up = false;
    keys.down = false;
    keys.aimPitch = 0;
  }

  function updateTouchAim(clientX, clientY) {
    const dx = clientX - startX;
    const dy = clientY - startY;
    const verticalThreshold = 28;

    keys.up = false;
    keys.down = false;

    if (dy < -verticalThreshold) keys.up = true;
    else if (dy > verticalThreshold) keys.down = true;

    const amount = clamp(dx / TOUCH_AIM_RANGE, -1, 1);

    if (sideKey === "left") {
      keys.aimPitch = amount;
    } else {
      keys.aimPitch = -amount;
    }
  }

  btn.addEventListener("touchstart", e => {
    e.preventDefault();

    const touch = e.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    active = true;

    checkDoubleTap(sideKey);
    keys[sideKey] = true;
    clearTouchAiming();
  });

  btn.addEventListener("touchmove", e => {
    e.preventDefault();
    if (!active) return;

    const touch = e.changedTouches[0];
    updateTouchAim(touch.clientX, touch.clientY);
  });

  btn.addEventListener("touchend", e => {
    e.preventDefault();
    active = false;
    keys[sideKey] = false;
    clearTouchAiming();
  });

  btn.addEventListener("touchcancel", e => {
    e.preventDefault();
    active = false;
    keys[sideKey] = false;
    clearTouchAiming();
  });

  btn.addEventListener("mousedown", () => {
    checkDoubleTap(sideKey);
    keys[sideKey] = true;
  });

  btn.addEventListener("mouseup", () => {
    keys[sideKey] = false;
    keys.aimPitch = 0;
  });

  btn.addEventListener("mouseleave", () => {
    keys[sideKey] = false;
    keys.aimPitch = 0;
  });
}

function bindSimpleButton(id, key) {
  const btn = document.getElementById(id);
  if (!btn) return;

  btn.addEventListener("touchstart", e => {
    e.preventDefault();
    keys[key] = true;
  });

  btn.addEventListener("touchend", e => {
    e.preventDefault();
    keys[key] = false;
  });

  btn.addEventListener("touchcancel", e => {
    e.preventDefault();
    keys[key] = false;
  });

  btn.addEventListener("mousedown", () => keys[key] = true);
  btn.addEventListener("mouseup", () => keys[key] = false);
  btn.addEventListener("mouseleave", () => keys[key] = false);
}

bindDirectionalTouchButton("leftBtn", "left");
bindDirectionalTouchButton("rightBtn", "right");
bindFireAimButton("leftFireBtn");
bindFireAimButton("rightFireBtn");

const weaponCycleBtn = document.getElementById("weaponCycleBtn");

if (weaponCycleBtn) {
  weaponCycleBtn.textContent = weaponTypes[selectedWeaponIndex];

  function cycleWeapon(e) {
    e.preventDefault();
    selectedWeaponIndex = (selectedWeaponIndex + 1) % weaponTypes.length;
    weaponCycleBtn.textContent = weaponTypes[selectedWeaponIndex];
  }

  weaponCycleBtn.addEventListener("click", cycleWeapon);
  weaponCycleBtn.addEventListener("touchstart", cycleWeapon);
}

const fullscreenBtn = document.getElementById("fullscreenBtn");

if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", async () => {
    const root = document.documentElement;

    try {
      if (!document.fullscreenElement) {
        await root.requestFullscreen();
        fullscreenBtn.textContent = "X";
      } else {
        await document.exitFullscreen();
        fullscreenBtn.textContent = "□";
      }

      setTimeout(resize, 250);
    } catch (err) {
      console.warn("Fullscreen not available:", err);
    }
  });
}

document.addEventListener("fullscreenchange", () => {
  if (!fullscreenBtn) return;

  fullscreenBtn.textContent = document.fullscreenElement ? "X" : "□";
  setTimeout(resize, 250);
});

window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    if (!keys.left) checkDoubleTap("left");
    keys.left = true;
  }

  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    if (!keys.right) checkDoubleTap("right");
    keys.right = true;
  }

  if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") keys.up = true;
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") keys.down = true;

  if (e.code === "Space") {
    e.preventDefault();
    keys.fire = true;
  }

  if (e.key.toLowerCase() === "q") {
    selectedWeaponIndex = (selectedWeaponIndex + 1) % weaponTypes.length;
    if (weaponCycleBtn) weaponCycleBtn.textContent = weaponTypes[selectedWeaponIndex];
  }

  if (e.key.toLowerCase() === "e") {
    spawnEnemy();
  }
  
  if (e.key.toLowerCase() === "l") {
    startLevel(0);
  }

});

window.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.right = false;
  if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") keys.up = false;
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") keys.down = false;
  if (e.code === "Space") keys.fire = false;
});

function bindFireAimButton(id) {
  const btn = document.getElementById(id);
  if (!btn) return;

  let centerX = 0;
  let centerY = 0;

  function updateAim(clientX, clientY) {
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      fireAim.x = clamp(dx / FIRE_AIM_RANGE, -1, 1);
      fireAim.y = clamp(dy / FIRE_AIM_RANGE, -1, 1);
  }

  function beginAim(e) {
      e.preventDefault();

      const rect = btn.getBoundingClientRect();

      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;

      fireAim.active = true;
      fireAim.x = 0;
      fireAim.y = 0;

      keys.fire = true;
  }

  function moveAim(e) {
      if (!fireAim.active) return;

      e.preventDefault();

      const touch = e.changedTouches[0];
      updateAim(touch.clientX, touch.clientY);
  }

  function endAim(e) {
      e.preventDefault();

      fireAim.active = false;
      fireAim.x = 0;
      fireAim.y = 0;

      keys.fire = false;
  }

  // Mobile
  btn.addEventListener("touchstart", beginAim);
  btn.addEventListener("touchmove", moveAim);
  btn.addEventListener("touchend", endAim);
  btn.addEventListener("touchcancel", endAim);

  // Desktop
  btn.addEventListener("mousedown", beginAim);

  window.addEventListener("mousemove", e => {
      if (!fireAim.active) return;
      updateAim(e.clientX, e.clientY);
  });

  window.addEventListener("mouseup", () => {
      fireAim.active = false;
      fireAim.x = 0;
      fireAim.y = 0;
      keys.fire = false;
  });
}

function setupCameraSliders() {
  const zoomSlider = document.getElementById("cameraZoom");
  const heightSlider = document.getElementById("cameraHeight");

  if (zoomSlider) {
    zoomSlider.min = "-900";
    zoomSlider.max = "-120";
    zoomSlider.value = String(DEFAULT_CAMERA_ZOOM);
    cameraSettings.zoom = Number(zoomSlider.value);

    zoomSlider.addEventListener("input", e => {
      cameraSettings.zoom = Number(e.target.value);
    });
  }

  if (heightSlider) {
    heightSlider.min = "-120";
    heightSlider.max = "120";
    heightSlider.value = String(DEFAULT_CAMERA_HEIGHT);
    cameraSettings.height = Number(heightSlider.value);

    heightSlider.addEventListener("input", e => {
      cameraSettings.height = Number(e.target.value);
    });
  }
}

setupCameraSliders();
setupSpawnEnemyButton();

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

function updateCamera() {
  camera.z += (cameraSettings.zoom - camera.z) * 0.08;
  camera.y += (cameraSettings.height - camera.y) * 0.08;
}

function updateInput() {
  let horizontal = 0;
  let vertical = 0;

  if (keys.left) horizontal -= 1;
  if (keys.right) horizontal += 1;
  if (keys.up) vertical -= 1;
  if (keys.down) vertical += 1;

  if (!barrelRoll.active) {
    ship.targetX = horizontal * DRIFT_X;
    ship.targetRoll = horizontal * MAX_ROLL;
    ship.targetYaw = horizontal * MAX_YAW;
  }

  ship.targetY = 55 + vertical * DRIFT_Y;

  let pitch = 0;

  if (keys.up) pitch += MAX_PITCH * 1.35;
  if (keys.down) pitch -= MAX_PITCH * 1.35;

  pitch += keys.aimPitch * MAX_PITCH * 0.9;

  ship.targetPitch = clamp(
    pitch,
    -MAX_PITCH * 1.5,
    MAX_PITCH * 1.5
  );

  if (keys.fire) fireWeapon();
}

function updateShip() {
  if (barrelRoll.active) {
    const elapsed = performance.now() - barrelRoll.startTime;
    const t = Math.min(1, elapsed / BARREL_DURATION);
    const eased = smoothstep(t);
    const targetEdgeX = barrelRoll.direction * EDGE_X;

    ship.x = barrelRoll.startX + (targetEdgeX - barrelRoll.startX) * eased;
    ship.roll = barrelRoll.startRoll + barrelRoll.direction * Math.PI * 2 * eased;
    ship.yaw = barrelRoll.direction * MAX_YAW * 1.25;

    ship.y += (ship.targetY - ship.y) * 0.045;
    ship.pitch += (ship.targetPitch + keys.aimPitch * MAX_PITCH - ship.pitch) * 0.08;

    if (t >= 1) {
      barrelRoll.active = false;
      ship.x = targetEdgeX;
      ship.targetX = targetEdgeX;

      if (barrelRoll.direction < 0 && keys.left) {
        ship.targetRoll = -MAX_ROLL;
        ship.targetYaw = -MAX_YAW;
      } else if (barrelRoll.direction > 0 && keys.right) {
        ship.targetRoll = MAX_ROLL;
        ship.targetYaw = MAX_YAW;
      } else {
        ship.targetRoll = 0;
        ship.targetYaw = 0;
      }

      ship.roll = ship.targetRoll;
    }

    return;
  }

  ship.x += (ship.targetX - ship.x) * 0.045;
  ship.y += (ship.targetY - ship.y) * 0.045;
  ship.roll += (ship.targetRoll - ship.roll) * 0.08;
  ship.yaw += (ship.targetYaw - ship.yaw) * 0.08;
  ship.pitch += (ship.targetPitch - ship.pitch) * 0.08;
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

function getNoseDirection() {
  const nose = rotatePoint({ x: 0, y: -10, z: 175 });
  const rear = rotatePoint({ x: 0, y: 16, z: -90 });

  const dx = nose.x - rear.x;
  const dy = nose.y - rear.y;
  const dz = nose.z - rear.z;

  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  return {
    x: dx / length,
    y: dy / length,
    z: dz / length
  };
}

function fireWeapon() {
  if (fireCooldown > 0) return;

  const weapon = weaponTypes[selectedWeaponIndex];

  let speed = 58;
  let life = 75;
  let size = 1;
  let cooldown = 8;

  if (weapon === "MISSILE") {
    speed = 42;
    life = 110;
    size = 1.6;
    cooldown = 18;
  }

  if (weapon === "BOMB") {
    speed = 30;
    life = 95;
    size = 2.4;
    cooldown = 32;
  }

  const baseDir = getNoseDirection();

  fireFromGun("left", { x: -34, y: 8, z: 120 }, baseDir, weapon, speed, life, size);
  fireFromGun("right", { x: 34, y: 8, z: 120 }, baseDir, weapon, speed, life, size);

  fireCooldown = cooldown;
}

function fireFromGun(side, muzzleLocal, baseDir, weapon, speed, life, size) {
  const muzzle = rotatePoint(muzzleLocal);

  let dir = { ...baseDir };

  if (weapon === "PRIMARY" && fireAim.active) {
    dir.x += fireAim.x * FIRE_AIM_STRENGTH;
    dir.y += fireAim.y * FIRE_AIM_STRENGTH;

    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    dir.x /= len;
    dir.y /= len;
    dir.z /= len;
  }

  shots.push({
    x: muzzle.x,
    y: muzzle.y,
    z: muzzle.z,
    vx: dir.x * speed,
    vy: dir.y * speed,
    vz: dir.z * speed,
    life,
    radius: weapon === "PRIMARY" ? 8 : weapon === "MISSILE" ? 18 : 34,
    type: weapon,
    size,
    side
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

function startLevel(index = 0) {
  levelScore = 0;
  stageComplete.active = false;
  levelState.currentLevelIndex = index;
  levelState.active = true;
  levelState.startTime = performance.now();
  levelState.elapsed = 0;
  levelState.eventRuntime.clear();

  levelState.introCamera = true;
  levelState.introStartTime = performance.now();

  enemies.length = 0;
  shots.length = 0;
  explosions.length = 0;

  playerStatus.shield = playerStatus.maxShield;
  playerStatus.health = playerStatus.maxHealth;

  cameraSettings.zoom = CAMERA_ZOOM_MAX;
}

function updateLevel() {
  if (!levelState.active) return;

  const level = LEVELS[levelState.currentLevelIndex];
  levelState.elapsed = (performance.now() - levelState.startTime) / 1000;

  updateLevelIntroCamera();

  for (const event of level.events) {
    if (levelState.elapsed < event.start || levelState.elapsed > event.end) {
      continue;
    }

    runLevelEvent(event);
  }

  if (levelState.elapsed >= level.duration) {
    levelState.active = false;
    startStageCompleteSequence();
    //console.log("Level complete:", level.name);
  }
}

function startStageCompleteSequence() {
  stageComplete.active = true;
  stageComplete.startTime = performance.now();

  enemies.length = 0;
  shots.length = 0;
}

function updateStageComplete() {
  if (!stageComplete.active) return;

  const t = (performance.now() - stageComplete.startTime) / 1000;

  cameraSettings.zoom = lerp(CAMERA_ZOOM_PLAY, CAMERA_ZOOM_MIN, clamp(t / 2.0, 0, 1));

  ship.z += 18 + t * 10;

  if (t > 3.5) {
    stageComplete.active = false;
    ship.z = 0;
    cameraSettings.zoom = CAMERA_ZOOM_PLAY;
  }
}

function runLevelEvent(event) {
  const key = `${event.start}-${event.end}-${event.type}-${event.enemy || "random"}`;

  if (!levelState.eventRuntime.has(key)) {
    levelState.eventRuntime.set(key, {
      lastSpawn: -999,
      spawned: 0
    });
  }

  const runtime = levelState.eventRuntime.get(key);
  const interval = event.interval ?? 1.5;

  if (levelState.elapsed - runtime.lastSpawn < interval) {
    return;
  }

  if (event.type === "wave") {
    if (runtime.spawned >= event.count) return;

    spawnEnemy(event.enemy, {
      x: randomRange(-140, 140),
      y: randomRange(-70, 170),
      z: 2300
    });

    runtime.spawned++;
    runtime.lastSpawn = levelState.elapsed;
  }

  if (event.type === "random") {
    const enemyType = event.pool[Math.floor(Math.random() * event.pool.length)];

    spawnEnemy(enemyType, {
      x: randomRange(-180, 180),
      y: randomRange(-90, 190),
      z: 2300
    });

    runtime.lastSpawn = levelState.elapsed;
  }
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
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

    enemy.z -= enemy.speed;
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

function updateShots() {
  if (fireCooldown > 0) fireCooldown--;

  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i];

    shot.x += shot.vx;
    shot.y += shot.vy;
    shot.z += shot.vz;
    shot.life--;

    let hitTarget = false;

    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
      const enemy = enemies[enemyIndex];
      if (!enemy.active) continue;

      const dx = shot.x - enemy.x;
      const dy = shot.y - enemy.y;
      const dz = shot.z - enemy.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < enemy.radius + (shot.radius || 0)) {
        hitTarget = true;

        enemy.hp -= shot.type === "PRIMARY" ? 12 : shot.type === "MISSILE" ? 30 : 60;
        if (enemy.hp <= 0) {
          const distanceBonus = clamp(enemy.z / 2300, 0.15, 1);
          const weaponMultiplier =
            shot.type === "PRIMARY" ? 1 :
            shot.type === "MISSILE" ? 1.4 :
            2.0;
        
          levelScore += Math.round(1000 * distanceBonus * weaponMultiplier);
        }


        if (shot.type === "BOMB") {
          createBombExplosion(shot.x, shot.y, shot.z);
        } else if (shot.type === "MISSILE") {
          createMissileExplosion(shot.x, shot.y, shot.z, shot.size || 1);
        } else {
          createMissileExplosion(shot.x, shot.y, shot.z, 0.35);
        }

        if (enemy.hp <= 0) {
          createMissileExplosion(enemy.x, enemy.y, enemy.z, 1.35);
          enemies.splice(enemyIndex, 1);
        }

        break;
      }
    }

    const expired =
      shot.life <= 0 ||
      shot.z > 3000 ||
      Math.abs(shot.x) > 3000 ||
      Math.abs(shot.y) > 3000;

    if (hitTarget || expired) {
      if (!hitTarget) {
        if (shot.type === "MISSILE") {
          createMissileExplosion(shot.x, shot.y, shot.z, shot.size || 1);
        } else if (shot.type === "BOMB") {
          createBombExplosion(shot.x, shot.y, shot.z);
        }
      }

      shots.splice(i, 1);
    }
  }
}

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

function drawPolygon(points, fillStyle, strokeStyle = null) {
  const projected = points.map(p => project(rotatePoint(p)));

  if (projected.some(p => !p)) return;

  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);

  for (let i = 1; i < projected.length; i++) {
    ctx.lineTo(projected[i].x, projected[i].y);
  }

  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();

  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawShip() {
  const faces = [
    {
      color: "#8fa08f",
      points: [
        { x: -46, y: 20, z: -72 },
        { x: 46, y: 20, z: -72 },
        { x: 30, y: 8, z: 92 },
        { x: -30, y: 8, z: 92 }
      ]
    },
    {
      color: "#667766",
      points: [
        { x: -38, y: 32, z: -86 },
        { x: 38, y: 32, z: -86 },
        { x: 46, y: 20, z: -72 },
        { x: -46, y: 20, z: -72 }
      ]
    },
    {
      color: "#dcebdc",
      points: [
        { x: -42, y: 24, z: -42 },
        { x: -235, y: 60, z: 24 },
        { x: -70, y: 18, z: 98 }
      ]
    },
    {
      color: "#dcebdc",
      points: [
        { x: 42, y: 24, z: -42 },
        { x: 235, y: 60, z: 24 },
        { x: 70, y: 18, z: 98 }
      ]
    },
    {
      color: "#bfcdbf",
      points: [
        { x: -30, y: 8, z: 92 },
        { x: 30, y: 8, z: 92 },
        { x: 0, y: -18, z: 170 }
      ]
    },
    {
      color: "#718171",
      points: [
        { x: -30, y: 8, z: 92 },
        { x: 0, y: 26, z: 150 },
        { x: 30, y: 8, z: 92 }
      ]
    },
    {
      color: "#4d55ff",
      points: [
        { x: -84, y: 30, z: -80 },
        { x: -56, y: 30, z: -80 },
        { x: -48, y: 48, z: 20 },
        { x: -92, y: 48, z: 20 }
      ]
    },
    {
      color: "#4d55ff",
      points: [
        { x: 56, y: 30, z: -80 },
        { x: 84, y: 30, z: -80 },
        { x: 92, y: 48, z: 20 },
        { x: 48, y: 48, z: 20 }
      ]
    },
    {
      color: "#6ed7ff",
      points: [
        { x: -15, y: 2, z: 72 },
        { x: 15, y: 2, z: 72 },
        { x: 9, y: -13, z: 118 },
        { x: -9, y: -13, z: 118 }
      ]
    }
  ];

  faces.sort((a, b) => {
    const za = a.points.reduce((sum, p) => sum + rotatePoint(p).z, 0) / a.points.length;
    const zb = b.points.reduce((sum, p) => sum + rotatePoint(p).z, 0) / b.points.length;
    return zb - za;
  });

  for (const face of faces) {
    drawPolygon(face.points, face.color, "rgba(0,0,0,0.22)");
  }

  drawEngineGlow(-70, 42, -92);
  drawEngineGlow(70, 42, -92);
}

function drawEngineGlow(x, y, z) {
  const p = project(rotatePoint({ x, y, z }));

  if (!p) return;

  ctx.fillStyle = "rgba(75, 110, 255, 0.65)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 16 * p.scale, 22 * p.scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function updateStars() {
  for (const star of stars) {
    const starSpeed = stageComplete.active ? SPEED * 4.5 : SPEED;
    star.z -= starSpeed;

    if (star.z <= 10) {
      star.x = (Math.random() - 0.5) * 2400;
      star.y = (Math.random() - 0.5) * 1500;
      star.z = 2400;
    }
  }
}

function drawStars() {
  for (const star of stars) {
    const current = project(star);
    const previous = project({
      x: star.x,
      y: star.y,
      z: star.z + (stageComplete.active ? 260 : 70)
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

function drawShots() {
  for (const shot of shots) {
    const head = project(shot);
    const tail = project({
      x: shot.x - shot.vx * 1.6,
      y: shot.y - shot.vy * 1.6,
      z: shot.z - shot.vz * 1.6
    });

    if (!head || !tail) continue;

    if (shot.type === "MISSILE") {
      drawMissileShot(shot, head, tail);
      continue;
    }

    if (shot.type === "BOMB") {
      drawBombShot(shot, head);
      continue;
    }

    ctx.strokeStyle = "rgba(255, 80, 40, 0.95)";
    ctx.fillStyle = "rgba(255, 220, 80, 0.95)";
    ctx.lineWidth = Math.max(2, head.scale * 8 * shot.size);

    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(head.x, head.y, Math.max(2, head.scale * 10 * shot.size), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMissileShot(shot, head, tail) {
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const nx = -dy / len;
  const ny = dx / len;

  const bodyWidth = Math.max(5, head.scale * 18 * shot.size);
  const coneLength = Math.max(9, head.scale * 34 * shot.size);
  const bodyEndX = head.x - (dx / len) * coneLength;
  const bodyEndY = head.y - (dy / len) * coneLength;

  ctx.strokeStyle = "rgba(185, 215, 220, 0.96)";
  ctx.lineWidth = bodyWidth;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(bodyEndX, bodyEndY);
  ctx.stroke();

  ctx.lineCap = "butt";
  ctx.fillStyle = "rgba(255, 95, 35, 0.98)";

  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(bodyEndX + nx * bodyWidth * 0.7, bodyEndY + ny * bodyWidth * 0.7);
  ctx.lineTo(bodyEndX - nx * bodyWidth * 0.7, bodyEndY - ny * bodyWidth * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 180, 60, 0.82)";
  ctx.beginPath();
  ctx.arc(tail.x, tail.y, bodyWidth * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawBombShot(shot, head) {
  const radius = Math.max(6, head.scale * 18 * shot.size);

  ctx.fillStyle = "rgba(255, 100, 230, 0.82)";
  ctx.beginPath();
  ctx.arc(head.x, head.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 220, 255, 0.95)";
  ctx.lineWidth = Math.max(2, radius * 0.16);
  ctx.beginPath();
  ctx.arc(head.x, head.y, radius * 1.12, 0, Math.PI * 2);
  ctx.stroke();
}

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

function updateLevelIntroCamera() {
  if (!levelState.introCamera) return;

  const t = (performance.now() - levelState.introStartTime) / 1000;

  if (t < 0.65) {
    cameraSettings.zoom = lerp(CAMERA_ZOOM_MAX, CAMERA_ZOOM_MIN, t / 0.65);
  } else if (t < 1.45) {
    cameraSettings.zoom = lerp(CAMERA_ZOOM_MIN, CAMERA_ZOOM_PLAY, (t - 0.65) / 0.8);
  } else {
    cameraSettings.zoom = CAMERA_ZOOM_PLAY;
    levelState.introCamera = false;
  }
}

function lerp(a, b, t) {
  t = clamp(t, 0, 1);
  return a + (b - a) * t;
}


function drawHud() {
  const x = 16;
  const y = 16;
  const width = 150;
  const barHeight = 7;
  const gap = 7;

  const shieldPct = clamp(playerStatus.shield / playerStatus.maxShield, 0, 1);
  const healthPct = clamp(playerStatus.health / playerStatus.maxHealth, 0, 1);

  ctx.save();

  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("SHIELD", x, y - 3);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x, y, width, barHeight);
  ctx.fillStyle = "rgba(70,170,255,0.95)";
  ctx.fillRect(x, y, width * shieldPct, barHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.strokeRect(x, y, width, barHeight);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("HEALTH", x, y + barHeight + gap + 17);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x, y + barHeight + gap + 20, width, barHeight);
  ctx.fillStyle = "rgba(70,235,100,0.95)";
  ctx.fillRect(x, y + barHeight + gap + 20, width * healthPct, barHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.strokeRect(x, y + barHeight + gap + 20, width, barHeight);

  if (playerStatus.health <= 0) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 42px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SHIP DESTROYED", canvas.width / 2, canvas.height / 2);
  }

  if (levelState.active) {
    const level = LEVELS[levelState.currentLevelIndex];
  
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(
      `${level.name}  ${levelState.elapsed.toFixed(1)} / ${level.duration}s`,
      16,
      78
    );
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText(`SCORE ${levelScore}`, canvas.width / 2, 28);

  if (stageComplete.active) {
    const t = (performance.now() - stageComplete.startTime) / 1000;
    const alpha = clamp(t / 0.5, 0, 1);

    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillText("STAGE COMPLETE", canvas.width / 2, canvas.height / 2);
  }

  ctx.restore();
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateCamera();
  updateLevel();
  updateStageComplete();
  updateInput();
  updateShip();
  updateStars();
  updateEnemies();
  updateShots();
  updateExplosions();
  

  drawStars();
  drawEnemies();
  drawShots();
  drawExplosions();
  drawShip();
  drawHud();

  requestAnimationFrame(loop);
}

loop();