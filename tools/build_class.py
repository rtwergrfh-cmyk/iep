"""Builds dist/class.html: Class Glance, standalone, works offline, blocks all network requests.
The sample class is made by running fictional sample plans through the same pipeline (node/class_run.js)."""
import base64, json, os, subprocess
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd=lambda p: open(os.path.join(ROOT,p),encoding='utf-8').read()
def safe_js(s): return s.replace('</script','<\\/script')
font='data:font/woff2;base64,'+base64.b64encode(open(os.path.join(ROOT,'vendor/nunito-latin-wght-normal.woff2'),'rb').read()).decode()
css=rd('src/class/style.css').replace('__NUNITO__',font)
plans=['samples/sample-504-tx.pdf','samples/reported-sam.pdf','samples/sample-ca-seis.pdf','samples/sample-504-ca.pdf','samples/messy-fillable.pdf','samples/reported-amara.pdf','samples/sample-ny-form.pdf','samples/reported-jules.txt']
tmp=os.path.join(ROOT,'dist','.sample-class.json')
subprocess.run(['node','node/class_run.js',*plans,'--json',tmp],cwd=ROOT,check=True,stderr=subprocess.DEVNULL)
klass=json.load(open(tmp)); os.remove(tmp)
for s in klass: s['src']='a fictional sample plan'; s.pop('lang',None); s.pop('found',None)
pdfs=[('Fictional sample 504 plan','samples/sample-504-tx.pdf'),('Fictional sample IEP','samples/sample-ca-seis.pdf'),('Fictional sample IEP','samples/reported-sam.pdf')]
data='window.SAMPLE_CLASS='+json.dumps(klass)+';window.SAMPLE_PDFS='+json.dumps([{'name':n,'b64':base64.b64encode(open(os.path.join(ROOT,p),'rb').read()).decode()} for n,p in pdfs])+';'
scripts=''.join('<script>'+safe_js(x)+'</script>\n' for x in [
  '/* pdf.js 3.11.174 (c) Mozilla, Apache License 2.0 */\n'+rd('vendor/pdf.min.js'), rd('vendor/pdf.worker.min.js'),
  rd('src/model.js'), rd('src/classifier.js'), rd('src/words.js'), rd('src/pdfread.js'), rd('src/engine.js'), rd('src/class/sort.js'), data, rd('src/class/app.js')])
title='<title>Class Glance</title>\n<meta name="description" content="Every IEP and 504 plan in your class, on one page: a free accommodations chart, test-day list and sub sheet. Runs entirely in your browser.">\n'
body='<div id="app"></div>\n<div id="print-area"></div>\n<div id="toast" class="toast" role="status" aria-live="polite"></div>\n'+scripts
csp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'"
html=('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
     f'<meta http-equiv="Content-Security-Policy" content="{csp}">\n<meta name="referrer" content="no-referrer">\n'+title+'<style>\n'+css+'\n</style>\n</head>\n<body>\n'+body+'</body>\n</html>\n')
open(os.path.join(ROOT,'dist/class.html'),'w',encoding='utf-8').write(html)
open(os.path.join(ROOT,'dist/class-artifact.html'),'w',encoding='utf-8').write(title+'<style>\n'+css+'\n</style>\n'+body)
print('class.html',len(html)//1024,'KB;',len(klass),'sample students')
