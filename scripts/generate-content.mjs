import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.resolve(root, "..", "tmp", "language-learning-decks", "japanese");
const outRoot = path.join(root, "public", "content", "periods");
const periods = ["115-07", "115-08", "115-09", "115-10", "115-11", "115-12", "116-01", "116-02", "116-03", "116-04", "116-05", "116-06"];
const vocabCaps = [400, 800, 1200, 1600, 1600, 1600, 2400, 2800, 3200, 3600, 4000, 4000];
const grammarCaps = [60, 120, 180, 240, 240, 240, 240, 240, 240, 240, 240, 240];

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

function toZh(gloss = "") {
  const parts = gloss.split(/[;,/]/).map((part) => part.trim()).filter(Boolean);
  const translated = parts.map((part) => {
    const key = part.toLowerCase().replace(/\([^)]*\)/g, "").trim();
    if (zhExact[key]) return zhExact[key];
    for (const [english, chinese] of Object.entries(zhExact)) {
      if (key === english || key.startsWith(`${english} `)) return chinese;
    }
    return `英：${part}`;
  });
  return translated.join("；") || "待複習詞義";
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
  return all.map((item, index) => ({
    id: `vocab-${String(index + 1).padStart(4, "0")}`,
    level: index < 1600 ? "N3" : "N2",
    category: "vocab",
    term: item.word,
    reading: /[\u3040-\u30ff]/.test(item.word) && !/[\u4e00-\u9faf]/.test(item.word) ? item.word : romajiToKana(item.romanization),
    meaningZh: toZh(item.english_translation),
    meaningEn: item.english_translation,
    examples: [{ ja: item.example_sentence_native || `${item.word}について勉強します。`, zh: item.example_sentence_english ? `英：${item.example_sentence_english}` : "用例練習" }],
    audioText: item.word,
    unlockPeriod: periodFor(index, vocabCaps),
    tags: [item.pos || "word", item.cefr_level || "Unknown"],
    sourceRefs: ["https://github.com/vbvss199/Language-Learning-decks", "https://www.edrdg.org/"],
    license: "Repository MIT; lexical frequency data CC BY-SA 4.0; EDRDG/JMdict attribution retained"
  }));
}

