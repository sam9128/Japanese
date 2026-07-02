import { ChevronIcon, CloseIcon } from "./icons";

function QueueGroup({ label, marker, cards, activeId }) {
  return <section className="queue-group"><header><span className="queue-marker">{marker}</span><strong>{label}</strong><small>剩餘 {cards.length}</small><ChevronIcon direction="down" size={16}/></header><ul>{cards.slice(0, 4).map((card) => <li className={card.id === activeId ? "active" : ""} key={card.id}>{card.term}</li>)}</ul></section>;
}

export default function QueuePanel({ data, activeId, mistakes, mobileOpen, onClose }) {
  return (
    <aside className={`queue-panel ${mobileOpen ? "mobile-open" : ""}`} aria-label="今日短時段學習">
      <div className="queue-title"><div><h2>今日短時段學習</h2><p>依建議順序學習，約 10–15 分鐘</p></div><button className="queue-close" onClick={onClose} aria-label="關閉今日清單" type="button"><CloseIcon /></button></div>
      <QueueGroup label="單字" marker="あ" cards={data.vocab.slice(0, 16)} activeId={activeId}/>
      <QueueGroup label="文法" marker="文" cards={data.grammar.slice(0, 8)} activeId={activeId}/>
      <QueueGroup label="錯題" marker="×" cards={mistakes.slice(0, 6)} activeId={activeId}/>
    </aside>
  );
}
