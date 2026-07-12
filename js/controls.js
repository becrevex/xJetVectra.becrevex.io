// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

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

  const verticalKey = sideKey === "left"
    ? "leftTouchVertical"
    : "rightTouchVertical";

  const horizontalKey = sideKey === "left"
    ? "leftTouchHorizontal"
    : "rightTouchHorizontal";

  function syncVerticalKeys() {
    const leftV = keys.leftTouchVertical || 0;
    const rightV = keys.rightTouchVertical || 0;

    const anyUp = leftV === -1 || rightV === -1;
    const anyDown = leftV === 1 || rightV === 1;

    if (anyUp && !anyDown) {
      keys.up = true;
      keys.down = false;
    } else if (anyDown && !anyUp) {
      keys.up = false;
      keys.down = true;
    } else {
      keys.up = false;
      keys.down = false;
    }
  }

  function clearTouchModifiers() {
    keys[verticalKey] = 0;
    keys[horizontalKey] = 0;
    syncVerticalKeys();
  }

  function updateTouchModifiers(clientX, clientY) {
    const dx = clientX - startX;
    const dy = clientY - startY;
    const verticalThreshold = 28;

    let verticalDirection = 0;

    if (dy < -verticalThreshold) {
      verticalDirection = -1;
    } else if (dy > verticalThreshold) {
      verticalDirection = 1;
    }

    keys[verticalKey] = verticalDirection;
    syncVerticalKeys();

    // Horizontal slide on the held L/R button now controls bank/roll only.
    // Weapon direction belongs to the fire buttons; the ship nose remains
    // locked to the vanishing point.
    keys[horizontalKey] = clamp(dx / TOUCH_AIM_RANGE, -1, 1);
  }

  btn.addEventListener("touchstart", e => {
    e.preventDefault();

    const touch = e.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    active = true;

    checkDoubleTap(sideKey);
    keys[sideKey] = true;
    clearTouchModifiers();
  });

  btn.addEventListener("touchmove", e => {
    e.preventDefault();
    if (!active) return;

    const touch = e.changedTouches[0];
    updateTouchModifiers(touch.clientX, touch.clientY);
  });

  btn.addEventListener("touchend", e => {
    e.preventDefault();
    active = false;
    keys[sideKey] = false;
    clearTouchModifiers();
  });

  btn.addEventListener("touchcancel", e => {
    e.preventDefault();
    active = false;
    keys[sideKey] = false;
    clearTouchModifiers();
  });

  btn.addEventListener("mousedown", () => {
    checkDoubleTap(sideKey);
    keys[sideKey] = true;
  });

  btn.addEventListener("mouseup", () => {
    keys[sideKey] = false;
    keys[horizontalKey] = 0;
    keys[verticalKey] = 0;
    syncVerticalKeys();
  });

  btn.addEventListener("mouseleave", () => {
    keys[sideKey] = false;
    keys[horizontalKey] = 0;
    keys[verticalKey] = 0;
    syncVerticalKeys();
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
      fireButtonConsumed = false;

      // Primary can continue firing while held. Missiles and bombs use the
      // release gesture so the player can press, slide-aim, then launch once.
      keys.fire = weaponTypes[selectedWeaponIndex] === "PRIMARY";
  }

  function moveAim(e) {
      if (!fireAim.active) return;

      e.preventDefault();

      const touch = e.changedTouches[0];
      updateAim(touch.clientX, touch.clientY);
  }

  function endAim(e) {
      e.preventDefault();

      if (fireAim.active && weaponTypes[selectedWeaponIndex] !== "PRIMARY") {
        fireWeapon(true);
      }

      fireAim.active = false;
      fireAim.x = 0;
      fireAim.y = 0;
      fireButtonConsumed = false;

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
      if (fireAim.active && weaponTypes[selectedWeaponIndex] !== "PRIMARY") {
        fireWeapon(true);
      }

      fireAim.active = false;
      fireAim.x = 0;
      fireAim.y = 0;
      fireButtonConsumed = false;
      keys.fire = false;
  });
}
