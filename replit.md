# Robotics Academy

A two-course interactive learning hub for 16-year-olds. The hub landing page offers two
complete robotics courses side-by-side. Each course has its own sidebar, navigation, and
full lesson content.

**Live app:** https://omni-robot-tutor.replit.app/
**Repo:** https://github.com/jwrig318-ops/Omni-Robot-Tutor

## Courses

### (A) Omni Robot Course — Raspberry Pi Pico + MicroPython, 9 modules
Build and code an X-configuration omni-wheel robot on a Raspberry Pi Pico. Nine progressive
modules cover motor control, PWM, Python classes, omni kinematics, UART sensor parsing, trig,
IMU heading hold, and a final autonomous ball-chasing program.

### (B) RoboCup Maze Rescue Course — LEGO SPIKE + Python, 6 modules + 19-stage pathway
Program a LEGO SPIKE Prime robot to navigate a RoboCup rescue maze, detect coloured victim
markers with a colour sensor, avoid black hazard tiles, find the silver exit tile, and enter the
evacuation zone. Includes a 7-phase / 19-stage Python lesson pathway (Stages 1–19), a
competition checklist, and a resources page with API quick-reference.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/omni-v2 run dev` — run the front-end dev server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Front-end: static Vite + plain HTML/CSS/JS (no React in production site)

## Where things live

- `artifacts/omni-v2/index.html` — hub landing page + both full courses (~4600 lines)
- `artifacts/omni-v2/public/styles.css` — dark theme; hub/maze/omni/utility CSS
- `artifacts/omni-v2/public/app.js` — hub routing (showCourse), dual-course nav, progress, copy buttons
- `artifacts/api-server/src/routes/progress.ts` — GET/POST /api/progress
- `lib/db/src/schema/progress.ts` — module_progress table (DB source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI 3.1 spec (API contract source of truth)

## HTML Structure

Three sibling divs inside `<body>`:
- `#course-hub` — hub landing page (default, shown on load)
- `#omni-course` — Omni Robot course wrapper (`.layout` with sidebar + content)
- `#maze-course` — Maze Rescue course wrapper (`.layout` with sidebar + content)

`showCourse('hub'|'omni'|'maze')` in app.js toggles `display:none` on the inactive divs.

Within `#omni-course`: sections use `class="page"` + `id`; activated by `showPage(id)`.
Within `#maze-course`: sections use `class="page maze-page"` + `id`; activated by `showMazePage(id)`.

## Architecture decisions

- All lesson content lives in a single `index.html` SPA (no bundler for the site itself).
  This keeps the teaching focus on Python/MicroPython, not web tooling.
- Progress is tracked server-side (PostgreSQL via session cookie) so the student can
  resume across devices without creating an account. Progress tracking is Omni-course-only;
  the Maze course does not persist progress (checklist is visual-only).
- Wiring diagrams are inline SVGs — no external image hosting needed, loads instantly.
- The Motor class uses `pin_a = IN1, pin_b = IN2` convention throughout all nine Omni lessons
  so pin assignments never vary between modules.
- DRV8871 is used exclusively (two PWM inputs); L298N / direction-pin / HIGH-LOW patterns
  are intentionally absent from all Omni code examples.
- SPIKE Python API used in Maze course: `MotorPair('A','B')`, `ColorSensor('C')`,
  `DistanceSensor('D'/'E')`, `drive.move/move_tank/start/stop`,
  `color.get_color()/get_reflected_light_intensity()`,
  `hub.motion_sensor.get_yaw_angle()`, `hub.light_matrix`, `hub.speaker.beep()`.

## Product — Omni Robot Course (9 modules)

1. One motor, one direction — first PWM blink equivalent
2. Refactor to a helper function — code reuse intro
3. All four motors, tested forward pattern
4. Motor class — Python OOP fundamentals
5. OmniRobot class + `drive_xy_rot` — full kinematics
6. `drive_angle` — sin/cos applied to robot movement
7. Ball sensor ring — UART parsing
8. BNO055 IMU — I2C, gyro heading hold
9. Final program — autonomous ball chasing with heading correction

## Product — Maze Rescue Course (6 pages + Python pathway)

