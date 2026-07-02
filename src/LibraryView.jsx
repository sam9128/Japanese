import { useMemo, useState } from "react";
import { SpeakerIcon } from "./icons";

export default function LibraryView({ data, onSpeak }) {
  const [query, setQuery] = useState("");
  const cards = useMemo(() => [...data.vocab, ...data.grammar].filter((card) => `${card.term}${card.reading}${card.meaning}`.toLowerCase().includes(query.toLowerCase())), [data, query]);
  return <main className="page-view library-view"><header><h1>單字庫</h1><p>搜尋目前的 115 張 N3 起始卡片。</p></header><label className="search-field"><span>搜尋</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="輸入日文、讀音或中文" /></label><div className="library-table" role="table"><div className="library-row library-head" role="row"><span>項目</span><span>讀音／類型</span><span>意思</span><span>發音</span></div>{cards.map((card) => <div className="library-row" role="row" key={card.id}><strong>{card.term}</strong><span>{card.reading}</span><span>{card.meaning}</span><button type="button" onClick={() => onSpeak(card.type === "grammar" ? card.example : card.term)} aria-label={`播放 ${card.term}`}><SpeakerIcon size={20}/></button></div>)}</div></main>;
}
