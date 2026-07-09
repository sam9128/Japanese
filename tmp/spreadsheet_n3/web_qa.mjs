import { chromium } from "../../學習網站/node_modules/playwright-core/index.mjs";
import fs from "node:fs/promises";

const outputDir = "D:/課業/展翅飛翔-圓夢計畫/tmp/webqa";
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const issues = [];
page.on("console", (message) => { if (message.type() === "error") issues.push(`console: ${message.text()}`); });
page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
await page.addInitScript(() => {
  localStorage.clear();
  window.__speechCalls = [];
  const synth = window.speechSynthesis;
  if (synth) {
    synth.cancel = () => {};
    synth.getVoices = () => [];
    synth.speak = (utterance) => { window.__speechCalls.push(utterance.text); utterance.onstart?.(); };
  }
});

await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "改善", exact: true }).waitFor();
await page.getByRole("button", { name: /播放日文發音/ }).click();
const speechCalls = await page.evaluate(() => window.__speechCalls);
if (!speechCalls.includes("改善")) issues.push("playback button did not call speech synthesis with 改善");
await page.getByRole("button", { name: "顯示答案" }).click();
await page.getByText("生活習慣を改善するために、毎日少し歩いています。").waitFor();
await page.screenshot({ path: `${outputDir}/desktop.png`, fullPage: true });

await page.getByRole("button", { name: /有點難/ }).click();
await page.getByRole("tab", { name: /錯題模式/ }).click();
await page.getByRole("heading", { name: "改善", exact: true }).waitFor();

await page.getByRole("button", { name: /單字庫/ }).click();
await page.getByPlaceholder("輸入日文、讀音或中文").fill("改善");
await page.locator(".library-row").nth(1).locator("strong").filter({ hasText: "改善" }).waitFor();
await page.getByRole("button", { name: /進度/ }).click();
await page.getByText("115", { exact: false }).first().waitFor();

await page.getByRole("button", { name: "日語階梯" }).click();
await page.setViewportSize({ width: 412, height: 915 });
await page.getByRole("tab", { name: /單字模式/ }).click();
await page.getByRole("button", { name: "顯示答案" }).click();
await page.getByRole("button", { name: /播放日文發音/ }).click();
await page.screenshot({ path: `${outputDir}/mobile.png`, fullPage: false });
const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
if (overflow.width > overflow.viewport + 1) issues.push(`mobile horizontal overflow ${overflow.width}px > ${overflow.viewport}px`);

console.log(JSON.stringify({ speechCalls, overflow, issues, desktop: `${outputDir}/desktop.png`, mobile: `${outputDir}/mobile.png` }));
await browser.close();
if (issues.length) process.exitCode = 1;
