// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const FOV = 520;
const SPEED = 20.8; // 20% slower starfield travel speed
const MAX_ROLL = Math.PI / 4;
const MAX_YAW = Math.PI / 8;
const MAX_PITCH = Math.PI / 7;
const STARFIELD_BANK_SHIFT = 0.18; // fraction of screen width used to drift the starfield vanishing point
const STARFIELD_VERTICAL_SHIFT = 0.14; // fraction of screen height used to drift the vanishing point during ascend/descend
const NOSE_PERSPECTIVE_LOCK_Z = 1800; // far plane used by the ship to visually aim at the vanishing point
const NOSE_LOCK_EXTRA_RANGE = Math.PI / 180; // hard-lock nose trim to within roughly 1 degree of the perspective point
const SHIP_BASE_Y = 55;
const TOUCH_AIM_RANGE = 95;
const DRIFT_X = 180;
const EDGE_X = 280;
const DRIFT_Y = 112.5;
const DEFAULT_CAMERA_ZOOM = -520;
const DEFAULT_CAMERA_HEIGHT = 120;
const BARREL_TAP_WINDOW = 260;
const BARREL_DURATION = 520;
const PLAYER_RADIUS = 70;
const ENEMY_TYPES = {
  SPHERE_SMALL: {
    label: "Small Sphere",
    radius: 42,
    hp: 32,
    speed: 18,
    damage: 16,
    score: 650,
    palette: {
      highlight: "rgba(235,255,255,0.98)",
      mid: "rgba(80,210,255,0.94)",
      dark: "rgba(20,60,105,0.95)",
      ring: "rgba(155,235,255,0.78)"
    }
  },

  SPHERE_MEDIUM: {
    label: "Medium Sphere",
    radius: 62,
    hp: 72,
    speed: 26,
    damage: 24,
    score: 1100,
    palette: {
      highlight: "rgba(255,255,225,0.98)",
      mid: "rgba(255,185,65,0.95)",
      dark: "rgba(115,50,20,0.95)",
      ring: "rgba(255,220,105,0.8)"
    }
  },

  SPHERE_LARGE: {
    label: "Large Sphere",
    radius: 86,
    hp: 135,
    speed: 36,
    damage: 34,
    score: 1800,
    palette: {
      highlight: "rgba(255,235,255,0.98)",
      mid: "rgba(255,80,205,0.95)",
      dark: "rgba(100,20,90,0.95)",
      ring: "rgba(255,150,235,0.82)"
    }
  }
};

const weaponTypes = ["PRIMARY", "MISSILE", "BOMB"];
const FIRE_AIM_RANGE = 58;
const FIRE_AIM_STRENGTH = 0.28;

const fireAim = {
  active: false,
  x: 0,
  y: 0
};

let selectedWeaponIndex = 0;
let levelScore = 0;

const stageComplete = {
  active: false,
  startTime: 0
}

const CAMERA_ZOOM_MAX = -120;
const CAMERA_ZOOM_MIN = -900;
const CAMERA_ZOOM_PLAY = -588; // about 40%

const LEVELS = [
  {
    name: "Level 1",
    duration: 120,
    events: [
      // Warm-up: slow, easy targets.
      {
        start: 4,
        end: 8,
        type: "wave",
        enemy: "SPHERE_SMALL",
        count: 2,
        interval: 1.2
      },

      // First proper wave.
      {
        start: 10,
        end: 22,
        type: "wave",
        enemy: "SPHERE_SMALL",
        count: 7,
        interval: 1.35
      },

      // Introduce medium enemies.
      {
        start: 24,
        end: 42,
        type: "random",
        pool: ["SPHERE_SMALL", "SPHERE_MEDIUM"],
        interval: 1.3
      },

      // Heavier attack wave.
      {
        start: 45,
        end: 64,
        type: "wave",
        enemy: "SPHERE_MEDIUM",
        count: 9,
        interval: 1.15
      },

      // Large enemies are faster and more dangerous.
      {
        start: 67,
        end: 82,
        type: "wave",
        enemy: "SPHERE_LARGE",
        count: 5,
        interval: 1.6
      },

      // Mixed late-level pressure.
      {
        start: 84,
        end: 104,
        type: "random",
        pool: ["SPHERE_SMALL", "SPHERE_MEDIUM", "SPHERE_LARGE"],
        interval: 1.0
      },

      // Final rush.
      {
        start: 106,
        end: 116,
        type: "random",
        pool: ["SPHERE_MEDIUM", "SPHERE_LARGE"],
        interval: 0.85
      }
    ]
  }
];

const levelState = {
  currentLevelIndex: 0,
  active: false,
  startTime: 0,
  elapsed: 0,
  eventRuntime: new Map(),
  introCamera: true,
  introStartTime: 0
};

const ship = {
  x: 0,
  y: 55,
  z: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  targetX: 0,
  targetY: 55,
  targetYaw: 0,
  targetPitch: 0,
  targetRoll: 0
};

const camera = {
  x: 0,
  y: DEFAULT_CAMERA_HEIGHT,
  z: DEFAULT_CAMERA_ZOOM
};

const cameraSettings = {
  zoom: DEFAULT_CAMERA_ZOOM,
  height: DEFAULT_CAMERA_HEIGHT
};

const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  fire: false,
  aimPitch: 0
};

const playerStatus = {
  maxShield: 100,
  shield: 100,
  maxHealth: 100,
  health: 100,
  invulnFrames: 0,
};

let starfieldPerspectiveX = 0;
let starfieldPerspectiveY = 0;
const stars = [];
const shots = [];
const explosions = [];
const enemies = [];
// Ship destruction chunks/pieces.
// const shipDebris = [];

let screenFlash = 0;
let fireCooldown = 0;
let fireButtonConsumed = false;
let lastLeftTap = 0;
let lastRightTap = 0;

const barrelRoll = {
  active: false,
  direction: 0,
  startTime: 0,
  startX: 0,
  startRoll: 0
};
