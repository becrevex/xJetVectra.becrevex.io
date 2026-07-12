// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

function startLevel(index = 0) {
  levelScore = 0;
  stageComplete.active = false;
  levelState.currentLevelIndex = index;
  levelState.active = true;
  levelState.startTime = performance.now();
  levelState.elapsed = 0;
  levelState.eventRuntime.clear();

  levelState.introCamera = false;
  levelState.introStartTime = performance.now();

  enemies.length = 0;
  shots.length = 0;
  explosions.length = 0;

  playerStatus.shield = playerStatus.maxShield;
  playerStatus.health = playerStatus.maxHealth;

  cameraSettings.zoom = DEFAULT_CAMERA_ZOOM;
  cameraSettings.height = DEFAULT_CAMERA_HEIGHT;
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
      z: ENEMY_SPAWN_Z,
      spreadX: 360,
      spreadY: 210
    });

    runtime.spawned++;
    runtime.lastSpawn = levelState.elapsed;
  }

  if (event.type === "random") {
    const enemyType = event.pool[Math.floor(Math.random() * event.pool.length)];

    spawnEnemy(enemyType, {
      z: ENEMY_SPAWN_Z,
      spreadX: 420,
      spreadY: 240
    });

    runtime.lastSpawn = levelState.elapsed;
  }
}
