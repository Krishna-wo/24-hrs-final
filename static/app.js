// const views = {
//   map: document.getElementById('map-view'),
//   report: document.getElementById('report-view'),
//   dashboard: document.getElementById('dashboard-view'),
//   controls: document.getElementById('controls-view'),
//   history: document.getElementById('history-view')
// };
// const navBtns = document.querySelectorAll('.nav-btn');
// const modal = document.getElementById('incident-modal');
// const modalContent = document.getElementById('modal-content');
// const profileModal = document.getElementById('profile-modal');

// let map;
// let pickerMap;
// let pickerMarker;
// let selectedCoords = null;
// let markersLayer;
// let currentIncidents = [];
// let streetLayer;
// let satelliteLayer;
// let terrainLayer;

// function colorBySeverity(severity) {
//   if (severity === 'Critical') return '#dc2626';
//   if (severity === 'Medium') return '#ca8a04';
//   return '#16a34a';
// }

// function badgeClass(severity) {
//   if (severity === 'Critical') return 'red';
//   if (severity === 'Medium') return 'yellow';
//   return 'green';
// }

// function showView(name) {
//   Object.entries(views).forEach(([k, el]) => el.classList.toggle('active', k === name));
//   navBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === name));
//   if (name === 'dashboard') loadDashboard();
//   if (name === 'history') loadHistory();
//   if (name === 'map') setTimeout(() => map.invalidateSize(), 80);
//   if (name === 'report') setTimeout(() => pickerMap.invalidateSize(), 80);
// }

// navBtns.forEach((btn) => btn.addEventListener('click', () => showView(btn.dataset.view)));

// function makeIcon(color) {
//   return L.divIcon({
//     className: 'custom-pin',
//     html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px rgba(15,23,42,.18)"></div>`,
//     iconSize: [18, 18]
//   });
// }

// function openModal(incident) {
//   modalContent.innerHTML = `
//     <h3>${incident.type}</h3>
//     <p><strong>Severity:</strong> ${incident.severity}</p>
//     <p><strong>Description:</strong> ${incident.description}</p>
//     <p><strong>Timestamp:</strong> ${new Date(incident.timestamp).toLocaleString()}</p>
//     <p><strong>Status:</strong> ${incident.status}${incident.verified ? ' / VERIFIED' : ''}</p>
//     <p><strong>Estimated response:</strong> ${incident.estimated_response_time}</p>
//     <p><strong>Road blockage range:</strong> ${incident.blockage_range_m ? `${incident.blockage_range_m}m` : 'N/A'}</p>
//     <p><strong>Authority assigned:</strong> ${incident.authority_assigned ? 'Yes' : 'No'} ${incident.authority_name ? `(${incident.authority_name})` : ''}</p>
//     <p><strong>Casualties:</strong> ${incident.casualties || 0}</p>
//     <p><strong>Votes:</strong> <span>${incident.votes}</span></p>
//     <div class="vote-wrap">
//       <button data-vote="1" data-id="${incident.id}">Upvote</button>
//       <button data-vote="-1" data-id="${incident.id}">Downvote</button>
//     </div>
//     ${incident.photo_url ? `<img src="${incident.photo_url}" alt="Incident image">` : ''}
//   `;
//   modal.classList.remove('hidden');
//   modalContent.querySelectorAll('button[data-vote]').forEach((b) => b.addEventListener('click', voteIncident));
// }

// modal.addEventListener('click', (e) => {
//   if (e.target === modal) modal.classList.add('hidden');
// });

// document.addEventListener('keydown', (e) => {
//   if (e.key === 'Escape') {
//     modal.classList.add('hidden');
//     profileModal.classList.add('hidden');
//   }
// });

// async function voteIncident(e) {
//   const id = Number(e.target.dataset.id);
//   const delta = Number(e.target.dataset.vote);
//   await fetch('/api/vote', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ id, delta })
//   });
//   modal.classList.add('hidden');
//   await loadIncidents();
// }

// function incidentsQuery() {
//   const p = new URLSearchParams();
//   const severity = document.getElementById('filter-severity').value;
//   const status = document.getElementById('filter-status').value;
//   const type = document.getElementById('filter-type').value;
//   const verified = document.getElementById('filter-verified').value;
//   const minVotes = document.getElementById('filter-min-votes').value;
//   const dateFrom = document.getElementById('filter-date-from').value;
//   const dateTo = document.getElementById('filter-date-to').value;
//   if (severity) p.set('severity', severity);
//   if (status) p.set('status', status);
//   if (type) p.set('type', type);
//   if (verified) p.set('verified', verified);
//   if (minVotes) p.set('min_votes', minVotes);
//   if (dateFrom) p.set('date_from', new Date(dateFrom).toISOString());
//   if (dateTo) p.set('date_to', new Date(dateTo).toISOString());
//   return p.toString();
// }

// async function loadIncidents() {
//   const query = incidentsQuery();
//   const url = query ? `/api/incidents?${query}` : '/api/incidents';
//   currentIncidents = await (await fetch(url)).json();
//   const keyword = document.getElementById('filter-keyword').value.trim().toLowerCase();
//   if (keyword) {
//     currentIncidents = currentIncidents.filter((i) => (i.description || '').toLowerCase().includes(keyword));
//   }
//   markersLayer.clearLayers();

//   currentIncidents.forEach((i) => {
//     const marker = L.marker([i.latitude, i.longitude], { icon: makeIcon(colorBySeverity(i.severity)) });
//     marker.bindTooltip(`${i.type} • ${i.severity}`);
//     marker.on('click', () => openModal(i));
//     markersLayer.addLayer(marker);
//   });
// }

// function fitAllPins() {
//   if (!currentIncidents.length) return;
//   const bounds = L.latLngBounds(currentIncidents.map((i) => [i.latitude, i.longitude]));
//   map.fitBounds(bounds.pad(0.15));
// }

// function initMap() {
//   map = L.map('map', { zoomControl: false }).setView([14.5995, 120.9842], 12);
//   L.control.zoom({ position: 'bottomright' }).addTo(map);
//   streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
//   satelliteLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '&copy; OpenTopoMap' });
//   terrainLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap HOT' });
//   streetLayer.addTo(map);
//   markersLayer = L.layerGroup().addTo(map);

//   pickerMap = L.map('picker-map').setView([14.5995, 120.9842], 12);
//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(pickerMap);

//   pickerMap.on('click', (e) => {
//     selectedCoords = e.latlng;
//     if (pickerMarker) pickerMarker.setLatLng(e.latlng);
//     else pickerMarker = L.marker(e.latlng).addTo(pickerMap);
//     document.getElementById('coords-label').textContent = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
//   });
// }

// async function compressImage(file, maxWidth = 1280, quality = 0.72) {
//   const bitmap = await createImageBitmap(file);
//   const scale = Math.min(1, maxWidth / bitmap.width);
//   const canvas = document.createElement('canvas');
//   canvas.width = Math.round(bitmap.width * scale);
//   canvas.height = Math.round(bitmap.height * scale);
//   const ctx = canvas.getContext('2d');
//   ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
//   const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
//   return new File([blob], `incident-${Date.now()}.jpg`, { type: 'image/jpeg' });
// }

// async function geolocate() {
//   return new Promise((resolve, reject) => {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
//       reject,
//       { enableHighAccuracy: true }
//     );
//   });
// }

// document.getElementById('locate-btn').addEventListener('click', async () => {
//   try {
//     const coords = await geolocate();
//     map.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
//   } catch {
//     alert('Unable to get location');
//   }
// });

