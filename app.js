
const $ = (id)=>document.getElementById(id);
let state = {
  wind: "Mare calmo", goal: "Snorkeling", walkMax: 20, crowd: "Tranquillo",
  onlySnorkel: false, onlyLocal: false, favoritesOnly: false, nearMeOnly: false,
  search: "", userLocation: null, markers: []
};

const categoryIcon = {
  "Snorkeling elite":"🤿","Snorkeling PRO":"🐠","Calette nascoste":"🏝️","Spiagge top":"🏖️",
  "Panorami/foto":"📸","Escursioni/gommoni":"🚤","Cibo/pesce":"🍝","Parcheggi/accessi":"🅿️"
};

function loadLocal(){
  try{
    const saved = JSON.parse(localStorage.getItem("sardegna-explorer-state")||"{}");
    if(saved.favorites){
      PLACES.forEach(p => {
        if(saved.favorites[p.id]) p.favorite = true;
        if(saved.visited && saved.visited[p.id]) p.visited = true;
        if(saved.notes && saved.notes[p.id]) p.personalNote = saved.notes[p.id];
      });
    }
  }catch(e){}
}
function saveLocal(){
  const favorites={}, visited={}, notes={};
  PLACES.forEach(p=>{ if(p.favorite) favorites[p.id]=true; if(p.visited) visited[p.id]=true; if(p.personalNote) notes[p.id]=p.personalNote; });
  localStorage.setItem("sardegna-explorer-state", JSON.stringify({favorites,visited,notes}));
}

function haversineKm(a,b,c,d){
  const R=6371, toRad=x=>x*Math.PI/180;
  const dLat=toRad(c-a), dLon=toRad(d-b);
  const s1=Math.sin(dLat/2), s2=Math.sin(dLon/2);
  const q=s1*s1+Math.cos(toRad(a))*Math.cos(toRad(c))*s2*s2;
  return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}
