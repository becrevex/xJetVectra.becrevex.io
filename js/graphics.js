// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

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
