const canvas = document.getElementById('gameCanvas');
const gameContainer = document.getElementById('gameContainer');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const beginBtn = document.getElementById('beginBtn');
const hud = document.getElementById('hud');
const levelLabel = document.getElementById('levelLabel');
const livesLabel = document.getElementById('livesLabel');
const gemsLabel = document.getElementById('gemsLabel');
const timeLabel = document.getElementById('timeLabel');
const bestLabel = document.getElementById('bestLabel');
const bannerEl = document.getElementById('banner');
const pauseScreen = document.getElementById('pauseScreen');
const resumeBtn = document.getElementById('resumeBtn');
const exitToMapBtn = document.getElementById('exitToMapBtn');
const usernameScreen = document.getElementById('usernameScreen');
const usernameInput = document.getElementById('usernameInput');
const usernameError = document.getElementById('usernameError');
const usernameContinueBtn = document.getElementById('usernameContinueBtn');
const usernameBtn = document.getElementById('usernameBtn');
const usernameTakenScreen = document.getElementById('usernameTakenScreen');
const usernameTakenText = document.getElementById('usernameTakenText');
const usernameTakenYesBtn = document.getElementById('usernameTakenYesBtn');
const usernameTakenNoBtn = document.getElementById('usernameTakenNoBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const leaderboardLevelSelect = document.getElementById('leaderboardLevelSelect');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardCloseBtn = document.getElementById('leaderboardCloseBtn');

const Phase = { START: 'start', MENU: 'menu', TRANSFORM_IN: 'transform_in', PLAYING: 'playing', TRANSFORM_OUT: 'transform_out', PAUSED: 'paused' };
let phase = Phase.START;

const CELL_SIZE = 40;
const GRID_COLS = 20;
const GRID_ROWS = 15;

const PLAYER_SPEED = 200;
const PLAYER_RADIUS = 10;
const HAZARD_RADIUS = 11;
const LIVES_PER_ATTEMPT = 3;
const INVULN_TIME = 1.0;
const TRANSFORM_TIME = 0.5;
const BANNER_TIME = 1.8;
const RESULT_PAUSE_TIME = 1.0;

const HAZARD_SPEED_BASE = 60;
const HAZARD_SPEED_LEVEL_INCREMENT = 12;

const COLLECTIBLE_RADIUS = 8;
const GEM_COLOR = '#ffd76b';

const NEAR_MISS_MARGIN = 14;
const NEAR_MISS_REARM_MUL = 1.5;
const NEAR_MISS_FLASH_TIME = 0.3;

const HAZARD_COLORS = { patrol: '#ff8f5c', circular: '#c77bff', bounce: '#ff5c7c' };

const DASH_ORB_RADIUS = 9;
const DASH_ORB_PROXIMITY_RADIUS = 60;
const DASH_ORB_COLOR = '#7fe8ff';
const DASH_DURATION = 0.4;
const DASH_SPEED_MUL = 3.5;
const DASH_INVULN_BUFFER = 0.2;

// Runner-mode (World 2) charge-jump physics. Keep these in sync with
// tools/runner_solvability_checker.py -- that tool re-simulates this exact
// model in Python to prove every authored obstacle is clearable.
const RUNNER_PLAYER_X = 160;
const RUNNER_GROUND_Y = 460;
const RUNNER_CEILING_Y = 280;
const RUNNER_GRAVITY = 2200;
const RUNNER_MIN_JUMP_VEL = 380;
const RUNNER_MAX_JUMP_VEL = 780;
const RUNNER_MAX_CHARGE_TIME = 0.55;
const RUNNER_SCROLL_SPEED = 260;
const RUNNER_PLAYER_HALF_WIDTH = 9;
const RUNNER_PLAYER_HEIGHT = 34;
const RUNNER_SPIKE_WIDTH = 26;

// Runner-mode dash orb: some spike tunnels are tall enough top-and-bottom
// that no jump height clears them (see checkRunnerCollisions -- a ground
// spike taller than the ceiling-spike-adjusted safe max makes every height
// unsafe at once). The orb grants a brief invulnerability window (reusing
// the existing invulnTimer field, so checkRunnerCollisions needs zero new
// logic -- it already skips all collision checks while invulnTimer > 0) so
// the player can scroll straight through instead of jumping. It also grants
// a separate, dedicated scroll-speed boost for the same duration (kept as
// its own timer, not folded into invulnTimer, since invulnTimer is *also*
// used for the plain post-respawn grace period, which must NOT speed up the
// scroll -- that would shift every obstacle's arrival time and invalidate
// the level's whole timing design).
const RUNNER_DASH_ORB_RADIUS = 10;
const RUNNER_DASH_ORB_PROXIMITY = 40;
const RUNNER_DASH_ORB_DEFAULT_HEIGHT = 100;
const RUNNER_DASH_ORB_VERTICAL_TOLERANCE = 20;
const RUNNER_DASH_DURATION = 2.4;
const RUNNER_DASH_SCROLL_BOOST_MUL = 1.7;
const RUNNER_DASH_ORB_COLOR = '#7fe8ff';

// Leaderboard backend (Supabase PostgREST) -- this is the ONLY part of Maze Dodge
// that ever talks to a network. Left blank until configured; every call below
// checks for that and no-ops instead of attempting a request, so the game stays
// fully playable offline before/without a backend set up. See CLAUDE.md for the
// setup checklist (create project, create the `leaderboard` table, RLS policies).
const SUPABASE_URL = 'https://tzacyycpwwqadxhdhqnj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ECQR6xKUxbBz5zSdLkEe6w_FyD7kvy3';
const LEADERBOARD_LIMIT = 10;
const USERNAME_KEY = 'mazeDodgeUsername';

const SKY_TOP = '#4ea8e8';
const SKY_HORIZON = '#bfe3f7';
const MOUNTAIN_LAYERS = [
  { baseY: 200, amplitude: 40, color: '#8fb8c9', snow: 9 },
  { baseY: 250, amplitude: 55, color: '#7aa88a', snow: 12 },
  { baseY: 305, amplitude: 68, color: '#5a9c5e', snow: 15 },
  { baseY: 365, amplitude: 85, color: '#4a7c4a', snow: 18 },
];
const VALLEY_TOP = '#6fbf5f';
const VALLEY_BOTTOM = '#4e9c4a';
const RIVER_TOP = '#bfe9f7';
const RIVER_BOTTOM = '#7fc7e8';
const GATE_COLOR = '#ffd27f';

const WALK_CYCLE_SPEED = 8;
const LEG_SWING_AMPLITUDE = 3.5;
const ARM_SWING_AMPLITUDE = 3;
const ORB_TRAIL_COUNT = 3;
const ORB_TRAIL_SPACING = 8;
const ORB_PULSE_SPEED = 500;

const IDLE_ANIM = { facing: { x: 0, y: 1 }, isMoving: false, animPhase: 0 };
const RUNNER_ANIM = { facing: { x: 1, y: 0 }, isMoving: false, animPhase: 0 };

const NODE_RADIUS = 24;
const WORLD_PATH = [
  { x: 110, y: 520 },
  { x: 260, y: 430 },
  { x: 180, y: 310 },
  { x: 360, y: 240 },
  { x: 560, y: 300 },
  { x: 660, y: 160 },
  { x: 740, y: 90 },
];

// A second, single-node world (see LEVELS[7] below). LEVELS/progress stay one
// flat array/shape -- WORLDS is a thin view on top that maps a contiguous
// LEVELS index range to its own map/theme/node path. World unlocking is a
// pure byproduct of the existing flat progress.unlockedIndex gate; no new
// unlock logic needed.
const CAVERN_PATH = [{ x: 400, y: 300 }, { x: 590, y: 190 }];

const WORLDS = [
  { name: 'The Mountain Road', theme: 'mountain', startIndex: 0, path: WORLD_PATH },
  { name: 'The Deep Cavern', theme: 'cavern', startIndex: 7, path: CAVERN_PATH },
];

function worldIndexForLevel(levelIdx) {
  for (let i = 0; i < WORLDS.length; i++) {
    const w = WORLDS[i];
    if (levelIdx >= w.startIndex && levelIdx < w.startIndex + w.path.length) return i;
  }
  return 0;
}

const PROGRESS_KEY = 'mazeDodgeProgress';

const LEVELS = [
  {
    name: 'Stonebridge Hollow',
    flavorText: 'A quiet watchman ambles the lower lane of Stonebridge Hollow.',
    grid: [
      '####################',
      '#S#...#.......#...##',
      '#.#.###.#.###.#.#.##',
      '#.#.....#.#.#...#.##',
      '#.#######.#.#####.##',
      '#...#.....#.....#.##',
      '###.#.#########.#.##',
      '#.#...#.........#.##',
      '#.#######.###.###.##',
      '#.........#...#...##',
      '#.#####.#######.####',
      '#...#...#.....#.#.##',
      '###.#.###.###.#.#.##',
      '#...#.......#....E##',
      '####################',
    ],
    hazards: [
      { type: 'patrol', a: { x: 60, y: 380 }, b: { x: 380, y: 380 }, speedMul: 0.7, radius: HAZARD_RADIUS },
    ],
    collectibles: [
      { x: 220, y: 60 }, { x: 300, y: 460 }, { x: 540, y: 540 }, { x: 460, y: 540 },
    ],
  },
  {
    name: 'Windmere Terraces',
    flavorText: "Windmere's terraced streets have two lanterns doing their nightly rounds.",
    grid: [
      '####################',
      '#S..........#.....##',
      '#.#.#####.#.#####.##',
      '#.#.#.#...#...#...##',
      '#.#.#.#.###.#.#.#.##',
      '#.#...#.#...#.#.#.##',
      '#.#####.#.###.#.####',
      '#...#...#.....#...##',
      '###.#.#####.#####.##',
      '#...#.....#.......##',
      '#.#######.#######.##',
      '#...#.....#.......##',
      '###.#.#####.#####.##',
      '#.....#..........E##',
      '####################',
    ],
    hazards: [
      { type: 'patrol', a: { x: 60, y: 100 }, b: { x: 60, y: 220 }, speedMul: 0.9, radius: HAZARD_RADIUS },
      { type: 'patrol', a: { x: 300, y: 540 }, b: { x: 660, y: 540 }, speedMul: 0.9, radius: HAZARD_RADIUS },
    ],
    collectibles: [
      { x: 140, y: 140 }, { x: 380, y: 140 }, { x: 60, y: 540 }, { x: 700, y: 300 }, { x: 620, y: 460 },
    ],
  },
  {
    name: 'Highwatch Pass',
    flavorText: "A beacon wheels above Highwatch's crossing — time your step.",
    grid: [
      '####################',
      '#S#.......#.......##',
      '#.#.#####.###.###.##',
      '#.#...#.#.#...#...##',
      '#.###.#.#.#.#.###.##',
      '#.....#...#.....#.##',
      '###.###....####.####',
      '#.....#.......#...##',
      '#.###.##....#.###.##',
      '#...#...#.#.#.....##',
      '###.#.###.#.#####.##',
      '#...#.#...#.#.....##',
      '#.###.#.###.#.######',
      '#...#.......#....E##',
      '####################',
    ],
    hazards: [
      { type: 'circular', center: { x: 380, y: 300 }, orbitRadius: 35, startAngle: 0, speedMul: 1.0, radius: HAZARD_RADIUS, reactive: { triggerDist: 90, boostMul: 2.0 } },
      { type: 'patrol', a: { x: 220, y: 540 }, b: { x: 460, y: 540 }, speedMul: 1.0, radius: HAZARD_RADIUS },
    ],
    collectibles: [
      { x: 60, y: 300 }, { x: 300, y: 220 }, { x: 140, y: 540 },
    ],
  },
  {
    name: 'Sable Vale Commons',
    flavorText: "Sable Vale's open commons leave little cover from the wandering lights.",
    grid: [
      '####################',
      '#S#...........#...##',
      '#.###.#####.#.#.#.##',
      '#...#.#.......#.#.##',
      '###.#.#.......#.#.##',
      '#...#.#.........#.##',
      '#.#####.......###.##',
      '#...#...........#.##',
      '###.#.#######.#.#.##',
      '#.#.#.....#...#...##',
      '#.#.#.#.#.#.########',
      '#...#.....#.#.....##',
      '#.#.#####.#.###.#.##',
      '#.........#.....#E##',
      '####################',
    ],
    hazards: [
      { type: 'bounce', x: 320, y: 160, dir: { x: 1, y: 0.6 }, bounds: { x: 280, y: 120, w: 280, h: 200 }, speedMul: 1.1, radius: HAZARD_RADIUS },
      { type: 'circular', center: { x: 420, y: 220 }, orbitRadius: 60, startAngle: 2, speedMul: 1.1, radius: HAZARD_RADIUS },
      { type: 'patrol', a: { x: 300, y: 300 }, b: { x: 540, y: 300 }, speedMul: 1.1, radius: HAZARD_RADIUS },
      { type: 'patrol', a: { x: 140, y: 60 }, b: { x: 540, y: 60 }, speedMul: 1.1, radius: HAZARD_RADIUS },
    ],
    collectibles: [
      { x: 60, y: 380 }, { x: 60, y: 540 },
    ],
  },
  {
    name: 'Thistlecrag',
    flavorText: 'Thistlecrag forks in two — one path is quieter than the other.',
    grid: [
      '####################',
      '#S....#.........#.##',
      '#...#.###.#.#.#.#.##',
      '#...#...#...#.....##',
      '#...###.#.#.#.#.#.##',
      '#...#...#...#.#...##',
      '###.#.#######.######',
      '#...#.#.....#.#...##',
      '#.###.#.###.#.#.#.##',
      '#...#.#.#.......#.##',
      '###.#.#.#.......#.##',
      '#...#...#.........##',
      '#.#######.......#.##',
      '#...............#E##',
      '####################',
    ],
    hazards: [
      { type: 'circular', center: { x: 100, y: 140 }, orbitRadius: 35, startAngle: 1, speedMul: 1.3, radius: HAZARD_RADIUS },
      { type: 'bounce', x: 440, y: 400, dir: { x: 0.7, y: 1 }, bounds: { x: 400, y: 360, w: 240, h: 160 }, speedMul: 1.3, radius: HAZARD_RADIUS },
      { type: 'patrol', a: { x: 420, y: 500 }, b: { x: 600, y: 380 }, speedMul: 1.3, radius: HAZARD_RADIUS },
      { type: 'patrol', a: { x: 60, y: 540 }, b: { x: 620, y: 540 }, speedMul: 1.5, radius: HAZARD_RADIUS },
      { type: 'patrol', a: { x: 300, y: 60 }, b: { x: 620, y: 60 }, speedMul: 1.3, radius: HAZARD_RADIUS },
    ],
    // No collectibles here: the solvability checker found zero cells that are both
    // off the direct route AND fully outside every hazard's danger zone (this level
    // is unusually hazard-dense) -- an empty array, not an oversight.
    collectibles: [],
  },
  {
    name: 'Skyreach Cairn',
    flavorText: 'Skyreach Cairn, the highest village on the map so far.',
    grid: [
      '####################',
      '#S....#...#.......##',
      '#.#.#.#.#.#.#.....##',
      '#...#.#.....#.....##',
      '#####.#.#.###.....##',
      '#.........#...#.#.##',
      '#.######....###.#.##',
      '#...#...........#.##',
      '###.#.##....###.#.##',
      '#.#...#.....#...#.##',
      '#.....#.###.#.#.#.##',
      '#.....#.#.....#.#.##',
      '#.....#.###.###.#.##',
      '#...........#....E##',
      '####################',
    ],
    hazards: [
      { type: 'circular', center: { x: 400, y: 320 }, orbitRadius: 40, startAngle: 0, speedMul: 1.5, radius: HAZARD_RADIUS, reactive: { triggerDist: 95, boostMul: 1.8 } },
      { type: 'circular', center: { x: 620, y: 120 }, orbitRadius: 40, startAngle: 2.5, speedMul: 1.5, radius: HAZARD_RADIUS },
      { type: 'bounce', x: 80, y: 440, dir: { x: 1, y: 0.7 }, bounds: { x: 40, y: 400, w: 200, h: 160 }, speedMul: 1.6, radius: HAZARD_RADIUS },
      { type: 'patrol', a: { x: 60, y: 540 }, b: { x: 460, y: 540 }, speedMul: 1.6, radius: HAZARD_RADIUS },
      { type: 'patrol', a: { x: 220, y: 300 }, b: { x: 620, y: 300 }, speedMul: 1.6, radius: HAZARD_RADIUS },
    ],
    collectibles: [
      { x: 60, y: 140 }, { x: 140, y: 340 }, { x: 380, y: 60 }, { x: 540, y: 60 },
    ],
  },
  {
    name: 'Wyrmwind Col',
    flavorText: 'Wyrmwind Col narrows to a single twisting track — old waystone lanterns here still hold a spark of the quick trick, for those brave enough to reach for it.',
    grid: [
      '####################',
      '#S.................#',
      '##################.#',
      '#..................#',
      '#.##################',
      '#..................#',
      '##################.#',
      '#..................#',
      '#.##################',
      '#..................#',
      '##################.#',
      '#..................#',
      '#.##################',
      '#.................E#',
      '####################',
    ],
    // This level is a single 1-wide corridor with no branches (see CLAUDE.md).
    // Any hazard placed anywhere on it is structurally either dash-gated or
    // outright impossible -- there's no room to carve a fair "dodge" pocket
    // without creating an unintended shortcut between adjacent parallel runs.
    // Both hazards here are dash-gated by design, verified via the
    // checkpoint-chain reasoning in CLAUDE.md (walk-safe up to each orb,
    // wall-clear-and-sufficient-reach for the dash past it).
    hazards: [
      { type: 'patrol', a: { x: 300, y: 220 }, b: { x: 420, y: 220 }, speedMul: 1.0, radius: HAZARD_RADIUS },
      { type: 'patrol', a: { x: 340, y: 380 }, b: { x: 460, y: 380 }, speedMul: 1.2, radius: HAZARD_RADIUS },
    ],
    collectibles: [],
    dashOrbs: [
      { x: 200, y: 220 },
      { x: 240, y: 380 },
    ],
  },
  {
    name: 'The Long Drop',
    flavorText: 'A ledge over the dark below -- hold to jump higher, tap for a quick hop.',
    mode: 'runner',
    // See RUNNER_* constants above and tools/runner_solvability_checker.py --
    // every obstacle here is verified to have a valid hold-duration that
    // clears it, and consecutive obstacles are spaced with enough scroll-time
    // for a full-charge jump's time-of-flight plus a reaction buffer.
    // A `ceiling` field is only ever paired with a small ground.height,
    // per spec: a short ground spike gets a spike hanging above it too,
    // turning the easy-looking short hop into a precise one.
    gauntlet: {
      length: 2600,
      obstacles: [
        { gaugeX: 500, ground: { height: 50 } },
        { gaugeX: 850, ground: { height: 80 } },
        { gaugeX: 1150, ground: { height: 30 }, ceiling: { height: 96 } },
        { gaugeX: 1500, ground: { height: 65 } },
        { gaugeX: 1800, ground: { height: 32 }, ceiling: { height: 92 } },
        { gaugeX: 2150, ground: { height: 90 } },
      ],
    },
    // Grounded (300, 1050) sit in the gaps between obstacle danger spans --
    // zero risk. The gaugeX=890 gem sits on the arc of the jump already
    // needed to clear the gaugeX=850 obstacle, no separate action required.
    // The gaugeX=1800 gem sits inside that obstacle's own narrow safe band
    // ([32,54]) -- collecting it demands the same precision the gap itself
    // already demands, not extra risk on top. See
    // tools/runner_solvability_checker.py's gem checks for the exact bounds.
    collectibles: [
      { gaugeX: 300, height: 0 },
      { gaugeX: 890, height: 90 },
      { gaugeX: 1050, height: 0 },
      { gaugeX: 1800, height: 45 },
    ],
  },
  {
    name: 'The Narrows',
    flavorText: 'The cavern pinches to a spike-choked seam -- the old quick-trick glow still lingers here.',
    mode: 'runner',
    // First three obstacles reuse the exact ground/ceiling heights already
    // proven clearable in "The Long Drop" (see that level's comment) --
    // spaced even more generously here (400px vs 300-350px) since this
    // level's real escalation is the tunnel, not these warmups.
    // The tunnel: ground=100 + ceiling=100 makes EVERY runnerHeight unsafe
    // simultaneously (ceiling_safe_max caps at RUNNER_GROUND_Y -
    // RUNNER_PLAYER_HEIGHT - RUNNER_CEILING_Y - 100 = 46, which is less than
    // the 100 the ground spike requires -- no jump height satisfies both),
    // tiled wall-to-wall at RUNNER_SPIKE_WIDTH intervals so it reads as one
    // continuous seam rather than a gap-toothed row. Only the dash orb's
    // invulnerability (see triggerNearestRunnerDashOrb) gets you through.
    // The orb sits far enough before the tunnel, and RUNNER_DASH_DURATION is
    // long enough, that even the earliest possible trigger (orb proximity's
    // near edge) covers the tunnel's full length with margin -- verified in
    // tools/runner_solvability_checker.py, not just eyeballed.
    gauntlet: {
      length: 2900,
      obstacles: [
        { gaugeX: 500, ground: { height: 50 } },
        { gaugeX: 900, ground: { height: 30 }, ceiling: { height: 96 } },
        { gaugeX: 1300, ground: { height: 80 } },
        // The tunnel: 12 tiled ground+ceiling pairs, edge-to-edge at
        // RUNNER_SPIKE_WIDTH intervals (1863, 1889, ... 2149) so it reads as
        // one continuous seam. Written as explicit literals (not generated
        // via Array.from) so tools/runner_solvability_checker.py's
        // text-based parser can see every obstacle -- this project's
        // convention is that level data is plain literal data, never
        // runtime-computed, precisely so tooling never has to evaluate JS.
        { gaugeX: 1863, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 1889, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 1915, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 1941, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 1967, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 1993, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 2019, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 2045, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 2071, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 2097, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 2123, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 2149, ground: { height: 100 }, ceiling: { height: 100 } },
        { gaugeX: 2550, ground: { height: 65 } },
      ],
    },
    // height=100 requires a genuine, well-charged jump to reach (a quick tap
    // only apexes around 33 -- see RUNNER_DASH_ORB_VERTICAL_TOLERANCE) -- the
    // orb can't be triggered from standing on the ground.
    dashOrbs: [{ gaugeX: 1700, height: 100 }],
    // Grounded (300) and risk/reward (900, inside that gap's [30,50] safe
    // band) mirror The Long Drop's pattern. The gaugeX=2000 gem sits deep
    // inside the tunnel at height=0 -- picking it up needs no extra jump,
    // just successfully riding the dash's invulnerability through (which by
    // then comfortably covers well past the tunnel's end either way), a
    // bonus for pulling off the harder mechanic rather than an extra risk.
    collectibles: [
      { gaugeX: 300, height: 0 },
      { gaugeX: 530, height: 65 },
      { gaugeX: 900, height: 40 },
      { gaugeX: 2000, height: 0 },
    ],
  },
];

function ensureProgressShape(p) {
  if (!Array.isArray(p.gemsCollected)) p.gemsCollected = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const gemCount = (LEVELS[i].collectibles || []).length;
    if (!Array.isArray(p.gemsCollected[i]) || p.gemsCollected[i].length !== gemCount) {
      p.gemsCollected[i] = new Array(gemCount).fill(false);
    }
  }

  if (!Array.isArray(p.bestTimes)) p.bestTimes = [];
  while (p.bestTimes.length < LEVELS.length) p.bestTimes.push(null);

  while (p.completedLevels.length < LEVELS.length) p.completedLevels.push(false);

  // One-time fix for saves from before LEVELS grew: unlockedIndex was capped by the
  // old (shorter) LEVELS.length, so a player who'd already beaten the old last level
  // would otherwise need a needless replay to unlock the new one(s).
  let highestCompleted = -1;
  for (let i = 0; i < p.completedLevels.length; i++) {
    if (p.completedLevels[i]) highestCompleted = i;
  }
  const inferredUnlock = Math.min(highestCompleted + 1, LEVELS.length - 1);
  p.unlockedIndex = Math.max(p.unlockedIndex, inferredUnlock);

  return p;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) throw new Error('no progress');
    const parsed = JSON.parse(raw);
    if (typeof parsed.unlockedIndex !== 'number' || !Array.isArray(parsed.completedLevels)) throw new Error('bad shape');
    return ensureProgressShape(parsed);
  } catch (e) {
    return ensureProgressShape({ unlockedIndex: 0, completedLevels: LEVELS.map(() => false) });
  }
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

