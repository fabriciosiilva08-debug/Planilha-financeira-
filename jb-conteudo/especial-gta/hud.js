// Uso: node especial-gta/hud.js [--video]
// Arte "tela de jogo" (HUD de mundo aberto: missão, minimapa, celular, legenda) com a J&B.
// Gera hud-missao.png e, com --video, hud-missao.mp4 (HUD entrando como numa gameplay).
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const {spawn,execFileSync}=require('child_process');
const LOGO='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'..','assets','logo.png')).toString('base64');
const palm=(x,y,h,s=1,c='#1a0b24')=>{const top=y-h;let f='';
 for(const a of [-150,-120,-80,-40,-10,20]){const r=a*Math.PI/180,len=70*s;
  f+=`<path d="M${x} ${top} Q${x+Math.cos(r)*len*.5} ${top+Math.sin(r)*len*.5-22*s} ${x+Math.cos(r)*len} ${top+Math.sin(r)*len*.55+18*s}" stroke="${c}" stroke-width="${9*s}" fill="none" stroke-linecap="round"/>`;}
 return `<path d="M${x-6*s} ${y} Q${x+14*s} ${y-h*.5} ${x} ${top}" stroke="${c}" stroke-width="${10*s}" fill="none" stroke-linecap="round"/>${f}`;};

// cenário: avenida à beira-mar no fim de tarde, câmera atrás do conversível
const scene=`<svg id=scene viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice"><defs>
<linearGradient id=sky x1=0 y1=0 x2=0 y2=1><stop offset=0 stop-color="#3a1a6e"/><stop offset=".35" stop-color="#c2366f"/><stop offset=".55" stop-color="#ff8a5c"/><stop offset=".62" stop-color="#ffc77a"/></linearGradient>
<linearGradient id=road x1=0 y1=0 x2=0 y2=1><stop offset=0 stop-color="#4a3550"/><stop offset=1 stop-color="#1c1422"/></linearGradient>
<linearGradient id=sea x1=0 y1=0 x2=0 y2=1><stop offset=0 stop-color="#ff9a6a"/><stop offset=1 stop-color="#2b5f8e"/></linearGradient>
<filter id=gl x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width=1080 height=1920 fill="url(#sky)"/><circle cx=640 cy=930 r=150 fill="#ffe6a3" opacity=".95"/>
<rect x=540 y=1010 width=540 height=120 fill="url(#sea)"/>
${[1030,1055,1085].map((y,i)=>`<rect x="${600+i*20}" y="${y}" width="${260-i*40}" height="4" fill="#ffe6a3" opacity=".6"/>`).join('')}
<path d="M0 1010 H560 L540 1130 H0Z" fill="#2a1840"/>
${(()=>{let o='',x=0,i=0;while(x<540){const w=70+(i*37)%60,h=200+(i*83)%260;
 o+=`<path d="M${x} 1015 V${1015-h} H${x+w*.2} V${1015-h-30} H${x+w*.8} V${1015-h} H${x+w} V1015Z" fill="${['#f0d6c8','#c9e7e3','#f3c6d6','#e9e0c4'][i%4]}" opacity=".92"/>`;
 for(let yy=1015-h+30;yy<1000;yy+=36)o+=`<rect x="${x+8}" y="${yy}" width="${w-16}" height="8" fill="#5b2a6e" opacity=".35"/>`;
 if(i%2===0)o+=`<rect x="${x+w/2-10}" y="${1015-h+20}" width="20" height="${Math.min(160,h-40)}" rx=4 fill="none" stroke="${i%4?'#38f0ff':'#ff4fa3'}" stroke-width="4" filter="url(#gl)"/>`;
 x+=w+6;i++;}return o;})()}
<path d="M540 1130 L590 1010 H660 L1080 1500 V1920 H0 V1580Z" fill="url(#road)"/>
<path d="M625 1010 L640 1010 L560 1920 L470 1920Z" fill="none"/>
${Array.from({length:9},(_,i)=>{const t=i/8,y=1020+Math.pow(t,1.8)*900,w=3+t*16,h=10+t*90,x=625-t*95;return `<rect x="${x-w/2}" y="${y}" width="${w}" height="${h}" fill="#ffd27a" opacity=".9"/>`}).join('')}
<path d="M0 1580 L540 1130 L520 1130 L0 1520Z" fill="#e9d9c7" opacity=".5"/>
${palm(900,1600,640,2.2)}${palm(1040,1560,520,1.7)}${palm(760,1300,300,1.1)}${palm(700,1180,170,.7)}
<g transform="translate(700 1560) scale(.82)">
 <ellipse cx=0 cy=250 rx=330 ry=36 fill="#000" opacity=".35"/>
 <path d="M-310 220 Q-320 120 -250 90 L-170 20 Q0 -10 170 20 L250 90 Q320 120 310 220 Q0 260 -310 220Z" fill="#e2366f"/>
 <path d="M-170 25 L-120 -40 Q0 -60 120 -40 L170 25Z" fill="#2b1838" opacity=".85"/>
 <path d="M-110 -30 Q0 -48 110 -30" stroke="#ffd7a8" stroke-width="5" fill="none" opacity=".6"/>
 <rect x=-280 y=120 width=90 height=34 rx=8 fill="#ff2d55" filter="url(#gl)"/><rect x=190 y=120 width=90 height=34 rx=8 fill="#ff2d55" filter="url(#gl)"/>
 <rect x=-70 y=140 width=140 height=40 rx=4 fill="#f4f0e6"/><text x=0 y=170 font-family="Anton" font-size=28 text-anchor=middle fill="#1a0f2e">J&amp;B 2026</text>
 <rect x=-300 y=200 width=80 height=70 rx=10 fill="#111"/><rect x=220 y=200 width=80 height=70 rx=10 fill="#111"/>
</g></svg>`;

