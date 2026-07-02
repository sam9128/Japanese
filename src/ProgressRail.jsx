import { CheckIcon } from "./icons";

export default function ProgressRail({ learned, onReset }) {
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const currentDay = Math.min(6, new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  return (
    <aside className="progress-rail" aria-label="本週進度">
      <h2>本週進度</h2>
      <span className="rail-label">本週</span>
      <strong>{learned}<small>/ 100</small></strong>
      <p>已學習／目標</p>
      <div className="progress-track"><span style={{ width: `${learned}%` }} /></div>
      <ol className="day-list">
        {days.map((day, idx) => <li key={day} className={idx === currentDay ? "today" : idx < currentDay ? "done" : ""}><span>{day}</span>{idx < currentDay ? <CheckIcon size={18} /> : <i>{idx === currentDay ? learned : "–"}</i>}</li>)}
      </ol>
      <button className="reset-button" onClick={onReset} type="button">重設學習紀錄</button>
    </aside>
  );
}
