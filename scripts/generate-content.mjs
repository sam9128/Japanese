import fs from "node:fs";
import path from "node:path";
import { Converter } from "opencc-js";
import { grammarExamples } from "./source/grammar-examples.mjs";

const root = path.resolve(import.meta.dirname, "..");
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

const themes = ["駅の乗り換え", "コンビニ", "学校行事", "アルバイトの予定", "天気予報", "健康な生活", "旅行の計画", "部屋探し", "オンラインショッピング", "文化祭", "図書館", "職場での連絡", "環境保護"];
function makeReading(index) {
  const theme = themes[index % themes.length];
  return { id:`reading-${String(index+1).padStart(2,"0")}`, level:index < 32 ? "N3":"N2", category:"reading", term:`閱讀 ${index+1}｜${theme}`, reading:"精讀與摘要", meaningZh:"先計時閱讀，再完成摘要與理解題。", audioText:"", unlockPeriod:periods[Math.min(11, Math.floor(index/5))], tags:[theme], sourceRefs:["self-authored"], license:"CC BY 4.0 — 本計畫自編", estimatedMinutes:8+(index%5), difficulty:1+(index%5), content:`今日は「${theme}」について考えます。予定を確認してから、必要なものを準備しました。最初は少し難しいと思いましたが、周りの人に相談すると、よい方法が見つかりました。\n\n大切なのは、分からないことをそのままにしないことです。小さな行動を続ければ、次に同じ場面が来たとき、落ち着いて対応できます。`, questions:[{prompt:"文章中，作者遇到困難後做了什麼？",options:["直接放棄","向身邊的人請教","改天再說","什麼也沒做"],answer:1,explanation:"文中提到「周りの人に相談すると」。"},{prompt:"文章最想傳達什麼？",options:["準備不重要","只靠運氣","持續小行動能帶來改變","不能問別人"],answer:2,explanation:"末段強調小さな行動を続ける。"}] };
}
function makeListening(index) {
  const theme = themes[index % themes.length];
  const lines = [`すみません、${theme}について確認したいんですが。`,"はい、どのようなことでしょうか。","時間と場所が変わったと聞きました。","時間は午後三時、場所は二階の会議室です。","分かりました。少し早めに行きます。"];
  return { id:`listening-${String(index+1).padStart(3,"0")}`, level:index < 64 ? "N3":"N2", category:"listening", term:`聽力 ${index+1}｜${theme}`, reading:"逐句聽解", meaningZh:"先盲聽，再逐句確認聽力稿。", audioText:lines.join(" "), unlockPeriod:periods[Math.min(11, Math.floor(index/9))], tags:[theme], sourceRefs:["self-authored"], license:"CC BY 4.0 — 本計畫自編", estimatedMinutes:6, difficulty:1+(index%5), lines, questions:[{prompt:"新的時間與地點是什麼？",options:["下午三點、二樓會議室","下午兩點、一樓大廳","上午三點、教室","沒有改變"],answer:0,explanation:"第四句明確說明時間與地點。"}] };
}

function rotateOptions(correct, distractors, seed) {
  const options = [correct, ...distractors.filter((item) => item !== correct)].slice(0, 4);
  const shift = seed % options.length;
  const rotated = [...options.slice(shift), ...options.slice(0, shift)];
  return { options:rotated, answer:rotated.indexOf(correct) };
}

function grammarFunctionJa(term) {
  if (/(ば|たら|なら|としたら|ないことには|限り)/.test(term)) return "条件や仮定を表している";
  if (/(ために|ように)/.test(term)) return "目的や理由を表している";
  if (/(ものの|にもかかわらず|ながらも|くせに|わりに|反面)/.test(term)) return "予想と異なる結果や対比を表している";
  if (/(ようだ|みたいだ|らしい|そうだ|かもしれない|に違いない)/.test(term)) return "推量や伝聞を表している";
  if (/(うちに|間|ところ|最中|際|以来|たび)/.test(term)) return "時間や動作の前後関係を表している";
  if (/(だけ|しか|限って|のみならず|さえ|こそ)/.test(term)) return "範囲の限定や強調を表している";
  return "動作・状態と話し手の判断の関係を表している";
}

