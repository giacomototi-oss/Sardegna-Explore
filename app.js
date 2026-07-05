
const $=id=>document.getElementById(id);
const BASE={lat:40.6096,lon:9.7514,label:"La Caletta"};
let state={mode:"balanced",origin:BASE,originType:"base",wind:"Mare calmo",autoWind:"Mare calmo",weatherIcon:"🌤️",weatherLabel:"Meteo",weatherCode:null,temp:null,windKmh:null,driveMax:120,walkMax:20,sort:"ai",query:"",quietOnly:false,localOnly:false,meteoAiOnly:false,recommendedOnly:false,withinDriveOnly:true,favoritesOnly:false,hideVisited:false};
let marine={wave:null,water:null};
let compareIds=[];
const icon={"Snorkeling elite":"🤿","Snorkeling PRO":"🐠","Calette nascoste":"🏝️","Spiagge top":"🏖️","Panorami/foto":"📸","Escursioni/gommoni":"🚤","Cibo/pesce":"🍝","Parcheggi/accessi":"🅿️","Spiagge famose":"⭐","Spiagge famose Nord":"💎","Spiagge famose Sud":"🌅","Iconiche Golfo Orosei":"🌊","Spiagge Sardegna Nord-Ovest":"🧭","Spiagge Sardegna Nord":"🧭","Spiagge Sardegna Ovest":"🌊","Spiagge Sardegna Sud-Ovest":"🌅","Spiagge Sardegna Sud":"🌞","Spiagge Sardegna Sud-Est":"🌞","Spiagge Sardegna Est":"🌊"};
const mapsIcon='<svg class="mapicon" viewBox="0 0 24 24"><path fill="#34a853" d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/><circle fill="#fff" cx="12" cy="9" r="2.5"/></svg>';
const wazeIcon='<svg class="mapicon" viewBox="0 0 24 24"><path fill="#33ccff" d="M20 11.5c0-4.1-3.6-7.5-8-7.5s-8 3.4-8 7.5c0 1.5.5 2.9 1.4 4.1L3 18h3.6c1.4.7 3.2 1 5.4 1 4.4 0 8-3.4 8-7.5z"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/><path d="M9 15c2 1 4 1 6 0" stroke="#111" fill="none" stroke-width="1.5"/></svg>';
function loadLocal(){try{const s=JSON.parse(localStorage.getItem("sardegna-v23")||localStorage.getItem("sardegna-v22")||localStorage.getItem("sardegna-v21")||localStorage.getItem("sardegna-v20")||localStorage.getItem("sardegna-v19")||localStorage.getItem("sardegna-v18")||localStorage.getItem("sardegna-v17")||localStorage.getItem("sardegna-v16")||localStorage.getItem("sardegna-v10")||"{}");PLACES.forEach(p=>{if(s.favorites?.[p.id])p.favorite=true;if(s.visited?.[p.id])p.visited=true;if(s.notes?.[p.id])p.personalNote=s.notes[p.id]})}catch(e){}}
function saveLocal(){const favorites={},visited={},notes={};PLACES.forEach(p=>{if(p.favorite)favorites[p.id]=true;if(p.visited)visited[p.id]=true;if(p.personalNote)notes[p.id]=p.personalNote});localStorage.setItem("sardegna-v23",JSON.stringify({favorites,visited,notes}))}
function hav(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180;const dp=rad(c-a),dl=rad(d-b);const q=Math.sin(dp/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dl/2)**2;return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))}
function dist(p){return hav(state.origin.lat,state.origin.lon,p.lat,p.lon)}
function drive(p){return Math.round((dist(p)*1.38/62)*60+8)}
function seaScore(p){let s=10;if(marine.wave!=null){if(marine.wave>1.2)s-=3;else if(marine.wave>.7)s-=1.5}if((p.windAvoid||"").includes(state.wind))s-=2;if((p.windOK||"").includes(state.wind))s+=.8;return Math.max(0,Math.min(10,Math.round(s*10)/10))}
function textScore(p,q){if(!q)return 0;q=q.toLowerCase();const hay=`${p.name} ${p.zone} ${p.category} ${p.fauna} ${p.notes} ${(p.tags||[]).join(" ")}`.toLowerCase();let s=0;q.split(/\s+/).filter(Boolean).forEach(w=>{if(hay.includes(w))s+=8;if(p.name.toLowerCase().includes(w))s+=16});if(q.includes("liberotto")&&p.name.toLowerCase().includes("liberotto"))s+=60;if(q.includes("polp")&&hay.includes("polp"))s+=20;if(q.includes("tramonto")&&hay.includes("tramonto"))s+=16;return s}

