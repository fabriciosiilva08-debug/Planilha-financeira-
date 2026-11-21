// Uso: node video.js caminho/post.json [--mudo]  -> gera MP4 1080x1920 (story/reels) ao lado do JSON
// Lê o mesmo JSON do render.js e anima: fundo em movimento, avião abrindo a cena, título palavra
// por palavra, número contando, texto em legenda progressiva (karaokê), itens da dica entrando um a um
// e encerramento com logo + CTA. Trilha ambiente sintetizada (original, sem direitos autorais).
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const {spawn,execFileSync}=require('child_process');
const FPS=30;
const d64=f=>fs.readFileSync(path.join(__dirname,'assets',f)).toString('base64');
const BG='data:image/jpeg;base64,'+d64('bg.jpg'), LOGO='data:image/png;base64,'+d64('logo.png');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
// quebra em palavras preservando *destaque*
function words(s){const out=[];let gold=false,prev=' ';
 for(const tok of String(s).split(/(\*)/)){if(tok==='*'){gold=!gold;continue;}
  tok.split(/\s+/).forEach((w,i)=>{if(!w)return;
   if(i===0&&out.length&&!/^\s/.test(tok)&&!/\s$/.test(prev))out[out.length-1].tail=(out[out.length-1].tail||[]).concat({w,gold});
   else out.push({w,gold});});prev=tok;}return out;}
// palavra + pontuação colada (ex.: *arredondada*?) sem espaço no meio
const wHtml=(x,inner)=>inner(x)+(x.tail||[]).map(y=>`<span class="${y.gold?'gold it':''}">${esc(y.w)}</span>`).join('');
const spans=(s,cls)=>words(s).map(x=>`<span class="${cls}">${wHtml(x,x=>`<span class="${x.gold?'gold it':''}">${esc(x.w)}</span>`)}</span>`).join(' ');

const css=`@import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,600;1,600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;background:#09203a;font-family:Urbanist,sans-serif;color:#fff;position:relative;overflow:hidden}
#bg{position:absolute;inset:-60px;background:url(${BG}) center/cover;will-change:transform}
#vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(9,32,58,0) 40%,rgba(4,14,28,.55) 100%)}
#pts{position:absolute;inset:0}.pt{position:absolute;border-radius:50%;background:#E7B64C}
.gold{color:#E7B64C}.it{font-style:italic}
#logo{position:absolute;left:445px;top:170px;width:190px}
#plane{position:absolute;left:0;top:0;width:1080px;height:1920px}
.wrap{position:absolute;left:110px;right:110px;top:540px}
.tag{font-weight:500;letter-spacing:.32em;font-size:26px;color:#D0AE78;text-transform:uppercase;text-align:center}
h1{font-family:'Cormorant Garamond',serif;font-weight:600;line-height:1.1;text-align:center;margin:26px 0 30px;font-variant-numeric:lining-nums}
.tw{display:inline-block}
.rule{width:90px;height:2px;background:#D0AE78;margin:0 auto 80px;transform-origin:center}
.item{display:flex;gap:36px;margin-bottom:64px}.n{font-family:'Cormorant Garamond';font-size:120px;line-height:.8;color:#E7B64C;width:70px;flex:none;font-variant-numeric:lining-nums}
.t{font-size:44px;font-weight:600;line-height:1.15}.d{font-size:33px;font-weight:300;line-height:1.35;margin-top:12px;color:#dfe6ee}
.big{font-family:'Cormorant Garamond';font-size:280px;line-height:1;color:#E7B64C;text-align:center;font-variant-numeric:lining-nums}
.txt{font-size:48px;font-weight:300;line-height:1.45;text-align:center;color:#e6ecf2}
.cw{transition:none}
.cta{position:absolute;bottom:120px;left:0;right:0;text-align:center;font-size:30px;letter-spacing:.12em;color:#D0AE78;font-weight:500}
#outro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0}
#outro img{width:300px}#outro .line{width:0;height:2px;background:#D0AE78;margin:70px 0 50px}
#outro .c{font-size:40px;letter-spacing:.16em;color:#E7B64C;font-weight:500;text-align:center;padding:0 80px;line-height:1.4}
#outro .s{margin-top:30px;font-size:28px;letter-spacing:.3em;color:#D0AE78;font-weight:400}`;