// document.getElementById('search-btn').addEventListener('click', async () => {
//   const q = document.getElementById('search-input').value.trim();
//   if (!q) return;
//   const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
//   const data = await res.json();
//   if (data.length) map.flyTo([Number(data[0].lat), Number(data[0].lon)], 14, { duration: 1.2 });
// });

// document.getElementById('incident-type').addEventListener('change', (e) => {
//   const isRoad = e.target.value === 'Road Block';
//   document.getElementById('road-range-wrap').classList.toggle('hidden', !isRoad);
//   document.getElementById('critical-hint').classList.toggle('hidden', !isRoad);
// });

// document.getElementById('authority-assigned').addEventListener('change', (e) => {
//   document.getElementById('authority-name').disabled = e.target.value !== 'true';
// });

// document.getElementById('report-form').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const form = e.target;
//   const fd = new FormData();
//   let coords = selectedCoords;

//   if (!coords) {
//     try {
//       coords = await geolocate();
//       coords = { lat: coords.lat, lng: coords.lng };
//     } catch {
//       alert('Select location on map or enable GPS');
//       return;
//     }
//   }

//   fd.append('latitude', coords.lat);
//   fd.append('longitude', coords.lng);
//   fd.append('type', form.type.value);
//   fd.append('severity', form.severity.value);
//   fd.append('description', form.description.value);
//   fd.append('blockage_range_m', form.blockage_range_m.value || '');
//   fd.append('authority_assigned', form.authority_assigned.value);
//   fd.append('authority_name', form.authority_name.value || '');
//   fd.append('estimated_resolution_minutes', form.estimated_resolution_minutes.value || '');
//   fd.append('casualties', form.casualties.value || '0');

//   const fileInput = document.getElementById('photo');
//   if (fileInput.files[0]) {
//     const compressed = await compressImage(fileInput.files[0]);
//     fd.append('photo', compressed);
//   }

//   const res = await fetch('/api/report', { method: 'POST', body: fd });
//   if (!res.ok) return alert('Failed to submit report');

//   form.reset();
//   selectedCoords = null;
//   document.getElementById('coords-label').textContent = 'No location selected';
//   document.getElementById('road-range-wrap').classList.add('hidden');
//   document.getElementById('authority-name').disabled = true;
//   if (pickerMarker) {
//     pickerMap.removeLayer(pickerMarker);
//     pickerMarker = null;
//   }

//   await loadIncidents();
//   showView('map');
// });

// async function updateStatus(id, mode) {
//   await fetch(`/api/incidents/${id}/${mode}`, { method: 'PATCH' });
//   await loadDashboard();
//   await loadIncidents();
// }

// async function loadDashboard() {
//   const data = await (await fetch('/api/dashboard')).json();
//   document.getElementById('total-count').textContent = data.total;
//   document.getElementById('critical-count').textContent = data.critical;
//   document.getElementById('avg-response').textContent = data.average_response_time;
//   const list = document.getElementById('incident-list');
//   list.innerHTML = '';

//   data.incidents.forEach((i) => {
//     const row = document.createElement('div');
//     row.className = 'row';
//     row.innerHTML = `
//       <div class="meta">
//         <strong>${i.type}</strong>
//         <span class="badge ${badgeClass(i.severity)}">${i.severity}</span>
//         <small>${new Date(i.timestamp).toLocaleString()} • ${i.status}</small>
//         <small>ETA: ${i.estimated_response_time} • Votes: ${i.votes}</small>
//       </div>
//       <div class="button-row tight">
//         <button data-id="${i.id}" data-mode="under-response">Under Response</button>
//         <button data-id="${i.id}" data-mode="resolve">Resolved</button>
//       </div>
//     `;
//     row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => updateStatus(b.dataset.id, b.dataset.mode)));
//     list.appendChild(row);
//   });
// }

// async function loadHistory() {
//   const records = await (await fetch('/api/history')).json();
//   const list = document.getElementById('history-list');
//   list.innerHTML = records.length ? '' : '<div class="empty">No resolved incidents yet.</div>';

//   records.forEach((i) => {
//     const row = document.createElement('div');
//     row.className = 'row';
//     row.innerHTML = `
//       <div class="meta">
//         <strong>${i.type}</strong>
//         <span class="badge ${badgeClass(i.severity)}">${i.severity}</span>
//         <small>Resolved at ${new Date(i.resolved_at).toLocaleString()}</small>
//       </div>
//       <button data-id="${i.id}">View</button>
//     `;
//     row.querySelector('button').addEventListener('click', () => openModal(i));
//     list.appendChild(row);
//   });
// }

// document.getElementById('apply-filters').addEventListener('click', async () => {
//   await loadIncidents();
// });

// document.getElementById('reset-filters').addEventListener('click', async () => {
//   ['filter-severity', 'filter-status', 'filter-type', 'filter-verified', 'filter-min-votes', 'filter-date-from', 'filter-date-to', 'filter-keyword'].forEach((id) => {
//     document.getElementById(id).value = '';
//   });
//   await loadIncidents();
// });

// document.getElementById('center-all').addEventListener('click', () => {
//   fitAllPins();
//   showView('map');
// });

// document.getElementById('basemap-select').addEventListener('change', (e) => {
//   [streetLayer, satelliteLayer, terrainLayer].forEach((layer) => map.removeLayer(layer));
//   if (e.target.value === 'satellite') satelliteLayer.addTo(map);
//   else if (e.target.value === 'terrain') terrainLayer.addTo(map);
//   else streetLayer.addTo(map);
// });

// document.getElementById('profile-btn').addEventListener('click', () => profileModal.classList.remove('hidden'));
// document.getElementById('close-profile').addEventListener('click', () => profileModal.classList.add('hidden'));
// profileModal.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.add('hidden'); });

// document.getElementById('logout-btn').addEventListener('click', async () => {
//   localStorage.clear();
//   sessionStorage.clear();
//   if ('caches' in window) {
//     const keys = await caches.keys();
//     await Promise.all(keys.map((k) => caches.delete(k)));
//   }
//   alert('Logged out. Local cache/session cleared.');
//   location.reload();
// });

// initMap();
// loadIncidents();


// ── State ──────────────────────────────────────
// const views = {
//   map: document.getElementById('map-view'),
//   report: document.getElementById('report-view'),
//   dashboard: document.getElementById('dashboard-view'),
//   history: document.getElementById('history-view')
// };
// const navBtns = document.querySelectorAll('.nav-btn[data-view]');
// const modal = document.getElementById('incident-modal');
// const modalBody = document.getElementById('modal-body');
// const modalTitle = document.getElementById('modal-title');
// const profileModal = document.getElementById('profile-modal');

// let map, pickerMap, pickerMarker, selectedCoords, markersLayer;
// let streetLayer, satelliteLayer, terrainLayer;
// let currentIncidents = [];

// // Road blockage two-point measurement
// let roadMeasureMode = false;
// let roadPointA = null;
// let roadPointB = null;
// let roadMarkerA = null;
// let roadMarkerB = null;
// let roadLine = null;

// // ── Toast ───────────────────────────────────────
// function toast(msg, type = 'info', duration = 3000) {
//   const tc = document.getElementById('toast-container');
//   const t = document.createElement('div');
//   t.className = `toast ${type}`;
//   const icons = { success: '✅', error: '❌', info: 'ℹ️' };
//   t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
//   tc.appendChild(t);
//   setTimeout(() => {
//     t.style.animation = 'slideIn 0.25s ease reverse';
//     setTimeout(() => t.remove(), 240);
//   }, duration);
// }

