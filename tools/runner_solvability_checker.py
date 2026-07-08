"""
Solvability checker for Maze Dodge's runner-mode levels (World 2, `mode:
'runner'`, currently "The Long Drop" and "The Narrows").

This isn't grid-based, so tools/solvability_checker.py's BFS approach doesn't
apply -- this is a continuous charge-jump physics problem instead.
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
schedule), each ordinary obstacle can be checked independently: does some
hold duration produce a trajectory whose safe-height sub-interval is at
least as long as the obstacle's danger window? A second pass checks that
consecutive ordinary obstacles leave enough scroll-time for a real
landing-and-reaction gap, using each obstacle's *minimal* sufficient hold
duration (not a worst-case max charge) so the spacing bound isn't needlessly
conservative.

Some obstacles are "dash-gated": ground.height + (ceiling.height or 0)
exceeds the total vertical play space, so NO hold duration clears them (see
is_dash_gated()) -- these are checked differently, via dash_group_coverage(),
which confirms a contiguous run of such obstacles (a "tunnel") can be
crossed entirely under the invulnerability granted by triggering a nearby
dash orb (mirrors triggerNearestRunnerDashOrb()/RUNNER_DASH_* in game.js),
for some trigger point within the orb's proximity window.

Level data is read directly from game.js as plain literal object arrays
(never runtime-generated, e.g. no Array.from) specifically so this text-based
parser can see every obstacle -- see the comment on "The Narrows"' tunnel in
game.js for why that matters.

Run as a script for a pass/fail report, or import the individual check
functions.
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
RUNNER_DASH_ORB_PROXIMITY = 40
RUNNER_DASH_DURATION = 2.4
RUNNER_DASH_SCROLL_BOOST_MUL = 1.7

REACTION_BUFFER = 0.4  # seconds of slack required between landing and the next obstacle's window
MAX_VERTICAL_SPACE = RUNNER_GROUND_Y - RUNNER_PLAYER_HEIGHT - RUNNER_CEILING_Y  # 146


def _split_top_level_objects(s):
    """Split a `{...}, {...}, ...` array body into each top-level {...} object's raw text."""
    objs, depth, cur = [], 0, []
    for ch in s:
        if ch == '{':
            depth += 1
            cur.append(ch)
        elif ch == '}':
            depth -= 1
            cur.append(ch)
            if depth == 0:
                objs.append(''.join(cur))
                cur = []
        elif depth > 0:
            cur.append(ch)
    return objs


def _extract_balanced_braces(s, from_idx):
    start = s.index('{', from_idx)
    depth = 0
    for i in range(start, len(s)):
        if s[i] == '{':
            depth += 1
        elif s[i] == '}':
            depth -= 1
            if depth == 0:
                return s[start:i + 1]
    raise ValueError("unbalanced braces")


def load_runner_levels(path=GAME_JS):
    with open(path) as f:
        src = f.read()
    m = re.search(r"const LEVELS = \[(.*)\n\];", src, re.S)
    if not m:
        raise RuntimeError("Could not find LEVELS array in game.js")
    body = m.group(1)

    levels = []
    for obj_text in _split_top_level_objects(body):
        if "mode: 'runner'" not in obj_text:
            continue
        name = re.search(r"name:\s*'([^']+)'", obj_text).group(1)
        gauntlet_block = _extract_balanced_braces(obj_text, obj_text.index('gauntlet:'))
        length = int(re.search(r"length:\s*(\d+)", gauntlet_block).group(1))

        obstacles = []
        for obm in re.finditer(
            r"\{\s*gaugeX:\s*(\d+),\s*ground:\s*\{\s*height:\s*(\d+)\s*\}(?:,\s*ceiling:\s*\{\s*height:\s*(\d+)\s*\})?\s*\}",
            gauntlet_block,
        ):
            gaugeX = int(obm.group(1))
            ground_h = int(obm.group(2))
            ceiling_h = int(obm.group(3)) if obm.group(3) is not None else None
            obstacles.append({'gaugeX': gaugeX, 'ground': ground_h, 'ceiling': ceiling_h})

        dash_orbs = []
        do_match = re.search(r"dashOrbs:\s*\[(.*?)\]", obj_text, re.S)
        if do_match:
            for om in re.finditer(r"gaugeX:\s*(\d+)", do_match.group(1)):
                dash_orbs.append({'gaugeX': int(om.group(1))})

        levels.append({'name': name, 'length': length, 'obstacles': obstacles, 'dashOrbs': dash_orbs})
    return levels


