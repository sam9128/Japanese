import { loadSnapshot, restoreSnapshot } from "./db";
import { runDriveSnapshotSync } from "./syncEngine";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
export const googleDriveConfigured = Boolean(GOOGLE_CLIENT_ID);

const GIS_SRC = "https://accounts.google.com/gsi/client";
const FILE_PREFIX = "nihongo-stairs-sync-";
const DEVICE_KEY = "nihongo-stairs-drive-device-id";
let gisPromise;

export function getDriveDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    const script = existing || document.createElement("script");
    const loaded = () =>
      window.google?.accounts?.oauth2
        ? resolve(window.google)
        : reject(new Error("Google 授權程式載入失敗。"));
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("無法連線至 Google 授權服務。")),
      { once: true },
    );
    if (!existing) {
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  });
  return gisPromise;
}

export async function requestDriveAccessToken({ prompt = "" } = {}) {
  if (!GOOGLE_CLIENT_ID) throw new Error("尚未設定 Google OAuth Client ID。");
  const google = await loadGoogleIdentityServices();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response?.error || !response?.access_token) {
          reject(
            new Error(response?.error_description || "Google 授權未完成。"),
          );
          return;
        }
        if (
          !google.accounts.oauth2.hasGrantedAllScopes(response, DRIVE_SCOPE)
        ) {
          reject(new Error("未授權 Google Drive 應用程式資料權限。"));
          return;
        }
        resolve({
          accessToken: response.access_token,
          expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000,
        });
      },
      error_callback: (error) =>
        reject(
          new Error(
            error?.type === "popup_closed"
              ? "Google 授權視窗已關閉。"
              : "Google 授權視窗無法開啟。",
          ),
        ),
    });
    client.requestAccessToken({ prompt });
  });
}

async function driveFetch(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload?.error?.message || payload?.error_description || "";
    } catch {
      detail = await response.text().catch(() => "");
    }
    const error = new Error(
      detail || `Google Drive API 錯誤 (${response.status})`,
    );
    error.status = response.status;
    throw error;
  }
  return response;
}

async function listSnapshotFiles(token) {
  const files = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      q: `name contains '${FILE_PREFIX}' and trashed = false`,
      fields: "nextPageToken,files(id,name,modifiedTime,size)",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await driveFetch(
      token,
      `https://www.googleapis.com/drive/v3/files?${params}`,
    );
    const payload = await response.json();
    files.push(...(payload.files || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return files;
}

async function downloadSnapshot(token, file) {
  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`,
  );
  return response.json();
}

async function uploadSnapshot(token, { fileId, name, envelope }) {
  const content = JSON.stringify(envelope);
  const size = new TextEncoder().encode(content).byteLength;
  const metadata = {
    name,
    mimeType: "application/json",
    appProperties: { app: "nihongo-stairs", syncVersion: "1" },
    ...(fileId ? {} : { parents: ["appDataFolder"] }),
  };
  const endpoint = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=resumable&fields=id,name,modifiedTime`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,modifiedTime";
  const session = await driveFetch(token, endpoint, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "application/json",
      "X-Upload-Content-Length": String(size),
    },
    body: JSON.stringify(metadata),
  });
  const location = session.headers.get("Location");
  if (!location) throw new Error("Google Drive 未回傳上傳工作階段。");
  const uploaded = await driveFetch(token, location, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: content,
  });
  return uploaded.json();
}

function createDriveAdapter(token) {
  return {
    listSnapshots: () => listSnapshotFiles(token),
    downloadSnapshot: (file) => downloadSnapshot(token, file),
    async deleteSnapshots(files) {
      await Promise.all(
        files.map((file) =>
          driveFetch(
            token,
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`,
            { method: "DELETE" },
          ),
        ),
      );
    },
    upsertDeviceSnapshot({ deviceId, existingFile, envelope }) {
      return uploadSnapshot(token, {
        fileId: existingFile?.id || null,
        name: `${FILE_PREFIX}${deviceId}.json`,
        envelope,
      });
    },
  };
}

export async function syncGoogleDrive(accessToken, { force = false } = {}) {
  return runDriveSnapshotSync({
    adapter: createDriveAdapter(accessToken),
    deviceId: getDriveDeviceId(),
    loadLocal: loadSnapshot,
    saveLocal: (snapshot) => restoreSnapshot(snapshot, { notify: false }),
    force,
  });
}
