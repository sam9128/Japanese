import fs from "node:fs";
import path from "node:path";
import { Converter } from "opencc-js";
import { grammarExamples } from "./source/grammar-examples.mjs";
import { assessmentScenarios } from "./source/assessment-scenarios.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const printSamples = process.argv.includes("--print-samples");
const printGrammarMap = process.argv.includes("--print-grammar-map");
const sourceRoot = path.resolve(root, "..", "tmp", "language-learning-decks", "japanese");
const outRoot = path.join(root, "public", "content", "periods");
const periods = ["115-07", "115-08", "115-09", "115-10", "115-11", "115-12", "116-01", "116-02", "116-03", "116-04", "116-05", "116-06"];
const vocabCaps = [400, 800, 1200, 1600, 1600, 1600, 2400, 2800, 3200, 3600, 4000, 4000];
const grammarCaps = [60, 120, 180, 240, 240, 240, 240, 240, 240, 240, 240, 240];
const ecdictZh = JSON.parse(fs.readFileSync(path.join(root, "scripts", "source", "ecdict-zh.json"), "utf8"));
const toTraditional = Converter({ from: "cn", to: "tw" });
const posZh = { noun:"名詞", verb:"動詞", adjective:"形容詞", adverb:"副詞", pronoun:"代名詞", conjunction:"接續詞", preposition:"助詞用法", interjection:"感嘆詞" };
const termZhOverrides = {
  "アニメ":"動畫；日本動畫作品", "ダメ":"不行；不可以；沒用", "ニュース":"新聞；消息", "カード":"卡片；卡", "方":"人（敬稱）；方向；方法",
  "アプリ":"應用程式；App", "気":"精神；心情；氣氛", "バカ":"笨蛋；愚蠢", "分":"部分；份量；分鐘的量詞", "メール":"電子郵件",
  "大":"大；大型；常作為前綴", "スポーツ":"運動；體育", "回":"次；回；次數量詞", "数":"數量；數目", "カメラ":"相機；攝影機",
  "万":"一萬；萬", "ページ":"頁；頁面", "世界":"世界", "ドラマ":"戲劇；電視劇", "市":"市；城市；市場",
  "県":"縣；日本行政區名稱", "同じ":"相同；一樣", "問題":"問題；題目", "度":"度；次；程度", "ドル":"美元；元",
  "会":"會議；協會；社團", "スマホ":"智慧型手機", "力":"力量；能力；作用力", "本当に":"真的；確實", "多い":"多；數量很多",
  "ホント":"真的；事實", "間":"之間；間隔；期間", "くれ":"給我；為我做", "プレゼント":"禮物；贈送", "名":"名字；名聲",
  "かも":"也許；可能", "たり":"做……之類；列舉動作", "サッカー":"足球", "みたい":"像……；好像……", "ママ":"媽媽",
  "女性":"女性；女人", "そんな":"那樣的；那種", "ビル":"大樓；建築物", "ブラック":"黑色；黑色的", "意味":"意思；含義",
  "サイズ":"尺寸；大小", "しか":"只有……；後接否定", "タイム":"時間；成績時間", "先":"前方；尖端；目的地；先前", "こんな":"這樣的；這種",
  "カラー":"顏色；彩色", "ボール":"球", "顔":"臉；表情", "くらい":"大約；到……程度", "キー":"鑰匙；按鍵；關鍵",
  "声":"聲音；嗓音", "最近":"最近；近來", "違う":"不同；不對；弄錯", "ラジオ":"收音機；廣播", "チャンス":"機會；時機",
  "頭":"頭；頭腦", "ルール":"規則", "あと":"之後；剩餘；痕跡", "心":"心；內心；心情", "バック":"後方；背面；袋子；背景",
  "やる":"做；進行；給予（晚輩或動物）", "パンツ":"褲子；內褲", "ストーリー":"故事；情節", "ダンス":"舞蹈；跳舞", "場所":"場所；地點",
  "バー":"酒吧；橫桿", "最後":"最後；結尾", "受ける":"接受；受到；參加考試", "言葉":"詞語；語言；說話", "ロボット":"機器人",
  "インターネット":"網際網路", "最初":"最初；開始", "ビデオ":"影片；錄影", "ベスト":"最好；最佳；背心", "見える":"看得見；看起來",
  "ボタン":"按鈕；鈕扣", "すごい":"厲害；驚人；非常", "頃":"時候；大約……時", "デート":"約會", "バイト":"打工；兼職",
  "やめる":"停止；辭去；放棄", "曲":"歌曲；樂曲", "イカ":"魷魚；烏賊", "漫画":"漫畫", "シーズン":"季節；賽季",
  "ほしい":"想要；希望得到", "普通":"普通；一般；通常", "番":"號碼；輪次；順序", "ずっと":"一直；很久；……得多", "ホーム":"家；月臺",
  "ライト":"光；燈；輕量的", "最高":"最高；最棒", "オススメ":"推薦；建議", "トラック":"卡車；跑道；音軌", "こう":"這樣；用這種方式",
  "簡単":"簡單；容易", "なぜ":"為什麼", "キロ":"公斤；公里；千", "気持ち":"心情；感受", "今回":"這次；本次",
  "ダイエット":"節食；減重", "パーティー":"派對；聚會", "ちゃんと":"好好地；確實地；整齊地", "探す":"尋找；搜尋", "これから":"從現在起；接下來",
  "ショー":"表演；節目", "レッド":"紅色", "結婚":"結婚；婚姻", "ブルー":"藍色；憂鬱的", "初めて":"第一次；初次",
  "やっぱり":"果然；還是；畢竟", "オンライン":"線上；連線中", "生活":"生活；過日子", "け":"毛；頭髮；毛皮", "バイク":"摩托車；機車"
};

const zhExact = {
  person: "人", people: "人們", thing: "事物", matter: "事情", fact: "事實", time: "時間", day: "日子",
  year: "年", month: "月", today: "今天", tomorrow: "明天", yesterday: "昨天", morning: "早上", night: "夜晚",
  school: "學校", student: "學生", teacher: "老師", company: "公司", work: "工作", study: "學習", book: "書",
  water: "水", food: "食物", money: "錢", friend: "朋友", family: "家人", child: "孩子", country: "國家",
  place: "場所", home: "家", house: "房子", station: "車站", train: "電車", car: "汽車", road: "道路",
  question: "問題", answer: "答案", language: "語言", japanese: "日語", word: "單字", meaning: "意思",
  good: "好的", bad: "不好的", big: "大的", small: "小的", new: "新的", old: "舊的", long: "長的", short: "短的",
  high: "高的", low: "低的", fast: "快的", slow: "慢的", easy: "容易的", difficult: "困難的", important: "重要的",
  "to do": "做", "to make": "製作", "to go": "去", "to come": "來", "to see": "看", "to hear": "聽",
  "to speak": "說", "to read": "閱讀", "to write": "寫", "to eat": "吃", "to drink": "喝", "to buy": "買",
  "to use": "使用", "to think": "思考", "to know": "知道", "to understand": "理解", "to live": "生活",
  "not": "不；沒有", "yes": "是", "no": "不；沒有", "way": "方法", "reason": "理由", "problem": "問題"
};

