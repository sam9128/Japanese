import { useState } from "react";

const STATUS_LABELS = {
  idle: "等待同步",
  syncing: "同步中…",
  synced: "已同步",
  offline: "離線，連線後自動同步",
  error: "同步失敗",
  unconfigured: "尚未設定",
};

export default function AuthPanel({ cloud }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!cloud.configured)
    return (
      <article className="cloud-card">
        <h3>帳號與跨裝置同步</h3>
        <p className="warning">
          網站尚未連接 Supabase。設定公開環境變數並執行{" "}
          <code>supabase/schema.sql</code> 後，即可開放登入與同步。
        </p>
      </article>
    );
  if (cloud.user)
    return (
      <article className="cloud-card">
        <h3>帳號與跨裝置同步</h3>
        <p className="account-email">{cloud.user.email}</p>
        <div className={`sync-state ${cloud.status}`}>
          <i />
          {STATUS_LABELS[cloud.status] || cloud.status}
        </div>
        {cloud.lastSyncedAt && (
          <small>
            上次同步：{new Date(cloud.lastSyncedAt).toLocaleString()}
          </small>
        )}
        {cloud.error && <p className="form-error">{cloud.error}</p>}
        <div className="cloud-actions">
          <button
            className="primary"
            disabled={cloud.status === "syncing"}
            onClick={() => cloud.syncNow()}
          >
            立即同步
          </button>
          <button
            disabled={cloud.status === "syncing"}
            onClick={() => void cloud.signOut()}
          >
            登出並清除此裝置資料
          </button>
        </div>
        <p className="privacy-note">
          學習資料只會同步到你的帳號；登出會清除此裝置的本機副本，雲端資料仍會保留。
        </p>
      </article>
    );

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (mode === "register" && password !== confirm) {
      setMessage("兩次輸入的密碼不一致。");
      return;
    }
    setBusy(true);
    try {
      const data =
        mode === "register"
          ? await cloud.signUp(email, password)
          : await cloud.signIn(email, password);
      if (mode === "register" && !data.session)
        setMessage("註冊成功，請到信箱完成驗證後再登入。");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="cloud-card">
      <h3>帳號與跨裝置同步</h3>
      <div className="auth-tabs">
        <button
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          登入
        </button>
        <button
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
        >
          註冊
        </button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          電子郵件
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          密碼
          <input
            type="password"
            minLength="6"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mode === "register" && (
          <label>
            再次輸入密碼
            <input
              type="password"
              minLength="6"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "處理中…" : mode === "register" ? "建立帳號" : "登入並同步"}
        </button>
      </form>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
      <p className="privacy-note">
        第一次登入會把這台裝置現有的學習進度合併到帳號；之後手機與電腦會自動同步。
      </p>
    </article>
  );
}
