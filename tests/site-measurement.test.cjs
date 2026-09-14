const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('assets/js/site-measurement.js','utf8');
function boot(saved, url='https://znempreendimentos.com.br/villa/?name=PRIVATE&message=SECRET&utm_source=facebook&utm_medium=paid_social', broken=false) {
 const elements={}; const appended=[]; const handlers={}; const storage=new Map(saved ? [['zn-measurement-consent',saved]]:[]);
 const localStorage={getItem:k=>{if(broken)throw Error();return storage.get(k)},setItem:(k,v)=>storage.set(k,v)};
 const sessionStorage={getItem:()=>null,setItem:()=>{}};
 const window={addEventListener:(n,f)=>handlers[n]=f};
 const document={title:'Villa',body:{dataset:{measurementPage:'villa'}},referrer:'https://example.com/?email=PRIVATE',getElementById:id=>elements[id]||(elements[id]={hidden:true,addEventListener(n,f){this[n]=f},focus(){}}),head:{appendChild:s=>appended.push(s)},createElement:()=>({}),addEventListener:(n,f)=>handlers[n]=f};
 vm.runInNewContext(source,{window,document,location:new URL(url),URL,URLSearchParams,localStorage,sessionStorage,Date,Object});
 return {window,elements,appended,handlers,events:()=>Array.from(window.dataLayer||[],a=>Array.from(a)).filter(a=>a[0]==='event')};
}
test('unknown/rejected consent and blocked storage load no analytics',()=>{
 for(const s of [undefined,'rejected',JSON.stringify({state:'rejected'})]){const b=boot(s);assert.equal(b.appended.length,0);assert.equal(b.events().length,0)}
 assert.equal(boot(undefined,undefined,true).appended.length,0);
});
test('accept loads once, sanitized attribution, revocation stops intent',()=>{
 const b=boot(); b.elements['measurement-accept'].click();b.elements['measurement-accept'].click();
 assert.equal(b.appended.length,1);assert.equal(b.events().filter(e=>e[1]==='page_view').length,1);
 assert.ok(!JSON.stringify(b.window.dataLayer).includes('PRIVATE'));assert.ok(!JSON.stringify(b.window.dataLayer).includes('SECRET'));
 b.window.znMeasurement.whatsappIntent();assert.equal(b.events().at(-1)[1],'click_whatsapp');
 assert.ok(!b.events().some(e=>e[1]==='generate_lead'));
 const n=b.events().length;b.elements['measurement-reject'].click();b.window.znMeasurement.whatsappIntent();assert.equal(b.events().length,n);
 assert.equal(b.window['ga-disable-G-NFEM9HPFLR'],true);
});
test('local, preview and synthetic sessions never load production tag',()=>{
 for(const url of ['http://127.0.0.1:8769/villa/','https://preview.vercel.app/','https://znempreendimentos.com.br/?utm_source=qa_codex','https://znempreendimentos.com.br/?utm_medium=synthetic_test']) assert.equal(boot('accepted',url).appended.length,0);
});
test('saved and cross-tab consent respected',()=>{
 const b=boot(JSON.stringify({state:'accepted'}));assert.equal(b.appended.length,1);
 b.handlers.storage({key:'zn-measurement-consent',newValue:JSON.stringify({state:'rejected'})});
 b.window.znMeasurement.whatsappIntent();assert.equal(b.events().length,1);
});
