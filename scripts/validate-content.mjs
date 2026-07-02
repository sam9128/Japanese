import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..","public","content");
const index=JSON.parse(fs.readFileSync(path.join(root,"index.json"),"utf8"));
const packs=index.periods.map(period=>JSON.parse(fs.readFileSync(path.join(root,"periods",`${period}.json`),"utf8")));
const all={vocabulary:[],grammar:[],reading:[],listening:[],assessments:[]};
for(const pack of packs)for(const key of Object.keys(all))all[key].push(...pack[key]);
const expected={vocabulary:4000,grammar:240,reading:52,listening:104};
for(const [key,count] of Object.entries(expected))if(all[key].length!==count)throw new Error(`${key}: ${all[key].length} !== ${count}`);
if(all.assessments.filter(x=>x.kind==="monthly").length!==12)throw new Error("monthly checks count mismatch");
if(all.assessments.filter(x=>x.kind==="mock"&&x.level==="N3").length!==5)throw new Error("N3 mock count mismatch");
if(all.assessments.filter(x=>x.kind==="mock"&&x.level==="N2").length!==2)throw new Error("N2 mock count mismatch");
const ids=Object.values(all).flat().map(x=>x.id);if(new Set(ids).size!==ids.length)throw new Error("duplicate IDs");
if(new Set(all.grammar.map(x=>x.term)).size<200)throw new Error("grammar unique patterns under 200");
for(const item of Object.values(all).flat())if(!item.sourceRefs?.length||!item.license)throw new Error(`missing source/license: ${item.id}`);
const hasChinese=(value)=>/[\u3400-\u9fff]/.test(value||"");
for(const card of [...all.vocabulary,...all.grammar]){
  if(!hasChinese(card.meaningZh))throw new Error(`missing Chinese meaning: ${card.id}`);
  if(!hasChinese(card.usageZh))throw new Error(`missing Chinese usage explanation: ${card.id}`);
  if(!hasChinese(card.examples?.[0]?.zh)||/^英[：:]/.test(card.examples?.[0]?.zh||""))throw new Error(`missing Chinese example explanation: ${card.id}`);
}
if(all.vocabulary.some(card=>/^英[：:]/.test(card.meaningZh)))throw new Error("English-only vocabulary meaning detected");
const grammarExamples=all.grammar.map(card=>card.examples?.[0]?.ja);
if(new Set(grammarExamples).size!==240)throw new Error(`grammar examples are not unique: ${new Set(grammarExamples).size}/240`);
for(const card of all.grammar){
  if(!card.examples?.[0]?.ja||card.examples[0].ja.includes("〜"))throw new Error(`invalid grammar example: ${card.id}`);
  if(card.audioText!==card.examples[0].ja)throw new Error(`grammar audio does not match example: ${card.id}`);
}
const hasJapanese=(value)=>/[\u3040-\u30ff\u3400-\u9fff]/.test(value||"");
for(const assessment of all.assessments){
  if(assessment.questions?.length!==assessment.questionCount)throw new Error(`assessment question count mismatch: ${assessment.id}`);
  if(new Set(assessment.questions.map(question=>`${question.passage||""}${question.prompt}`)).size<assessment.questionCount*.8)throw new Error(`assessment questions repeat too much: ${assessment.id}`);
  if(new Set(assessment.questions.map(question=>question.type)).size<4)throw new Error(`assessment item types insufficient: ${assessment.id}`);
  for(const question of assessment.questions){
    if(!hasJapanese(question.instruction)||!hasJapanese(question.prompt))throw new Error(`non-Japanese question: ${question.id}`);
    if(question.options?.length!==4||question.options.some(option=>!hasJapanese(option)))throw new Error(`invalid Japanese options: ${question.id}`);
    if(!Number.isInteger(question.answer)||question.answer<0||question.answer>3)throw new Error(`invalid answer: ${question.id}`);
    if(!hasChinese(question.explanationZh))throw new Error(`missing Chinese answer explanation: ${question.id}`);
  }
}
for(const [i,schedule] of index.unlockSchedule.entries()){
  const allowed=new Set(index.periods.slice(0,i+1));
  const vocab=all.vocabulary.filter(x=>allowed.has(x.unlockPeriod)).length;
  const grammar=all.grammar.filter(x=>allowed.has(x.unlockPeriod)).length;
  if(vocab!==schedule.vocabulary||grammar!==schedule.grammar)throw new Error(`unlock mismatch ${schedule.period}: ${vocab}/${grammar}`);
}
console.log(JSON.stringify({ok:true,counts:index.counts,uniqueIds:ids.length,uniqueGrammar:new Set(all.grammar.map(x=>x.term)).size,chineseExplainedCards:all.vocabulary.length+all.grammar.length},null,2));
