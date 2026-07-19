export const DEFAULT_SCHEDULE_SETTINGS = {
  enabled: false,
  goalName: "我的日語年度目標",
  startDate: "2026-07-01",
  endDate: "2027-06-30",
  weeklyMinutes: 210,
  targets: {
    vocabulary: 4000,
    grammar: 240,
    reading: 52,
    listening: 104,
  },
  notes: "",
  updatedAt: new Date(0).toISOString(),
};

const TARGET_KEYS = ["vocabulary", "grammar", "reading", "listening"];

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function normalizeScheduleSettings(value = {}) {
  const targets = Object.fromEntries(
    TARGET_KEYS.map((key) => [
      key,
      clampNumber(
        value.targets?.[key],
        0,
        DEFAULT_SCHEDULE_SETTINGS.targets[key],
        DEFAULT_SCHEDULE_SETTINGS.targets[key],
      ),
    ]),
  );
  return {
    ...DEFAULT_SCHEDULE_SETTINGS,
    ...value,
    enabled: Boolean(value.enabled),
    goalName: String(value.goalName || DEFAULT_SCHEDULE_SETTINGS.goalName),
    startDate:
      typeof value.startDate === "string" && value.startDate
        ? value.startDate
        : DEFAULT_SCHEDULE_SETTINGS.startDate,
    endDate:
      typeof value.endDate === "string" && value.endDate
        ? value.endDate
        : DEFAULT_SCHEDULE_SETTINGS.endDate,
    weeklyMinutes: clampNumber(value.weeklyMinutes, 0, 7 * 24 * 60, 210),
    targets,
    notes: String(value.notes || ""),
    updatedAt: value.updatedAt || new Date(0).toISOString(),
  };
}

export function withScheduleUpdatedAt(updater) {
  return (current) => {
    const next = typeof updater === "function" ? updater(current) : updater;
    return normalizeScheduleSettings({
      ...current,
      ...next,
      updatedAt: new Date().toISOString(),
    });
  };
}
