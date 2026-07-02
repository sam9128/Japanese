import { useEffect, useMemo, useRef, useState } from "react";
import { currentRocPeriod, formatPeriod, isUnlocked, loadStudyData, PERIODS } from "./data";
import { getAll, loadSnapshot, migrateLegacyProgress, put, restoreSnapshot } from "./db";
import { getJapaneseVoices, speakJapanese, stopSpeech } from "./speech";

const NAV = [["today","今日學習","今"],["library","教材庫","本"],["media","閱讀聽力","聽"],["mock","模考","試"],["progress","進度成果","績"],["settings","設定","設"]];
const EMPTY = { vocabulary:[], grammar:[], reading:[], listening:[], assessments:[], index:{counts:{}} };

function useLearningStore() {
  const [progress, setProgress] = useState({});
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState([]);
  useEffect(() => { migrateLegacyProgress().then(async () => {
    setProgress(Object.fromEntries((await getAll("cardProgress")).map((x) => [x.id,x])));
    setEvents(await getAll("studyEvents")); setResults(await getAll("assessmentResults"));
  }); }, []);
  async function rate(item, rating, detail = {}) {
    const record = { id:item.id, rating, attempts:(progress[item.id]?.attempts || 0)+1, updatedAt:new Date().toISOString() };
    const event = { id:crypto.randomUUID(), cardId:item.id, category:item.category, rating, occurredAt:record.updatedAt, ...detail };
    await Promise.all([put("cardProgress",record),put("studyEvents",event)]);
    setProgress((old)=>({...old,[item.id]:record})); setEvents((old)=>[...old,event]);
  }
  async function saveResult(result) { await put("assessmentResults",result); setResults((old)=>[...old.filter(x=>x.id!==result.id),result]); }
  return { progress, events, results, rate, saveResult, reload:()=>location.reload() };
}

function Header({ view, setView, completed, menuOpen, setMenuOpen }) {
  return <><header className="topbar"><button className="brand" onClick={()=>setView("today")}>日語階梯 <span>N3 → N2</span></button><nav>{NAV.map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}</nav><div className="header-progress"><strong>{completed}</strong><span>已完成</span></div><button className="hamburger" onClick={()=>setMenuOpen(!menuOpen)} aria-label="開啟選單">☰</button></header>{menuOpen&&<div className="drawer">{NAV.map(([id,label])=><button key={id} onClick={()=>{setView(id);setMenuOpen(false)}}>{label}</button>)}</div>}</>;
}

function PeriodRail({ activePeriod, setActivePeriod, data }) {
  const currentIndex=PERIODS.indexOf(currentRocPeriod());
  return <aside className="period-rail"><div><small>年度路線</small><strong>N3 → N2</strong></div>{PERIODS.map((period,i)=>{const locked=currentIndex>=0&&i>currentIndex; return <button key={period} disabled={locked} className={period===activePeriod?"active":""} onClick={()=>!locked&&setActivePeriod(period)}><span>{formatPeriod(period)}</span><b>{locked?"鎖定":i<6?"N3":"N2"}</b></button>})}<p>目前可學<br/><strong>{data.vocabulary.filter(x=>isUnlocked(x,activePeriod)).length.toLocaleString()}</strong> 單字</p></aside>;
}