// // ── Color helpers ───────────────────────────────
// function colorBySeverity(s) {
//   return s === 'Critical' ? '#dc2626' : s === 'Medium' ? '#d97706' : '#16a34a';
// }
// function badgeClass(s) {
//   return s === 'Critical' ? 'red' : s === 'Medium' ? 'yellow' : 'green';
// }
// function statusBadge(status) {
//   if (status === 'Resolved') return '<span class="status-resolved">Resolved</span>';
//   if (status === 'Under Response') return '<span class="status-under">Under Response</span>';
//   return '<span class="status-active">Active</span>';
// }

// // ── View switching ──────────────────────────────
// function showView(name) {
//   Object.entries(views).forEach(([k, el]) => el.classList.toggle('active', k === name));
//   navBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === name));
//   if (name === 'dashboard') loadDashboard();
//   if (name === 'history') loadHistory();
//   if (name === 'map') setTimeout(() => map && map.invalidateSize(), 80);
//   if (name === 'report') {
//     setTimeout(() => pickerMap && pickerMap.invalidateSize(), 80);
//     autoGeolocateReport();
//   }
// }
// navBtns.forEach((btn) => btn.addEventListener('click', () => showView(btn.dataset.view)));

// // ── Map init ────────────────────────────────────
// function makeIcon(color) {
//   return L.divIcon({
//     className: 'custom-pin',
//     html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3),0 0 0 3px rgba(0,0,0,0.07)"></div>`,
//     iconSize: [18, 18]
//   });
// }

// function makePickerIcon(color, letter) {
//   return L.divIcon({
//     className: 'custom-pin',
//     html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;font-family:Inter,sans-serif">${letter}</div>`,
//     iconSize: [28, 28],
//     iconAnchor: [14, 14]
//   });
// }

// function haversineMeters(lat1, lon1, lat2, lon2) {
//   const R = 6371000;
//   const dLat = (lat2 - lat1) * Math.PI / 180;
//   const dLon = (lon2 - lon1) * Math.PI / 180;
//   const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
//   return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
// }

// function clearRoadMeasure() {
//   if (roadMarkerA) { pickerMap.removeLayer(roadMarkerA); roadMarkerA = null; }
//   if (roadMarkerB) { pickerMap.removeLayer(roadMarkerB); roadMarkerB = null; }
//   if (roadLine) { pickerMap.removeLayer(roadLine); roadLine = null; }
//   roadPointA = null;
//   roadPointB = null;
//   updateMeasureSteps();
// }

// function updateMeasureSteps() {
//   const stepA = document.getElementById('step-a');
//   const stepB = document.getElementById('step-b');
//   if (!stepA) return;
//   if (roadPointA) {
//     stepA.textContent = `A: ${roadPointA.lat.toFixed(4)}, ${roadPointA.lng.toFixed(4)}`;
//     stepA.className = 'step-badge done';
//   } else {
//     stepA.textContent = 'A: Not set';
//     stepA.className = 'step-badge pending';
//   }
//   if (roadPointB) {
//     stepB.textContent = `B: ${roadPointB.lat.toFixed(4)}, ${roadPointB.lng.toFixed(4)}`;
//     stepB.className = 'step-badge done';
//   } else {
//     stepB.textContent = 'B: Not set';
//     stepB.className = 'step-badge' + (roadPointA ? ' step-badge' : ' step-badge pending');
//     if (roadPointA) stepB.className = 'step-badge';
//     else stepB.className = 'step-badge pending';
//   }
// }

// // Auto-geolocate on report form load
// async function autoGeolocateReport() {
//   try {
//     const coords = await geolocate();
//     selectedCoords = { lat: coords.lat, lng: coords.lng };
//     pickerMap.setView([coords.lat, coords.lng], 15);
//     if (pickerMarker) pickerMap.removeLayer(pickerMarker);
//     pickerMarker = L.marker([coords.lat, coords.lng], { icon: makePickerIcon('#2563eb', '📍') }).addTo(pickerMap);
//     document.getElementById('coords-label').textContent = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
//   } catch (err) {
//     document.getElementById('coords-label').textContent = 'Click map to select location';
//   }
// }

// function initMap() {
//   // Main map
//   map = L.map('map', { zoomControl: false }).setView([14.5995, 120.9842], 12);
//   L.control.zoom({ position: 'bottomright' }).addTo(map);
//   streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
//   satelliteLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenTopoMap' });
//   terrainLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap HOT' });
//   streetLayer.addTo(map);
//   markersLayer = L.layerGroup().addTo(map);

//   // Picker map
//   pickerMap = L.map('picker-map').setView([14.5995, 120.9842], 12);
//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(pickerMap);

//   pickerMap.on('click', (e) => {
//     const { lat, lng } = e.latlng;

//     if (roadMeasureMode) {
//       // Two-point road blockage measurement mode
//       if (!roadPointA) {
//         // Set point A
//         roadPointA = e.latlng;
//         if (roadMarkerA) pickerMap.removeLayer(roadMarkerA);
//         roadMarkerA = L.marker([lat, lng], { icon: makePickerIcon('#16a34a', 'A') }).addTo(pickerMap);
//         roadMarkerA.bindTooltip('Point A (Start)').openTooltip();
//         updateMeasureSteps();
//         toast('Point A set — now click Point B on the road', 'info');
//       } else if (!roadPointB) {
//         // Set point B
//         roadPointB = e.latlng;
//         if (roadMarkerB) pickerMap.removeLayer(roadMarkerB);
//         roadMarkerB = L.marker([lat, lng], { icon: makePickerIcon('#dc2626', 'B') }).addTo(pickerMap);
//         roadMarkerB.bindTooltip('Point B (End)').openTooltip();

//         // Draw line between A and B
//         if (roadLine) pickerMap.removeLayer(roadLine);
//         roadLine = L.polyline([roadPointA, roadPointB], { color: '#f97316', weight: 4, dashArray: '6 4', opacity: 0.85 }).addTo(pickerMap);

//         // Calculate distance
//         const dist = haversineMeters(roadPointA.lat, roadPointA.lng, roadPointB.lat, roadPointB.lng);
//         const distRounded = Math.round(dist * 10) / 10;
//         document.getElementById('blockage-range-input').value = distRounded;

//         // Show critical hint if >= 10m
//         document.getElementById('critical-hint').classList.toggle('hidden', distRounded < 10);

//         updateMeasureSteps();
//         toast(`Blockage measured: ${distRounded}m${distRounded >= 10 ? ' — auto-escalated to Critical!' : ''}`, distRounded >= 10 ? 'error' : 'success');

//         // Fit the line in view
//         pickerMap.fitBounds(roadLine.getBounds().pad(0.2));
//       } else {
//         // Both points already set — reset and start over
//         clearRoadMeasure();
//         roadPointA = e.latlng;
//         roadMarkerA = L.marker([lat, lng], { icon: makePickerIcon('#16a34a', 'A') }).addTo(pickerMap);
//         updateMeasureSteps();
//         toast('Measurement reset — Point A set. Click Point B.', 'info');
//       }
//       // Also update the incident location to point A if not yet selected
//       if (!selectedCoords) {
//         selectedCoords = e.latlng;
//         if (pickerMarker) { pickerMap.removeLayer(pickerMarker); pickerMarker = null; }
//         document.getElementById('coords-label').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
//       }
//     } else {
//       // Normal location picker
//       selectedCoords = e.latlng;
//       if (pickerMarker) pickerMarker.setLatLng(e.latlng);
//       else pickerMarker = L.marker(e.latlng, { icon: makePickerIcon('#2563eb', '📍') }).addTo(pickerMap);
//       document.getElementById('coords-label').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
//     }
//   });
// }

