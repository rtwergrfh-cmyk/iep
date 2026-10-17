const pdfjs=require('./pdfjs-dist/legacy/build/pdf.js');
const E=require('../src/engine.js');
const R=require('../src/pdfread.js');
const fs=require('fs');
async function pagesFromPdf(file){
  const {pages,stats}=await R.readPdf(pdfjs,new Uint8Array(fs.readFileSync(file)));
  pagesFromPdf.stats=stats;
  return pages;
}
module.exports={pagesFromPdf};
if(require.main===module)(async()=>{
  const file=process.argv[2];const mode=process.argv[3]||'summary';
  const rows=E.rowsFromPages(await pagesFromPdf(file));
  if(mode==='rows'){console.log('STATS',JSON.stringify(pagesFromPdf.stats));rows.forEach(r=>console.log(r.page,r.heading?'H':' ',r.opt||'  ',r.cells.length,JSON.stringify(r.text).slice(0,160)));return}
  const ids=E.findIdentifiers(rows);
  console.log('CODE',ids.code,'| IDs:',ids.list.map(i=>i.kind+'='+i.value).join(' ; '));
  const red=E.makeRedactor(ids.list.map(i=>Object.assign({},i,{on:!i.off})),ids.code);
  const rrows=rows.map(r=>Object.assign({},r,{cells:r.cells.map(red),text:red(r.text)}));
  const res=E.analyze(rrows);
  console.log('META',JSON.stringify(res.meta));
  console.log('SECTIONS',res.sections.map(s=>s.cat+'('+s.title.slice(0,30)+')').join(' / '));
  const by={};res.items.forEach(i=>(by[i.cat]=by[i.cat]||[]).push(i));
  Object.keys(by).forEach(c=>{console.log('\n==',c,by[c].length);by[c].forEach(i=>console.log('  p'+i.page,(i.suggested?'{'+Math.round(i.conf*100)+'%} ':'')+(i.subName?'['+i.subName+'] ':'')+i.plain.slice(0,170),i.tip?'  TIP: '+i.tip.slice(0,50):'',i.measure?'  MEASURE: '+i.measure.slice(0,60):'',i.who?' WHO:'+i.who:''))});
  console.log('\nCOVERAGE',E.coverage(res).map(c=>c.name+':'+c.n+(c.note?' ('+c.note+')':'')).join(' | '));
  const leak=JSON.stringify(res.items).match(/Maya|Thompson|Ethan|Nguyen|Ava\b|Patel|Denise|Linh|Priya|Raman|Lakshmi|Jordan|Ellis|Carla|Marcus|Diane|Robert|555|204517883|7731045|S-4410937|1234567890|77310452|03\/14\/2016|08\/22\/2013|11\/02\/2018|11\/02\/2013|05\/19\/2015|01\/30\/2019|Orchard|Harbor Street/g);
  console.log('LEAKS:',leak?[...new Set(leak)].join(','):'none');
})();
