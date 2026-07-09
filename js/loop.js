// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

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
  //updateShipDebris();
  

  drawStars();
  drawEnemies();
  drawShots();
  drawExplosions();
  //drawShipDebris();
  drawShip();
  drawHud();

  requestAnimationFrame(loop);
}
