// Main frame loop.

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateCamera();

  if (!gameOver.active) {
    updateLevel();
    updateStageComplete();
    updateInput();
    updateShip();
    updateStars();
    updateEnemies();
    updateShots();
  }

  // Explosions continue animating after ship destruction, while the starfield
  // and gameplay motion are frozen for the game-over beat.
  updateExplosions();

  drawStars();
  drawEnemies();
  drawShots();
  drawExplosions();
  drawShip();
  drawHud();

  requestAnimationFrame(loop);
}
