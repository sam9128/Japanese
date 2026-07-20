import { useCallback, useEffect, useRef, useState } from "react";
import { DATA_CHANGED_EVENT, notifyRemoteApplied } from "./db";
import {
  googleDriveConfigured,
  requestDriveAccessToken,
  syncGoogleDrive,
} from "./googleDrive";

const FORCE_KEY = "nihongo-stairs-force-drive-sync";
const DRIVE_AUTH_KEY = "nihongo-stairs-drive-auth";

function readDriveAuth() {
  try {
    return JSON.parse(localStorage.getItem(DRIVE_AUTH_KEY)) || {};
  } catch {
    return {};
  }
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

function forgetDriveAuth() {
  localStorage.removeItem(DRIVE_AUTH_KEY);
}

export function useGoogleDriveSync() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(
    googleDriveConfigured ? "idle" : "unconfigured",
  );
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(
    () => readDriveAuth().lastSyncedAt || "",
  );
  const token = useRef(null);
  const expiresAt = useRef(0);
  const syncing = useRef(false);
  const queued = useRef(false);
  const restoreAttempted = useRef(false);
  const timer = useRef();

  const syncNow = useCallback(async ({ force = false } = {}) => {
    if (!token.current || expiresAt.current <= Date.now() + 30_000) {
      token.current = null;
      setConnected(false);
      setStatus("needs-reconnect");
      rememberDriveAuth({ enabled: true, lastSyncedAt });
      setError("Google 登入已過期，請重新連結。");
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
        token.current = null;
        setConnected(false);
        setStatus("needs-reconnect");
        rememberDriveAuth({ enabled: true, lastSyncedAt });
      } else {
        setStatus(navigator.onLine ? "error" : "offline");
      }
      setError(nextError.message);
      return false;
    } finally {
      syncing.current = false;
      if (queued.current) {
        queued.current = false;
        void syncNow();
      }
    }
  }, [lastSyncedAt]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError("");
    try {
      const grant = await requestDriveAccessToken();
      token.current = grant.accessToken;
      expiresAt.current = grant.expiresAt;
      setConnected(true);
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
    if (saved.lastSyncedAt) setLastSyncedAt(saved.lastSyncedAt);
    if (!saved.enabled) return undefined;
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
        rememberDriveAuth({
          enabled: true,
          lastSyncedAt: saved.lastSyncedAt || "",
        });
        await syncNow();
      } catch {
        if (cancelled) return;
        token.current = null;
        expiresAt.current = 0;
        setConnected(false);
        setStatus("needs-reconnect");
        setError("已記住 Google Drive 同步設定，請點一次連結以恢復同步。");
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [syncNow]);

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
