const pdfjs=require('./pdfjs-dist/legacy/build/pdf.js');
const fs=require('fs');
(async()=>{
  const data=new Uint8Array(fs.readFileSync(process.argv[2]));
  const doc=await pdfjs.getDocument({data,isEvalSupported:false,useSystemFonts:true,disableFontFace:true}).promise;
  for(let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p);const tc=await page.getTextContent();
    const vp=page.getViewport({scale:1});
    tc.items.slice(0,+(process.argv[3]||40)).forEach(it=>{if(!it.str.trim())return;console.log(p,Math.round(it.transform[4]),Math.round(vp.height-it.transform[5]),Math.round(it.width),Math.round(it.height),it.fontName,JSON.stringify(it.str))});
  }
})();
