import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const vocab = [
  ["改善","かいぜん","改善","生活習慣を改善するために、毎日少し歩いています。"],
  ["確認","かくにん","確認","出発する前に、電車の時間を確認してください。"],
  ["管理","かんり","管理","学習時間をアプリで管理しています。"],
  ["完成","かんせい","完成","このレポートは明日までに完成する予定です。"],
  ["関係","かんけい","關係","睡眠時間は集中力と深い関係があります。"],
  ["影響","えいきょう","影響","天気の変化が試合に影響しました。"],
  ["経験","けいけん","經驗","海外で働いた経験があります。"],
  ["結果","けっか","結果","試験の結果は来月発表されます。"],
  ["原因","げんいん","原因","失敗した原因を考えて、次の方法を決めます。"],
  ["効果","こうか","效果","毎日の復習には大きな効果があります。"],
  ["行動","こうどう","行動","目標を決めたら、すぐ行動することが大切です。"],
  ["状況","じょうきょう","狀況","状況が変わったら、すぐ連絡してください。"],
  ["条件","じょうけん","條件","この仕事に応募するには、二つの条件があります。"],
  ["情報","じょうほう","資訊","正しい情報かどうかを確かめましょう。"],
  ["説明","せつめい","說明","先生が文法の使い方を詳しく説明しました。"],
  ["選択","せんたく","選擇","将来のために最もよい選択をしたいです。"],
  ["増加","ぞうか","增加","最近、オンラインで学ぶ人が増加しています。"],
  ["減少","げんしょう","減少","運動不足で体力が減少しました。"],
  ["対応","たいおう","應對、處理","問題が起きたとき、落ち着いて対応しました。"],
  ["達成","たっせい","達成","今年中にN3合格という目標を達成したいです。"],
  ["提案","ていあん","提案","会議で新しい学習方法を提案しました。"],
  ["比較","ひかく","比較","二つの教材を比較してから選びます。"],
  ["必要","ひつよう","必要","申し込みには身分証明書が必要です。"],
  ["方法","ほうほう","方法","自分に合う復習方法を探しています。"],
  ["目的","もくてき","目的","この計画の目的は日本語力を伸ばすことです。"],
  ["予定","よてい","預定、計畫","週末に模擬試験を受ける予定です。"],
  ["利用","りよう","利用","通学時間を利用して単語を復習します。"],
  ["理解","りかい","理解","例文を読むと文法が理解しやすくなります。"],
  ["連絡","れんらく","聯絡","到着が遅れる場合は先生に連絡します。"],
  ["準備","じゅんび","準備","明日の授業の準備をしておきました。"],
  ["続ける","つづける","繼續","短い時間でも毎日勉強を続けます。"],
  ["決める","きめる","決定","今週学ぶ範囲を日曜日に決めます。"],
  ["選ぶ","えらぶ","選擇","自分のレベルに合った本を選びました。"],
  ["調べる","しらべる","調查、查詢","知らない言葉の使い方を辞書で調べます。"],
  ["届ける","とどける","送達","必要な書類を学校へ届けました。"],
  ["間に合う","まにあう","趕得上、來得及","急げば九時の電車に間に合います。"],
  ["確かめる","たしかめる","確認、查明","答えを見る前に、もう一度自分で確かめます。"],
  ["断る","ことわる","拒絕","時間がなかったので、そのお願いを断りました。"],
  ["認める","みとめる","承認、認可","自分の間違いを認めることも大切です。"],
  ["求める","もとめる","尋求、要求","困ったときは先生に助けを求めます。"],
  ["支える","ささえる","支持、支撐","家族が私の学習を支えてくれています。"],
  ["防ぐ","ふせぐ","防止","同じ間違いを防ぐために、錯題カードを作ります。"],
  ["含む","ふくむ","包含","この料金には教材費も含まれています。"],
  ["省く","はぶく","省略、刪除","時間を節約するため、不要な作業を省きました。"],
  ["任せる","まかせる","交給、委託","この仕事は経験のある人に任せましょう。"],
  ["戻る","もどる","返回","忘れ物に気づいて家へ戻りました。"],
  ["進む","すすむ","前進、進行","計画どおりに学習が進んでいます。"],
  ["遅れる","おくれる","遲到、延誤","バスが遅れて、授業に間に合いませんでした。"],
  ["現れる","あらわれる","出現、顯現","練習の効果が少しずつ現れてきました。"],
  ["比べる","くらべる","比較","先月の成績と今月の成績を比べます。"],
  ["かなり","かなり","相當、頗為","この問題はかなり難しかったです。"],
  ["ほとんど","ほとんど","幾乎、大部分","宿題はほとんど終わりました。"],
  ["しばらく","しばらく","暫時、一會兒","しばらく休んでから勉強を再開します。"],
  ["そろそろ","そろそろ","差不多該……","そろそろ試験の申し込みを確認しましょう。"],
  ["ついに","ついに","終於","毎日練習して、ついに目標を達成しました。"],
  ["たまたま","たまたま","偶然","図書館でたまたま先生に会いました。"],
  ["どうしても","どうしても","無論如何；怎麼也……","この文法がどうしても理解できません。"],
  ["なるべく","なるべく","盡可能","なるべく毎日同じ時間に復習します。"],
  ["必ず","かならず","一定、必定","申し込み後は必ず支払いを確認してください。"],
  ["特に","とくに","特別、尤其","聴解が弱いので、今月は特に力を入れます。"],
  ["一般的","いっぱんてき","一般的","これは一般的な勉強方法です。"],
  ["具体的","ぐたいてき","具體的","来週の目標を具体的に書きました。"],
  ["積極的","せっきょくてき","積極的","授業では積極的に質問するようにしています。"],
  ["適切","てきせつ","適當、恰當","状況に応じて適切な方法を選びましょう。"],
  ["十分","じゅうぶん","充分","試験までまだ十分な時間があります。"],
  ["重要","じゅうよう","重要","毎日の復習は新しい単語を覚えるうえで重要です。"],
  ["複雑","ふくざつ","複雜","この文法は少し複雑ですが、例文で理解できます。"],
  ["不安","ふあん","不安","初めての試験なので少し不安です。"],
  ["無理","むり","勉強、難以做到；勉強自己","忙しい日に無理をすると、長く続きません。"],
  ["確実","かくじつ","確實、可靠","毎日復習すれば、単語を確実に覚えられます。"],
  ["急に","きゅうに","突然","急に雨が降り始めました。"],
  ["徐々に","じょじょに","逐漸","毎日聞いていると、徐々に速さに慣れてきます。"],
  ["実際","じっさい","實際、實際上","実際に使ってみると、このアプリは便利でした。"],
  ["最近","さいきん","最近","最近、日本語のニュースを読むようになりました。"],
  ["将来","しょうらい","將來","将来は日本語を仕事に生かしたいです。"],
  ["機会","きかい","機會","日本人と話す機会が増えました。"],
  ["技術","ぎじゅつ","技術","新しい技術について日本語で調べました。"],
  ["習慣","しゅうかん","習慣","朝に単語を復習する習慣をつけています。"],
  ["責任","せきにん","責任","自分の仕事には責任を持たなければなりません。"],
  ["制度","せいど","制度","新しい奨学金制度について説明を聞きました。"],
  ["内容","ないよう","內容","授業の内容をその日のうちに復習します。"],
  ["能力","のうりょく","能力","読解能力を伸ばすために毎週文章を読みます。"],
  ["判断","はんだん","判斷","情報を集めてから判断したほうがいいです。"],
  ["変化","へんか","變化","毎月の点数の変化を記録しています。"],
  ["問題","もんだい","問題","難しい問題には印をつけて後で復習します。"],
  ["理由","りゆう","理由","遅れた理由を先生に説明しました。"],
  ["生活","せいかつ","生活","日本での生活について書かれた記事を読みました。"],
  ["社会","しゃかい","社會","日本の社会問題に関心があります。"],
  ["文化","ぶんか","文化","言葉を通して日本の文化も学べます。"],
  ["交通","こうつう","交通","この町は交通が便利です。"],
  ["参加","さんか","參加","来週、日本語の交流会に参加します。"],
  ["成功","せいこう","成功","計画を成功させるには継続が必要です。"],
  ["失敗","しっぱい","失敗","失敗から学んで、方法を変えました。"],
  ["解決","かいけつ","解決","問題を一人で解決できないときは相談します。"],
  ["協力","きょうりょく","合作、協助","友達に発音練習を協力してもらいました。"],
  ["研究","けんきゅう","研究","大学で情報技術について研究しています。"],
  ["発表","はっぴょう","發表","来月、学習成果を発表する予定です。"],
  ["申請","しんせい","申請","オンラインで補助金を申請しました。"],
  ["締め切り","しめきり","截止期限","申し込みの締め切りを忘れないでください。"],
  ["目標","もくひょう","目標","今月の目標は単語を四百語覚えることです。"],
];

