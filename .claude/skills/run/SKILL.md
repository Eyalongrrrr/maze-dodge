---
description: Launch Maze Dodge (static HTML/Canvas game) and drive it headlessly via raw Chrome DevTools Protocol to verify changes actually work in a browser.
---

# Running & verifying Maze Dodge

This is a static site (`index.html` + `style.css` + `game.js`, no build
step). This machine has **no Node, no `chromium-cli`, no Playwright** —
only Python3 and a real Google Chrome.app install. The recipe below
drives headless Chrome directly over its DevTools Protocol (CDP) via a
raw websocket, using only `pip3 install --user websocket-client requests`
(both are lightweight, no browser binaries to download).

## 1. Serve the static files

```bash
cd "/Users/roeyyaniv/Documents/Eyal/maze-dodge"
python3 -m http.server 8934 &>/tmp/mazedodge_server.log &
echo $! > /tmp/mazedodge_server.pid
until curl -sf http://localhost:8934/ >/dev/null; do sleep 0.3; done
```

Stop it later with `kill $(cat /tmp/mazedodge_server.pid)`.

## 2. Launch headless Chrome with CDP enabled

The two flags that matter: `--remote-debugging-port` to expose CDP, and
`"--remote-allow-origins=*"` (quoted, or the shell glob-expands the `*`
and Chrome silently ignores the flag) — without it every websocket
handshake gets rejected with **403 Forbidden**.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9333 --disable-gpu \
  "--remote-allow-origins=*" --window-size=800,700 \
  --user-data-dir=/tmp/mazedodge-chrome-profile \
  http://localhost:8934/index.html > /tmp/chrome_headless.log 2>&1 &
echo $! > /tmp/chrome_headless.pid
sleep 2
curl -s http://localhost:9333/json/version   # confirms it's up
```

Stop it later with `kill $(cat /tmp/chrome_headless.pid)`.

**Launch with the real URL as the startup argument, not `about:blank`.** Starting on
`about:blank` and loading the page afterward (via `json/new?<url>` or `Page.navigate`)
can leave the tab with `document.hidden === true` / `visibilityState: 'hidden'` —
Chrome then fully suspends `requestAnimationFrame` (not just throttles it), so the
game loop never ticks: `phase` stays frozen, movement/timers/dashes never fire, yet
every CDP `Runtime.evaluate` call still succeeds and returns instantly, which makes
it look like a game bug rather than a suspended rAF loop. `Page.bringToFront` does
**not** fix an already-hidden tab in this setup. If you ever see state that never
changes across `time.sleep()` waits despite no console errors, check
`ev("document.hidden")` first — if `true`, kill Chrome and relaunch with the target
URL as the command-line argument (as above) rather than trying to recover the
existing tab.

## 3. Drive it with a small CDP client

Install once: `pip3 install --user websocket-client requests`.

Since Chrome is launched already pointed at the game (§2), reconnect to that
existing tab across every script invocation in a session — `requests.get(f"{BASE}/json")`
and pick the `index.html` entry — rather than creating additional tabs via
`json/new`. Opening a second/third tab is how the visibility issue above tends to
get triggered in practice (a newer tab can silently steal foreground from the one
you're still driving). If a script ever finds a tab that isn't advancing, check
`ev("document.hidden")` before assuming it's a game bug.

Open a new tab and connect (first script in the session only):

```python
import json, time, base64
import websocket, requests

BASE = "http://localhost:9333"
tab = requests.put(f"{BASE}/json/new?http://localhost:8934/index.html").json()
ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=10)

mid = 0
def send(method, params=None):
    global mid
    mid += 1
    ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
    while True:
        d = json.loads(ws.recv())
        if d.get("id") == mid:
            return d

def ev(expr):
    r = send("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    return r["result"]["result"].get("value")

send("Page.enable"); send("Runtime.enable")
```

Useful primitives, all just `send(...)` calls:

- **Screenshot**: `send("Page.captureScreenshot", {"format": "png"})`,
  then `base64.b64decode(r["result"]["data"])` and write to a file.
- **Click**: `Input.dispatchMouseEvent` with `type: mousePressed` then
  `mouseReleased`, same `x`/`y` — coordinates are CSS pixels relative
  to the viewport (get an element's rect first via
  `ev("JSON.stringify(el.getBoundingClientRect())")`).
- **Key hold** (for player movement): dispatch `Input.dispatchKeyEvent`
  `type: keyDown` with `key`/`code` (e.g. `{"key":"d","code":"KeyD"}`),
  **sleep** while it should be "held" (the game reads a `keys` Set every
  animation frame — a keyDown immediately followed by keyUp with no
  sleep in between may never get sampled by a frame), then dispatch
  `keyUp`.
- **Read/mutate game state directly**: this game exposes plain
  top-level `let`/`const` bindings (`phase`, `player`, `hazards`,
  `progress`, `lives`, `exitZone`, functions like `enterLevel(i)`), so
  `ev(...)` can both assert state and short-circuit tedious manual
  navigation — e.g. teleport the player onto a hazard or the exit to
  test collision/win logic without solving the maze by simulated
  keystrokes. This is legitimate for exercising the collision/lose/win
  *logic*; it doesn't substitute for confirming movement/rendering
  work, which still needs real key + screenshot checks.
- **Console errors**: listen for `Runtime.consoleAPICalled` (types
  `error`/`warning`) and `Runtime.exceptionThrown` messages that arrive
  on the same websocket between your `send()` calls — check there are
  none before declaring success.

## One representative walkthrough

1. Screenshot the start screen → click `#beginBtn` (get its rect via
   `getBoundingClientRect()` first) → screenshot the world map.
2. Click the level-1 node on `#gameCanvas` (canvas-relative coords —
   `WORLD_PATH[0]` is `{x:110, y:520}` in the current layout) → sleep
   ~1s for the transform-in tween → screenshot inside the level.
3. Hold `d`/`KeyD` for ~0.5s, `ev("JSON.stringify({x:player.x,y:player.y})")`
   before/after to confirm movement (and that wall collision stops it
   where expected).
4. `ev("player.x = hazards[0].x; player.y = hazards[0].y; invulnTimer = 0;")`
   → confirm `lives` drops and phase stays `playing` (respawn) or drops
   to `menu` (if it was the last life).
5. `ev("player.x = exitZone.x; player.y = exitZone.y;")` → sleep for the
   transform-out → confirm `phase === 'menu'` and
   `localStorage.getItem('mazeDodgeProgress')` reflects the unlock.
6. Reload the tab (`Page.navigate` to the same URL) and re-check
   `progress`/`localStorage` to confirm persistence survives a fresh load.

## Cleanup

```bash
kill $(cat /tmp/chrome_headless.pid) 2>/dev/null
kill $(cat /tmp/mazedodge_server.pid) 2>/dev/null
```
