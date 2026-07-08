"""
Solvability checker for Maze Dodge's runner-mode level (World 2, LEVELS[7],
`mode: 'runner'`, "The Long Drop").

This level isn't grid-based, so tools/solvability_checker.py's BFS approach
doesn't apply -- this is a continuous charge-jump physics problem instead.
Re-simulates (deliberately kept in sync with) the RUNNER_* constants and the
updateRunner()/checkRunnerCollisions() logic in game.js:
- charge-jump: hold duration tau in [0, RUNNER_MAX_CHARGE_TIME] maps linearly
  to launch velocity in [RUNNER_MIN_JUMP_VEL, RUNNER_MAX_JUMP_VEL]
- flight: simple projectile motion under RUNNER_GRAVITY
- collision: an obstacle is cleared iff, for the obstacle's full horizontal
  danger window, runnerHeight stays >= ground.height and (if a ceiling spike
  is present) <= the ceiling clearance -- mirrors checkRunnerCollisions'
  playerBottom/playerTop AABB test exactly

Because the player freely chooses *when* to release (not on a fixed
schedule), each obstacle can be checked independently: does some hold
duration produce a trajectory whose safe-height sub-interval is at least as
long as the obstacle's danger window? A second pass checks that consecutive
obstacles leave enough scroll-time for a real landing-and-reaction gap, using
each obstacle's *minimal* sufficient hold duration (not a worst-case max
charge) so the spacing bound isn't needlessly conservative.

Run as a script for a pass/fail report, or import obstacle_clearable().
"""
import re

GAME_JS = "/Users/roeyyaniv/Documents/Eyal/maze-dodge/game.js"

# Mirror game.js RUNNER_* constants exactly.
RUNNER_GROUND_Y = 460
RUNNER_CEILING_Y = 280
RUNNER_GRAVITY = 2200
RUNNER_MIN_JUMP_VEL = 380
RUNNER_MAX_JUMP_VEL = 780
RUNNER_MAX_CHARGE_TIME = 0.55
RUNNER_SCROLL_SPEED = 260
RUNNER_PLAYER_HALF_WIDTH = 9
RUNNER_SPIKE_WIDTH = 26
RUNNER_PLAYER_HEIGHT = 34  # approximate visual height used for the ceiling AABB, see drawCharacter

REACTION_BUFFER = 0.4  # seconds of slack required between landing and the next obstacle's window


def load_gauntlet(path=GAME_JS):
    with open(path) as f:
        src = f.read()
    m = re.search(r"mode:\s*'runner'.*?gauntlet:\s*\{(.*?)\n  \},\n\];", src, re.S)
    if not m:
        raise RuntimeError("Could not find the runner level's gauntlet block in game.js")
    block = m.group(1)
    length = int(re.search(r"length:\s*(\d+)", block).group(1))
    obstacles = []
    for obm in re.finditer(r"\{\s*gaugeX:\s*(\d+),\s*ground:\s*\{\s*height:\s*(\d+)\s*\}(?:,\s*ceiling:\s*\{\s*height:\s*(\d+)\s*\})?\s*\}", block):
        gaugeX = int(obm.group(1))
        ground_h = int(obm.group(2))
        ceiling_h = int(obm.group(3)) if obm.group(3) is not None else None
        obstacles.append({'gaugeX': gaugeX, 'ground': ground_h, 'ceiling': ceiling_h})
    return length, obstacles


def height_at(vel, t):
    return max(vel * t - 0.5 * RUNNER_GRAVITY * t * t, 0.0)


def flight_duration(vel):
    return 2 * vel / RUNNER_GRAVITY


def danger_window_duration():
    return (RUNNER_SPIKE_WIDTH + 2 * RUNNER_PLAYER_HALF_WIDTH) / RUNNER_SCROLL_SPEED


def safe_window_for_tau(tau, ob, dt=1 / 480):
    tau = min(max(tau, 0.0), RUNNER_MAX_CHARGE_TIME)
    vel = RUNNER_MIN_JUMP_VEL + (RUNNER_MAX_JUMP_VEL - RUNNER_MIN_JUMP_VEL) * (tau / RUNNER_MAX_CHARGE_TIME)
    t_land = flight_duration(vel)
    ceiling_safe_max = None
    if ob['ceiling'] is not None:
        ceiling_safe_max = RUNNER_GROUND_Y - RUNNER_PLAYER_HEIGHT - RUNNER_CEILING_Y - ob['ceiling']

    best, cur, t = 0.0, 0.0, 0.0
    steps = int(t_land / dt) + 2
    for i in range(steps):
        t = i * dt
        if t > t_land:
            break
        h = height_at(vel, t)
        ok = h >= ob['ground'] and (ceiling_safe_max is None or h <= ceiling_safe_max)
        if ok:
            cur += dt
            best = max(best, cur)
        else:
            cur = 0.0
    return best, t_land


def obstacle_clearable(ob, samples=300):
    """Returns (clearable, min_valid_tau, min_valid_flight_duration)."""
    needed = danger_window_duration()
    for i in range(samples + 1):
        tau = RUNNER_MAX_CHARGE_TIME * i / samples
        best, t_land = safe_window_for_tau(tau, ob)
        if best + 1e-6 >= needed:
            return True, tau, t_land
    return False, None, None


def check_spacing(obstacles, results):
    ok = True
    for i in range(len(obstacles) - 1):
        gap_time = (obstacles[i + 1]['gaugeX'] - obstacles[i]['gaugeX']) / RUNNER_SCROLL_SPEED
        _, _, t_land = results[i]
        required = (t_land or 0) + REACTION_BUFFER
        status = "OK" if gap_time >= required else "TOO TIGHT"
        if gap_time < required:
            ok = False
        print(f"  spacing {i}->{i + 1}: gap={gap_time:.3f}s required>={required:.3f}s -> {status}")
    return ok


def report():
    length, obstacles = load_gauntlet()
    print(f"=== The Long Drop === gauntlet length={length}, {len(obstacles)} obstacles")
    needed = danger_window_duration()
    print(f"  danger window duration per obstacle: {needed:.3f}s")

    results = []
    all_ok = True
    for i, ob in enumerate(obstacles):
        clearable, tau, t_land = obstacle_clearable(ob)
        results.append((clearable, tau, t_land))
        tag = f"gaugeX={ob['gaugeX']} ground={ob['ground']}" + (f" ceiling={ob['ceiling']}" if ob['ceiling'] else "")
        if clearable:
            print(f"  obstacle {i} [{tag}]: clearable=True min_tau={tau:.3f}s flight={t_land:.3f}s -> OK")
        else:
            print(f"  obstacle {i} [{tag}]: clearable=False -> FAIL")
            all_ok = False

    if all(r[0] for r in results):
        spacing_ok = check_spacing(obstacles, results)
        all_ok = all_ok and spacing_ok

    if length < obstacles[-1]['gaugeX'] + 200:
        print(f"  WARNING: gauntlet.length ({length}) is close to/less than the last obstacle's "
              f"gaugeX ({obstacles[-1]['gaugeX']}) + landing margin -- finish line may trigger mid-jump")

    print(f"ALL OBSTACLES CLEARABLE AND FAIRLY SPACED: {all_ok}")
    return all_ok


if __name__ == "__main__":
    report()
