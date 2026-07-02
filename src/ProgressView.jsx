export default function ProgressView({ progress, mistakes, total }) {
  const known = Object.values(progress.ratings).filter((value) => value === "known").length;
  const hard = Object.values(progress.ratings).filter((value) => value === "hard").length;
  return <main className="page-view progress-view"><header><h1>學習進度</h1><p>所有資料只保存在這台裝置的瀏覽器中。</p></header><div className="progress-summary"><section><span>本週完成</span><strong>{progress.learned}<small>/100</small></strong></section><section><span>已記住</span><strong>{known}<small>張</small></strong></section><section><span>待加強</span><strong>{hard}<small>張</small></strong></section><section><span>卡片總數</span><strong>{total}<small>張</small></strong></section></div><div className="progress-note"><h2>下一個建議</h2><p>{mistakes.length ? `先完成 ${mistakes.length} 張錯題，再繼續新單字。` : "目前沒有錯題，可以繼續學習新單字。"}</p></div></main>;
}