def is_dash_gated(ob):
    """True iff no runnerHeight satisfies both the ground and ceiling constraint at once."""
    return ob['ground'] + (ob['ceiling'] or 0) > MAX_VERTICAL_SPACE


def height_at(vel, t):
    return max(vel * t - 0.5 * RUNNER_GRAVITY * t * t, 0.0)


def flight_duration(vel):
    return 2 * vel / RUNNER_GRAVITY


def danger_window_duration():
    return (RUNNER_SPIKE_WIDTH + 2 * RUNNER_PLAYER_HALF_WIDTH) / RUNNER_SCROLL_SPEED


def obstacle_danger_span(ob):
    """(start, end) scroll positions during which this obstacle overlaps the player."""
    half = (RUNNER_SPIKE_WIDTH + 2 * RUNNER_PLAYER_HALF_WIDTH) / 2
    return ob['gaugeX'] - half, ob['gaugeX'] + half


def safe_window_for_tau(tau, ob, dt=1 / 480):
    tau = min(max(tau, 0.0), RUNNER_MAX_CHARGE_TIME)
    vel = RUNNER_MIN_JUMP_VEL + (RUNNER_MAX_JUMP_VEL - RUNNER_MIN_JUMP_VEL) * (tau / RUNNER_MAX_CHARGE_TIME)
    t_land = flight_duration(vel)
    ceiling_safe_max = None
    if ob['ceiling'] is not None:
        ceiling_safe_max = RUNNER_GROUND_Y - RUNNER_PLAYER_HEIGHT - RUNNER_CEILING_Y - ob['ceiling']

    best, cur = 0.0, 0.0
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
    """Returns (clearable, min_valid_tau, min_valid_flight_duration). Only meaningful for non-dash-gated obstacles."""
    needed = danger_window_duration()
    for i in range(samples + 1):
        tau = RUNNER_MAX_CHARGE_TIME * i / samples
        best, t_land = safe_window_for_tau(tau, ob)
        if best + 1e-6 >= needed:
            return True, tau, t_land
    return False, None, None


def dash_group_coverage(group, orb):
    """
    For a contiguous run of dash-gated obstacles ("group") and the dash orb
    meant to cover them, returns (ok, trigger_range) where trigger_range is
    the [lo, hi] scroll-position window (within the orb's proximity) from
    which triggering the dash keeps invulnerability active for the group's
    *entire* danger span. Non-empty trigger_range => solvable; its width is
    how much timing slack a real player has (report it, don't just pass/fail).
    """
    group_start = min(obstacle_danger_span(ob)[0] for ob in group)
    group_end = max(obstacle_danger_span(ob)[1] for ob in group)
    # The dash also boosts scroll speed for its duration (see RUNNER_DASH_SCROLL_BOOST_MUL
    # in game.js), so reach is larger than duration * base speed -- using the boosted
    # figure here keeps this an accurate model, not just a conservative under-estimate.
    dash_reach = RUNNER_DASH_DURATION * RUNNER_SCROLL_SPEED * RUNNER_DASH_SCROLL_BOOST_MUL

    proximity_lo = orb['gaugeX'] - RUNNER_DASH_ORB_PROXIMITY
    proximity_hi = orb['gaugeX'] + RUNNER_DASH_ORB_PROXIMITY

    # trigger_scroll must be <= group_start (dash active before the group starts)
    # and trigger_scroll + dash_reach >= group_end (still active when it ends).
    lo = max(proximity_lo, group_end - dash_reach)
    hi = min(proximity_hi, group_start)
    return (lo <= hi), (lo, hi)


def group_dash_gated_runs(obstacles):
    """Splits obstacles into a list of (is_dash_gated, [obstacles]) contiguous runs, in order."""
    runs = []
    for ob in obstacles:
        gated = is_dash_gated(ob)
        if runs and runs[-1][0] == gated:
            runs[-1][1].append(ob)
        else:
            runs.append((gated, [ob]))
    return runs


