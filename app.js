// app.js
// Basic waypoint editor with Leaflet, localStorage, export and send-to-server (fetch)

const map = L.map('map').setView([48.2082, 16.3738], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap-Mitwirkende'
}).addTo(map);

const wpListEl = document.getElementById('wpList');
const exportGeoBtn = document.getElementById('exportGeo');
const exportCSVBtn = document.getElementById('exportCSV');
const clearAllBtn = document.getElementById('clearAll');

let waypoints = {}; // id -> {id, lat, lng, meta, marker}

// helper: create unique id
function makeId(){ return 'wp_' + Date.now() + '_' + Math.floor(Math.random()*10000); }

// Load from localStorage
function loadWaypoints(){
  const raw = localStorage.getItem('wps_v1');
  if(!raw) return;
  try{
    const arr = JSON.parse(raw);
    arr.forEach(w => addWaypoint(w.lat, w.lng, w.meta || {}, w.id, false));
  }catch(e){ console.warn('load error', e) }
}

// Save to localStorage (persist)
function saveWaypoints(){
  const arr = Object.values(waypoints).map(w => ({id:w.id, lat:w.lat, lng:w.lng, meta:w.meta}));
  localStorage.setItem('wps_v1', JSON.stringify(arr));
}

// Add a marker and internal entry
function addWaypoint(lat, lng, meta={}, id=null, center=true){
  const wpId = id || makeId();
  const marker = L.marker([lat,lng], {draggable:true}).addTo(map);
  marker.bindPopup(`<div><strong>Wegpunkt</strong><div class="coords">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
    <div style="margin-top:6px"><button id="send_${wpId}">Senden</button>
    <button id="delete_${wpId}">Löschen</button></div></div>`);
  marker.on('dragend', (ev) => {
    const p = ev.target.getLatLng();
    updateWaypoint(wpId, p.lat, p.lng);
  });
  marker.on('popupopen', () => {
    document.getElementById(`send_${wpId}`).onclick = () => sendWaypoint(wpId);
    document.getElementById(`delete_${wpId}`).onclick = () => removeWaypoint(wpId);
  });

  waypoints[wpId] = { id: wpId, lat, lng, meta, marker };
  renderList();
  saveWaypoints();
  if(center) map.panTo([lat,lng]);
}

// Update position after drag
function updateWaypoint(id, lat, lng){
  const wp = waypoints[id];
  if(!wp) return;
  wp.lat = lat; wp.lng = lng;
  // update popup coords text (if open)
  wp.marker.setPopupContent(`<div><strong>Wegpunkt</strong><div class="coords">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
    <div style="margin-top:6px"><button id="send_${id}">Senden</button>
    <button id="delete_${id}">Löschen</button></div></div>`);
  renderList();
  saveWaypoints();
}

// Remove waypoint
function removeWaypoint(id){
  const wp = waypoints[id];
  if(!wp) return;
  map.removeLayer(wp.marker);
  delete waypoints[id];
  renderList();
  saveWaypoints();
}

// Render sidebar list
function renderList(){
  wpListEl.innerHTML = '';
  const arr = Object.values(waypoints).sort((a,b)=>a.id.localeCompare(b.id));
  arr.forEach(w=>{
    const div = document.createElement('div'); div.className='wp-item';
    const left = document.createElement('div');
    left.innerHTML = `<div><strong>${w.id}</strong></div><div class="coords">${w.lat.toFixed(6)}, ${w.lng.toFixed(6)}</div>`;
    const right = document.createElement('div'); right.className='wp-actions';
    const panBtn = document.createElement('button'); panBtn.textContent='►';
    panBtn.title='Zur Position fahren';
    panBtn.onclick = ()=>{ map.panTo([w.lat,w.lng]); w.marker.openPopup(); };
    const sendBtn = document.createElement('button'); sendBtn.textContent='Senden';
    sendBtn.onclick = ()=> sendWaypoint(w.id);
    const delBtn = document.createElement('button'); delBtn.textContent='Löschen';
    delBtn.onclick = ()=> removeWaypoint(w.id);
    right.append(panBtn, sendBtn, delBtn);
    div.append(left, right);
    wpListEl.appendChild(div);
  });
}

// Export GeoJSON
function exportGeoJSON(){
  const features = Object.values(waypoints).map(w => ({
    type: 'Feature',
    properties: { id: w.id, ...w.meta },
    geometry: { type: 'Point', coordinates: [w.lng, w.lat] }
  }));
  const fc = { type: 'FeatureCollection', features };
  const blob = new Blob([JSON.stringify(fc, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='waypoints.geojson'; a.click();
  URL.revokeObjectURL(url);
}

// Export CSV (id,lat,lng)
function exportCSV(){
  const lines = ['id,lat,lng'];
  Object.values(waypoints).forEach(w => lines.push(`${w.id},${w.lat},${w.lng}`));
  const blob = new Blob([lines.join('\n')], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='waypoints.csv'; a.click();
  URL.revokeObjectURL(url);
}

// Send waypoint to server (HTTP POST)
async function sendWaypoint(id){
  const w = waypoints[id];
  if(!w) { alert('Wegpunkt nicht gefunden'); return; }
  const payload = { deviceId: 'all', id: w.id, lat: w.lat, lng: w.lng, meta: w.meta || {}, ts: Date.now() };
  try{
    const res = await fetch('/api/waypoints', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(res.ok) { alert('Wegpunkt gesendet!'); }
    else { alert('Fehler beim Senden: ' + res.status); }
  }catch(err){
    alert('Netzwerkfehler beim Senden: ' + err);
  }

  // ALTERNATIVE: Wenn du Socket.IO benutzt (Server muss socket.io bereitstellen)
  // const socket = io(); socket.emit('new-waypoint', payload);
}

// clear all
function clearAll(){
  Object.values(waypoints).forEach(w=> map.removeLayer(w.marker));
  waypoints={};
  renderList();
  saveWaypoints();
}

// map click -> add waypoint
map.on('click', e => addWaypoint(e.latlng.lat, e.latlng.lng, {note:'from map'} ));

exportGeoBtn.onclick = exportGeoJSON;
exportCSVBtn.onclick = exportCSV;
clearAllBtn.onclick = () => { if(confirm('Alle Wegpunkte löschen?')) clearAll(); };

// initial load
loadWaypoints();
renderList();

