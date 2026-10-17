"""Builds dist/index.html (standalone, works offline, blocks all network requests) and dist/artifact.html (preview)."""
import base64, json, os, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd=lambda p: open(os.path.join(ROOT,p),encoding='utf-8').read()
def safe_js(s): return s.replace('</script','<\\/script')
font='data:font/woff2;base64,'+base64.b64encode(open(os.path.join(ROOT,'vendor/nunito-latin-wght-normal.woff2'),'rb').read()).decode()
css=rd('src/style.css').replace('__NUNITO__',font)
samples=[('New York-style form','samples/sample-ny-form.pdf'),('California-style IEP','samples/sample-ca-seis.pdf'),('Narrative district IEP','samples/sample-narrative.pdf'),('Checkbox form','samples/messy-checkbox.pdf'),('Fillable PDF form','samples/messy-fillable.pdf'),('Washington IEP (real sample, rebuilt)','samples/real-wa-rebuilt.pdf'),('California IEP (real sample, rebuilt)','samples/real-ca-fresno-rebuilt.pdf'),('Section 504 plan','samples/sample-504-tx.pdf'),('IEP in Spanish','samples/sample-iep-es.pdf')]
sjs='window.SAMPLES='+json.dumps([{'name':n,'b64':base64.b64encode(open(os.path.join(ROOT,p),'rb').read()).decode()} for n,p in samples])+';'
scripts=''.join('<script>'+safe_js(x)+'</script>\n' for x in [
  '/* pdf.js 3.11.174 (c) Mozilla, Apache License 2.0 */\n'+rd('vendor/pdf.min.js'),
  rd('vendor/pdf.worker.min.js'),
  rd('src/model.js'), rd('src/classifier.js'), rd('src/words.js'), rd('src/pdfread.js'), rd('src/engine.js'), rd('src/i18n.js'), sjs, rd('src/app.js')])
title='<title>IEP Glance</title>\n<meta name="description" content="Turn an IEP into one-page, plain-language sheets for teachers, paras and subs. Runs entirely in the browser.">\n'
body='<div id="app"></div>\n<div id="toast" class="toast" role="status" aria-live="polite"></div>\n'+scripts
os.makedirs(os.path.join(ROOT,'dist'),exist_ok=True)
csp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'"
idx=('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
     f'<meta http-equiv="Content-Security-Policy" content="{csp}">\n<meta name="referrer" content="no-referrer">\n'+title+'<style>\n'+css+'\n</style>\n</head>\n<body>\n'+body+'</body>\n</html>\n')
open(os.path.join(ROOT,'dist/index.html'),'w',encoding='utf-8').write(idx)
open(os.path.join(ROOT,'dist/artifact.html'),'w',encoding='utf-8').write(title+'<style>\n'+css+'\n</style>\n'+body)
print('index.html',len(idx)//1024,'KB')
