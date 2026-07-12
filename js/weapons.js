// Player weapons and projectile rendering.

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

  if (typeof playWeaponFireSound === "function") {
    playWeaponFireSound(weapon);
  }

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

function getShotDamage(shot) {
  if (shot.type === "PRIMARY") return 12;
  if (shot.type === "MISSILE") return 30;
  return 60;
}

function getWeaponScoreMultiplier(shot) {
  if (shot.type === "MISSILE") return 1.4;
  if (shot.type === "BOMB") return 2.0;
  return 1.0;
}

function detonateShot(shot, playSound = true) {
  if (shot.type === "MISSILE") {
    createMissileExplosion(shot.x, shot.y, shot.z, shot.size || 1);
    if (playSound && typeof playMissileExplosion === "function") {
      playMissileExplosion();
    }
    return;
  }

  if (shot.type === "BOMB") {
    createBombExplosion(shot.x, shot.y, shot.z);
    return;
  }

  createMissileExplosion(shot.x, shot.y, shot.z, 0.35);
}

function destroyEnemy(enemy) {
  const distanceBonus = clamp(enemy.z / 2300, 0.15, 1);
  levelScore += Math.round((enemy.scoreValue || 1000) * distanceBonus);

  createMissileExplosion(enemy.x, enemy.y, enemy.z, Math.max(0.9, enemy.radius / 52));

  if (typeof playEnemyDestroyedForType === "function") {
    playEnemyDestroyedForType(enemy.type);
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
        enemy.hp -= getShotDamage(shot);

        if (shot.type === "BOMB") {
          createBombExplosion(shot.x, shot.y, shot.z);
        } else if (shot.type === "MISSILE") {
          detonateShot(shot, true);
        } else {
          detonateShot(shot, false);
        }

        if (enemy.hp <= 0) {
          const weaponMultiplier = getWeaponScoreMultiplier(shot);
          const distanceBonus = clamp(enemy.z / 2300, 0.15, 1);
          levelScore += Math.round((enemy.scoreValue || 1000) * distanceBonus * weaponMultiplier);

          createMissileExplosion(enemy.x, enemy.y, enemy.z, Math.max(0.9, enemy.radius / 52));

          if (typeof playEnemyDestroyedForType === "function") {
            playEnemyDestroyedForType(enemy.type);
          }

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
        // Missiles should only explode on impact. They now simply burn out at terminus.
        // Bombs still detonate at terminus because that is part of the bomb behavior.
        if (shot.type === "BOMB") {
          detonateShot(shot, true);
        }
      }

      shots.splice(i, 1);
    }
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

    ctx.strokeStyle = "rgba(60, 190, 255, 0.98)";
    ctx.fillStyle = "rgba(190, 240, 255, 0.98)";
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

  ctx.strokeStyle = "rgba(176, 184, 190, 0.98)";
  ctx.lineWidth = bodyWidth;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(bodyEndX, bodyEndY);
  ctx.stroke();

  ctx.lineCap = "butt";
  ctx.fillStyle = "rgba(210, 24, 28, 0.98)";

  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(bodyEndX + nx * bodyWidth * 0.7, bodyEndY + ny * bodyWidth * 0.7);
  ctx.lineTo(bodyEndX - nx * bodyWidth * 0.7, bodyEndY - ny * bodyWidth * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(120, 126, 132, 0.72)";
  ctx.beginPath();
  ctx.arc(tail.x, tail.y, bodyWidth * 0.46, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(235, 240, 245, 0.78)";
  ctx.lineWidth = Math.max(1, bodyWidth * 0.18);
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y - bodyWidth * 0.25);
  ctx.lineTo(bodyEndX, bodyEndY - bodyWidth * 0.25);
  ctx.stroke();
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