const grammar = [
  ["～ようになる","變得會……；逐漸形成某種狀態","動詞辭書形／ない形＋ようになる","毎日練習して、日本語のニュースが少し読めるようになりました。","每天練習後，漸漸能讀懂一些日文新聞了。"],
  ["～ことになる","（由外部決定）決定……；結果成為……","動詞辭書形／ない形＋ことになる","来月から毎週、先生に進度を報告することになりました。","決定從下個月起每週向老師報告進度。"],
  ["～ことにする","（自己決定）決定……","動詞辭書形／ない形＋ことにする","通学中は単語を復習することにしました。","我決定通勤時複習單字。"],
  ["～ために","為了……；因為……","動詞辭書形／名詞＋の＋ために","N3に合格するために、毎日復習しています。","為了通過N3，我每天都在複習。"],
  ["～ように","為了能……；希望……","動詞辭書形／ない形＋ように","忘れないように、予定をカレンダーに入れました。","為了不要忘記，我把行程加進日曆。"],
  ["～ばかり","淨是……；剛剛……","名詞＋ばかり／動詞た形＋ばかり","文法ばかり勉強しないで、聴解も練習しましょう。","不要只讀文法，也練習聽力吧。"],
  ["～ところだ","正要……／正在……／剛剛……","動詞辭書形／ている形／た形＋ところだ","今から模擬試験を始めるところです。","我現在正要開始模擬考。"],
  ["～はずだ","照理應該……","普通形＋はずだ；名詞／な形容詞＋の＋はずだ","毎日復習したので、前より速く答えられるはずです。","因為每天複習，照理應該能比以前答得快。"],
  ["～わけではない","並不是……；不代表……","普通形＋わけではない","忙しくても、全く勉強できないわけではありません。","即使很忙，也並不是完全不能學習。"],
  ["～そうだ（傳聞）","聽說……","普通形＋そうだ","先生の話では、来週テストがあるそうです。","聽老師說，下週有考試。"],
  ["～らしい","聽說……；似乎……；具有……特徵","普通形＋らしい／名詞＋らしい","この教材はN3の学習者に人気があるらしいです。","聽說這套教材很受N3學習者歡迎。"],
  ["～てしまう","做完……；不小心……（遺憾）","動詞て形＋しまう","電車の中で寝てしまい、駅を通り過ぎました。","我在電車上不小心睡著，坐過站了。"],
  ["～ても","即使……也……","動詞て形／い形容詞くて／名詞・な形容詞でも","時間が短くても、毎日続けることが大切です。","即使時間很短，每天持續仍很重要。"],
  ["～ながら","一邊……一邊……；雖然……卻……","動詞ます形去ます＋ながら","電車に乗りながら、単語を復習します。","我一邊搭電車，一邊複習單字。"],
  ["～によって","依據……；因……而異；被……","名詞＋によって","人によって、覚えやすい方法は違います。","容易記憶的方法因人而異。"],
];

