import { createRequire } from "node:module";
import path from "node:path";
const require=createRequire(new URL("../學習網站/package.json",import.meta.url));
const { chromium }=require("playwright-core");
const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe"});
const result={errors:[],checks:{}};

async function open(viewport){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  page.on("console",message=>{if(message.type()==="error")result.errors.push(message.text())});
  page.on("pageerror",error=>result.errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  return {context,page};
}

const desktop=await open({width:1440,height:1000});
result.checks.title=await desktop.page.title();
await desktop.page.getByRole("button",{name:"翻卡看答案"}).click();
result.checks.exampleAudio=await desktop.page.getByRole("button",{name:"播放例句"}).isVisible();
await desktop.page.locator(".topbar").getByRole("button",{name:"教材庫",exact:true}).click();
await desktop.page.locator("select").selectOption("grammar");
const grammarRows=desktop.page.locator(".library-list article");
await grammarRows.nth(0).locator("summary").click();
await grammarRows.nth(1).locator("summary").click();
const firstExample=await grammarRows.nth(0).locator(".library-example p").innerText();
const secondExample=await grammarRows.nth(1).locator(".library-example p").innerText();
result.checks.grammarExamplesDiffer=firstExample!==secondExample;
result.checks.libraryExampleAudio=await grammarRows.nth(0).getByRole("button",{name:"播放例句"}).isVisible();
await desktop.page.locator(".topbar").getByRole("button",{name:"模考",exact:true}).click();
await desktop.page.getByRole("button",{name:"開始作答"}).first().click();
result.checks.japaneseInstruction=(await desktop.page.locator(".exam-notice").innerText()).includes("問題と選択肢はすべて日本語です");
result.checks.fiveItemTypes=(await desktop.page.locator(".question-meta b").allTextContents()).filter((value,index,array)=>array.indexOf(value)===index).length===5;
result.checks.noExplanationBeforeSubmit=await desktop.page.locator(".answer-explanation").count()===0;
result.checks.listeningAudio=await desktop.page.getByRole("button",{name:"播放聴解音声"}).first().isVisible();
await desktop.page.screenshot({path:path.join(process.env.TEMP,"exam-japanese.png"),fullPage:false});
for(let index=0;index<20;index++)await desktop.page.locator(`input[name="q${index}"]`).first().check();
await desktop.page.getByRole("button",{name:"答案を提出する（交卷）"}).click();
result.checks.chineseAfterSubmit=(await desktop.page.locator(".answer-explanation").first().innerText()).startsWith("中文解析：");
result.checks.reviewAllQuestions=await desktop.page.locator(".review-item").count()===20;
await desktop.page.screenshot({path:path.join(process.env.TEMP,"exam-review.png"),fullPage:false});
await desktop.context.close();

const mobile=await open({width:412,height:915});
await mobile.page.locator(".bottom-nav").getByRole("button",{name:/模考/}).click();
await mobile.page.getByRole("button",{name:"開始作答"}).first().click();
result.checks.mobileNoOverflow=await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
result.checks.mobileExamVisible=await mobile.page.locator(".exam-sheet").isVisible();
await mobile.page.screenshot({path:path.join(process.env.TEMP,"exam-mobile.png"),fullPage:false});
await mobile.context.close();
await browser.close();
console.log(JSON.stringify(result,null,2));
if(result.errors.length||Object.values(result.checks).some(value=>value===false))process.exit(1);
