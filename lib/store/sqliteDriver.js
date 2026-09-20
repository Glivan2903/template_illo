// Driver de storage genérico (multi-tenant): cada empresa tem seu próprio
// arquivo SQLite (ver lib/tenant.js para o caminho de cada uma) e a
// plataforma (superadmin) tem o dela (lib/platform/db.js) — todas passam por
// aqui, só muda o `dbPath`. Conexões ficam em cache por caminho (better-
// sqlite3 é síncrono, então não custa manter aberto pela vida do processo).
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import Database from 'better-sqlite3';

const connections = new Map();

export function getDb(dbPath) {
  const cached = connections.get(dbPath);
  if (cached) return cached;
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  connections.set(dbPath, db);
  return db;
}

export async function readFile(dbPath, name) {
  const row = getDb(dbPath).prepare('SELECT value FROM store WHERE key = ?').get(name);
  return row ? JSON.parse(row.value) : null;
}

export async function writeFile(dbPath, name, data) {
  getDb(dbPath)
    .prepare(
      `INSERT INTO store (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(name, JSON.stringify(data), Date.now());
}

export async function saveUpload(uploadsDir, filename, buffer) {
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, filename), buffer);
}

// Usado ao excluir uma empresa: sem isso, a conexão da empresa apagada
// fica presa em cache e, se uma empresa nova reusar o mesmo slug (mesmo
// caminho de arquivo) antes de reiniciar o processo, escreveria por engano
// no arquivo antigo (já removido do disco, mas ainda aberto).
export function closeDb(dbPath) {
  const db = connections.get(dbPath);
  if (db) {
    db.close();
    connections.delete(dbPath);
  }
}