// // ── Incident modal ──────────────────────────────
// function openModal(incident) {
//   modalTitle.textContent = incident.type;
//   modalBody.innerHTML = `
//     ${incident.photo_url ? `<img src="${incident.photo_url}" alt="Incident photo">` : ''}
//     <div class="info-grid">
//       <div class="info-item">
//         <div class="ii-label">Severity</div>
//         <div class="ii-val"><span class="badge ${badgeClass(incident.severity)}">${incident.severity}</span></div>
//       </div>
//       <div class="info-item">
//         <div class="ii-label">Status</div>
//         <div class="ii-val">${statusBadge(incident.status)}</div>
//       </div>
//       <div class="info-item">
//         <div class="ii-label">Reported</div>
//         <div class="ii-val">${new Date(incident.timestamp).toLocaleString()}</div>
//       </div>
//       <div class="info-item">
//         <div class="ii-label">Est. Response</div>
//         <div class="ii-val">⏱ ${incident.estimated_response_time}</div>
//       </div>
//       <div class="info-item">
//         <div class="ii-label">Road Blockage</div>
//         <div class="ii-val">${incident.blockage_range_m ? `🚧 ${incident.blockage_range_m}m` : '—'}</div>
//       </div>
//       <div class="info-item">
//         <div class="ii-label">Casualties</div>
//         <div class="ii-val">${incident.casualties > 0 ? `🩹 ${incident.casualties}` : '0'}</div>
//       </div>
//       <div class="info-item">
//         <div class="ii-label">Authority</div>
//         <div class="ii-val">${incident.authority_assigned ? `${incident.authority_name || 'Assigned'}` : 'Not assigned'}</div>
//       </div>
//       <div class="info-item">
//         <div class="ii-label">Verified</div>
//         <div class="ii-val">${incident.verified ? 'Verified' : 'Unverified'}</div>
//       </div>
//       <div class="info-item full">
//         <div class="ii-label">Description</div>
//         <div class="ii-val" style="font-weight:500;white-space:pre-wrap">${incident.description}</div>
//       </div>
//     </div>
//     <div class="vote-wrap">
//       <button class="vote-up" data-vote="1" data-id="${incident.id}">👍 Upvote (${incident.votes >= 0 ? '+' : ''}${incident.votes})</button>
//       <button class="vote-down" data-vote="-1" data-id="${incident.id}">👎 Downvote</button>
//     </div>
//   `;
//   modal.classList.remove('hidden');
//   modalBody.querySelectorAll('button[data-vote]').forEach((b) => b.addEventListener('click', voteIncident));
// }

// document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
// modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
// document.addEventListener('keydown', (e) => {
//   if (e.key === 'Escape') { modal.classList.add('hidden'); profileModal.classList.add('hidden'); }
// });

// async function voteIncident(e) {
//   const id = Number(e.target.dataset.id);
//   const delta = Number(e.target.dataset.vote);
//   const res = await fetch('/api/vote', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ id, delta })
//   });
//   if (res.ok) {
//     modal.classList.add('hidden');
//     await loadIncidents();
//     toast('Vote recorded!', 'success');
//   }
// }

// // ── Load incidents (map) ────────────────────────
// function incidentsQuery() {
//   const p = new URLSearchParams();
//   const severity = document.getElementById('filter-severity').value;
//   const status = document.getElementById('filter-status').value;
//   const type = document.getElementById('filter-type').value;
//   const verified = document.getElementById('filter-verified').value;
//   if (severity) p.set('severity', severity);
//   if (status) p.set('status', status);
//   if (type) p.set('type', type);
//   if (verified) p.set('verified', verified);
//   return p.toString();
// }

// async function loadIncidents() {
//   const query = incidentsQuery();
//   const url = query ? `/api/incidents?${query}` : '/api/incidents';
//   currentIncidents = await (await fetch(url)).json();
//   markersLayer.clearLayers();
//   currentIncidents.forEach((i) => {
//     const marker = L.marker([i.latitude, i.longitude], { icon: makeIcon(colorBySeverity(i.severity)) });
//     marker.bindTooltip(`<b>${i.type}</b> • ${i.severity}<br>${statusBadge(i.status)}`, { direction: 'top' });
//     marker.on('click', () => openModal(i));
//     markersLayer.addLayer(marker);

//     // Draw blockage circle for Road Blocks with range
//     if (i.type === 'Road Block' && i.blockage_range_m && i.status !== 'Resolved') {
//       L.circle([i.latitude, i.longitude], {
//         radius: i.blockage_range_m / 2,
//         color: '#f97316',
//         fillColor: '#f97316',
//         fillOpacity: 0.12,
//         weight: 2,
//         dashArray: '5 4'
//       }).addTo(markersLayer);
//     }
//   });
// }

// function fitAllPins() {
//   if (!currentIncidents.length) return;
//   const bounds = L.latLngBounds(currentIncidents.map((i) => [i.latitude, i.longitude]));
//   map.fitBounds(bounds.pad(0.15));
// }

// // ── Geolocate ───────────────────────────────────
// async function geolocate() {
//   return new Promise((resolve, reject) => {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
//       reject, { enableHighAccuracy: true, timeout: 10000 }
//     );
//   });
// }

// document.getElementById('locate-btn').addEventListener('click', async () => {
//   try {
//     const coords = await geolocate();
//     map.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
//   } catch { toast('Unable to get location', 'error'); }
// });

// document.getElementById('search-btn').addEventListener('click', async () => {
//   const q = document.getElementById('search-input').value.trim();
//   if (!q) return;
//   const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
//   const data = await res.json();
//   if (data.length) map.flyTo([Number(data[0].lat), Number(data[0].lon)], 14, { duration: 1.2 });
//   else toast('Location not found', 'error');
// });

// document.getElementById('search-input').addEventListener('keydown', (e) => {
//   if (e.key === 'Enter') document.getElementById('search-btn').click();
// });

// // ── Incident type change ────────────────────────
// document.getElementById('incident-type').addEventListener('change', (e) => {
//   const isRoad = e.target.value === 'Road Block';
//   const wrap = document.getElementById('road-range-wrap');
//   wrap.style.display = isRoad ? 'flex' : 'none';
//   roadMeasureMode = isRoad;
//   if (!isRoad) {
//     clearRoadMeasure();
//     document.getElementById('critical-hint').classList.add('hidden');
//   } else {
//     toast('Road Block selected — click two points on the map to measure blockage', 'info', 4000);
//   }
// });

// document.getElementById('authority-assigned').addEventListener('change', (e) => {
//   document.getElementById('authority-name').disabled = e.target.value !== 'true';
// });

// // Blockage range manual input → show critical hint
// document.getElementById('blockage-range-input') && document.getElementById('blockage-range-input').addEventListener('input', (e) => {
//   const v = parseFloat(e.target.value);
//   document.getElementById('critical-hint').classList.toggle('hidden', !(v >= 10));
// });

// // File upload preview
// document.getElementById('photo').addEventListener('change', (e) => {
//   const f = e.target.files[0];
//   document.getElementById('file-name-display').textContent = f ? `📎 ${f.name}` : '';
// });

// // ── Image compression ───────────────────────────
// async function compressImage(file, maxWidth = 1280, quality = 0.72) {
//   const bitmap = await createImageBitmap(file);
//   const scale = Math.min(1, maxWidth / bitmap.width);
//   const canvas = document.createElement('canvas');
//   canvas.width = Math.round(bitmap.width * scale);
//   canvas.height = Math.round(bitmap.height * scale);
//   canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
//   const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
//   return new File([blob], `incident-${Date.now()}.jpg`, { type: 'image/jpeg' });
// }

