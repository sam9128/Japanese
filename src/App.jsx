import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  currentRocPeriod,
  formatPeriod,
  isUnlocked,
  loadStudyData,
  PERIODS,
} from "./data";
import {
  getAll,
  loadSnapshot,
  migrateLegacyProgress,
  put,
  restoreSnapshot,
} from "./db";
import { getJapaneseVoices, speakJapanese, stopSpeech } from "./speech";
import AuthPanel from "./AuthPanel";
import { useCloudAccount } from "./useCloudAccount";

const NAV = [
  ["today", "今日學習", "今"],
  ["library", "教材庫", "本"],
  ["media", "閱讀聽力", "聽"],
  ["mock", "模考", "試"],
  ["progress", "進度成果", "績"],
  ["settings", "設定", "設"],
];
const EMPTY = {
  vocabulary: [],
  grammar: [],
  reading: [],
  listening: [],
  assessments: [],
  index: { counts: {} },
};
const STRONG_RATINGS = new Set(["good", "easy"]);
const DEFAULT_PAGE_STATES = {
  today: { index: 0, revealed: false, scrollY: 0 },
  library: { query: "", type: "vocabulary", onlyWeak: false, scrollY: 0 },
  media: {
    type: "reading",
    selected: 0,
    transcript: false,
    answers: {},
    replays: 0,
    elapsed: 0,
    startedAt: null,
    summaries: {},
    scrollY: 0,
  },
  mock: {
    examId: null,
    answers: {},
    startedAt: null,
    review: null,
    scrollY: 0,
  },
  progress: { feedback: "", scrollY: 0 },
  settings: { scrollY: 0 },
};

function mergeUiSession(saved, defaultPeriod) {
  const pages = Object.fromEntries(
    Object.entries(DEFAULT_PAGE_STATES).map(([key, value]) => [
      key,
      { ...value, ...(saved?.pages?.[key] || {}) },
    ]),
  );
  return {
    view: NAV.some(([id]) => id === saved?.view) ? saved.view : "today",
    activePeriod: PERIODS.includes(saved?.activePeriod)
      ? saved.activePeriod
      : defaultPeriod,
    pages,
    updatedAt: saved?.updatedAt || new Date(0).toISOString(),
  };
}

function useUiSession(defaultPeriod) {
  const [session, setSession] = useState(() =>
    mergeUiSession(null, defaultPeriod),
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getAll("settings")
      .then((items) => {
        let local = null;
        try {
          local = JSON.parse(localStorage.getItem("nihongo-stairs-ui-session"));
        } catch {
          /* ignore malformed local mirror */
        }
        const stored = items.find((item) => item.id === "ui-session")?.value;
        const saved =
          new Date(local?.updatedAt || 0) > new Date(stored?.updatedAt || 0)
            ? local
            : stored;
        setSession(mergeUiSession(saved, defaultPeriod));
      })
      .finally(() => setReady(true));
  }, [defaultPeriod]);
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("nihongo-stairs-ui-session", JSON.stringify(session));
    void put("settings", { id: "ui-session", value: session });
  }, [ready, session]);
  const updatePage = useCallback(
    (page, updater) =>
      setSession((current) => {
        const previous = current.pages[page] || {};
        const next =
          typeof updater === "function"
            ? updater(previous)
            : { ...previous, ...updater };
        return {
          ...current,
          pages: { ...current.pages, [page]: next },
          updatedAt: new Date().toISOString(),
        };
      }),
    [],
  );
  const setView = useCallback(
    (nextView) =>
      setSession((current) => ({
        ...current,
        view: nextView,
        pages: {
          ...current.pages,
          [current.view]: {
            ...current.pages[current.view],
            scrollY: window.scrollY,
          },
        },
        updatedAt: new Date().toISOString(),
      })),
    [],
  );
  const setActivePeriod = useCallback(
    (activePeriod) =>
      setSession((current) => ({
        ...current,
        activePeriod,
        updatedAt: new Date().toISOString(),
      })),
    [],
  );
  return { session, ready, updatePage, setView, setActivePeriod };
}

function buildDailyBatches(vocabulary, grammar) {
  const count = Math.max(
    Math.ceil(vocabulary.length / 6),
    Math.ceil(grammar.length / 3),
  );
  return Array.from({ length: count }, (_, index) => [
    ...vocabulary.slice(index * 6, index * 6 + 6),
    ...grammar.slice(index * 3, index * 3 + 3),
  ]).filter((batch) => batch.length);
}