let progress = loadProgress();
let username = localStorage.getItem(USERNAME_KEY) || '';

// Which world's map is currently displayed. Defaults to the player's frontier
// world but stays put once the player manually browses to the other one (so
// mopping up missed gems on an earlier world doesn't get yanked back) --
// finishLevel() advances it automatically the moment a *new* world unlocks.
let viewedWorldIndex = worldIndexForLevel(Math.min(progress.unlockedIndex, LEVELS.length - 1));

// World-switch slide transition. Parallel state, not a new Phase -- the menu
// stays in Phase.MENU throughout, unlike the level-entry TRANSFORM_IN/OUT
// tween this deliberately doesn't reuse (that one is tied to a single sprite
// blending between level<->menu scenes, not a fit for sliding two map
// backgrounds against each other). worldSwitchTimer >= WORLD_SWITCH_TIME
// means "no transition in progress", matching the >0-is-active convention
// bannerTimer already uses elsewhere.
const WORLD_SWITCH_TIME = 0.4;
let worldSwitchTimer = WORLD_SWITCH_TIME;
let worldSwitchFromIndex = viewedWorldIndex;
let worldSwitchDir = 1;

const player = { x: 0, y: 0, radius: PLAYER_RADIUS, facingX: 0, facingY: 1, isMoving: false, animPhase: 0 };
let walls = [];
let hazards = [];
let collectibles = [];
let runGemCount = 0;
// Attempt-scoped gem progress -- starts as a copy of progress.gemsCollected[level]
// (so already-permanently-banked gems still show collected), but new pickups
// only mutate this, not progress.gemsCollected directly. Reset to that same
// starting copy on death (see respawnInLevel), discarding this attempt's
// new pickups; only copied into progress.gemsCollected (and saved) in
// finishLevel() if every gem was collected in one clean, death-free run.
let runGemFlags = [];
let levelTimer = 0;
let dashOrbs = [];
let dashTimer = 0;
let dashDirX = 0;
let dashDirY = 0;
let exitZone = null;
let currentLevelIndex = 0;