function TodayView({ data, activePeriod, store, settings, goMedia }) {
  const unlocked = useMemo(()=>({v:data.vocabulary.filter(x=>isUnlocked(x,activePeriod)),g:data.grammar.filter(x=>isUnlocked(x,activePeriod)),r:data.reading.filter(x=>isUnlocked(x,activePeriod)),l:data.listening.filter(x=>isUnlocked(x,activePeriod))}),[data,activePeriod]);
  const cards = useMemo(()=>[...unlocked.v.slice(0,6),...unlocked.g.slice(0,3)], [unlocked]);
  const [index,setIndex]=useState(0); const [revealed,setRevealed]=useState(false); const card=cards[index%Math.max(1,cards.length)];
  const doneToday=store.events.filter(x=>x.occurredAt?.slice(0,10)===new Date().toISOString().slice(0,10)).length;
  async function rate(value){await store.rate(card,value);setRevealed(false);setIndex((x)=>(x+1)%cards.length)}
  if(!card)return <Empty text="這個月份尚無可學教材。"/>;
  return <section className="today-view"><div className="page-intro"><div><span className="eyebrow">TODAY · {formatPeriod(activePeriod)}</span><h1>把零碎時間，疊成日語實力。</h1><p>今天約 20 分鐘：6 個單字、3 個文法，再選一組閱讀或聽力。</p></div><div className="today-ring"><strong>{doneToday}</strong><span>/ 10</span><small>今日完成</small></div></div>
    <div className="dashboard-grid"><div className="lesson-card"><div className="lesson-top"><span>{card.level} · {card.category==="vocab"?"單字":"文法"}</span><button onClick={()=>speakJapanese(card.audioText,settings)}>▶ 播放</button></div><div className="card-main" onClick={()=>setRevealed(true)}><h2>{card.term}</h2><p className="reading">{card.reading}</p>{revealed?<div className="answer"><strong>{card.meaningZh}</strong><p>{card.examples?.[0]?.ja}</p><small>{card.examples?.[0]?.zh}</small></div>:<button className="reveal">翻卡看答案</button>}</div><div className="rating-row"><button onClick={()=>rate("again")}>再一次</button><button onClick={()=>rate("hard")}>有點難</button><button onClick={()=>rate("good")}>記得</button><button onClick={()=>rate("easy")}>很熟</button></div><footer><button onClick={()=>{setIndex((index-1+cards.length)%cards.length);setRevealed(false)}}>← 上一張</button><span>{index+1} / {cards.length}</span><button onClick={()=>{setIndex((index+1)%cards.length);setRevealed(false)}}>下一張 →</button></footer></div>
      <aside className="today-side"><h3>接下來</h3><button className="task" onClick={()=>goMedia("reading")}><b>08 分</b><span>閱讀理解<br/><small>{unlocked.r[0]?.term || "本月閱讀"}</small></span></button><button className="task" onClick={()=>goMedia("listening")}><b>06 分</b><span>逐句聽力<br/><small>{unlocked.l[0]?.term || "本月聽力"}</small></span></button><div className="week-card"><span>本週節奏</span><strong>{store.events.filter(x=>Date.now()-new Date(x.occurredAt)<604800000).length} 次練習</strong><p>錯題會自動留在教材庫供你重練。</p></div></aside></div></section>;
}

function LibraryView({data,activePeriod,store,settings}) {
  const [query,setQuery]=useState(""); const [type,setType]=useState("vocabulary"); const [onlyWeak,setOnlyWeak]=useState(false);
  const items=useMemo(()=>data[type].filter(x=>isUnlocked(x,activePeriod)).filter(x=>!onlyWeak||store.progress[x.id]?.rating==="hard").filter(x=>`${x.term}${x.reading}${x.meaningZh}`.toLowerCase().includes(query.toLowerCase())).slice(0,120),[data,type,query,onlyWeak,store.progress,activePeriod]);
  return <section><PageTitle eyebrow="LIBRARY" title="教材庫" text="搜尋、播放與重練目前已解鎖的教材。"/><div className="toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋單字、讀音或意思"/><select value={type} onChange={e=>setType(e.target.value)}><option value="vocabulary">單字</option><option value="grammar">文法</option></select><label><input type="checkbox" checked={onlyWeak} onChange={e=>setOnlyWeak(e.target.checked)}/> 只看錯題</label></div><div className="library-list">{items.map(item=><article key={item.id}><span className="level-pill">{item.level}</span><div><h3>{item.term} <small>{item.reading}</small></h3><p>{item.meaningZh}</p></div><button onClick={()=>speakJapanese(item.audioText,settings)}>▶</button><b className={store.progress[item.id]?.rating||"new"}>{store.progress[item.id]?.rating||"未學"}</b></article>)}</div>{!items.length&&<Empty text="沒有符合條件的教材。"/>}</section>;
}

