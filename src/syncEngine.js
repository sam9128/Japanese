import { mergeSnapshots, snapshotsEqual } from "./syncData.js";

export const DRIVE_SYNC_VERSION = 1;

export function isDriveEnvelope(value) {
  return Boolean(
    value &&
      value.syncVersion === DRIVE_SYNC_VERSION &&
      typeof value.deviceId === "string" &&
      value.deviceId &&
      value.snapshot &&
      typeof value.snapshot === "object",
  );
}

function latestOwnEntry(entries, deviceId) {
  return entries
    .filter(({ envelope }) => envelope.deviceId === deviceId)
    .sort(
      (left, right) =>
        Date.parse(right.file.modifiedTime || 0) -
        Date.parse(left.file.modifiedTime || 0),
    )[0];
}

export async function runDriveSnapshotSync({
  adapter,
  deviceId,
  loadLocal,
  saveLocal,
  force = false,
}) {
  if (!deviceId) throw new Error("Missing device identifier");
  const local = await loadLocal();
  const files = await adapter.listSnapshots();

  if (force) {
    if (files.length) await adapter.deleteSnapshots(files);
    const updatedAt = new Date().toISOString();
    await adapter.upsertDeviceSnapshot({
      deviceId,
      existingFile: null,
      envelope: {
        syncVersion: DRIVE_SYNC_VERSION,
        deviceId,
        updatedAt,
        snapshot: local,
      },
    });
    return { localChanged: false, updatedAt, fileCount: 1 };
  }

  const downloaded = await Promise.all(
    files.map(async (file) => {
      try {
        const envelope = await adapter.downloadSnapshot(file);
        return isDriveEnvelope(envelope) ? { file, envelope } : null;
      } catch {
        return null;
      }
    }),
  );
  const entries = downloaded.filter(Boolean);
  let merged = local;
  for (const { envelope } of entries) {
    merged = mergeSnapshots(merged, envelope.snapshot);
  }

  const localChanged = !snapshotsEqual(local, merged);
  if (localChanged) await saveLocal(merged);

  const own = latestOwnEntry(entries, deviceId);
  const needsUpload = !own || !snapshotsEqual(own.envelope.snapshot, merged);
  const updatedAt = needsUpload
    ? new Date().toISOString()
    : own.envelope.updatedAt || own.file.modifiedTime;
  if (needsUpload) {
    await adapter.upsertDeviceSnapshot({
      deviceId,
      existingFile: own?.file || null,
      envelope: {
        syncVersion: DRIVE_SYNC_VERSION,
        deviceId,
        updatedAt,
        snapshot: merged,
      },
    });
  }

  const duplicates = entries
    .filter(
      ({ envelope, file }) =>
        envelope.deviceId === deviceId && file.id !== own?.file.id,
    )
    .map(({ file }) => file);
  if (duplicates.length) await adapter.deleteSnapshots(duplicates);

  return {
    localChanged,
    updatedAt,
    fileCount: files.length + (own ? 0 : 1) - duplicates.length,
  };
}