// // ── Report form submit ──────────────────────────
// document.getElementById('report-form').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const form = e.target;
//   const fd = new FormData();
//   let coords = selectedCoords;

//   if (!coords) {
//     try {
//       const pos = await geolocate();
//       coords = { lat: pos.lat, lng: pos.lng };
//     } catch {
//       toast('Select a location on the map or enable GPS', 'error');
//       return;
//     }
//   }

//   fd.append('latitude', coords.lat);
//   fd.append('longitude', coords.lng);
//   fd.append('type', form.type.value);
//   fd.append('severity', form.severity.value);
//   fd.append('description', form.description.value);
//   fd.append('blockage_range_m', form.blockage_range_m ? form.blockage_range_m.value || '' : '');
//   fd.append('authority_assigned', form.authority_assigned.value);
//   fd.append('authority_name', form.authority_name.value || '');
//   fd.append('estimated_resolution_minutes', form.estimated_resolution_minutes ? form.estimated_resolution_minutes.value || '' : '');
//   fd.append('casualties', form.casualties.value || '0');

//   const fileInput = document.getElementById('photo');
//   if (fileInput.files[0]) {
//     const compressed = await compressImage(fileInput.files[0]);
//     fd.append('photo', compressed);
//   }

//   const submitBtn = form.querySelector('.submit-btn');
//   submitBtn.textContent = '⏳ Submitting…';
//   submitBtn.disabled = true;

//   const res = await fetch('/api/report', { method: 'POST', body: fd });
//   submitBtn.textContent = '🚨 Submit Incident Report';
//   submitBtn.disabled = false;

//   if (!res.ok) { toast('Failed to submit report', 'error'); return; }

//   // Reset form
//   form.reset();
//   selectedCoords = null;
//   document.getElementById('coords-label').textContent = 'Getting your location...';
//   document.getElementById('road-range-wrap').style.display = 'none';
//   document.getElementById('authority-name').disabled = true;
//   document.getElementById('critical-hint').classList.add('hidden');
//   document.getElementById('file-name-display').textContent = '';
//   if (pickerMarker) { pickerMap.removeLayer(pickerMarker); pickerMarker = null; }
//   clearRoadMeasure();
//   roadMeasureMode = false;
//   autoGeolocateReport();

//   await loadIncidents();
//   toast('Incident reported successfully!', 'success');
//   showView('map');
// });

// // ── Dashboard ─────────────���─────────────────────
// async function updateStatus(id, mode) {
//   const res = await fetch(`/api/incidents/${id}/${mode}`, { method: 'PATCH' });
//   if (!res.ok) { toast('Failed to update status', 'error'); return; }
//   const label = mode === 'resolve' ? 'Resolved' : 'Under Response';
//   toast(`Incident marked as ${label}`, 'success');
//   await loadDashboard();
//   await loadIncidents();
// }

// async function loadDashboard() {
//   const data = await (await fetch('/api/dashboard')).json();
//   document.getElementById('total-count').textContent = data.total;
//   document.getElementById('critical-count').textContent = data.critical;
//   document.getElementById('avg-response').textContent = data.average_response_time || '—';

//   const list = document.getElementById('incident-list');
//   list.innerHTML = '';

//   // Show only non-resolved in dashboard
//   const active = data.incidents.filter((i) => i.status !== 'Resolved');
//   const countEl = document.getElementById('dash-count');
//   countEl.textContent = `${active.length} active incident${active.length !== 1 ? 's' : ''}`;

//   if (!active.length) {
//     list.innerHTML = `<div class="empty"><div class="empty-icon">🟢</div><p>No active incidents</p><small>All clear — or use the Report tab to log a new one</small></div>`;
//     return;
//   }

//   active.forEach((i) => {
//     const row = document.createElement('div');
//     row.className = 'incident-row';
//     row.innerHTML = `
//       <div class="ir-left">
//         <div class="ir-title">
//           ${i.type}
//           <span class="badge ${badgeClass(i.severity)}">${i.severity}</span>
//           ${statusBadge(i.status)}
//           ${i.verified ? '<span class="badge blue-badge">Verified</span>' : ''}
//         </div>
//         <div class="ir-meta">
//           <span>🕐 ${new Date(i.timestamp).toLocaleString()}</span>
//           <span>⏱ ETA: ${i.estimated_response_time}</span>
//           <span>👍 ${i.votes} votes</span>
//           ${i.blockage_range_m ? `<span>🚧 ${i.blockage_range_m}m blocked</span>` : ''}
//           ${i.casualties ? `<span>🩹 ${i.casualties} casualties</span>` : ''}
//         </div>
//       </div>
//       <div class="button-row">
//         <button class="warning" data-id="${i.id}" data-mode="under-response">Responding</button>
//         <button class="success" data-id="${i.id}" data-mode="resolve">Resolve</button>
//         <button class="muted" data-id="${i.id}" data-action="view">View</button>
//       </div>
//     `;
//     row.querySelectorAll('button[data-mode]').forEach((b) => {
//       b.addEventListener('click', () => updateStatus(b.dataset.id, b.dataset.mode));
//     });
//     const viewBtn = row.querySelector('button[data-action="view"]');
//     if (viewBtn) viewBtn.addEventListener('click', () => openModal(i));
//     list.appendChild(row);
//   });
// }

// // ── History ─────────────────────────────────────
// async function loadHistory() {
//   const records = await (await fetch('/api/history')).json();
//   const list = document.getElementById('history-list');
//   const resolved = records.filter((i) => i.status === 'Resolved');

//   if (!resolved.length) {
//     list.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><p>No resolved incidents yet</p><small>Resolved incidents will appear here</small></div>`;
//     return;
//   }

//   list.innerHTML = '';
//   resolved.forEach((i) => {
//     const row = document.createElement('div');
//     row.className = 'history-row';
//     row.innerHTML = `
//       <div class="ir-left">
//         <div class="ir-title">
//           ${i.type}
//           <span class="badge ${badgeClass(i.severity)}">${i.severity}</span>
//           <span class="status-resolved">Resolved</span>
//         </div>
//         <div class="ir-meta">
//           <span>📅 Reported: ${new Date(i.timestamp).toLocaleString()}</span>
//           ${i.resolved_at ? `<span>Resolved: ${new Date(i.resolved_at).toLocaleString()}</span>` : ''}
//         </div>
//       </div>
//       <button class="muted" data-id="${i.id}">View</button>
//     `;
//     row.querySelector('button').addEventListener('click', () => openModal(i));
//     list.appendChild(row);
//   });
// }

// // ── Map Filters ─────────────────────────────────
// document.getElementById('toggle-filters-btn').addEventListener('click', () => {
//   const panel = document.getElementById('filters-panel');
//   panel.classList.toggle('hidden');
// });

// document.getElementById('close-filters-btn').addEventListener('click', () => {
//   document.getElementById('filters-panel').classList.add('hidden');
// });

// document.getElementById('apply-filters').addEventListener('click', async () => {
//   await loadIncidents();
//   document.getElementById('filters-panel').classList.add('hidden');
//   toast('Filters applied', 'success');
// });

// document.getElementById('reset-filters').addEventListener('click', async () => {
//   ['filter-severity','filter-status','filter-type','filter-verified'].forEach((id) => {
//     document.getElementById(id).value = '';
//   });
//   await loadIncidents();
//   toast('Filters reset', 'info');
// });