function MediaView({data,activePeriod,settings,store,initialType}) {
  const [type,setType]=useState(initialType||"reading"); const list=data[type].filter(x=>isUnlocked(x,activePeriod)); const [selected,setSelected]=useState(0); const item=list[selected%Math.max(1,list.length)]; const [started,setStarted]=useState(null); const [elapsed,setElapsed]=useState(0); const [transcript,setTranscript]=useState(false); const [answer,setAnswer]=useState(null); const [replays,setReplays]=useState(0);
  useEffect(()=>{if(!started)return;const id=setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(id)},[started]);
  useEffect(()=>{setSelected(0);setAnswer(null);setTranscript(false)},[type,activePeriod]);
  if(!item)return <Empty text="這個月份尚無閱讀／聽力教材。"/>;
  const question=item.questions[0];
  return <section><PageTitle eyebrow="READ · LISTEN" title="閱讀聽力" text="先作答，再看稿與解析；系統會記下重播與錯因。"/><div className="segmented"><button className={type==="reading"?"active":""} onClick={()=>setType("reading")}>閱讀 52</button><button className={type==="listening"?"active":""} onClick={()=>setType("listening")}>聽力 104</button></div><div className="media-layout"><aside className="lesson-list">{list.slice(0,30).map((x,i)=><button key={x.id} className={i===selected?"active":""} onClick={()=>{setSelected(i);setAnswer(null);setTranscript(false)}}><b>{String(i+1).padStart(2,"0")}</b><span>{x.term}<small>{x.estimatedMinutes} 分鐘 · 難度 {x.difficulty}</small></span></button>)}</aside><article className="media-workspace"><div className="media-head"><div><span>{item.level} · {type==="reading"?"精讀":"逐句聽解"}</span><h2>{item.term}</h2></div><div className="timer">{String(Math.floor(elapsed/60)).padStart(2,"0")}:{String(elapsed%60).padStart(2,"0")}<button onClick={()=>setStarted(started?null:Date.now()-elapsed*1000)}>{started?"暫停":"計時"}</button></div></div>{type==="reading"?<div className="reading-copy">{item.content.split("\n").map((p,i)=><p key={i}>{p}</p>)}<textarea placeholder="用 2–3 句寫下摘要…"/></div>:<div className="listening-player"><button className="play-big" onClick={()=>{speakJapanese(item.audioText,settings);setReplays(x=>x+1)}}>▶</button><div><strong>完整播放</strong><p>速度 {settings.rate}× · 已重播 {replays} 次</p></div><button onClick={stopSpeech}>停止</button><div className="line-buttons">{item.lines.map((line,i)=><button key={i} onClick={()=>{speakJapanese(line,settings);setReplays(x=>x+1)}}>第 {i+1} 句 ▶</button>)}</div><button className="text-button" onClick={()=>setTranscript(!transcript)}>{transcript?"隱藏":"顯示"}聽力稿</button>{transcript&&<div className="transcript">{item.lines.map((x,i)=><p key={i}>{x}</p>)}</div>}</div>}<div className="question"><h3>{question.prompt}</h3>{question.options.map((option,i)=><button key={option} className={answer===i?(i===question.answer?"correct":"wrong"):""} onClick={()=>{setAnswer(i);store.rate(item,i===question.answer?"good":"hard",{replays,answer:i})}}>{String.fromCharCode(65+i)}. {option}</button>)}{answer!==null&&<p className="explanation">{answer===question.answer?"答對了。":"再聽一次關鍵句。"} {question.explanation}</p>}</div></article></div></section>;
}

function MockView({data,activePeriod,store}) {
  const list=data.assessments.filter(x=>isUnlocked(x,activePeriod)); const [exam,setExam]=useState(null); const [answers,setAnswers]=useState({}); const [seconds,setSeconds]=useState(0);
  useEffect(()=>{if(!exam)return;const id=setInterval(()=>setSeconds(x=>x+1),1000);return()=>clearInterval(id)},[exam]);
  const questions=useMemo(()=>exam?data.vocabulary.filter(x=>isUnlocked(x,activePeriod)).slice(0,Math.min(exam.questionCount,10)).map((word,i)=>({word,options:[word.meaningZh,...data.vocabulary.slice(i+1,i+4).map(x=>x.meaningZh)].sort((a,b)=>a.localeCompare(b))})):[],[exam,data,activePeriod]);
  async function finish(){const correct=questions.filter((q,i)=>q.options[answers[i]]===q.word.meaningZh).length;const score=Math.round(correct/questions.length*100);await store.saveResult({id:`${exam.id}-${Date.now()}`,assessmentId:exam.id,title:exam.title,score,seconds,completedAt:new Date().toISOString()});setExam(null);setAnswers({});setSeconds(0);alert(`完成：${score} 分`)}
  if(exam)return <section><PageTitle eyebrow="SIMULATION" title={exam.title} text={`自編練習 · ${exam.durationMinutes} 分鐘 · 及格 ${exam.threshold} 分`}/><div className="exam-clock">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</div><div className="exam-sheet">{questions.map((q,i)=><fieldset key={q.word.id}><legend>{i+1}. 「{q.word.term}」最適合的意思是？</legend>{q.options.map((o,j)=><label key={o}><input type="radio" name={`q${i}`} checked={answers[i]===j} onChange={()=>setAnswers(x=>({...x,[i]:j}))}/>{o}</label>)}</fieldset>)}<button className="primary" onClick={finish} disabled={Object.keys(answers).length<questions.length}>交卷並查看成績</button></div></section>;
  return <section><PageTitle eyebrow="ASSESSMENT" title="月檢核與模考" text="全部為自編題目；官方資源只提供題型參考連結。"/><div className="assessment-grid">{list.map(x=><article key={x.id}><span>{x.level} · {x.kind==="monthly"?"月檢核":"完整模考"}</span><h3>{x.title}</h3><p>{x.durationMinutes} 分鐘 · {x.questionCount} 題 · 門檻 {x.threshold}</p><button onClick={()=>setExam(x)}>開始作答</button></article>)}</div><a className="source-link" href="https://www.jlpt.jp/e/samples/sampleindex.html" target="_blank" rel="noreferrer">JLPT 官方題型與著作權說明 ↗</a></section>;
}