// Runner-mode-only state (LEVELS[i].mode === 'runner') -- entirely separate
// from walls/hazards/player.x,y so the maze engine (tryAxis, parseLevel,
// createHazard/updateHazard) is never invoked for a runner level.
let runnerScroll = 0;
let runnerHeight = 0;
let runnerVelY = 0;
let runnerGrounded = true;
let runnerCharging = false;
let runnerChargeTime = 0;
let runnerDashOrbs = [];
let runnerDashBoostTimer = 0;
let runnerCollectibles = [];

let lives = LIVES_PER_ATTEMPT;
let invulnTimer = 0;
let resultPauseTimer = 0;
let pendingAfterTransformOut = null;

let transformTimer = 0;
let transformDirection = 1;
let transformAnchor = { x: 0, y: 0 };

let bannerTimer = 0;
let menuHoverIndex = -1;

let nearMissFlashTimer = 0;
let nearMissFlashColor = '#ffffff';

const keys = new Set();
const NAV_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

function pauseGame() {
  phase = Phase.PAUSED;
  hud.classList.add('hidden');
  pauseScreen.classList.remove('hidden');
}

function resumeGame() {
  phase = Phase.PLAYING;
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'escape') {
    if (phase === Phase.PLAYING) pauseGame();
    else if (phase === Phase.PAUSED) resumeGame();
    return;
  }
  if (key === ' ') {
    e.preventDefault();
    if (phase === Phase.PLAYING) {
      if (LEVELS[currentLevelIndex].mode === 'runner') {
        // Runner mode overloads Space for two things: it's also the
        // hold-to-charge jump key (see updateRunner), so unlike the maze's
        // Space handling it must still reach `keys` below, not return early.
        // e.repeat guards against OS key-auto-repeat re-firing this on every
        // tick of a held press -- the orb requires a genuine release-and-
        // repress (typically: hold to charge+launch a jump, then tap again
        // once airborne at the right height), not an accidental trigger from
        // however long the browser's repeat delay happens to be.
        if (!e.repeat) triggerNearestRunnerDashOrb();
      } else {
        triggerNearestDashOrb();
        return;
      }
    } else {
      return;
    }
  }
  if (NAV_KEYS.has(key)) e.preventDefault();
  keys.add(key);
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

canvas.addEventListener('mousemove', (e) => {
  if (phase !== Phase.MENU) return;
  const { x: mx, y: my } = canvasCoords(e);
  menuHoverIndex = nodeIndexAt(mx, my, WORLDS[viewedWorldIndex]);
});

canvas.addEventListener('click', (e) => {
  const { x: mx, y: my } = canvasCoords(e);

  if (phase === Phase.MENU) {
    if (worldSwitchTimer < WORLD_SWITCH_TIME) return; // ignore clicks mid-slide (stale/mid-animation positions)
    const sw = worldSwitchHitTest(mx, my);
    if (sw !== 0) { switchViewedWorld(sw); return; }
    const idx = nodeIndexAt(mx, my, WORLDS[viewedWorldIndex]);
    if (idx === -1) return;
    if (idx <= progress.unlockedIndex) enterLevel(idx);
    return;
  }

  if (phase === Phase.PLAYING) {
    for (const orb of dashOrbs) {
      if (orb.used) continue;
      const clickedOrb = Math.hypot(mx - orb.x, my - orb.y) <= orb.radius + 6;
      const playerNear = Math.hypot(player.x - orb.x, player.y - orb.y) <= DASH_ORB_PROXIMITY_RADIUS;
      if (clickedOrb && playerNear && dashTimer <= 0) {
        triggerDashOrb(orb);
        break;
      }
    }
  }
});

beginBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  phase = Phase.MENU;
  leaderboardBtn.classList.remove('hidden');
  usernameBtn.classList.remove('hidden');
});

resumeBtn.addEventListener('click', () => {
  if (phase === Phase.PAUSED) resumeGame();
});

exitToMapBtn.addEventListener('click', () => {
  pauseScreen.classList.add('hidden');
  returnToMenu(null);
});

function nodeIndexAt(mx, my, world) {
  for (let i = 0; i < world.path.length; i++) {
    const n = world.path[i];
    const dx = mx - n.x;
    const dy = my - n.y;
    if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) return world.startIndex + i;
  }
  return -1;
}

// Vertically centered (not a top corner) -- a top-corner position used to
// overlap #leaderboardBtn's clickable box, which sat in front of the canvas
// and silently swallowed clicks meant for the arrow. Keep future arrow
// placements off both top corners (leaderboard button on the left, gem
// total on the right) for the same reason.
const WORLD_ARROW_Y = 300;
const WORLD_ARROW_MARGIN = 30;
const WORLD_ARROW_RADIUS = 16;

function canViewWorld(i) {
  if (i < 0 || i >= WORLDS.length) return false;
  return WORLDS[i].startIndex <= progress.unlockedIndex;
}

function worldSwitchHitTest(mx, my) {
  if (Math.abs(my - WORLD_ARROW_Y) > WORLD_ARROW_RADIUS) return 0;
  if (canViewWorld(viewedWorldIndex - 1) && Math.abs(mx - WORLD_ARROW_MARGIN) <= WORLD_ARROW_RADIUS) return -1;
  if (canViewWorld(viewedWorldIndex + 1) && Math.abs(mx - (canvas.width - WORLD_ARROW_MARGIN)) <= WORLD_ARROW_RADIUS) return 1;
  return 0;
}

function switchViewedWorld(dir) {
  const next = viewedWorldIndex + dir;
  if (canViewWorld(next)) {
    worldSwitchFromIndex = viewedWorldIndex;
    worldSwitchDir = dir;
    worldSwitchTimer = 0;
    viewedWorldIndex = next;
    menuHoverIndex = -1;
  }
}

function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

function circleCellOverlap(circle, col, row) {
  const x0 = col * CELL_SIZE;
  const y0 = row * CELL_SIZE;
  const closestX = Math.max(x0, Math.min(circle.x, x0 + CELL_SIZE));
  const closestY = Math.max(y0, Math.min(circle.y, y0 + CELL_SIZE));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function hashCell(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 1000) / 1000;
}

function generateRidgeline(seed, baseY, amplitude, peakCount) {
  const outline = [{ x: 0, y: baseY + amplitude }];
  const peaks = [];
  const step = canvas.width / peakCount;
  for (let i = 0; i <= peakCount; i++) {
    const x = i * step;
    const peakY = baseY - amplitude * (0.4 + 0.6 * hashCell(seed, i, 7));
    outline.push({ x, y: peakY });
    peaks.push({ x, y: peakY });
    if (i < peakCount) {
      const midY = baseY - amplitude * (0.05 + 0.15 * hashCell(seed, i, 13));
      outline.push({ x: x + step / 2, y: midY });
    }
  }
  outline.push({ x: canvas.width, y: baseY + amplitude });
  return { outline, peaks };
}

function drawRidgeLayer(octx, layer, seed) {
  const { outline, peaks } = generateRidgeline(seed, layer.baseY, layer.amplitude, 5);
  octx.beginPath();
  octx.moveTo(0, canvas.height);
  outline.forEach((p) => octx.lineTo(p.x, p.y));
  octx.lineTo(canvas.width, canvas.height);
  octx.closePath();
  octx.fillStyle = layer.color;
  octx.fill();

  octx.save();
  octx.fillStyle = '#ffffff';
  octx.globalAlpha = 0.9;
  peaks.forEach((p) => {
    octx.beginPath();
    octx.moveTo(p.x, p.y);
    octx.lineTo(p.x - layer.snow, p.y + layer.snow * 1.4);
    octx.lineTo(p.x + layer.snow, p.y + layer.snow * 1.4);
    octx.closePath();
    octx.fill();
  });
  octx.restore();
}