def check_spacing(pairs):
    """pairs: list of (label_a, label_b, gap_time, required_time)."""
    ok = True
    for label_a, label_b, gap_time, required in pairs:
        status = "OK" if gap_time >= required else "TOO TIGHT"
        if gap_time < required:
            ok = False
        print(f"  spacing {label_a}->{label_b}: gap={gap_time:.3f}s required>={required:.3f}s -> {status}")
    return ok


def report_level(level):
    name, length, obstacles, dash_orbs = level['name'], level['length'], level['obstacles'], level['dashOrbs']
    print(f"=== {name} === gauntlet length={length}, {len(obstacles)} obstacles, {len(dash_orbs)} dash orb(s)")
    needed = danger_window_duration()

    runs = group_dash_gated_runs(obstacles)
    all_ok = True
    spacing_pairs = []
    prev_end_time = None  # (gaugeX, flight_duration or dash reach) of the previous run's last clearing action

    orb_idx = 0
    for gated, group in runs:
        if not gated:
            for ob in group:
                clearable, tau, t_land = obstacle_clearable(ob)
                tag = f"gaugeX={ob['gaugeX']} ground={ob['ground']}" + (f" ceiling={ob['ceiling']}" if ob['ceiling'] else "")
                if clearable:
                    print(f"  obstacle [{tag}]: clearable=True min_tau={tau:.3f}s flight={t_land:.3f}s -> OK")
                else:
                    print(f"  obstacle [{tag}]: clearable=False -> FAIL (not dash-gated, but no jump clears it)")
                    all_ok = False
                if prev_end_time is not None:
                    gap_time = (ob['gaugeX'] - prev_end_time[0]) / RUNNER_SCROLL_SPEED
                    required = prev_end_time[1] + REACTION_BUFFER
                    spacing_pairs.append((f"gaugeX={prev_end_time[0]}", f"gaugeX={ob['gaugeX']}", gap_time, required))
                prev_end_time = (ob['gaugeX'], t_land or 0)
        else:
            span = f"gaugeX {group[0]['gaugeX']}-{group[-1]['gaugeX']}"
            if orb_idx >= len(dash_orbs):
                print(f"  DASH GROUP [{span}]: FAIL -- no dash orb defined for this dash-gated run")
                all_ok = False
                continue
            orb = dash_orbs[orb_idx]
            orb_idx += 1
            ok, (lo, hi) = dash_group_coverage(group, orb)
            if ok:
                print(f"  DASH GROUP [{span}] via orb@{orb['gaugeX']}: coverable=True "
                      f"valid_trigger_scroll=[{lo:.1f},{hi:.1f}] slack={hi - lo:.1f}px ({(hi - lo) / RUNNER_SCROLL_SPEED:.3f}s) -> OK")
            else:
                print(f"  DASH GROUP [{span}] via orb@{orb['gaugeX']}: coverable=False -> FAIL "
                      f"(no trigger point in proximity keeps invulnerability active for the whole span)")
                all_ok = False
            group_end = max(obstacle_danger_span(ob)[1] for ob in group)
            prev_end_time = (group_end, 0)  # already invulnerable through the group's end, no extra flight time owed

    if spacing_pairs:
        spacing_ok = check_spacing(spacing_pairs)
        all_ok = all_ok and spacing_ok

    if length < obstacles[-1]['gaugeX'] + 200:
        print(f"  WARNING: gauntlet.length ({length}) is close to/less than the last obstacle's "
              f"gaugeX ({obstacles[-1]['gaugeX']}) + landing margin -- finish line may trigger mid-jump")

    print(f"  {name}: ALL CLEARABLE/COVERABLE AND FAIRLY SPACED: {all_ok}")
    return all_ok


def report():
    levels = load_runner_levels()
    if not levels:
        print("No runner-mode levels found in game.js")
        return True
    all_ok = True
    for level in levels:
        all_ok = report_level(level) and all_ok
        print()
    print(f"ALL RUNNER LEVELS OK: {all_ok}")
    return all_ok


if __name__ == "__main__":
    report()
