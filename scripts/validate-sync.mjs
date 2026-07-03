import assert from "node:assert/strict";
import {
  mergeSnapshots,
  normalizeSnapshot,
  snapshotsEqual,
} from "../src/syncData.js";
import {
  DRIVE_SYNC_VERSION,
  isDriveEnvelope,
  runDriveSnapshotSync,
} from "../src/syncEngine.js";

const local = normalizeSnapshot({
  cardProgress: [
    { id: "a", rating: "good", updatedAt: "2026-07-03T10:00:00Z" },
  ],
  studyEvents: [{ id: "local-event", occurredAt: "2026-07-03T10:00:00Z" }],
  settings: [
    { id: "tts", value: { rate: 0.85, updatedAt: "2026-07-03T10:00:00Z" } },
  ],
});
const mobile = normalizeSnapshot({
  cardProgress: [
    { id: "a", rating: "hard", updatedAt: "2026-07-03T09:00:00Z" },
    { id: "b", rating: "easy", updatedAt: "2026-07-03T09:00:00Z" },
  ],
  studyEvents: [{ id: "mobile-event", occurredAt: "2026-07-03T09:00:00Z" }],
  settings: [
    { id: "tts", value: { rate: 1, updatedAt: "2026-07-03T11:00:00Z" } },
  ],
});
const merged = mergeSnapshots(local, mobile);

assert.equal(merged.cardProgress.length, 2, "不同裝置的卡片進度必須保留");
assert.equal(
  merged.cardProgress.find((item) => item.id === "a").rating,
  "good",
  "同一卡片採用較新的操作",
);
assert.equal(merged.studyEvents.length, 2, "兩台裝置的學習事件不得遺失");
assert.equal(
  merged.settings.find((item) => item.id === "tts").value.rate,
  1,
  "巢狀設定採用較新的時間戳",
);
assert.equal(
  snapshotsEqual(merged, normalizeSnapshot(merged)),
  true,
  "正規化後內容應穩定",
);

function envelope(deviceId, snapshot, updatedAt) {
  return { syncVersion: DRIVE_SYNC_VERSION, deviceId, updatedAt, snapshot };
}

function fakeDrive(initialFiles) {
  let sequence = initialFiles.length + 1;
  const files = initialFiles.map((file) => structuredClone(file));
  let uploads = 0;
  let deletes = 0;
  return {
    adapter: {
      async listSnapshots() {
        return files.map(({ envelope: _ignored, ...file }) =>
          structuredClone(file),
        );
      },
      async downloadSnapshot(file) {
        const found = files.find((item) => item.id === file.id);
        if (found?.corrupted) throw new Error("Malformed JSON");
        return structuredClone(found?.envelope);
      },
      async deleteSnapshots(targets) {
        for (const target of targets) {
          const index = files.findIndex((item) => item.id === target.id);
          if (index >= 0) files.splice(index, 1);
        }
        deletes += targets.length;
      },
      async upsertDeviceSnapshot({ deviceId, existingFile, envelope: next }) {
        uploads += 1;
        const found = files.find((item) => item.id === existingFile?.id);
        if (found) {
          found.envelope = structuredClone(next);
          found.modifiedTime = next.updatedAt;
          return;
        }
        files.push({
          id: `file-${sequence++}`,
          name: `nihongo-stairs-sync-${deviceId}.json`,
          modifiedTime: next.updatedAt,
          envelope: structuredClone(next),
        });
      },
    },
    state: () => ({ files, uploads, deletes }),
  };
}

const drive = fakeDrive([
  {
    id: "mobile-file",
    name: "nihongo-stairs-sync-mobile.json",
    modifiedTime: "2026-07-03T09:00:00Z",
    envelope: envelope("mobile", mobile, "2026-07-03T09:00:00Z"),
  },
  {
    id: "old-desktop-file",
    name: "nihongo-stairs-sync-desktop.json",
    modifiedTime: "2026-07-02T09:00:00Z",
    envelope: envelope("desktop", {}, "2026-07-02T09:00:00Z"),
  },
  {
    id: "new-desktop-file",
    name: "nihongo-stairs-sync-desktop.json",
    modifiedTime: "2026-07-03T08:00:00Z",
    envelope: envelope("desktop", local, "2026-07-03T08:00:00Z"),
  },
  {
    id: "corrupted-file",
    name: "nihongo-stairs-sync-corrupted.json",
    modifiedTime: "2026-07-03T08:30:00Z",
    corrupted: true,
  },
]);
let applied = local;
const result = await runDriveSnapshotSync({
  adapter: drive.adapter,
  deviceId: "desktop",
  loadLocal: async () => local,
  saveLocal: async (snapshot) => {
    applied = snapshot;
  },
});
assert.equal(result.localChanged, true, "Google Drive 新資料應套用到本機");
assert.equal(applied.studyEvents.length, 2, "手機與電腦事件都必須保留");
assert.equal(drive.state().uploads, 1, "本裝置快照過期時應更新一次");
assert.equal(drive.state().deletes, 1, "同裝置重複舊檔應清除");
assert.equal(
  drive.state().files.find((file) => file.id === "new-desktop-file").envelope
    .snapshot.studyEvents.length,
  2,
  "更新後的本裝置檔案應包含合併結果",
);

const forceDrive = fakeDrive([
  {
    id: "mobile-file",
    name: "nihongo-stairs-sync-mobile.json",
    modifiedTime: "2026-07-03T09:00:00Z",
    envelope: envelope("mobile", mobile, "2026-07-03T09:00:00Z"),
  },
]);
await runDriveSnapshotSync({
  adapter: forceDrive.adapter,
  deviceId: "desktop",
  loadLocal: async () => local,
  saveLocal: async () => {},
  force: true,
});
assert.equal(forceDrive.state().deletes, 1, "強制還原應刪除舊裝置快照");
assert.equal(forceDrive.state().files.length, 1, "強制還原後只保留新快照");
assert.equal(
  forceDrive.state().files[0].envelope.snapshot.studyEvents.length,
  1,
  "強制還原不得重新混入舊雲端事件",
);

assert.equal(isDriveEnvelope(null), false);
assert.equal(isDriveEnvelope({ syncVersion: 99 }), false);
assert.equal(
  isDriveEnvelope(envelope("desktop", local, "2026-07-03T10:00:00Z")),
  true,
);

console.log(
  "Google Drive snapshot merge, duplicate cleanup, malformed file, and restore validation passed.",
);