const outputDir = path.resolve("執行中/教材/Anki匯入");
await fs.mkdir(outputDir, { recursive: true });

const sourceUrl = "https://www.jlpt.jp/samples/sampleindex.html";
const vocabRows = vocab.map(([word, reading, meaning, example]) => [
  word,
  `讀音：${reading}<br>中文：${meaning}<br>例句：${example}`,
  "JLPT_N3 115_07 W1 詞彙",
]);
const grammarRows = grammar.map(([pattern, meaning, form, example, translation]) => [
  `${pattern}<br>${example}`,
  `意思：${meaning}<br>接續：${form}<br>例句翻譯：${translation}`,
  "JLPT_N3 115_07 W1 文法",
]);

const workbook = Workbook.create();
const vSheet = workbook.worksheets.add("N3單字_W1");
const gSheet = workbook.worksheets.add("N3文法_W1");
const noteSheet = workbook.worksheets.add("說明");

vSheet.getRange(`A1:F${vocab.length + 1}`).values = [
  ["正面","讀音","中文","例句","標籤","參考來源"],
  ...vocab.map(([word, reading, meaning, example]) => [word, reading, meaning, example, "JLPT_N3 115_07 W1 詞彙", sourceUrl]),
];
gSheet.getRange(`A1:G${grammar.length + 1}`).values = [
  ["句型","意思","接續","日文例句","中文翻譯","標籤","參考來源"],
  ...grammar.map(row => [...row, "JLPT_N3 115_07 W1 文法", sourceUrl]),
];
noteSheet.getRange("A1:B7").values = [
  ["項目","說明"],
  ["內容定位","自編 N3 起始學習卡；JLPT 官方不公布固定單字或文法清單。"],
  ["卡片數","100 個常見中級單字、15 條常見 N3 文法。"],
  ["例句","為本學習計畫重新撰寫，方便零碎時間複習。"],
  ["CSV 匯入","CSV 需先用電腦版 Anki 匯入，再透過 AnkiWeb 同步到 AnkiDroid。"],
  ["官方題型參考",sourceUrl],
  ["文字檔格式","UTF-8 with BOM；欄位為 Front、Back、Tags。"],
];

