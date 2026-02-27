const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const BCRYPT_ROUNDS = 12;

// Database file path
// Database file path - using v2 to force fresh creation
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'japan-travel-v2.db');
const JSON_DB_PATH = path.join(process.cwd(), 'data', 'japan-travel.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

// Initialize database
async function initDatabase() {
  if (db) return db;

  // Singleton for Next.js hot reloading
  if (global.sqliteDb) {
    db = global.sqliteDb;
    return db;
  }

  try {
    db = new Database(DB_PATH);
    global.sqliteDb = db;

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        lat REAL,
        lon REAL,
        location_updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS hotels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        price_per_night REAL,
        currency TEXT,
        check_in_date TEXT,
        check_out_date TEXT,
        booking_url TEXT,
        notes TEXT,
        rating INTEGER,
        latitude REAL,
        longitude REAL,
        created_by TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT,
        latitude REAL,
        longitude REAL,
        planned_date TEXT,
        completed INTEGER DEFAULT 0,
        created_by TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')),
        created_at INTEGER NOT NULL,
        FOREIGN KEY(from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(to_user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_packing_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        item_text TEXT NOT NULL,
        is_custom INTEGER DEFAULT 0,
        is_checked INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        auth_key TEXT NOT NULL,
        p256dh_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS flights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        flight_number TEXT NOT NULL,
        departure_iata TEXT,
        arrival_iata TEXT,
        departure_time TEXT,
        arrival_time TEXT,
        airline TEXT,
        aircraft TEXT,
        terminal_out TEXT,
        gate_out TEXT,
        terminal_in TEXT,
        gate_in TEXT,
        duration TEXT,
        scheduled_status TEXT,
        type TEXT,
        last_synced_at INTEGER,
        created_by TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Check and add terminal_in / gate_in if missing
    try {
      const columns = db.pragma('table_info(flights)');
      const hasTerminalIn = columns.some(c => c.name === 'terminal_in');
      if (!hasTerminalIn) {
        db.exec('ALTER TABLE flights ADD COLUMN terminal_in TEXT;');
        db.exec('ALTER TABLE flights ADD COLUMN gate_in TEXT;');
      }
    } catch (e) {
      console.error('Error migrating flights table:', e);
    }

    // Create indexes for common queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_hotels_user_id ON hotels(user_id);
      CREATE INDEX IF NOT EXISTS idx_hotels_check_in_date ON hotels(check_in_date);
      CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_activities_planned_date ON activities(planned_date);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_invitations_from_user ON invitations(from_user_id, to_user_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
      CREATE INDEX IF NOT EXISTS idx_packing_user_id ON user_packing_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON push_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_sub_endpoint ON push_subscriptions(endpoint);
      CREATE INDEX IF NOT EXISTS idx_flights_user_id ON flights(user_id);
    `);

    // Check if migration is needed
    // Check if migration is needed. If JSON exists but users table is empty
    // OR if we suspect a bad schema (like missing columns), we can force reset.
    // For now, let's just attempt migration if empty.
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

    // Safety check: If users table exists but is empty, and we have JSON, we migrate.
    if (userCount === 0 && fs.existsSync(JSON_DB_PATH)) {
      console.log('Migrating data from JSON to SQLite...');
      migrateFromJson();
    }

    // Migrate existing usernames to lowercase
    const usersToMigrate = db.prepare('SELECT id, username FROM users WHERE username != lower(username)').all();
    if (usersToMigrate.length > 0) {
      const updateStmt = db.prepare('UPDATE users SET username = ? WHERE id = ?');
      const migrateTransaction = db.transaction(() => {
        for (const u of usersToMigrate) {
          updateStmt.run(u.username.toLowerCase(), u.id);
        }
      });
      migrateTransaction();
      console.log(`Migrated ${usersToMigrate.length} username(s) to lowercase`);
    }

    // Add planned_time column to activities if not exists
    const activityCols = db.prepare("PRAGMA table_info(activities)").all();
    if (!activityCols.find(c => c.name === 'planned_time')) {
      db.exec("ALTER TABLE activities ADD COLUMN planned_time TEXT");
      console.log('Added planned_time column to activities');
    }

    // Add check_in_time and check_out_time columns to hotels if not exists
    const hotelCols = db.prepare("PRAGMA table_info(hotels)").all();
    if (!hotelCols.find(c => c.name === 'check_in_time')) {
      db.exec("ALTER TABLE hotels ADD COLUMN check_in_time TEXT");
      console.log('Added check_in_time column to hotels');
    }
    if (!hotelCols.find(c => c.name === 'check_out_time')) {
      db.exec("ALTER TABLE hotels ADD COLUMN check_out_time TEXT");
      console.log('Added check_out_time column to hotels');
    }

    // Add email column to users if not exists
    const userCols = db.prepare("PRAGMA table_info(users)").all();
    if (!userCols.find(c => c.name === 'email')) {
      db.exec("ALTER TABLE users ADD COLUMN email TEXT");
      console.log('Added email column to users');
    }

    // Create password_reset_tokens table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for email and password reset tokens
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);
    `);

    // Notification idempotency table (Phase 3: Push Reminders)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sent_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        notification_type TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        sent_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, notification_type, reference_id)
      );
      CREATE INDEX IF NOT EXISTS idx_sent_notif_user ON sent_notifications(user_id, notification_type);
    `);

    console.log('Database initialized at:', DB_PATH);
    return db;
  } catch (err) {
    console.error('Failed to initialize SQLite database:', err);
    throw err;
  }
}

function migrateFromJson() {
  try {
    const data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));

    const insertUser = db.prepare('INSERT INTO users (id, username, password_hash, created_at, lat, lon, location_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertHotel = db.prepare('INSERT INTO hotels (id, user_id, name, address, price_per_night, currency, check_in_date, check_out_date, booking_url, notes, rating, latitude, longitude, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertActivity = db.prepare('INSERT INTO activities (id, user_id, title, description, type, latitude, longitude, planned_date, completed, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertInvitation = db.prepare('INSERT INTO invitations (id, from_user_id, to_user_id, status, created_at) VALUES (?, ?, ?, ?, ?)');

    db.transaction(() => {
      // Migrate Users
      for (const u of data.users || []) {
        insertUser.run(
          u.id,
          u.username,
          u.password_hash,
          u.created_at,
          u.location?.lat || null,
          u.location?.lng || null,
          u.location?.updated_at || null
        );
      }

      // Migrate Hotels
      for (const h of data.hotels || []) {
        insertHotel.run(
          h.id, h.user_id, h.name, h.address || null, h.price_per_night || null, h.currency || null,
          h.check_in_date || null, h.check_out_date || null, h.booking_url || null, h.notes || null,
          h.rating || null, h.latitude || null, h.longitude || null, h.created_by || 'Unknown', h.created_at || Math.floor(Date.now() / 1000)
        );
      }

      // Migrate Activities
      for (const a of data.activities || []) {
        insertActivity.run(
          a.id, a.user_id, a.title, a.description || null, a.type || 'other',
          a.latitude || null, a.longitude || null, a.planned_date || null,
          a.completed ? 1 : 0, a.created_by || 'Unknown', a.created_at || Math.floor(Date.now() / 1000)
        );
      }

      // Migrate Invitations
      for (const i of data.invitations || []) {
        insertInvitation.run(i.id, i.from_user_id, i.to_user_id, i.status, i.created_at);
      }

      // Migrate Currency Cache
      if (data.currencyCache) {
        db.prepare('INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)').run(
          'currency_rate',
          JSON.stringify(data.currencyCache),
          data.currencyCache.updated_at
        );
      }
    })();

    console.log('Migration successful. Renaming JSON file...');
    fs.renameSync(JSON_DB_PATH, JSON_DB_PATH + '.bak');
  } catch (err) {
    console.error('Migration failed:', err);
    // Don't throw, just log. We might start with empty DB.
  }
}

// Ensure Connection
function getDb() {
  if (db) return db;
  if (global.sqliteDb) {
    db = global.sqliteDb;
    return db;
  }

  // Fallback if init hasn't run (shouldn't happen in normal flow)
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  global.sqliteDb = db;
  return db;
}

// --- User Functions ---

function createUser(username, password, email = null) {
  const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const stmt = getDb().prepare('INSERT INTO users (username, password_hash, email, created_at) VALUES (?, ?, ?, ?)');
  const info = stmt.run(username, hashedPassword, email, Math.floor(Date.now() / 1000));
  return { id: info.lastInsertRowid, username, email, created_at: Math.floor(Date.now() / 1000) };
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// Re-hash password if the current hash uses fewer rounds than BCRYPT_ROUNDS
function upgradePasswordHash(userId, password) {
  const newHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
}

// Check if a hash needs upgrading (fewer rounds than current target)
function needsHashUpgrade(hash) {
  try {
    const rounds = bcrypt.getRounds(hash);
    return rounds < BCRYPT_ROUNDS;
  } catch {
    return false;
  }
}

function getUserByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
}

function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}


// --- Session Functions ---

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const stmt = getDb().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)');
  stmt.run(token, userId, expiresAt);
  return { token, user_id: userId, expires_at: expiresAt };
}

function getSession(token) {
  const session = getDb().prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session) return null;

  if (session.expires_at < Math.floor(Date.now() / 1000)) {
    deleteSession(token);
    return null;
  }
  return session;
}

function deleteSession(token) {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/**
 * Delete all sessions for a specific user (prevents session fixation)
 */
function deleteUserSessions(userId) {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/**
 * Clean up all expired sessions from the database
 * Prevents the sessions table from growing unbounded
 */
function cleanupExpiredSessions() {
  const now = Math.floor(Date.now() / 1000);
  const result = getDb().prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  if (result.changes > 0) {
    console.log(`Cleaned up ${result.changes} expired sessions`);
  }
}

// Run session cleanup and password reset token cleanup every 6 hours
setInterval(() => {
  cleanupExpiredSessions();
  cleanupExpiredResetTokens();
}, 6 * 60 * 60 * 1000);

// --- Invitation Functions ---

function getSharedUserIds(userId) {
  const rows = getDb().prepare(`
    SELECT from_user_id, to_user_id 
    FROM invitations
    WHERE(from_user_id = ? OR to_user_id = ?) AND status = 'accepted'
      `).all(userId, userId);

  const sharedIds = new Set();
  rows.forEach(inv => {
    if (inv.from_user_id === userId) sharedIds.add(inv.to_user_id);
    else sharedIds.add(inv.from_user_id);
  });
  return Array.from(sharedIds);
}

function createInvitation(fromUserId, toUsername) {
  const toUser = getUserByUsername(toUsername);
  if (!toUser) throw new Error('Benutzer nicht gefunden');
  if (toUser.id === fromUserId) throw new Error('Du kannst dich nicht selbst einladen');

  const existing = getDb().prepare(`
    SELECT * FROM invitations
    WHERE(from_user_id = ? AND to_user_id = ?)
    OR(from_user_id = ? AND to_user_id = ?)
      `).get(fromUserId, toUser.id, toUser.id, fromUserId);

  if (existing) {
    if (existing.status === 'accepted') throw new Error('Bereits geteilt');
    if (existing.status === 'pending') throw new Error('Einladung bereits versendet');
    if (existing.status === 'rejected') {
      getDb().prepare('DELETE FROM invitations WHERE id = ?').run(existing.id);
    }
  }

  const stmt = getDb().prepare('INSERT INTO invitations (from_user_id, to_user_id, status, created_at) VALUES (?, ?, ?, ?)');
  const info = stmt.run(fromUserId, toUser.id, 'pending', Math.floor(Date.now() / 1000));

  return {
    id: info.lastInsertRowid,
    from_user_id: fromUserId,
    to_user_id: toUser.id,
    status: 'pending',
    created_at: Math.floor(Date.now() / 1000)
  };
}

function getInvitations(userId) {
  const db = getDb();

  const pending = db.prepare(`
    SELECT i.*, u.username as other_username 
    FROM invitations i 
    JOIN users u ON i.from_user_id = u.id
    WHERE i.to_user_id = ? AND i.status = 'pending'
      `).all(userId);

  const outgoing = db.prepare(`
    SELECT i.*, u.username as other_username 
    FROM invitations i 
    JOIN users u ON i.to_user_id = u.id
    WHERE i.from_user_id = ? AND i.status = 'pending'
      `).all(userId);

  // For shared, we need union of incoming/outgoing accepted
  const shared = db.prepare(`
    SELECT i.*,
      CASE WHEN i.from_user_id = ? THEN u2.username ELSE u1.username END as other_username,
        CASE WHEN i.from_user_id = ? THEN u2.id ELSE u1.id END as other_user_id
    FROM invitations i 
    JOIN users u1 ON i.from_user_id = u1.id
    JOIN users u2 ON i.to_user_id = u2.id
    WHERE(i.from_user_id = ? OR i.to_user_id = ?) AND i.status = 'accepted'
      `).all(userId, userId, userId, userId);

  return { pending, outgoing, shared };
}

function updateInvitationStatus(id, userId, status) {
  const invite = getDb().prepare('SELECT * FROM invitations WHERE id = ?').get(id);
  if (!invite) throw new Error('Einladung nicht gefunden');
  if (invite.to_user_id !== userId) throw new Error('Nicht autorisiert');

  getDb().prepare('UPDATE invitations SET status = ? WHERE id = ?').run(status, id);
  return getDb().prepare('SELECT * FROM invitations WHERE id = ?').get(id);
}

function deleteInvitation(id, userId) {
  const invite = getDb().prepare('SELECT * FROM invitations WHERE id = ?').get(id);
  if (!invite) throw new Error('Einladung nicht gefunden');
  if (invite.from_user_id !== userId && invite.to_user_id !== userId) throw new Error('Nicht autorisiert');
  getDb().prepare('DELETE FROM invitations WHERE id = ?').run(id);
  return invite;
}

// --- Hotel Functions ---

function getHotels(userId) {
  if (!userId) return [];
  const sharedIds = getSharedUserIds(userId);
  const allowedIds = [userId, ...sharedIds];

  // Create placeholders for IN clause
  const placeholders = allowedIds.map(() => '?').join(',');

  return getDb().prepare(`
    SELECT h.*, u.username as created_by 
    FROM hotels h 
    LEFT JOIN users u ON h.user_id = u.id
    WHERE h.user_id IN(${placeholders})
    ORDER BY h.check_in_date ASC
      `).all(...allowedIds);
}

function getAllHotels() {
  return getDb().prepare('SELECT * FROM hotels ORDER BY check_in_date ASC').all();
}

function getHotelById(id) {
  return getDb().prepare('SELECT * FROM hotels WHERE id = ?').get(id);
}

function createHotel(userId, hotelData, username) {
  const stmt = getDb().prepare(`
    INSERT INTO hotels(
        user_id, name, address, price_per_night, currency, check_in_date, check_out_date,
        check_in_time, check_out_time,
        booking_url, notes, rating, latitude, longitude, created_by, created_at
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    userId, hotelData.name, hotelData.address, hotelData.price_per_night, hotelData.currency,
    hotelData.check_in_date, hotelData.check_out_date,
    hotelData.check_in_time || null, hotelData.check_out_time || null,
    hotelData.booking_url, hotelData.notes,
    hotelData.rating, hotelData.latitude, hotelData.longitude, username, Math.floor(Date.now() / 1000)
  );

  return getHotelById(info.lastInsertRowid);
}

function updateHotel(id, hotelData, userId) {
  const hotel = getHotelById(id);
  if (!hotel) return null;

  // Check if user owns hotel or has shared access
  const sharedIds = getSharedUserIds(userId);
  const allowedIds = [userId, ...sharedIds];

  if (!allowedIds.includes(hotel.user_id)) {
    throw new Error('Nicht autorisiert');
  }

  const fields = ['name', 'address', 'price_per_night', 'currency', 'check_in_date', 'check_out_date', 'check_in_time', 'check_out_time', 'booking_url', 'notes', 'rating', 'latitude', 'longitude'];
  const sets = [];
  const values = [];

  for (const field of fields) {
    if (hotelData[field] !== undefined) {
      sets.push(`${field} = ?`);
      values.push(hotelData[field]);
    }
  }

  if (sets.length === 0) return hotel;

  values.push(id);
  getDb().prepare(`UPDATE hotels SET ${sets.join(', ')} WHERE id = ? `).run(...values);
  return getHotelById(id);
}

function deleteHotel(id, userId) {
  const hotel = getHotelById(id);
  if (!hotel) return;

  // Check if user owns hotel or has shared access
  const sharedIds = getSharedUserIds(userId);
  const allowedIds = [userId, ...sharedIds];

  if (!allowedIds.includes(hotel.user_id)) {
    throw new Error('Nicht autorisiert');
  }

  getDb().prepare('DELETE FROM hotels WHERE id = ?').run(id);
}

// --- Activity Functions ---

function getActivities(userId) {
  if (!userId) return [];
  const sharedIds = getSharedUserIds(userId);
  const allowedIds = [userId, ...sharedIds];
  const placeholders = allowedIds.map(() => '?').join(',');

  return getDb().prepare(`
    SELECT a.*, u.username as created_by
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.user_id IN(${placeholders})
    ORDER BY a.planned_date ASC
      `).all(...allowedIds).map(a => ({
    ...a,
    completed: Boolean(a.completed) // Convert INTEGER 1/0 to boolean
  }));
}

function getAllActivities() {
  return getDb().prepare('SELECT * FROM activities ORDER BY planned_date ASC').all()
    .map(a => ({ ...a, completed: Boolean(a.completed) }));
}

function getActivityById(id) {
  const act = getDb().prepare('SELECT * FROM activities WHERE id = ?').get(id);
  if (act) act.completed = Boolean(act.completed);
  return act;
}

function createActivity(userId, activityData, username) {
  const stmt = getDb().prepare(`
    INSERT INTO activities(
        user_id, title, description, type, latitude, longitude, planned_date, planned_time, completed, created_by, created_at
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    userId, activityData.title, activityData.description, activityData.type,
    activityData.latitude, activityData.longitude, activityData.planned_date,
    activityData.planned_time || null,
    activityData.completed ? 1 : 0, username, Math.floor(Date.now() / 1000)
  );

  return getActivityById(info.lastInsertRowid);
}

function updateActivity(id, activityData, userId) {
  const activity = getActivityById(id);
  if (!activity) return null;

  // Check if user owns activity or has shared access
  const sharedIds = getSharedUserIds(userId);
  const allowedIds = [userId, ...sharedIds];

  if (!allowedIds.includes(activity.user_id)) {
    throw new Error('Nicht autorisiert');
  }

  const fields = ['title', 'description', 'type', 'latitude', 'longitude', 'planned_date', 'planned_time', 'completed'];
  const sets = [];
  const values = [];

  for (const field of fields) {
    if (activityData[field] !== undefined) {
      sets.push(`${field} = ?`);
      if (field === 'completed') {
        values.push(activityData[field] ? 1 : 0);
      } else {
        values.push(activityData[field]);
      }
    }
  }

  if (sets.length === 0) return activity;

  values.push(id);
  getDb().prepare(`UPDATE activities SET ${sets.join(', ')} WHERE id = ? `).run(...values);
  return getActivityById(id);
}

function deleteActivity(id, userId) {
  const activity = getActivityById(id);
  if (!activity) return;

  // Check if user owns activity or has shared access
  const sharedIds = getSharedUserIds(userId);
  const allowedIds = [userId, ...sharedIds];

  if (!allowedIds.includes(activity.user_id)) {
    throw new Error('Nicht autorisiert');
  }

  getDb().prepare('DELETE FROM activities WHERE id = ?').run(id);
}

// --- Currency Cache ---

function getCachedRate() {
  const row = getDb().prepare('SELECT value, updated_at FROM kv_store WHERE key = ?').get('currency_rate');
  if (row) {
    const data = JSON.parse(row.value);
    // ensure updated_at is respected from db row if not in json
    if (!data.updated_at) data.updated_at = row.updated_at;
    return data;
  }
  return null;
}

function setCachedRate(rate) {
  const data = {
    rate,
    base_currency: 'EUR',
    target_currency: 'JPY',
    updated_at: Math.floor(Date.now() / 1000),
  };

  getDb().prepare(`
    INSERT INTO kv_store(key, value, updated_at) VALUES(?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run('currency_rate', JSON.stringify(data), data.updated_at);
}

// --- Packing List Functions ---

function getPackingItems(userId) {
  return getDb().prepare('SELECT * FROM user_packing_items WHERE user_id = ? ORDER BY category, id').all(userId);
}

function togglePackingItem(userId, category, itemText) {
  const existing = getDb().prepare(
    'SELECT * FROM user_packing_items WHERE user_id = ? AND category = ? AND item_text = ?'
  ).get(userId, category, itemText);

  if (existing) {
    getDb().prepare('UPDATE user_packing_items SET is_checked = ? WHERE id = ?')
      .run(existing.is_checked ? 0 : 1, existing.id);
    return { ...existing, is_checked: existing.is_checked ? 0 : 1 };
  }

  // First toggle — create entry as checked
  const info = getDb().prepare(
    'INSERT INTO user_packing_items (user_id, category, item_text, is_custom, is_checked, created_at) VALUES (?, ?, ?, 0, 1, ?)'
  ).run(userId, category, itemText, Math.floor(Date.now() / 1000));
  return { id: info.lastInsertRowid, user_id: userId, category, item_text: itemText, is_custom: 0, is_checked: 1 };
}

function addCustomPackingItem(userId, category, itemText) {
  const info = getDb().prepare(
    'INSERT INTO user_packing_items (user_id, category, item_text, is_custom, is_checked, created_at) VALUES (?, ?, ?, 1, 0, ?)'
  ).run(userId, category, itemText, Math.floor(Date.now() / 1000));
  return { id: info.lastInsertRowid, user_id: userId, category, item_text: itemText, is_custom: 1, is_checked: 0 };
}

function deletePackingItem(id, userId) {
  const item = getDb().prepare('SELECT * FROM user_packing_items WHERE id = ? AND user_id = ?').get(id, userId);
  if (!item) throw new Error('Nicht gefunden');
  if (!item.is_custom) throw new Error('Standard-Einträge können nicht gelöscht werden');
  getDb().prepare('DELETE FROM user_packing_items WHERE id = ?').run(id);
}

function resetPackingChecks(userId) {
  getDb().prepare('UPDATE user_packing_items SET is_checked = 0 WHERE user_id = ? AND is_custom = 0').run(userId);
  // Also uncheck custom items
  getDb().prepare('UPDATE user_packing_items SET is_checked = 0 WHERE user_id = ? AND is_custom = 1').run(userId);
}

function getPackingItemsForUsers(userIds) {
  if (!userIds || userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  return getDb().prepare(
    `SELECT upi.*, u.username FROM user_packing_items upi
     JOIN users u ON u.id = upi.user_id
     WHERE upi.user_id IN(${placeholders}) AND upi.is_checked = 1
     ORDER BY upi.category, upi.id`
  ).all(...userIds);
}

// --- Flight Functions ---

function getFlights(userId) {
  if (!userId) return [];
  const sharedIds = getSharedUserIds(userId);
  const allowedIds = [userId, ...sharedIds];
  const placeholders = allowedIds.map(() => '?').join(',');

  return getDb().prepare(`
    SELECT f.*, u.username as created_by
    FROM flights f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.user_id IN(${placeholders})
    ORDER BY f.departure_time ASC
      `).all(...allowedIds);
}

function getFlightById(id) {
  return getDb().prepare('SELECT * FROM flights WHERE id = ?').get(id);
}

function createFlight(userId, flightData, username) {
  const stmt = getDb().prepare(`
    INSERT INTO flights(
        user_id, flight_number, departure_iata, arrival_iata, departure_time, arrival_time,
        airline, aircraft, terminal_out, gate_out, terminal_in, gate_in, duration, scheduled_status, type, last_synced_at, created_by, created_at
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    userId, flightData.flight_number, flightData.departure_iata, flightData.arrival_iata, flightData.departure_time, flightData.arrival_time,
    flightData.airline, flightData.aircraft, flightData.terminal_out, flightData.gate_out, flightData.terminal_in, flightData.gate_in, flightData.duration, flightData.scheduled_status, flightData.type || 'outbound',
    flightData.last_synced_at || Math.floor(Date.now() / 1000), username, Math.floor(Date.now() / 1000)
  );

  return getFlightById(info.lastInsertRowid);
}

function updateFlight(id, flightData, userId) {
  const flight = getFlightById(id);
  if (!flight) return null;

  const sharedIds = getSharedUserIds(userId);
  const allowedIds = [userId, ...sharedIds];

  if (!allowedIds.includes(flight.user_id)) {
    throw new Error('Nicht autorisiert');
  }

  const fields = ['flight_number', 'departure_iata', 'arrival_iata', 'departure_time', 'arrival_time', 'airline', 'aircraft', 'terminal_out', 'gate_out', 'terminal_in', 'gate_in', 'duration', 'scheduled_status', 'type', 'last_synced_at'];
  const sets = [];
  const values = [];

  for (const field of fields) {
    if (flightData[field] !== undefined) {
      sets.push(`${field} = ?`);
      values.push(flightData[field]);
    }
  }

  if (sets.length === 0) return flight;

  values.push(id);
  getDb().prepare(`UPDATE flights SET ${sets.join(', ')} WHERE id = ? `).run(...values);
  return getFlightById(id);
}

function deleteFlight(id, userId) {
  const flight = getFlightById(id);
  if (!flight) return;

  const sharedIds = getSharedUserIds(userId);
  const allowedIds = [userId, ...sharedIds];

  if (!allowedIds.includes(flight.user_id)) {
    throw new Error('Nicht autorisiert');
  }

  getDb().prepare('DELETE FROM flights WHERE id = ?').run(id);
}

// --- Push Subscription Functions ---

function savePushSubscription(userId, subscription) {
  getDb().prepare(`
    INSERT INTO push_subscriptions(user_id, endpoint, auth_key, p256dh_key, created_at)
    VALUES(?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, auth_key = excluded.auth_key, p256dh_key = excluded.p256dh_key
      `).run(userId, subscription.endpoint, subscription.keys.auth, subscription.keys.p256dh, Math.floor(Date.now() / 1000));
}

function getPushSubscriptions(userId) {
  return getDb().prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
}

function deletePushSubscription(endpoint) {
  getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

function getPushSubscriptionsForUsers(userIds) {
  if (!userIds || userIds.length === 0) return [];
  // Prevent DoS via massive userIds array (max 100 user IDs)
  if (userIds.length > 100) {
    console.warn(`getPushSubscriptionsForUsers called with ${userIds.length} IDs, truncating to 100`);
    userIds = userIds.slice(0, 100);
  }
  const placeholders = userIds.map(() => '?').join(',');
  return getDb().prepare(`SELECT * FROM push_subscriptions WHERE user_id IN(${placeholders})`).all(...userIds);
}

// --- Email Functions ---

function getUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
}

function updateUserEmail(userId, email) {
  getDb().prepare('UPDATE users SET email = ? WHERE id = ?').run(email, userId);
}

// --- Password Reset Functions ---

function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
  const now = Math.floor(Date.now() / 1000);

  // Delete any existing tokens for this user (single active token policy)
  getDb().prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(userId);

  getDb().prepare(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(userId, tokenHash, expiresAt, now);

  return token; // Return the PLAIN token (sent via email), NOT the hash
}

function verifyPasswordResetToken(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const now = Math.floor(Date.now() / 1000);

  const row = getDb().prepare(
    'SELECT * FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?'
  ).get(tokenHash, now);

  return row || null;
}

function deletePasswordResetToken(id) {
  getDb().prepare('DELETE FROM password_reset_tokens WHERE id = ?').run(id);
}

function cleanupExpiredResetTokens() {
  const now = Math.floor(Date.now() / 1000);
  const result = getDb().prepare('DELETE FROM password_reset_tokens WHERE expires_at < ?').run(now);
  if (result.changes > 0) {
    console.log(`Cleaned up ${result.changes} expired password reset tokens`);
  }
}

function updateUserPassword(userId, newPassword) {
  const hashedPassword = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, userId);
}

function deleteOtherUserSessions(userId, currentToken) {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(userId, currentToken);
}

// --- User Deletion (Account Closure) ---

/**
 * Completely deletes a user and all their associated data from the database.
 * Returns the list of friend IDs so the API can notify them.
 */
function deleteUserAccount(userId) {
  // First, gather all friends to return them (incoming + outgoing accepted)
  const friendIds = getSharedUserIds(userId);

  // Use a transaction for consistent deletion
  const transaction = getDb().transaction(() => {
    // Manually delete dependent records to be 100% safe if foreign_keys are disabled
    getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    getDb().prepare('DELETE FROM hotels WHERE user_id = ?').run(userId);
    getDb().prepare('DELETE FROM activities WHERE user_id = ?').run(userId);
    getDb().prepare('DELETE FROM invitations WHERE from_user_id = ? OR to_user_id = ?').run(userId, userId);
    getDb().prepare('DELETE FROM user_packing_items WHERE user_id = ?').run(userId);
    getDb().prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId);
    getDb().prepare('DELETE FROM flights WHERE user_id = ?').run(userId);
    getDb().prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(userId);

    // Finally, delete the user itself
    getDb().prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  transaction();

  return friendIds;
}

// --- Notification Scheduling Functions ---

function hasNotificationBeenSent(userId, type, refId) {
  const row = getDb().prepare(
    'SELECT 1 FROM sent_notifications WHERE user_id = ? AND notification_type = ? AND reference_id = ?'
  ).get(userId, type, refId);
  return !!row;
}

function markNotificationSent(userId, type, refId) {
  getDb().prepare(
    'INSERT OR IGNORE INTO sent_notifications (user_id, notification_type, reference_id) VALUES (?, ?, ?)'
  ).run(userId, type, refId);
}

function cleanupOldNotifications(daysOld = 30) {
  const result = getDb().prepare(
    `DELETE FROM sent_notifications WHERE sent_at < datetime('now', '-' || ? || ' days')`
  ).run(daysOld);
  if (result.changes > 0) {
    console.log(`Cleaned up ${result.changes} old notification records`);
  }
}

function getUpcomingFlights(daysAhead = 1) {
  // Get flights departing within the next N days for all users
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const nowISO = now.toISOString();
  const futureISO = future.toISOString();
  return getDb().prepare(`
    SELECT f.*, u.username FROM flights f
    JOIN users u ON u.id = f.user_id
    WHERE f.departure_time >= ? AND f.departure_time <= ?
    ORDER BY f.departure_time ASC
  `).all(nowISO, futureISO);
}

function getUpcomingHotelCheckins(daysAhead = 0) {
  // Get hotels with check_in_date today or within N days
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return getDb().prepare(`
    SELECT h.*, u.username FROM hotels h
    JOIN users u ON u.id = h.user_id
    WHERE h.check_in_date >= ? AND h.check_in_date <= ?
    ORDER BY h.check_in_date ASC
  `).all(today, future);
}

function getUpcomingActivities(minutesAhead = 60) {
  // Get activities with planned_date today and planned_time within N minutes
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = nowMinutes + minutesAhead;
  const targetHour = String(Math.floor(targetMinutes / 60)).padStart(2, '0');
  const targetMin = String(targetMinutes % 60).padStart(2, '0');
  const targetTime = `${targetHour}:${targetMin}`;
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return getDb().prepare(`
    SELECT a.*, u.username FROM activities a
    JOIN users u ON u.id = a.user_id
    WHERE a.planned_date = ? AND a.planned_time IS NOT NULL
    AND a.planned_time >= ? AND a.planned_time <= ?
    AND a.completed = 0
    ORDER BY a.planned_time ASC
  `).all(today, nowTime, targetTime);
}

function getAllUsersPackingProgress() {
  // Get packing progress for all users as { userId, checked, total }
  const PACKING_CATEGORIES = require('./packingList');
  let totalDefault = 0;
  Object.values(PACKING_CATEGORIES).forEach(cat => {
    totalDefault += cat.items.length;
  });

  const rows = getDb().prepare(`
    SELECT user_id, COUNT(*) as checked FROM user_packing_items
    WHERE is_checked = 1
    GROUP BY user_id
  `).all();

  // Also count custom items per user
  const customCounts = getDb().prepare(`
    SELECT user_id, COUNT(*) as custom_total FROM user_packing_items
    WHERE is_custom = 1
    GROUP BY user_id
  `).all();

  const customMap = {};
  customCounts.forEach(r => { customMap[r.user_id] = r.custom_total; });

  return rows.map(r => ({
    userId: r.user_id,
    checked: r.checked,
    total: totalDefault + (customMap[r.user_id] || 0),
    percent: Math.round((r.checked / (totalDefault + (customMap[r.user_id] || 0))) * 100),
  }));
}

function getAllUsers() {
  return getDb().prepare('SELECT id, username FROM users').all();
}

module.exports = {
  initDatabase,
  // loadDatabase, saveDatabase - REMOVED
  // User
  createUser,
  verifyPassword,
  upgradePasswordHash,
  needsHashUpgrade,
  getUserByUsername,
  getUserById,
  getUserByEmail,
  updateUserEmail,

  // Session
  createSession,
  getSession,
  deleteSession,
  deleteUserSessions,
  deleteOtherUserSessions,
  // Password Reset
  createPasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken,
  cleanupExpiredResetTokens,
  updateUserPassword,
  // Invitation
  createInvitation,
  getInvitations,
  updateInvitationStatus,
  deleteInvitation,
  getSharedUserIds,
  // Hotel
  getHotels,
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  // Activity
  getActivities,
  getAllActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  // Flight
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  // Currency
  getCachedRate,
  setCachedRate,
  // Packing List
  getPackingItems,
  togglePackingItem,
  addCustomPackingItem,
  deletePackingItem,
  resetPackingChecks,
  getPackingItemsForUsers,
  // Push Subscriptions
  savePushSubscription,
  getPushSubscriptions,
  deletePushSubscription,
  getPushSubscriptionsForUsers,
  // Account Deletion
  deleteUserAccount,
  // Notification Scheduling
  hasNotificationBeenSent,
  markNotificationSent,
  cleanupOldNotifications,
  getUpcomingFlights,
  getUpcomingHotelCheckins,
  getUpcomingActivities,
  getAllUsersPackingProgress,
  getAllUsers,
};