function ProgressView({data,activePeriod,store}) {
  const unlocked=[...data.vocabulary,...data.grammar,...data.reading,...data.listening].filter(x=>isUnlocked(x,activePeriod)); const learned=Object.keys(store.progress).filter(id=>unlocked.some(x=>x.id===id)).length; const rate=unlocked.length?Math.round(learned/unlocked.length*100):0; const weak=Object.values(store.progress).filter(x=>x.rating==="hard").length;
  function exportCsv(){const rows=[["月份","原訂累積單字","原訂累積文法","實際完成","完成率","弱點數"],...data.index.unlockSchedule.map(x=>[x.period,x.vocabulary,x.grammar,store.events.filter(e=>e.occurredAt?.startsWith(`${Number(x.period.slice(0,3))+1911}-${x.period.slice(4)}`)).length,`${rate}%`,weak])];download(`日語階梯成果-${activePeriod}.csv`,rows.map(r=>r.map(csvCell).join(",")).join("\n"),"text/csv;charset=utf-8")}
  return <section><PageTitle eyebrow="PROGRESS" title="進度成果" text="每次練習都只保存在這台裝置；可輸出 CSV 或直接列印。"/><div className="metric-grid"><article><span>已學教材</span><strong>{learned.toLocaleString()}</strong><small>/ {unlocked.length.toLocaleString()}</small></article><article><span>目前完成率</span><strong>{rate}%</strong><small>依解鎖內容計算</small></article><article><span>需加強</span><strong>{weak}</strong><small>評為「有點難」</small></article><article><span>檢核完成</span><strong>{store.results.length}</strong><small>/ 19 次</small></article></div><div className="report-card"><div><span>月報 · {formatPeriod(activePeriod)}</span><h2>計畫與實際進度</h2></div><div className="progress-bar"><i style={{width:`${rate}%`}}/></div><p>原訂：單字 {data.index.unlockSchedule.find(x=>x.period===activePeriod)?.vocabulary}、文法 {data.index.unlockSchedule.find(x=>x.period===activePeriod)?.grammar}。目前記錄 {store.events.length} 次學習事件。</p><label>老師回饋<textarea placeholder="列印後可書寫，或先在此輸入回饋…"/></label><div><button className="primary" onClick={exportCsv}>匯出 CSV</button><button onClick={()=>window.print()}>列印成果報告</button></div></div></section>;
}