// document.getElementById('basemap-select').addEventListener('change', (e) => {
//   [streetLayer, satelliteLayer, terrainLayer].forEach((l) => l && map.removeLayer(l));
//   if (e.target.value === 'satellite') satelliteLayer.addTo(map);
//   else if (e.target.value === 'terrain') terrainLayer.addTo(map);
//   else streetLayer.addTo(map);
// });

// // ── Profile & Logout ────────────────────────────
// document.getElementById('profile-btn').addEventListener('click', () => profileModal.classList.remove('hidden'));
// document.getElementById('close-profile').addEventListener('click', () => profileModal.classList.add('hidden'));
// profileModal.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.add('hidden'); });

// document.getElementById('logout-btn').addEventListener('click', async () => {
//   localStorage.clear();
//   sessionStorage.clear();
//   if ('caches' in window) {
//     const keys = await caches.keys();
//     await Promise.all(keys.map((k) => caches.delete(k)));
//   }
//   toast('Logged out — cache cleared', 'info');
//   setTimeout(() => location.reload(), 1200);
// });

// // ── Init ────────────────────────────────────────
// initMap();
// loadIncidents();







// ── State ──────────────────────────────────────
const views = {
  map: document.getElementById('map-view'),
  report: document.getElementById('report-view'),
  dashboard: document.getElementById('dashboard-view'),
  history: document.getElementById('history-view')
};
const navBtns = document.querySelectorAll('.nav-btn[data-view]');
const modal = document.getElementById('incident-modal');
const modalBody = document.getElementById('modal-body');
const modalTitle = document.getElementById('modal-title');
const profileModal = document.getElementById('profile-modal');

let map, pickerMap, pickerMarker, selectedCoords, markersLayer;
let streetLayer, satelliteLayer, terrainLayer;
let currentIncidents = [];

// Road blockage two-point measurement
let roadMeasureMode = false;
let roadPointA = null;
let roadPointB = null;
let roadMarkerA = null;
let roadMarkerB = null;
let roadLine = null;

// ── Toast ───────────────────────────────────────
function toast(msg, type = 'info', duration = 3000) {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
  tc.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideIn 0.25s ease reverse';
    setTimeout(() => t.remove(), 240);
  }, duration);
}

// ── Color helpers ───────────────────────────────
function colorBySeverity(s) {
  return s === 'Critical' ? '#dc2626' : s === 'Medium' ? '#d97706' : '#16a34a';
}
function badgeClass(s) {
  return s === 'Critical' ? 'red' : s === 'Medium' ? 'yellow' : 'green';
}
function statusBadge(status) {
  if (status === 'Resolved') return '<span class="status-resolved">Resolved</span>';
  if (status === 'Under Response') return '<span class="status-under">Under Response</span>';
  return '<span class="status-active">Active</span>';
}

// ── View switching ──────────────────────────────
function showView(name) {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle('active', k === name));
  navBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'dashboard') loadDashboard();
  if (name === 'history') loadHistory();
  if (name === 'map') setTimeout(() => map && map.invalidateSize(), 80);
  if (name === 'report') {
    setTimeout(() => pickerMap && pickerMap.invalidateSize(), 80);
    autoGeolocateReport();
  }
}
navBtns.forEach((btn) => btn.addEventListener('click', () => showView(btn.dataset.view)));

// ── Map init ────────────────────────────────────
function makeIcon(color) {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3),0 0 0 3px rgba(0,0,0,0.07)"></div>`,
    iconSize: [18, 18]
  });
}

function makePickerIcon(color, letter) {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;font-family:Inter,sans-serif">${letter}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function clearRoadMeasure() {
  if (roadMarkerA) { pickerMap.removeLayer(roadMarkerA); roadMarkerA = null; }
  if (roadMarkerB) { pickerMap.removeLayer(roadMarkerB); roadMarkerB = null; }
  if (roadLine) { pickerMap.removeLayer(roadLine); roadLine = null; }
  roadPointA = null;
  roadPointB = null;
  updateMeasureSteps();
}

function updateMeasureSteps() {
  const stepA = document.getElementById('step-a');
  const stepB = document.getElementById('step-b');
  if (!stepA) return;
  if (roadPointA) {
    stepA.textContent = `A: ${roadPointA.lat.toFixed(4)}, ${roadPointA.lng.toFixed(4)}`;
    stepA.className = 'step-badge done';
  } else {
    stepA.textContent = 'A: Not set';
    stepA.className = 'step-badge pending';
  }
  if (roadPointB) {
    stepB.textContent = `B: ${roadPointB.lat.toFixed(4)}, ${roadPointB.lng.toFixed(4)}`;
    stepB.className = 'step-badge done';
  } else {
    stepB.textContent = 'B: Not set';
    stepB.className = 'step-badge' + (roadPointA ? ' step-badge' : ' step-badge pending');
    if (roadPointA) stepB.className = 'step-badge';
    else stepB.className = 'step-badge pending';
  }
}

// Auto-geolocate on report form load
async function autoGeolocateReport() {
  try {
    const coords = await geolocate();
    selectedCoords = { lat: coords.lat, lng: coords.lng };
    pickerMap.setView([coords.lat, coords.lng], 15);
    if (pickerMarker) pickerMap.removeLayer(pickerMarker);
    pickerMarker = L.marker([coords.lat, coords.lng], { icon: makePickerIcon('#2563eb', '📍') }).addTo(pickerMap);
    document.getElementById('coords-label').textContent = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
  } catch (err) {
    document.getElementById('coords-label').textContent = 'Click map to select location';
  }
}

