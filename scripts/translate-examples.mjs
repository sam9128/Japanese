import fs from "node:fs";
import path from "node:path";
import { Converter } from "opencc-js";

const root = path.resolve(import.meta.dirname, "..");
const periodsRoot = path.join(root, "public", "content", "periods");
const outputPath = path.join(
  root,
  "scripts",
  "source",
  "example-translations-zh.json",
);
const examples = [];

for (const name of fs.readdirSync(periodsRoot).filter((name) => name.endsWith(".json"))) {
  const pack = JSON.parse(fs.readFileSync(path.join(periodsRoot, name), "utf8"));
  for (const card of [...pack.vocabulary, ...pack.grammar]) {
    const japanese = card.examples?.[0]?.ja?.trim();
    if (japanese) examples.push(japanese);
  }
}

const uniqueExamples = [...new Set(examples)];
const translations = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
  : {};
const toTraditional = Converter({ from: "cn", to: "tw" });
const manualOverrides = {
  "彼はちかの部屋に住んでいる。": "他住在地下室裡。",
  "ガソリンのメーターがEを指している。": "汽油表的指針指向 E。",
  "じゃんけんの「グー」は石を表します。": "猜拳中的「拳頭」代表石頭。",
  "昔は外人という言葉がよく使われていました。": "以前常使用「外國人」這個詞。",
  "ゼッタイに間に合うように行きます。": "我一定會及時趕到。",
  "給食でコッペパンが出ました。": "學校營養午餐供應了日式長麵包。",
  "ほうれん草のおひたしは美味しい。": "涼拌菠菜很好吃。",
  "梨子は甘くて美味しい。": "梨子香甜可口。",
  "夏には冷やし中華が食べたくなる。": "夏天會想吃日式冷麵。",
  "浴衣には草履がよく似合います。": "草履涼鞋和浴衣非常相配。",
  "このキンは危険だ。": "這種細菌很危險。",
};

function normalizeTranslation(value) {
  return toTraditional(String(value))
    .replace(/[\u200b-\u200d\ufeff]/gi, "")
    .replace(/\s+([，。！？])/g, "$1")
    .trim();
}

for (const [japanese, chinese] of Object.entries(translations)) {
  translations[japanese] = normalizeTranslation(chinese);
}
Object.assign(translations, manualOverrides);
const pending = uniqueExamples.filter((japanese) => !translations[japanese]);
const batches = [];
for (let index = 0; index < pending.length; index += 50) {
  batches.push(pending.slice(index, index + 50));
}

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function translateBatch(batch, attempt = 0) {
  try {
    const body = new URLSearchParams({
      client: "gtx",
      sl: "ja",
      tl: "zh-TW",
      dt: "t",
      q: batch.join("\n"),
    });
    const response = await fetch(
      "https://translate.googleapis.com/translate_a/single",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": "Mozilla/5.0",
        },
        body,
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const text = payload[0].map((part) => part[0]).join("");
    const lines = text
      .split(/\r?\n/)
      .map((line) => normalizeTranslation(line));
    if (lines.length !== batch.length || lines.some((line) => !line)) {
      if (batch.length === 1) {
        throw new Error(`translation alignment failed: ${batch[0]}`);
      }
      const middle = Math.ceil(batch.length / 2);
      return [
        ...(await translateBatch(batch.slice(0, middle), attempt)),
        ...(await translateBatch(batch.slice(middle), attempt)),
      ];
    }
    return lines;
  } catch (error) {
    if (attempt >= 4) throw error;
    await delay(1000 * 2 ** attempt);
    return translateBatch(batch, attempt + 1);
  }
}

let completed = 0;
async function worker() {
  while (batches.length) {
    const batch = batches.shift();
    const translated = await translateBatch(batch);
    batch.forEach((japanese, index) => {
      translations[japanese] = translated[index];
    });
    completed += batch.length;
    fs.writeFileSync(outputPath, `${JSON.stringify(translations, null, 2)}\n`);
    console.log(`translated ${completed}/${pending.length}`);
  }
}

await Promise.all(Array.from({ length: 3 }, () => worker()));
fs.writeFileSync(outputPath, `${JSON.stringify(translations, null, 2)}\n`);

const missing = uniqueExamples.filter((japanese) => !translations[japanese]);
if (missing.length) throw new Error(`missing translations: ${missing.length}`);
console.log(
  JSON.stringify(
    {
      examples: examples.length,
      uniqueExamples: uniqueExamples.length,
      translatedNow: pending.length,
      outputPath,
    },
    null,
    2,
  ),
);
