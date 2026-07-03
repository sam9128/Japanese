import assert from "node:assert/strict";
import {
  dataOwnerTransition,
  mergeSnapshots,
  normalizeSnapshot,
  snapshotsEqual,
} from "../src/syncData.js";
import { runSnapshotSync } from "../src/syncEngine.js";

const local = normalizeSnapshot({
  cardProgress: [
    { id: "a", rating: "good", updatedAt: "2026-07-03T10:00:00Z" },
  ],
  studyEvents: [{ id: "local-event", occurredAt: "2026-07-03T10:00:00Z" }],
  settings: [
    { id: "tts", value: { rate: 0.85, updatedAt: "2026-07-03T10:00:00Z" } },
  ],
});
const cloud = normalizeSnapshot({
  cardProgress: [
    { id: "a", rating: "hard", updatedAt: "2026-07-03T09:00:00Z" },
    { id: "b", rating: "easy", updatedAt: "2026-07-03T09:00:00Z" },
  ],
  studyEvents: [{ id: "cloud-event", occurredAt: "2026-07-03T09:00:00Z" }],
  settings: [
    { id: "tts", value: { rate: 1, updatedAt: "2026-07-03T11:00:00Z" } },
  ],
});
const merged = mergeSnapshots(local, cloud);

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

function fakeAdapter(initialRow, { concurrentSnapshot = null } = {}) {
  let row = initialRow
    ? { ...initialRow, payload: normalizeSnapshot(initialRow.payload) }
    : null;
  let racePending = Boolean(concurrentSnapshot);
  let writes = 0;
  let deletes = 0;
  return {
    adapter: {
      async deleteSnapshot() {
        row = null;
        deletes += 1;
      },
      async readSnapshot() {
        return row ? structuredClone(row) : null;
      },
      async writeSnapshot({ expectedRevision, payload }) {
        writes += 1;
        if (racePending) {
          racePending = false;
          row = {
            payload: mergeSnapshots(row.payload, concurrentSnapshot),
            revision: row.revision + 1,
            updatedAt: "2026-07-03T12:00:00Z",
          };
        }
        if (row && row.revision !== expectedRevision) {
          return { applied: false, ...structuredClone(row) };
        }
        row = {
          payload: normalizeSnapshot(payload),
          revision: (row?.revision || 0) + 1,
          updatedAt: "2026-07-03T13:00:00Z",
        };
        return { applied: true, ...structuredClone(row) };
      },
    },
    state: () => ({ row, writes, deletes }),
  };
}

const concurrent = normalizeSnapshot({
  studyEvents: [{ id: "concurrent-event", occurredAt: "2026-07-03T12:00:00Z" }],
});
const racedServer = fakeAdapter(
  { payload: cloud, revision: 1, updatedAt: "2026-07-03T09:00:00Z" },
  { concurrentSnapshot: concurrent },
);
let savedAfterRace = local;
const raceResult = await runSnapshotSync({
  adapter: racedServer.adapter,
  userId: "user-a",
  loadLocal: async () => local,
  saveLocal: async (snapshot) => {
    savedAfterRace = snapshot;
  },
});
assert.equal(raceResult.localChanged, true, "雲端內容應合併回本機");
assert.equal(
  savedAfterRace.studyEvents.length,
  3,
  "版本衝突重試後仍須保留兩裝置與競態中的事件",
);
assert.equal(
  racedServer.state().row.payload.studyEvents.length,
  3,
  "競態重試後雲端不得遺失事件",
);
assert.equal(racedServer.state().writes, 2, "版本衝突應自動重試一次");

const forceServer = fakeAdapter({
  payload: cloud,
  revision: 5,
  updatedAt: "2026-07-03T09:00:00Z",
});
await runSnapshotSync({
  adapter: forceServer.adapter,
  userId: "user-a",
  loadLocal: async () => local,
  saveLocal: async () => {},
  force: true,
});
assert.equal(forceServer.state().deletes, 1, "備份還原應先移除舊雲端快照");
assert.equal(
  forceServer.state().row.payload.studyEvents.length,
  1,
  "強制還原不得把舊雲端事件重新混入",
);

assert.deepEqual(dataOwnerTransition(null, "user-a"), {
  clearLocal: false,
  owner: "user-a",
});
assert.deepEqual(dataOwnerTransition("user-a", "user-b"), {
  clearLocal: true,
  owner: "user-b",
});

console.log(
  "Cloud snapshot merge, conflict retry, restore, and owner isolation validation passed.",
);
