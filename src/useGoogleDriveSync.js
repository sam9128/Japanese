import { useCallback, useEffect, useRef, useState } from "react";
import { DATA_CHANGED_EVENT, notifyRemoteApplied } from "./db";
import {
  googleDriveConfigured,
  requestDriveAccessToken,
  syncGoogleDrive,
} from "./googleDrive";

const FORCE_KEY = "nihongo-stairs-force-drive-sync";

export function useGoogleDriveSync() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(
    googleDriveConfigured ? "idle" : "unconfigured",
  );
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const token = useRef(null);
  const expiresAt = useRef(0);
  const syncing = useRef(false);
  const queued = useRef(false);
  const timer = useRef();

  const syncNow = useCallback(async ({ force = false } = {}) => {
    if (!token.current || expiresAt.current <= Date.now() + 30_000) {
      token.current = null;
      setConnected(false);
      setStatus("needs-reconnect");
      setError("Google 授權已到期，請重新連結後同步。");
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
      setStatus("synced");
      if (result.localChanged) notifyRemoteApplied();
      return true;
    } catch (nextError) {
      if (nextError.status === 401) {
        token.current = null;
        setConnected(false);
        setStatus("needs-reconnect");
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
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError("");
    try {
      const grant = await requestDriveAccessToken();
      token.current = grant.accessToken;
      expiresAt.current = grant.expiresAt;
      setConnected(true);
      return await syncNow();
    } catch (nextError) {
      setConnected(false);
      setStatus("error");
      setError(nextError.message);
      return false;
    }
  }, [syncNow]);

  const disconnect = useCallback(() => {
    token.current = null;
    expiresAt.current = 0;
    setConnected(false);
    setStatus("idle");
    setError("");
  }, []);

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
