import { currentRocPeriod, PERIODS } from "./data.js";

const STRONG_RATINGS = new Set(["good", "easy"]);
const CATEGORY_CONFIG = [
  { key: "vocabulary", label: "單字", strongOnly: true },
  { key: "grammar", label: "文法", strongOnly: true },
  { key: "reading", label: "閱讀", strongOnly: false },
  { key: "listening", label: "聽力", strongOnly: false },
];

function periodStart(period) {
  const [rocYear, month] = period.split("-").map(Number);
  return new Date(rocYear + 1911, month - 1, 1);
}

function periodEnd(period) {
  const start = periodStart(period);
  return new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
}

function itemPeriodIndex(item) {
  return PERIODS.indexOf(item.unlockPeriod);
}

function isCompleted(item, progress, strongOnly) {
  const record = progress[item.id];
  return strongOnly ? STRONG_RATINGS.has(record?.rating) : Boolean(record);
}

export function calculateDailyProgress(data, progress, date = new Date()) {
  const firstStart = periodStart(PERIODS[0]);
  const lastEnd = periodEnd(PERIODS.at(-1));
  const beforePlan = date < firstStart;
  const afterPlan = date > lastEnd;
  const currentPeriod = beforePlan
    ? PERIODS[0]
    : afterPlan
      ? PERIODS.at(-1)
      : currentRocPeriod(date);
  const periodIndex = Math.max(0, PERIODS.indexOf(currentPeriod));
  const currentPeriodStart = periodStart(currentPeriod);
  const daysInMonth = new Date(
    currentPeriodStart.getFullYear(),
    currentPeriodStart.getMonth() + 1,
    0,
  ).getDate();
  const day = beforePlan ? 0 : afterPlan ? daysInMonth : date.getDate();

  const categories = CATEGORY_CONFIG.map(({ key, label, strongOnly }) => {
    const items = data[key] || [];
    let previousTotal = 0;
    let availableTotal = 0;
    let actual = 0;
    for (const item of items) {
      const unlockIndex = itemPeriodIndex(item);
      if (unlockIndex < 0 || unlockIndex > periodIndex) continue;
      availableTotal += 1;
      if (unlockIndex < periodIndex) previousTotal += 1;
      if (isCompleted(item, progress, strongOnly)) actual += 1;
    }
    const newThisMonth = availableTotal - previousTotal;
    const expected = beforePlan
      ? 0
      : afterPlan
        ? items.length
        : previousTotal + Math.ceil((newThisMonth * day) / daysInMonth);
    const expectedYesterday =
      beforePlan || afterPlan
        ? expected
        : previousTotal +
          Math.ceil((newThisMonth * Math.max(0, day - 1)) / daysInMonth);
    return {
      key,
      label,
      actual,
      expected,
      todayTarget: Math.max(0, expected - expectedYesterday),
      plannedTotal: items.length,
    };
  });

  const actualTotal = categories.reduce((sum, item) => sum + item.actual, 0);
  const expectedTotal = categories.reduce((sum, item) => sum + item.expected, 0);
  const todayTargetTotal = categories.reduce(
    (sum, item) => sum + item.todayTarget,
    0,
  );
  const delta = actualTotal - expectedTotal;
  const status = delta > 0 ? "ahead" : delta < 0 ? "behind" : "on-track";

  return {
    currentPeriod,
    day,
    daysInMonth,
    beforePlan,
    afterPlan,
    categories,
    actualTotal,
    expectedTotal,
    todayTargetTotal,
    delta,
    status,
    remainingToExpected: Math.max(0, expectedTotal - actualTotal),
    percent: expectedTotal
      ? Math.min(100, Math.round((actualTotal / expectedTotal) * 100))
      : actualTotal
        ? 100
        : 0,
  };
}