function html(p){let body;
 const tsz=p.tipo==='dica'?(p.titulo.length>45?80:92):(p.titulo.length>50?78:92);
 const title=`<h1 style="font-size:${tsz}px">${words(p.titulo).map(x=>`<span class="tw">${wHtml(x,x=>`<span class="${x.gold?'gold it':''}">${esc(x.w)}</span>`)}</span>`).join(' ')}</h1>`;
 if(p.tipo==='dica'){body=title+`<div class=rule></div>`+
  p.itens.map((x,i)=>`<div class=item><div class=n>${i+1}</div><div><div class=t>${esc(x.t)}</div><div class=d>${spans(x.d,'cw')}</div></div></div>`).join('');}
 else{body=title+`<div class=rule style="margin-bottom:60px"></div>`+
  (p.numero?`<div class=big id=num>${esc(p.numero)}</div>`:'')+`<p class=txt style="margin-top:40px">${spans(p.texto,'cw')}</p>`;}
 return `<html><head><meta charset=utf-8><style>${css}</style></head><body>
 <div id=bg></div><div id=vig></div><div id=pts></div>
 <svg id=plane viewBox="0 0 1080 1920"><path id=trail d="M-60 520 C 250 380, 700 600, 1140 430" fill=none stroke="#D0AE78" stroke-width=3 stroke-dasharray="2 16" stroke-linecap=round opacity=.8/>
  <g id=pl><path d="M0-6 L-14-6 L-24-26 L-31-26 L-25-6 L-40-6 L-46-15 L-51-15 L-48 0 L-51 15 L-46 15 L-40 6 L-25 6 L-31 26 L-24 26 L-14 6 L0 6 Q8 0 0-6Z" fill="#E7B64C"/></g></svg>
 <div id=main><img id=logo src="${LOGO}">
 <div class=wrap><div class=tag>${esc(p.tag||(p.tipo==='dica'?'Dica da consultora':'Você sabia?'))}</div>${body}</div>
 <div class=cta>${esc(p.cta||'FALE COM A GENTE NO DIRECT')}</div></div>
 <div id=outro><img src="${LOGO}"><div class=line></div><div class=c>${esc(p.cta||'FALE COM A GENTE NO DIRECT')}</div>${p.perfil?`<div class=s>${esc(p.perfil)}</div>`:''}</div>
 </body></html>`;}