function drawSky(octx) {
  const sky = octx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_HORIZON);
  octx.fillStyle = sky;
  octx.fillRect(0, 0, canvas.width, canvas.height);

  octx.save();
  octx.translate(680, 80);
  octx.fillStyle = 'rgba(255,244,200,0.35)';
  for (let i = 0; i < 8; i++) {
    octx.rotate(Math.PI / 4);
    octx.beginPath();
    octx.moveTo(0, 0);
    octx.lineTo(-10, -110);
    octx.lineTo(10, -110);
    octx.closePath();
    octx.fill();
  }
  octx.beginPath();
  octx.fillStyle = '#fff2b0';
  octx.arc(0, 0, 34, 0, Math.PI * 2);
  octx.fill();
  octx.restore();

  const cloudSpots = [{ x: 120, y: 70 }, { x: 340, y: 50 }, { x: 540, y: 105 }];
  cloudSpots.forEach((c) => {
    octx.fillStyle = 'rgba(255,255,255,0.92)';
    [[0, 0, 26], [22, 6, 20], [-20, 8, 18], [10, -8, 16]].forEach(([dx, dy, r]) => {
      octx.beginPath();
      octx.ellipse(c.x + dx, c.y + dy, r, r * 0.7, 0, 0, Math.PI * 2);
      octx.fill();
    });
  });
}

function drawPineTree(octx, x, y, size) {
  octx.fillStyle = '#2e5c34';
  for (let i = 0; i < 3; i++) {
    const w = size * (1 - i * 0.22);
    const yy = y - i * size * 0.5;
    octx.beginPath();
    octx.moveTo(x, yy - size * 0.6);
    octx.lineTo(x - w * 0.5, yy + size * 0.3);
    octx.lineTo(x + w * 0.5, yy + size * 0.3);
    octx.closePath();
    octx.fill();
  }
  octx.fillStyle = '#6b4a2e';
  octx.fillRect(x - 2, y + size * 0.25, 4, size * 0.35);
}

function buildRiverPath(c) {
  c.beginPath();
  c.moveTo(0, 575);
  c.bezierCurveTo(200, 560, 300, 595, 500, 578);
  c.bezierCurveTo(620, 568, 700, 585, 800, 572);
  c.lineTo(800, 600);
  c.lineTo(0, 600);
  c.closePath();
}

function drawRiver(octx) {
  octx.save();
  buildRiverPath(octx);
  const river = octx.createLinearGradient(0, 560, 0, 600);
  river.addColorStop(0, RIVER_TOP);
  river.addColorStop(1, RIVER_BOTTOM);
  octx.fillStyle = river;
  octx.fill();
  octx.restore();
}

function drawRiverFlow() {
  ctx.save();
  buildRiverPath(ctx);
  ctx.clip();
  const t = performance.now() / 1000;
  const speed = 45;
  const spacing = 200;
  const streaks = 5;
  for (let i = 0; i < streaks; i++) {
    const bx = ((i * spacing + t * speed) % (canvas.width + spacing)) - spacing;
    const by = 575 + ((i * 37) % 20);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(bx, by, 55, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Catmull-Rom-to-Bezier: the standard technique for a smooth curve that
// passes exactly through an arbitrary sequence of points (unlike a single
// quadratic/bezier, which only takes a fixed control-point count). Endpoints
// clamp by duplicating the first/last point as their own "neighbor", which
// degrades gracefully to a near-straight segment for a 2-point path.
function catmullRomSegments(path) {
  const segments = [];
  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[Math.max(i - 1, 0)];
    const p1 = path[i];
    const p2 = path[i + 1];
    const p3 = path[Math.min(i + 2, path.length - 1)];
    segments.push({
      cp1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      cp2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      end: p2,
    });
  }
  return segments;
}

function bezierPoint(p0, cp1, cp2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * cp1.x + 3 * u * t * t * cp2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * cp1.y + 3 * u * t * t * cp2.y + t * t * t * p3.y,
  };
}

function drawTrail(octx, path = WORLD_PATH) {
  if (path.length < 2) return;
  const segments = catmullRomSegments(path);
  octx.save();
  octx.strokeStyle = 'rgba(122,93,58,0.6)';
  octx.lineWidth = 10;
  octx.lineCap = 'round';
  octx.lineJoin = 'round';
  octx.beginPath();
  octx.moveTo(path[0].x, path[0].y);
  segments.forEach((s) => octx.bezierCurveTo(s.cp1.x, s.cp1.y, s.cp2.x, s.cp2.y, s.end.x, s.end.y));
  octx.stroke();

  octx.strokeStyle = '#c9a86a';
  octx.lineWidth = 3;
  octx.setLineDash([6, 10]);
  octx.beginPath();
  octx.moveTo(path[0].x, path[0].y);
  segments.forEach((s) => octx.bezierCurveTo(s.cp1.x, s.cp1.y, s.cp2.x, s.cp2.y, s.end.x, s.end.y));
  octx.stroke();
  octx.setLineDash([]);

  segments.forEach((s, seg) => {
    const p0 = seg === 0 ? path[0] : segments[seg - 1].end;
    for (let k = 0; k < 3; k++) {
      const t = hashCell(seg, k, 50);
      const pt = bezierPoint(p0, s.cp1, s.cp2, s.end, t);
      const px = pt.x + (hashCell(seg, k, 51) - 0.5) * 14;
      const py = pt.y + (hashCell(seg, k, 52) - 0.5) * 14;
      octx.fillStyle = '#8a7355';
      octx.beginPath();
      octx.arc(px, py, 2, 0, Math.PI * 2);
      octx.fill();
    }
  });
  octx.restore();
}

let mapBackgroundCanvas = null;
function buildMapBackground() {
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext('2d');

  drawSky(octx);
  MOUNTAIN_LAYERS.forEach((layer, i) => drawRidgeLayer(octx, layer, i + 1));

  const valley = octx.createLinearGradient(0, 400, 0, 600);
  valley.addColorStop(0, VALLEY_TOP);
  valley.addColorStop(1, VALLEY_BOTTOM);
  octx.fillStyle = valley;
  octx.fillRect(0, 400, canvas.width, 200);

  drawRiver(octx);

  for (let i = 0; i < 40; i++) {
    const x = hashCell(i, 1, 99) * canvas.width;
    const y = 410 + hashCell(i, 2, 99) * 150;
    const tooClose = WORLD_PATH.some((n) => Math.hypot(n.x - x, n.y - y) < 55);
    if (tooClose) continue;
    if (hashCell(i, 3, 99) < 0.6) {
      drawPineTree(octx, x, y, 10 + hashCell(i, 4, 99) * 8);
    } else {
      octx.fillStyle = '#5a6b4a';
      octx.beginPath();
      octx.ellipse(x, y, 4 + hashCell(i, 5, 99) * 3, 3, 0, 0, Math.PI * 2);
      octx.fill();
    }
  }

  drawTrail(octx);
  mapBackgroundCanvas = off;
}

// World 2's background reuses the mountain map's dark-gradient/torch-glow
// technique and hashCell-seeded scatter approach, but its rock silhouette
// is its own generateCaveWallOutline/drawCaveWallLayer (below) -- NOT
// generateRidgeline/drawRidgeLayer. Those produce sharp triangular peaks,
// which read as mountains regardless of palette; caves need rounded bumpy
// walls instead, so this is a deliberate sibling implementation, not a
// missed reuse opportunity. A single-node world has no river and nothing
// to connect a trail between, so drawRiver/drawTrail are deliberately
// skipped here, not forgotten.
const CAVERN_LAYERS = [
  { baseY: 200, amplitude: 40, color: '#2a2438' },
  { baseY: 250, amplitude: 55, color: '#221c30' },
  { baseY: 305, amplitude: 68, color: '#1a1526' },
  { baseY: 365, amplitude: 85, color: '#120e1c' },
];
const CAVE_FLOOR_TOP = '#1c1626';
const CAVE_FLOOR_BOTTOM = '#0d0a14';
const TORCH_GLOW_COLOR = '255,158,66';

function drawCaveGlow(octx) {
  const bg = octx.createLinearGradient(0, 0, 0, 420);
  bg.addColorStop(0, '#05060c');
  bg.addColorStop(1, '#171224');
  octx.fillStyle = bg;
  octx.fillRect(0, 0, canvas.width, canvas.height);

  const torchSpots = [{ x: 120, y: 340 }, { x: 420, y: 120 }, { x: 660, y: 260 }];
  torchSpots.forEach((t) => {
    const glow = octx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 90);
    glow.addColorStop(0, `rgba(${TORCH_GLOW_COLOR},0.35)`);
    glow.addColorStop(1, `rgba(${TORCH_GLOW_COLOR},0)`);
    octx.fillStyle = glow;
    octx.beginPath();
    octx.arc(t.x, t.y, 90, 0, Math.PI * 2);
    octx.fill();
  });
}

// Same hashed-point idea as generateRidgeline, but connected with
// quadraticCurveTo through each segment's midpoint (a standard canvas trick
// for a smooth wavy/bumpy line) instead of lineTo -- rounded rock-wall bumps
// instead of sharp mountain-peak triangles.
function generateCaveWallOutline(seed, baseY, amplitude, bumpCount) {
  const points = [{ x: 0, y: baseY }];
  const step = canvas.width / bumpCount;
  for (let i = 0; i <= bumpCount; i++) {
    const x = i * step;
    const y = baseY - amplitude * (0.3 + 0.7 * hashCell(seed, i, 7));
    points.push({ x, y });
  }
  points.push({ x: canvas.width, y: baseY });
  return points;
}

function drawCaveWallLayer(octx, layer, seed) {
  const points = generateCaveWallOutline(seed, layer.baseY, layer.amplitude, 6);
  octx.beginPath();
  octx.moveTo(0, canvas.height);
  octx.lineTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const cur = points[i];
    const next = points[i + 1];
    octx.quadraticCurveTo(cur.x, cur.y, (cur.x + next.x) / 2, (cur.y + next.y) / 2);
  }
  octx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  octx.lineTo(canvas.width, canvas.height);
  octx.closePath();
  octx.fillStyle = layer.color;
  octx.fill();
}

// Hanging from the ceiling -- one of the most immediately recognizable
// "you are inside a cave" cues, and previously entirely absent (nothing at
// all occupied the top of the screen). Seeded like every other decoration
// in this file (pine trees, crystals, trail pebbles); avoids CAVERN_PATH
// node positions the same way the crystal-cluster scatter does.
function drawStalactites(octx) {
  for (let i = 0; i < 14; i++) {
    const x = hashCell(i, 1, 301) * canvas.width;
    const depth = 30 + hashCell(i, 2, 301) * 75;
    const width = 14 + hashCell(i, 3, 301) * 20;
    const tooClose = CAVERN_PATH.some((n) => Math.hypot(n.x - x, n.y - depth / 2) < 60);
    if (tooClose) continue;
    octx.save();
    octx.fillStyle = CAVE_FLOOR_BOTTOM;
    octx.beginPath();
    octx.moveTo(x - width / 2, 0);
    octx.quadraticCurveTo(x, depth * 0.4, x, depth);
    octx.quadraticCurveTo(x, depth * 0.4, x + width / 2, 0);
    octx.closePath();
    octx.fill();
    octx.restore();
  }
}

function drawCrystalCluster(octx, x, y, size) {
  octx.save();
  octx.fillStyle = '#7fd6ff';
  octx.shadowColor = '#7fd6ff';
  octx.shadowBlur = 6;
  for (let i = 0; i < 3; i++) {
    const w = size * (1 - i * 0.25);
    const yy = y - i * size * 0.4;
    octx.globalAlpha = 0.85 - i * 0.15;
    octx.beginPath();
    octx.moveTo(x, yy - size * 0.7);
    octx.lineTo(x - w * 0.4, yy + size * 0.2);
    octx.lineTo(x + w * 0.4, yy + size * 0.2);
    octx.closePath();
    octx.fill();
  }
  octx.restore();
}