Modules:
1. The Challenge — arena layout, victim types, scoring rules
2. Build Your Robot — SPIKE hardware, sensor placement, size limits
3. Navigate the Maze — wall-following algorithm, gyro turns
4. Find the Victims — colour sensor classification, detection + signalling
5. Score Bonuses — hazard avoidance, silver tile, evacuation zone

Python Lessons (7 phases, 19 stages):
- Phase 1 (S1–2): Program structure, main loop
- Phase 2 (S3–4): MotorPair, forward/turn/stop
- Phase 3 (S5–6): Distance sensor, colour sensor
- Phase 4 (S7–9): Wall detection, left-wall following, dead ends
- Phase 5 (S10–13): Floor colour logging, hazard, silver, victim classifier
- Phase 6 (S14–17): Stop-and-signal, victim counting, display count, enter evac
- Phase 7 (S18–19): Combined navigation + detection, full competition program

Plus: Competition Checklist, Resources (API quick-reference table, official links)

## User preferences

- Target reader is a 16-year-old; keep explanations clear and jargon-light.
- DRV8871 two-PWM pattern only (Omni course) — never introduce direction-pin drivers (L298N, etc.).
- All code examples must be copyable plain Python (no line numbers, no shell prompts).
- Omni motor pin assignments are fixed: M1 GP11/GP10, M2 GP13/GP12, M3 GP15/GP14, M4 GP18/GP19.
- Positive command = IN1=duty, IN2=0. Negative command = IN1=0, IN2=duty.
- UART Pico TX=GP8 → device RX; Pico RX=GP9 ← device TX. Always state direction explicitly.
- IMU BNO055 on GP0/GP1: use `SoftI2C(sda=Pin(0), scl=Pin(1), freq=10000)` — hardware I2C scans 0x28 but fails register reads with EIO on this setup. The `imu_bno055.py` helper handles this automatically.

## Nextion Display (Bonus section — Omni course)

The site includes a "Nextion Display" bonus section (not a numbered module) accessible from the
sidebar and home grid. It covers:
- Display UI mockup SVG (dark navy/neon style matching the site)
- Wiring: Pico UART1 GP8 TX → Nextion RX, GP9 RX ← Nextion TX, 9600 baud, 5V display supply
- Software links: Nextion Editor, nextion.tech, instruction set
- Embedded YouTube walkthrough video
- Step-by-step setup tutorial (8 steps)
- MicroPython code: `nextion_send()` helper, text/page update examples, full demo, Module 9 integration snippet
- Troubleshooting cards (4 common issues)

**UART1 sharing:** GP8/GP9 is shared between the ball sensor (Modules 7 & 9) and the Nextion
display. For simultaneous use, move Nextion to UART0 GP16/GP17.

## Gotchas

- `pnpm run build` requires `PORT` and `BASE_PATH` env vars (set by workflow); use
  `pnpm --filter @workspace/<slug> run typecheck` for static checks from the shell instead.
- The front-end site (`artifacts/omni-v2`) is a static Vite build — the `src/` React
  scaffold exists but the production site is pure `index.html` + `public/`. Do not confuse the two.
- Omni motor formula signs are tested: right-side motors (M1/M2) get negative for forward,
  left-side (M3/M4) get positive for forward. Do not flip the sign convention.
- `@replit/connectors-sdk` is installed at the workspace root for the GitHub integration
  used by the agent to push code; it is not a runtime dependency of any artifact.
- Vite's parse5 HTML parser emits "invalid-first-character-of-tag-name" warnings for `<` chars
  inside `<pre>` code blocks (e.g. `GP9 <- device TX`). These are dev-server-only warnings and
  do not affect the browser or the production build.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Full Omni wiring tables and motor layout diagram live in the Wiring Reference section of
  `artifacts/omni-v2/index.html` (search for `id="wiring"`)
- BNO055 helper: `imu_bno055.py` (Module 8 lesson code) — uses `SoftI2C` at 10 kHz, registers
  `CHIP_ID 0x00`, `OPR_MODE 0x3D`, `EULER_H_LSB 0x1A`, mode `NDOF 0x0C`
- Maze course Python API uses SPIKE Python (not MicroPython). Do not mix the two.