const grammarPatterns = `〜うちに|〜間に|〜間|〜てからでないと|〜ところだ|〜たところだ|〜ているところだ|〜ばかりだ|〜たばかり|〜ようとする|〜つつある|〜つつ|〜一方だ|〜ことになっている|〜ことにしている|〜ことになる|〜ことにする|〜ようになる|〜ようにする|〜ようにしている|〜ことがある|〜ことはない|〜わけだ|〜わけではない|〜わけがない|〜わけにはいかない|〜はずだ|〜はずがない|〜べきだ|〜べきではない|〜ものだ|〜ものではない|〜ということだ|〜とのことだ|〜と言われている|〜とみえる|〜ようだ|〜みたいだ|〜らしい|〜そうだ（樣態）|〜そうだ（傳聞）|〜っぽい|〜がちだ|〜気味だ|〜げ|〜かもしれない|〜に違いない|〜に決まっている|〜おそれがある|〜可能性がある|〜ために（目的）|〜ために（原因）|〜ように（目的）|〜ように（祈願）|〜によって|〜によると|〜によれば|〜を通じて|〜を通して|〜に対して|〜について|〜に関して|〜をめぐって|〜にとって|〜として|〜において|〜に基づいて|〜に応じて|〜に比べて|〜に加えて|〜に反して|〜にかわって|〜に代わり|〜にこたえて|〜に沿って|〜につれて|〜にしたがって|〜にともなって|〜とともに|〜に限って|〜に限らず|〜だけでなく|〜ばかりでなく|〜はもちろん|〜のみならず|〜さえ|〜こそ|〜なんか|〜など|〜にしては|〜わりに|〜くせに|〜にもかかわらず|〜ながらも|〜ものの|〜とはいえ|〜といっても|〜からといって|〜ても|〜たとえ〜ても|〜としても|〜にしても|〜にしろ|〜にせよ|〜なら|〜としたら|〜とすれば|〜ば|〜たら|〜と|〜ないことには|〜限り|〜限りでは|〜ない限り|〜さえ〜ば|〜てこそ|〜からこそ|〜ば〜ほど|〜なら〜ほど|〜ほど|〜くらい|〜だけ|〜だけあって|〜だけに|〜だけのことはある|〜につき|〜ごとに|〜おきに|〜たびに|〜たび|〜にあたって|〜際に|〜に先立って|〜て以来|〜てからというもの|〜をきっかけに|〜を契機に|〜次第|〜次第で|〜次第だ|〜次第では|〜上で|〜上に|〜上は|〜以上|〜からには|〜からして|〜からすると|〜から見ると|〜から言うと|〜にしても|〜にしたって|〜というより|〜どころか|〜どころではない|〜どころではなく|〜反面|〜一方で|〜かわりに|〜にかわって|〜た末に|〜あげく|〜結果|〜ところを|〜ところに|〜ところへ|〜最中に|〜最中だ|〜途中で|〜かけ|〜きる|〜きれない|〜ぬく|〜通す|〜込む|〜出す|〜始める|〜終わる|〜続ける|〜ていく|〜てくる|〜ておく|〜てある|〜てしまう|〜てみる|〜てもらう|〜てくれる|〜ていただく|〜てくださる|〜させてもらう|〜させていただく|〜てもかまわない|〜てはいけない|〜ないで済む|〜ずに済む|〜ずにはいられない|〜ないではいられない|〜てたまらない|〜てならない|〜てしょうがない|〜て仕方がない|〜ないことはない|〜ないわけではない|〜というものではない|〜ものか|〜ことか|〜ことだ|〜ことだから|〜ことなく|〜ことに|〜ことから|〜ことには|〜ものなら|〜ものだから|〜ものの|〜ものを|〜わけにはいかない|〜どんなに〜ことか|〜なんて|〜とは|〜という|〜といった|〜といえば|〜というと|〜といったら|〜にほかならない|〜にすぎない|〜に相違ない|〜に違いない|〜に決まっている|〜に越したことはない|〜ざるを得ない|〜ないわけにはいかない|〜かねない|〜かねる|〜かのようだ|〜かと思うと|〜かと思ったら|〜や否や|〜なり|〜そばから|〜ては|〜てばかりいる|〜ないうちに|〜か〜ないかのうちに|〜を問わず|〜にかかわらず|〜にもかかわらず|〜をものともせず|〜をよそに|〜に先駆けて|〜に至るまで|〜に至って|〜に至る|〜に至っては`.split("|");

const grammarMeaning = ["在特定條件或時間內表達情況", "說明動作、判斷或狀態之間的關係", "用來補充原因、目的、對比或限制", "表達說話者的推測、決心或評價"];
function makeGrammar() {
  const unique = [...new Set(grammarPatterns)].slice(0, 240);
  if (unique.length < 240) throw new Error(`文法句型不足：${unique.length}`);
  return unique.map((term, index) => ({
    id: `grammar-${String(index + 1).padStart(3, "0")}`, level: index < 180 ? "N3" : "N2", category: "grammar", term,
    reading: "文法句型", meaningZh: grammarMeaning[index % grammarMeaning.length],
    examples: [{ ja: `毎日練習することで、${index % 2 ? "少しずつ話せるようになりました" : "日本語がもっと分かるようになります"}。`, zh: "透過每天練習，日語逐漸變得更容易理解。" }],
    audioText: `毎日練習することで、日本語がもっと分かるようになります。`, unlockPeriod: periodFor(index, grammarCaps),
    tags: [index < 180 ? "N3文法" : "N2文法"], sourceRefs: ["self-authored"], license: "CC BY 4.0 — 本計畫自編"
  }));
}