for (const sheet of [vSheet, gSheet, noteSheet]) {
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
  const used = sheet.getUsedRange();
  used.format.font = { name: "Microsoft JhengHei", size: 10 };
  used.format.verticalAlignment = "center";
  used.format.wrapText = true;
  const header = used.getRow(0);
  header.format = { fill: "#355C4D", font: { name: "Microsoft JhengHei", size: 10, bold: true, color: "#FFFFFF" }, verticalAlignment: "center" };
  header.format.rowHeight = 26;
}

vSheet.getRange(`A2:A${vocab.length + 1}`).format.font = { name: "Yu Mincho", size: 11, bold: true };
gSheet.getRange(`A2:A${grammar.length + 1}`).format.font = { name: "Yu Mincho", size: 11, bold: true };
vSheet.getRange(`A1:F${vocab.length + 1}`).format.borders = { preset: "inside", style: "thin", color: "#E2E8E5" };
gSheet.getRange(`A1:G${grammar.length + 1}`).format.borders = { preset: "inside", style: "thin", color: "#E2E8E5" };
noteSheet.getRange("A1:B7").format.borders = { preset: "inside", style: "thin", color: "#E2E8E5" };

vSheet.getRange("A:A").format.columnWidth = 14;
vSheet.getRange("B:B").format.columnWidth = 14;
vSheet.getRange("C:C").format.columnWidth = 16;
vSheet.getRange("D:D").format.columnWidth = 48;
vSheet.getRange("E:E").format.columnWidth = 24;
vSheet.getRange("F:F").format.columnWidth = 44;
gSheet.getRange("A:A").format.columnWidth = 22;
gSheet.getRange("B:B").format.columnWidth = 24;
gSheet.getRange("C:C").format.columnWidth = 34;
gSheet.getRange("D:D").format.columnWidth = 48;
gSheet.getRange("E:E").format.columnWidth = 44;
gSheet.getRange("F:F").format.columnWidth = 24;
gSheet.getRange("G:G").format.columnWidth = 44;
noteSheet.getRange("A:A").format.columnWidth = 22;
noteSheet.getRange("B:B").format.columnWidth = 72;

const escapeCsv = value => `"${String(value).replaceAll('"','""')}"`;
const toCsv = (rows, deck) => "\uFEFF" + [
  "#separator:Comma",
  "#html:true",
  "#notetype:Basic",
  `#deck:${deck}`,
  "#tags column:3",
  "#columns:Front,Back,Tags",
  ...rows.map(row => row.map(escapeCsv).join(",")),
].join("\r\n");
await fs.writeFile(path.join(outputDir, "N3單字_W1_100張.csv"), toCsv(vocabRows, "JLPT-N3-單字"), "utf8");
await fs.writeFile(path.join(outputDir, "N3文法_W1_15張.csv"), toCsv(grammarRows, "JLPT-N3-文法"), "utf8");

const inspect = await workbook.inspect({ kind: "table", range: "N3單字_W1!A1:F8", include: "values", tableMaxRows: 8, tableMaxCols: 6, maxChars: 5000 });
console.log(inspect.ndjson);
const preview = await workbook.render({ sheetName: "N3單字_W1", range: "A1:F12", scale: 1.2, format: "png" });
await fs.writeFile(path.join(outputDir, "N3卡片預覽.png"), new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, "N3第1週卡片清單.xlsx"));

const rawCsv = await fs.readFile(path.join(outputDir, "N3單字_W1_100張.csv"), "utf8");
const dataOnlyCsv = ["Front,Back,Tags", ...rawCsv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line && !line.startsWith("#"))].join("\n");
const vCheck = await Workbook.fromCSV(dataOnlyCsv, { sheetName: "CSVCheck" });
const csvInspect = await vCheck.inspect({ kind: "table", range: "CSVCheck!A1:C6", include: "values", tableMaxRows: 6, tableMaxCols: 3, maxChars: 3000 });
console.log(csvInspect.ndjson);
console.log(JSON.stringify({ vocab: vocab.length, grammar: grammar.length, outputDir }));
