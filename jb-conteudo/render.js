// Uso: node render.js caminho/post.json  -> gera PNG(s) 1080x1920 ao lado do JSON
// post.json: {"tipo":"dica"|"curiosidade", "tag":"...", "titulo":"texto com *destaque*",
//   dica: "itens":[{"t":"...","d":"..."}] (3 itens)   curiosidade: "numero":"opcional", "texto":"..."
//   "cta":"FALE COM A GENTE NO DIRECT"}
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const d64=f=>fs.readFileSync(path.join(__dirname,'assets',f)).toString('base64');
const BG='data:image/jpeg;base64,'+d64('bg.jpg'), LOGO='data:image/png;base64,'+d64('logo.png');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const hl=s=>esc(s).replace(/\*(.+?)\*/g,'<span class="gold it">$1</span>');
const css=`@import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,600;1,600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;background:#09203a url(${BG}) center/cover;font-family:Urbanist,sans-serif;color:#fff;position:relative;overflow:hidden;display:flow-root}
.gold{color:#E7B64C}.it{font-style:italic}.logo{display:block;margin:170px auto 0;width:190px}
.wrap{position:absolute;left:110px;right:110px;top:540px}
.tag{font-weight:500;letter-spacing:.32em;font-size:26px;color:#D0AE78;text-transform:uppercase;text-align:center}
h1{font-family:'Cormorant Garamond',serif;font-weight:600;line-height:1.1;text-align:center;margin:26px 0 30px;font-variant-numeric:lining-nums}
.rule{width:90px;height:2px;background:#D0AE78;margin:0 auto 80px}
.item{display:flex;gap:36px;margin-bottom:64px}.n{font-family:'Cormorant Garamond';font-size:120px;line-height:.8;color:#E7B64C;width:70px;flex:none;font-variant-numeric:lining-nums}
.t{font-size:44px;font-weight:600;line-height:1.15}.d{font-size:33px;font-weight:300;line-height:1.35;margin-top:12px;color:#dfe6ee}
.big{font-family:'Cormorant Garamond';font-size:280px;line-height:1;color:#E7B64C;text-align:center;font-variant-numeric:lining-nums}
.txt{font-size:48px;font-weight:300;line-height:1.45;text-align:center;color:#e6ecf2}
.cta{position:absolute;bottom:120px;left:0;right:0;text-align:center;font-size:30px;letter-spacing:.12em;color:#D0AE78;font-weight:500}`;
function html(p){let body;
 if(p.tipo==='dica'){body=`<h1 style="font-size:${p.titulo.length>45?80:92}px">${hl(p.titulo)}</h1><div class=rule></div>`+
  p.itens.map((x,i)=>`<div class=item><div class=n>${i+1}</div><div><div class=t>${esc(x.t)}</div><div class=d>${esc(x.d)}</div></div></div>`).join('');}
 else{body=`<h1 style="font-size:${p.titulo.length>50?78:92}px">${hl(p.titulo)}</h1><div class=rule style="margin-bottom:60px"></div>`+
  (p.numero?`<div class=big>${esc(p.numero)}</div>`:'')+`<p class=txt style="margin-top:40px">${hl(p.texto)}</p>`;}
 return `<html><head><meta charset=utf-8><style>${css}</style></head><body><img class=logo src="${LOGO}">
 <div class=wrap><div class=tag>${esc(p.tag||(p.tipo==='dica'?'Dica da consultora':'Você sabia?'))}</div>${body}</div>
 <div class=cta>${esc(p.cta||'FALE COM A GENTE NO DIRECT')}</div></body></html>`;}
(async()=>{const f=path.resolve(process.argv[2]);const p=JSON.parse(fs.readFileSync(f,'utf8'));
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
 await pg.setContent(html(p),{waitUntil:'networkidle'});await pg.evaluate(()=>document.fonts.ready);
 // checa se algo passou do limite seguro (acima do CTA)
 const over=await pg.evaluate(()=>document.querySelector('.wrap').getBoundingClientRect().bottom);
 const out=f.replace(/\.json$/,'.png');await pg.screenshot({path:out});await b.close();
 console.log(out, over>1700?'AVISO: texto longo demais, encurte (bottom='+Math.round(over)+')':'ok');})();