function distanceFromUser(p){
  if(!state.userLocation) return null;
  return haversineKm(state.userLocation.lat,state.userLocation.lon,p.lat,p.lon);
}
function scorePlace(p){
  let score = (p.wow||0)*2 + (p.snorkeling||0)*0.35;
  if(state.goal==="Snorkeling") score += (p.snorkeling||0)*1.3;
  if(state.goal==="Caletta nascosta" && p.category==="Calette nascoste") score += 8;
  if(state.goal==="Spiaggia wow") score += (p.waterColor||0)*0.9;
  if(state.goal==="Foto/tramonto" && (p.photoType||"").includes("Panorama")) score += 8;
  if(state.goal==="Relax poca gente" && p.crowdTarget==="Tranquillo") score += 7;
  if(state.goal==="Coppia" && (p.suitedFor||"").includes("Coppia")) score += 5;
  if(state.goal==="Escursione/barca" && p.category==="Escursioni/gommoni") score += 9;

  if((p.windOK||"").includes(state.wind)) score += 6;
  if((p.windAvoid||"").includes(state.wind)) score -= 10;

  score += (p.walkMin <= state.walkMax) ? 5 : -6;
  if(state.crowd === "Indifferente") score += 1;
  else score += (p.crowdTarget === state.crowd) ? 5 : -3;

  if(state.onlySnorkel && p.snorkeling < 7) score -= 100;
  if(state.onlyLocal && p.level !== "L1 Local") score -= 100;
  if(state.favoritesOnly && !p.favorite) score -= 100;

  const d = distanceFromUser(p);
  if(state.nearMeOnly && d !== null){
    score += Math.max(0, 12 - d/3);
    if(d > 40) score -= 30;
  }
  if(state.search){
    const hay = `${p.name} ${p.category} ${p.zone} ${p.fauna} ${p.notes}`.toLowerCase();
    if(!hay.includes(state.search.toLowerCase())) score -= 1000;
  }
  return Math.round(score*10)/10;
}
function filteredSorted(){
  return PLACES.map(p=>({...p, aiScore: scorePlace(p), distanceKm: distanceFromUser(p)}))
    .filter(p=>p.aiScore>-50)
    .sort((a,b)=>b.aiScore-a.aiScore);
}
function mapsDirectionsUrl(p){
  const dest = `${p.lat},${p.lon}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}
function markerColor(cat){
  if(cat.includes("Snorkeling")) return "#38bdf8";
  if(cat==="Calette nascoste") return "#22c55e";
  if(cat==="Spiagge top") return "#fbbf24";
  if(cat==="Panorami/foto") return "#fb923c";
  if(cat==="Cibo/pesce") return "#fb7185";
  if(cat==="Escursioni/gommoni") return "#c084fc";
  return "#94a3b8";
}
function makeIcon(p){
  const color = markerColor(p.category);
  return L.divIcon({
    className:"custom-marker",
    html:`<div style="width:30px;height:30px;border-radius:50%;background:${color};display:grid;place-items:center;border:2px solid white;box-shadow:0 8px 20px rgba(0,0,0,.35);font-size:16px">${categoryIcon[p.category]||"📍"}</div>`,
    iconSize:[30,30], iconAnchor:[15,15], popupAnchor:[0,-12]
  });
}

let map, markerLayer;
function initMap(){
  map = L.map("map", {zoomControl:false}).setView([40.54,9.80], 9);
  L.control.zoom({position:"bottomright"}).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}
function renderMarkers(list){
  markerLayer.clearLayers();
  list.slice(0,120).forEach(p=>{
    const m = L.marker([p.lat,p.lon], {icon:makeIcon(p)}).addTo(markerLayer);
    m.bindPopup(`<b>${categoryIcon[p.category]||"📍"} ${p.name}</b><br>${p.zone}<br>AI ${p.aiScore} · WOW ${p.wow}/10<br><button onclick="openDetail('${p.id}')">Apri scheda</button>`);
  });
}
function renderResults(){
  const list = filteredSorted();
  renderMarkers(list);
  const el = $("results");
  el.innerHTML = "";
  list.slice(0,30).forEach((p, idx)=>{
    const d = p.distanceKm==null ? "" : ` · ${p.distanceKm.toFixed(1)} km da te`;
    const div = document.createElement("article");
    div.className = "card";
    div.innerHTML = `
      <h4>${idx+1}. ${categoryIcon[p.category]||"📍"} ${p.name}</h4>
      <div class="meta">${p.zone}${d}<br>${p.category} · ${p.bestTime||""}</div>
      <div class="score">
        <span class="pill gold">AI ${p.aiScore}</span>
        <span class="pill">WOW ${p.wow}/10</span>
        <span class="pill">🤿 ${p.snorkeling}/10</span>
        <span class="pill">🚶 ${p.walkMin} min</span>
        ${p.favorite?'<span class="pill gold">★ preferito</span>':''}
      </div>
      <div class="meta">${p.windOK ? "Vento ok: "+p.windOK : ""}</div>
      <div class="actions">
        <button onclick="openDetail('${p.id}')">Scheda</button>
        <a class="ghost" href="${mapsDirectionsUrl(p)}" target="_blank">Naviga</a>
        <button class="ghost" onclick="toggleFavorite('${p.id}')">${p.favorite?'★':'☆'} Preferito</button>
      </div>
    `;
    el.appendChild(div);
  });
}
function openDetail(id){
  const p = PLACES.find(x=>x.id===id);
  if(!p) return;
  fetchWeather(p.lat,p.lon, p.name);
  $("placeDetail").innerHTML = `
    <div class="detail">
      <h2>${categoryIcon[p.category]||"📍"} ${p.name}</h2>
      <p class="meta">${p.zone} · ${p.category}</p>
      <div class="score">
        <span class="pill gold">WOW ${p.wow}/10</span><span class="pill">Snorkeling ${p.snorkeling}/10</span>
        <span class="pill">Acqua ${p.waterColor}/10</span><span class="pill">Cammino ${p.walkMin} min</span>
      </div>
      <div class="detail-grid">
        <div class="detail-box"><b>Vento OK</b>${p.windOK||"-"}</div>
        <div class="detail-box"><b>Da evitare</b>${p.windAvoid||"-"}</div>
        <div class="detail-box"><b>Fauna</b>${p.fauna||"-"}</div>
        <div class="detail-box"><b>Profondità</b>${p.depth||"-"}</div>
        <div class="detail-box"><b>Ingresso</b>${p.entryTip||"-"}</div>
        <div class="detail-box"><b>Sicurezza</b>${p.safety||"-"}</div>
        <div class="detail-box"><b>Parcheggio</b>${p.parking||"-"}</div>
        <div class="detail-box"><b>Orario migliore</b>${p.bestTime||"-"}</div>
      </div>
      <p>${p.notes||""}</p>
      <textarea id="noteBox" placeholder="Nota personale..." style="width:100%;min-height:90px;border-radius:16px;padding:12px;background:#061c1a;color:white;border:1px solid rgba(255,255,255,.12)">${p.personalNote||""}</textarea>
      <div class="actions" style="margin-top:12px">
        <a class="primary" href="${mapsDirectionsUrl(p)}" target="_blank">Apri navigazione Google Maps</a>
        <a class="ghost" href="${p.mapsUrl}" target="_blank">Vedi su Google Maps</a>
        <button class="ghost" onclick="toggleFavorite('${p.id}')">${p.favorite?'★ Preferito':'☆ Aggiungi preferito'}</button>
        <button class="ghost" onclick="toggleVisited('${p.id}')">${p.visited?'Visitato ✓':'Segna visitato'}</button>
        <button onclick="saveNote('${p.id}')">Salva nota</button>
      </div>
    </div>
  `;
  $("placeDialog").showModal();
}
window.openDetail = openDetail;
function toggleFavorite(id){ const p=PLACES.find(x=>x.id===id); if(p){p.favorite=!p.favorite; saveLocal(); renderResults(); if($("placeDialog").open) openDetail(id);} }
function toggleVisited(id){ const p=PLACES.find(x=>x.id===id); if(p){p.visited=!p.visited; saveLocal(); renderResults(); if($("placeDialog").open) openDetail(id);} }
function saveNote(id){ const p=PLACES.find(x=>x.id===id); if(p){p.personalNote=$("noteBox").value; saveLocal(); renderResults();} }
window.toggleFavorite=toggleFavorite; window.toggleVisited=toggleVisited; window.saveNote=saveNote;

async function fetchWeather(lat,lon,label="questa zona"){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&hourly=wind_speed_10m,wind_direction_10m,temperature_2m&forecast_days=1&timezone=auto`;
  $("weatherText").textContent = "Carico meteo...";
  try{
    const res = await fetch(url);
    const data = await res.json();
    const c = data.current || {};
    const dir = windDirName(c.wind_direction_10m);
    $("weatherText").innerHTML = `<b>${label}</b>: ${Math.round(c.temperature_2m)}°C · vento ${Math.round(c.wind_speed_10m)} km/h da ${dir}.`;
  }catch(e){
    $("weatherText").textContent = "Meteo non disponibile ora. Controlla connessione.";
  }
}
function windDirName(deg){
  if(deg==null) return "-";
  const dirs=["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg/45)%8];
}
function bindControls(){
  ["wind","goal","crowd","search"].forEach(id=>{
    $(id).addEventListener("input",()=>{
      state[id==="search"?"search":id] = $(id).value;
      renderResults();
    });
  });
  $("walkMax").addEventListener("input",()=>{
    state.walkMax = Number($("walkMax").value);
    $("walkLabel").textContent = state.walkMax + " min";
    renderResults();
  });
  ["onlySnorkel","onlyLocal","favoritesOnly","nearMeOnly"].forEach(id=>{
    $(id).addEventListener("change",()=>{ state[id] = $(id).checked; renderResults(); });
  });
  document.querySelectorAll(".bottomnav button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      $("goal").value = btn.dataset.goal;
      state.goal = btn.dataset.goal;
      renderResults();
      window.scrollTo({top:0,behavior:"smooth"});
    });
  });
  $("closeDialog").addEventListener("click",()=>$("placeDialog").close());
  $("weatherLaCaletta").addEventListener("click",()=>fetchWeather(40.6096,9.7514,"La Caletta"));
  $("locateBtn").addEventListener("click",()=>{
    if(!navigator.geolocation){ alert("Geolocalizzazione non disponibile"); return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      state.userLocation = {lat:pos.coords.latitude, lon:pos.coords.longitude};
      if(!window.userMarker){
        window.userMarker = L.circleMarker([state.userLocation.lat,state.userLocation.lon],{radius:8,color:"#fff",fillColor:"#ef4444",fillOpacity:1}).addTo(map).bindPopup("Sei qui");
      } else window.userMarker.setLatLng([state.userLocation.lat,state.userLocation.lon]);
      map.setView([state.userLocation.lat,state.userLocation.lon], 11);
      fetchWeather(state.userLocation.lat,state.userLocation.lon,"la tua posizione");
      renderResults();
    },()=>alert("Non riesco a leggere la posizione. Controlla i permessi."));
  });
}
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault(); deferredPrompt=e; $("installBtn").classList.remove("hidden");
});
$("installBtn")?.addEventListener("click", async()=>{
  if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; $("installBtn").classList.add("hidden"); }
});
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
}
loadLocal(); initMap(); bindControls(); renderResults(); fetchWeather(40.6096,9.7514,"La Caletta");
