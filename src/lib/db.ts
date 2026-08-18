import { createClient, SupabaseClient } from "@supabase/supabase-js";
import path from "node:path";
import fs from "node:fs";

// Initialize Supabase Client if env vars are present
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl!, supabaseKey!);
}

// Fallback SQLite instance for local dev if Supabase is not yet configured
let sqliteDb: any = null;
if (!isSupabaseConfigured) {
  try {
    const { DatabaseSync } = require("node:sqlite");
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "campusfind.sqlite");
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec("PRAGMA journal_mode = WAL;");
    sqliteDb.exec("PRAGMA foreign_keys = ON;");
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student', college_id TEXT NOT NULL DEFAULT 'default-college',
        is_verified INTEGER NOT NULL DEFAULT 0, is_banned INTEGER NOT NULL DEFAULT 0,
        otp_code TEXT, otp_expires INTEGER, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lost_items (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
        category TEXT NOT NULL, description TEXT NOT NULL, color TEXT, brand TEXT, model TEXT,
        identifying_features TEXT, lost_date TEXT NOT NULL, lost_time TEXT, lost_location TEXT NOT NULL,
        additional_details TEXT, estimated_value INTEGER, reward_amount INTEGER NOT NULL DEFAULT 0,
        reward_status TEXT NOT NULL DEFAULT 'no_reward', contact_preference TEXT NOT NULL DEFAULT 'platform',
        status TEXT NOT NULL DEFAULT 'active', image TEXT, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS found_items (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
        category TEXT NOT NULL, description TEXT NOT NULL, color TEXT, brand TEXT, model TEXT,
        identifying_features TEXT, found_date TEXT NOT NULL, found_time TEXT, found_location TEXT NOT NULL,
        current_location TEXT, additional_details TEXT, contact_preference TEXT NOT NULL DEFAULT 'platform',
        status TEXT NOT NULL DEFAULT 'active', image TEXT, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY, lost_item_id TEXT NOT NULL REFERENCES lost_items(id), found_item_id TEXT NOT NULL REFERENCES found_items(id),
        text_score REAL NOT NULL, category_score REAL NOT NULL, color_score REAL NOT NULL, brand_score REAL NOT NULL,
        location_score REAL NOT NULL, time_score REAL NOT NULL, overall_score REAL NOT NULL, reasons TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'possible_match', created_at INTEGER NOT NULL, UNIQUE(lost_item_id, found_item_id)
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, match_id TEXT NOT NULL REFERENCES matches(id), sender_id TEXT NOT NULL REFERENCES users(id),
        body TEXT NOT NULL, created_at INTEGER NOT NULL
      );
    `);
  } catch (err) {
    console.warn("[campusfind] SQLite fallback disabled or unavailable:", err);
  }
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// ---------------- USER OPERATIONS ----------------
export async function findUserByEmail(email: string) {
  if (supabaseClient) {
    const { data } = await supabaseClient.from("users").select("*").eq("email", email).maybeSingle();
    return data;
  }
  if (sqliteDb) {
    return sqliteDb.prepare("SELECT * FROM users WHERE email = ?").get(email);
  }
  return null;
}

export async function findUserById(id: string) {
  if (supabaseClient) {
    const { data } = await supabaseClient.from("users").select("*").eq("id", id).maybeSingle();
    return data;
  }
  if (sqliteDb) {
    return sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }
  return null;
}

export async function createOrUpdateUser({
  existingId,
  name,
  email,
  passwordHash,
  role,
  otpCode,
  otpExpires,
}: {
  existingId?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  otpCode: string;
  otpExpires: number;
}) {
  if (supabaseClient) {
    if (existingId) {
      await supabaseClient
        .from("users")
        .update({
          name,
          password_hash: passwordHash,
          otp_code: otpCode,
          otp_expires: otpExpires,
        })
        .eq("id", existingId);
      return existingId;
    } else {
      const id = newId("user");
      await supabaseClient.from("users").insert({
        id,
        name,
        email,
        password_hash: passwordHash,
        role,
        college_id: "default-college",
        is_verified: false,
        is_banned: false,
        otp_code: otpCode,
        otp_expires: otpExpires,
        created_at: Date.now(),
      });
      return id;
    }
  }
  if (sqliteDb) {
    if (existingId) {
      sqliteDb
        .prepare("UPDATE users SET name = ?, password_hash = ?, otp_code = ?, otp_expires = ? WHERE id = ?")
        .run(name, passwordHash, otpCode, otpExpires, existingId);
      return existingId;
    } else {
      const id = newId("user");
      sqliteDb
        .prepare(
          `INSERT INTO users (id, name, email, password_hash, role, college_id, is_verified, otp_code, otp_expires, created_at)
           VALUES (?, ?, ?, ?, ?, 'default-college', 0, ?, ?, ?)`
        )
        .run(id, name, email, passwordHash, role, otpCode, otpExpires, Date.now());
      return id;
    }
  }
  throw new Error("No database configured.");
}

export async function verifyUser(userId: string) {
  if (supabaseClient) {
    await supabaseClient
      .from("users")
      .update({ is_verified: true, otp_code: null, otp_expires: null })
      .eq("id", userId);
    return;
  }
  if (sqliteDb) {
    sqliteDb.prepare("UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE id = ?").run(userId);
  }
}

// ---------------- LOST ITEM OPERATIONS ----------------
export async function getLostItems(category?: string | null, location?: string | null, q?: string | null) {
  if (supabaseClient) {
    let query = supabaseClient.from("lost_items").select("*").neq("status", "cancelled");
    if (category && category !== "all") query = query.eq("category", category);
    if (location && location !== "all") query = query.eq("lost_location", location);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%`);
    const { data } = await query.order("created_at", { ascending: false });
    return data || [];
  }
  if (sqliteDb) {
    let sql = "SELECT * FROM lost_items WHERE status != 'cancelled'";
    const params: any[] = [];
    if (category && category !== "all") {
      sql += " AND category = ?";
      params.push(category);
    }
    if (location && location !== "all") {
      sql += " AND lost_location = ?";
      params.push(location);
    }
    if (q) {
      sql += " AND (title LIKE ? OR description LIKE ? OR brand LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += " ORDER BY created_at DESC";
    return sqliteDb.prepare(sql).all(...params);
  }
  return [];
}

