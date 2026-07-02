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
for(const [i,schedule] of index.unlockSchedule.entries()){
  const allowed=new Set(index.periods.slice(0,i+1));
  const vocab=all.vocabulary.filter(x=>allowed.has(x.unlockPeriod)).length;
  const grammar=all.grammar.filter(x=>allowed.has(x.unlockPeriod)).length;
  if(vocab!==schedule.vocabulary||grammar!==schedule.grammar)throw new Error(`unlock mismatch ${schedule.period}: ${vocab}/${grammar}`);
}
console.log(JSON.stringify({ok:true,counts:index.counts,uniqueIds:ids.length,uniqueGrammar:new Set(all.grammar.map(x=>x.term)).size},null,2));
