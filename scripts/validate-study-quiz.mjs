import assert from "node:assert/strict";
import {
  buildStudyQuiz,
  pickQuizItems,
  quizWeight,
  rememberQuizRound,
  STUDY_QUIZ_MIN_WEIGHT,
} from "../src/studyQuiz.js";

const cards = Array.from({ length: 8 }, (_, index) => ({
  id: `card-${index + 1}`,
  category: index % 2 ? "grammar" : "vocab",
  term: `語-${index + 1}`,
  reading: `ご-${index + 1}`,
  meaningZh: `中文意思 ${index + 1}`,
  audioText: `語-${index + 1}`,
}));

const weak = {
  quizAttempts: 5,
  quizCorrect: 1,
  quizWrong: 4,
  lastQuizCorrect: false,
};
const strong = {
  quizAttempts: 12,
  quizCorrect: 11,
  quizWrong: 1,
  lastQuizCorrect: true,
};

assert.ok(
  quizWeight(cards[0], weak) > quizWeight(cards[1], strong),
  "錯題權重應高於熟題",
);
assert.ok(
  quizWeight(cards[1], { quizAttempts: 100, quizCorrect: 100, quizWrong: 0 }) >=
    STUDY_QUIZ_MIN_WEIGHT,
  "正確率提升後權重仍不可降為 0",
);

const smallQuiz = buildStudyQuiz({
  pool: cards.slice(0, 2),
  allCandidates: cards,
  progress: {},
  random: () => 0.1,
});
assert.equal(smallQuiz.length, 2, "題庫不足 3 題時應使用可用題數");
assert.ok(
  smallQuiz.every((question) =>
    question.options.includes(question.correctMeaning),
  ),
  "每題選項必須包含正確中文意思",
);

const recentQuizRounds = [
  ["card-1"],
  ["card-2"],
  ["card-3"],
  ["card-8"],
];
const picked = pickQuizItems({
  pool: cards,
  progress: {},
  recentQuizRounds,
  random: () => 0.01,
});
assert.deepEqual(
  picked.map((item) => item.id),
  ["card-4", "card-5", "card-6"],
  "最近 3 輪內出現過的題目應優先排除",
);

const remembered = rememberQuizRound(recentQuizRounds, ["card-7"]);
assert.equal(remembered.length, 3, "最近題目紀錄只保留 3 輪");
assert.deepEqual(remembered[0], ["card-7"], "最新 quiz 輪次應放在最前面");

console.log("Study quiz validation passed.");