export async function getLostItemById(id: string) {
  if (supabaseClient) {
    const { data } = await supabaseClient.from("lost_items").select("*").eq("id", id).maybeSingle();
    return data;
  }
  if (sqliteDb) {
    return sqliteDb.prepare("SELECT * FROM lost_items WHERE id = ?").get(id);
  }
  return null;
}

export async function getActiveLostItems() {
  if (supabaseClient) {
    const { data } = await supabaseClient.from("lost_items").select("*").eq("status", "active");
    return data || [];
  }
  if (sqliteDb) {
    return sqliteDb.prepare("SELECT * FROM lost_items WHERE status = 'active'").all();
  }
  return [];
}

export async function createLostItem(item: any) {
  if (supabaseClient) {
    await supabaseClient.from("lost_items").insert(item);
    return item.id;
  }
  if (sqliteDb) {
    sqliteDb
      .prepare(
        `INSERT INTO lost_items
          (id, user_id, title, category, description, color, brand, model, identifying_features,
           lost_date, lost_time, lost_location, additional_details, estimated_value,
           reward_amount, reward_status, contact_preference, status, image, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        item.id, item.user_id, item.title, item.category, item.description, item.color, item.brand, item.model,
        item.identifying_features, item.lost_date, item.lost_time, item.lost_location, item.additional_details,
        item.estimated_value, item.reward_amount, item.reward_status, item.contact_preference, item.status,
        item.image, item.created_at
      );
    return item.id;
  }
  throw new Error("No database configured.");
}

export async function updateLostItemStatus(id: string, status: string, rewardStatus?: string) {
  if (supabaseClient) {
    const payload: any = { status };
    if (rewardStatus) payload.reward_status = rewardStatus;
    await supabaseClient.from("lost_items").update(payload).eq("id", id);
    return;
  }
  if (sqliteDb) {
    if (rewardStatus) {
      sqliteDb.prepare("UPDATE lost_items SET status = ?, reward_status = ? WHERE id = ?").run(status, rewardStatus, id);
    } else {
      sqliteDb.prepare("UPDATE lost_items SET status = ? WHERE id = ?").run(status, id);
    }
  }
}

// ---------------- FOUND ITEM OPERATIONS ----------------
export async function getFoundItems(category?: string | null, location?: string | null, q?: string | null) {
  if (supabaseClient) {
    let query = supabaseClient.from("found_items").select("*").neq("status", "cancelled");
    if (category && category !== "all") query = query.eq("category", category);
    if (location && location !== "all") query = query.eq("found_location", location);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%`);
    const { data } = await query.order("created_at", { ascending: false });
    return data || [];
  }
  if (sqliteDb) {
    let sql = "SELECT * FROM found_items WHERE status != 'cancelled'";
    const params: any[] = [];
    if (category && category !== "all") {
      sql += " AND category = ?";
      params.push(category);
    }
    if (location && location !== "all") {
      sql += " AND found_location = ?";
      params.push(location);
    }
    if (q) {
      sql += " AND (title LIKE ? OR description LIKE ? OR brand LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += " ORDER BY created_at DESC";
    return sqliteDb.prepare(sql).all(...params);
  }
  return [];
}

export async function getFoundItemById(id: string) {
  if (supabaseClient) {
    const { data } = await supabaseClient.from("found_items").select("*").eq("id", id).maybeSingle();
    return data;
  }
  if (sqliteDb) {
    return sqliteDb.prepare("SELECT * FROM found_items WHERE id = ?").get(id);
  }
  return null;
}

export async function getActiveFoundItems() {
  if (supabaseClient) {
    const { data } = await supabaseClient.from("found_items").select("*").eq("status", "active");
    return data || [];
  }
  if (sqliteDb) {
    return sqliteDb.prepare("SELECT * FROM found_items WHERE status = 'active'").all();
  }
  return [];
}

export async function createFoundItem(item: any) {
  if (supabaseClient) {
    await supabaseClient.from("found_items").insert(item);
    return item.id;
  }
  if (sqliteDb) {
    sqliteDb
      .prepare(
        `INSERT INTO found_items
          (id, user_id, title, category, description, color, brand, model, identifying_features,
           found_date, found_time, found_location, current_location, additional_details,
           contact_preference, status, image, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        item.id, item.user_id, item.title, item.category, item.description, item.color, item.brand, item.model,
        item.identifying_features, item.found_date, item.found_time, item.found_location, item.current_location,
        item.additional_details, item.contact_preference, item.status, item.image, item.created_at
      );
    return item.id;
  }
  throw new Error("No database configured.");
}

export async function updateFoundItemStatus(id: string, status: string) {
  if (supabaseClient) {
    await supabaseClient.from("found_items").update({ status }).eq("id", id);
    return;
  }
  if (sqliteDb) {
    sqliteDb.prepare("UPDATE found_items SET status = ? WHERE id = ?").run(status, id);
  }
}

// ---------------- MATCH OPERATIONS ----------------
export async function createMatch(match: any) {
  if (supabaseClient) {
    await supabaseClient.from("matches").insert(match).select().maybeSingle();
    return match.id;
  }
  if (sqliteDb) {
    try {
      sqliteDb
        .prepare(
          `INSERT OR IGNORE INTO matches
            (id, lost_item_id, found_item_id, text_score, category_score, color_score, brand_score,
             location_score, time_score, overall_score, reasons, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          match.id, match.lost_item_id, match.found_item_id, match.text_score, match.category_score, match.color_score,
          match.brand_score, match.location_score, match.time_score, match.overall_score,
          typeof match.reasons === "string" ? match.reasons : JSON.stringify(match.reasons),
          match.status, match.created_at
        );
    } catch {}
    return match.id;
  }
  return null;
}

export async function getMatchesForUser(userId: string) {
  if (supabaseClient) {
    const { data: losts } = await supabaseClient.from("lost_items").select("id").eq("user_id", userId);
    const { data: founds } = await supabaseClient.from("found_items").select("id").eq("user_id", userId);
    const lostIds = (losts || []).map((l) => l.id);
    const foundIds = (founds || []).map((f) => f.id);

    if (lostIds.length === 0 && foundIds.length === 0) return [];

    let query = supabaseClient.from("matches").select("*");
    if (lostIds.length > 0 && foundIds.length > 0) {
      query = query.or(`lost_item_id.in.(${lostIds.join(",")}),found_item_id.in.(${foundIds.join(",")})`);
    } else if (lostIds.length > 0) {
      query = query.in("lost_item_id", lostIds);
    } else {
      query = query.in("found_item_id", foundIds);
    }

    const { data: matches } = await query.order("overall_score", { ascending: false });
    if (!matches || matches.length === 0) return [];

    const enriched = await Promise.all(
      matches.map(async (m) => {
        const lost = await getLostItemById(m.lost_item_id);
        const found = await getFoundItemById(m.found_item_id);
        return {
          ...m,
          lost_title: lost?.title || "",
          lost_user_id: lost?.user_id || "",
          lost_image: lost?.image || null,
          reward_amount: lost?.reward_amount || 0,
          found_title: found?.title || "",
          found_user_id: found?.user_id || "",
          found_image: found?.image || null,
        };
      })
    );
    return enriched;
  }
  if (sqliteDb) {
    return sqliteDb
      .prepare(
        `SELECT m.*,
                l.title as lost_title, l.user_id as lost_user_id, l.image as lost_image, l.reward_amount,
                f.title as found_title, f.user_id as found_user_id, f.image as found_image
         FROM matches m
         JOIN lost_items l ON l.id = m.lost_item_id
         JOIN found_items f ON f.id = m.found_item_id
         WHERE l.user_id = ? OR f.user_id = ?
         ORDER BY m.overall_score DESC`
      )
      .all(userId, userId);
  }
  return [];
}

export async function getMatchById(id: string) {
  if (supabaseClient) {
    const { data: match } = await supabaseClient.from("matches").select("*").eq("id", id).maybeSingle();
    if (!match) return null;
    const lost = await getLostItemById(match.lost_item_id);
    const found = await getFoundItemById(match.found_item_id);
    return {
      ...match,
      lost_user_id: lost?.user_id,
      found_user_id: found?.user_id,
    };
  }
  if (sqliteDb) {
    return sqliteDb
      .prepare(
        `SELECT m.*, l.user_id as lost_user_id, f.user_id as found_user_id
         FROM matches m
         JOIN lost_items l ON l.id = m.lost_item_id
         JOIN found_items f ON f.id = m.found_item_id
         WHERE m.id = ?`
      )
      .get(id);
  }
  return null;
}

export async function updateMatchStatus(id: string, status: string) {
  if (supabaseClient) {
    await supabaseClient.from("matches").update({ status }).eq("id", id);
    return;
  }
  if (sqliteDb) {
    sqliteDb.prepare("UPDATE matches SET status = ? WHERE id = ?").run(status, id);
  }
}

// ---------------- MESSAGES OPERATIONS ----------------
export async function getMessagesByMatchId(matchId: string) {
  if (supabaseClient) {
    const { data: msgs } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    if (!msgs || msgs.length === 0) return [];
    const enriched = await Promise.all(
      msgs.map(async (msg) => {
        const u = await findUserById(msg.sender_id);
        return {
          ...msg,
          sender_name: u?.name || "User",
        };
      })
    );
    return enriched;
  }
  if (sqliteDb) {
    return sqliteDb
      .prepare(
        `SELECT msg.*, u.name as sender_name FROM messages msg
         JOIN users u ON u.id = msg.sender_id
         WHERE msg.match_id = ? ORDER BY msg.created_at ASC`
      )
      .all(matchId);
  }
  return [];
}

export async function createMessage(msg: { id: string; match_id: string; sender_id: string; body: string; created_at: number }) {
  if (supabaseClient) {
    await supabaseClient.from("messages").insert(msg);
    return msg.id;
  }
  if (sqliteDb) {
    sqliteDb
      .prepare("INSERT INTO messages (id, match_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(msg.id, msg.match_id, msg.sender_id, msg.body, msg.created_at);
    return msg.id;
  }
  throw new Error("No database configured.");
}

// ---------------- MY REPORTS & DASHBOARD ----------------
export async function getMyReports(userId: string) {
  if (supabaseClient) {
    const { data: lost } = await supabaseClient.from("lost_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    const { data: found } = await supabaseClient.from("found_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    
    const lostList = lost || [];
    const foundList = found || [];

    const lostMap: Record<string, number> = {};
    for (const l of lostList) {
      const { count } = await supabaseClient.from("matches").select("id", { count: "exact", head: true }).eq("lost_item_id", l.id);
      lostMap[l.id] = count || 0;
    }

    const foundMap: Record<string, number> = {};
    for (const f of foundList) {
      const { count } = await supabaseClient.from("matches").select("id", { count: "exact", head: true }).eq("found_item_id", f.id);
      foundMap[f.id] = count || 0;
    }

    return { lost: lostList, found: foundList, lostMap, foundMap };
  }
  if (sqliteDb) {
    const lost = sqliteDb.prepare("SELECT * FROM lost_items WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    const found = sqliteDb.prepare("SELECT * FROM found_items WHERE user_id = ? ORDER BY created_at DESC").all(userId);

    const matchCounts = sqliteDb
      .prepare(
        `SELECT lost_item_id, COUNT(*) as c FROM matches WHERE lost_item_id IN (${lost.map(() => "?").join(",") || "''"}) GROUP BY lost_item_id`
      )
      .all(...lost.map((l: any) => l.id));
    const foundMatchCounts = sqliteDb
      .prepare(
        `SELECT found_item_id, COUNT(*) as c FROM matches WHERE found_item_id IN (${found.map(() => "?").join(",") || "''"}) GROUP BY found_item_id`
      )
      .all(...found.map((f: any) => f.id));

    const lostMap = Object.fromEntries(matchCounts.map((m: any) => [m.lost_item_id, m.c]));
    const foundMap = Object.fromEntries(foundMatchCounts.map((m: any) => [m.found_item_id, m.c]));

    return { lost, found, lostMap, foundMap };
  }
  return { lost: [], found: [], lostMap: {}, foundMap: {} };
}

// ---------------- ADMIN OPERATIONS ----------------
export async function getAdminStats() {
  if (supabaseClient) {
    const { count: totalLost } = await supabaseClient.from("lost_items").select("id", { count: "exact", head: true });
    const { count: totalFound } = await supabaseClient.from("found_items").select("id", { count: "exact", head: true });
    const { count: totalMatches } = await supabaseClient.from("matches").select("id", { count: "exact", head: true });
    const { count: verifiedMatches } = await supabaseClient.from("matches").select("id", { count: "exact", head: true }).eq("status", "verified_match");
    const { count: recovered } = await supabaseClient.from("lost_items").select("id", { count: "exact", head: true }).eq("status", "case_closed");
    const { count: disputed } = await supabaseClient.from("matches").select("id", { count: "exact", head: true }).eq("status", "disputed");

    const { data: lostWithRewards } = await supabaseClient.from("lost_items").select("reward_amount, reward_status");
    let rewardsOffered = 0;
    let rewardsReleased = 0;
    (lostWithRewards || []).forEach((item: any) => {
      const amt = Number(item.reward_amount || 0);
      if (amt > 0) rewardsOffered += amt;
      if (item.reward_status === "reward_released") rewardsReleased += amt;
    });

    const totLostVal = totalLost || 0;
    const recVal = recovered || 0;

    return {
      totalLost: totLostVal,
      totalFound: totalFound || 0,
      totalMatches: totalMatches || 0,
      verifiedMatches: verifiedMatches || 0,
      recovered: recVal,
      disputed: disputed || 0,
      recoveryRate: totLostVal > 0 ? Math.round((recVal / totLostVal) * 100) : 0,
      rewardsOffered,
      rewardsReleased,
      topCategories: [],
      topLocations: [],
    };
  }
  if (sqliteDb) {
    const totalLost = (sqliteDb.prepare("SELECT COUNT(*) as c FROM lost_items").get() as any).c;
    const totalFound = (sqliteDb.prepare("SELECT COUNT(*) as c FROM found_items").get() as any).c;
    const totalMatches = (sqliteDb.prepare("SELECT COUNT(*) as c FROM matches").get() as any).c;
    const verifiedMatches = (sqliteDb.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'verified_match'").get() as any).c;
    const recovered = (sqliteDb.prepare("SELECT COUNT(*) as c FROM lost_items WHERE status = 'case_closed'").get() as any).c;
    const disputed = (sqliteDb.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'disputed'").get() as any).c;
    const rewardsOffered = (sqliteDb.prepare("SELECT COALESCE(SUM(reward_amount),0) as s FROM lost_items WHERE reward_amount > 0").get() as any).s;
    const rewardsReleased = (sqliteDb.prepare("SELECT COALESCE(SUM(reward_amount),0) as s FROM lost_items WHERE reward_status = 'reward_released'").get() as any).s;
    const topCategories = sqliteDb.prepare("SELECT category, COUNT(*) as c FROM lost_items GROUP BY category ORDER BY c DESC LIMIT 5").all();
    const topLocations = sqliteDb.prepare("SELECT lost_location as location, COUNT(*) as c FROM lost_items GROUP BY lost_location ORDER BY c DESC LIMIT 5").all();

    return {
      totalLost,
      totalFound,
      totalMatches,
      verifiedMatches,
      recovered,
      disputed,
      recoveryRate: totalLost > 0 ? Math.round((recovered / totalLost) * 100) : 0,
      rewardsOffered,
      rewardsReleased,
      topCategories,
      topLocations,
    };
  }
  return { totalLost: 0, totalFound: 0, totalMatches: 0, verifiedMatches: 0, recovered: 0, disputed: 0, recoveryRate: 0, rewardsOffered: 0, rewardsReleased: 0, topCategories: [], topLocations: [] };
}

export async function getAdminReports() {
  if (supabaseClient) {
    const { data: lost } = await supabaseClient.from("lost_items").select("*").order("created_at", { ascending: false });
    const { data: found } = await supabaseClient.from("found_items").select("*").order("created_at", { ascending: false });
    const { data: disputes } = await supabaseClient.from("matches").select("*").eq("status", "disputed");

    const enrichedLost = await Promise.all(
      (lost || []).map(async (l) => {
        const u = await findUserById(l.user_id);
        return { ...l, reporter: u?.name || "User", reporter_email: u?.email || "" };
      })
    );

    const enrichedFound = await Promise.all(
      (found || []).map(async (f) => {
        const u = await findUserById(f.user_id);
        return { ...f, reporter: u?.name || "User", reporter_email: u?.email || "" };
      })
    );

    const enrichedDisputes = await Promise.all(
      (disputes || []).map(async (m) => {
        const l = await getLostItemById(m.lost_item_id);
        const f = await getFoundItemById(m.found_item_id);
        return { ...m, lost_title: l?.title || "", found_title: f?.title || "" };
      })
    );

    return { lost: enrichedLost, found: enrichedFound, disputes: enrichedDisputes };
  }
  if (sqliteDb) {
    const lost = sqliteDb.prepare("SELECT l.id, l.title, l.category, l.status, l.reward_amount, l.created_at, u.name as reporter, u.email as reporter_email FROM lost_items l JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC").all();
    const found = sqliteDb.prepare("SELECT f.id, f.title, f.category, f.status, f.created_at, u.name as reporter, u.email as reporter_email FROM found_items f JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC").all();
    const disputes = sqliteDb.prepare("SELECT m.id, m.overall_score, m.status, l.title as lost_title, f.title as found_title FROM matches m JOIN lost_items l ON l.id = m.lost_item_id JOIN found_items f ON f.id = m.found_item_id WHERE m.status = 'disputed'").all();
    return { lost, found, disputes };
  }
  return { lost: [], found: [], disputes: [] };
}

export async function updateAdminReport(itemType: "lost" | "found", id: string, action: string) {
  if (action === "remove") {
    if (itemType === "lost") await updateLostItemStatus(id, "cancelled");
    else await updateFoundItemStatus(id, "cancelled");
  } else if (action === "resolve_dispute_lost" || action === "resolve_dispute_found") {
    await updateMatchStatus(id, "verified_match");
  }
}

export async function getAdminUsers() {
  if (supabaseClient) {
    const { data: users } = await supabaseClient.from("users").select("id, name, email, role, is_verified, is_banned, created_at").order("created_at", { ascending: false });
    return (users || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isVerified: Boolean(u.is_verified),
      isBanned: Boolean(u.is_banned),
      createdAt: u.created_at,
    }));
  }
  if (sqliteDb) {
    return sqliteDb.prepare("SELECT id, name, email, role, is_verified as isVerified, is_banned as isBanned, created_at as createdAt FROM users ORDER BY created_at DESC").all();
  }
  return [];
}

export async function updateAdminUserStatus(userId: string, action: "ban" | "unban") {
  const isBanned = action === "ban";
  if (supabaseClient) {
    await supabaseClient.from("users").update({ is_banned: isBanned }).eq("id", userId);
    return;
  }
  if (sqliteDb) {
    sqliteDb.prepare("UPDATE users SET is_banned = ? WHERE id = ?").run(isBanned ? 1 : 0, userId);
  }
}