let cavernMapBackgroundCanvas = null;
function buildCavernMapBackground() {
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext('2d');

  drawCaveGlow(octx);
  CAVERN_LAYERS.forEach((layer, i) => drawCaveWallLayer(octx, layer, i + 101));
  drawStalactites(octx);

  const floor = octx.createLinearGradient(0, 400, 0, 600);
  floor.addColorStop(0, CAVE_FLOOR_TOP);
  floor.addColorStop(1, CAVE_FLOOR_BOTTOM);
  octx.fillStyle = floor;
  octx.fillRect(0, 400, canvas.width, 200);

  for (let i = 0; i < 24; i++) {
    const x = hashCell(i, 1, 199) * canvas.width;
    const y = 410 + hashCell(i, 2, 199) * 150;
    const tooClose = CAVERN_PATH.some((n) => Math.hypot(n.x - x, n.y - y) < 55);
    if (tooClose) continue;
    drawCrystalCluster(octx, x, y, 8 + hashCell(i, 4, 199) * 8);
  }

  if (CAVERN_PATH.length > 1) drawTrail(octx, CAVERN_PATH);

  cavernMapBackgroundCanvas = off;
}

function isWallAt(col, row) {
  if (col < 0 || row < 0 || col >= GRID_COLS || row >= GRID_ROWS) return true;
  return walls[row][col];
}

function parseLevel(levelDef) {
  const isWallGrid = [];
  let startPos = null;
  let exitPos = null;
  for (let row = 0; row < GRID_ROWS; row++) {
    const line = levelDef.grid[row] || '';
    const wallRow = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const ch = line[col] || '#';
      wallRow.push(ch === '#');
      if (ch === 'S') startPos = { x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 };
      if (ch === 'E') exitPos = { x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 };
    }
    isWallGrid.push(wallRow);
  }
  return { isWallGrid, startPos, exitPos };
}

function createHazard(def, levelIndex) {
  const speedScale = def.speedMul * (HAZARD_SPEED_BASE + levelIndex * HAZARD_SPEED_LEVEL_INCREMENT);
  if (def.type === 'patrol') {
    return { type: 'patrol', a: def.a, b: def.b, radius: def.radius, speed: speedScale, t: 0, dir: 1, x: def.a.x, y: def.a.y, reactive: def.reactive };
  }
  if (def.type === 'circular') {
    return {
      type: 'circular', center: def.center, orbitRadius: def.orbitRadius, radius: def.radius,
      angle: def.startAngle || 0, speed: speedScale,
      x: def.center.x + Math.cos(def.startAngle || 0) * def.orbitRadius,
      y: def.center.y + Math.sin(def.startAngle || 0) * def.orbitRadius,
      reactive: def.reactive,
    };
  }
  return { type: 'bounce', x: def.x, y: def.y, dir: { x: def.dir.x, y: def.dir.y }, bounds: def.bounds, radius: def.radius, speed: speedScale, reactive: def.reactive };
}

function effectiveHazardSpeed(h) {
  if (h.reactive) {
    const dist = Math.hypot(player.x - h.x, player.y - h.y);
    if (dist < h.reactive.triggerDist) return h.speed * h.reactive.boostMul;
  }
  return h.speed;
}

function updateHazard(h, dt) {
  const speed = effectiveHazardSpeed(h);
  if (h.type === 'patrol') {
    const dx = h.b.x - h.a.x;
    const dy = h.b.y - h.a.y;
    const segLen = Math.hypot(dx, dy) || 1;
    h.t += (speed * h.dir * dt) / segLen;
    if (h.t >= 1) { h.t = 1; h.dir = -1; }
    else if (h.t <= 0) { h.t = 0; h.dir = 1; }
    h.x = h.a.x + dx * h.t;
    h.y = h.a.y + dy * h.t;
  } else if (h.type === 'circular') {
    const angularSpeed = speed / h.orbitRadius;
    h.angle += angularSpeed * dt;
    h.x = h.center.x + Math.cos(h.angle) * h.orbitRadius;
    h.y = h.center.y + Math.sin(h.angle) * h.orbitRadius;
  } else if (h.type === 'bounce') {
    let nx = h.x + h.dir.x * speed * dt;
    let ny = h.y + h.dir.y * speed * dt;
    const minX = h.bounds.x + h.radius, maxX = h.bounds.x + h.bounds.w - h.radius;
    const minY = h.bounds.y + h.radius, maxY = h.bounds.y + h.bounds.h - h.radius;
    if (nx < minX) { nx = minX; h.dir.x *= -1; } else if (nx > maxX) { nx = maxX; h.dir.x *= -1; }
    if (ny < minY) { ny = minY; h.dir.y *= -1; } else if (ny > maxY) { ny = maxY; h.dir.y *= -1; }
    h.x = nx; h.y = ny;
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return m > 0 ? `${m}:${s.padStart(4, '0')}` : `${s}s`;
}

function showBanner(text, seconds) {
  bannerEl.textContent = text;
  bannerEl.classList.remove('hidden');
  bannerTimer = seconds;
}

function setupRunnerLevel(levelDef) {
  player.x = RUNNER_PLAYER_X;
  player.y = RUNNER_GROUND_Y;
  hazards = [];
  dashOrbs = [];
  dashTimer = 0;
  runnerScroll = 0;
  runnerHeight = 0;
  runnerVelY = 0;
  runnerGrounded = true;
  runnerCharging = false;
  runnerChargeTime = 0;
  runnerDashOrbs = (levelDef.dashOrbs || []).map((def) => ({
    gaugeX: def.gaugeX,
    height: def.height != null ? def.height : RUNNER_DASH_ORB_DEFAULT_HEIGHT,
    radius: RUNNER_DASH_ORB_RADIUS,
    used: false,
  }));
  runnerDashBoostTimer = 0;
  // Rebuilt fresh every call, same as runnerDashOrbs -- but unlike orbs,
  // gems' "collected" state was never on this runtime object to begin with
  // (see checkRunnerCollectiblePickups, which reads progress.gemsCollected),
  // so rebuilding the position list on respawn doesn't un-collect anything.
  runnerCollectibles = (levelDef.collectibles || []).map((def, i) => ({
    gaugeX: def.gaugeX, height: def.height || 0, radius: COLLECTIBLE_RADIUS, index: i,
  }));
  transformAnchor = { x: RUNNER_PLAYER_X, y: RUNNER_GROUND_Y - 14 };
}

function enterLevel(index) {
  currentLevelIndex = index;
  const levelDef = LEVELS[index];
  if (levelDef.mode === 'runner') {
    setupRunnerLevel(levelDef);
  } else {
    const parsed = parseLevel(levelDef);
    walls = parsed.isWallGrid;
    exitZone = { x: parsed.exitPos.x, y: parsed.exitPos.y, radius: CELL_SIZE * 0.35 };
    player.x = parsed.startPos.x;
    player.y = parsed.startPos.y;
    hazards = levelDef.hazards.map((def) => createHazard(def, index));
    dashOrbs = (levelDef.dashOrbs || []).map((def) => ({ x: def.x, y: def.y, radius: DASH_ORB_RADIUS, used: false }));
    dashTimer = 0;
    transformAnchor = { x: parsed.startPos.x, y: parsed.startPos.y };
  }
  collectibles = (levelDef.collectibles || []).map((def, i) => ({
    x: def.x, y: def.y, radius: COLLECTIBLE_RADIUS, index: i,
  }));
  runGemFlags = progress.gemsCollected[index].slice();
  runGemCount = runGemFlags.filter(Boolean).length;
  levelTimer = 0;
  lives = LIVES_PER_ATTEMPT;
  invulnTimer = INVULN_TIME;
  levelLabel.textContent = levelDef.name;
  livesLabel.textContent = `Lives: ${lives}`;
  gemsLabel.textContent = `Gems: ${runGemCount}/${collectibles.length}`;
  timeLabel.textContent = 'Time: 0.0s';
  const best = progress.bestTimes[index];
  bestLabel.textContent = best == null ? 'Best: --' : `Best: ${formatTime(best)}`;
  transformTimer = 0;
  transformDirection = 1;
  phase = Phase.TRANSFORM_IN;
  hud.classList.add('hidden');
  leaderboardBtn.classList.add('hidden');
  usernameBtn.classList.add('hidden');
}

function respawnInLevel() {
  const levelDef = LEVELS[currentLevelIndex];
  // A death discards this attempt's new gem pickups -- revert to only what
  // was already permanently banked (from a past clean run) before this
  // attempt started, not zero, so replaying an already-100%-cleared level
  // still shows those as collected.
  runGemFlags = progress.gemsCollected[currentLevelIndex].slice();
  runGemCount = runGemFlags.filter(Boolean).length;
  gemsLabel.textContent = `Gems: ${runGemCount}/${collectibles.length}`;
  if (levelDef.mode === 'runner') {
    setupRunnerLevel(levelDef);
    invulnTimer = INVULN_TIME;
    return;
  }
  const parsed = parseLevel(levelDef);
  player.x = parsed.startPos.x;
  player.y = parsed.startPos.y;
  hazards = levelDef.hazards.map((def) => createHazard(def, currentLevelIndex));
  dashOrbs = (levelDef.dashOrbs || []).map((def) => ({ x: def.x, y: def.y, radius: DASH_ORB_RADIUS, used: false }));
  dashTimer = 0;
  invulnTimer = INVULN_TIME;
}

function returnToMenu(afterAction) {
  transformAnchor = { x: player.x, y: player.y };
  transformTimer = 0;
  transformDirection = -1;
  pendingAfterTransformOut = afterAction;
  phase = Phase.TRANSFORM_OUT;
  hud.classList.add('hidden');
}

function tryAxis(axis, delta) {
  if (delta === 0) return;
  const candidate = { x: axis === 'x' ? player.x + delta : player.x, y: axis === 'y' ? player.y + delta : player.y, radius: player.radius };
  const col = Math.floor(candidate.x / CELL_SIZE);
  const row = Math.floor(candidate.y / CELL_SIZE);
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (isWallAt(c, r) && circleCellOverlap(candidate, c, r)) return;
    }
  }
  player[axis] = candidate[axis];
}

function triggerDashOrb(orb) {
  orb.used = true;
  dashDirX = player.facingX;
  dashDirY = player.facingY;
  dashTimer = DASH_DURATION;
  invulnTimer = Math.max(invulnTimer, DASH_DURATION + DASH_INVULN_BUFFER);
}

// Space-bar alternative to clicking: triggers the nearest unused orb in range,
// no aiming required (unlike the click handler, which also needs the click itself
// to land on the orb's icon) -- lets you dash without taking a hand off WASD.
function triggerNearestDashOrb() {
  if (dashTimer > 0) return;
  let nearest = null;
  let nearestDist = Infinity;
  for (const orb of dashOrbs) {
    if (orb.used) continue;
    const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
    if (dist <= DASH_ORB_PROXIMITY_RADIUS && dist < nearestDist) {
      nearest = orb;
      nearestDist = dist;
    }
  }
  if (nearest) triggerDashOrb(nearest);
}

// Runner-mode counterpart: no facing/direction concept (the player doesn't
// move horizontally, the world scrolls), so triggering just grants a timed
// invulnerability window via the shared invulnTimer field instead of a
// directional burst -- see the RUNNER_DASH_* constants for why.
function triggerNearestRunnerDashOrb() {
  let nearest = null;
  let nearestDist = Infinity;
  for (const orb of runnerDashOrbs) {
    if (orb.used) continue;
    const dist = Math.abs(orb.gaugeX - runnerScroll);
    const heightOk = Math.abs(runnerHeight - orb.height) <= RUNNER_DASH_ORB_VERTICAL_TOLERANCE;
    if (dist <= RUNNER_DASH_ORB_PROXIMITY && heightOk && dist < nearestDist) {
      nearest = orb;
      nearestDist = dist;
    }
  }
  if (nearest) {
    nearest.used = true;
    invulnTimer = Math.max(invulnTimer, RUNNER_DASH_DURATION);
    runnerDashBoostTimer = RUNNER_DASH_DURATION;
  }
}

