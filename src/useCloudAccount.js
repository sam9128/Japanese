import { useCallback, useEffect, useRef, useState } from "react";
import {
  cloudConfigured,
  DATA_CHANGED_EVENT,
  signIn,
  signOutAndClear,
  signUp,
  supabase,
  syncLearningData,
} from "./cloud";

export function useCloudAccount() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!cloudConfigured);
  const [status, setStatus] = useState(
    cloudConfigured ? "idle" : "unconfigured",
  );
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const syncing = useRef(false);
  const queued = useRef(false);
  const timer = useRef();

  const syncNow = useCallback(
    async ({ force = false, reload = false } = {}) => {
      if (!supabase) return false;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user;
      if (!currentUser) return false;
      if (syncing.current) {
        queued.current = true;
        return false;
      }
      syncing.current = true;
      setStatus("syncing");
      setError("");
      try {
        const forceRequested =
          force ||
          localStorage.getItem("nihongo-stairs-force-cloud-sync") === "1";
        const result = await syncLearningData(currentUser.id, {
          force: forceRequested,
        });
        if (forceRequested)
          localStorage.removeItem("nihongo-stairs-force-cloud-sync");
        setLastSyncedAt(result.updatedAt);
        setStatus("synced");
        if (reload && result.localChanged)
          setTimeout(() => location.reload(), 80);
        return true;
      } catch (nextError) {
        setStatus(navigator.onLine ? "error" : "offline");
        setError(nextError.message);
        return false;
      } finally {
        syncing.current = false;
        if (queued.current) {
          queued.current = false;
          void syncNow();
        }
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    setStatus("syncing");
    setError("");
    try {
      await signOutAndClear();
    } catch (nextError) {
      setStatus(navigator.onLine ? "error" : "offline");
      setError(nextError.message);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user || null);
        setAuthReady(true);
        if (data.session?.user) void syncNow({ reload: true });
      })
      .catch((nextError) => {
        if (!active) return;
        setAuthReady(true);
        setStatus("error");
        setError(nextError.message);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setAuthReady(true);
      if (event === "SIGNED_IN" && session?.user)
        setTimeout(() => void syncNow({ reload: true }), 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncNow]);

  useEffect(() => {
    if (!user) return undefined;
    const changed = (event) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => void syncNow({ force: Boolean(event.detail?.forceCloud) }),
        1000,
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
  }, [syncNow, user]);

  return {
    configured: cloudConfigured,
    user,
    authReady,
    status,
    error,
    lastSyncedAt,
    syncNow,
    signIn,
    signUp,
    signOut,
  };
}
