// Auto-split from the last known good monolithic build. Keep scripts loaded in index.html order.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const FOV = 520;
const SPEED = 26; // v0.3.10: 25% faster than the slowed v0.3.9 starfield
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
const EDGE_PUSH_THRESHOLD = 0.45;
const DRIFT_Y = 112.5;
const DEFAULT_CAMERA_ZOOM = -900;
const DEFAULT_CAMERA_HEIGHT = 120;
const BARREL_TAP_WINDOW = 260;
const BARREL_DURATION = 520;
const PLAYER_RADIUS = 70;
const ENEMY_SPAWN_Z = 3200; // spawn farther out so enemies begin smaller near the vantage plane
const ENEMY_SPEED_MULTIPLIER = 1.25; // make all enemies 25% faster
const ENEMY_TYPES = {
  SPHERE_SMALL: {
    label: "Small Sphere",
    shape: "sphere",
    radius: 30,
    hp: 24,
    speed: 22.5,
    damage: 12,
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
    shape: "sphere",
    radius: 62,
    hp: 72,
    speed: 32.5,
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
    shape: "sphere",
    radius: 86,
    hp: 135,
    speed: 45,
    damage: 34,
    score: 1800,
    palette: {
      highlight: "rgba(255,235,255,0.98)",
      mid: "rgba(255,80,205,0.95)",
      dark: "rgba(100,20,90,0.95)",
      ring: "rgba(255,150,235,0.82)"
    }
  },

  ROCK_LARGE: {
    label: "Large Rock",
    shape: "rock",
    radius: 96,
    hp: 180,
    speed: 34,
    damage: 42,
    score: 1200,
    palette: {
      highlight: "rgba(210,205,190,0.98)",
      mid: "rgba(132,118,100,0.95)",
      dark: "rgba(55,48,45,0.96)",
      ring: "rgba(210,198,170,0.55)"
    }
  },

  WRECKAGE: {
    label: "Ship Wreckage",
    shape: "wreckage",
    radius: 110,
    hp: 220,
    speed: 38,
    damage: 50,
    score: 1400,
    palette: {
      highlight: "rgba(230,238,245,0.98)",
      mid: "rgba(120,136,150,0.95)",
      dark: "rgba(42,52,62,0.96)",
      ring: "rgba(170,205,235,0.5)"
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
  startTime: 0,
  nextLevelIndex: null,
  advanced: false
};

const stageIntro = {
  active: false,
  startTime: 0,
  text: ""
};

const gameOver = {
  active: false,
  startTime: 0,
  handled: false
};

const CAMERA_ZOOM_MAX = -120;
const CAMERA_ZOOM_MIN = -900;
const CAMERA_ZOOM_PLAY = DEFAULT_CAMERA_ZOOM; // default 0% / fully zoomed out

const LEVELS = [
  {
    name: "Stage 1",
    duration: 120,
    events: [
      { start: 4, end: 8, type: "wave", enemy: "SPHERE_SMALL", count: 2, interval: 1.2 },
      { start: 10, end: 22, type: "wave", enemy: "SPHERE_SMALL", count: 7, interval: 1.35 },
      { start: 24, end: 42, type: "random", pool: ["SPHERE_SMALL", "SPHERE_MEDIUM"], interval: 1.3 },
      { start: 45, end: 64, type: "wave", enemy: "SPHERE_MEDIUM", count: 9, interval: 1.15 },
      { start: 67, end: 82, type: "wave", enemy: "SPHERE_LARGE", count: 5, interval: 1.6 },
      { start: 84, end: 104, type: "random", pool: ["SPHERE_SMALL", "SPHERE_MEDIUM", "SPHERE_LARGE"], interval: 1.0 },
      { start: 106, end: 116, type: "random", pool: ["SPHERE_MEDIUM", "SPHERE_LARGE"], interval: 0.85 }
    ]
  },

  {
    name: "Stage 2",
    duration: 130,
    events: [
      // Stage 2 doubles the enemy pressure and introduces non-enemy hazards.
      { start: 3, end: 12, type: "wave", enemy: "SPHERE_SMALL", count: 5, interval: 0.75 },
      { start: 12, end: 28, type: "random", pool: ["SPHERE_SMALL", "SPHERE_MEDIUM"], interval: 0.65 },
      { start: 18, end: 36, type: "hazard", pool: ["ROCK_LARGE"], interval: 2.0 },
      { start: 30, end: 52, type: "wave", enemy: "SPHERE_MEDIUM", count: 18, interval: 0.75 },
      { start: 42, end: 62, type: "hazard", pool: ["ROCK_LARGE", "WRECKAGE"], interval: 1.65 },
      { start: 58, end: 82, type: "random", pool: ["SPHERE_SMALL", "SPHERE_MEDIUM", "SPHERE_LARGE"], interval: 0.58 },
      { start: 76, end: 102, type: "hazard", pool: ["ROCK_LARGE", "WRECKAGE"], interval: 1.35 },
      { start: 94, end: 118, type: "random", pool: ["SPHERE_MEDIUM", "SPHERE_LARGE"], interval: 0.55 },
      { start: 118, end: 128, type: "random", pool: ["SPHERE_SMALL", "SPHERE_MEDIUM", "SPHERE_LARGE", "WRECKAGE"], interval: 0.45 }
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
  leftTouchHorizontal: 0,
  rightTouchHorizontal: 0
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