function makeExamQuestions(id, level, period, questionCount, catalog) {
  const maxPeriod = periods.indexOf(period);
  const unlocked = (items) => items.filter((item) => periods.indexOf(item.unlockPeriod) <= maxPeriod);
  const vocabPool = unlocked(catalog.vocabulary).filter((item) => level === "N2" || item.level === "N3");
  const kanjiPool = vocabPool.filter((item) => /[\u3400-\u9fff]/.test(item.term));
  const grammarPool = unlocked(catalog.grammar).filter((item) => level === "N2" || item.level === "N3");
  const readingPool = unlocked(catalog.reading).filter((item) => level === "N2" || item.level === "N3");
  const listeningPool = unlocked(catalog.listening).filter((item) => level === "N2" || item.level === "N3");
  const seedBase = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({length:questionCount}, (_, index) => {
    const seed = seedBase * 17 + index * 13;
    const type = index % 5;
    if (type === 0) {
      const item = readingPool[seed % readingPool.length];
      const lessonTitle = item.term.replace(/^閱讀/, "読解");
      const choice = rotateOptions("分からないことは周りの人に相談することが大切だ。", ["難しいことはすぐにあきらめたほうがよい。","準備をしなくても運がよければ問題はない。","一人で何でも決め、他の人には聞かないほうがよい。"], seed);
      return { id:`${id}-q${index+1}`, section:"読解", type:"内容理解", instruction:"次の文章を読んで、質問に答えなさい。", passage:item.content, prompt:`文章の内容と合っているものはどれですか。（${lessonTitle}）`, ...choice, explanationZh:"文章指出遇到不懂的事情時應向身邊的人請教，持續小行動能讓下次應對得更好。" };
    }
    if (type === 1) {
      const item = vocabPool[seed % vocabPool.length];
      const others = [1,2,3].map((offset) => vocabPool[(seed + offset * 19) % vocabPool.length].term);
      const sentence = item.examples[0].ja.replaceAll(item.term, "（　　）");
      const choice = rotateOptions(item.term, others, seed);
      return { id:`${id}-q${index+1}`, section:"言語知識", type:"文脈規定", instruction:"（　　）に入る最もよいものを一つ選びなさい。", prompt:sentence, ...choice, explanationZh:`正確答案是「${item.term}」（${item.reading}），中文意思是「${item.meaningZh}」。` };
    }
    if (type === 2) {
      const item = kanjiPool[seed % kanjiPool.length];
      const others = [1,2,3].map((offset) => kanjiPool[(seed + offset * 23) % kanjiPool.length].reading);
      const choice = rotateOptions(item.reading, others, seed);
      return { id:`${id}-q${index+1}`, section:"言語知識", type:"漢字読み", instruction:"＿＿＿の言葉の読み方として最もよいものを一つ選びなさい。", prompt:`「${item.term}」の読み方はどれですか。`, ...choice, explanationZh:`「${item.term}」讀作「${item.reading}」，中文意思是「${item.meaningZh}」。` };
    }
    if (type === 3) {
      const item = grammarPool[seed % grammarPool.length];
      const correct = grammarFunctionJa(item.term);
      const choice = rotateOptions(correct, ["人や物の数を表している","過去の事実だけを列挙している","相手への命令だけを表している"], seed);
      return { id:`${id}-q${index+1}`, section:"文法", type:"文法形式", instruction:"次の文の文法の働きとして最もよいものを一つ選びなさい。", passage:item.examples[0].ja, prompt:`「${item.term}」は、この文でどのような意味を表していますか。`, ...choice, explanationZh:`本題句型是「${item.term}」。${item.meaningZh} 例句：${item.examples[0].ja}` };
    }
    const item = listeningPool[seed % listeningPool.length];
    const lessonTitle = item.term.replace(/^聽力/, "聴解");
    const choice = rotateOptions("時間は午後三時で、場所は二階の会議室だ。", ["時間は午後二時で、場所は一階のロビーだ。","時間も場所もまだ決まっていない。","会議は中止になり、今日は行かなくてもよい。"], seed);
    return { id:`${id}-q${index+1}`, section:"聴解", type:"ポイント理解", instruction:"音声を聞いて、内容と合っているものを一つ選びなさい。", prompt:`${lessonTitle}について、正しいものはどれですか。`, audioText:item.audioText, ...choice, explanationZh:"對話中明確說明新的時間是下午三點，地點是二樓會議室。作答前可重播一次確認關鍵資訊。" };
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

fs.mkdirSync(outRoot,{recursive:true});
for (const period of periods) {
  const payload = { period, vocabulary:vocabulary.filter(x=>x.unlockPeriod===period), grammar:grammar.filter(x=>x.unlockPeriod===period), reading:reading.filter(x=>x.unlockPeriod===period), listening:listening.filter(x=>x.unlockPeriod===period), assessments:assessments.filter(x=>x.unlockPeriod===period) };
  fs.writeFileSync(path.join(outRoot,`${period}.json`),JSON.stringify(payload));
}
const index = { generatedAt:new Date().toISOString(), periods, counts:{vocabulary:vocabulary.length,grammar:grammar.length,reading:reading.length,listening:listening.length,monthlyChecks:12,n3Mocks:5,n2Mocks:2}, unlockSchedule:periods.map((period,i)=>({period,vocabulary:vocabCaps[i],grammar:grammarCaps[i]})), sources:[{name:"Language-Learning-decks",url:"https://github.com/vbvss199/Language-Learning-decks",license:"MIT / CC BY-SA 4.0 frequency data"},{name:"EDRDG/JMdict",url:"https://www.edrdg.org/",license:"EDRDG licence"},{name:"JLPT sample questions",url:"https://www.jlpt.jp/e/samples/sampleindex.html",use:"link only"}] };
fs.writeFileSync(path.join(root,"public","content","index.json"),JSON.stringify(index,null,2));
console.log(index.counts);