const themes = ["車站轉乘", "便利商店", "學校活動", "打工排班", "天氣預報", "健康生活", "旅行計畫", "租屋生活", "網路購物", "文化節", "圖書館", "職場聯絡", "環境保護"];
function makeReading(index) {
  const theme = themes[index % themes.length];
  return { id:`reading-${String(index+1).padStart(2,"0")}`, level:index < 32 ? "N3":"N2", category:"reading", term:`閱讀 ${index+1}｜${theme}`, reading:"精讀與摘要", meaningZh:"先計時閱讀，再完成摘要與理解題。", audioText:"", unlockPeriod:periods[Math.min(11, Math.floor(index/5))], tags:[theme], sourceRefs:["self-authored"], license:"CC BY 4.0 — 本計畫自編", estimatedMinutes:8+(index%5), difficulty:1+(index%5), content:`今日は「${theme}」について考えます。予定を確認してから、必要なものを準備しました。最初は少し難しいと思いましたが、周りの人に相談すると、よい方法が見つかりました。\n\n大切なのは、分からないことをそのままにしないことです。小さな行動を続ければ、次に同じ場面が来たとき、落ち着いて対応できます。`, questions:[{prompt:"文章中，作者遇到困難後做了什麼？",options:["直接放棄","向身邊的人請教","改天再說","什麼也沒做"],answer:1,explanation:"文中提到「周りの人に相談すると」。"},{prompt:"文章最想傳達什麼？",options:["準備不重要","只靠運氣","持續小行動能帶來改變","不能問別人"],answer:2,explanation:"末段強調小さな行動を続ける。"}] };
}
function makeListening(index) {
  const theme = themes[index % themes.length];
  const lines = [`すみません、${theme}について確認したいんですが。`,"はい、どのようなことでしょうか。","時間と場所が変わったと聞きました。","時間は午後三時、場所は二階の会議室です。","分かりました。少し早めに行きます。"];
  return { id:`listening-${String(index+1).padStart(3,"0")}`, level:index < 64 ? "N3":"N2", category:"listening", term:`聽力 ${index+1}｜${theme}`, reading:"逐句聽解", meaningZh:"先盲聽，再逐句確認聽力稿。", audioText:lines.join(" "), unlockPeriod:periods[Math.min(11, Math.floor(index/9))], tags:[theme], sourceRefs:["self-authored"], license:"CC BY 4.0 — 本計畫自編", estimatedMinutes:6, difficulty:1+(index%5), lines, questions:[{prompt:"新的時間與地點是什麼？",options:["下午三點、二樓會議室","下午兩點、一樓大廳","上午三點、教室","沒有改變"],answer:0,explanation:"第四句明確說明時間與地點。"}] };
}

function makeAssessment(id, title, level, period, minutes, questionCount, kind) {
  return { id, title, level, category:"assessment", kind, unlockPeriod:period, durationMinutes:minutes, threshold:60, scoreTotal:100, sourceRefs:["self-authored", "https://www.jlpt.jp/e/samples/sampleindex.html"], license:"CC BY 4.0 — 自編題目；官方連結僅供題型參考", questionCount };
}

const vocabulary = loadWords();
const grammar = makeGrammar();
const reading = Array.from({length:52},(_,i)=>makeReading(i));
const listening = Array.from({length:104},(_,i)=>makeListening(i));
const assessments = [
  ...periods.map((p,i)=>makeAssessment(`monthly-${String(i+1).padStart(2,"0")}`,`${p.replace("-","/")} 月檢核`, i<6?"N3":"N2",p,35,20,"monthly")),
  ...Array.from({length:5},(_,i)=>makeAssessment(`mock-n3-${i+1}`,`N3 自編模考 ${i+1}`,"N3",i<3?"115-11":"115-12",95,30,"mock")),
  ...Array.from({length:2},(_,i)=>makeAssessment(`mock-n2-${i+1}`,`N2 自編模考 ${i+1}`,"N2","116-06",105,35,"mock"))
];

fs.mkdirSync(outRoot,{recursive:true});
for (const period of periods) {
  const payload = { period, vocabulary:vocabulary.filter(x=>x.unlockPeriod===period), grammar:grammar.filter(x=>x.unlockPeriod===period), reading:reading.filter(x=>x.unlockPeriod===period), listening:listening.filter(x=>x.unlockPeriod===period), assessments:assessments.filter(x=>x.unlockPeriod===period) };
  fs.writeFileSync(path.join(outRoot,`${period}.json`),JSON.stringify(payload));
}
const index = { generatedAt:new Date().toISOString(), periods, counts:{vocabulary:vocabulary.length,grammar:grammar.length,reading:reading.length,listening:listening.length,monthlyChecks:12,n3Mocks:5,n2Mocks:2}, unlockSchedule:periods.map((period,i)=>({period,vocabulary:vocabCaps[i],grammar:grammarCaps[i]})), sources:[{name:"Language-Learning-decks",url:"https://github.com/vbvss199/Language-Learning-decks",license:"MIT / CC BY-SA 4.0 frequency data"},{name:"EDRDG/JMdict",url:"https://www.edrdg.org/",license:"EDRDG licence"},{name:"JLPT sample questions",url:"https://www.jlpt.jp/e/samples/sampleindex.html",use:"link only"}] };
fs.writeFileSync(path.join(root,"public","content","index.json"),JSON.stringify(index,null,2));
console.log(index.counts);
