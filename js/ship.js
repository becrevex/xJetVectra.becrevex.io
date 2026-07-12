// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

function getWorldSpeedMultiplier() {
  // Boost is intentionally disabled for now while the activation model is refined.
  return 1;
}

function getPerspectiveWorldPoint(z = NOSE_PERSPECTIVE_LOCK_Z) {
  const depth = z - camera.z;
  const scale = FOV / depth;

  return {
    x: camera.x + starfieldPerspectiveX / scale,
    y: camera.y + starfieldPerspectiveY / scale,
    z
  };
}

function getPerspectiveAimAngles() {
  const target = getPerspectiveWorldPoint();

  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const dz = target.z - ship.z;

  const horizontalDistance = Math.max(1, Math.sqrt(dx * dx + dz * dz));

  return {
    // rotatePoint's yaw convention is inverted: positive yaw moves the nose left.
    yaw: -Math.atan2(dx, dz),

    // rotatePoint's pitch convention is also inverted relative to screen Y.
    pitch: -Math.atan2(dy, horizontalDistance)
  };
}


function getTwoHandEdgePushDirection() {
  const leftSlide = keys.leftTouchHorizontal || 0;
  const rightSlide = keys.rightTouchHorizontal || 0;

  const pushRight =
    keys.right &&
    rightSlide > EDGE_PUSH_THRESHOLD &&
    keys.left &&
    leftSlide > EDGE_PUSH_THRESHOLD;

  const pushLeft =
    keys.left &&
    leftSlide < -EDGE_PUSH_THRESHOLD &&
    keys.right &&
    rightSlide < -EDGE_PUSH_THRESHOLD;

  if (pushRight && !pushLeft) return 1;
  if (pushLeft && !pushRight) return -1;
  return 0;
}

function computeDirectionalBankRoll(horizontal) {
  const maxVerticalRoll = Math.PI / 2;
  const edgePushDirection = getTwoHandEdgePushDirection();

  if (edgePushDirection !== 0) {
    return edgePushDirection * maxVerticalRoll;
  }

  if (keys.left && !keys.right) {
    const slide = keys.leftTouchHorizontal || 0;

    if (slide < 0) {
      // Hold L + slide left: deepen the left bank until the ship is vertical.
      return lerp(-MAX_ROLL, -maxVerticalRoll, -slide);
    }

    if (slide > 0) {
      // Hold L + slide right: roll the ship through to the opposite vertical
      // attitude while keeping its spatial lane and starfield perspective on
      // the left-side drift line.
      return lerp(-MAX_ROLL, maxVerticalRoll, slide);
    }

    return -MAX_ROLL;
  }

  if (keys.right && !keys.left) {
    const slide = keys.rightTouchHorizontal || 0;

    if (slide > 0) {
      // Hold R + slide right: deepen the right bank until the ship is vertical.
      return lerp(MAX_ROLL, maxVerticalRoll, slide);
    }

    if (slide < 0) {
      // Hold R + slide left: roll the ship through to the opposite vertical
      // attitude while keeping its spatial lane and starfield perspective on
      // the right-side drift line.
      return lerp(MAX_ROLL, -maxVerticalRoll, -slide);
    }

    return MAX_ROLL;
  }

  return horizontal * MAX_ROLL;
}

function updateInput() {
  let horizontal = 0;
  let vertical = 0;

  if (keys.left) horizontal -= 1;
  if (keys.right) horizontal += 1;
  if (keys.up) vertical -= 1;
  if (keys.down) vertical += 1;

  const perspectiveAim = getPerspectiveAimAngles();

  if (!barrelRoll.active) {
    const edgePushDirection = getTwoHandEdgePushDirection();

    // Normal L/R keeps the ship in its left/right drift lane. A two-hand push
    // lets the player press farther into the same side, nearly to the edge of
    // the playfield, without making opposite roll gestures drag the ship back
    // toward center.
    ship.targetX = edgePushDirection !== 0
      ? edgePushDirection * EDGE_X * 0.96
      : horizontal * DRIFT_X;

    ship.targetRoll = computeDirectionalBankRoll(horizontal);

    // The ship's nose should remain visually tied to the current perspective
    // point. Banking/drifting changes the body position and roll attitude, but
    // the nose remains pointed toward the vanishing point. Directional aiming
    // belongs to the fire buttons.
    ship.targetYaw = perspectiveAim.yaw;
  }

  const leftTouchV = keys.leftTouchVertical || 0;
  const rightTouchV = keys.rightTouchVertical || 0;

  // Boost is intentionally disabled for now while the activation model is refined.
  keys.boost = false;

  const bothSticksSameVertical =
    leftTouchV !== 0 &&
    leftTouchV === rightTouchV;

  const verticalDrift = bothSticksSameVertical
    ? 322.5
    : DRIFT_Y;

  ship.targetY = SHIP_BASE_Y + vertical * verticalDrift;

  // Hard-lock the ship nose to the active perspective/vanishing point.
  ship.targetPitch = perspectiveAim.pitch;

  if (keys.fire) fireWeapon(false);
}

function updateShip() {
  if (barrelRoll.active) {
    const elapsed = performance.now() - barrelRoll.startTime;
    const t = Math.min(1, elapsed / BARREL_DURATION);
    const eased = smoothstep(t);
    const targetEdgeX = barrelRoll.direction * EDGE_X;

    ship.x = barrelRoll.startX + (targetEdgeX - barrelRoll.startX) * eased;
    ship.roll = barrelRoll.startRoll + barrelRoll.direction * Math.PI * 2 * eased;
    const perspectiveAim = getPerspectiveAimAngles();
    ship.yaw += (perspectiveAim.yaw - ship.yaw) * 0.22;

    ship.y += (ship.targetY - ship.y) * 0.045;
    ship.pitch += (ship.targetPitch - ship.pitch) * 0.22;

    if (t >= 1) {
      barrelRoll.active = false;
      ship.x = targetEdgeX;
      ship.targetX = targetEdgeX;

      const perspectiveAim = getPerspectiveAimAngles();

      if (barrelRoll.direction < 0 && keys.left) {
        ship.targetRoll = computeDirectionalBankRoll(-1);
      } else if (barrelRoll.direction > 0 && keys.right) {
        ship.targetRoll = computeDirectionalBankRoll(1);
      } else {
        ship.targetRoll = 0;
      }

      ship.targetYaw = perspectiveAim.yaw;
      ship.targetPitch = perspectiveAim.pitch;

      ship.roll = ship.targetRoll;
    }

    return;
  }

  ship.x += (ship.targetX - ship.x) * 0.045;
  ship.y += (ship.targetY - ship.y) * 0.045;
  ship.roll += (ship.targetRoll - ship.roll) * 0.08;
  ship.yaw += (ship.targetYaw - ship.yaw) * 0.22;
  ship.pitch += (ship.targetPitch - ship.pitch) * 0.22;
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

function getPerspectiveDirectionFrom(origin, z = NOSE_PERSPECTIVE_LOCK_Z) {
  const target = getPerspectiveWorldPoint(z);

  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dz = target.z - origin.z;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));

  return {
    x: dx / length,
    y: dy / length,
    z: dz / length
  };
}

function drawShip() {
  if (gameOver.active) return;

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