function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function aiBreakdown(p){
  const sea = clamp((p.waterColor||0)*10,0,100);
  const snork = clamp((p.snorkeling||0)*10,0,100);
  const meteo = clamp(50 + seaScore(p)*5 + (state.meteoAiOnly?meteoAiScore(p):0),0,100);
  const crowd = clamp(100-(p.crowdAI?.score||50),0,100);
  const parking = clamp(100-(p.parkingAI?.difficulty||50),0,100);
  const reco = clamp((p.recommendedScore||0)*10,0,100);
  const access = clamp(100-(p.walkMin||0)*1.4,0,100);
  const clarity = clamp(p.snorkelingAI?.clarity || (p.waterColor||0)*10,0,100);
  const fauna = clamp(p.snorkelingAI?.fishProbability || (p.snorkeling||0)*8,0,100);
  const exclusivity = clamp((p.level==="L1 Local"?88:55) + ((p.crowdTarget==="Tranquillo")?10:0),0,100);
  const total = Math.round((sea*1.05 + snork*1.05 + meteo*1.15 + crowd*.85 + parking*.65 + reco*.9 + access*.65 + clarity*.9 + fauna*.85 + exclusivity*.55)/8.6);
  return {total:clamp(total,0,100),sea,snork,meteo,crowd,parking,reco,access,clarity,fauna,exclusivity};
}
function aiScore100(p){return aiBreakdown(p).total;}
function aiScoreLabel(p){
  const s=aiScore100(p);
  if(s>=92)return "Eccezionale";
  if(s>=84)return "Ottima";
  if(s>=74)return "Molto buona";
  if(s>=62)return "Buona";
  return "Da valutare";
}
function stars(n){return "★★★★★☆☆☆☆☆".slice(5-Math.round(n),10-Math.round(n));}
function fishList(p){
  const f=p.marineLifeAI||{};
  return Object.entries(f).map(([k,v])=>`<div class="fish-row"><span>${k}</span><b>${stars(v)}</b></div>`).join("");
}
function crowdColor(score){return score<45?"🟢":score<65?"🟡":score<85?"🟠":"🔴";}
function aiScoreBlock(p){
  const b=aiBreakdown(p);
  return `<div class="detail-box ai-score-box"><b>🧠 AI Score</b>
    <div class="big-score">${b.total}<span>/100</span></div>
    <p class="meta">${aiScoreLabel(p)}</p>
    <div class="score-grid">
      <span>🌊 Mare <b>${Math.round(b.sea)}</b></span>
      <span>🤿 Snorkeling <b>${Math.round(b.snork)}</b></span>
      <span>☀️ Meteo <b>${Math.round(b.meteo)}</b></span>
      <span>👥 Affollamento <b>${Math.round(b.crowd)}</b></span>
      <span>🚗 Parcheggio <b>${Math.round(b.parking)}</b></span>
      <span>⭐ Consigliata <b>${Math.round(b.reco)}</b></span>
      <span>🚶 Accessibilità <b>${Math.round(b.access)}</b></span>
      <span>💧 Trasparenza <b>${Math.round(b.clarity)}</b></span>
      <span>🐠 Fauna <b>${Math.round(b.fauna)}</b></span>
      <span>🏝️ Esclusività <b>${Math.round(b.exclusivity)}</b></span>
    </div>
  </div>`;
}

