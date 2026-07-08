"""
Dynamic solvability checker for Maze Dodge levels.

Reimplements (deliberately kept in sync with) the relevant subset of game.js:
- parseLevel's grid parsing (# wall, . floor, S start, E exit)
- createHazard/updateHazard's motion for patrol/circular/bounce
- circlesOverlap's margin (PLAYER_RADIUS + HAZARD_RADIUS)

Used for:
1. check_level(idx)          -- per-hazard bypass/tube verdict (same technique used
                                 to find+fix the two historical impossible-hazard bugs)
2. candidate_collectible_cells(idx) -- off-route, hazard-free cells for gem placement
3. check_dash_chain(idx, checkpoints) -- checkpoint-chain mode for the dash-orb level

Run as a script for a quick full-levels report, or import the functions.
"""
import re
import math
from collections import deque

GAME_JS = "/Users/roeyyaniv/Documents/Eyal/maze-dodge/game.js"
GRID_COLS, GRID_ROWS, CELL = 20, 15, 40
HAZARD_SPEED_BASE, HAZARD_SPEED_INC = 60, 12
PLAYER_RADIUS, HAZARD_RADIUS = 10, 11
MARGIN = PLAYER_RADIUS + HAZARD_RADIUS  # 21


def _split_objects(s):
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


def load_levels(path=GAME_JS):
    src = open(path).read()
    blocks = re.findall(r"name:\s*'([^']+)',.*?grid:\s*\[(.*?)\],.*?hazards:\s*\[(.*?)\n    \],", src, re.S)
    levels = []
    for name, grid_src, hz_src in blocks:
        g = _parse_grid(grid_src)
        levels.append({"name": name, "walls": g["walls"], "S": g["S"], "E": g["E"], "hazards": _parse_hazards(hz_src)})
    return levels


def _parse_grid(grid_src):
    rows = re.findall(r"'([^']*)'", grid_src)
    grid, s, e = [], None, None
    for r, line in enumerate(rows):
        row = []
        for c in range(GRID_COLS):
            ch = line[c] if c < len(line) else '#'
            row.append(ch == '#')
            if ch == 'S':
                s = (c, r)
            if ch == 'E':
                e = (c, r)
        grid.append(row)
    return {"walls": grid, "S": s, "E": e}


def _parse_hazards(hz_src):
    hazards = []
    for body in _split_objects(hz_src):
        htype = re.search(r"type:\s*'(\w+)'", body).group(1)

        def num(key, body=body):
            mm = re.search(key + r":\s*(-?\d+(?:\.\d+)?)", body)
            return float(mm.group(1)) if mm else None

        def pt(key, body=body):
            mm = re.search(key + r":\s*\{\s*x:\s*(-?\d+(?:\.\d+)?),\s*y:\s*(-?\d+(?:\.\d+)?)\s*\}", body)
            return (float(mm.group(1)), float(mm.group(2))) if mm else None

        hz = {"type": htype, "speedMul": num("speedMul")}
        if htype == "patrol":
            hz["a"], hz["b"] = pt("a"), pt("b")
        elif htype == "circular":
            hz["center"] = pt("center")
            hz["orbitRadius"] = num("orbitRadius")
            hz["startAngle"] = num("startAngle") or 0
        elif htype == "bounce":
            hz["x"], hz["y"] = num("x"), num("y")
            mm = re.search(r"dir:\s*\{\s*x:\s*(-?\d+(?:\.\d+)?),\s*y:\s*(-?\d+(?:\.\d+)?)\s*\}", body)
            hz["dir"] = (float(mm.group(1)), float(mm.group(2)))
            mm = re.search(r"bounds:\s*\{\s*x:\s*(-?\d+(?:\.\d+)?),\s*y:\s*(-?\d+(?:\.\d+)?),\s*w:\s*(-?\d+(?:\.\d+)?),\s*h:\s*(-?\d+(?:\.\d+)?)\s*\}", body)
            hz["bounds"] = tuple(float(g) for g in mm.groups())
        if "reactive:" in body:
            mm = re.search(r"boostMul:\s*(-?\d+(?:\.\d+)?)", body)
            hz["reactiveBoost"] = float(mm.group(1)) if mm else 2.0
        hazards.append(hz)
    return hazards


