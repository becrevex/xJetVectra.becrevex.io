// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

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

function updateCamera() {
  camera.z += (cameraSettings.zoom - camera.z) * 0.08;
  camera.y += (cameraSettings.height - camera.y) * 0.08;
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