const css=`@import url('https://fonts.googleapis.com/css2?family=Anton&family=Urbanist:wght@500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1920px;overflow:hidden;position:relative;font-family:Urbanist,sans-serif;color:#fff;background:#000}
#scene{position:absolute;inset:0;width:100%;height:100%}
.hud{position:absolute}
#obj{left:48px;top:70px;width:610px;background:rgba(8,6,14,.72);padding:26px 30px;border-left:6px solid #E7B64C;font-size:34px;font-weight:600;line-height:1.3}
#obj .k{font-family:Anton;font-size:22px;letter-spacing:.2em;color:#E7B64C;display:block;margin-bottom:8px}
#obj em{font-style:normal;color:#ff6fb1}
#stat{right:48px;top:70px;text-align:right}
#stat .money{font-family:Anton;font-size:64px;color:#9cf28a;text-shadow:3px 3px 0 #000;letter-spacing:.02em}
#stat .stars{font-size:52px;letter-spacing:6px;color:#fff;text-shadow:2px 2px 0 #000}
#stat .lbl{font-weight:800;font-size:20px;letter-spacing:.25em;text-shadow:2px 2px 0 #000}
#map{left:48px;bottom:110px;width:330px;height:330px;border-radius:24px;overflow:hidden;border:5px solid rgba(0,0,0,.75);box-shadow:0 10px 30px rgba(0,0,0,.5)}
#bars{left:48px;bottom:70px;width:330px;display:flex;gap:8px}
#bars div{height:14px;border:2px solid rgba(0,0,0,.7)}
#phone{right:44px;top:330px;width:380px;height:690px;border-radius:52px;background:#0d0b14;border:8px solid #22202b;box-shadow:0 20px 50px rgba(0,0,0,.6);overflow:hidden}
#phone .bar{height:110px;background:linear-gradient(135deg,#1a0b3d,#5b1a6e);display:flex;align-items:center;gap:16px;padding:30px 22px 0}
#phone .bar img{width:58px;height:58px;border-radius:50%;background:#09203a;object-fit:contain;padding:6px}
#phone .bar b{font-size:24px;display:block}#phone .bar span{font-size:17px;color:#9cf28a}
#phone .chat{padding:22px 18px;display:flex;flex-direction:column;gap:14px}
.msg{max-width:88%;padding:14px 18px;border-radius:22px;font-size:22px;line-height:1.3;font-weight:500}
.in{background:#26233a;align-self:flex-start;border-bottom-left-radius:6px}.out{background:#E7B64C;color:#1a0f2e;align-self:flex-end;border-bottom-right-radius:6px;font-weight:700}
.card{background:#1a1726;border:2px solid #E7B64C;border-radius:18px;padding:14px 16px;font-size:20px;line-height:1.5}
.card b{font-family:Anton;font-weight:400;font-size:26px;letter-spacing:.03em;color:#E7B64C;display:block}
#banner{left:0;right:0;top:1075px;text-align:center}
#banner .t{font-family:Anton;font-size:118px;line-height:1;color:#E7B64C;text-shadow:5px 5px 0 #000,0 0 40px rgba(231,182,76,.5);letter-spacing:.02em}
#banner .s{display:inline-block;margin-top:10px;background:rgba(8,6,14,.75);padding:8px 26px;font-weight:800;font-size:30px;letter-spacing:.18em}
#sub{left:70px;right:70px;top:1300px;text-align:center;font-size:36px;font-weight:700;line-height:1.35;text-shadow:2px 2px 0 #000,0 0 12px #000}
#sub .who{color:#E7B64C}
#legal{left:400px;right:30px;bottom:24px;text-align:right;font-size:17px;color:rgba(255,255,255,.75);text-shadow:1px 1px 0 #000}`;