function SettingsView({settings,setSettings,onRestored}) {
  const [voices,setVoices]=useState([]); const [preview,setPreview]=useState(null); const fileRef=useRef();
  useEffect(()=>{const update=()=>setVoices(getJapaneseVoices());update();speechSynthesis?.addEventListener?.("voiceschanged",update);return()=>speechSynthesis?.removeEventListener?.("voiceschanged",update)},[]);
  async function backup(){const snapshot=await loadSnapshot();download(`nihongo-stairs-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({backupVersion:2,createdAt:new Date().toISOString(),...snapshot},null,2),"application/json")}
  async function chooseFile(event){try{const json=JSON.parse(await event.target.files[0].text());if(json.backupVersion!==2)throw new Error("備份版本不符");setPreview(json)}catch(error){alert(`無法讀取備份：${error.message}`)}}
  async function restore(){await restoreSnapshot(preview);setPreview(null);onRestored()}
  return <section><PageTitle eyebrow="SETTINGS" title="設定與資料" text="調整日語播放，管理離線資料與跨裝置備份。"/><div className="settings-grid"><article><h3>日語語音</h3><label>速度 <output>{settings.rate}×</output><input type="range" min="0.6" max="1.3" step="0.05" value={settings.rate} onChange={e=>setSettings(x=>({...x,rate:Number(e.target.value)}))}/></label><label>語音<select value={settings.voiceURI} onChange={e=>setSettings(x=>({...x,voiceURI:e.target.value}))}><option value="">自動選擇</option>{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}</select></label><button onClick={()=>speakJapanese("毎日少しずつ、前へ進みましょう。",settings)}>測試播放</button>{!voices.length&&<p className="warning">找不到日語語音。請至 Android「文字轉語音輸出」下載日文語音資料。</p>}</article><article><h3>備份與還原</h3><p>JSON 包含進度、學習事件、檢核結果、報告與設定。</p><button className="primary" onClick={backup}>匯出 JSON 備份</button><button onClick={()=>fileRef.current.click()}>選擇備份檔</button><input ref={fileRef} hidden type="file" accept="application/json" onChange={chooseFile}/>{preview&&<div className="restore-preview"><b>備份預覽</b><p>{new Date(preview.createdAt).toLocaleString()} · {(preview.studyEvents||[]).length} 筆事件</p><strong>確認後會完整覆蓋本機資料，不會合併。</strong><button className="danger" onClick={restore}>確認覆蓋</button></div>}</article><article><h3>安裝與離線</h3><p>Android Chrome：選單 →「新增至主畫面」或「安裝應用程式」。首次連線後，教材可離線重開。</p><span className="status-dot">● 僅儲存在本機</span></article><article><h3>內容來源</h3><p><a href="https://www.edrdg.org/" target="_blank" rel="noreferrer">EDRDG / JMdict ↗</a></p><p><a href="https://tadoku.org/japanese/en/free-books-en/" target="_blank" rel="noreferrer">Tadoku 延伸閱讀 ↗</a></p><p><a href="https://minato-jf.jp/" target="_blank" rel="noreferrer">Minato 線上課程 ↗</a></p></article></div></section>;
}

function PageTitle({eyebrow,title,text}){return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>}
function Empty({text}){return <div className="empty">{text}</div>}
function csvCell(value){return `"${String(value).replaceAll('"','""')}"`}
function download(name,content,type){const url=URL.createObjectURL(new Blob(["\uFEFF",content],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}

export default function App(){
  const [data,setData]=useState(EMPTY); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [view,setView]=useState("today"); const [menuOpen,setMenuOpen]=useState(false); const [initialMedia,setInitialMedia]=useState("reading"); const now=currentRocPeriod(); const [activePeriod,setActivePeriod]=useState(PERIODS.includes(now)?now:PERIODS[0]); const [settings,setSettings]=useState({rate:.85,voiceURI:""}); const store=useLearningStore();
  useEffect(()=>{loadStudyData().then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
  useEffect(()=>{put("settings",{id:"tts",value:settings})},[settings]);
  useEffect(()=>{getAll("settings").then(xs=>{const saved=xs.find(x=>x.id==="tts")?.value;if(saved)setSettings(saved)})},[]);
  if(loading)return <div className="loading-screen"><b>日語階梯</b><span>正在整理全年教材…</span></div>;
  if(error)return <div className="loading-screen"><b>教材載入失敗</b><span>{error}</span></div>;
  const completed=Object.keys(store.progress).length;
  return <div className="app-shell"><Header view={view} setView={setView} completed={completed} menuOpen={menuOpen} setMenuOpen={setMenuOpen}/><div className="app-body"><PeriodRail activePeriod={activePeriod} setActivePeriod={setActivePeriod} data={data}/><main>{view==="today"&&<TodayView data={data} activePeriod={activePeriod} store={store} settings={settings} goMedia={(type)=>{setInitialMedia(type);setView("media")}}/>}{view==="library"&&<LibraryView data={data} activePeriod={activePeriod} store={store} settings={settings}/>} {view==="media"&&<MediaView data={data} activePeriod={activePeriod} settings={settings} store={store} initialType={initialMedia}/>} {view==="mock"&&<MockView data={data} activePeriod={activePeriod} store={store}/>} {view==="progress"&&<ProgressView data={data} activePeriod={activePeriod} store={store}/>} {view==="settings"&&<SettingsView settings={settings} setSettings={setSettings} onRestored={store.reload}/>}</main></div><nav className="bottom-nav">{NAV.slice(0,5).map(([id,label,icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><b>{icon}</b><span>{label.replace("學習","")}</span></button>)}</nav></div>;
}
