import { useCallback, useEffect, useRef, useState } from "react";
import { DATA_CHANGED_EVENT, notifyRemoteApplied } from "./db";
import {
  googleDriveConfigured,
  requestDriveAccessToken,
  syncGoogleDrive,
} from "./googleDrive";

const FORCE_KEY = "nihongo-stairs-force-drive-sync";
const DRIVE_AUTH_KEY = "nihongo-stairs-drive-auth";
const DRIVE_SESSION_KEY = "nihongo-stairs-drive-session";
const EXPIRY_BUFFER_MS = 30_000;

function readJsonStorage(storage, key) {
  try {
    return JSON.parse(storage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function readDriveAuth() {
  return readJsonStorage(localStorage, DRIVE_AUTH_KEY);
}

function readDriveSession() {
  return readJsonStorage(sessionStorage, DRIVE_SESSION_KEY);
}

function rememberDriveAuth(changes = {}) {
  const next = {
    ...readDriveAuth(),
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(DRIVE_AUTH_KEY, JSON.stringify(next));
  return next;
}

function rememberDriveSession(grant) {
  sessionStorage.setItem(
    DRIVE_SESSION_KEY,
    JSON.stringify({
      accessToken: grant.accessToken,
      expiresAt: grant.expiresAt,
      updatedAt: new Date().toISOString(),
    }),
  );
}

function forgetDriveAuth() {
  localStorage.removeItem(DRIVE_AUTH_KEY);
  sessionStorage.removeItem(DRIVE_SESSION_KEY);
}

function forgetDriveSession() {
  sessionStorage.removeItem(DRIVE_SESSION_KEY);
}

function isStoredGrantUsable(saved) {
  return Boolean(
    saved?.accessToken && Number(saved.expiresAt) > Date.now() + EXPIRY_BUFFER_MS,
  );
}

export function useGoogleDriveSync() {
  const savedAuth = readDriveAuth();
  const savedSession = readDriveSession();
  const hasSession = isStoredGrantUsable(savedSession);
  const [connected, setConnected] = useState(hasSession);
  const [status, setStatus] = useState(() => {
    if (!googleDriveConfigured) return "unconfigured";
    return hasSession ? "synced" : "idle";
  });
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(
    () => savedAuth.lastSyncedAt || "",
  );
  const token = useRef(hasSession ? savedSession.accessToken : null);
  const expiresAt = useRef(hasSession ? Number(savedSession.expiresAt) : 0);
  const syncing = useRef(false);
  const queued = useRef(false);
  const restoreAttempted = useRef(false);
  const timer = useRef();

  const markNeedsReconnect = useCallback((message) => {
    token.current = null;
    expiresAt.current = 0;
    forgetDriveSession();
    setConnected(false);
    setStatus("needs-reconnect");
    rememberDriveAuth({ enabled: true, lastSyncedAt });
    setError(message);
  }, [lastSyncedAt]);

  const syncNow = useCallback(async ({ force = false } = {}) => {
    if (!token.current || expiresAt.current <= Date.now() + EXPIRY_BUFFER_MS) {
      markNeedsReconnect("Google 登入已過期，請重新連結。");
      return false;
    }
    if (syncing.current) {
      queued.current = true;
      return false;
    }
    syncing.current = true;
    setStatus("syncing");
    setError("");
    try {
      const forceRequested = force || localStorage.getItem(FORCE_KEY) === "1";
      const result = await syncGoogleDrive(token.current, {
        force: forceRequested,
      });
      if (forceRequested) localStorage.removeItem(FORCE_KEY);
      setLastSyncedAt(result.updatedAt);
      rememberDriveAuth({ enabled: true, lastSyncedAt: result.updatedAt });
      setStatus("synced");
      if (result.localChanged) notifyRemoteApplied();
      return true;
    } catch (nextError) {
      if (nextError.status === 401) {
        markNeedsReconnect("Google 登入已過期，請重新連結。");
      } else {
        setStatus(navigator.onLine ? "error" : "offline");
        setError(nextError.message);
      }
      return false;
    } finally {
      syncing.current = false;
      if (queued.current) {
        queued.current = false;
        void syncNow();
      }
    }
  }, [markNeedsReconnect]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError("");
    try {
      const grant = await requestDriveAccessToken();
      token.current = grant.accessToken;
      expiresAt.current = grant.expiresAt;
      setConnected(true);
      rememberDriveSession(grant);
      rememberDriveAuth({ enabled: true, lastSyncedAt });
      return await syncNow();
    } catch (nextError) {
      setConnected(false);
      setStatus("error");
      setError(nextError.message);
      return false;
    }
  }, [lastSyncedAt, syncNow]);

  const disconnect = useCallback(() => {
    token.current = null;
    expiresAt.current = 0;
    setConnected(false);
    setStatus("idle");
    setError("");
    forgetDriveAuth();
  }, []);

  useEffect(() => {
    if (!googleDriveConfigured || restoreAttempted.current) return undefined;
    restoreAttempted.current = true;
    const saved = readDriveAuth();
    const session = readDriveSession();
    if (saved.lastSyncedAt) setLastSyncedAt(saved.lastSyncedAt);
    if (!saved.enabled) return undefined;

    if (isStoredGrantUsable(session)) {
      token.current = session.accessToken;
      expiresAt.current = Number(session.expiresAt);
      setConnected(true);
      setStatus("synced");
      void syncNow();
      return undefined;
    }

    let cancelled = false;
    const restore = async () => {
      setStatus("restoring");
      setError("");
      try {
        const grant = await requestDriveAccessToken({ prompt: "" });
        if (cancelled) return;
        token.current = grant.accessToken;
        expiresAt.current = grant.expiresAt;
        setConnected(true);
        rememberDriveSession(grant);
        rememberDriveAuth({
          enabled: true,
          lastSyncedAt: saved.lastSyncedAt || "",
        });
        await syncNow();
      } catch {
        if (cancelled) return;
        markNeedsReconnect(
          "已記住 Google Drive 同步設定，請點一次連結以恢復同步。",
        );
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [markNeedsReconnect, syncNow]);

  useEffect(() => {
    if (!connected) return undefined;
    const changed = (event) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => void syncNow({ force: Boolean(event.detail?.forceDrive) }),
        1500,
      );
    };
    const online = () => void syncNow();
    window.addEventListener(DATA_CHANGED_EVENT, changed);
    window.addEventListener("online", online);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener(DATA_CHANGED_EVENT, changed);
      window.removeEventListener("online", online);
    };
  }, [connected, syncNow]);

  return {
    configured: googleDriveConfigured,
    connected,
    status,
    error,
    lastSyncedAt,
    connect,
    disconnect,
    syncNow,
  };
}