const mapSvg=`<svg viewBox="0 0 330 330"><rect width=330 height=330 fill="#26314a"/>
<path d="M0 0 H200 Q180 120 210 200 Q240 280 200 330 H0Z" fill="#4b5c4a"/>
${[50,110,170,230,290].map(y=>`<path d="M0 ${y} H205" stroke="#7d8a7a" stroke-width="7"/>`).join('')}${[40,100,150].map(x=>`<path d="M${x} 0 V330" stroke="#7d8a7a" stroke-width="7"/>`).join('')}
<path id=route d="M165 290 V230 H100 V110 H150 Q200 90 240 60 L290 40" stroke="#c77dff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<g transform="translate(290 40)"><circle r=22 fill="#E7B64C" stroke="#000" stroke-width="3"/><path transform="scale(.42) rotate(-45)" d="M0-6 L-14-6 L-24-26 L-31-26 L-25-6 L-40-6 L-46-15 L-51-15 L-48 0 L-51 15 L-46 15 L-40 6 L-25 6 L-31 26 L-24 26 L-14 6 L0 6 Q8 0 0-6Z" fill="#1a0f2e"/></g>
<path d="M165 300 l-14 22 14-7 14 7z" fill="#fff" stroke="#000" stroke-width="2"/>
<text x=16 y=318 font-family="Anton" font-size=18 fill="#fff">N</text></svg>`;

const html=`<html><head><meta charset=utf-8><style>${css}</style></head><body>${scene}
<div class="hud" id=obj><span class=k>NOVA MISSÃO</span>Encontre a <em>J&amp;B</em> e pegue o roteiro para a <em>Flórida da vida real</em>.</div>
<div class="hud" id=stat><div class=money>✈ MIAMI</div><div class=stars>★★★★★</div><div class=lbl>NÍVEL DE FÉRIAS</div></div>
<div class="hud" id=map>${mapSvg}</div>
<div class="hud" id=bars><div style="width:60%;background:#7ee08a"></div><div style="width:40%;background:#5fb4ff"></div></div>
<div class="hud" id=phone><div class=bar><img src="${LOGO}"><div><b>J&amp;B Viagens</b><span>online</span></div></div><div class=chat>
 <div class="msg in">Oi! Bora trocar o controle pela passagem? 😎</div>
 <div class="card"><b>ROTEIRO FLÓRIDA</b>• Miami · Ocean Drive<br>• Florida Keys · Key West<br>• Everglades · aerobarco</div>
 <div class="msg in">Voo, hotel e passeios: a gente organiza tudo.</div>
 <div class="msg out">Aceito a missão!</div></div></div>
<div class="hud" id=banner><div class=t>MISSÃO ACEITA</div><div class=s>FÉRIAS DESBLOQUEADAS</div></div>
<div class="hud" id=sub><span class=who>Consultora J&amp;B:</span> Deixa o roteiro com a gente. Você só aproveita a viagem.</div>
<div class="hud" id=legal>Arte inspirada em games de mundo aberto. GTA VI é marca da Rockstar Games; a J&amp;B não tem relação com o jogo.</div>
</body></html>`;