function useLearningStore() {
  const [progress, setProgress] = useState({});
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    migrateLegacyProgress()
      .then(async () => {
        const [savedProgress, savedEvents, savedResults] = await Promise.all([
          getAll("cardProgress"),
          getAll("studyEvents"),
          getAll("assessmentResults"),
        ]);
        setProgress(Object.fromEntries(savedProgress.map((x) => [x.id, x])));
        setEvents(savedEvents);
        setResults(savedResults);
      })
      .finally(() => setReady(true));
  }, []);
  async function rate(item, rating, detail = {}) {
    const record = {
      id: item.id,
      rating,
      attempts: (progress[item.id]?.attempts || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    const event = {
      id: crypto.randomUUID(),
      cardId: item.id,
      category: item.category,
      rating,
      occurredAt: record.updatedAt,
      ...detail,
    };
    await Promise.all([put("cardProgress", record), put("studyEvents", event)]);
    setProgress((old) => ({ ...old, [item.id]: record }));
    setEvents((old) => [...old, event]);
  }
  async function saveResult(result) {
    await put("assessmentResults", result);
    setResults((old) => [...old.filter((x) => x.id !== result.id), result]);
  }
  return {
    progress,
    events,
    results,
    ready,
    rate,
    saveResult,
    reload: () => location.reload(),
  };
}

function Header({ view, setView, completed, menuOpen, setMenuOpen, cloud }) {
  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => setView("today")}>
          日語階梯 <span>N3 → N2</span>
        </button>
        <nav>
          {NAV.map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          className={`account-chip ${cloud.status}`}
          onClick={() => setView("settings")}
          title={cloud.user?.email || "登入後可跨裝置同步"}
        >
          <i />
          {cloud.user ? "已登入" : "登入"}
        </button>
        <div className="header-progress">
          <strong>{completed}</strong>
          <span>已完成</span>
        </div>
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="開啟選單"
        >
          ☰
        </button>
      </header>
      {menuOpen && (
        <div className="drawer">
          {NAV.map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
                setMenuOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ExampleAudio({ text, settings, label = "例句" }) {
  if (!text) return null;
  return (
    <button
      className="example-audio"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        speakJapanese(text, settings);
      }}
      aria-label={`播放${label}`}
    >
      ▶ 播放{label}
    </button>
  );
}

function PeriodRail({ activePeriod, setActivePeriod, data }) {
  const currentIndex = PERIODS.indexOf(currentRocPeriod());
  return (
    <aside className="period-rail">
      <div>
        <small>年度路線</small>
        <strong>N3 → N2</strong>
      </div>
      {PERIODS.map((period, i) => {
        const locked = currentIndex >= 0 && i > currentIndex;
        return (
          <button
            key={period}
            disabled={locked}
            className={period === activePeriod ? "active" : ""}
            onClick={() => !locked && setActivePeriod(period)}
          >
            <span>{formatPeriod(period)}</span>
            <b>{locked ? "鎖定" : i < 6 ? "N3" : "N2"}</b>
          </button>
        );
      })}
      <p>
        目前可學
        <br />
        <strong>
          {data.vocabulary
            .filter((x) => isUnlocked(x, activePeriod))
            .length.toLocaleString()}
        </strong>{" "}
        單字
      </p>
    </aside>
  );
}

function TodayView({
  data,
  activePeriod,
  store,
  settings,
  goMedia,
  pageState,
  updatePage,
}) {
  const unlocked = useMemo(
    () => ({
      v: data.vocabulary.filter((x) => isUnlocked(x, activePeriod)),
      g: data.grammar.filter((x) => isUnlocked(x, activePeriod)),
      r: data.reading.filter((x) => isUnlocked(x, activePeriod)),
      l: data.listening.filter((x) => isUnlocked(x, activePeriod)),
    }),
    [data, activePeriod],
  );
  const batches = useMemo(
    () => buildDailyBatches(unlocked.v, unlocked.g),
    [unlocked.v, unlocked.g],
  );
  const batchIndex = useMemo(() => {
    let completed = 0;
    for (const batch of batches) {
      if (
        !batch.every((item) =>
          STRONG_RATINGS.has(store.progress[item.id]?.rating),
        )
      )
        break;
      completed += 1;
    }
    return completed;
  }, [batches, store.progress]);
  const cards = batches[batchIndex] || [];
  const completedInBatch = cards.filter((item) =>
    STRONG_RATINGS.has(store.progress[item.id]?.rating),
  ).length;
  const index = Number(pageState.index) || 0;
  const revealed = Boolean(pageState.revealed);
  const [notice, setNotice] = useState("");
  const card = cards[index % Math.max(1, cards.length)];
  const batchKey = `${activePeriod}:${batchIndex}`;
  const previousBatchKey = useRef(batchKey);
  useEffect(() => {
    if (previousBatchKey.current !== batchKey) {
      updatePage((current) => ({ ...current, index: 0, revealed: false }));
      previousBatchKey.current = batchKey;
    }
  }, [batchKey, updatePage]);
  async function rate(value) {
    const willAdvance =
      STRONG_RATINGS.has(value) &&
      cards.every(
        (item) =>
          item.id === card.id ||
          STRONG_RATINGS.has(store.progress[item.id]?.rating),
      );
    await store.rate(card, value, {
      dailyBatch: batchIndex + 1,
      unlockPeriod: activePeriod,
    });
    if (willAdvance) {
      updatePage((current) => ({ ...current, index: 0, revealed: false }));
      setNotice(
        batches[batchIndex + 1]?.length
          ? `本批次全部達到「記得」以上，已自動開放第 ${batchIndex + 2} 批新內容。`
          : "目前開放的教材已全部完成！",
      );
    } else {
      setNotice("");
      updatePage((current) => ({
        ...current,
        revealed: false,
        index: ((Number(current.index) || 0) + 1) % cards.length,
      }));
    }
  }
  if (!card)
    return (
      <section className="today-view">
        <div className="page-intro">
          <div>
            <span className="eyebrow">
              TODAY · {formatPeriod(activePeriod)}
            </span>
            <h1>目前教材已全部完成。</h1>
            <p>
              你已將所有開放內容標記為「記得」或「很熟」，可以前往閱讀聽力繼續練習。
            </p>
          </div>
        </div>
        <Empty text="太棒了，等待下一階段解鎖吧！" />
      </section>
    );
  return (
    <section className="today-view">
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            TODAY · {formatPeriod(activePeriod)} · 第 {batchIndex + 1} 批
          </span>
          <h1>把零碎時間，疊成日語實力。</h1>
          <p>
            本批 6 個單字、3
            個文法；全部標為「記得」或「很熟」後，自動開放下一批。
          </p>
        </div>
        <div className="today-ring">
          <strong>{completedInBatch}</strong>
          <span>/ {cards.length}</span>
          <small>本批達標</small>
        </div>
      </div>
      {notice && (
        <div className="week-card unlock-notice" role="status">
          ✓ {notice}
        </div>
      )}
      <div className="dashboard-grid">
        <div className="lesson-card">
          <div className="lesson-top">
            <span>
              {card.level} · {card.category === "vocab" ? "單字" : "文法"}
            </span>
            <button onClick={() => speakJapanese(card.audioText, settings)}>
              ▶ 播放單字／句型
            </button>
          </div>
          <div
            className="card-main"
            onClick={() =>
              updatePage((current) => ({ ...current, revealed: true }))
            }
          >
            <h2>{card.term}</h2>
            <p className="reading">{card.reading}</p>
            {revealed ? (
              <div className="answer">
                <strong>{card.meaningZh}</strong>
                <span className="usage-note">{card.usageZh}</span>
                <div className="example-line">
                  <p>{card.examples?.[0]?.ja}</p>
                  <ExampleAudio
                    text={card.examples?.[0]?.ja}
                    settings={settings}
                  />
                </div>
                <small>{card.examples?.[0]?.zh}</small>
              </div>
            ) : (
              <button className="reveal">翻卡看答案</button>
            )}
          </div>
          <div className="rating-row">
            <button onClick={() => rate("again")}>再一次</button>
            <button onClick={() => rate("hard")}>有點難</button>
            <button onClick={() => rate("good")}>記得</button>
            <button onClick={() => rate("easy")}>很熟</button>
          </div>
          <footer>
            <button
              onClick={() =>
                updatePage((current) => ({
                  ...current,
                  index:
                    ((Number(current.index) || 0) - 1 + cards.length) %
                    cards.length,
                  revealed: false,
                }))
              }
            >
              ← 上一張
            </button>
            <span>
              {index + 1} / {cards.length}
            </span>
            <button
              onClick={() =>
                updatePage((current) => ({
                  ...current,
                  index: ((Number(current.index) || 0) + 1) % cards.length,
                  revealed: false,
                }))
              }
            >
              下一張 →
            </button>
          </footer>
        </div>
        <aside className="today-side">
          <h3>接下來</h3>
          <button className="task" onClick={() => goMedia("reading")}>
            <b>08 分</b>
            <span>
              閱讀理解
              <br />
              <small>{unlocked.r[0]?.term || "本月閱讀"}</small>
            </span>
          </button>
          <button className="task" onClick={() => goMedia("listening")}>
            <b>06 分</b>
            <span>
              逐句聽力
              <br />
              <small>{unlocked.l[0]?.term || "本月聽力"}</small>
            </span>
          </button>
          <div className="week-card">
            <span>自動解鎖</span>
            <strong>
              {completedInBatch} / {cards.length} 張達標
            </strong>
            <p>本批全部達到「記得」以上，就會立即開放下一批新內容。</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function LibraryView({
  data,
  activePeriod,
  store,
  settings,
  pageState,
  updatePage,
}) {
  const query = pageState.query || "";
  const type = pageState.type || "vocabulary";
  const onlyWeak = Boolean(pageState.onlyWeak);
  const items = useMemo(
    () =>
      data[type]
        .filter((x) => isUnlocked(x, activePeriod))
        .filter((x) => !onlyWeak || store.progress[x.id]?.rating === "hard")
        .filter((x) =>
          `${x.term}${x.reading}${x.meaningZh}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 120),
    [data, type, query, onlyWeak, store.progress, activePeriod],
  );
  return (
    <section>
      <PageTitle
        eyebrow="LIBRARY"
        title="教材庫"
        text="搜尋、播放與重練目前已解鎖的教材。"
      />
      <div className="toolbar">
        <input
          value={query}
          onChange={(e) =>
            updatePage((current) => ({ ...current, query: e.target.value }))
          }
          placeholder="搜尋單字、讀音或中文意思"
        />
        <select
          value={type}
          onChange={(e) =>
            updatePage((current) => ({ ...current, type: e.target.value }))
          }
        >
          <option value="vocabulary">單字</option>
          <option value="grammar">文法</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={onlyWeak}
            onChange={(e) =>
              updatePage((current) => ({
                ...current,
                onlyWeak: e.target.checked,
              }))
            }
          />{" "}
          只看錯題
        </label>
      </div>
      <div className="library-list">
        {items.map((item) => (
          <article key={item.id}>
            <span className="level-pill">{item.level}</span>
            <div>
              <h3>
                {item.term} <small>{item.reading}</small>
              </h3>
              <p>{item.meaningZh}</p>
              <small className="library-usage">{item.usageZh}</small>
              <details className="library-example">
                <summary>查看例句</summary>
                <p lang="ja">{item.examples?.[0]?.ja}</p>
                <ExampleAudio
                  text={item.examples?.[0]?.ja}
                  settings={settings}
                />
                <small>{item.examples?.[0]?.zh}</small>
              </details>
            </div>
            <button
              onClick={() => speakJapanese(item.audioText, settings)}
              aria-label={`播放${item.term}`}
            >
              ▶
            </button>
            <b className={store.progress[item.id]?.rating || "new"}>
              {store.progress[item.id]?.rating || "未學"}
            </b>
          </article>
        ))}
      </div>
      {!items.length && <Empty text="沒有符合條件的教材。" />}
    </section>
  );
}

function MediaView({
  data,
  activePeriod,
  settings,
  store,
  pageState,
  updatePage,
}) {
  const type = pageState.type || "reading";
  const list = data[type].filter((x) => isUnlocked(x, activePeriod));
  const selected = Number(pageState.selected) || 0;
  const item = list[selected % Math.max(1, list.length)];
  const transcript = Boolean(pageState.transcript);
  const answer = pageState.answers?.[item?.id] ?? null;
  const replays = Number(pageState.replays) || 0;
  const startedAt = pageState.startedAt ? Number(pageState.startedAt) : null;
  const elapsedBase = Number(pageState.elapsed) || 0;
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const previousPeriod = useRef(activePeriod);
  useEffect(() => {
    if (previousPeriod.current !== activePeriod) {
      updatePage((current) => ({
        ...current,
        selected: 0,
        answer: null,
        transcript: false,
        replays: 0,
        elapsed: 0,
        startedAt: null,
      }));
      previousPeriod.current = activePeriod;
    }
  }, [activePeriod, updatePage]);
  const elapsed =
    elapsedBase +
    (startedAt ? Math.max(0, Math.floor((clock - startedAt) / 1000)) : 0);
  if (!item) return <Empty text="這個月份尚無閱讀／聽力教材。" />;
  const question = item.questions[0];
  const selectType = (nextType) =>
    updatePage((current) => ({
      ...current,
      type: nextType,
      selected: 0,
      answer: null,
      transcript: false,
      replays: 0,
      elapsed: 0,
      startedAt: null,
    }));
  const replay = (text) => {
    speakJapanese(text, settings);
    updatePage((current) => ({
      ...current,
      replays: (Number(current.replays) || 0) + 1,
    }));
  };
  const toggleTimer = () =>
    updatePage((current) =>
      current.startedAt
        ? { ...current, elapsed, startedAt: null }
        : { ...current, startedAt: Date.now() },
    );
  return (
    <section>
      <PageTitle
        eyebrow="READ · LISTEN"
        title="閱讀聽力"
        text="先作答，再看稿與解析；系統會記下重播與錯因。"
      />
      <div className="segmented">
        <button
          className={type === "reading" ? "active" : ""}
          onClick={() => selectType("reading")}
        >
          閱讀 52
        </button>
        <button
          className={type === "listening" ? "active" : ""}
          onClick={() => selectType("listening")}
        >
          聽力 104
        </button>
      </div>
      <div className="media-layout">
        <aside className="lesson-list">
          {list.slice(0, 30).map((x, i) => (
            <button
              key={x.id}
              className={i === selected ? "active" : ""}
              onClick={() =>
                updatePage((current) => ({
                  ...current,
                  selected: i,
                  transcript: false,
                  replays: 0,
                }))
              }
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              <span>
                {x.term}
                <small>
                  {x.estimatedMinutes} 分鐘 · 難度 {x.difficulty}
                </small>
              </span>
            </button>
          ))}
        </aside>
        <article className="media-workspace">
          <div className="media-head">
            <div>
              <span>
                {item.level} · {type === "reading" ? "精讀" : "逐句聽解"}
              </span>
              <h2>{item.term}</h2>
            </div>
            <div className="timer">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
              <button onClick={toggleTimer}>
                {startedAt ? "暫停" : "計時"}
              </button>
            </div>
          </div>
          {type === "reading" ? (
            <div className="reading-copy">
              {item.content.split("\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <textarea
                value={pageState.summaries?.[item.id] || ""}
                onChange={(event) =>
                  updatePage((current) => ({
                    ...current,
                    summaries: {
                      ...(current.summaries || {}),
                      [item.id]: event.target.value,
                    },
                  }))
                }
                placeholder="用 2–3 句寫下摘要…"
              />
            </div>
          ) : (
            <div className="listening-player">
              <button
                className="play-big"
                onClick={() => replay(item.audioText)}
              >
                ▶
              </button>
              <div>
                <strong>完整播放</strong>
                <p>
                  速度 {settings.rate}× · 已重播 {replays} 次
                </p>
              </div>
              <button onClick={stopSpeech}>停止</button>
              <div className="line-buttons">
                {item.lines.map((line, i) => (
                  <button key={i} onClick={() => replay(line)}>
                    第 {i + 1} 句 ▶
                  </button>
                ))}
              </div>
              <button
                className="text-button"
                onClick={() =>
                  updatePage((current) => ({
                    ...current,
                    transcript: !current.transcript,
                  }))
                }
              >
                {transcript ? "隱藏" : "顯示"}聽力稿
              </button>
              {transcript && (
                <div className="transcript">
                  {item.lines.map((x, i) => (
                    <p key={i}>{x}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="question">
            <h3>{question.prompt}</h3>
            {question.options.map((option, i) => (
              <button
                key={option}
                className={
                  answer === i
                    ? i === question.answer
                      ? "correct"
                      : "wrong"
                    : ""
                }
                onClick={() => {
                  updatePage((current) => ({
                    ...current,
                    answers: { ...(current.answers || {}), [item.id]: i },
                  }));
                  store.rate(item, i === question.answer ? "good" : "hard", {
                    replays,
                    answer: i,
                  });
                }}
              >
                {String.fromCharCode(65 + i)}. {option}
              </button>
            ))}
            {answer !== null && (
              <p className="explanation">
                {answer === question.answer ? "答對了。" : "再聽一次關鍵句。"}{" "}
                {question.explanation}
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function MockView({
  data,
  activePeriod,
  store,
  settings,
  pageState,
  updatePage,
}) {
  const list = data.assessments.filter((x) => isUnlocked(x, activePeriod));
  const exam = data.assessments.find((item) => item.id === pageState.examId);
  const answers = pageState.answers || {};
  const review = pageState.review;
  const reviewExam = data.assessments.find(
    (item) => item.id === review?.examId,
  );
  const questions = exam?.questions || [];
  const startedAt = pageState.startedAt ? Number(pageState.startedAt) : null;
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const seconds = startedAt
    ? Math.max(0, Math.floor((clock - startedAt) / 1000))
    : Number(review?.seconds) || 0;
  async function finish() {
    const correct = questions.filter(
      (question, index) => answers[index] === question.answer,
    ).length;
    const score = Math.round((correct / questions.length) * 100);
    const finishedSeconds = Math.max(
      0,
      Math.floor((Date.now() - startedAt) / 1000),
    );
    await store.saveResult({
      id: `${exam.id}-${Date.now()}`,
      assessmentId: exam.id,
      title: exam.title,
      score,
      seconds: finishedSeconds,
      completedAt: new Date().toISOString(),
    });
    updatePage((current) => ({
      ...current,
      examId: null,
      answers: {},
      startedAt: null,
      review: { examId: exam.id, answers, score, seconds: finishedSeconds },
      scrollY: 0,
    }));
    window.scrollTo(0, 0);
  }
  function leaveReview() {
    updatePage((current) => ({
      ...current,
      review: null,
      answers: {},
      scrollY: 0,
    }));
    window.scrollTo(0, 0);
  }
  if (review && reviewExam) {
    const reviewQuestions = reviewExam.questions;
    return (
      <section>
        <PageTitle
          eyebrow="REVIEW"
          title={`${reviewExam.title}｜${review.score} 分`}
          text="交卷後才顯示中文解析；紅色是你的答案，綠色是正確答案。"
        />
        <div className="review-summary">
          <strong>
            {review.score >= reviewExam.threshold ? "合格" : "需要再加強"}
          </strong>
          <span>
            作答時間 {Math.floor(review.seconds / 60)} 分 {review.seconds % 60}{" "}
            秒
          </span>
        </div>
        <div className="exam-review">
          {reviewQuestions.map((question, index) => (
            <article key={question.id} className="review-item">
              <span>
                {question.section} · 問題 {index + 1}
              </span>
              <h3>{question.prompt}</h3>
              {question.passage && (
                <p className="exam-passage" lang="ja">
                  {question.passage}
                </p>
              )}
              {question.audioText && (
                <ExampleAudio
                  text={question.audioText}
                  settings={settings}
                  label="聽力音檔"
                />
              )}
              <ol>
                {question.options.map((option, optionIndex) => (
                  <li
                    key={`${option}-${optionIndex}`}
                    className={
                      optionIndex === question.answer
                        ? "correct"
                        : optionIndex === review.answers[index]
                          ? "wrong"
                          : ""
                    }
                  >
                    {option}
                  </li>
                ))}
              </ol>
              <p className="answer-explanation">
                中文解析：{question.explanationZh}
              </p>
            </article>
          ))}
        </div>
        <button className="primary" onClick={leaveReview}>
          返回模考列表
        </button>
      </section>
    );
  }
  if (exam)
    return (
      <section>
        <PageTitle
          eyebrow="SIMULATION"
          title={exam.title}
          text={`自編模擬試驗 · ${exam.durationMinutes} 分鐘 · ${exam.questionCount} 題 · 及格 ${exam.threshold} 分`}
        />
        <div className="exam-clock">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </div>
        <div className="exam-notice">
          <b>受験上の注意</b>
          <p>
            問題と選択肢はすべて日本語です。最もよい答えを一つ選んでください。解説は答案を提出した後に表示されます。
          </p>
        </div>
        <div className="exam-sheet">
          {questions.map((question, index) => (
            <fieldset key={question.id}>
              <div className="question-meta">
                <span>{question.section}</span>
                <b>{question.type}</b>
              </div>
              <p className="exam-instruction">{question.instruction}</p>
              {question.passage && (
                <p className="exam-passage" lang="ja">
                  {question.passage}
                </p>
              )}
              {question.audioText && (
                <ExampleAudio
                  text={question.audioText}
                  settings={settings}
                  label="聴解音声"
                />
              )}
              <legend>
                {index + 1}. {question.prompt}
              </legend>
              {question.options.map((option, optionIndex) => (
                <label key={`${option}-${optionIndex}`}>
                  <input
                    type="radio"
                    name={`q${index}`}
                    checked={answers[index] === optionIndex}
                    onChange={() =>
                      updatePage((current) => ({
                        ...current,
                        answers: {
                          ...(current.answers || {}),
                          [index]: optionIndex,
                        },
                      }))
                    }
                  />
                  <span>{optionIndex + 1}</span>
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          <button
            className="primary"
            onClick={finish}
            disabled={Object.keys(answers).length < questions.length}
          >
            答案を提出する（交卷）
          </button>
          <p className="answer-count">
            回答済み：{Object.keys(answers).length} / {questions.length}
          </p>
        </div>
      </section>
    );
  return (
    <section>
      <PageTitle
        eyebrow="ASSESSMENT"
        title="月檢核與模考"
        text="全部為自編題目；官方資源只提供題型參考連結。"
      />
      <div className="assessment-grid">
        {list.map((x) => (
          <article key={x.id}>
            <span>
              {x.level} · {x.kind === "monthly" ? "月檢核" : "完整模考"}
            </span>
            <h3>{x.title}</h3>
            <p>
              {x.durationMinutes} 分鐘 · {x.questionCount} 題 · 門檻{" "}
              {x.threshold}
            </p>
            <button
              onClick={() => {
                updatePage((current) => ({
                  ...current,
                  examId: x.id,
                  answers: {},
                  startedAt: Date.now(),
                  review: null,
                  scrollY: 0,
                }));
                window.scrollTo(0, 0);
              }}
            >
              開始作答
            </button>
          </article>
        ))}
      </div>
      <a
        className="source-link"
        href="https://www.jlpt.jp/e/samples/sampleindex.html"
        target="_blank"
        rel="noreferrer"
      >
        JLPT 官方題型與著作權說明 ↗
      </a>
    </section>
  );
}

function ProgressView({ data, activePeriod, store, pageState, updatePage }) {
  const unlocked = [
    ...data.vocabulary,
    ...data.grammar,
    ...data.reading,
    ...data.listening,
  ].filter((x) => isUnlocked(x, activePeriod));
  const learned = Object.keys(store.progress).filter((id) =>
    unlocked.some((x) => x.id === id),
  ).length;
  const rate = unlocked.length
    ? Math.round((learned / unlocked.length) * 100)
    : 0;
  const weak = Object.values(store.progress).filter(
    (x) => x.rating === "hard",
  ).length;
  function exportCsv() {
    const rows = [
      ["月份", "原訂累積單字", "原訂累積文法", "實際完成", "完成率", "弱點數"],
      ...data.index.unlockSchedule.map((x) => [
        x.period,
        x.vocabulary,
        x.grammar,
        store.events.filter((e) =>
          e.occurredAt?.startsWith(
            `${Number(x.period.slice(0, 3)) + 1911}-${x.period.slice(4)}`,
          ),
        ).length,
        `${rate}%`,
        weak,
      ]),
    ];
    download(
      `日語階梯成果-${activePeriod}.csv`,
      rows.map((r) => r.map(csvCell).join(",")).join("\n"),
      "text/csv;charset=utf-8",
    );
  }
  return (
    <section>
      <PageTitle
        eyebrow="PROGRESS"
        title="進度成果"
        text="每次練習都只保存在這台裝置；可輸出 CSV 或直接列印。"
      />
      <div className="metric-grid">
        <article>
          <span>已學教材</span>
          <strong>{learned.toLocaleString()}</strong>
          <small>/ {unlocked.length.toLocaleString()}</small>
        </article>
        <article>
          <span>目前完成率</span>
          <strong>{rate}%</strong>
          <small>依解鎖內容計算</small>
        </article>
        <article>
          <span>需加強</span>
          <strong>{weak}</strong>
          <small>評為「有點難」</small>
        </article>
        <article>
          <span>檢核完成</span>
          <strong>{store.results.length}</strong>
          <small>/ 19 次</small>
        </article>
      </div>
      <div className="report-card">
        <div>
          <span>月報 · {formatPeriod(activePeriod)}</span>
          <h2>計畫與實際進度</h2>
        </div>
        <div className="progress-bar">
          <i style={{ width: `${rate}%` }} />
        </div>
        <p>
          原訂：單字{" "}
          {
            data.index.unlockSchedule.find((x) => x.period === activePeriod)
              ?.vocabulary
          }
          、文法{" "}
          {
            data.index.unlockSchedule.find((x) => x.period === activePeriod)
              ?.grammar
          }
          。目前記錄 {store.events.length} 次學習事件。
        </p>
        <label>
          老師回饋
          <textarea
            value={pageState.feedback || ""}
            onChange={(event) =>
              updatePage((current) => ({
                ...current,
                feedback: event.target.value,
              }))
            }
            placeholder="列印後可書寫，或先在此輸入回饋…"
          />
        </label>
        <div>
          <button className="primary" onClick={exportCsv}>
            匯出 CSV
          </button>
          <button onClick={() => window.print()}>列印成果報告</button>
        </div>
      </div>
    </section>
  );
}

function SettingsView({ settings, setSettings, onRestored, cloud }) {
  const [voices, setVoices] = useState([]);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();
  useEffect(() => {
    const update = () => setVoices(getJapaneseVoices());
    update();
    speechSynthesis?.addEventListener?.("voiceschanged", update);
    return () =>
      speechSynthesis?.removeEventListener?.("voiceschanged", update);
  }, []);
  async function backup() {
    const snapshot = await loadSnapshot();
    download(
      `nihongo-stairs-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(
        { backupVersion: 2, createdAt: new Date().toISOString(), ...snapshot },
        null,
        2,
      ),
      "application/json",
    );
  }
  async function chooseFile(event) {
    try {
      const json = JSON.parse(await event.target.files[0].text());
      if (json.backupVersion !== 2) throw new Error("備份版本不符");
      setPreview(json);
    } catch (error) {
      alert(`無法讀取備份：${error.message}`);
    }
  }
  async function restore() {
    await restoreSnapshot(preview, { forceCloud: true });
    setPreview(null);
    onRestored();
  }
  return (
    <section>
      <PageTitle
        eyebrow="SETTINGS"
        title="設定與資料"
        text="登入後自動同步手機與電腦，離線時仍會保存在本機。"
      />
      <div className="settings-grid">
        <AuthPanel cloud={cloud} />
        <article>
          <h3>日語語音</h3>
          <label>
            速度 <output>{settings.rate}×</output>
            <input
              type="range"
              min="0.6"
              max="1.3"
              step="0.05"
              value={settings.rate}
              onChange={(e) =>
                setSettings((x) => ({ ...x, rate: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            語音
            <select
              value={settings.voiceURI}
              onChange={(e) =>
                setSettings((x) => ({ ...x, voiceURI: e.target.value }))
              }
            >
              <option value="">自動選擇</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() =>
              speakJapanese("毎日少しずつ、前へ進みましょう。", settings)
            }
          >
            測試播放
          </button>
          {!voices.length && (
            <p className="warning">
              找不到日語語音。請至 Android「文字轉語音輸出」下載日文語音資料。
            </p>
          )}
        </article>
        <article>
          <h3>完整教材</h3>
          <p>
            下載單一 UTF-8
            文字檔，包含全部單字、文法、閱讀、聽力、試題、答案與中文解析。
          </p>
          <a
            className="primary download-link"
            href={`${import.meta.env.BASE_URL}日語階梯_完整教材.txt`}
            download
          >
            下載完整教材 TXT
          </a>
          <small>約 3.42 MB，可離線保存與列印。</small>
        </article>
        <article>
          <h3>備份與還原</h3>
          <p>JSON 包含進度、學習事件、檢核結果、報告與設定。</p>
          <button className="primary" onClick={backup}>
            匯出 JSON 備份
          </button>
          <button onClick={() => fileRef.current.click()}>選擇備份檔</button>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/json"
            onChange={chooseFile}
          />
          {preview && (
            <div className="restore-preview">
              <b>備份預覽</b>
              <p>
                {new Date(preview.createdAt).toLocaleString()} ·{" "}
                {(preview.studyEvents || []).length} 筆事件
              </p>
              <strong>確認後會完整覆蓋本機資料，不會合併。</strong>
              <button className="danger" onClick={restore}>
                確認覆蓋
              </button>
            </div>
          )}
        </article>
        <article>
          <h3>安裝與離線</h3>
          <p>
            Android Chrome：選單
            →「新增至主畫面」或「安裝應用程式」。首次連線後，教材可離線重開。
          </p>
          <span className="status-dot">● 僅儲存在本機</span>
        </article>
        <article>
          <h3>內容來源</h3>
          <p>
            <a href="https://www.edrdg.org/" target="_blank" rel="noreferrer">
              EDRDG / JMdict ↗
            </a>
          </p>
          <p>
            <a
              href="https://tadoku.org/japanese/en/free-books-en/"
              target="_blank"
              rel="noreferrer"
            >
              Tadoku 延伸閱讀 ↗
            </a>
          </p>
          <p>
            <a href="https://minato-jf.jp/" target="_blank" rel="noreferrer">
              Minato 線上課程 ↗
            </a>
          </p>
        </article>
      </div>
    </section>
  );
}

function PageTitle({ eyebrow, title, text }) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function Empty({ text }) {
  return <div className="empty">{text}</div>;
}
function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const cloud = useCloudAccount();
  const now = currentRocPeriod();
  const defaultPeriod = PERIODS.includes(now) ? now : PERIODS[0];
  const {
    session,
    ready: sessionReady,
    updatePage,
    setView,
    setActivePeriod,
  } = useUiSession(defaultPeriod);
  const [settings, setSettings] = useState({ rate: 0.85, voiceURI: "" });
  const [settingsReady, setSettingsReady] = useState(false);
  const store = useLearningStore();
  const pageActions = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(DEFAULT_PAGE_STATES).map((page) => [
          page,
          (updater) => updatePage(page, updater),
        ]),
      ),
    [updatePage],
  );
  const view = session.view;
  const activePeriod = session.activePeriod;
  useEffect(() => {
    loadStudyData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    getAll("settings")
      .then((xs) => {
        const saved = xs.find((x) => x.id === "tts")?.value;
        if (saved) setSettings(saved);
      })
      .finally(() => setSettingsReady(true));
  }, []);
  useEffect(() => {
    if (settingsReady)
      void put("settings", {
        id: "tts",
        value: { ...settings, updatedAt: new Date().toISOString() },
      });
  }, [settings, settingsReady]);
  useEffect(() => {
    if (!sessionReady) return;
    const frame = requestAnimationFrame(() =>
      window.scrollTo(0, Number(session.pages[view]?.scrollY) || 0),
    );
    return () => cancelAnimationFrame(frame);
  }, [sessionReady, view]);
  if (
    loading ||
    !sessionReady ||
    !settingsReady ||
    !store.ready ||
    !cloud.authReady
  )
    return (
      <div className="loading-screen">
        <b>日語階梯</b>
        <span>正在恢復教材、帳號與學習進度…</span>
      </div>
    );
  if (error)
    return (
      <div className="loading-screen">
        <b>教材載入失敗</b>
        <span>{error}</span>
      </div>
    );
  const completed = Object.keys(store.progress).length;
  return (
    <div className="app-shell">
      <Header
        view={view}
        setView={setView}
        completed={completed}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        cloud={cloud}
      />
      <div className="app-body">
        <PeriodRail
          activePeriod={activePeriod}
          setActivePeriod={setActivePeriod}
          data={data}
        />
        <main>
          {view === "today" && (
            <TodayView
              data={data}
              activePeriod={activePeriod}
              store={store}
              settings={settings}
              pageState={session.pages.today}
              updatePage={pageActions.today}
              goMedia={(type) => {
                pageActions.media((current) => ({
                  ...current,
                  type,
                  selected: 0,
                  transcript: false,
                }));
                setView("media");
              }}
            />
          )}
          {view === "library" && (
            <LibraryView
              data={data}
              activePeriod={activePeriod}
              store={store}
              settings={settings}
              pageState={session.pages.library}
              updatePage={pageActions.library}
            />
          )}{" "}
          {view === "media" && (
            <MediaView
              data={data}
              activePeriod={activePeriod}
              settings={settings}
              store={store}
              pageState={session.pages.media}
              updatePage={pageActions.media}
            />
          )}{" "}
          {view === "mock" && (
            <MockView
              data={data}
              activePeriod={activePeriod}
              store={store}
              settings={settings}
              pageState={session.pages.mock}
              updatePage={pageActions.mock}
            />
          )}{" "}
          {view === "progress" && (
            <ProgressView
              data={data}
              activePeriod={activePeriod}
              store={store}
              pageState={session.pages.progress}
              updatePage={pageActions.progress}
            />
          )}{" "}
          {view === "settings" && (
            <SettingsView
              settings={settings}
              setSettings={setSettings}
              cloud={cloud}
              onRestored={() => {
                localStorage.removeItem("nihongo-stairs-ui-session");
                store.reload();
              }}
            />
          )}
        </main>
      </div>
      <nav className="bottom-nav">
        {NAV.slice(0, 5).map(([id, label, icon]) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            onClick={() => setView(id)}
          >
            <b>{icon}</b>
            <span>{label.replace("學習", "")}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
