import { createClient } from "@supabase/supabase-js";
import {
  clearLocalLearningData,
  DATA_CHANGED_EVENT,
  loadSnapshot,
  restoreSnapshot,
} from "./db";
import { dataOwnerTransition } from "./syncData";
import { runSnapshotSync } from "./syncEngine";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const cloudConfigured = Boolean(url && publishableKey);
export const supabase = cloudConfigured
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const OWNER_KEY = "nihongo-stairs-data-owner";
const MAX_SYNC_ATTEMPTS = 3;

function messageOf(error) {
  const known = {
    "Invalid login credentials": "電子郵件或密碼不正確。",
    "Email not confirmed": "請先到信箱完成驗證。",
    "User already registered": "這個電子郵件已註冊。",
    "Password should be at least 6 characters": "密碼至少需要 6 個字元。",
  };
  return known[error?.message] || error?.message || "雲端服務暫時無法使用。";
}

export async function prepareLocalDataForUser(userId) {
  const owner = localStorage.getItem(OWNER_KEY);
  const transition = dataOwnerTransition(owner, userId);
  if (transition.clearLocal) await clearLocalLearningData({ notify: false });
  localStorage.setItem(OWNER_KEY, transition.owner);
}

const snapshotAdapter = {
  async deleteSnapshot(userId) {
    const { error } = await supabase
      .from("learning_snapshots")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
  },
  async readSnapshot(userId) {
    const { data, error } = await supabase
      .from("learning_snapshots")
      .select("payload, revision, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          payload: data.payload,
          revision: data.revision,
          updatedAt: data.updated_at,
        }
      : null;
  },
  async writeSnapshot({ expectedRevision, payload }) {
    const { data, error } = await supabase.rpc("sync_learning_snapshot", {
      expected_revision: expectedRevision,
      new_payload: payload,
    });
    if (error) throw error;
    const outcome = Array.isArray(data) ? data[0] : data;
    return outcome
      ? {
          applied: outcome.applied,
          revision: outcome.revision,
          payload: outcome.payload,
          updatedAt: outcome.updated_at,
        }
      : null;
  },
};

export async function syncLearningData(userId, { force = false } = {}) {
  if (!supabase || !userId) throw new Error("尚未設定雲端同步服務。");
  await prepareLocalDataForUser(userId);
  return runSnapshotSync({
    adapter: snapshotAdapter,
    userId,
    loadLocal: loadSnapshot,
    saveLocal: (snapshot) => restoreSnapshot(snapshot, { notify: false }),
    force,
    maxAttempts: MAX_SYNC_ATTEMPTS,
  });
}

export async function signUp(email, password) {
  if (!supabase) throw new Error("尚未設定雲端同步服務。");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: location.href.split("#")[0] },
  });
  if (error) throw new Error(messageOf(error));
  return data;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("尚未設定雲端同步服務。");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(messageOf(error));
  return data;
}

export async function signOutAndClear() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error(messageOf(error));
  await clearLocalLearningData({ notify: false });
  location.reload();
}

export { DATA_CHANGED_EVENT };
