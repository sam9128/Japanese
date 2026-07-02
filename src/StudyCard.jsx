import SpeakerButton from "./SpeakerButton";
import { CheckIcon, RepeatIcon } from "./icons";

export default function StudyCard({ card, revealed, onReveal, onRate }) {
  if (!card) {
    return <section className="study-card empty-state"><h2>目前沒有錯題</h2><p>先完成一些單字或文法，再把「有點難」的項目集中練習。</p></section>;
  }

  return (
    <section className="study-card" aria-live="polite">
      <div className="study-primary">
        <h1>{card.term}</h1>
        <p className="reading">{card.reading}</p>
        <SpeakerButton text={card.type === "grammar" ? card.example : card.term} />
      </div>

      {!revealed ? (
        <button className="reveal-button" onClick={onReveal} type="button">顯示答案</button>
      ) : (
        <div className="answer-area">
          <div className="answer-block">
            <span className="section-label">{card.type === "grammar" ? "意思" : "釋義"}</span>
            <h2>{card.meaning}</h2>
            {card.structure && <p className="structure">接續：{card.structure}</p>}
          </div>
          <div className="answer-block example-block">
            <span className="section-label">例句</span>
            <p className="japanese-example">{card.example}</p>
            {card.translation && <p className="translation">{card.translation}</p>}
          </div>
          <div className="rating-row">
            <button className="rate-button again" onClick={() => onRate("again")} type="button"><RepeatIcon />再複習</button>
            <button className="rate-button hard" onClick={() => onRate("hard")} type="button"><span aria-hidden="true">!</span>有點難</button>
            <button className="rate-button known" onClick={() => onRate("known")} type="button"><CheckIcon />記住了</button>
          </div>
        </div>
      )}
    </section>
  );
}