// animação: cada elemento entra como numa gameplay
function setup(){const c=(x)=>Math.min(1,Math.max(0,x)),e=x=>1-Math.pow(1-c(x),3),p=(t,a,d)=>c((t-a)/d),$=s=>document.querySelector(s);
 const route=$('#route'),L=route.getTotalLength();route.style.strokeDasharray=L;
 const msgs=[...document.querySelectorAll('#phone .chat>*')],stars=$('#stat .stars');
 window.DUR=11;
 window.seek=t=>{
  $('#scene').style.transform=`scale(${1.08-.06*e(t/11)}) translateY(${-20*t/11}px)`;
  let k=e(p(t,.4,.6));$('#obj').style.opacity=k;$('#obj').style.transform=`translateX(${(1-k)*-80}px)`;
  k=e(p(t,.8,.6));$('#stat').style.opacity=k;
  const n=Math.round(5*c((t-1.1)/1.2));stars.textContent='★'.repeat(n)+'☆'.repeat(5-n);
  k=e(p(t,1.2,.6));$('#map').style.opacity=k;$('#bars').style.opacity=k;$('#map').style.transform=`scale(${.8+.2*k})`;
  route.style.strokeDashoffset=L*(1-e(p(t,1.6,1.6)));
  k=e(p(t,2.6,.7));$('#phone').style.opacity=t<2.6?0:1;$('#phone').style.transform=`translateY(${(1-k)*1200}px) rotate(${Math.sin(t*40)*(t>2.6&&t<3.1?1.5:0)}deg)`;
  msgs.forEach((m,i)=>{const q=e(p(t,3.3+i*.9,.4));m.style.opacity=q;m.style.transform=`translateY(${(1-q)*20}px) scale(${.9+.1*q})`;});
  k=e(p(t,7,.45));const b=$('#banner');b.style.opacity=k;b.querySelector('.t').style.transform=`scale(${1.6-.6*k})`;
  const s=$('#sub');s.style.opacity=e(p(t,7.8,.4));
  $('#legal').style.opacity=e(p(t,8.2,.5));
  document.body.style.opacity=Math.min(1,t/.3);
 };}

(async()=>{const vid=process.argv.includes('--video');const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
 await pg.setContent(html,{waitUntil:'networkidle'});await pg.evaluate(()=>document.fonts.ready);await pg.evaluate(setup);
 await pg.evaluate(()=>seek(DUR));const png=path.join(__dirname,'hud-missao.png');await pg.screenshot({path:png});console.log(png);
 if(vid){const FPS=30,N=Math.ceil(11*FPS),out=path.join(__dirname,'hud-missao.mp4'),tv=out+'.v.mp4',ta=out+'.a.m4a';
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','19','-movflags','+faststart',tv]);
  const done=new Promise(r=>ff.on('close',r));
  for(let i=0;i<N;i++){await pg.evaluate(t=>seek(t),i/FPS);const buf=await pg.screenshot({type:'jpeg',quality:93});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));}
  ff.stdin.end();await done;
  // trilha synthwave original: baixo pulsante + pad + "plim" do celular e acorde da missão
  const bass=`0.18*sin(2*PI*55*t)*(0.5+0.5*sin(2*PI*4*t))*between(mod(t,2),0,1)+0.18*sin(2*PI*41.2*t)*(0.5+0.5*sin(2*PI*4*t))*between(mod(t,2),1,2)`;
  const pad=[220,277.18,329.63,415.3].map(f=>`0.04*sin(2*PI*${f}*t)`).join('+');
  const ding=[3.3,4.2,5.1,6.0].map(a=>`0.12*sin(2*PI*1320*t)*exp(-12*(t-${a}))*gte(t,${a})`).join('+');
  const win=[523.25,659.25,783.99,1046.5].map(f=>`0.07*sin(2*PI*${f}*t)*exp(-1.2*(t-7))*gte(t,7)`).join('+');
  execFileSync('ffmpeg',['-y','-loglevel','error','-f','lavfi','-i',`aevalsrc='${bass}+${pad}+${ding}+${win}':s=44100:d=11`,'-af','lowpass=f=5000,afade=t=in:d=0.4,afade=t=out:st=9.8:d=1.2,alimiter=limit=0.8','-ac','2','-c:a','aac','-b:a','160k',ta]);
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',tv,'-i',ta,'-c','copy','-shortest','-movflags','+faststart',out]);fs.unlinkSync(tv);fs.unlinkSync(ta);console.log(out);}
 await b.close();})();