function initMap() {
  // Main map
  map = L.map('map', { zoomControl: false }).setView([14.5995, 120.9842], 12);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
  satelliteLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenTopoMap' });
  terrainLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap HOT' });
  streetLayer.addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  // Picker map
  pickerMap = L.map('picker-map').setView([14.5995, 120.9842], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(pickerMap);

  pickerMap.on('click', (e) => {
    const { lat, lng } = e.latlng;

    if (roadMeasureMode) {
      // Two-point road blockage measurement mode
      if (!roadPointA) {
        // Set point A
        roadPointA = e.latlng;
        if (roadMarkerA) pickerMap.removeLayer(roadMarkerA);
        roadMarkerA = L.marker([lat, lng], { icon: makePickerIcon('#16a34a', 'A') }).addTo(pickerMap);
        roadMarkerA.bindTooltip('Point A (Start)').openTooltip();
        updateMeasureSteps();
        toast('Point A set — now click Point B on the road', 'info');
      } else if (!roadPointB) {
        // Set point B
        roadPointB = e.latlng;
        if (roadMarkerB) pickerMap.removeLayer(roadMarkerB);
        roadMarkerB = L.marker([lat, lng], { icon: makePickerIcon('#dc2626', 'B') }).addTo(pickerMap);
        roadMarkerB.bindTooltip('Point B (End)').openTooltip();

        // Draw line between A and B
        if (roadLine) pickerMap.removeLayer(roadLine);
        roadLine = L.polyline([roadPointA, roadPointB], { color: '#f97316', weight: 4, dashArray: '6 4', opacity: 0.85 }).addTo(pickerMap);

        // Calculate distance
        const dist = haversineMeters(roadPointA.lat, roadPointA.lng, roadPointB.lat, roadPointB.lng);
        const distRounded = Math.round(dist * 10) / 10;
        document.getElementById('blockage-range-input').value = distRounded;

        // Show critical hint if >= 10m
        document.getElementById('critical-hint').classList.toggle('hidden', distRounded < 10);

        updateMeasureSteps();
        toast(`Blockage measured: ${distRounded}m${distRounded >= 10 ? ' — auto-escalated to Critical!' : ''}`, distRounded >= 10 ? 'error' : 'success');

        // Fit the line in view
        pickerMap.fitBounds(roadLine.getBounds().pad(0.2));
      } else {
        // Both points already set — reset and start over
        clearRoadMeasure();
        roadPointA = e.latlng;
        roadMarkerA = L.marker([lat, lng], { icon: makePickerIcon('#16a34a', 'A') }).addTo(pickerMap);
        updateMeasureSteps();
        toast('Measurement reset — Point A set. Click Point B.', 'info');
      }
      // Also update the incident location to point A if not yet selected
      if (!selectedCoords) {
        selectedCoords = e.latlng;
        if (pickerMarker) { pickerMap.removeLayer(pickerMarker); pickerMarker = null; }
        document.getElementById('coords-label').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    } else {
      // Normal location picker
      selectedCoords = e.latlng;
      if (pickerMarker) pickerMarker.setLatLng(e.latlng);
      else pickerMarker = L.marker(e.latlng, { icon: makePickerIcon('#2563eb', '📍') }).addTo(pickerMap);
      document.getElementById('coords-label').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  });
}

// ── Incident modal ──────────────────────────────
function openModal(incident) {
  modalTitle.textContent = incident.type;
  modalBody.innerHTML = `
    ${incident.photo_url ? `<img src="${incident.photo_url}" alt="Incident photo">` : ''}
    <div class="info-grid">
      <div class="info-item">
        <div class="ii-label">Severity</div>
        <div class="ii-val"><span class="badge ${badgeClass(incident.severity)}">${incident.severity}</span></div>
      </div>
      <div class="info-item">
        <div class="ii-label">Status</div>
        <div class="ii-val">${statusBadge(incident.status)}</div>
      </div>
      <div class="info-item">
        <div class="ii-label">Reported</div>
        <div class="ii-val">${new Date(incident.timestamp).toLocaleString()}</div>
      </div>
      <div class="info-item">
        <div class="ii-label">Est. Response</div>
        <div class="ii-val">⏱ ${incident.estimated_response_time}</div>
      </div>
      <div class="info-item">
        <div class="ii-label">Road Blockage</div>
        <div class="ii-val">${incident.blockage_range_m ? `🚧 ${incident.blockage_range_m}m` : '—'}</div>
      </div>
      <div class="info-item">
        <div class="ii-label">Casualties</div>
        <div class="ii-val">${incident.casualties > 0 ? `🩹 ${incident.casualties}` : '0'}</div>
      </div>
      <div class="info-item">
        <div class="ii-label">Authority</div>
        <div class="ii-val">${incident.authority_assigned ? `${incident.authority_name || 'Assigned'}` : 'Not assigned'}</div>
      </div>
      <div class="info-item">
        <div class="ii-label">Verified</div>
        <div class="ii-val">${incident.verified ? 'Verified' : 'Unverified'}</div>
      </div>
      <div class="info-item full">
        <div class="ii-label">Description</div>
        <div class="ii-val" style="font-weight:500;white-space:pre-wrap">${incident.description}</div>
      </div>
    </div>
    <div class="vote-wrap">
      <button class="vote-up" data-vote="1" data-id="${incident.id}">👍 Upvote (${incident.votes >= 0 ? '+' : ''}${incident.votes})</button>
      <button class="vote-down" data-vote="-1" data-id="${incident.id}">👎 Downvote</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modalBody.querySelectorAll('button[data-vote]').forEach((b) => b.addEventListener('click', voteIncident));
}

document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { modal.classList.add('hidden'); profileModal.classList.add('hidden'); }
});

async function voteIncident(e) {
  const id = Number(e.target.dataset.id);
  const delta = Number(e.target.dataset.vote);
  const res = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, delta })
  });
  if (res.ok) {
    modal.classList.add('hidden');
    await loadIncidents();
    toast('Vote recorded!', 'success');
  }
}

// ── Load incidents (map) ────────────────────────
function incidentsQuery() {
  const p = new URLSearchParams();
  const severity = document.getElementById('filter-severity').value;
  const status = document.getElementById('filter-status').value;
  const type = document.getElementById('filter-type').value;
  const verified = document.getElementById('filter-verified').value;
  if (severity) p.set('severity', severity);
  if (status) p.set('status', status);
  if (type) p.set('type', type);
  if (verified) p.set('verified', verified);
  return p.toString();
}

async function loadIncidents() {
  const query = incidentsQuery();
  const url = query ? `/api/incidents?${query}` : '/api/incidents';
  const allIncidents = await (await fetch(url)).json();
  
  // FILTER OUT RESOLVED INCIDENTS FROM MAP
  currentIncidents = allIncidents.filter(i => i.status !== 'Resolved');
  
  markersLayer.clearLayers();
  currentIncidents.forEach((i) => {
    const marker = L.marker([i.latitude, i.longitude], { icon: makeIcon(colorBySeverity(i.severity)) });
    marker.bindTooltip(`<b>${i.type}</b> • ${i.severity}<br>${statusBadge(i.status)}`, { direction: 'top' });
    marker.on('click', () => openModal(i));
    markersLayer.addLayer(marker);

    // Draw blockage circle for Road Blocks with range
    if (i.type === 'Road Block' && i.blockage_range_m && i.status !== 'Resolved') {
      L.circle([i.latitude, i.longitude], {
        radius: i.blockage_range_m / 2,
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '5 4'
      }).addTo(markersLayer);
    }
  });
}

function fitAllPins() {
  if (!currentIncidents.length) return;
  const bounds = L.latLngBounds(currentIncidents.map((i) => [i.latitude, i.longitude]));
  map.fitBounds(bounds.pad(0.15));
}

// ── Geolocate ───────────────────────────────────
async function geolocate() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject, { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

document.getElementById('locate-btn').addEventListener('click', async () => {
  try {
    const coords = await geolocate();
    map.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
  } catch { toast('Unable to get location', 'error'); }
});

document.getElementById('search-btn').addEventListener('click', async () => {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (data.length) map.flyTo([Number(data[0].lat), Number(data[0].lon)], 14, { duration: 1.2 });
  else toast('Location not found', 'error');
});

document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('search-btn').click();
});

// ── Incident type change ────────────────────────
document.getElementById('incident-type').addEventListener('change', (e) => {
  const isRoad = e.target.value === 'Road Block';
  const wrap = document.getElementById('road-range-wrap');
  wrap.style.display = isRoad ? 'flex' : 'none';
  roadMeasureMode = isRoad;
  if (!isRoad) {
    clearRoadMeasure();
    document.getElementById('critical-hint').classList.add('hidden');
  } else {
    toast('Road Block selected — click two points on the map to measure blockage', 'info', 4000);
  }
});

document.getElementById('authority-assigned').addEventListener('change', (e) => {
  document.getElementById('authority-name').disabled = e.target.value !== 'true';
});

// Blockage range manual input → show critical hint
document.getElementById('blockage-range-input') && document.getElementById('blockage-range-input').addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  document.getElementById('critical-hint').classList.toggle('hidden', !(v >= 10));
});

// File upload preview
document.getElementById('photo').addEventListener('change', (e) => {
  const f = e.target.files[0];
  document.getElementById('file-name-display').textContent = f ? `📎 ${f.name}` : '';
});

// ── Image compression ───────────────────────────
async function compressImage(file, maxWidth = 1280, quality = 0.72) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  return new File([blob], `incident-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

// ── Report form submit ──────────────────────────
document.getElementById('report-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData();
  let coords = selectedCoords;

  if (!coords) {
    try {
      const pos = await geolocate();
      coords = { lat: pos.lat, lng: pos.lng };
    } catch {
      toast('Select a location on the map or enable GPS', 'error');
      return;
    }
  }

  fd.append('latitude', coords.lat);
  fd.append('longitude', coords.lng);
  fd.append('type', form.type.value);
  fd.append('severity', form.severity.value);
  fd.append('description', form.description.value);
  fd.append('blockage_range_m', form.blockage_range_m ? form.blockage_range_m.value || '' : '');
  fd.append('authority_assigned', form.authority_assigned.value);
  fd.append('authority_name', form.authority_name.value || '');
  fd.append('estimated_resolution_minutes', form.estimated_resolution_minutes ? form.estimated_resolution_minutes.value || '' : '');
  fd.append('casualties', form.casualties.value || '0');

  const fileInput = document.getElementById('photo');
  if (fileInput.files[0]) {
    const compressed = await compressImage(fileInput.files[0]);
    fd.append('photo', compressed);
  }

  const submitBtn = form.querySelector('.submit-btn');
  submitBtn.textContent = '⏳ Submitting…';
  submitBtn.disabled = true;

  const res = await fetch('/api/report', { method: 'POST', body: fd });
  submitBtn.textContent = '🚨 Submit Incident Report';
  submitBtn.disabled = false;

  if (!res.ok) { toast('Failed to submit report', 'error'); return; }

  // Reset form
  form.reset();
  selectedCoords = null;
  document.getElementById('coords-label').textContent = 'Getting your location...';
  document.getElementById('road-range-wrap').style.display = 'none';
  document.getElementById('authority-name').disabled = true;
  document.getElementById('critical-hint').classList.add('hidden');
  document.getElementById('file-name-display').textContent = '';
  if (pickerMarker) { pickerMap.removeLayer(pickerMarker); pickerMarker = null; }
  clearRoadMeasure();
  roadMeasureMode = false;
  autoGeolocateReport();

  await loadIncidents();
  toast('Incident reported successfully!', 'success');
  showView('map');
});

// ── Dashboard ───────────────────────────────────
async function updateStatus(id, mode) {
  const res = await fetch(`/api/incidents/${id}/${mode}`, { method: 'PATCH' });
  if (!res.ok) { toast('Failed to update status', 'error'); return; }
  const label = mode === 'resolve' ? 'Resolved' : 'Under Response';
  toast(`Incident marked as ${label}`, 'success');
  await loadDashboard();
  await loadIncidents(); // RELOAD MAP TO REMOVE RESOLVED INCIDENTS
}

async function loadDashboard() {
  const data = await (await fetch('/api/dashboard')).json();
  document.getElementById('total-count').textContent = data.total;
  document.getElementById('critical-count').textContent = data.critical;
  document.getElementById('avg-response').textContent = data.average_response_time || '—';

  const list = document.getElementById('incident-list');
  list.innerHTML = '';

  // Show only non-resolved in dashboard
  const active = data.incidents.filter((i) => i.status !== 'Resolved');
  const countEl = document.getElementById('dash-count');
  countEl.textContent = `${active.length} active incident${active.length !== 1 ? 's' : ''}`;

  if (!active.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🟢</div><p>No active incidents</p><small>All clear — or use the Report tab to log a new one</small></div>`;
    return;
  }

  active.forEach((i) => {
    const row = document.createElement('div');
    row.className = 'incident-row';
    row.innerHTML = `
      <div class="ir-left">
        <div class="ir-title">
          ${i.type}
          <span class="badge ${badgeClass(i.severity)}">${i.severity}</span>
          ${statusBadge(i.status)}
          ${i.verified ? '<span class="badge blue-badge">Verified</span>' : ''}
        </div>
        <div class="ir-meta">
          <span>🕐 ${new Date(i.timestamp).toLocaleString()}</span>
          <span>⏱ ETA: ${i.estimated_response_time}</span>
          <span>👍 ${i.votes} votes</span>
          ${i.blockage_range_m ? `<span>🚧 ${i.blockage_range_m}m blocked</span>` : ''}
          ${i.casualties ? `<span>🩹 ${i.casualties} casualties</span>` : ''}
        </div>
      </div>
      <div class="button-row">
        <button class="warning" data-id="${i.id}" data-mode="under-response">Responding</button>
        <button class="success" data-id="${i.id}" data-mode="resolve">Resolve</button>
        <button class="muted" data-id="${i.id}" data-action="view">View</button>
      </div>
    `;
    row.querySelectorAll('button[data-mode]').forEach((b) => {
      b.addEventListener('click', () => updateStatus(b.dataset.id, b.dataset.mode));
    });
    const viewBtn = row.querySelector('button[data-action="view"]');
    if (viewBtn) viewBtn.addEventListener('click', () => openModal(i));
    list.appendChild(row);
  });
}

// ── History ─────────────────────────────────────
async function loadHistory() {
  const records = await (await fetch('/api/history')).json();
  const list = document.getElementById('history-list');
  const resolved = records.filter((i) => i.status === 'Resolved');

  if (!resolved.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><p>No resolved incidents yet</p><small>Resolved incidents will appear here</small></div>`;
    return;
  }

  list.innerHTML = '';
  resolved.forEach((i) => {
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <div class="ir-left">
        <div class="ir-title">
          ${i.type}
          <span class="badge ${badgeClass(i.severity)}">${i.severity}</span>
          <span class="status-resolved">Resolved</span>
        </div>
        <div class="ir-meta">
          <span>📅 Reported: ${new Date(i.timestamp).toLocaleString()}</span>
          ${i.resolved_at ? `<span>Resolved: ${new Date(i.resolved_at).toLocaleString()}</span>` : ''}
        </div>
      </div>
      <button class="muted" data-id="${i.id}">View</button>
    `;
    row.querySelector('button').addEventListener('click', () => openModal(i));
    list.appendChild(row);
  });
}

// ── Map Filters ─────────────────────────────────
document.getElementById('toggle-filters-btn').addEventListener('click', () => {
  const panel = document.getElementById('filters-panel');
  panel.classList.toggle('hidden');
});

document.getElementById('close-filters-btn').addEventListener('click', () => {
  document.getElementById('filters-panel').classList.add('hidden');
});

document.getElementById('apply-filters').addEventListener('click', async () => {
  await loadIncidents();
  document.getElementById('filters-panel').classList.add('hidden');
  toast('Filters applied', 'success');
});

document.getElementById('reset-filters').addEventListener('click', async () => {
  ['filter-severity','filter-status','filter-type','filter-verified'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  await loadIncidents();
  toast('Filters reset', 'info');
});

document.getElementById('basemap-select').addEventListener('change', (e) => {
  [streetLayer, satelliteLayer, terrainLayer].forEach((l) => l && map.removeLayer(l));
  if (e.target.value === 'satellite') satelliteLayer.addTo(map);
  else if (e.target.value === 'terrain') terrainLayer.addTo(map);
  else streetLayer.addTo(map);
});

// ── Profile & Logout ────────────────────────────
document.getElementById('profile-btn').addEventListener('click', () => profileModal.classList.remove('hidden'));
document.getElementById('close-profile').addEventListener('click', () => profileModal.classList.add('hidden'));
profileModal.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.add('hidden'); });

document.getElementById('logout-btn').addEventListener('click', async () => {
  localStorage.clear();
  sessionStorage.clear();
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  toast('Logged out — cache cleared', 'info');
  setTimeout(() => location.reload(), 1200);
});

// ── Init ────────────────────────────────────────
initMap();
loadIncidents();