// Roda dentro da página: monta a linha do tempo e expõe window.seek(t)
function setup(p){
 const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), ease=x=>1-Math.pow(1-clamp(x),3),
  easeIO=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2}, prog=(t,a,d)=>clamp((t-a)/d);
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 // partículas douradas (determinísticas)
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const pts=[];for(let i=0;i<38;i++){const e=document.createElement('div');e.className='pt';const s=2+rnd()*5;
  e.style.width=e.style.height=s+'px';$('#pts').appendChild(e);pts.push({e,x:rnd()*1080,y:rnd()*1920,v:12+rnd()*30,ph:rnd()*6.28,a:.15+rnd()*.45});}
 const tw=$$('.tw'), tag=$('.tag'), rule=$('.rule'), logo=$('#logo'), cta=$('.cta'), trail=$('#trail'), pl=$('#pl');
 const L=trail.getTotalLength(); trail.style.strokeDasharray='2 16';
 // linha do tempo
 const T={plane:[.2,1.8],logo:.3,tag:.9,title:1.3}; T.titleEnd=T.title+tw.length*.13+.5; T.rule=T.titleEnd-.2;
 let t0=T.titleEnd+.2, seq=[];
 const num=$('#num'); let numInfo=null;
 if(num){const raw=num.textContent, m=raw.match(/\d[\d.,]*/);
  if(m){const digits=m[0], val=parseFloat(digits.replace(/\./g,'').replace(',','.')), year=/^\d{4}$/.test(digits)&&val>1000&&val<2100;
   numInfo={raw,m:m[0],val,year,dec:(digits.split(',')[1]||'').length,sep:digits.includes('.')};}
  seq.push({k:'num',a:t0,d:1.6}); t0+=1.3;}
 const cws=$$('.cw');
 if(p.tipo==='dica'){$$('.item').forEach((it,i)=>{const ws=[...it.querySelectorAll('.cw')];
   seq.push({k:'item',el:it,a:t0,ws,wd:.26});t0+=.6+ws.length*.26+.5;});}
 else{seq.push({k:'txt',a:t0+.2,ws:cws,wd:.3});t0+=.2+cws.length*.3;}
 const hold=t0+1.4, outA=hold, outD=.9, end=outA+outD+3.2;
 const fmt=v=>{let s=numInfo.dec?v.toFixed(numInfo.dec).replace('.',','):String(Math.round(v));
   if(numInfo.sep){const [i,d]=s.split(',');s=i.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(d?','+d:'');}return numInfo.raw.replace(numInfo.m,s);};
 window.DUR=end;
 window.seek=t=>{
  // fundo: ken burns lento + partículas subindo
  const z=1.02+.07*(t/end); $('#bg').style.transform=`scale(${z}) translate(${-14*t/end}px,${-22*t/end}px)`;
  pts.forEach(o=>{const y=((o.y-o.v*t)%1920+1920)%1920, x=o.x+Math.sin(t*.6+o.ph)*14;
   o.e.style.transform=`translate(${x}px,${y}px)`;o.e.style.opacity=o.a*(.6+.4*Math.sin(t*1.3+o.ph));});
  // avião e rastro
  const pp=easeIO(prog(t,T.plane[0],T.plane[1]-T.plane[0]));
  trail.style.strokeDashoffset=0; trail.setAttribute('stroke-dasharray',`${2} 16`);
  trail.style.clipPath=`inset(0 ${100-pp*100}% 0 0)`; trail.style.opacity=.8*(1-prog(t,2.2,1));
  const P=trail.getPointAtLength(L*pp), P2=trail.getPointAtLength(Math.min(L,L*pp+2));
  const ang=Math.atan2(P2.y-P.y,P2.x-P.x)*180/Math.PI;
  pl.setAttribute('transform',`translate(${P.x} ${P.y}) rotate(${ang})`); pl.style.opacity=pp>0&&pp<1?1:0;
  // logo, tag, título, linha
  const lg=ease(prog(t,T.logo,.9)); logo.style.opacity=lg; logo.style.transform=`translateY(${(1-lg)*30}px) scale(${.92+.08*lg})`;
  const tg=ease(prog(t,T.tag,.8)); tag.style.opacity=tg; tag.style.letterSpacing=(.6-.28*tg)+'em';
  tw.forEach((w,i)=>{const k=ease(prog(t,T.title+i*.13,.6));w.style.opacity=k;w.style.transform=`translateY(${(1-k)*40}px)`;w.style.filter=`blur(${(1-k)*8}px)`;});
  rule.style.transform=`scaleX(${ease(prog(t,T.rule,.7))})`;
  cta.style.opacity=ease(prog(t,T.titleEnd,.8))*(.75+.25*Math.sin(t*3));
  // sequência de conteúdo
  for(const s of seq){
   if(s.k==='num'){const k=ease(prog(t,s.a,s.d));num.style.opacity=ease(prog(t,s.a,.5));num.style.transform=`scale(${.85+.15*k})`;
    if(numInfo){const from=numInfo.year?numInfo.val-120:0;num.textContent=fmt(from+(numInfo.val-from)*k);}}
   if(s.k==='item'){const k=ease(prog(t,s.a,.6));const n=s.el.querySelector('.n'),tt=s.el.querySelector('.t');
    n.style.opacity=k;n.style.transform=`scale(${.5+.5*k})`;tt.style.opacity=k;tt.style.transform=`translateX(${(1-k)*60}px)`;
    s.ws.forEach((w,i)=>{const a=s.a+.6+i*s.wd;w.style.opacity=.12*k+.88*ease(prog(t,a,.25));w.style.color='';});}
   if(s.k==='txt'){s.ws.forEach((w,i)=>{const a=s.a+i*s.wd, on=prog(t,a,.25);
    w.style.opacity=.12*ease(prog(t,s.a-.6,.6))+.88*ease(on); w.style.color=(t>=a&&t<a+s.wd*1.6)?'#E7B64C':'';});}
  }
  // encerramento
  const o=easeIO(prog(t,outA,outD));
  $('#main').style.opacity=1-o; $('#main').style.filter=`blur(${o*10}px)`; $('#main').style.transform=`scale(${1+.04*o})`;
  const oi=ease(prog(t,outA+.3,1)); const out=$('#outro'); out.style.opacity=oi;
  out.querySelector('img').style.transform=`scale(${.8+.2*oi})`;
  out.querySelector('.line').style.width=(260*ease(prog(t,outA+.8,.9)))+'px';
  const c=ease(prog(t,outA+1.1,.9)); const ce=out.querySelector('.c'); ce.style.opacity=c; ce.style.transform=`translateY(${(1-c)*24}px)`;
  const se=out.querySelector('.s');if(se)se.style.opacity=ease(prog(t,outA+1.6,.8));
  document.body.style.opacity=Math.min(1,t/.35)*(1-prog(t,end-.35,.35));
 };
 // marcas de tempo para o som
 window.CUES={whoosh:[T.plane[0],outA]};
}

