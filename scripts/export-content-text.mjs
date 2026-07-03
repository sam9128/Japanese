import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "public", "content");
const outputPath = path.join(root, "public", "日語階梯_完整教材.txt");
const index = JSON.parse(await readFile(path.join(contentRoot, "index.json"), "utf8"));

const periods = await Promise.all(
  index.periods.map(async (period) =>
    JSON.parse(await readFile(path.join(contentRoot, "periods", `${period}.json`), "utf8")),
  ),
);

const lines = [];
const add = (...values) => lines.push(...values.map((value) => String(value ?? "")));
const divider = (char = "=", width = 72) => add(char.repeat(width));
const answerLabel = (index) => `${index + 1}`;

function addSources(item) {
  if (item.sourceRefs?.length) add(`資料來源：${item.sourceRefs.join("、")}`);
  if (item.license) add(`授權：${item.license}`);
}

function addExamples(examples = []) {
  examples.forEach((example, index) => {
    add(`例句${index + 1}：${example.ja}`);
    if (example.zh) add(`例句中文翻譯：${example.zh}`);
    if (example.explanationZh) add(`例句中文解析：${example.explanationZh}`);
  });
}

function addQuestions(questions = [], explanationKey = "explanation") {
  questions.forEach((question, index) => {
    add("", `【問題 ${index + 1}】`);
    if (question.section || question.type) {
      add(`題型：${[question.section, question.type].filter(Boolean).join("／")}`);
    }
    if (question.instruction) add(`作答說明：${question.instruction}`);
    if (question.passage) add("文章／題幹：", question.passage);
    if (question.audioText) add(`聽力稿：${question.audioText}`);
    add(`問題：${question.prompt}`);
    question.options?.forEach((option, optionIndex) => add(`  ${answerLabel(optionIndex)}. ${option}`));
    const answer = Number.isInteger(question.answer) ? question.answer : 0;
    add(`正確答案：${answerLabel(answer)}. ${question.options?.[answer] ?? ""}`);
    const explanation = question[explanationKey] ?? question.explanationZh ?? question.explanation;
    if (explanation) add(`中文解釋：${explanation}`);
  });
}

add("日語階梯 N3→N2 完整教材", `產生時間：${new Date().toISOString()}`);
divider();
add(
  `單字：${index.counts.vocabulary} 筆`,
  `文法：${index.counts.grammar} 筆`,
  `閱讀：${index.counts.reading} 篇`,
  `聽力：${index.counts.listening} 組`,
  `月檢核：${index.counts.monthlyChecks} 回`,
  `N3 模考：${index.counts.n3Mocks} 回`,
  `N2 模考：${index.counts.n2Mocks} 回`,
  "",
  "說明：N3／N2 詞彙依難度及公開資料整理，不是 JLPT 官方固定字表。",
  "考試題目、中文解釋、閱讀文章與聽力稿皆為本計畫自編。",
);

for (const period of periods) {
  divider();
  add(`月份：${period.period}`);
  divider();

  add("", `【單字教材｜${period.vocabulary.length} 筆】`);
  period.vocabulary.forEach((item, index) => {
    add("", `${index + 1}. ${item.term}【${item.reading}】（${item.level}）`);
    add(`中文意思：${item.meaningZh}`);
    if (item.usageZh) add(`中文說明：${item.usageZh}`);
    addExamples(item.examples);
    addSources(item);
  });

  add("", `【文法教材｜${period.grammar.length} 筆】`);
  period.grammar.forEach((item, index) => {
    add("", `${index + 1}. ${item.term}（${item.level}）`);
    add(`中文解釋：${item.meaningZh}`);
    if (item.usageZh) add(`接續與用法：${item.usageZh}`);
    addExamples(item.examples);
    addSources(item);
  });

  add("", `【閱讀教材｜${period.reading.length} 篇】`);
  period.reading.forEach((item, index) => {
    add("", `${index + 1}. ${item.term}（${item.level}／難度 ${item.difficulty}／約 ${item.estimatedMinutes} 分鐘）`);
    add(`學習說明：${item.meaningZh}`, "文章：", item.content);
    addQuestions(item.questions);
    addSources(item);
  });

  add("", `【聽力教材｜${period.listening.length} 組】`);
  period.listening.forEach((item, index) => {
    add("", `${index + 1}. ${item.term}（${item.level}／難度 ${item.difficulty}／約 ${item.estimatedMinutes} 分鐘）`);
    add(`學習說明：${item.meaningZh}`, "聽力稿：");
    item.lines?.forEach((line, lineIndex) => add(`  ${lineIndex + 1}. ${line}`));
    addQuestions(item.questions);
    addSources(item);
  });

  add("", `【月檢與模擬考｜${period.assessments.length} 回】`);
  period.assessments.forEach((assessment) => {
    add("", `試卷：${assessment.title}（${assessment.level}）`);
    add(
      `類型：${assessment.kind}`,
      `作答時間：${assessment.durationMinutes} 分鐘`,
      `總分：${assessment.scoreTotal} 分`,
      `及格標準：${assessment.threshold} 分`,
      `題數：${assessment.questionCount} 題`,
    );
    addQuestions(assessment.questions, "explanationZh");
    addSources(assessment);
  });
}

divider();
add("資料來源與授權總表");
divider();
index.sources.forEach((source, index) => {
  add(`${index + 1}. ${source.name}`, `   網址：${source.url}`);
  if (source.license) add(`   授權：${source.license}`);
  if (source.use) add(`   使用方式：${source.use}`);
});

await writeFile(outputPath, `\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
console.log(JSON.stringify({ outputPath, lines: lines.length, bytes: Buffer.byteLength(lines.join("\r\n"), "utf8") }, null, 2));
