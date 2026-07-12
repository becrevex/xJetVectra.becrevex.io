// Level lifecycle, timeline events, stage transitions, and game-over state.

function startLevel(index = 0, options = {}) {
  const safeIndex = clamp(index, 0, LEVELS.length - 1);

  if (options.resetScore !== false) {
    levelScore = 0;
  }
  stageComplete.active = false;
  stageComplete.nextLevelIndex = null;
  stageComplete.advanced = false;

  gameOver.active = false;
  gameOver.handled = false;
  hideGameOverMenu();
  hideLevelSelectMenu();

  levelState.currentLevelIndex = safeIndex;
  levelState.active = true;
  levelState.startTime = performance.now();
  levelState.elapsed = 0;
  levelState.eventRuntime.clear();

  levelState.introCamera = false;
  levelState.introStartTime = performance.now();

  enemies.length = 0;
  shots.length = 0;
  explosions.length = 0;

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

  playerStatus.shield = playerStatus.maxShield;
  playerStatus.health = playerStatus.maxHealth;
  playerStatus.invulnFrames = 0;

  cameraSettings.zoom = DEFAULT_CAMERA_ZOOM;
  cameraSettings.height = DEFAULT_CAMERA_HEIGHT;

  startStageIntro(LEVELS[safeIndex].name);

  if (typeof playStageStart === "function") {
    playStageStart();
  }
}

function startStageIntro(text) {
  stageIntro.active = true;
  stageIntro.text = text;
  stageIntro.startTime = performance.now();
}

function updateLevel() {
  if (!levelState.active || gameOver.active) return;

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
  }
}

function startStageCompleteSequence() {
  stageComplete.active = true;
  stageComplete.startTime = performance.now();
  stageComplete.nextLevelIndex = levelState.currentLevelIndex + 1;
  stageComplete.advanced = false;

  enemies.length = 0;
  shots.length = 0;
}

function updateStageComplete() {
  if (!stageComplete.active || gameOver.active) return;

  const t = (performance.now() - stageComplete.startTime) / 1000;

  cameraSettings.zoom = lerp(CAMERA_ZOOM_PLAY, CAMERA_ZOOM_MIN, clamp(t / 2.0, 0, 1));

  ship.z += 18 + t * 10;

  if (t > 3.5 && !stageComplete.advanced) {
    stageComplete.advanced = true;

    const nextIndex = stageComplete.nextLevelIndex;
    stageComplete.active = false;
    ship.z = 0;
    cameraSettings.zoom = CAMERA_ZOOM_PLAY;

    if (nextIndex !== null && nextIndex < LEVELS.length) {
      startLevel(nextIndex, { resetScore: false });
    } else {
      // No more stages yet. Return to free-play/non-level mode.
      levelState.active = false;
      stageIntro.active = false;
      enemies.length = 0;
      shots.length = 0;
    }
  }
}

function runLevelEvent(event) {
  const key = `${levelState.currentLevelIndex}-${event.start}-${event.end}-${event.type}-${event.enemy || (event.pool || []).join("|")}`;

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
      z: ENEMY_SPAWN_Z,
      spreadX: 360,
      spreadY: 210
    });

    runtime.spawned++;
    runtime.lastSpawn = levelState.elapsed;
  }

  if (event.type === "random" || event.type === "hazard") {
    const pool = event.pool || ["SPHERE_SMALL"];
    const enemyType = pool[Math.floor(Math.random() * pool.length)];

    spawnEnemy(enemyType, {
      z: ENEMY_SPAWN_Z,
      spreadX: event.type === "hazard" ? 520 : 420,
      spreadY: event.type === "hazard" ? 280 : 240
    });

    runtime.spawned++;
    runtime.lastSpawn = levelState.elapsed;
  }
}

function triggerGameOver() {
  if (gameOver.active) return;

  gameOver.active = true;
  gameOver.handled = true;
  gameOver.startTime = performance.now();

  levelState.active = false;
  stageComplete.active = false;
  stageIntro.active = false;

  keys.left = false;
  keys.right = false;
  keys.up = false;
  keys.down = false;
  keys.fire = false;
  fireAim.active = false;

  shots.length = 0;

  createShipHitExplosion(ship.x, ship.y, ship.z + 35, 1.6);
  createBombExplosion(ship.x, ship.y, ship.z + 40);

  showGameOverMenu();
}
