import { mergeSnapshots, snapshotsEqual } from "./syncData.js";

export async function runSnapshotSync({
  adapter,
  userId,
  loadLocal,
  saveLocal,
  force = false,
  maxAttempts = 3,
}) {
  if (!userId) throw new Error("Authentication required");
  if (force) await adapter.deleteSnapshot(userId);

  let local = await loadLocal();
  let localApplied = local;
  let localChanged = false;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const cloudRow = await adapter.readSnapshot(userId);
    const merged = mergeSnapshots(local, cloudRow?.payload || {});

    if (!snapshotsEqual(localApplied, merged)) {
      await saveLocal(merged);
      localApplied = merged;
      localChanged = true;
    }

    if (cloudRow && snapshotsEqual(cloudRow.payload, merged)) {
      return { localChanged, updatedAt: cloudRow.updatedAt };
    }

    try {
      const outcome = await adapter.writeSnapshot({
        expectedRevision: cloudRow?.revision || 0,
        payload: merged,
      });
      if (outcome?.applied) {
        return {
          localChanged,
          updatedAt: outcome.updatedAt || new Date().toISOString(),
        };
      }
      local = mergeSnapshots(merged, outcome?.payload || {});
    } catch (error) {
      if (error?.code !== "23505") throw error;
      local = merged;
    }
  }

  throw new Error("資料同時在其他裝置更新，請再按一次同步。");
}
