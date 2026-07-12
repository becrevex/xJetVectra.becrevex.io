// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

// Bootstraps the game after all globals and functions are loaded.

bindDirectionalTouchButton("leftBtn", "left");
bindDirectionalTouchButton("rightBtn", "right");
bindFireAimButton("leftFireBtn");
bindFireAimButton("rightFireBtn");

const weaponCycleBtn = document.getElementById("weaponCycleBtn");

const weaponSelectButtons = {
  PRIMARY: document.getElementById("selectPrimaryBtn"),
  MISSILE: document.getElementById("selectMissileBtn"),
  BOMB: document.getElementById("selectBombBtn")
};

function refreshWeaponSelectionUI() {
  const selectedWeapon = weaponTypes[selectedWeaponIndex];

  if (weaponCycleBtn) {
    weaponCycleBtn.textContent = selectedWeapon;
  }

  for (const weapon of weaponTypes) {
    const btn = weaponSelectButtons[weapon];
    if (!btn) continue;

    btn.classList.toggle("selected", weapon === selectedWeapon);
  }
}

function selectWeapon(weapon, e) {
  if (e) e.preventDefault();

  const index = weaponTypes.indexOf(weapon);
  if (index === -1) return;

  selectedWeaponIndex = index;
  refreshWeaponSelectionUI();
}

if (weaponCycleBtn) {
  function cycleWeapon(e) {
    e.preventDefault();
    selectedWeaponIndex = (selectedWeaponIndex + 1) % weaponTypes.length;
    refreshWeaponSelectionUI();
  }

  weaponCycleBtn.addEventListener("click", cycleWeapon);
  weaponCycleBtn.addEventListener("touchstart", cycleWeapon);
}

for (const weapon of weaponTypes) {
  const btn = weaponSelectButtons[weapon];
  if (!btn) continue;

  btn.addEventListener("click", e => selectWeapon(weapon, e));
  btn.addEventListener("touchstart", e => selectWeapon(weapon, e));
}

const weaponSelectPanel = document.getElementById("weaponSelect");

function selectWeaponFromPoint(clientX, clientY, e = null) {
  const element = document.elementFromPoint(clientX, clientY);
  const button = element && element.closest
    ? element.closest(".weaponSelectButton")
    : null;

  if (!button) return;

  if (button.id === "selectPrimaryBtn") selectWeapon("PRIMARY", e);
  if (button.id === "selectMissileBtn") selectWeapon("MISSILE", e);
  if (button.id === "selectBombBtn") selectWeapon("BOMB", e);
}

if (weaponSelectPanel) {
  let selectingWeaponBySlide = false;

  weaponSelectPanel.addEventListener("touchstart", e => {
    e.preventDefault();
    selectingWeaponBySlide = true;

    const touch = e.changedTouches[0];
    selectWeaponFromPoint(touch.clientX, touch.clientY, e);
  }, { passive: false });

  weaponSelectPanel.addEventListener("touchmove", e => {
    if (!selectingWeaponBySlide) return;

    e.preventDefault();
    const touch = e.changedTouches[0];
    selectWeaponFromPoint(touch.clientX, touch.clientY, e);
  }, { passive: false });

  weaponSelectPanel.addEventListener("touchend", e => {
    e.preventDefault();
    selectingWeaponBySlide = false;
  }, { passive: false });

  weaponSelectPanel.addEventListener("touchcancel", e => {
    e.preventDefault();
    selectingWeaponBySlide = false;
  }, { passive: false });

  weaponSelectPanel.addEventListener("pointerdown", e => {
    if (e.pointerType === "touch") return;
    selectingWeaponBySlide = true;
    selectWeaponFromPoint(e.clientX, e.clientY, e);
  });

  window.addEventListener("pointermove", e => {
    if (!selectingWeaponBySlide || e.pointerType === "touch") return;
    selectWeaponFromPoint(e.clientX, e.clientY, e);
  });

  window.addEventListener("pointerup", e => {
    if (e.pointerType === "touch") return;
    selectingWeaponBySlide = false;
  });
}

refreshWeaponSelectionUI();

const fullscreenBtn = document.getElementById("fullscreenBtn");

if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", async () => {
    const root = document.documentElement;

    try {
      if (!document.fullscreenElement) {
        await root.requestFullscreen();

        // Best effort only: works on many Android browsers/PWAs after fullscreen,
        // but iOS Safari may ignore orientation locks.
        if (screen.orientation && screen.orientation.lock) {
          try {
            await screen.orientation.lock("landscape");
          } catch (orientationErr) {
            console.warn("Landscape lock not available:", orientationErr);
          }
        }

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

    if (!keys.fire) {
      if (weaponTypes[selectedWeaponIndex] === "PRIMARY") {
        keys.fire = true;
      } else {
        fireWeapon(true);
      }
    }
  }

  if (e.key.toLowerCase() === "q") {
    selectedWeaponIndex = (selectedWeaponIndex + 1) % weaponTypes.length;
    refreshWeaponSelectionUI();
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

setupCameraSliders();
setupSpawnEnemyButton();

loop();