function audio(dur,cues,out){
 // pad ambiente (Lá maior com 9ª) com respiração lenta + "whoosh" de ruído filtrado nas transições
 const ch=[110,164.81,220,277.18,329.63,493.88];
 const pad=ch.map((f,i)=>`0.06*sin(2*PI*${f}*t)*(0.6+0.4*sin(2*PI*${(0.07+i*0.03).toFixed(2)}*t+${i}))`).join('+');
 const wh=cues.whoosh.map((c,i)=>`[n${i}]`).join('');
 const nf=cues.whoosh.map((c,i)=>`anoisesrc=d=1.4:c=pink:a=0.35,highpass=f=400,lowpass=f=3000,afade=t=in:d=0.6,afade=t=out:st=0.6:d=0.8,adelay=${Math.round(c*1000)}|${Math.round(c*1000)},apad=whole_dur=${dur}[n${i}]`).join(';');
 const fc=`aevalsrc='${pad}':s=44100:d=${dur},lowpass=f=1800,aecho=0.8:0.7:420:0.35,afade=t=in:d=1.5,afade=t=out:st=${(dur-1.8).toFixed(2)}:d=1.8,pan=stereo|c0=c0|c1=c0[pad];${nf};[pad]${wh}amix=inputs=${cues.whoosh.length+1}:normalize=0,alimiter=limit=0.8[a]`;
 execFileSync('ffmpeg',['-y','-loglevel','error','-filter_complex',fc,'-map','[a]','-t',String(dur),'-c:a','aac','-b:a','160k',out]);
}

(async()=>{const f=path.resolve(process.argv[2]);const mudo=process.argv.includes('--mudo');
 const p=JSON.parse(fs.readFileSync(f,'utf8'));
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
 await pg.setContent(html(p),{waitUntil:'networkidle'});await pg.evaluate(()=>document.fonts.ready);
 await pg.evaluate(setup,p);
 const dur=await pg.evaluate(()=>DUR), cues=await pg.evaluate(()=>CUES), N=Math.ceil(dur*FPS);
 const out=f.replace(/\.json$/,'.mp4'), tmpV=out+'.v.mp4', tmpA=out+'.a.m4a';
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-',
  '-c:v','libx264','-pix_fmt','yuv420p','-preset','medium','-crf','19','-movflags','+faststart',tmpV],{stdio:['pipe','inherit','inherit']});
 const done=new Promise((r,j)=>ff.on('close',c=>c?j(new Error('ffmpeg '+c)):r()));
 for(let i=0;i<N;i++){await pg.evaluate(t=>seek(t),i/FPS);
  const buf=await pg.screenshot({type:'jpeg',quality:93});
  if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
  if(i%60===0)process.stdout.write(`\r${Math.round(i/N*100)}%`);}
 ff.stdin.end();await done;
 // capa (frame final do conteúdo, antes do encerramento) para usar como thumbnail
 await b.close();
 if(mudo)fs.renameSync(tmpV,out);
 else{audio(dur,cues,tmpA);
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',tmpV,'-i',tmpA,'-c:v','copy','-c:a','copy','-shortest','-movflags','+faststart',out]);
  fs.unlinkSync(tmpV);fs.unlinkSync(tmpA);}
 console.log(`\r${out} ok (${dur.toFixed(1)}s, ${N} quadros)`);})();
