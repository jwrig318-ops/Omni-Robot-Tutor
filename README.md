# Omni Robot Tutor

An interactive, browser-based learning platform that teaches a 16-year-old how to code an
X-configuration omni-wheel robot in MicroPython on a Raspberry Pi Pico. Nine progressive
modules take the reader from blinking an LED all the way to autonomous ball-chasing with
gyroscope heading hold.

**Live app:** https://omni-robot-tutor.replit.app/
**Source:** https://github.com/jwrig318-ops/Omni-Robot-Tutor

---

## Repository layout

```
artifacts/
  omni-v2/           Static Vite site — the 9-module learning platform
    index.html         All lesson content, wiring diagrams, code examples
    public/
      styles.css       Dark-theme stylesheet
      app.js           Syntax highlighting, navigation, progress, copy buttons
      favicon.svg
  api-server/        Express 5 API server (port 5000)
    src/routes/
      progress.ts      GET /api/progress, POST /api/progress/:module
      health.ts        GET /api/healthz

lib/
  db/                Drizzle ORM schema + migrations (PostgreSQL)
    src/schema/
      progress.ts      module_progress table — source of truth for DB schema
  api-spec/          OpenAPI 3.1 contract — source of truth for the API
    openapi.yaml
  api-client-react/  Orval-generated React Query hooks
  api-zod/           Orval-generated Zod validation schemas

scripts/             Replit helper scripts and post-merge automation
```

---

## Motor wiring

### Motor positions

| Motor | Position    |
|-------|-------------|
| M1    | Front-right |
| M2    | Back-right  |
| M3    | Back-left   |
| M4    | Front-left  |

### Motor driver pin mapping — DRV8871 (two PWM inputs per motor)

| Motor | Position    | IN1 (Pico pin) | IN2 (Pico pin) | Driver  |
|-------|-------------|----------------|----------------|---------|
| M1    | Front-right | GP11           | GP10           | DRV8871 |
| M2    | Back-right  | GP13           | GP12           | DRV8871 |
| M3    | Back-left   | GP15           | GP14           | DRV8871 |
| M4    | Front-left  | GP18           | GP19           | DRV8871 |

### DRV8871 control pattern

| Command          | IN1    | IN2    |
|------------------|--------|--------|
| Positive / fwd   | duty   | 0      |
| Negative / rev   | 0      | duty   |
| Stop / coast     | 0      | 0      |

**Tested forward drive:** right-side motors (M1, M2) receive a negative command;
left-side motors (M3, M4) receive a positive command.

Omni-wheel speed formula (X-config):

```
s1 = (-y + x) + rot   # M1 front-right
s2 = (-y - x) + rot   # M2 back-right
s3 = ( y - x) + rot   # M3 back-left
s4 = ( y + x) + rot   # M4 front-left
```

---

## Sensor & communication wiring

### IMU — BNO055

| Signal | Pico pin | Notes                     |
|--------|----------|---------------------------|
| SDA    | GP0      | SoftI2C, address 0x28     |
| SCL    | GP1      | SoftI2C at 10 000 Hz      |
| Power  | 3V3      |                           |
| Ground | GND      | Shared rail               |

> **SoftI2C required.** Hardware I2C can scan the bus and see 0x28 but then fails register
> reads with `OSError [Errno 5] EIO` on this Pico setup. `SoftI2C(sda=Pin(0), scl=Pin(1), freq=10000)`
> is the tested working configuration. The `imu_bno055.py` helper (Module 8) handles this
> automatically — do not swap in `I2C(0, ...)` without testing on real hardware first.

### Ball sensor ring / Nextion display — UART1, 9600 baud

| Signal          | Pico pin | Direction                     |
|-----------------|----------|-------------------------------|
| TX (Pico sends) | GP8      | Pico TX GP8 → device RX       |
| RX (Pico reads) | GP9      | Pico RX GP9 ← device TX       |
| Ground          | GND      | Shared rail                   |

> **UART1 is shared.** The ball sensor ring (Modules 7 & 9) and the Nextion display both
> use UART1 at GP8/GP9. Use one OR the other per session during development.
> If both are needed simultaneously in the final robot, move the Nextion to
> **UART0 on GP16 (TX) / GP17 (RX)** — no conflicts with existing motor or IMU pins.

---

## Power and grounding

- Motor VM/battery power is **separate** from Pico logic power (VSYS/3V3).
- All grounds must share a single rail: Pico GND, each DRV8871 GND, IMU GND, connector GND.
- Do **not** connect the motor battery to Pico VSYS or 3V3 — this will damage the Pico.

---

## Development

### Prerequisites

- Node.js 24, pnpm
- PostgreSQL — set `DATABASE_URL` in your environment

### Install

```bash
pnpm install
```

### Run locally

```bash
# API server (port 5000)
pnpm --filter @workspace/api-server run dev

# Front-end dev server
pnpm --filter @workspace/omni-v2 run dev
```

### Other commands

```bash
pnpm run typecheck                         # full TypeScript check across all packages
pnpm run build                             # typecheck + build
pnpm --filter @workspace/api-spec run codegen   # regenerate hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/db run push       # push DB schema changes (dev only)
```

### Stack

- pnpm workspaces · Node.js 24 · TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v4) + drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Front-end: static Vite + plain HTML/CSS/JS (no React in production site)
