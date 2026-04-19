import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'
import path from 'path'
import fs from 'fs'
import type { Application, Stage, Slot, StageStatus } from './types'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'jobboard.db')

// 使用 globalThis 保存单例，防止 Next.js 热重载时数据库连接丢失
const globalForDb = globalThis as unknown as { __jobboard_db?: Database.Database }

function getDb() {
  if (globalForDb.__jobboard_db) return globalForDb.__jobboard_db
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      name TEXT NOT NULL,
      deadline_date TEXT,
      deadline_slot TEXT,
      planned_date TEXT,
      planned_slot TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_stages_app ON stages(application_id);
    CREATE INDEX IF NOT EXISTS idx_stages_planned ON stages(planned_date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_company ON applications(company);
  `)

  globalForDb.__jobboard_db = db
  return db
}

const now = () => new Date().toISOString()

// ── Applications ─────────────────────────────────────────────
export function createApplication(data: {
  company: string
  note?: string | null
  stages?: Array<{
    name: string
    deadline_date?: string | null
    deadline_slot?: Slot | null
    planned_date?: string | null
    planned_slot?: Slot | null
    note?: string | null
  }>
}): Application {
  const db = getDb()

  // 防重名：检查公司+岗位是否已存在
  const existing = db.prepare(`SELECT id FROM applications WHERE company = ?`).get(data.company)
  if (existing) {
    throw new Error(`已存在「${data.company}」的申请计划，不能重复创建。请换一个岗位名称或删除旧的申请后重试。`)
  }

  const id = nanoid(10)
  const ts = now()

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO applications (id, company, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, data.company, data.note ?? null, ts, ts)

    ;(data.stages ?? []).forEach((s, i) => {
      const sid = nanoid(10)
      db.prepare(
        `INSERT INTO stages (id, application_id, order_index, name, deadline_date, deadline_slot, planned_date, planned_slot, status, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      ).run(
        sid,
        id,
        i,
        s.name,
        s.deadline_date ?? null,
        s.deadline_slot ?? null,
        s.planned_date ?? null,
        s.planned_slot ?? null,
        s.note ?? null,
        ts,
        ts,
      )
    })
  })
  tx()

  return getApplication(id)!
}

export function getApplication(id: string): Application | null {
  const db = getDb()
  const app = db.prepare(`SELECT * FROM applications WHERE id = ?`).get(id) as Application | undefined
  if (!app) return null
  app.stages = db
    .prepare(`SELECT * FROM stages WHERE application_id = ? ORDER BY order_index ASC`)
    .all(id) as Stage[]
  return app
}

export function listApplications(): Application[] {
  const db = getDb()
  const apps = db.prepare(`SELECT * FROM applications ORDER BY created_at DESC`).all() as Application[]
  const stagesStmt = db.prepare(`SELECT * FROM stages WHERE application_id = ? ORDER BY order_index ASC`)
  for (const a of apps) a.stages = stagesStmt.all(a.id) as Stage[]
  return apps
}

export function deleteApplication(id: string) {
  const db = getDb()
  db.prepare(`DELETE FROM applications WHERE id = ?`).run(id)
}

export function updateApplication(id: string, patch: { company?: string; note?: string | null }) {
  const db = getDb()
  const cur = getApplication(id)
  if (!cur) return null
  db.prepare(
    `UPDATE applications SET company = ?, note = ?, updated_at = ? WHERE id = ?`,
  ).run(patch.company ?? cur.company, patch.note ?? cur.note, now(), id)
  return getApplication(id)
}

// ── Stages ───────────────────────────────────────────────────
export function updateStage(
  id: string,
  patch: Partial<{
    name: string
    deadline_date: string | null
    deadline_slot: Slot | null
    planned_date: string | null
    planned_slot: Slot | null
    status: StageStatus
    note: string | null
  }>,
) {
  const db = getDb()
  const cur = db.prepare(`SELECT * FROM stages WHERE id = ?`).get(id) as Stage | undefined
  if (!cur) return null
  const merged: Stage = { ...cur, ...patch, updated_at: now() } as Stage
  db.prepare(
    `UPDATE stages SET name=?, deadline_date=?, deadline_slot=?, planned_date=?, planned_slot=?, status=?, note=?, updated_at=? WHERE id=?`,
  ).run(
    merged.name,
    merged.deadline_date,
    merged.deadline_slot,
    merged.planned_date,
    merged.planned_slot,
    merged.status,
    merged.note,
    merged.updated_at,
    id,
  )
  return db.prepare(`SELECT * FROM stages WHERE id = ?`).get(id) as Stage
}

export function deleteStage(id: string) {
  getDb().prepare(`DELETE FROM stages WHERE id = ?`).run(id)
}

export function deleteStageCascade(id: string): { deleted_count: number } {
  const db = getDb()
  const stage = db.prepare(`SELECT * FROM stages WHERE id = ?`).get(id) as Stage | undefined
  if (!stage) return { deleted_count: 0 }
  const result = db.prepare(
    `DELETE FROM stages WHERE application_id = ? AND order_index >= ?`,
  ).run(stage.application_id, stage.order_index)
  return { deleted_count: result.changes }
}

export function getStage(id: string): Stage | null {
  return (getDb().prepare(`SELECT * FROM stages WHERE id = ?`).get(id) as Stage) || null
}

export function listStagesInRange(from: string, to: string): Stage[] {
  return getDb()
    .prepare(
      `SELECT s.*, a.company FROM stages s
       JOIN applications a ON s.application_id = a.id
       WHERE (s.planned_date BETWEEN ? AND ?) OR (s.deadline_date BETWEEN ? AND ?)
       ORDER BY s.planned_date, s.planned_slot`,
    )
    .all(from, to, from, to) as Stage[]
}

export function listStagesByApplication(applicationId: string): Stage[] {
  return getDb()
    .prepare(`SELECT * FROM stages WHERE application_id = ? ORDER BY order_index ASC`)
    .all(applicationId) as Stage[]
}