function updatePlayerMovement(dt) {
  if (dashTimer > 0) {
    dashTimer -= dt;
    player.isMoving = true;
    const speed = PLAYER_SPEED * DASH_SPEED_MUL;
    tryAxis('x', dashDirX * speed * dt);
    tryAxis('y', dashDirY * speed * dt);
    return;
  }

  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (dx === 0 && dy === 0) {
    player.isMoving = false;
    return;
  }
  const len = Math.hypot(dx, dy);
  dx /= len; dy /= len;
  player.facingX = dx;
  player.facingY = dy;
  player.isMoving = true;
  player.animPhase += dt * WALK_CYCLE_SPEED;

  const stepX = dx * PLAYER_SPEED * dt;
  const stepY = dy * PLAYER_SPEED * dt;

  tryAxis('x', stepX);
  tryAxis('y', stepY);
}

// Shared by both the maze hazard path and the runner spike path.
function loseLife(hitLabel) {
  lives -= 1;
  livesLabel.textContent = `Lives: ${Math.max(lives, 0)}`;
  if (lives > 0) {
    showBanner(`${hitLabel} Lives left: ${lives}`, BANNER_TIME);
    respawnInLevel();
  } else {
    showBanner('Caught. Falling back...', BANNER_TIME);
    returnToMenu(null);
  }
}

function checkHazardCollisions(dt) {
  if (invulnTimer > 0) { invulnTimer -= dt; return; }
  for (const h of hazards) {
    if (circlesOverlap(player, h)) {
      loseLife('Caught sight of you!');
      return;
    }
  }
}

function checkRunnerCollisions(dt) {
  if (invulnTimer > 0) { invulnTimer -= dt; return; }
  const gauntlet = LEVELS[currentLevelIndex].gauntlet;
  const feetY = RUNNER_GROUND_Y - runnerHeight;
  const playerLeft = RUNNER_PLAYER_X - RUNNER_PLAYER_HALF_WIDTH;
  const playerRight = RUNNER_PLAYER_X + RUNNER_PLAYER_HALF_WIDTH;
  const playerTop = feetY - RUNNER_PLAYER_HEIGHT;
  const playerBottom = feetY;
  for (const ob of gauntlet.obstacles) {
    const screenX = RUNNER_PLAYER_X + (ob.gaugeX - runnerScroll);
    const spikeLeft = screenX - RUNNER_SPIKE_WIDTH / 2;
    const spikeRight = screenX + RUNNER_SPIKE_WIDTH / 2;
    if (spikeRight < playerLeft || spikeLeft > playerRight) continue;
    if (ob.ground && playerBottom > RUNNER_GROUND_Y - ob.ground.height) {
      loseLife('Hit a spike!');
      return;
    }
    if (ob.ceiling && playerTop < RUNNER_CEILING_Y + ob.ceiling.height) {
      loseLife('Hit a spike!');
      return;
    }
  }
}

function checkNearMiss(dt) {
  if (nearMissFlashTimer > 0) nearMissFlashTimer -= dt;
  for (const h of hazards) {
    const dist = Math.hypot(player.x - h.x, player.y - h.y);
    const collisionDist = player.radius + h.radius;
    const nearDist = collisionDist + NEAR_MISS_MARGIN;
    if (dist >= collisionDist && dist < nearDist) {
      if (!h.nearMissArmed) {
        h.nearMissArmed = true;
        nearMissFlashTimer = NEAR_MISS_FLASH_TIME;
        nearMissFlashColor = HAZARD_COLORS[h.type] || '#ffffff';
      }
    } else if (dist >= nearDist * NEAR_MISS_REARM_MUL) {
      h.nearMissArmed = false;
    }
  }
}

function checkCollectiblePickups() {
  // Mutates runGemFlags (this attempt's progress), not progress.gemsCollected
  // directly -- see finishLevel() for where a clean run's pickups actually
  // get banked, and respawnInLevel() for where a death discards them.
  for (const g of collectibles) {
    if (runGemFlags[g.index]) continue;
    if (circlesOverlap(player, g)) {
      runGemFlags[g.index] = true;
      runGemCount++;
      gemsLabel.textContent = `Gems: ${runGemCount}/${collectibles.length}`;
    }
  }
}

// Runner-mode counterpart: player.x/y is frozen at a fixed screen position
// in this mode (the world scrolls, not the player), so circlesOverlap(player,
// g) against a world {x,y} would never fire -- compares runnerScroll/
// runnerHeight against a gem's {gaugeX, height} instead, same coordinate
// model the dash orb already uses. Uses an AABB overlap (full player body
// extent, not a single center point) matching checkRunnerCollisions'
// existing style -- an earlier circle-distance-from-center version produced
// real near-misses at typical frame step sizes (e.g. a grounded gem sat
// right at the boundary of a player-center-to-gem distance check, so a
// frame landing 1-2px off horizontally was enough to miss it entirely).
function checkRunnerCollectiblePickups() {
  // Mutates runGemFlags (this attempt's progress), not progress.gemsCollected
  // directly -- see finishLevel() for where a clean run's pickups actually
  // get banked, and respawnInLevel() for where a death discards them.
  const feetY = RUNNER_GROUND_Y - runnerHeight;
  const playerLeft = RUNNER_PLAYER_X - RUNNER_PLAYER_HALF_WIDTH;
  const playerRight = RUNNER_PLAYER_X + RUNNER_PLAYER_HALF_WIDTH;
  const playerTop = feetY - RUNNER_PLAYER_HEIGHT;
  const playerBottom = feetY;
  for (const g of runnerCollectibles) {
    if (runGemFlags[g.index]) continue;
    const screenX = RUNNER_PLAYER_X + (g.gaugeX - runnerScroll);
    const gemLeft = screenX - g.radius;
    const gemRight = screenX + g.radius;
    if (gemRight < playerLeft || gemLeft > playerRight) continue;
    const gemY = RUNNER_GROUND_Y - g.height;
    const gemTop = gemY - g.radius;
    const gemBottom = gemY + g.radius;
    if (gemBottom < playerTop || gemTop > playerBottom) continue;
    runGemFlags[g.index] = true;
    runGemCount++;
    gemsLabel.textContent = `Gems: ${runGemCount}/${collectibles.length}`;
  }
}

// Shared by both the maze exit-gate path and the runner gauntlet-clear path.
function finishLevel() {
  const isLast = currentLevelIndex === LEVELS.length - 1;
  progress.completedLevels[currentLevelIndex] = true;
  if (progress.unlockedIndex === currentLevelIndex && currentLevelIndex < LEVELS.length - 1) {
    progress.unlockedIndex = currentLevelIndex + 1;
  }
  const finishTime = levelTimer;
  const prevBest = progress.bestTimes[currentLevelIndex];
  const isNewBest = prevBest == null || finishTime < prevBest;
  if (isNewBest) progress.bestTimes[currentLevelIndex] = finishTime;
  // Gems only permanently bank on a clean, all-collected-in-one-life run --
  // a death reverts runGemFlags (see respawnInLevel()), discarding this
  // attempt's new pickups, and the pickup functions only ever mutate
  // runGemFlags, never progress.gemsCollected directly. An empty
  // collectibles list (e.g. a level with no gems) trivially "passes" but
  // there's nothing to bank either way.
  if (runGemFlags.length > 0 && runGemFlags.every(Boolean)) {
    progress.gemsCollected[currentLevelIndex] = runGemFlags.slice();
  }
  saveProgress();
  if (isNewBest && username) submitScore(currentLevelIndex, username, finishTime);
  // If this completion just unlocked a new world, hop the map view there so
  // beating the last level of World 1 immediately reveals World 2's vista.
  if (worldIndexForLevel(progress.unlockedIndex) !== worldIndexForLevel(currentLevelIndex)) {
    viewedWorldIndex = worldIndexForLevel(progress.unlockedIndex);
  }
  if (isLast) {
    showBanner('To be continued...', BANNER_TIME + 1.2);
  } else if (isNewBest) {
    showBanner(`Level Complete! New Best: ${formatTime(finishTime)}`, BANNER_TIME + 0.6);
  } else {
    showBanner('Level Complete!', BANNER_TIME);
  }
  returnToMenu(null);
}

function checkExitReached() {
  if (!circlesOverlap(player, exitZone)) return;
  finishLevel();
}

function checkRunnerFinish() {
  if (runnerScroll < LEVELS[currentLevelIndex].gauntlet.length) return;
  finishLevel();
}

function updateRunner(dt) {
  const holding = keys.has(' ') || keys.has('arrowup');
  if (runnerGrounded) {
    if (holding) {
      runnerCharging = true;
      runnerChargeTime = Math.min(runnerChargeTime + dt, RUNNER_MAX_CHARGE_TIME);
    } else if (runnerCharging) {
      const t = runnerChargeTime / RUNNER_MAX_CHARGE_TIME;
      runnerVelY = RUNNER_MIN_JUMP_VEL + (RUNNER_MAX_JUMP_VEL - RUNNER_MIN_JUMP_VEL) * t;
      runnerGrounded = false;
      runnerCharging = false;
      runnerChargeTime = 0;
    }
  }
  if (!runnerGrounded) {
    runnerVelY -= RUNNER_GRAVITY * dt;
    runnerHeight += runnerVelY * dt;
    if (runnerHeight <= 0) {
      runnerHeight = 0;
      runnerVelY = 0;
      runnerGrounded = true;
    }
  }
  if (runnerDashBoostTimer > 0) runnerDashBoostTimer -= dt;
  const scrollSpeed = runnerDashBoostTimer > 0 ? RUNNER_SCROLL_SPEED * RUNNER_DASH_SCROLL_BOOST_MUL : RUNNER_SCROLL_SPEED;
  runnerScroll += scrollSpeed * dt;
  checkRunnerCollectiblePickups();
  checkRunnerCollisions(dt);
  if (phase === Phase.PLAYING) checkRunnerFinish();
}

function update(dt) {
  if (bannerTimer > 0) {
    bannerTimer -= dt;
    if (bannerTimer <= 0) bannerEl.classList.add('hidden');
  }

  if (worldSwitchTimer < WORLD_SWITCH_TIME) {
    worldSwitchTimer = Math.min(worldSwitchTimer + dt, WORLD_SWITCH_TIME);
  }

  const isRunner = LEVELS[currentLevelIndex].mode === 'runner';

  if (phase === Phase.PLAYING) {
    levelTimer += dt;
    timeLabel.textContent = `Time: ${formatTime(levelTimer)}`;
    if (isRunner) {
      updateRunner(dt);
    } else {
      updatePlayerMovement(dt);
      for (const h of hazards) updateHazard(h, dt);
      checkHazardCollisions(dt);
      checkNearMiss(dt);
      checkCollectiblePickups();
      if (phase === Phase.PLAYING) checkExitReached();
    }
  } else if (phase === Phase.TRANSFORM_IN) {
    if (!isRunner) {
      for (const h of hazards) updateHazard(h, dt);
    }
    transformTimer += dt;
    if (transformTimer >= TRANSFORM_TIME) {
      phase = Phase.PLAYING;
      hud.classList.remove('hidden');
    }
  } else if (phase === Phase.TRANSFORM_OUT) {
    transformTimer += dt;
    if (transformTimer >= TRANSFORM_TIME) {
      phase = Phase.MENU;
      leaderboardBtn.classList.remove('hidden');
      usernameBtn.classList.remove('hidden');
    }
  }
}

