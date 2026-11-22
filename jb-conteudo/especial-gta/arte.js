// Uso: node especial-gta/arte.js -> gera especial-gta/arte-leonida.png (1080x1920)
// Arte em painéis (grade de quadros ilustrados, estilo capa de game) com identidade da J&B.
// Sem logo, personagens ou fontes do jogo: só ilustrações originais em vetor.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const LOGO='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'..','assets','logo.png')).toString('base64');

// helpers de desenho
const palm=(x,y,h,s=1,c='#140a24')=>{const top=y-h;let f='';
 for(const a of [-150,-120,-80,-40,-10,20]){const r=a*Math.PI/180,len=70*s;
  const ex=x+Math.cos(r)*len,ey=top+Math.sin(r)*len*.55+18*s;
  f+=`<path d="M${x} ${top} Q${x+Math.cos(r)*len*.5} ${top+Math.sin(r)*len*.5-22*s} ${ex} ${ey}" stroke="${c}" stroke-width="${9*s}" fill="none" stroke-linecap="round"/>`;}
 return `<path d="M${x-6*s} ${y} Q${x+14*s} ${y-h*.5} ${x} ${top}" stroke="${c}" stroke-width="${10*s}" fill="none" stroke-linecap="round"/>${f}`;};
const glow=id=>`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

// 1. Ocean Drive à noite (art déco + néon)
const s1=`<svg viewBox="0 0 640 560" preserveAspectRatio="xMidYMid slice"><defs>
 <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0b3d"/><stop offset=".6" stop-color="#5b1a6e"/><stop offset="1" stop-color="#c2366f"/></linearGradient>${glow('g1')}</defs>
 <rect width="640" height="560" fill="url(#a1)"/>
 ${Array.from({length:40},(_,i)=>`<circle cx="${(i*97)%640}" cy="${(i*53)%260}" r="${i%3?1:1.8}" fill="#fff" opacity=".6"/>`).join('')}
 <path d="M150 560 V250 H200 V215 H240 V180 H400 V215 H440 V250 H490 V560Z" fill="#f2e6d8"/>
 <path d="M150 560 V250 H200 V215 H240 V180 H400 V215 H440 V250 H490 V560Z" fill="#2a1450" opacity=".35"/>
 ${[300,350,400,450,500].map(y=>`<rect x="150" y="${y}" width="340" height="10" fill="#7fe3e0" opacity=".85"/>`).join('')}
 ${[175,230,290,350,410,455].map(x=>[275,325,375,425,475].map(y=>`<rect x="${x}" y="${y+18}" width="26" height="20" fill="${(x+y)%3?'#ffd37a':'#3a1d5e'}"/>`).join('')).join('')}
 <rect x="290" y="186" width="60" height="206" rx="10" fill="#1a0b3d"/><g filter="url(#g1)"><rect x="290" y="186" width="60" height="206" rx="10" fill="none" stroke="#ff4fa3" stroke-width="5"/>
 ${'OCEAN'.split('').map((c,i)=>`<text x="320" y="${226+i*38}" font-family="Anton" font-size="34" fill="#fff" stroke="#ff4fa3" stroke-width="1.5" text-anchor="middle">${c}</text>`).join('')}
 <path d="M150 250 H490" stroke="#38f0ff" stroke-width="4"/><path d="M240 180 H400" stroke="#38f0ff" stroke-width="4"/></g>
 <rect y="520" width="640" height="40" fill="#120720"/><path d="M0 520 H640" stroke="#ff4fa3" stroke-width="3" opacity=".7"/>
 ${palm(70,560,330,1.3)}${palm(585,560,300,1.2)}${palm(120,560,220,.9)}</svg>`;

// 2. Pôr do sol retrô com palmeiras
const s2=`<svg viewBox="0 0 426 560" preserveAspectRatio="xMidYMid slice"><defs>
 <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a59"/><stop offset=".55" stop-color="#ffb36b"/><stop offset=".56" stop-color="#2b6f9e"/><stop offset="1" stop-color="#123a63"/></linearGradient>
 <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset="1" stop-color="#ff5d7a"/></linearGradient>
 <clipPath id="c2"><circle cx="213" cy="300" r="120"/></clipPath></defs>
 <rect width="426" height="560" fill="url(#a2)"/>
 <g clip-path="url(#c2)"><rect x="80" y="170" width="270" height="140" fill="url(#sun)"/>
 ${[250,268,284,298].map((y,i)=>`<rect x="80" y="${y}" width="270" height="${4+i*2}" fill="#ffb36b"/>`).join('')}</g>
 ${[330,350,372,398,428].map((y,i)=>`<rect x="${120-i*20}" y="${y}" width="${186+i*40}" height="3" fill="#ffd2a1" opacity="${.7-i*.1}"/>`).join('')}
 ${palm(60,560,420,1.4)}${palm(370,560,360,1.2)}${palm(330,560,250,.85)}</svg>`;

// 3. Everglades: aerobarco no capim
const s3=`<svg viewBox="0 0 430 456" preserveAspectRatio="xMidYMid slice"><defs>
 <linearGradient id="a3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a5a"/><stop offset=".5" stop-color="#ffd08a"/><stop offset=".51" stop-color="#3c7f6e"/><stop offset="1" stop-color="#173f3a"/></linearGradient></defs>
 <rect width="430" height="456" fill="url(#a3)"/><circle cx="330" cy="150" r="50" fill="#fff1c4" opacity=".9"/>
 <path d="M0 230 Q60 205 120 228 T240 225 T430 220 V240 H0Z" fill="#2f5d3b"/>
 ${Array.from({length:60},(_,i)=>{const x=i*7.5,h=30+((i*37)%40);return `<path d="M${x} 250 L${x+3} ${250-h} L${x+6} 250Z" fill="#4e7a3a"/>`}).join('')}
 <g transform="translate(110 300)"><path d="M0 40 H210 L190 62 H20Z" fill="#e8ecef"/><rect x="40" y="18" width="70" height="22" fill="#d84a4a"/>
 <rect x="128" y="-40" width="10" height="80" fill="#333"/><circle cx="160" cy="0" r="46" fill="none" stroke="#222" stroke-width="7"/>
 ${[0,45,90,135].map(a=>`<line x1="160" y1="0" x2="${160+46*Math.cos(a*Math.PI/180)}" y2="${46*Math.sin(a*Math.PI/180)}" stroke="#222" stroke-width="3"/><line x1="160" y1="0" x2="${160-46*Math.cos(a*Math.PI/180)}" y2="${-46*Math.sin(a*Math.PI/180)}" stroke="#222" stroke-width="3"/>`).join('')}
 <path d="M-60 70 Q40 58 230 66" stroke="#bfe6dc" stroke-width="4" fill="none" opacity=".7"/></g>
 <g transform="translate(385 318)" fill="#f4f0e6"><ellipse cx="0" cy="0" rx="16" ry="10"/><path d="M10 -4 Q22 -40 30 -44 L38 -42 L30 -38 Q24 -30 18 -2Z"/><path d="M-4 8 L-8 40 M4 8 L4 40" stroke="#f4f0e6" stroke-width="2"/></g></svg>`;

// 4. Florida Keys: ponte sobre o mar turquesa
const s4=`<svg viewBox="0 0 636 456" preserveAspectRatio="xMidYMid slice"><defs>
 <linearGradient id="a4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd2ff"/><stop offset=".38" stop-color="#d9f3ff"/><stop offset=".39" stop-color="#2fc2c9"/><stop offset="1" stop-color="#0d7f95"/></linearGradient></defs>
 <rect width="636" height="456" fill="url(#a4)"/>
 <path d="M440 120 Q470 80 500 70 Q540 60 560 90 Q600 85 620 110Z" fill="#fff" opacity=".85"/><path d="M60 90 Q90 60 130 70 Q160 50 190 80Z" fill="#fff" opacity=".8"/>
 <ellipse cx="560" cy="178" rx="90" ry="8" fill="#e9dcae"/>${palm(540,178,60,.45,'#1f6b4a')}${palm(580,178,50,.4,'#1f6b4a')}
 <path d="M-20 420 L636 172 L636 186 L-20 456Z" fill="#f2f2ee"/>
 ${Array.from({length:22},(_,i)=>{const t=i/21,x=-20+t*656,y=438-t*258,h=40-t*34,w=10-t*7;return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#d7d7d0"/>`}).join('')}
 <path d="M-20 420 L636 172" stroke="#c94f4f" stroke-width="2"/>
 <rect x="210" y="335" width="26" height="12" rx="3" fill="#ff5d7a" transform="rotate(-20.6 223 341)"/>
 ${[250,300,350,400].map((y,i)=>`<path d="M${40+i*40} ${y+30} q20 -8 40 0" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>`).join('')}</svg>`;

// 5. Skyline de Miami à noite
const s5=`<svg viewBox="0 0 600 506" preserveAspectRatio="xMidYMid slice"><defs>
 <linearGradient id="a5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f33"/><stop offset=".55" stop-color="#3b1c6b"/><stop offset=".56" stop-color="#140b2e"/><stop offset="1" stop-color="#05061a"/></linearGradient>${glow('g5')}</defs>
 <rect width="600" height="506" fill="url(#a5)"/><circle cx="480" cy="80" r="34" fill="#fde7c0"/><circle cx="492" cy="72" r="30" fill="#0b0f33"/>
 ${(()=>{let o='',x=0,i=0;const cols=['#1c1446','#23195a','#2a1f66'];while(x<600){const w=40+(i*29)%50,h=130+(i*67)%190;
  o+=`<rect x="${x}" y="${340-h}" width="${w}" height="${h}" fill="${cols[i%3]}"/>`;
  for(let yy=340-h+10;yy<332;yy+=14)for(let xx=x+6;xx<x+w-8;xx+=12)if((xx*7+yy*3+i)%5<2)o+=`<rect x="${xx}" y="${yy}" width="5" height="6" fill="#ffd27a"/>`;
  if(i%4===1)o+=`<rect x="${x+w/2-1}" y="${340-h-30}" width="2" height="30" fill="#ff4fa3" filter="url(#g5)"/>`;
  x+=w+4;i++;}return o;})()}
 <rect y="340" width="600" height="166" fill="#140b2e"/>
 ${Array.from({length:26},(_,i)=>`<rect x="${(i*61)%600}" y="${352+(i*23)%110}" width="${20+(i*13)%40}" height="3" fill="${i%2?'#ffd27a':'#ff4fa3'}" opacity=".45"/>`).join('')}
 <path d="M0 340 H600" stroke="#38f0ff" stroke-width="2" filter="url(#g5)"/></svg>`;

// 6. Avião no pôr do sol
const s6=`<svg viewBox="0 0 466 506" preserveAspectRatio="xMidYMid slice"><defs>
 <linearGradient id="a6" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5d8f"/><stop offset=".5" stop-color="#ff9a5a"/><stop offset="1" stop-color="#ffd37a"/></linearGradient></defs>
 <rect width="466" height="506" fill="url(#a6)"/>
 <path d="M-20 300 Q160 260 300 180" stroke="#fff" stroke-width="6" fill="none" stroke-dasharray="2 14" stroke-linecap="round" opacity=".8"/>
 <g transform="translate(330 160) rotate(-32) scale(2.4)" fill="#1a0f2e"><path d="M0-6 L-14-6 L-24-26 L-31-26 L-25-6 L-40-6 L-46-15 L-51-15 L-48 0 L-51 15 L-46 15 L-40 6 L-25 6 L-31 26 L-24 26 L-14 6 L0 6 Q8 0 0-6Z"/></g>
 ${palm(445,506,110,.55,'#3a1440')}</svg>`;

const css=`@import url('https://fonts.googleapis.com/css2?family=Anton&family=Urbanist:wght@500;700;800&family=Cormorant+Garamond:ital,wght@1,600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;background:#0b0912;position:relative;overflow:hidden;font-family:Urbanist,sans-serif}
.p{position:absolute;overflow:hidden;border:4px solid #0b0912;box-shadow:inset 0 0 0 3px #f6efe2}
.p svg{width:100%;height:100%;display:block}
.lbl{position:absolute;background:#f6efe2;color:#0b0912;font-family:Anton;font-size:30px;letter-spacing:.04em;padding:6px 18px 4px;transform:rotate(-4deg);box-shadow:6px 6px 0 #0b0912;white-space:nowrap}
.lbl b{color:#c2366f;font-weight:400}
#hero{left:0;top:574px;width:1080px;height:370px;background:radial-gradient(ellipse at 50% 120%,#5b1a6e 0%,#1a0b3d 55%,#0b0912 100%);display:flex;flex-direction:column;align-items:center;justify-content:center}
.kick{font-weight:800;letter-spacing:.42em;font-size:24px;color:#D0AE78}
.big{font-family:Anton;font-size:190px;line-height:.95;letter-spacing:.02em;background:linear-gradient(180deg,#ffe9a8 0%,#E7B64C 35%,#ff7a59 70%,#ff4fa3 100%);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 8px 0 #0b0912) drop-shadow(0 0 30px rgba(255,79,163,.35))}
.sub{font-family:'Cormorant Garamond';font-style:italic;font-size:54px;color:#fff;margin-top:-4px}
#logo{position:absolute;left:40px;top:40px;width:120px;opacity:.95}
.cta{position:absolute;left:24px;right:24px;bottom:46px;text-align:center;font-family:Anton;font-size:40px;color:#fff;letter-spacing:.05em;text-shadow:3px 3px 0 #0b0912}
.cta small{display:block;font-family:Urbanist;font-weight:700;font-size:20px;letter-spacing:.3em;color:#1a0f2e;text-shadow:none;margin-bottom:6px}
.legal{position:absolute;bottom:22px;left:30px;font-size:17px;line-height:1.4;color:rgba(255,255,255,.6);letter-spacing:.04em}`;

const html=`<html><head><meta charset=utf-8><style>${css}</style></head><body>
<div class=p style="left:0;top:0;width:640px;height:560px">${s1}<div class=lbl style="left:28px;bottom:34px">VICE CITY <b>=</b> MIAMI</div></div>
<div class=p style="left:640px;top:0;width:440px;height:560px">${s2}</div>
<div class=p id=hero><img id=logo src="${LOGO}"><div class=kick>ESPECIAL GAMES</div><div class=big>LEONIDA</div><div class=sub>existe na vida real</div></div>
<div class=p style="left:0;top:944px;width:440px;height:470px">${s3}<div class=lbl style="left:22px;top:28px;transform:rotate(3deg)">GRASSRIVERS <b>=</b> EVERGLADES</div></div>
<div class=p style="left:440px;top:944px;width:640px;height:470px">${s4}<div class=lbl style="right:26px;bottom:30px">LEONIDA KEYS <b>=</b> FLORIDA KEYS</div></div>
<div class=p style="left:0;top:1414px;width:600px;height:506px">${s5}<div class=lbl style="left:30px;top:30px;transform:rotate(-3deg)">A MELHOR FASE <b>É</b> A VIAGEM</div><div class=legal>GTA VI é marca da Rockstar Games.<br>A J&amp;B não tem relação com o jogo.</div></div>
<div class=p style="left:600px;top:1414px;width:480px;height:506px">${s6}<div class=cta><small>SAIA DO CONTROLE</small>PEÇA SEU ROTEIRO<br>NO DIRECT</div></div>

</body></html>`;

(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
 await pg.setContent(html,{waitUntil:'networkidle'});await pg.evaluate(()=>document.fonts.ready);
 const out=path.join(__dirname,'arte-leonida.png');await pg.screenshot({path:out});await b.close();console.log(out);})();