def is_wall(grid, c, r):
    if c < 0 or r < 0 or c >= GRID_COLS or r >= GRID_ROWS:
        return True
    return grid[r][c]


def bfs_reachable(grid, start, blocked):
    seen = {start}
    q = deque([start])
    while q:
        c, r = q.popleft()
        for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nc, nr = c + dc, r + dr
            if 0 <= nc < GRID_COLS and 0 <= nr < GRID_ROWS and not grid[nr][nc] and (nc, nr) not in seen and (nc, nr) not in blocked:
                seen.add((nc, nr))
                q.append((nc, nr))
    return seen


def bfs_shortest_path(grid, start, end):
    prev = {start: None}
    q = deque([start])
    while q:
        c, r = q.popleft()
        if (c, r) == end:
            break
        for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nc, nr = c + dc, r + dr
            if 0 <= nc < GRID_COLS and 0 <= nr < GRID_ROWS and not grid[nr][nc] and (nc, nr) not in prev:
                prev[(nc, nr)] = (c, r)
                q.append((nc, nr))
    if end not in prev:
        return None
    path = []
    cur = end
    while cur is not None:
        path.append(cur)
        cur = prev[cur]
    path.reverse()
    return path


def danger_cells_for_hazard(hz, grid, level_index, boosted=False):
    """Conservative static danger-zone: every floor cell the hazard's body can ever
    overlap a player-sized circle, inflated by MARGIN. Speed doesn't affect the
    *set* of reachable positions (only timing), so `boosted` only matters if a
    hazard's boosted speed could let it *reach further* within its own geometry
    (it can't -- patrol/circular/bounce ranges are fixed by a/b, orbitRadius,
    bounds regardless of speed) -- boosted is accepted for API symmetry/future use
    but intentionally does not change the geometry here, matching CLAUDE.md's
    'reachable-range is spatial, not speed-dependent' finding.
    """
    speed = hz["speedMul"] * (HAZARD_SPEED_BASE + level_index * HAZARD_SPEED_INC)
    pts = []
    if hz["type"] == "patrol":
        ax, ay = hz["a"]
        bx, by = hz["b"]
        seglen = math.hypot(bx - ax, by - ay)
        period = 2 * seglen / speed
        steps = 400
        for i in range(steps + 1):
            tt = (i / steps) * period
            frac = (tt % period) / period
            tri = 2 * frac if frac < 0.5 else 2 * (1 - frac)
            pts.append((ax + (bx - ax) * tri, ay + (by - ay) * tri))
    elif hz["type"] == "circular":
        cx, cy = hz["center"]
        orb = hz["orbitRadius"]
        angspeed = speed / orb
        period = 2 * math.pi / angspeed
        steps = 400
        for i in range(steps + 1):
            ang = hz["startAngle"] + angspeed * (period * i / steps)
            pts.append((cx + math.cos(ang) * orb, cy + math.sin(ang) * orb))
    elif hz["type"] == "bounce":
        bx0, by0, bw, bh = hz["bounds"]
        x, y = hz["x"], hz["y"]
        dx, dy = hz["dir"]
        r = HAZARD_RADIUS
        minx, maxx = bx0 + r, bx0 + bw - r
        miny, maxy = by0 + r, by0 + bh - r
        for _ in range(3000):
            nx, ny = x + dx * speed * 0.01, y + dy * speed * 0.01
            if nx < minx:
                nx = minx
                dx *= -1
            elif nx > maxx:
                nx = maxx
                dx *= -1
            if ny < miny:
                ny = miny
                dy *= -1
            elif ny > maxy:
                ny = maxy
                dy *= -1
            x, y = nx, ny
            pts.append((x, y))

    cells = set()
    for (px, py) in pts:
        c0, c1 = int((px - MARGIN) // CELL), int((px + MARGIN) // CELL)
        r0, r1 = int((py - MARGIN) // CELL), int((py + MARGIN) // CELL)
        for cc in range(c0, c1 + 1):
            for rr in range(r0, r1 + 1):
                if 0 <= cc < GRID_COLS and 0 <= rr < GRID_ROWS and not grid[rr][cc]:
                    cx_, cy_ = cc * CELL + CELL / 2, rr * CELL + CELL / 2
                    if (cx_ - px) ** 2 + (cy_ - py) ** 2 < (MARGIN + CELL * 0.71) ** 2:
                        cells.add((cc, rr))
    return cells


def all_danger_cells(level, level_index):
    grid = level["walls"]
    combined = set()
    per_hazard = []
    for hz in level["hazards"]:
        dc = danger_cells_for_hazard(hz, grid, level_index)
        per_hazard.append(dc)
        combined |= dc
    return combined, per_hazard


def check_level(level, level_index):
    """Per-hazard bypass/tube verdict -- same technique that found/fixed the two
    historical impossible-hazard bugs (levels 2 and 4)."""
    grid = level["walls"]
    s, e = level["S"], level["E"]
    results = []
    for hi, hz in enumerate(level["hazards"]):
        dc = danger_cells_for_hazard(hz, grid, level_index)
        blocked = dc - {s, e}
        bypass = e in bfs_reachable(grid, s, blocked)
        tube = sum(
            1 for (cc, rr) in dc
            if not (
                (not is_wall(grid, cc - 1, rr) or not is_wall(grid, cc + 1, rr))
                and (not is_wall(grid, cc, rr - 1) or not is_wall(grid, cc, rr + 1))
            )
        )
        ok = bypass or (len(dc) == 0) or tube <= len(dc) * 0.5
        results.append({
            "index": hi, "type": hz["type"], "bypass": bypass,
            "tube": tube, "total": len(dc), "ok": ok,
        })
    return results


EXIT_RADIUS = 40 * 0.35  # CELL_SIZE * 0.35, matches exitZone.radius in game.js
EXIT_TRIGGER_MARGIN = PLAYER_RADIUS + EXIT_RADIUS  # any approach within this ends the level


def exit_trigger_cells(level):
    """Floor cells within the exit's trigger radius -- entering ANY of these ends the
    level immediately (checkExitReached() fires every frame), unlike a hazard hit
    (which costs a life but lets you keep trying within the same attempt). A
    collectible reachable only by first passing through here is not just unsafe,
    it's flatly impossible: the run always ends before you can detour past it.
    """
    grid = level["walls"]
    e = level["E"]
    ex, ey = e[0] * CELL + CELL // 2, e[1] * CELL + CELL // 2
    cells = set()
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            if grid[r][c]:
                continue
            cx, cy = c * CELL + CELL // 2, r * CELL + CELL // 2
            if (cx - ex) ** 2 + (cy - ey) ** 2 < EXIT_TRIGGER_MARGIN ** 2:
                cells.add((c, r))
    return cells


def candidate_collectible_cells(level, level_index, slack=4):
    """Off-route, hazard-zone-free, exit-trigger-free cells: valid spots for an
    optional gem (see exit_trigger_cells() for why the exit is checked separately
    from ordinary hazard danger zones)."""
    grid = level["walls"]
    s, e = level["S"], level["E"]
    shortest = bfs_shortest_path(grid, s, e)
    on_route = set(shortest) if shortest else set()
    d0 = len(shortest) - 1 if shortest else 0

    dist_from_s = {s: 0}
    q = deque([s])
    while q:
        c, r = q.popleft()
        for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nc, nr = c + dc, r + dr
            if 0 <= nc < GRID_COLS and 0 <= nr < GRID_ROWS and not grid[nr][nc] and (nc, nr) not in dist_from_s:
                dist_from_s[(nc, nr)] = dist_from_s[(c, r)] + 1
                q.append((nc, nr))
    dist_from_e = {e: 0}
    q = deque([e])
    while q:
        c, r = q.popleft()
        for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nc, nr = c + dc, r + dr
            if 0 <= nc < GRID_COLS and 0 <= nr < GRID_ROWS and not grid[nr][nc] and (nc, nr) not in dist_from_e:
                dist_from_e[(nc, nr)] = dist_from_e[(c, r)] + 1
                q.append((nc, nr))

    danger, _ = all_danger_cells(level, level_index)
    exit_trigger = exit_trigger_cells(level)
    # blocked = anything that ends the run before you can reach/leave a pickup:
    # hazard danger zones (costs a life, recoverable) are folded in here too since
    # a "safe" gem should never require dodging one; the exit trigger is folded in
    # for a stronger reason -- it's not recoverable, it ends the attempt outright.
    blocked = danger | exit_trigger

    candidates = []
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            if grid[r][c]:
                continue
            cell = (c, r)
            if cell == s or cell == e:
                continue
            if cell in on_route:
                continue
            if cell in blocked:
                continue
            ds, de = dist_from_s.get(cell), dist_from_e.get(cell)
            if ds is None or de is None:
                continue
            if ds + de <= d0 + slack:
                continue  # too close to the main route to count as a real detour
            # verify the corridor TO this cell (from its nearest on-route ancestor)
            # is itself hazard-free: BFS from s avoiding danger, reaching this cell
            # without ever touching danger cells confirms the whole approach is safe.
            candidates.append({"cell": cell, "px": c * CELL + CELL / 2, "py": r * CELL + CELL / 2, "detour": ds + de - d0})

    # keep only candidates actually reachable from S without ever entering a blocked cell
    safe_reach = bfs_reachable(grid, s, blocked)
    candidates = [cand for cand in candidates if cand["cell"] in safe_reach]
    candidates.sort(key=lambda x: -x["detour"])
    return candidates


def dash_reach_ok(orb_px, orb_py, facing, dash_px_len, grid, danger_after):
    """Wall-clearance + sufficient-reach check for a dash: does a straight-line
    dash of length dash_px_len from (orb_px,orb_py) in `facing` direction (a) stay
    entirely on floor cells, and (b) clear the given danger zone by landing outside it?"""
    steps = int(dash_px_len)
    landed_outside_danger = False
    for i in range(1, steps + 1):
        px = orb_px + facing[0] * i
        py = orb_py + facing[1] * i
        c, r = int(px // CELL), int(py // CELL)
        if is_wall(grid, c, r):
            return {"ok": False, "reason": f"dash clips a wall at step {i}", "landing": (px, py)}
        if (c, r) not in danger_after:
            landed_outside_danger = True
    final_px = orb_px + facing[0] * dash_px_len
    final_py = orb_py + facing[1] * dash_px_len
    return {
        "ok": landed_outside_danger,
        "reason": None if landed_outside_danger else "dash never clears the danger zone",
        "landing": (final_px, final_py),
    }


# (level_index, hazard_index) pairs that are EXPECTED to fail the ordinary
# walk-only check because they're intentionally dash-gated (see CLAUDE.md).
# check_level()/report() treat these as OK rather than a regression; verify them
# instead via dash_reach_ok() / the checkpoint-chain reasoning in CLAUDE.md.
DASH_GATED_HAZARDS = {(6, 0), (6, 1)}  # Wyrmwind Col, both patrols


def report(levels=None):
    levels = levels or load_levels()
    all_ok = True
    for idx, level in enumerate(levels):
        wall_ok = level["E"] in bfs_reachable(level["walls"], level["S"], set())
        print(f"\n=== Level {idx + 1}: {level['name']} === wall-solvable: {wall_ok}")
        if not wall_ok:
            all_ok = False
        for res in check_level(level, idx):
            dash_gated = (idx, res["index"]) in DASH_GATED_HAZARDS
            ok = res["ok"] or dash_gated
            verdict = "OK" if res["ok"] else ("OK (dash-gated, verify separately)" if dash_gated else "*** BROKEN ***")
            if not ok:
                all_ok = False
            print(f"  hazard {res['index']} [{res['type']}]: bypass={res['bypass']} tube={res['tube']}/{res['total']} -> {verdict}")
    print("\nALL LEVELS OK:", all_ok)
    return all_ok


if __name__ == "__main__":
    report()