// Skin plumbing: one skin defined today ("the usual person"), but every
// color drawCharacter uses is read from this object instead of hardcoded
// literals so a future skin-select feature only needs to add entries here
// and set currentSkin -- no drawCharacter changes.
const SKINS = {
  default: { legs: '#2e4a6b', torso: '#3a6ea8', head: '#f0c090', orb: '#7fd6ff' },
};
let currentSkin = 'default';
function getSkin() {
  return SKINS[currentSkin] || SKINS.default;
}

function drawCharacter(x, y, formT, bob, animState, skin = SKINS.default) {
  // formT: 0 = full human silhouette, 1 = fully the small traveling form
  const anim = animState || IDLE_ANIM;
  const guyScale = 1 - formT;
  const circleAlpha = formT;

  if (guyScale > 0.02) {
    ctx.save();
    ctx.globalAlpha = guyScale;
    ctx.translate(x, y + bob);
    if (anim.facing.x < -0.05) ctx.scale(-1, 1);
    const swing = anim.isMoving ? Math.sin(anim.animPhase) : 0;
    const legOffset = swing * LEG_SWING_AMPLITUDE;
    const armOffset = -swing * ARM_SWING_AMPLITUDE;
    const stretch = anim.isMoving ? 1 + Math.abs(Math.sin(anim.animPhase)) * 0.04 : 1;
    ctx.scale(1, stretch);

    ctx.fillStyle = skin.legs;
    ctx.fillRect(-9 + legOffset, -2, 6, 16);
    ctx.fillRect(3 - legOffset, -2, 6, 16);

    ctx.fillStyle = skin.torso;
    ctx.fillRect(-12 + armOffset, -20, 5, 15);
    ctx.fillRect(7 - armOffset, -20, 5, 15);
    ctx.fillRect(-8, -22, 16, 20);

    ctx.fillStyle = skin.head;
    ctx.beginPath();
    ctx.arc(0, -28, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (circleAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = circleAlpha;
    const pulse = anim.isMoving ? 1 : 0.85 + 0.15 * Math.sin(performance.now() / ORB_PULSE_SPEED);
    const baseRadius = PLAYER_RADIUS * (0.3 + 0.7 * formT) * pulse;

    if (anim.isMoving) {
      for (let i = ORB_TRAIL_COUNT; i >= 1; i--) {
        const tx = x - anim.facing.x * ORB_TRAIL_SPACING * i;
        const ty = y - anim.facing.y * ORB_TRAIL_SPACING * i;
        ctx.globalAlpha = circleAlpha * (0.3 - i * 0.06);
        ctx.fillStyle = skin.orb;
        ctx.beginPath();
        ctx.arc(tx, ty, baseRadius * (1 - i * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = circleAlpha;
    }

    ctx.fillStyle = skin.orb;
    ctx.shadowColor = skin.orb;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFloorCell(col, row) {
  const n = hashCell(currentLevelIndex, col, row);
  const light = Math.round(196 + (n - 0.5) * 24);
  ctx.fillStyle = `rgb(${light}, ${Math.round(light * 0.86)}, ${Math.round(light * 0.62)})`;
  ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  if (hashCell(currentLevelIndex, col, row + 500) < 0.12) {
    const cx = col * CELL_SIZE + CELL_SIZE / 2 + (n - 0.5) * 10;
    const cy = row * CELL_SIZE + CELL_SIZE / 2 + (n - 0.5) * 10;
    ctx.fillStyle = 'rgba(120,100,70,0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWallCell(col, row) {
  const n = hashCell(currentLevelIndex, col + 1000, row);
  const base = Math.round(150 + (n - 0.5) * 20);
  ctx.fillStyle = `rgb(${base}, ${base - 8}, ${base - 18})`;
  ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(col * CELL_SIZE + 1, row * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
}

function drawVillageGate(x, y, radius, t) {
  const pulse = 0.6 + 0.4 * Math.sin(t / 400);
  ctx.save();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = GATE_COLOR;
  ctx.shadowColor = GATE_COLOR;
  ctx.shadowBlur = 14 + pulse * 10;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCollectible(g, t) {
  if (runGemFlags[g.index]) return;
  const pulse = 0.85 + 0.15 * Math.sin(t / 260 + g.index);
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = GEM_COLOR;
  ctx.shadowColor = GEM_COLOR;
  ctx.shadowBlur = 8 * pulse;
  const r = g.radius * pulse;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

function drawDashOrb(orb, t) {
  ctx.save();
  if (orb.used) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const near = Math.hypot(player.x - orb.x, player.y - orb.y) <= DASH_ORB_PROXIMITY_RADIUS;
  const pulse = 0.8 + 0.2 * Math.sin(t / 220);
  ctx.strokeStyle = DASH_ORB_COLOR;
  ctx.shadowColor = DASH_ORB_COLOR;
  ctx.shadowBlur = near ? 16 * pulse : 8 * pulse;
  ctx.lineWidth = near ? 3 : 2;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderMaze() {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (walls[row][col]) drawWallCell(col, row);
      else drawFloorCell(col, row);
    }
  }

  drawVillageGate(exitZone.x, exitZone.y, exitZone.radius, performance.now());

  const nowT = performance.now();
  for (const g of collectibles) drawCollectible(g, nowT);
  for (const orb of dashOrbs) drawDashOrb(orb, nowT);

  for (const h of hazards) {
    ctx.save();
    ctx.fillStyle = HAZARD_COLORS[h.type] || '#ff5c5c';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 260, canvas.width / 2, canvas.height / 2, 480);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(40,25,10,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVillageNode(x, y, opts) {
  const { locked, completed, hovered, label } = opts;
  ctx.save();

  ctx.beginPath();
  ctx.ellipse(x, y + 14, 26, 13, 0, 0, Math.PI * 2);
  ctx.fillStyle = locked ? '#3a3530' : completed ? '#5c6b3a' : '#6b5638';
  ctx.fill();

  if (hovered && !locked) {
    ctx.save();
    ctx.shadowColor = '#fff59a';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 28, 14, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  } else if (completed) {
    ctx.save();
    ctx.shadowColor = '#8dff9a';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 28, 14, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(141,255,154,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  const bob = Math.sin(performance.now() / 500 + label * 1.7) * 3;
  ctx.save();
  ctx.translate(0, bob);

  const moundColor = locked ? '#4a4640' : completed ? '#7a7058' : '#6b6258';
  ctx.fillStyle = moundColor;
  [[-16, -4, 10], [-7, -17, 14], [7, -18, 14], [16, -5, 10], [0, -11, 15]].forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#140f0c';
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 1);
  ctx.lineTo(x - 8, y - 17);
  ctx.quadraticCurveTo(x - 8, y - 29, x, y - 29);
  ctx.quadraticCurveTo(x + 8, y - 29, x + 8, y - 17);
  ctx.lineTo(x + 8, y - 1);
  ctx.closePath();
  ctx.fill();

  if (locked) {
    ctx.fillStyle = '#5c5650';
    [[-4, -5, 4], [3, -8, 4], [0, -2, 3], [-3, -12, 3], [4, -13, 3]].forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    ctx.save();
    ctx.fillStyle = '#ffb85c';
    ctx.shadowColor = '#ffb85c';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y - 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.textAlign = 'center';
  if (locked) {
    ctx.fillStyle = '#aab0c0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String.fromCharCode(0x1F512), x, y + 18);
  } else {
    ctx.fillStyle = '#f5f0e0';
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 32);
    ctx.lineTo(x + 34, y - 28);
    ctx.lineTo(x + 16, y - 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(String(label), x + 23, y - 26);
  }
  ctx.restore();
}

function drawWorldArrow(x, y, dir) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,20,0.55)';
  ctx.beginPath();
  ctx.arc(x, y, WORLD_ARROW_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (dir < 0) {
    ctx.moveTo(x + 5, y - 8);
    ctx.lineTo(x - 5, y);
    ctx.lineTo(x + 5, y + 8);
  } else {
    ctx.moveTo(x - 5, y - 8);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x - 5, y + 8);
  }
  ctx.stroke();
  ctx.restore();
}

function drawWorldSwitchArrows() {
  if (canViewWorld(viewedWorldIndex - 1)) drawWorldArrow(WORLD_ARROW_MARGIN, WORLD_ARROW_Y, -1);
  if (canViewWorld(viewedWorldIndex + 1)) drawWorldArrow(canvas.width - WORLD_ARROW_MARGIN, WORLD_ARROW_Y, 1);
}

// Everything that visually belongs to one specific world's map -- background,
// nodes, frontier character, hover/flavor panel -- offset horizontally so
// renderMenu() can draw two of these at once mid-slide (the outgoing and
// incoming world) without duplicating this logic. Title text, gem total, and
// the switch arrows are deliberately NOT part of this -- they're fixed UI
// chrome that doesn't slide, drawn once by renderMenu() itself.
function renderWorldScene(world, offsetX) {
  ctx.save();
  ctx.translate(offsetX, 0);

  ctx.drawImage(world.theme === 'mountain' ? mapBackgroundCanvas : cavernMapBackgroundCanvas, 0, 0);
  if (world.theme === 'mountain') drawRiverFlow();

  world.path.forEach((n, i) => {
    const levelIdx = world.startIndex + i;
    const locked = levelIdx > progress.unlockedIndex;
    const completed = progress.completedLevels[levelIdx];
    const hovered = levelIdx === menuHoverIndex;
    drawVillageNode(n.x, n.y, { locked, completed, hovered, label: levelIdx + 1 });
  });

  const worldIdx = WORLDS.indexOf(world);
  const globalFrontierIdx = Math.min(progress.unlockedIndex, LEVELS.length - 1);
  const showFrontierChar = worldIndexForLevel(globalFrontierIdx) === worldIdx;
  if (showFrontierChar) {
    const frontier = world.path[globalFrontierIdx - world.startIndex];
    const bob = Math.sin(performance.now() / 300) * 3;
    drawCharacter(frontier.x, frontier.y - NODE_RADIUS - 20, 0, bob, IDLE_ANIM, getSkin());
  }

  const displayIndex = menuHoverIndex !== -1 ? menuHoverIndex : (showFrontierChar ? globalFrontierIdx : -1);
  if (displayIndex !== -1 && displayIndex <= progress.unlockedIndex && worldIndexForLevel(displayIndex) === worldIdx) {
    const displayBest = progress.bestTimes[displayIndex];
    const panelHeight = displayBest != null ? 48 : 30;
    ctx.fillStyle = 'rgba(10,14,20,0.55)';
    ctx.fillRect(canvas.width / 2 - 220, 480, 440, panelHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(LEVELS[displayIndex].flavorText, canvas.width / 2, 500);
    if (displayBest != null) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(`Best: ${formatTime(displayBest)}`, canvas.width / 2, 518);
    }
  }
  ctx.restore();
}

function renderMenu() {
  const world = WORLDS[viewedWorldIndex];

  if (worldSwitchTimer < WORLD_SWITCH_TIME) {
    const p = worldSwitchTimer / WORLD_SWITCH_TIME;
    const slide = p * canvas.width;
    renderWorldScene(WORLDS[worldSwitchFromIndex], -slide * worldSwitchDir);
    renderWorldScene(world, canvas.width * worldSwitchDir - slide * worldSwitchDir);
  } else {
    renderWorldScene(world, 0);
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.fillText(world.name, canvas.width / 2, 46);
  ctx.restore();

  const gemTotal = progress.gemsCollected.reduce((sum, arr) => sum + arr.filter(Boolean).length, 0);
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = GEM_COLOR;
  ctx.font = 'bold 15px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.fillText(`♦ ${gemTotal}`, canvas.width - 16, 30);
  ctx.restore();

  drawWorldSwitchArrows();
}

function drawNearMissFlash() {
  if (nearMissFlashTimer <= 0) return;
  const t = 1 - nearMissFlashTimer / NEAR_MISS_FLASH_TIME;
  const radius = player.radius + t * 18;
  const alpha = 1 - t;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = nearMissFlashColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = nearMissFlashColor;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGroundSpike(x, height) {
  ctx.save();
  ctx.fillStyle = '#c8c8d8';
  ctx.beginPath();
  ctx.moveTo(x - RUNNER_SPIKE_WIDTH / 2, RUNNER_GROUND_Y);
  ctx.lineTo(x, RUNNER_GROUND_Y - height);
  ctx.lineTo(x + RUNNER_SPIKE_WIDTH / 2, RUNNER_GROUND_Y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCeilingSpike(x, height) {
  ctx.save();
  ctx.fillStyle = '#c8c8d8';
  ctx.beginPath();
  ctx.moveTo(x - RUNNER_SPIKE_WIDTH / 2, RUNNER_CEILING_Y);
  ctx.lineTo(x, RUNNER_CEILING_Y + height);
  ctx.lineTo(x + RUNNER_SPIKE_WIDTH / 2, RUNNER_CEILING_Y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRunnerDashOrb(screenX, orb, t) {
  const y = RUNNER_GROUND_Y - orb.height;
  ctx.save();
  if (orb.used) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenX, y, orb.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const near = Math.abs(orb.gaugeX - runnerScroll) <= RUNNER_DASH_ORB_PROXIMITY
    && Math.abs(runnerHeight - orb.height) <= RUNNER_DASH_ORB_VERTICAL_TOLERANCE;
  const pulse = 0.8 + 0.2 * Math.sin(t / 220);
  ctx.strokeStyle = RUNNER_DASH_ORB_COLOR;
  ctx.shadowColor = RUNNER_DASH_ORB_COLOR;
  ctx.shadowBlur = near ? 16 * pulse : 8 * pulse;
  ctx.lineWidth = near ? 3 : 2;
  ctx.beginPath();
  ctx.arc(screenX, y, orb.radius * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(screenX, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderRunnerScene() {
  drawCaveGlow(ctx);

  ctx.fillStyle = CAVE_FLOOR_BOTTOM;
  ctx.fillRect(0, RUNNER_GROUND_Y, canvas.width, canvas.height - RUNNER_GROUND_Y);
  ctx.fillStyle = 'rgba(5,4,9,0.7)';
  ctx.fillRect(0, 0, canvas.width, RUNNER_CEILING_Y);

  const gauntlet = LEVELS[currentLevelIndex].gauntlet;
  for (const ob of gauntlet.obstacles) {
    const screenX = RUNNER_PLAYER_X + (ob.gaugeX - runnerScroll);
    if (screenX < -RUNNER_SPIKE_WIDTH || screenX > canvas.width + RUNNER_SPIKE_WIDTH) continue;
    if (ob.ground) drawGroundSpike(screenX, ob.ground.height);
    if (ob.ceiling) drawCeilingSpike(screenX, ob.ceiling.height);
  }

  const nowT = performance.now();
  for (const orb of runnerDashOrbs) {
    const screenX = RUNNER_PLAYER_X + (orb.gaugeX - runnerScroll);
    if (screenX < -RUNNER_DASH_ORB_RADIUS || screenX > canvas.width + RUNNER_DASH_ORB_RADIUS) continue;
    drawRunnerDashOrb(screenX, orb, nowT);
  }

  for (const g of runnerCollectibles) {
    const screenX = RUNNER_PLAYER_X + (g.gaugeX - runnerScroll);
    if (screenX < -20 || screenX > canvas.width + 20) continue;
    drawCollectible({ x: screenX, y: RUNNER_GROUND_Y - g.height, radius: g.radius, index: g.index }, nowT);
  }

  if (runnerDashBoostTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.06 * Math.sin(nowT / 90);
    ctx.fillStyle = RUNNER_DASH_ORB_COLOR;
    ctx.fillRect(0, RUNNER_CEILING_Y, canvas.width, RUNNER_GROUND_Y - RUNNER_CEILING_Y);
    ctx.restore();

    // Speed-line streaks (same technique as drawRiverFlow's water streaks) to
    // sell the scroll-speed boost as a forward burst, not just invulnerability.
    ctx.save();
    ctx.strokeStyle = RUNNER_DASH_ORB_COLOR;
    for (let i = 0; i < 6; i++) {
      const y = RUNNER_CEILING_Y + 20 + i * ((RUNNER_GROUND_Y - RUNNER_CEILING_Y - 40) / 5);
      const x = (canvas.width - ((nowT / 2 + i * 130) % (canvas.width + 120)));
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 60, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (runnerCharging) {
    const t = runnerChargeTime / RUNNER_MAX_CHARGE_TIME;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(RUNNER_PLAYER_X - 16, RUNNER_GROUND_Y + 12, 32, 5);
    ctx.fillStyle = '#7fd6ff';
    ctx.fillRect(RUNNER_PLAYER_X - 16, RUNNER_GROUND_Y + 12, 32 * t, 5);
    ctx.restore();
  }
}

function render() {
  const isRunner = LEVELS[currentLevelIndex].mode === 'runner';
  if (phase === Phase.MENU) {
    renderMenu();
  } else if (phase === Phase.PLAYING || phase === Phase.PAUSED) {
    if (isRunner) {
      renderRunnerScene();
      drawCharacter(RUNNER_PLAYER_X, RUNNER_GROUND_Y - runnerHeight - 14, 0, 0, RUNNER_ANIM, getSkin());
    } else {
      renderMaze();
      drawCharacter(player.x, player.y, 1, 0, { facing: { x: player.facingX, y: player.facingY }, isMoving: player.isMoving, animPhase: player.animPhase }, getSkin());
    }
    drawNearMissFlash();
  } else if (phase === Phase.TRANSFORM_IN) {
    if (isRunner) renderRunnerScene();
    else renderMaze();
    const t = Math.min(transformTimer / TRANSFORM_TIME, 1);
    drawCharacter(transformAnchor.x, transformAnchor.y, t, 0, IDLE_ANIM, getSkin());
  } else if (phase === Phase.TRANSFORM_OUT) {
    renderMenu();
    const t = Math.min(transformTimer / TRANSFORM_TIME, 1);
    drawCharacter(transformAnchor.x, transformAnchor.y, 1 - t, 0, IDLE_ANIM, getSkin());
  }
}

function submitScore(levelIndex, name, timeSeconds) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ level_index: levelIndex, username: name, time_seconds: timeSeconds }),
  }).catch(() => {});
}

async function fetchLeaderboard(levelIndex) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/leaderboard?level_index=eq.${levelIndex}&order=time_seconds.asc&limit=50`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function renderLeaderboardList(rows) {
  if (!rows) {
    leaderboardList.textContent = 'Leaderboard unavailable.';
    return;
  }
  const bestByName = new Map();
  for (const row of rows) {
    const existing = bestByName.get(row.username);
    if (!existing || row.time_seconds < existing.time_seconds) bestByName.set(row.username, row);
  }
  const top = Array.from(bestByName.values()).sort((a, b) => a.time_seconds - b.time_seconds).slice(0, LEADERBOARD_LIMIT);
  if (top.length === 0) {
    leaderboardList.textContent = 'No times yet -- be the first!';
    return;
  }
  leaderboardList.innerHTML = '';
  top.forEach((row, i) => {
    const div = document.createElement('div');
    div.className = 'row' + (row.username === username ? ' me' : '');
    div.textContent = `${i + 1}. ${row.username} — ${formatTime(row.time_seconds)}`;
    leaderboardList.appendChild(div);
  });
}

async function refreshLeaderboardList() {
  const levelIndex = Number(leaderboardLevelSelect.value);
  leaderboardList.textContent = 'Loading...';
  const rows = await fetchLeaderboard(levelIndex);
  renderLeaderboardList(rows);
}

function openLeaderboard() {
  if (leaderboardLevelSelect.options.length === 0) {
    LEVELS.forEach((lvl, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = lvl.name;
      leaderboardLevelSelect.appendChild(opt);
    });
  }
  leaderboardLevelSelect.value = String(currentLevelIndex);
  leaderboardScreen.classList.remove('hidden');
  refreshLeaderboardList();
}

leaderboardBtn.addEventListener('click', openLeaderboard);
leaderboardCloseBtn.addEventListener('click', () => {
  leaderboardScreen.classList.add('hidden');
});
leaderboardLevelSelect.addEventListener('change', refreshLeaderboardList);

function saveUsername(name) {
  username = name;
  localStorage.setItem(USERNAME_KEY, name);
  usernameBtn.textContent = `👤 ${username}`;
}

// Checks the shared leaderboard table for an existing row under this name --
// there's no real account/ownership system (see the leaderboard's documented
// "no real auth, top runs board" limitation), so "taken" just means someone
// has submitted a score under it before, not a reserved identity. Network
// failure or an unconfigured backend degrades to "not taken" (never blocks
// picking a name), matching every other Supabase call in this file.
async function isUsernameTaken(name) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const url = `${SUPABASE_URL}/rest/v1/leaderboard?username=ilike.${encodeURIComponent(name)}&select=username&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return false;
    const rows = await res.json();
    return rows.length > 0;
  } catch (e) {
    return false;
  }
}

// 'setup' (first-time, before startScreen has ever been shown) vs 'change'
// (opened later via usernameBtn) -- only 'setup' should reveal startScreen
// once done; 'change' just closes back to whatever's already on screen.
let usernameFlowMode = 'setup';
let pendingUsername = '';

function finishUsernameFlow(name) {
  saveUsername(name);
  usernameScreen.classList.add('hidden');
  if (usernameFlowMode === 'setup') {
    startScreen.classList.remove('hidden');
  }
}

usernameContinueBtn.addEventListener('click', async () => {
  const trimmed = usernameInput.value.trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    usernameError.classList.remove('hidden');
    return;
  }
  usernameError.classList.add('hidden');
  if (trimmed === username) {
    // No actual change -- skip the network round-trip, nothing to check.
    finishUsernameFlow(trimmed);
    return;
  }
  usernameContinueBtn.disabled = true;
  const taken = await isUsernameTaken(trimmed);
  usernameContinueBtn.disabled = false;
  if (taken) {
    pendingUsername = trimmed;
    usernameTakenText.textContent = `"${trimmed}" is already taken. Use it anyway?`;
    usernameScreen.classList.add('hidden');
    usernameTakenScreen.classList.remove('hidden');
    return;
  }
  finishUsernameFlow(trimmed);
});

usernameTakenYesBtn.addEventListener('click', () => {
  usernameTakenScreen.classList.add('hidden');
  finishUsernameFlow(pendingUsername);
});

usernameTakenNoBtn.addEventListener('click', () => {
  usernameTakenScreen.classList.add('hidden');
  usernameScreen.classList.remove('hidden');
  usernameInput.value = '';
  usernameInput.focus();
});

usernameBtn.addEventListener('click', () => {
  usernameFlowMode = 'change';
  usernameInput.value = username;
  usernameError.classList.add('hidden');
  usernameScreen.classList.remove('hidden');
});

if (username) {
  startScreen.classList.remove('hidden');
  usernameBtn.textContent = `👤 ${username}`;
} else {
  usernameFlowMode = 'setup';
  usernameScreen.classList.remove('hidden');
}

buildMapBackground();
buildCavernMapBackground();

function resizeGame() {
  const scale = Math.min(window.innerWidth / 800, window.innerHeight / 600);
  gameContainer.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', resizeGame);
resizeGame();

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05) || 0;
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
