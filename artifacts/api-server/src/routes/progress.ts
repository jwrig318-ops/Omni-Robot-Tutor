import { Router, type IRouter, type Request, type Response } from "express";
import { db, moduleProgressTable } from "@workspace/db";
import { SaveProgressBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const SESSION_COOKIE = "omni_session";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;

function getOrCreateSession(req: Request, res: Response): string {
  const existing = req.cookies[SESSION_COOKIE] as string | undefined;
  if (existing) return existing;
  const sessionId = randomUUID();
  res.cookie(SESSION_COOKIE, sessionId, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return sessionId;
}

router.get("/progress", async (req, res) => {
  const sessionId = getOrCreateSession(req, res);
  const rows = await db
    .select()
    .from(moduleProgressTable)
    .where(eq(moduleProgressTable.sessionId, sessionId));
  if (rows.length === 0) {
    res.json({ modules: {}, updatedAt: null });
    return;
  }
  const row = rows[0];
  res.json({
    modules: row.modules as Record<string, boolean>,
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.post("/progress", async (req, res) => {
  const sessionId = getOrCreateSession(req, res);
  const parsed = SaveProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  const { modules } = parsed.data;
  const now = new Date();
  const rows = await db
    .insert(moduleProgressTable)
    .values({ sessionId, modules, updatedAt: now })
    .onConflictDoUpdate({
      target: moduleProgressTable.sessionId,
      set: { modules, updatedAt: now },
    })
    .returning();
  const saved = rows[0];
  res.json({
    modules: saved.modules as Record<string, boolean>,
    updatedAt: saved.updatedAt.toISOString(),
  });
});

export default router;
