import { createRequire } from "node:module";
import path from "node:path";
const require=createRequire(new URL("../學習網站/package.json",import.meta.url));
const { chromium }=require("playwright-core");
const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe"});
const result={errors:[],checks:{}};
const hasChinese=value=>/[\u3400-\u9fff]/.test(value||"");

async function pageAt(viewport){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  page.on("console",message=>{if(message.type()==="error")result.errors.push(message.text())});
  page.on("pageerror",error=>result.errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  return {context,page};
}

const desktop=await pageAt({width:1440,height:1000});
result.checks.title=await desktop.page.title();
await desktop.page.getByRole("button",{name:"翻卡看答案"}).click();
const meaning=await desktop.page.locator(".answer strong").innerText();
const usage=await desktop.page.locator(".usage-note").innerText();
const example=await desktop.page.locator(".answer small").innerText();
result.checks.chineseMeaning=hasChinese(meaning)&&meaning.includes("動畫");
result.checks.chineseUsage=hasChinese(usage)&&usage.includes("詞性");
result.checks.chineseExample=hasChinese(example)&&example.includes("中文解析");
await desktop.page.screenshot({path:path.join(process.env.TEMP,"chinese-desktop.png"),fullPage:false});
await desktop.page.locator(".topbar").getByRole("button",{name:"教材庫",exact:true}).click();
await desktop.page.getByPlaceholder("搜尋單字、讀音或中文意思").fill("動畫");
result.checks.chineseSearch=(await desktop.page.locator(".library-list article").count())>0;
await desktop.context.close();

const mobile=await pageAt({width:412,height:915});
await mobile.page.getByRole("button",{name:"翻卡看答案"}).click();
result.checks.mobileUsage=await mobile.page.locator(".usage-note").isVisible();
result.checks.mobileNoOverflow=await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
await mobile.page.screenshot({path:path.join(process.env.TEMP,"chinese-mobile.png"),fullPage:false});
await mobile.context.close();
await browser.close();
console.log(JSON.stringify(result,null,2));
if(result.errors.length||Object.values(result.checks).some(value=>value===false))process.exit(1);
