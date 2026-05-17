# Omni Robot Tutor

An interactive learning platform that teaches a 16-year-old to code an X-configuration
omni-wheel robot in MicroPython on a Raspberry Pi Pico. Nine progressive modules cover
motor control, PWM, Python classes, omni kinematics, UART sensor parsing, trig, IMU
heading hold, and a final autonomous ball-chasing program.

**Live app:** https://omni-robot-tutor.replit.app/
**Repo:** https://github.com/jwrig318-ops/Omni-Robot-Tutor

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

- `artifacts/omni-v2/index.html` — all 9 lesson modules, wiring diagrams, SVG motor layout
- `artifacts/omni-v2/public/styles.css` — dark theme, wiring section, motor layout CSS
- `artifacts/omni-v2/public/app.js` — syntax highlighting, nav, progress, copy buttons
- `artifacts/api-server/src/routes/progress.ts` — GET/POST /api/progress
- `lib/db/src/schema/progress.ts` — module_progress table (DB source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI 3.1 spec (API contract source of truth)

## Architecture decisions

- All lesson content lives in a single `index.html` SPA (no bundler for the site itself).
  This keeps the teaching focus on MicroPython, not web tooling.
- Progress is tracked server-side (PostgreSQL via session cookie) so the student can
  resume across devices without creating an account.
- Wiring diagrams are inline SVGs — no external image hosting needed, loads instantly.
- The Motor class uses `pin_a = IN1, pin_b = IN2` convention throughout all nine lessons
  so pin assignments never vary between modules.
- DRV8871 is used exclusively (two PWM inputs); L298N / direction-pin / HIGH-LOW patterns
  are intentionally absent from all code examples.

## Product

Nine-module interactive course covering:
1. One motor, one direction — first PWM blink equivalent
2. Refactor to a helper function — code reuse intro
3. All four motors, tested forward pattern
4. Motor class — Python OOP fundamentals
5. OmniRobot class + `drive_xy_rot` — full kinematics
6. `drive_angle` — sin/cos applied to robot movement
7. Ball sensor ring — UART parsing
8. BNO055 IMU — I2C, gyro heading hold
9. Final program — autonomous ball chasing with heading correction

## User preferences

- Target reader is a 16-year-old; keep explanations clear and jargon-light.
- DRV8871 two-PWM pattern only — never introduce direction-pin drivers (L298N, etc.).
- All code examples must be copyable plain Python (no line numbers, no shell prompts).
- Motor pin assignments are fixed: M1 GP11/GP10, M2 GP13/GP12, M3 GP15/GP14, M4 GP18/GP19.
- Positive command = IN1=duty, IN2=0. Negative command = IN1=0, IN2=duty.
- UART Pico TX=GP8 → device RX; Pico RX=GP9 ← device TX. Always state direction explicitly.
- IMU BNO055 on GP0/GP1: use `SoftI2C(sda=Pin(0), scl=Pin(1), freq=10000)` — hardware I2C scans 0x28 but fails register reads with EIO on this setup. The `imu_bno055.py` helper handles this automatically.

## Nextion Display (Bonus section)

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
- Motor formula signs are tested: right-side motors (M1/M2) get negative for forward,
  left-side (M3/M4) get positive for forward. Do not flip the sign convention.
- `@replit/connectors-sdk` is installed at the workspace root for the GitHub integration
  used by the agent to push code; it is not a runtime dependency of any artifact.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Full wiring tables and motor layout diagram live in the Wiring Reference section of
  `artifacts/omni-v2/index.html` (search for `id="wiring"`)
- BNO055 helper: `imu_bno055.py` (Module 8 lesson code) — uses `SoftI2C` at 10 kHz, registers
  `CHIP_ID 0x00`, `OPR_MODE 0x3D`, `EULER_H_LSB 0x1A`, mode `NDOF 0x0C`