function normalizeEnglish(value = "") {
  return value.toLowerCase().replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim().replace(/^[.']+|[.']+$/g, "");
}

function lookupZh(part) {
  const key = normalizeEnglish(part);
  const candidates = [key, key.replace(/^to /, ""), key.replace(/^one'?s /, ""), key.replace(/s$/, "")];
  for (const candidate of candidates) {
    const translated = ecdictZh[candidate] && toTraditional(ecdictZh[candidate]);
    if (/[\u3400-\u9fff]/.test(translated || "")) return translated;
  }
  const stopWords = new Set(["the","and","for","with","from","into","that","this","one","ones","someone","something","very"]);
  const translatedWords = key.match(/[a-z][a-z'-]+/g)?.filter((word) => !stopWords.has(word)).map((word) => ecdictZh[word] && toTraditional(ecdictZh[word]).split(/[；，]/)[0]).filter((value) => /[\u3400-\u9fff]/.test(value || "")) || [];
  return [...new Set(translatedWords)].slice(0, 3).join("、");
}

function toZh(gloss = "", term = "此詞") {
  if (termZhOverrides[term]) return termZhOverrides[term];
  const parts = gloss.split(/[;,/]/).map((part) => part.trim()).filter(Boolean);
  const translated = parts.map((part) => {
    const key = normalizeEnglish(part);
    if (zhExact[key]) return zhExact[key];
    const dictionaryMeaning = lookupZh(part);
    if (dictionaryMeaning) return dictionaryMeaning;
    for (const [english, chinese] of Object.entries(zhExact)) {
      if (key === english || key.startsWith(`${english} `)) return chinese;
    }
    return "";
  }).filter(Boolean);
  return [...new Set(translated)].slice(0, 4).join("；") || `「${term}」表示例句中所呈現的事物、動作或狀態，請配合上下文理解`;
}

function usageZh(item, meaningZh) {
  const label = posZh[item.pos] || "一般詞彙";
  const advice = item.pos === "verb" ? "注意動詞變化與助詞搭配" : item.pos === "adjective" ? "注意修飾名詞或句尾的形式" : item.pos === "adverb" ? "通常用來修飾動作或整句語氣" : "請連同例句中的固定搭配一起記憶";
  return `詞性：${label}。核心意思：${meaningZh}。${advice}。`;
}

function romajiToKana(input = "") {
  let s = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z'-]/g, "");
  const map = { kya:"きゃ",kyu:"きゅ",kyo:"きょ",sha:"しゃ",shu:"しゅ",sho:"しょ",cha:"ちゃ",chu:"ちゅ",cho:"ちょ",nya:"にゃ",nyu:"にゅ",nyo:"にょ",hya:"ひゃ",hyu:"ひゅ",hyo:"ひょ",mya:"みゃ",myu:"みゅ",myo:"みょ",rya:"りゃ",ryu:"りゅ",ryo:"りょ",gya:"ぎゃ",gyu:"ぎゅ",gyo:"ぎょ",ja:"じゃ",ju:"じゅ",jo:"じょ",bya:"びゃ",byu:"びゅ",byo:"びょ",pya:"ぴゃ",pyu:"ぴゅ",pyo:"ぴょ",tsu:"つ",shi:"し",chi:"ち",fu:"ふ",ka:"か",ki:"き",ku:"く",ke:"け",ko:"こ",sa:"さ",su:"す",se:"せ",so:"そ",ta:"た",te:"て",to:"と",na:"な",ni:"に",nu:"ぬ",ne:"ね",no:"の",ha:"は",hi:"ひ",he:"へ",ho:"ほ",ma:"ま",mi:"み",mu:"む",me:"め",mo:"も",ya:"や",yu:"ゆ",yo:"よ",ra:"ら",ri:"り",ru:"る",re:"れ",ro:"ろ",wa:"わ",wo:"を",ga:"が",gi:"ぎ",gu:"ぐ",ge:"げ",go:"ご",za:"ざ",ji:"じ",zu:"ず",ze:"ぜ",zo:"ぞ",da:"だ",de:"で",do:"ど",ba:"ば",bi:"び",bu:"ぶ",be:"べ",bo:"ぼ",pa:"ぱ",pi:"ぴ",pu:"ぷ",pe:"ぺ",po:"ぽ",a:"あ",i:"い",u:"う",e:"え",o:"お",n:"ん" };
  let out = "";
  while (s.length) {
    if (/^([bcdfghjklmpqrstvwxyz])\1/.test(s) && s[0] !== "n") { out += "っ"; s = s.slice(1); continue; }
    if (s[0] === "n" && (s[1] === "'" || !/[aeiouy]/.test(s[1] || ""))) { out += "ん"; s = s.slice(s[1] === "'" ? 2 : 1); continue; }
    const key = Object.keys(map).sort((a,b)=>b.length-a.length).find((candidate) => s.startsWith(candidate));
    if (key) { out += map[key]; s = s.slice(key.length); } else { s = s.slice(1); }
  }
  return out;
}

function periodFor(index, caps) {
  return periods[caps.findIndex((cap) => index + 1 <= cap)];
}

function loadWords() {
  const files = ["hiragana.json", "katakana.json", "kanji.json"];
  if (!files.every((file) => fs.existsSync(path.join(sourceRoot, file)))) {
    throw new Error(`找不到開放詞彙資料：${sourceRoot}`);
  }
  const rank = { A2: 0, B1: 1, B2: 2, C1: 3, A1: 4, C2: 5, Unknown: 6 };
  const seen = new Set();
  const all = files.flatMap((file) => JSON.parse(fs.readFileSync(path.join(sourceRoot, file), "utf8")))
    .filter((item) => item.useful_for_flashcard && item.word && item.english_translation)
    .sort((a,b) => (rank[a.cefr_level] ?? 9) - (rank[b.cefr_level] ?? 9) || (a.word_frequency ?? 999999) - (b.word_frequency ?? 999999))
    .filter((item) => !seen.has(item.word) && seen.add(item.word))
    .slice(0, 4000);
  return all.map((item, index) => {
    const meaningZh = toZh(item.english_translation, item.word);
    return ({
    id: `vocab-${String(index + 1).padStart(4, "0")}`,
    level: index < 1600 ? "N3" : "N2",
    category: "vocab",
    term: item.word,
    reading: /[\u3040-\u30ff]/.test(item.word) && !/[\u4e00-\u9faf]/.test(item.word) ? item.word : romajiToKana(item.romanization),
    readingQuizEligible: !/[āēīōū]/i.test(item.romanization||"") && !/(zu|ji)/i.test(item.romanization||"") && item.word.length>=2,
    meaningZh,
    meaningEn: item.english_translation,
    usageZh: usageZh(item, meaningZh),
    examples: [{ ja: item.example_sentence_native || `${item.word}について勉強します。`, zh: `中文解析：本句使用「${item.word}」表達「${meaningZh}」。請觀察它和前後詞語的搭配。` }],
    audioText: item.word,
    unlockPeriod: periodFor(index, vocabCaps),
    tags: [item.pos || "word", item.cefr_level || "Unknown"],
    sourceRefs: ["https://github.com/vbvss199/Language-Learning-decks", "https://www.edrdg.org/", "https://github.com/skywind3000/ECDICT"],
    license: "Language-Learning-decks MIT; frequency data CC BY-SA 4.0; EDRDG/JMdict attribution retained; Chinese glosses derived with ECDICT (MIT)"
  });
  });
}

const grammarPatterns = `〜うちに|〜間に|〜間|〜てからでないと|〜ところだ|〜たところだ|〜ているところだ|〜ばかりだ|〜たばかり|〜ようとする|〜つつある|〜つつ|〜一方だ|〜ことになっている|〜ことにしている|〜ことになる|〜ことにする|〜ようになる|〜ようにする|〜ようにしている|〜ことがある|〜ことはない|〜わけだ|〜わけではない|〜わけがない|〜わけにはいかない|〜はずだ|〜はずがない|〜べきだ|〜べきではない|〜ものだ|〜ものではない|〜ということだ|〜とのことだ|〜と言われている|〜とみえる|〜ようだ|〜みたいだ|〜らしい|〜そうだ（樣態）|〜そうだ（傳聞）|〜っぽい|〜がちだ|〜気味だ|〜げ|〜かもしれない|〜に違いない|〜に決まっている|〜おそれがある|〜可能性がある|〜ために（目的）|〜ために（原因）|〜ように（目的）|〜ように（祈願）|〜によって|〜によると|〜によれば|〜を通じて|〜を通して|〜に対して|〜について|〜に関して|〜をめぐって|〜にとって|〜として|〜において|〜に基づいて|〜に応じて|〜に比べて|〜に加えて|〜に反して|〜にかわって|〜に代わり|〜にこたえて|〜に沿って|〜につれて|〜にしたがって|〜にともなって|〜とともに|〜に限って|〜に限らず|〜だけでなく|〜ばかりでなく|〜はもちろん|〜のみならず|〜さえ|〜こそ|〜なんか|〜など|〜にしては|〜わりに|〜くせに|〜にもかかわらず|〜ながらも|〜ものの|〜とはいえ|〜といっても|〜からといって|〜ても|〜たとえ〜ても|〜としても|〜にしても|〜にしろ|〜にせよ|〜なら|〜としたら|〜とすれば|〜ば|〜たら|〜と|〜ないことには|〜限り|〜限りでは|〜ない限り|〜さえ〜ば|〜てこそ|〜からこそ|〜ば〜ほど|〜なら〜ほど|〜ほど|〜くらい|〜だけ|〜だけあって|〜だけに|〜だけのことはある|〜につき|〜ごとに|〜おきに|〜たびに|〜たび|〜にあたって|〜際に|〜に先立って|〜て以来|〜てからというもの|〜をきっかけに|〜を契機に|〜次第|〜次第で|〜次第だ|〜次第では|〜上で|〜上に|〜上は|〜以上|〜からには|〜からして|〜からすると|〜から見ると|〜から言うと|〜にしても|〜にしたって|〜というより|〜どころか|〜どころではない|〜どころではなく|〜反面|〜一方で|〜かわりに|〜にかわって|〜た末に|〜あげく|〜結果|〜ところを|〜ところに|〜ところへ|〜最中に|〜最中だ|〜途中で|〜かけ|〜きる|〜きれない|〜ぬく|〜通す|〜込む|〜出す|〜始める|〜終わる|〜続ける|〜ていく|〜てくる|〜ておく|〜てある|〜てしまう|〜てみる|〜てもらう|〜てくれる|〜ていただく|〜てくださる|〜させてもらう|〜させていただく|〜てもかまわない|〜てはいけない|〜ないで済む|〜ずに済む|〜ずにはいられない|〜ないではいられない|〜てたまらない|〜てならない|〜てしょうがない|〜て仕方がない|〜ないことはない|〜ないわけではない|〜というものではない|〜ものか|〜ことか|〜ことだ|〜ことだから|〜ことなく|〜ことに|〜ことから|〜ことには|〜ものなら|〜ものだから|〜ものの|〜ものを|〜わけにはいかない|〜どんなに〜ことか|〜なんて|〜とは|〜という|〜といった|〜といえば|〜というと|〜といったら|〜にほかならない|〜にすぎない|〜に相違ない|〜に違いない|〜に決まっている|〜に越したことはない|〜ざるを得ない|〜ないわけにはいかない|〜かねない|〜かねる|〜かのようだ|〜かと思うと|〜かと思ったら|〜や否や|〜なり|〜そばから|〜ては|〜てばかりいる|〜ないうちに|〜か〜ないかのうちに|〜を問わず|〜にかかわらず|〜にもかかわらず|〜をものともせず|〜をよそに|〜に先駆けて|〜に至るまで|〜に至って|〜に至る|〜に至っては`.split("|");

function explainGrammar(term) {
  const rules = [
    [/(ば|たら|なら|としたら|とすれば|ないことには|さえ.*ば)/, "條件表達：說明前項條件成立時，後項會出現的結果。要注意真實條件、假設條件與說話者判斷的差別。"],
    [/(ために|ように)/, "目的表達：說明採取某個行動所要達成的目標。「ために」偏向意志性目標，「ように」常接能力、狀態或願望。"],
    [/(から|ため|によって|につき|ことだから)/, "原因與依據：用前項說明後項發生的理由、根據或背景。正式程度與責任歸屬會因句型而不同。"],
    [/(ものの|にもかかわらず|ながらも|くせに|わりに|に反して|とはいえ)/, "轉折與對比：前後內容存在預期落差。後項通常是說話者真正想強調的資訊。"],
    [/(ようだ|みたいだ|らしい|そうだ|かもしれない|に違いない|おそれがある|可能性)/, "推測與傳聞：根據外觀、資訊或判斷表達可能性。請留意確信程度，以及資訊是親眼觀察還是轉述。"],
    [/(うちに|間に|ところ|最中|際に|にあたって|て以来|たびに)/, "時間關係：指出動作發生的期間、時間點或前後順序。先確認兩個動作是否同時進行。"],
    [/(だけ|しか|に限|のみならず|ばかりでなく|はもちろん|さえ|こそ)/, "範圍與強調：限定對象、追加資訊或突出重點。助詞搭配會改變語氣強弱。"],
    [/(ことにする|ことになる|ようにする|ようになる|べき|わけにはいかない|ざるを得ない)/, "決定、變化與義務：表達主動決定、客觀安排、能力變化或不得不採取的行動。"],
    [/(ていく|てくる|つつある|一方だ|始める|続ける|終わる)/, "狀態變化：描述動作從過去到現在、由現在往未來，或持續發展的方向。"],
    [/(について|に関して|に対して|にとって|として|において|をめぐって)/, "主題與立場：標示談論對象、比較立場、身分或事情發生的範圍，常見於較正式的表達。"]
  ];
  return rules.find(([pattern]) => pattern.test(term))?.[1] || "句型功能：連接前後內容，補充說話者的判斷、語氣或兩件事情的關係。學習時請連同接續形式與完整例句記憶。";
}

function grammarUsageZh(term) {
  return `接續提示：先辨認「${term}」前面接名詞、動詞普通形或其他形式，再判斷它在句中表示條件、原因、時間、程度或說話者態度。`;
}
function makeGrammar() {
  const unique = [...new Set(grammarPatterns)].slice(0, 240);
  if (unique.length < 240) throw new Error(`文法句型不足：${unique.length}`);
  const missingExamples = unique.filter((term) => !grammarExamples.has(term));
  if (missingExamples.length) throw new Error(`文法例句不足：${missingExamples.join("、")}`);
  return unique.map((term, index) => ({
    id: `grammar-${String(index + 1).padStart(3, "0")}`, level: index < 180 ? "N3" : "N2", category: "grammar", term,
    reading: "文法句型", meaningZh: explainGrammar(term), usageZh: grammarUsageZh(term),
    examples: [{ ja: grammarExamples.get(term), zh: `中文解析：這句使用「${term}」。${explainGrammar(term)}` }],
    audioText: grammarExamples.get(term), unlockPeriod: periodFor(index, grammarCaps),
    tags: [index < 180 ? "N3文法" : "N2文法"], sourceRefs: ["self-authored"], license: "CC BY 4.0 — 本計畫自編"
  }));
}

function rotateOptions(correct, distractors, seed) {
  const options = [...new Set([correct, ...distractors.filter((item) => item !== correct)])].slice(0, 4);
  if (options.length !== 4) throw new Error(`選項不足：${correct}`);
  const shift = seed % options.length;
  const rotated = [...options.slice(shift), ...options.slice(0, shift)];
  return { options:rotated, answer:rotated.indexOf(correct) };
}

function scenarioValues(index, key) {
  const correct=assessmentScenarios[index][key];
  const values=[...new Set(assessmentScenarios.map((scenario)=>scenario[key]))].filter((value)=>value!==correct);
  const shift=index%values.length;
  return [...values.slice(shift),...values.slice(0,shift)];
}

function makeQuestion(prompt, correct, distractors, seed, explanation, evidence = correct) {
  return { prompt, ...rotateOptions(correct, distractors, seed), explanation, evidence };
}

function makeReading(index) {
  const scenarioIndex = index % assessmentScenarios.length;
  const variant = Math.floor(index / assessmentScenarios.length);
  const s = assessmentScenarios[scenarioIndex];
  let content;
  let questions;
  if (variant === 0) {
    content = `【${s.event}についてのお知らせ】\n${s.reason}ため、${s.event}は${s.oldTime}・${s.oldPlace}から、${s.newTime}・${s.newPlace}に変更します。参加する人は${s.item}を持ち、開始の十分前までに集まってください。質問がある場合は、${s.contact}へ連絡してください。`;
    questions = [
      makeQuestion("参加する人は、いつ、どこへ行きますか。", `${s.newTime}に${s.newPlace}へ行く。`, [`${s.oldTime}に${s.oldPlace}へ行く。`,`${s.newTime}に${s.oldPlace}へ行く。`,`${s.oldTime}に${s.newPlace}へ行く。`], index, `文章指出變更後應在「${s.newTime}」前往「${s.newPlace}」。`, `${s.newTime}・${s.newPlace}`),
      makeQuestion("参加する人が持っていくものは何ですか。", s.item, scenarioValues(scenarioIndex,"item"), index+1, `通知要求參加者攜帶「${s.item}」。`)
    ];
  } else if (variant === 1) {
    content = `件名：${s.event}の準備について\n${s.actor}です。${s.event}を予定どおり進めるため、「${s.action}」という準備を${s.deadline}までに終えてください。終わった人は${s.contact}へ連絡してください。当日は${s.item}も忘れずに持ってきてください。${s.reason}ため、直前にもう一度予定を確認する必要があります。`;
    questions = [
      makeQuestion("参加する人が最初にしなければならないことは何ですか。", `${s.action}。`, scenarioValues(scenarioIndex,"action").map(value=>`${value}。`), index, `郵件要求先「${s.action}」。`, s.action),
      makeQuestion("準備が終わった後、どうしますか。", `${s.contact}へ連絡する。`, scenarioValues(scenarioIndex,"contact").map(value=>`${value}へ連絡する。`), index+1, `準備完成後要聯絡「${s.contact}」。`, s.contact)
    ];
  } else if (variant === 2) {
    content = `私は、${s.event}をうまく進めるには、「${s.action}」という準備を事前に行うことが大切だと思います。以前は準備を当日まで延ばしてしまい、必要な情報を確認できませんでした。そこで、今回は早めに準備を始めました。その結果、${s.result}。${s.reason}場合でも、前もって確認しておけば落ち着いて対応できます。`;
    questions = [
      makeQuestion("早めに準備した結果、どうなりましたか。", `${s.result}。`, scenarioValues(scenarioIndex,"result").map(value=>`${value}。`), index, `作者提到提早準備後「${s.result}」。`),
      makeQuestion("筆者が最も伝えたいことは何ですか。", `「${s.action}」という準備を事前に行うことが大切だ。`, [`準備は当日になってから始めればよい。`,`予定が変わったときは何もしないほうがよい。`,`必要な情報はほかの人だけに確認してもらえばよい。`], index+1, `作者的主張是事前「${s.action}」很重要。`, s.action)
    ];
  } else {
    content = `【${s.event} 参加案内】\n申込：${s.deadline}までに${s.contact}へ連絡してください。\n集合：${s.newTime}、${s.newPlace}\n持ち物：${s.item}\n準備：参加前に「${s.action}」という準備を済ませること。\n注意：${s.reason}場合は、集合時刻や場所を変更することがあります。変更は申込者にメールで知らせます。`;
    questions = [
      makeQuestion("参加を申し込むには、どうすればいいですか。", `${s.deadline}までに${s.contact}へ連絡する。`, [`${s.newTime}に${s.contact}へ行く。`,`${s.deadline}までに${s.newPlace}へ行く。`,`${s.oldTime}にメールを待つ。`], index, `報名方式是在「${s.deadline}」前聯絡「${s.contact}」。`, s.deadline),
      makeQuestion("案内の内容と合っているものはどれですか。", `参加する前に「${s.action}」という準備を済ませる必要がある。`, [`持ち物は何も必要ない。`,`変更があっても連絡は来ない。`,`集合場所は必ず${s.oldPlace}である。`], index+1, `指南明確要求參加前先「${s.action}」。`, s.action)
    ];
  }
  const id=`reading-${String(index+1).padStart(2,"0")}`;
  questions=questions.map((question,questionIndex)=>({...question,id:`${id}-q${questionIndex+1}`}));
  return { id, level:index < 32 ? "N3":"N2", category:"reading", term:`閱讀 ${index+1}｜${s.theme}`, reading:"精讀與摘要", meaningZh:"先計時閱讀，再完成摘要與理解題。", audioText:"", unlockPeriod:periods[Math.min(11, Math.floor(index/5))], tags:[s.theme], sourceRefs:["self-authored"], license:"CC BY 4.0 — 本計畫自編", estimatedMinutes:8+(index%5), difficulty:1+(index%5), content, questions };
}

function makeListening(index) {
  const scenarioIndex = index % assessmentScenarios.length;
  const variant = Math.floor(index / assessmentScenarios.length);
  const s = assessmentScenarios[scenarioIndex];
  let lines;
  let question;
  if (variant === 0) {
    lines = [`女：${s.event}は${s.oldTime}に${s.oldPlace}で行う予定でしたね。`,`男：はい。でも、${s.reason}ため、予定が変わりました。`,`女：新しい予定を教えてください。`,`男：${s.newTime}に${s.newPlace}へ来てください。`,`女：分かりました。間違えないようにします。`];
    question = makeQuestion("新しい時間と場所はどれですか。", `${s.newTime}・${s.newPlace}`, [`${s.oldTime}・${s.oldPlace}`,`${s.newTime}・${s.oldPlace}`,`${s.oldTime}・${s.newPlace}`], index, `對話確認新的時間與地點是「${s.newTime}・${s.newPlace}」。`, s.newTime);
  } else if (variant === 1) {
    lines = [`女：${s.event}の準備は、何から始めればいいですか。`,`男：まず、「${s.action}」という準備をしてください。`,`女：終わったら、どうしますか。`,`男：${s.contact}へ連絡してください。そのあと、${s.item}を用意しましょう。`,`女：はい、順番に進めます。`];
    question = makeQuestion("女の人は、まず何をしますか。", `${s.action}。`, scenarioValues(scenarioIndex,"action").map(value=>`${value}。`), index, `男子首先要求「${s.action}」。`, s.action);
  } else if (variant === 2) {
    lines = [`男：どうして${s.event}の予定が変わったんですか。`,`女：${s.reason}からです。`,`男：中止ではないんですね。`,`女：はい。新しい予定はメールで知らせます。`,`男：分かりました。メールを確認します。`];
    question = makeQuestion("予定が変わった理由は何ですか。", `${s.reason}から。`, scenarioValues(scenarioIndex,"reason").map(value=>`${value}から。`), index, `女子說明變更原因是「${s.reason}」。`, s.reason);
  } else if (variant === 3) {
    lines = [`女：${s.event}には何を持っていけばいいですか。`,`男：${s.item}を持ってきてください。`,`女：ほかにも必要ですか。`,`男：いいえ、それだけで大丈夫です。`,`女：では、忘れないように準備します。`];
    question = makeQuestion("女の人は何を持っていきますか。", s.item, scenarioValues(scenarioIndex,"item"), index, `女子需要攜帶「${s.item}」。`);
  } else if (variant === 4) {
    lines = [`男：${s.event}の場所ですが、${s.oldPlace}は使えないそうです。`,`女：では、${s.newPlace}はどうですか。`,`男：そこなら全員が集まりやすいですね。`,`女：では、その場所に決めて、みんなに知らせます。`,`男：お願いします。`];
    question = makeQuestion("二人は、どこで行うことにしましたか。", s.newPlace, [s.oldPlace,...scenarioValues(scenarioIndex,"newPlace").slice(0,2)], index, `兩人最後決定在「${s.newPlace}」進行。`);
  } else if (variant === 5) {
    lines = [`女：${s.action}のは、いつまでですか。`,`男：${s.deadline}までです。`,`女：明日でも間に合いますか。`,`男：はい。ただし、終わったらすぐ${s.contact}へ知らせてください。`,`女：分かりました。`];
    question = makeQuestion("女の人は、いつまでに準備しますか。", s.deadline, scenarioValues(scenarioIndex,"deadline"), index, `期限是「${s.deadline}」。`);
  } else if (variant === 6) {
    lines = [`男：すみません、${s.event}の前に、「${s.action}」という準備をお願いできますか。`,`女：はい。${s.deadline}まででいいですか。`,`男：お願いします。終わったら私にメールしてください。`,`女：分かりました。今日から始めます。`,`男：よろしくお願いします。`];
    question = makeQuestion("女の人は、このあと何をしますか。", `${s.action}。`, scenarioValues(scenarioIndex,"action").map(value=>`${value}。`), index, `男子請女子接著「${s.action}」。`, s.action);
  } else {
    lines = [`女：今回の${s.event}は、前より順調でしたね。`,`男：早い段階で「${s.action}」という準備をしたからだと思います。`,`女：その結果、どうなりましたか。`,`男：${s.result}。`,`女：次回も同じ方法で準備しましょう。`];
    question = makeQuestion("早めに準備した結果、どうなりましたか。", `${s.result}。`, scenarioValues(scenarioIndex,"result").map(value=>`${value}。`), index, `對話指出結果是「${s.result}」。`);
  }
  const id=`listening-${String(index+1).padStart(3,"0")}`;
  return { id, level:index < 64 ? "N3":"N2", category:"listening", term:`聽力 ${index+1}｜${s.theme}`, reading:"逐句聽解", meaningZh:"先盲聽，再逐句確認聽力稿。", audioText:lines.join(" "), unlockPeriod:periods[Math.min(11, Math.floor(index/9))], tags:[s.theme], sourceRefs:["self-authored"], license:"CC BY 4.0 — 本計畫自編", estimatedMinutes:6, difficulty:1+(index%5), lines, questions:[{...question,id:`${id}-q1`}] };
}

const grammarFunctions = [
  "条件や仮定を表している", "目的を表している", "原因や理由を表している", "願望や祈りを表している",
  "予想と異なる結果や対比を表している", "推量や伝聞を表している", "時間や動作の前後関係を表している",
  "範囲の限定や強調を表している", "決定・義務・許可を表している", "状態の変化や動作の進行を表している",
  "話題・立場・対象との関係を表している", "程度や比較を表している", "気持ちや評価を強く表している", "説明・引用・言い換えを表している",
  "経験・習慣・一般的な傾向を表している", "否定・不可能・部分否定を表している", "情報の根拠や引用を表している",
  "試み・授受・依頼を表している", "結果・きっかけ・判断の根拠を表している", "例示や話題の提示を表している",
  "追加・並行・変化の連動を表している", "自然に起こる強い感情や衝動を表している"
];

function grammarFunctionJa(term) {
  if (/(といっても|にしては|といったら)/.test(term)) return "予想と異なる結果や対比を表している";
  if (/(というものではない)/.test(term)) return "否定・不可能・部分否定を表している";
  if (/(に越したことはない)/.test(term)) return "程度や比較を表している";
  if (/(ことには|〜限り$|〜ては$)/.test(term)) return "条件や仮定を表している";
  if (/(〜つつ$)/.test(term)) return "追加・並行・変化の連動を表している";
  if (/(〜上で$)/.test(term)) return "時間や動作の前後関係を表している";
  if (/(〜ことなく$)/.test(term)) return "否定・不可能・部分否定を表している";
  if (/(〜ものだから$)/.test(term)) return "原因や理由を表している";
  if (/(〜次第だ$|にほかならない)/.test(term)) return "結果・きっかけ・判断の根拠を表している";
  if (/(ということだ|とのことだ|と言われている|によると|によれば)/.test(term)) return "情報の根拠や引用を表している";
  if (/(ずにはいられない|ないではいられない)/.test(term)) return "自然に起こる強い感情や衝動を表している";
  if (/(かと思ったら|かと思うと|や否や|なり$|そばから|か.*ないかのうちに)/.test(term)) return "時間や動作の前後関係を表している";
  if (/(ことになっている|ことにしている|ようにしている|ものではない|ことだ$)/.test(term)) return "決定・義務・許可を表している";
  if (/(わけではない|わけがない|はずがない|ことはない|ないことはない|ないわけではない|というものではない|ものか|どころではない|どころではなく|ないで済む|ずに済む)/.test(term)) return "否定・不可能・部分否定を表している";
  if (/(ことがある|ものだ$|てばかりいる)/.test(term)) return "経験・習慣・一般的な傾向を表している";
  if (/(てもらう|てくれる|ていただく|てくださる|させてもらう|させていただく|てみる|ようとする)/.test(term)) return "試み・授受・依頼を表している";
  if (/(に加えて|に沿って|につれて|にしたがって|にともなって|とともに|上に)/.test(term)) return "追加・並行・変化の連動を表している";
  if (/(をきっかけに|を契機に|た末に|あげく|結果|からして|からすると|から見ると|から言うと)/.test(term)) return "結果・きっかけ・判断の根拠を表している";
  if (/(なんか|など|なんて|とは$|という$|といった$|というと|といえば|というより)/.test(term)) return "例示や話題の提示を表している";
  if (/(ために（原因）|につき|ことだから|ことから)/.test(term)) return "原因や理由を表している";
  if (/(ために（目的）|ように（目的）)/.test(term)) return "目的を表している";
  if (/(ように（祈願）|どんなに.*ことか|ことか)/.test(term)) return "願望や祈りを表している";
  if (/(てからでないと|ば$|たら$|なら$|としたら|とすれば|としても|にしても|にしろ|にせよ|ないことには|ない限り|さえ.*ば|ものなら|たとえ|次第で|次第では|上は|以上|からには|ても$|〜と$|にしたって)/.test(term)) return "条件や仮定を表している";
  if (/(ものの|にもかかわらず|ながらも|くせに|わりに|に反して|とはいえ|からといって|どころか|反面|一方で|にしては|といっても|ものを)/.test(term)) return "予想と異なる結果や対比を表している";
  if (/(ようだ|みたいだ|らしい|そうだ|かもしれない|に違いない|に決まっている|おそれがある|可能性|とみえる|かのようだ|はずだ|に相違ない|かねない)/.test(term)) return "推量や伝聞を表している";
  if (/(うちに|間に|間$|ところ|最中|途中|際に|にあたって|に先立って|て以来|てからというもの|たび|次第$|ごとに|おきに|たばかり)/.test(term)) return "時間や動作の前後関係を表している";
  if (/(だけ|しか|に限|のみならず|ばかりでなく|はもちろん|さえ|こそ|を問わず|にかかわらず|にすぎない|限りでは)/.test(term)) return "範囲の限定や強調を表している";
  if (/(ことにする|ことになる|ようにする|べき|わけにはいかない|ざるを得ない|てはいけない|てもかまわない|かねる)/.test(term)) return "決定・義務・許可を表している";
  if (/(ていく|てくる|つつある|一方だ|始める|続ける|終わる|きる|きれない|ぬく|通す|込む|出す|ておく|てある|てしまう|ようになる|ばかりだ|かけ)/.test(term)) return "状態の変化や動作の進行を表している";
  if (/(について|に関して|に対して|にとって|として|において|をめぐって|に基づいて|に応じて|によって|を通じて|を通して|にかわって|に代わり|にこたえて)/.test(term)) return "話題・立場・対象との関係を表している";
  if (/(ほど|くらい|に比べて|ば.*ほど|なら.*ほど|だけあって|だけに|に越したことはない)/.test(term)) return "程度や比較を表している";
  if (/(てたまらない|てならない|てしょうがない|て仕方がない|ことに|げ|気味|がち|っぽい|といったら)/.test(term)) return "気持ちや評価を強く表している";
  return "説明・引用・言い換えを表している";
}

const assessmentUsage = {vocabulary:new Set(),grammar:new Set(),reading:new Set(),listening:new Set()};

function orderedLevelPool(items, level, maxPeriod) {
  const unlocked = items.filter((item) => periods.indexOf(item.unlockPeriod) <= maxPeriod);
  const exact=unlocked.filter((item)=>item.level===level);
  return exact.length ? exact : unlocked.filter((item)=>item.level!==level);
}

function takeUnused(items, used, seed, key = (item)=>item.id, label = "題庫") {
  for (let offset=0; offset<items.length; offset+=1) {
    const item=items[(seed+offset)%items.length];
    const itemKey=key(item);
    if (!used.has(itemKey)) { used.add(itemKey); return item; }
  }
  throw new Error(`${label}不足，無法產生不重複題目（可用 ${items.length}，已使用 ${used.size}）`);
}

function makeExamQuestions(id, level, period, questionCount, catalog) {
  const maxPeriod = periods.indexOf(period);
  const kanjiPool = orderedLevelPool(catalog.vocabulary,level,maxPeriod).filter((item) => /[\u3400-\u9fff]/.test(item.term)&&item.reading&&item.reading!==item.term&&item.readingQuizEligible);
  const grammarPool = orderedLevelPool(catalog.grammar,level,maxPeriod);
  const readingPool = orderedLevelPool(catalog.reading,level,maxPeriod).flatMap((item)=>item.questions.map((question,questionIndex)=>({item,question,questionIndex,id:`${item.id}-q${questionIndex+1}`})));
  const listeningPool = orderedLevelPool(catalog.listening,level,maxPeriod).map((item)=>({item,question:item.questions[0],id:`${item.id}-q1`}));
  const used=assessmentUsage;
  const seedBase = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({length:questionCount}, (_, index) => {
    const seed = seedBase * 17 + index * 13;
    const type = index % 6;
    if (type === 0) {
      const item=takeUnused(kanjiPool,used.vocabulary,seed,undefined,`${id} 漢字読み`);
      const distractors=kanjiPool.filter((candidate)=>candidate.id!==item.id&&candidate.reading!==item.reading).slice(seed%Math.max(1,kanjiPool.length-3)).concat(kanjiPool).map((candidate)=>candidate.reading);
      return { id:`${id}-q${index+1}`, section:"言語知識", type:"漢字読み", instruction:"「　」の言葉の読み方として最もよいものを一つ選びなさい。", prompt:`「${item.term}」の読み方はどれですか。`, ...rotateOptions(item.reading,distractors,seed), explanationZh:`「${item.term}」讀作「${item.reading}」，中文意思是「${item.meaningZh}」。`, sourceCardId:item.id, logic:"kanji-reading" };
    }
    if (type === 1) {
      const item=takeUnused(kanjiPool,used.vocabulary,seed,undefined,`${id} 表記`);
      const distractors=kanjiPool.filter((candidate)=>candidate.id!==item.id&&candidate.reading!==item.reading).slice(seed%Math.max(1,kanjiPool.length-3)).concat(kanjiPool).map((candidate)=>candidate.term);
      return { id:`${id}-q${index+1}`, section:"言語知識", type:"表記", instruction:"ひらがなで示した言葉の表記として最もよいものを一つ選びなさい。", prompt:`「${item.reading}」と読む言葉はどれですか。`, ...rotateOptions(item.term,distractors,seed), explanationZh:`「${item.reading}」的正確表記是「${item.term}」，中文意思是「${item.meaningZh}」。`, sourceCardId:item.id, logic:"orthography" };
    }
    if (type === 2) {
      const item=takeUnused(grammarPool,used.grammar,seed,undefined,`${id} 文法`);
      const correct=grammarFunctionJa(item.term);
      return { id:`${id}-q${index+1}`, section:"文法", type:"文法形式", instruction:"次の文で使われている文法の働きとして最もよいものを一つ選びなさい。", passage:item.examples[0].ja, prompt:`「${item.term}」は、この文でどのような意味を表していますか。`, ...rotateOptions(correct,grammarFunctions.filter((value)=>value!==correct).slice(seed%10).concat(grammarFunctions),seed), explanationZh:`本題句型是「${item.term}」，在例句中用來表示「${correct}」。${item.meaningZh} 例句：${item.examples[0].ja}`, sourceCardId:item.id, logic:"grammar-function" };
    }
    if (type === 3) {
      const entry=takeUnused(readingPool,used.reading,seed,undefined,`${id} 読解`);
      return { id:`${id}-q${index+1}`, section:"読解", type:"内容理解", instruction:"次の文章を読んで、質問に答えなさい。", passage:entry.item.content, prompt:entry.question.prompt, options:entry.question.options, answer:entry.question.answer, explanationZh:entry.question.explanation, sourceQuestionId:entry.question.id, logic:"reading-source" };
    }
    if (type === 4) {
      const entry=takeUnused(listeningPool,used.listening,seed,undefined,`${id} 聴解`);
      return { id:`${id}-q${index+1}`, section:"聴解", type:"ポイント理解", instruction:"音声を聞いて、質問に答えなさい。", prompt:entry.question.prompt, audioText:entry.item.audioText, options:entry.question.options, answer:entry.question.answer, explanationZh:entry.question.explanation, sourceQuestionId:entry.question.id, logic:"listening-source" };
    }
    const item=takeUnused(grammarPool,used.grammar,seed,undefined,`${id} 文法`);
    const correct=grammarFunctionJa(item.term);
    return { id:`${id}-q${index+1}`, section:"文法", type:"文法形式", instruction:"次の文で使われている文法の働きとして最もよいものを一つ選びなさい。", passage:item.examples[0].ja, prompt:`「${item.term}」は、この文でどのような意味を表していますか。`, ...rotateOptions(correct,grammarFunctions.filter((value)=>value!==correct).slice((seed+3)%10).concat(grammarFunctions),seed), explanationZh:`本題句型是「${item.term}」，在例句中用來表示「${correct}」。${item.meaningZh} 例句：${item.examples[0].ja}`, sourceCardId:item.id, logic:"grammar-function" };
  });
}

function makeAssessment(id, title, level, period, minutes, questionCount, kind, catalog) {
  return { id, title, level, category:"assessment", kind, unlockPeriod:period, durationMinutes:minutes, threshold:60, scoreTotal:100, sourceRefs:["self-authored", "https://www.jlpt.jp/e/samples/sampleindex.html"], license:"CC BY 4.0 — 自編題目；官方連結僅供題型參考", questionCount, questions:makeExamQuestions(id,level,period,questionCount,catalog) };
}

const vocabulary = loadWords();
const grammar = makeGrammar();
const reading = Array.from({length:52},(_,i)=>makeReading(i));
const listening = Array.from({length:104},(_,i)=>makeListening(i));
const catalog = { vocabulary, grammar, reading, listening };
const assessments = [
  ...periods.map((p,i)=>makeAssessment(`monthly-${String(i+1).padStart(2,"0")}`,`${p.replace("-","/")} 月檢核`, i<6?"N3":"N2",p,35,20,"monthly",catalog)),
  ...Array.from({length:5},(_,i)=>makeAssessment(`mock-n3-${i+1}`,`N3 自編模考 ${i+1}`,"N3",i<3?"115-11":"115-12",95,30,"mock",catalog)),
  ...Array.from({length:2},(_,i)=>makeAssessment(`mock-n2-${i+1}`,`N2 自編模考 ${i+1}`,"N2","116-06",105,35,"mock",catalog))
];

function auditGeneratedQuestions() {
  const hasJapanese=(value)=>/[\u3040-\u30ff\u3400-\u9fff]/.test(value||"");
  const hasChineseMarker=(value)=>/[這裡還讓應該嗎個們]|下午|上午|二樓|選項|答案|中文|直接放棄|身邊的人/.test(value||"");
  const hasChineseExplanation=(value)=>/指出|要求|需要|首先|變更|聯絡|作者|期限|報名|指南|正確|讀作|中文|用來|對話|郵件|準備|男子|女子|通知|攜帶|兩人|女子/.test(value||"");
  const assert=(condition,message)=>{if(!condition)throw new Error(`題庫稽核失敗：${message}`)};
  const readingContents=new Set(reading.map((item)=>item.content));
  const listeningScripts=new Set(listening.map((item)=>item.audioText));
  const awkwardPatterns=[/するください/,/するもらえ/,/事前に前日まで/,/までに前日まで/,/早めに前日まで/];
  assert(readingContents.size===52,`閱讀內容僅 ${readingContents.size}/52 篇不重複`);
  assert(listeningScripts.size===104,`聽力稿僅 ${listeningScripts.size}/104 組不重複`);

  const sourceQuestions=new Map();
  for(const item of [...reading,...listening]){
    const sourceText=item.category==="reading"?item.content:item.audioText;
    assert(!awkwardPatterns.some((pattern)=>pattern.test(sourceText)),`${item.id} 含不自然的日文接續`);
    assert(item.questions.length===(item.category==="reading"?2:1),`${item.id} 題數不正確`);
    if(item.category==="listening")assert(item.lines.length===5&&item.audioText===item.lines.join(" "),`${item.id} 聽力稿與逐句內容不一致`);
    for(const question of item.questions){
      assert(!sourceQuestions.has(question.id),`來源題 ID 重複：${question.id}`);
      assert(hasJapanese(question.prompt),`${question.id} 題幹不是日文`);
      assert(question.options.length===4&&new Set(question.options).size===4,`${question.id} 選項不是四個唯一值`);
      assert(question.options.every((option)=>hasJapanese(option)&&!hasChineseMarker(option)),`${question.id} 含非日文選項`);
      assert(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,`${question.id} 答案索引錯誤`);
      assert(sourceText.includes(question.evidence),`${question.id} 的答案證據「${question.evidence}」不在素材中`);
      assert(hasChineseExplanation(question.explanation),`${question.id} 缺少中文解析`);
      sourceQuestions.set(question.id,{item,question});
    }
  }

  const cards=new Map([...vocabulary,...grammar].map((item)=>[item.id,item]));
  const examQuestionIds=new Set();
  const examSignatures=new Set();
  const usedSources=new Set();
  const requiredTypes=["漢字読み","表記","文法形式","内容理解","ポイント理解"];
  let examQuestionCount=0;
  for(const assessment of assessments){
    assert(assessment.questions.length===assessment.questionCount,`${assessment.id} 題數不符`);
    assert(requiredTypes.every((type)=>assessment.questions.some((question)=>question.type===type)),`${assessment.id} 題型有缺漏`);
    for(const question of assessment.questions){
      examQuestionCount+=1;
      assert(!examQuestionIds.has(question.id),`考題 ID 重複：${question.id}`); examQuestionIds.add(question.id);
      const signature=`${question.passage||""}|${question.audioText||""}|${question.prompt}`;
      assert(!examSignatures.has(signature),`考題內容重複：${question.id}`); examSignatures.add(signature);
      assert(hasJapanese(question.instruction)&&hasJapanese(question.prompt),`${question.id} 題目說明或題幹不是日文`);
      assert(question.options.length===4&&new Set(question.options).size===4,`${question.id} 選項重複或缺漏`);
      assert(question.options.every((option)=>hasJapanese(option)&&!hasChineseMarker(option)),`${question.id} 含非日文選項`);
      assert(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,`${question.id} 答案索引錯誤`);
      assert(hasChineseExplanation(question.explanationZh),`${question.id} 缺少作答後中文解析`);
      const sourceId=question.sourceQuestionId||question.sourceCardId;
      assert(sourceId&&!usedSources.has(sourceId),`${question.id} 重複使用來源 ${sourceId}`); usedSources.add(sourceId);
      if(question.sourceQuestionId){
        const source=sourceQuestions.get(question.sourceQuestionId);
        assert(source,`${question.id} 找不到來源題 ${question.sourceQuestionId}`);
        assert(question.prompt===source.question.prompt&&JSON.stringify(question.options)===JSON.stringify(source.question.options)&&question.answer===source.question.answer,`${question.id} 與來源題答案不一致`);
        const expectedText=source.item.category==="reading"?source.item.content:source.item.audioText;
        assert((question.passage||question.audioText)===expectedText,`${question.id} 與來源素材不一致`);
        assert(periods.indexOf(source.item.unlockPeriod)<=periods.indexOf(assessment.unlockPeriod),`${question.id} 使用尚未解鎖的素材`);
      }else{
        const card=cards.get(question.sourceCardId);
        assert(card,`${question.id} 找不到來源卡片 ${question.sourceCardId}`);
        const correct=question.options[question.answer];
        if(question.logic==="kanji-reading")assert(correct===card.reading,`${question.id} 漢字讀音答案錯誤`);
        if(question.logic==="orthography")assert(correct===card.term,`${question.id} 表記答案錯誤`);
        if(question.logic==="grammar-function")assert(correct===grammarFunctionJa(card.term)&&question.passage===card.examples[0].ja,`${question.id} 文法功能或例句錯誤`);
        assert(periods.indexOf(card.unlockPeriod)<=periods.indexOf(assessment.unlockPeriod),`${question.id} 使用尚未解鎖的卡片`);
      }
    }
  }
  assert(examQuestionCount===460,`考試總題數 ${examQuestionCount}，應為 460`);
  return {readingUnique:readingContents.size,listeningUnique:listeningScripts.size,sourceQuestions:sourceQuestions.size,examQuestions:examQuestionCount,uniqueExamSources:usedSources.size};
}

const questionAudit=auditGeneratedQuestions();

const index = { generatedAt:new Date().toISOString(), periods, counts:{vocabulary:vocabulary.length,grammar:grammar.length,reading:reading.length,listening:listening.length,monthlyChecks:12,n3Mocks:5,n2Mocks:2}, unlockSchedule:periods.map((period,i)=>({period,vocabulary:vocabCaps[i],grammar:grammarCaps[i]})), sources:[{name:"Language-Learning-decks",url:"https://github.com/vbvss199/Language-Learning-decks",license:"MIT / CC BY-SA 4.0 frequency data"},{name:"EDRDG/JMdict",url:"https://www.edrdg.org/",license:"EDRDG licence"},{name:"JLPT sample questions",url:"https://www.jlpt.jp/e/samples/sampleindex.html",use:"link only"}] };
if (!dryRun) {
  fs.mkdirSync(outRoot,{recursive:true});
  for (const period of periods) {
    const payload = { period, vocabulary:vocabulary.filter(x=>x.unlockPeriod===period), grammar:grammar.filter(x=>x.unlockPeriod===period), reading:reading.filter(x=>x.unlockPeriod===period), listening:listening.filter(x=>x.unlockPeriod===period), assessments:assessments.filter(x=>x.unlockPeriod===period) };
    fs.writeFileSync(path.join(outRoot,`${period}.json`),JSON.stringify(payload));
  }
  fs.writeFileSync(path.join(root,"public","content","index.json"),JSON.stringify(index,null,2));
}
console.log({...index.counts,assessments:assessments.length,questionAudit,dryRun});
if(printSamples)console.log(JSON.stringify({
  readingVariants:[0,13,26,39].map((position)=>reading[position]),
  listeningVariants:[0,13,26,39,52,65,78,91].map((position)=>listening[position]),
  monthlySample:assessments[0].questions.slice(0,6),
  n2MockSample:assessments.at(-1).questions.slice(-6)
},null,2));
if(printGrammarMap)console.log(JSON.stringify(Object.fromEntries(Object.entries(Object.groupBy(grammar,(item)=>grammarFunctionJa(item.term))).map(([key,items])=>[key,items.map((item)=>item.term)])),null,2));