function crowdDayName(d){
  const today=new Date();
  const diff=Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())-new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
  if(diff===0)return "Oggi";
  if(diff===1)return "Domani";
  return d.toLocaleDateString("it-IT",{weekday:"short",day:"2-digit",month:"2-digit"});
}
function crowdSeasonBoost(date){
  const m=date.getMonth()+1;
  const day=date.getDay();
  let b=0;
  if([7,8].includes(m))b+=18;
  else if(m===6||m===9)b+=9;
  else if(m===5||m===10)b+=3;
  if(day===0||day===6)b+=12;
  return b;
}
function crowdWeatherBoost(){
  let b=0;
  if(state.weatherCode===0)b+=10;
  else if([1,2].includes(state.weatherCode))b+=7;
  else if(state.weatherCode===3)b+=2;
  else if([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(state.weatherCode))b-=18;
  if(state.windKmh!=null){
    if(state.windKmh<=10)b+=6;
    else if(state.windKmh>=25)b-=10;
  }
  if(marine.wave!=null){
    if(marine.wave<=0.4)b+=5;
    else if(marine.wave>=1.2)b-=12;
  }
  return b;
}
function crowdBaseFor(p,date){
  let s=p.crowdAI?.score ?? 50;
  s += crowdSeasonBoost(date);
  s += crowdWeatherBoost();
  if(p.level==="L1 Local")s-=16;
  if((p.recommendedScore||0)>=9)s+=7;
  if((p.walkMin||0)>25)s-=8;
  if(String(p.access||"").toLowerCase().includes("barca"))s-=4;
  return clamp(Math.round(s),5,98);
}
function crowdHourlyForecast(p,date){
  const base=crowdBaseFor(p,date);
  const slots=[
    ["08:00",-35],
    ["09:00",-25],
    ["10:00",-10],
    ["11:00",6],
    ["12:00",15],
    ["15:00",19],
    ["17:00",4],
    ["18:00",-16],
  ];
  return slots.map(([h,delta])=>({h,score:clamp(base+delta,3,99)}));
}
function crowdFiveDays(p){
  const out=[];
  const now=new Date();
  for(let i=0;i<5;i++){
    const d=new Date(now);
    d.setDate(now.getDate()+i);
    const hourly=crowdHourlyForecast(p,d);
    const avg=Math.round(hourly.reduce((a,x)=>a+x.score,0)/hourly.length);
    out.push({date:d,label:crowdDayName(d),avg,hourly});
  }
  return out;
}
function crowdBlock(p){
  const days=crowdFiveDays(p);
  const today=days[0];
  const bestToday=[...today.hourly].sort((a,b)=>a.score-b.score)[0];
  return `<div class="detail-box crowd-ai-box"><b>👥 Affollamento AI</b>
    <div class="big-mini">${crowdColor(today.avg)} ${today.avg}/100</div>
    <p class="meta">Momento migliore oggi: <b>${bestToday.h}</b> circa (${bestToday.score}%). Stima basata su fama, accessibilità, meteo, vento, mare, weekend/stagione e livello local.</p>
    <div class="crowd-today">
      <b>Oggi per orario</b>
      <div class="hour-grid extended">${today.hourly.map(x=>`<span>${x.h}<br><b>${crowdColor(x.score)} ${x.score}%</b></span>`).join("")}</div>
    </div>
    <div class="crowd-days">
      <b>Prossimi 5 giorni</b>
      ${days.map(day=>`<div class="day-row"><div class="day-title">${day.label}<br><small>${crowdColor(day.avg)} media ${day.avg}%</small></div><div class="day-hours">${day.hourly.map(x=>`<span>${x.h}<b>${x.score}%</b></span>`).join("")}</div></div>`).join("")}
    </div>
  </div>`;
}

function parkingBlock(p){
  const a=p.parkingAI||{};
  return `<div class="detail-box"><b>🚗 Parcheggio AI</b>
    <p class="meta">Difficoltà: <b>${a.difficulty||"--"}/100</b><br>Disponibilità: <b>${a.availability||"-"}</b><br>Tipo: <b>${a.type||"-"}</b><br>Arrivo consigliato: <b>${a.bestArrival||"-"}</b></p>
    <p class="meta">${a.tip||""}</p>
  </div>`;
}
function marineLifeBlock(p){
  return `<div class="detail-box"><b>🐠 Cosa puoi vedere</b>
    <div class="fish-list">${fishList(p)}</div>
    <p class="meta">Habitat: ${p.snorkelingAI?.bottom||"-"}. Meglio: ${p.snorkelingAI?.bestSide||"-"}.</p>
  </div>`;
}
function compareButton(p){
  const active=compareIds.includes(p.id);
  return `<button class="ghost" onclick="toggleCompare('${p.id}')">${active?'✓':'🆚'} Confronta</button>`;
}
function toggleCompare(id){
  if(compareIds.includes(id)) compareIds=compareIds.filter(x=>x!==id);
  else{
    if(compareIds.length>=3){alert("Puoi confrontare massimo 3 spiagge.");return;}
    compareIds.push(id);
  }
  renderCompare();
  render();
}
window.toggleCompare=toggleCompare;
function renderCompare(){
  const box=document.getElementById("compareList");
  const tbl=document.getElementById("compareTable");
  if(!box||!tbl)return;
  const ps=compareIds.map(id=>PLACES.find(p=>p.id===id)).filter(Boolean);
  if(!ps.length){
    box.innerHTML='<div class="empty-state">Nessuna spiaggia selezionata. Premi “Confronta” su un risultato.</div>';
    tbl.innerHTML="";
    return;
  }
  box.innerHTML=ps.map(p=>`<span class="compare-chip">${p.name}<button onclick="toggleCompare('${p.id}')">×</button></span>`).join("");
  const rows=[
    ["🧠 AI", p=>aiScore100(p)+"/100"],
    ["🤿 Snorkeling", p=>(p.snorkeling||0)+"/10"],
    ["🌊 Acqua", p=>(p.waterColor||0)+"/10"],
    ["👥 Affollamento", p=>(p.crowdAI?.score||"--")+"/100"],
    ["🚗 Auto", p=>drive(p)+" min"],
    ["🚶 Camminata", p=>(p.walkMin||0)+" min"],
    ["🚗 Parcheggio", p=>(p.parkingAI?.difficulty||"--")+"/100"],
    ["⭐ Consigliata", p=>(p.recommendedScore||0)+"/10"],
    ["☀️ Meteo AI", p=>Math.round(aiBreakdown(p).meteo)+"/100"],
    ["🐠 Pesci", p=>(p.snorkelingAI?.fishProbability||"--")+"%"],
  ];
  tbl.innerHTML=`<table><thead><tr><th>Parametro</th>${ps.map(p=>`<th>${p.name}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td>${ps.map(p=>`<td>${r[1](p)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function clearCompare(){compareIds=[];renderCompare();render();}

function recommendedScore(p){
  return p.recommendedScore || 0;
}
function recommendedLabel(p){
  const s=recommendedScore(p);
  if(s>=9.3)return "🏆 Super consigliata";
  if(s>=8.5)return "⭐ Consigliata";
  if(s>=7.5)return "👍 Buona fama";
  return "📍 Da valutare";
}
function meteoAiScore(p){
  let s=0;
  // tempo stabile/sole: meglio; pioggia/temporale: peggio
  const code=state.weatherCode;
  if(code===0)s+=16;
  else if([1,2].includes(code))s+=12;
  else if(code===3)s+=5;
  else if([45,48].includes(code))s-=3;
  else if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))s-=18;
  else if([95,96,99].includes(code))s-=30;

  // poco vento meglio per mare calmo/snorkeling
  const wind=state.windKmh;
  if(wind!=null){
    if(wind<=8)s+=14;
    else if(wind<=15)s+=8;
    else if(wind<=22)s-=4;
    else s-=14;
  }

  // onde basse meglio
  if(marine.wave!=null){
    if(marine.wave<=0.3)s+=12;
    else if(marine.wave<=0.7)s+=6;
    else if(marine.wave<=1.2)s-=6;
    else s-=18;
  }

  // esposizione vento del singolo posto
  if((p.windOK||"").includes(state.wind))s+=8;
  if((p.windAvoid||"").includes(state.wind))s-=18;

  return s;
}
function meteoAiLabel(p){
  const s=meteoAiScore(p);
  if(s>=32)return "☀️ Meteo top";
  if(s>=18)return "🌤️ Meteo buono";
  if(s>=5)return "⛅ Meteo ok";
  if(s>=-8)return "🌬️ Da valutare";
  return "⚠️ Meteo scarso";
}
function isLocal(p){return p.level==="L1 Local" || String(p.tags||"").includes("local") || String(p.tags||"").includes("segreta") || String(p.category||"").toLowerCase().includes("nascost");}
function score(p){let s=p.wow*1.6+p.waterColor*.7+p.snorkeling*.7+seaScore(p)*1.2+textScore(p,state.query);if(state.mode==="wow")s+=p.wow*1.8+p.waterColor*1.4;if(state.mode==="snorkel")s+=p.snorkeling*2.4+(String(p.tags||"").includes("snorkeling")?8:0)+(p.snorkelingAI?.fishProbability||0)/8+(p.snorkelingAI?.octopusProbability||0)/12;if(state.mode==="local"){s+=isLocal(p)?80:-1000;}if(state.mode==="balanced")s+=p.wow+p.snorkeling*.8-(drive(p)/20)-(p.walkMin/8);if((p.windOK||"").includes(state.wind))s+=6;if((p.windAvoid||"").includes(state.wind))s-=12;s+=(drive(p)<=state.driveMax)?8:-(drive(p)-state.driveMax)/2;s+=(p.walkMin<=state.walkMax)?6:-8;if(state.quietOnly)s+=(p.crowdTarget==="Tranquillo"?10:-4);if(state.meteoAiOnly)s+=meteoAiScore(p)*1.8;if(state.recommendedOnly)s+=recommendedScore(p)*4.2;if(state.localOnly&&!isLocal(p))s-=1000;if(state.withinDriveOnly&&drive(p)>state.driveMax)s-=1000;if(state.favoritesOnly&&!p.favorite)s-=1000;if(state.hideVisited&&p.visited)s-=1000;return Math.round(s*10)/10}
function results(){let arr=PLACES.map(p=>({...p,aiScore:score(p),distanceKm:dist(p),driveMin:drive(p),seaScore:seaScore(p)})).filter(p=>p.aiScore>-50);if(state.sort==="distance")arr.sort((a,b)=>a.distanceKm-b.distanceKm||b.aiScore-a.aiScore);else if(state.sort==="rating")arr.sort((a,b)=>b.wow-a.wow||b.aiScore-a.aiScore);else arr.sort((a,b)=>b.aiScore-a.aiScore||a.distanceKm-b.distanceKm);return arr}
function why(p){const bits=[];if(state.mode==="snorkel"&&p.snorkeling>=7)bits.push("buono per snorkeling");if(state.mode==="wow"&&p.wow>=9)bits.push("mare wow");if((p.windOK||"").includes(state.wind))bits.push("vento favorevole");if(drive(p)<=state.driveMax)bits.push("entro tempo auto");if(p.walkMin<=state.walkMax)bits.push("camminata ok");if(p.name.toLowerCase().includes("liberotto"))bits.push("ottimi scogli laterali");if(state.meteoAiOnly&&meteoAiScore(p)>18)bits.push("meteo favorevole");if(state.recommendedOnly&&recommendedScore(p)>=8.5)bits.push("molto consigliata");return bits.slice(0,4).join(" · ")||"buon equilibrio generale"}
function gmaps(p){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.lat+","+p.lon)}&travelmode=driving`}
function waze(p){return `https://waze.com/ul?ll=${p.lat},${p.lon}&navigate=yes`}
function photoUrl(p){return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(p.name+" "+p.zone+" Sardegna spiaggia")}`}
function weatherMini(){const t=state.temp==null?"--":Math.round(state.temp)+"°C";const w=state.windKmh==null?"--":Math.round(state.windKmh)+" km/h";return `${state.weatherIcon} ${state.weatherLabel} · ${t} · vento ${w}`}
function mcolor(c){if((c||"").includes("Snorkeling"))return"#38bdf8";if(c==="Calette nascoste")return"#22c55e";if(c==="Panorami/foto")return"#fb923c";if(c==="Cibo/pesce")return"#fb7185";if((c||"").includes("famose")||(c||"").includes("Iconiche")||(c||"").includes("Sardegna"))return"#fbbf24";return"#94a3b8"}
function makeIcon(p){return L.divIcon({className:"custom-marker",html:`<div style="width:30px;height:30px;border-radius:50%;background:${mcolor(p.category)};display:grid;place-items:center;border:2px solid white;box-shadow:0 8px 20px rgba(0,0,0,.35);font-size:16px">${icon[p.category]||"📍"}</div>`,iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-12]})}
let map,layer,userMarker;
function initMap(){map=L.map("map",{zoomControl:false}).setView([40.45,9.45],8);L.control.zoom({position:"bottomright"}).addTo(map);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(map);layer=L.layerGroup().addTo(map)}
function renderMarkers(list){layer.clearLayers();list.slice(0,160).forEach(p=>L.marker([p.lat,p.lon],{icon:makeIcon(p)}).addTo(layer).bindPopup(`<b>${icon[p.category]||"📍"} ${p.name}</b><br>${p.driveMin} min · AI ${p.aiScore}<br><button onclick="openDetail('${p.id}')">Apri</button>`))}
function renderFavorites(){
  const el=document.getElementById("favoritesList");
  if(!el)return;
  const favs=PLACES.filter(p=>p.favorite).map(p=>({...p,aiScore:score(p),distanceKm:dist(p),driveMin:drive(p),seaScore:seaScore(p)}));
  if(!favs.length){
    el.innerHTML='<div class="empty-state">Non hai ancora preferiti. Premi ☆ Preferito su una spiaggia per salvarla qui.</div>';
    return;
  }
  favs.sort((a,b)=>b.aiScore-a.aiScore);
  el.innerHTML=favs.map(p=>`<article class="card"><h4>${icon[p.category]||"📍"} ${p.name}</h4><div class="meta">${p.zone}<br>${p.distanceKm.toFixed(1)} km · 🚗 ${p.driveMin} min · 🚶 ${p.walkMin} min</div><div class="score"><span class="pill gold">AI ${aiScore100(p)}/100</span><span class="pill">🤿 ${p.snorkeling}/10</span><span class="pill">WOW ${p.wow}/10</span></div><div class="actions"><button onclick="openDetail('${p.id}')">Scheda</button>${compareButton(p)}<a class="ghost" href="${gmaps(p)}" target="_blank">${mapsIcon}Maps</a><a class="ghost" href="${waze(p)}" target="_blank">${wazeIcon}Waze</a><a class="ghost" href="${photoUrl(p)}" target="_blank">📷 Foto</a><button class="ghost" onclick="toggleFavorite('${p.id}')">★ Rimuovi</button></div></article>`).join("");
}
function render(){const list=results();$("totalPlaces").textContent=PLACES.length;$("resultsTitle").textContent=`Risultati · ${list.length}`;renderMarkers(list);$("results").innerHTML=list.slice(0,60).map((p,i)=>`<article class="card"><h4>${i===0?"🥇 ":i===1?"🥈 ":i===2?"🥉 ":""}${i+1}. ${icon[p.category]||"📍"} ${p.name}</h4><div class="meta">${p.zone} · ${p.category}<br>${p.distanceKm.toFixed(1)} km · 🚗 ${p.driveMin} min · 🚶 ${p.walkMin} min</div><div class="score"><span class="pill gold">AI ${aiScore100(p)}/100</span><span class="pill">🤿 ${p.snorkeling}/10</span><span class="pill">WOW ${p.wow}/10</span><span class="pill">mare ${p.seaScore}/10</span><span class="pill">${meteoAiLabel(p)}</span><span class="pill">${recommendedLabel(p)}</span></div><div class="meta weather-mini">${weatherMini()}</div><div class="meta">Perché: <b>${why(p)}</b></div><div class="actions"><button onclick="openDetail('${p.id}')">Scheda</button>${compareButton(p)}<a class="ghost" href="${gmaps(p)}" target="_blank">${mapsIcon}Maps</a><a class="ghost" href="${waze(p)}" target="_blank">${wazeIcon}Waze</a><a class="ghost" href="${photoUrl(p)}" target="_blank">📷 Foto</a><button class="ghost" onclick="toggleFavorite('${p.id}')">${p.favorite?'★':'☆'} Preferito</button></div></article>`).join("");renderFavorites();renderCompare()}
function today(){const p=results()[0];if(!p)return;$("todayChoice").classList.remove("hidden");$("todayChoice").innerHTML=`<h3>🏆 Oggi ti porterei a: ${p.name}</h3><div class="score"><span class="pill gold">AI ${aiScore100(p)}/100</span><span class="pill">🚗 ${p.driveMin} min</span><span class="pill">🤿 ${p.snorkeling}/10</span><span class="pill">WOW ${p.wow}/10</span></div><p class="meta">${why(p)}</p><div class="actions"><button onclick="openDetail('${p.id}')">Scheda</button>${compareButton(p)}<a class="primary" href="${gmaps(p)}" target="_blank">${mapsIcon}Portami lì</a><a class="ghost" href="${waze(p)}" target="_blank">${wazeIcon}Waze</a><a class="ghost" href="${photoUrl(p)}" target="_blank">📷 Foto</a></div>`}
function snorkelBlock(p){
  const a=p.snorkelingAI||{};
  const species=(a.species||[]).join(", ");
  return `<div class="detail-box snorkel-ai"><b>🤿 Snorkeling AI</b>
    <div class="score" style="margin-top:6px">
      <span class="pill">🐠 pesci ${a.fishProbability||"--"}%</span>
      <span class="pill">🐙 polpi ${a.octopusProbability||"--"}%</span>
      <span class="pill">💧 limpidezza ${a.clarity||"--"}%</span>
      <span class="pill">${a.level||"Intermedio"}</span>
    </div>
    <p class="meta" style="margin-top:8px">Fondale: <b>${a.bottom||"-"}</b><br>Meglio: <b>${a.bestSide||"-"}</b><br>Orario: <b>${a.bestTime||"-"}</b><br>Possibili: ${species||"-"}</p>
    <p class="meta">${a.tip||""}</p>
  </div>`;
}
function openDetail(id){const p=PLACES.find(x=>x.id===id);if(!p)return;fetchWeather(p.lat,p.lon,p.name,false);$("placeDetail").innerHTML=`<div><h2>${icon[p.category]||"📍"} ${p.name}</h2><p class="meta">${p.zone}<br>${dist(p).toFixed(1)} km · 🚗 ${drive(p)} min · 🚶 ${p.walkMin} min</p><div class="score"><span class="pill gold">AI ${aiScore100(p)}/100</span><span class="pill">🤿 ${p.snorkeling}/10</span><span class="pill">WOW ${p.wow}/10</span></div><div class="detail-grid">${aiScoreBlock(p)}${crowdBlock(p)}${parkingBlock(p)}${marineLifeBlock(p)}${snorkelBlock(p)}<div class="detail-box"><b>Perché</b>${why(p)}</div><div class="detail-box"><b>Fauna</b>${p.fauna||"-"}</div><div class="detail-box"><b>Vento OK</b>${p.windOK||"-"}</div><div class="detail-box"><b>Evita con</b>${p.windAvoid||"-"}</div><div class="detail-box"><b>Ingresso</b>${p.entryTip||"-"}</div><div class="detail-box"><b>Parcheggio</b>${p.parking||"-"}</div></div><p>${p.notes||""}</p><textarea id="noteBox" placeholder="Nota personale / diario...">${p.personalNote||""}</textarea><div class="actions" style="margin-top:12px"><a class="primary" href="${gmaps(p)}" target="_blank">${mapsIcon}Google Maps</a><a class="ghost" href="${waze(p)}" target="_blank">${wazeIcon}Waze</a><a class="ghost" href="${photoUrl(p)}" target="_blank">📷 Foto</a><button class="ghost" onclick="toggleFavorite('${p.id}')">${p.favorite?'★ Preferito':'☆ Preferito'}</button><button class="ghost" onclick="toggleVisited('${p.id}')">${p.visited?'Visitato ✓':'Segna visitato'}</button><button onclick="saveNote('${p.id}')">Salva nota</button></div></div>`;$("placeDialog").showModal()}
window.openDetail=openDetail;function toggleFavorite(id){const p=PLACES.find(x=>x.id===id);if(p){p.favorite=!p.favorite;saveLocal();render()}}function toggleVisited(id){const p=PLACES.find(x=>x.id===id);if(p){p.visited=!p.visited;saveLocal();render()}}function saveNote(id){const p=PLACES.find(x=>x.id===id);if(p){p.personalNote=$("noteBox").value;saveLocal();render()}}window.toggleFavorite=toggleFavorite;window.toggleVisited=toggleVisited;window.saveNote=saveNote;
function setMode(mode){state.mode=mode;document.querySelectorAll(".mode").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));render()}
function setOrigin(type){state.originType=type;document.querySelectorAll(".seg").forEach(b=>b.classList.remove("active"));if(type==="base"){$("useBase").classList.add("active");state.origin=BASE;$("manualOriginBox").classList.add("hidden");$("originStatus").textContent="Partenza: La Caletta";map.setView([BASE.lat,BASE.lon],8);fetchWeather(BASE.lat,BASE.lon,"La Caletta",true);setTimeout(()=>checkForAppUpdate(false),1200);render()}if(type==="manual"){$("useManual").classList.add("active");$("manualOriginBox").classList.remove("hidden")}if(type==="gps"){locate()}}
function applyPreset(){const [lat,lon]=$("originPreset").value.split(",").map(Number);state.origin={lat,lon,label:$("originPreset").selectedOptions[0].textContent};$("originStatus").textContent="Partenza: "+state.origin.label;map.setView([lat,lon],9);fetchWeather(lat,lon,state.origin.label,true);render()}
function applyCoords(){const m=$("manualCoords").value.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);if(m){state.origin={lat:Number(m[1]),lon:Number(m[3]),label:"coordinate manuali"};$("originStatus").textContent="Partenza: coordinate manuali";map.setView([state.origin.lat,state.origin.lon],9);fetchWeather(state.origin.lat,state.origin.lon,"coordinate manuali",true);render()}}
function locate(){if(!navigator.geolocation){alert("Geolocalizzazione non disponibile");return}navigator.geolocation.getCurrentPosition(pos=>{state.origin={lat:pos.coords.latitude,lon:pos.coords.longitude,label:"GPS preciso"};$("useGps").classList.add("active");$("useBase").classList.remove("active");$("useManual").classList.remove("active");$("manualOriginBox").classList.add("hidden");$("originStatus").textContent="Partenza: GPS preciso";if(!userMarker)userMarker=L.circleMarker([state.origin.lat,state.origin.lon],{radius:8,color:"#fff",fillColor:"#ef4444",fillOpacity:1}).addTo(map).bindPopup("Sei qui");else userMarker.setLatLng([state.origin.lat,state.origin.lon]);map.setView([state.origin.lat,state.origin.lon],10);fetchWeather(state.origin.lat,state.origin.lon,"la tua posizione",true);render()},()=>alert("Non riesco a leggere la posizione. Controlla i permessi."),{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
function weatherLabelFromCode(code){
  if(code==null)return {icon:"🌤️",label:"Meteo"};
  if(code===0)return {icon:"☀️",label:"Sole"};
  if([1,2].includes(code))return {icon:"🌤️",label:"Poco nuvoloso"};
  if(code===3)return {icon:"☁️",label:"Nuvoloso"};
  if([45,48].includes(code))return {icon:"🌫️",label:"Nebbia"};
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return {icon:"🌧️",label:"Pioggia"};
  if([95,96,99].includes(code))return {icon:"⛈️",label:"Temporale"};
  return {icon:"🌤️",label:"Variabile"};
}
function windName(deg,speed){if(speed>=25)return"Vento forte";if(deg==null)return"Mare calmo";let d=["N","NE","E","SE","S","SW","W","NW"][Math.round(deg/45)%8];if(d==="NW")return speed>=15?"Maestrale forte":"Maestrale leggero";if(d==="SE")return speed>=15?"Scirocco forte":"Scirocco leggero";if(d==="E")return"Levante forte";if(d==="W")return"Ponente leggero";return speed<8?"Mare calmo":"Vento forte"}
function windDir(deg){if(deg==null)return"-";return["N","NE","E","SE","S","SW","W","NW"][Math.round(deg/45)%8]}
async function fetchWeather(lat,lon,label,update){try{let r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&forecast_days=1&timezone=auto`);let d=await r.json();let c=d.current||{};let sp=Math.round(c.wind_speed_10m||0);let wl=weatherLabelFromCode(c.weather_code);state.weatherIcon=wl.icon;state.weatherLabel=wl.label;state.weatherCode=c.weather_code;state.temp=c.temperature_2m;state.windKmh=sp;state.autoWind=windName(c.wind_direction_10m,sp);state.wind=state.autoWind;$("weatherText").innerHTML=`<b>${label}</b>: ${wl.icon} ${wl.label} · ${Math.round(c.temperature_2m)}°C · vento ${sp} km/h da ${windDir(c.wind_direction_10m)} · ${state.autoWind}`;fetchMarine(lat,lon)}catch(e){$("weatherText").textContent="Meteo non disponibile"}}
async function fetchMarine(lat,lon){try{let r=await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,sea_surface_temperature&forecast_days=1&timezone=auto`);let d=await r.json();let c=d.current||{};marine.wave=c.wave_height??null;marine.water=c.sea_surface_temperature??null;$("marineText").innerHTML=`Mare: ${c.wave_height!=null?c.wave_height+" m onde":"onde n/d"}${c.sea_surface_temperature!=null?" · acqua "+Math.round(c.sea_surface_temperature)+"°C":""}`;render()}catch(e){$("marineText").textContent="Meteo marino non disponibile";render()}}
function chatSend(){const t=$("chatInput").value.trim();if(!t)return;$("chatLog").innerHTML+=`<div class="user">${t}</div>`;$("chatInput").value="";const s=t.toLowerCase();state.query=s;$("textSearch").value=s;if(s.match(/snork|pesci|polp|maschera/))setMode("snorkel");else if(s.match(/wow|bello|turchese|cristall/))setMode("wow");else setMode("balanced");const mins=s.match(/(\d+)\s*(min|minuti|ora|ore|h)/);if(mins){let n=Number(mins[1]);if(s.includes("ora")||s.includes("ore")||s.includes("h"))n*=60;state.driveMax=n;$("driveMax").value=Math.min(260,n);$("driveLabel").textContent=n+" min"}const top=results().slice(0,3);$("chatLog").innerHTML+=`<div class="bot">Ok, ti ho aggiornato la ricerca. Ti direi:<br><br>${top.map((p,i)=>`${i+1}. <b>${p.name}</b> · 🚗 ${p.driveMin} min · 🤿 ${p.snorkeling}/10 · WOW ${p.wow}/10<br><small>${why(p)}. Snorkeling AI dice: pesci ${p.snorkelingAI?.fishProbability||"--"}%, fondale ${p.snorkelingAI?.bottom||"-"}.</small>`).join("<br><br>")}<br><br>Puoi continuare con “più vicino”, “meno camminata”, “voglio polpi”, “più mare wow”, “meglio per principianti”.</div>`;$("chatLog").scrollTop=$("chatLog").scrollHeight;render()}
function bind(){document.querySelectorAll(".mode").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));document.querySelectorAll(".bottomnav button[data-mode]").forEach(b=>b.addEventListener("click",()=>{setMode(b.dataset.mode);window.scrollTo({top:0,behavior:"smooth"})}));$("navCompare")?.addEventListener("click",()=>document.querySelector(".compare-card")?.scrollIntoView({behavior:"smooth"}));$("clearCompareBtn")?.addEventListener("click",clearCompare);$("navFavorites")?.addEventListener("click",()=>document.querySelector(".favorites-card")?.scrollIntoView({behavior:"smooth"}));$("showFavoritesBtn")?.addEventListener("click",()=>renderFavorites());$("navChat").addEventListener("click",()=>document.querySelector(".assistant-card").scrollIntoView({behavior:"smooth"}));$("useBase").addEventListener("click",()=>setOrigin("base"));$("useGps").addEventListener("click",()=>setOrigin("gps"));$("useManual").addEventListener("click",()=>setOrigin("manual"));$("originPreset").addEventListener("change",applyPreset);$("manualCoords").addEventListener("change",applyCoords);$("driveMax").addEventListener("input",()=>{state.driveMax=Number($("driveMax").value);$("driveLabel").textContent=state.driveMax+" min";render()});$("walkMax").addEventListener("input",()=>{state.walkMax=Number($("walkMax").value);$("walkLabel").textContent=state.walkMax+" min";render()});$("textSearch").addEventListener("input",()=>{state.query=$("textSearch").value;render()});$("sortMode").addEventListener("input",()=>{state.sort=$("sortMode").value;render()});["quietOnly","localOnly","meteoAiOnly","recommendedOnly","withinDriveOnly","favoritesOnly","hideVisited"].forEach(id=>$(id).addEventListener("change",()=>{state[id]=$(id).checked;render()}));$("refreshWeather").addEventListener("click",()=>fetchWeather(state.origin.lat,state.origin.lon,state.origin.label||"partenza",true));$("todayBtn").addEventListener("click",today);$("manualUpdateBtn")?.addEventListener("click",()=>checkForAppUpdate(true));$("doUpdateBtn")?.addEventListener("click",safeUpdateNow);$("skipUpdateBtn")?.addEventListener("click",()=>$("updateOverlay")?.classList.add("hidden"));$("closeDialog").addEventListener("click",()=>$("placeDialog").close());$("chatSend").addEventListener("click",chatSend);$("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")chatSend()})}

const APP_VERSION_CODE = 23;
function collectPersonalData(){
  const favorites={},visited={},notes={};
  PLACES.forEach(p=>{
    if(p.favorite)favorites[p.id]=true;
    if(p.visited)visited[p.id]=true;
    if(p.personalNote)notes[p.id]=p.personalNote;
  });
  return {version:window.APP_META?.version||"21", savedAt:new Date().toISOString(), favorites, visited, notes};
}
function applyPersonalData(data){
  if(!data)return;
  PLACES.forEach(p=>{
    if(data.favorites?.[p.id])p.favorite=true;
    if(data.visited?.[p.id])p.visited=true;
    if(data.notes?.[p.id])p.personalNote=data.notes[p.id];
  });
}
function saveUpdateBackup(){
  try{
    const data=collectPersonalData();
    const raw=JSON.stringify(data);
    localStorage.setItem("sardegna-safe-backup", raw);
    sessionStorage.setItem("sardegna-safe-backup", raw);
  }catch(e){}
}
function restoreUpdateBackup(){
  try{
    const raw=sessionStorage.getItem("sardegna-safe-backup")||localStorage.getItem("sardegna-safe-backup");
    if(!raw)return;
    applyPersonalData(JSON.parse(raw));
    saveLocal();
    sessionStorage.removeItem("sardegna-safe-backup");
    localStorage.removeItem("sardegna-safe-backup");
  }catch(e){}
}
async function clearAppCachesOnly(){
  if("serviceWorker" in navigator){
    const regs=await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r=>r.unregister()));
  }
  if(window.caches){
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith("sardegna-explorer")).map(k=>caches.delete(k)));
  }
}
async function safeUpdateNow(){
  const ok=confirm("Aggiorno l'app. Preferiti, visitati e note resteranno salvati. Continuo?");
  if(!ok)return;
  saveUpdateBackup();
  try{
    await clearAppCachesOnly();
  }catch(e){}
  const url=new URL(window.location.href);
  url.searchParams.set("v", String(APP_VERSION_CODE));
  url.searchParams.set("t", Date.now().toString());
  window.location.replace(url.toString());
}
function showUpdatePrompt(versionInfo){
  const overlay=document.getElementById("updateOverlay");
  const txt=document.getElementById("updateText");
  if(!overlay)return;
  if(txt)txt.textContent=`È disponibile ${versionInfo?.version || "una nuova versione"} dell'app.`;
  overlay.classList.remove("hidden");
}
async function checkForAppUpdate(manual=false){
  try{
    const res=await fetch(`version.json?t=${Date.now()}`, {cache:"no-store"});
    if(!res.ok)throw new Error("no version");
    const info=await res.json();
    const remote=Number(info.versionCode||0);
    if(remote>APP_VERSION_CODE || manual){
      if(remote>APP_VERSION_CODE) showUpdatePrompt(info);
      else if(manual) alert("Se hai appena caricato nuovi file e vedi ancora una vecchia versione, premi OK nella prossima schermata per forzare aggiornamento.");
    }
    if(manual) safeUpdateNow();
  }catch(e){
    if(manual) safeUpdateNow();
  }
}

let deferredPrompt;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});$("installBtn")?.addEventListener("click",async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$("installBtn").classList.add("hidden")}});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
loadLocal();restoreUpdateBackup();initMap();bind();fetchWeather(BASE.lat,BASE.lon,"La Caletta",true);setTimeout(()=>checkForAppUpdate(false),1200);
