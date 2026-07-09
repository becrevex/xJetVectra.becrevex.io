// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const FOV = 520;
const SPEED = 26;
const MAX_ROLL = Math.PI / 4;
const MAX_YAW = Math.PI / 8;
const MAX_PITCH = Math.PI / 7;
const TOUCH_AIM_RANGE = 95;
const DRIFT_X = 180;
const EDGE_X = 280;
const DRIFT_Y = 150;
const DEFAULT_CAMERA_ZOOM = -520;
const DEFAULT_CAMERA_HEIGHT = 120;
const BARREL_TAP_WINDOW = 260;
const BARREL_DURATION = 520;
const PLAYER_RADIUS = 70;
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
      // Warm-up enemy.
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
        interval: 1.4
      },

      // Sustained mid-level pressure.
      {
        start: 24,
        end: 45,
        type: "random",
        pool: ["SPHERE_SMALL"],
        interval: 1.35
      },

      // Heavier attack wave.
      {
        start: 48,
        end: 68,
        type: "wave",
        enemy: "SPHERE_SMALL",
        count: 12,
        interval: 1.15
      },

      // Late random pressure.
      {
        start: 70,
        end: 95,
        type: "random",
        pool: ["SPHERE_SMALL"],
        interval: 1.1
      },

      // Final rush.
      {
        start: 98,
        end: 116,
        type: "wave",
        enemy: "SPHERE_SMALL",
        count: 15,
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

const stars = [];
const shots = [];
const explosions = [];
const enemies = [];
// Ship destruction chunks/pieces.
// const shipDebris = [];

let screenFlash = 0;
let fireCooldown = 0;
let lastLeftTap = 0;
let lastRightTap = 0;

const barrelRoll = {
  active: false,
  direction: 0,
  startTime: 0,
  startX: 0,
  startRoll: 0
};
