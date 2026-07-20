const STATUS_LABELS = {
  idle: "尚未連結",
  connecting: "正在連結…",
  restoring: "正在恢復連線…",
  syncing: "同步中…",
  synced: "已同步",
  offline: "離線，連線後可再同步",
  error: "同步失敗",
  "needs-reconnect": "需要重新連結",
  unconfigured: "尚未設定",
};

export default function DriveSyncPanel({ drive }) {
  if (!drive.configured) {
    return (
      <article className="drive-card">
        <h3>Google 雲端硬碟同步</h3>
        <p className="warning">
          管理者尚未設定 Google OAuth Client ID；離線學習與 JSON
          備份仍可正常使用。
        </p>
      </article>
    );
  }

  return (
    <article className="drive-card">
      <h3>Google 雲端硬碟同步</h3>
      <div className={`sync-state ${drive.status}`}>
        <i />
        {STATUS_LABELS[drive.status] || drive.status}
      </div>
      {drive.lastSyncedAt && (
        <small>上次同步：{new Date(drive.lastSyncedAt).toLocaleString()}</small>
      )}
      {drive.error && <p className="form-error">{drive.error}</p>}
      <div className="drive-actions">
        {!drive.connected ? (
          <button
            className="primary"
            disabled={["connecting", "restoring"].includes(drive.status)}
            onClick={() => void drive.connect()}
          >
            連結 Google 雲端硬碟
          </button>
        ) : (
          <>
            <button
              className="primary"
              disabled={drive.status === "syncing"}
              onClick={() => void drive.syncNow()}
            >
              立即同步
            </button>
            <button onClick={drive.disconnect}>中斷本次連線</button>
          </>
        )}
      </div>
      <p className="privacy-note">
        僅要求 Google Drive「應用程式資料」權限；備份存放在隱藏的
        appDataFolder，網站看不到你的其他檔案，也不保存 Google 密碼或存取權杖。
      </p>
    </article>
  );
}
