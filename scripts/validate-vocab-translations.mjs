import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const periodsRoot = path.join(root, "public", "content", "periods");
const allowedAscii = new Set(["App", "OK", "SNS", "T", "IT", "JR"]);
const forbiddenPatterns = [
  /\b(?:a|adj|ad|adv|n|v|vi|vt|prep|conj|pron|interj|int|num|art|pl)\.\s*/i,
  /DOS|Internet網|Internet|chief executive|internal command/i,
  /命令|內部|内部|總線|总线|後端|后端|標準輸出|标准输出|校驗|校验/,
  /屏幕|設備|设备|位元|比特|系統|系统/,
  /複數形式|复数形式|過去式|过去式|過去分詞|过去分词|現在分詞|现在分词|三單形式|三单形式/,
  /使偏航|栗色|極機密|极机密|使活潑|使活泼|北卡羅來納州|北卡罗来纳州/,
];

const vocabulary = [];
for (const file of fs.readdirSync(periodsRoot)) {
  if (!file.endsWith(".json")) continue;
  const payload = JSON.parse(fs.readFileSync(path.join(periodsRoot, file), "utf8"));
  vocabulary.push(...(payload.vocabulary || []));
}

const failures = [];
for (const item of vocabulary) {
  const fields = [
    ["meaningZh", item.meaningZh],
    ["usageZh", item.usageZh],
    ["exampleExplanationZh", item.examples?.[0]?.explanationZh],
  ];
  for (const [field, value = ""] of fields) {
    if (!/[\u3400-\u9fff]/.test(value)) {
      failures.push({ id: item.id, term: item.term, field, reason: "missing Chinese", value });
      continue;
    }
    const forbidden = forbiddenPatterns.find((pattern) => pattern.test(value));
    if (forbidden) {
      failures.push({ id: item.id, term: item.term, field, reason: String(forbidden), value });
    }
    const asciiWords = value.match(/[A-Za-z]{2,}/g) || [];
    const unexpectedAscii = asciiWords.filter((word) => !allowedAscii.has(word));
    if (unexpectedAscii.length) {
      failures.push({
        id: item.id,
        term: item.term,
        field,
        reason: `unexpected ASCII: ${[...new Set(unexpectedAscii)].join(", ")}`,
        value,
      });
    }
  }
}

if (vocabulary.length !== 4000) {
  failures.push({ reason: `vocabulary count ${vocabulary.length}, expected 4000` });
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.slice(0, 80), failureCount: failures.length }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, vocabulary: vocabulary.length }, null, 2));
