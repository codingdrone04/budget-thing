import { db } from "./db";
import { v4 as uuidv4 } from "uuid";

export const COOKIE_NAME = "bt_session";
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export function createSession(userId: string): { id: string; expiresAt: number } {
  const id = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL;
  db.run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", [
    id,
    userId,
    expiresAt,
  ]);
  return { id, expiresAt };
}

export function getSession(sessionId: string): { userId: string } | null {
  const now = Math.floor(Date.now() / 1000);
  const row = db
    .query<{ user_id: string }, [string, number]>(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?"
    )
    .get(sessionId, now);
  return row ? { userId: row.user_id } : null;
}

export function deleteSession(sessionId: string): void {
  db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

export function findUserByUsername(
  username: string
): { id: string; password_hash: string } | null {
  return db
    .query<{ id: string; password_hash: string }, [string]>(
      "SELECT id, password_hash FROM users WHERE username = ?"
    )
    .get(username);
}

export function createUser(username: string, passwordHash: string): string {
  const id = uuidv4();
  db.run("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)", [
    id,
    username,
    passwordHash,
  ]);
  return id;
}

export function getUserById(userId: string): { username: string } | null {
  return db
    .query<{ username: string }, [string]>("SELECT username FROM users WHERE id = ?")
    .get(userId);
}
