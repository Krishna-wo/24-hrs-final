const views = {
  map: document.getElementById('map-view'),
  report: document.getElementById('report-view'),
  dashboard: document.getElementById('dashboard-view'),
  controls: document.getElementById('controls-view'),
  history: document.getElementById('history-view')
};
const navBtns = document.querySelectorAll('.nav-btn');
const modal = document.getElementById('incident-modal');
const modalContent = document.getElementById('modal-content');
const profileModal = document.getElementById('profile-modal');

let map;
let pickerMap;
let pickerMarker;
let selectedCoords = null;
let markersLayer;
let currentIncidents = [];
let streetLayer;
let satelliteLayer;
let terrainLayer;

function colorBySeverity(severity) {
  if (severity === 'Critical') return '#dc2626';
  if (severity === 'Medium') return '#ca8a04';
  return '#16a34a';
}

function badgeClass(severity) {
  if (severity === 'Critical') return 'red';
  if (severity === 'Medium') return 'yellow';
  return 'green';
}

function showView(name) {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle('active', k === name));
  navBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'dashboard') loadDashboard();
  if (name === 'history') loadHistory();
  if (name === 'map') setTimeout(() => map.invalidateSize(), 80);
  if (name === 'report') setTimeout(() => pickerMap.invalidateSize(), 80);
}

navBtns.forEach((btn) => btn.addEventListener('click', () => showView(btn.dataset.view)));

function makeIcon(color) {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px rgba(15,23,42,.18)"></div>`,
    iconSize: [18, 18]
  });
}

function openModal(incident) {
  modalContent.innerHTML = `
    <h3>${incident.type}</h3>
    <p><strong>Severity:</strong> ${incident.severity}</p>
    <p><strong>Description:</strong> ${incident.description}</p>
    <p><strong>Timestamp:</strong> ${new Date(incident.timestamp).toLocaleString()}</p>
    <p><strong>Status:</strong> ${incident.status}${incident.verified ? ' / VERIFIED' : ''}</p>
    <p><strong>Estimated response:</strong> ${incident.estimated_response_time}</p>
    <p><strong>Road blockage range:</strong> ${incident.blockage_range_m ? `${incident.blockage_range_m}m` : 'N/A'}</p>
    <p><strong>Authority assigned:</strong> ${incident.authority_assigned ? 'Yes' : 'No'} ${incident.authority_name ? `(${incident.authority_name})` : ''}</p>
    <p><strong>Casualties:</strong> ${incident.casualties || 0}</p>
    <p><strong>Votes:</strong> <span>${incident.votes}</span></p>
    <div class="vote-wrap">
      <button data-vote="1" data-id="${incident.id}">Upvote</button>
      <button data-vote="-1" data-id="${incident.id}">Downvote</button>
    </div>
    ${incident.photo_url ? `<img src="${incident.photo_url}" alt="Incident image">` : ''}
  `;
  modal.classList.remove('hidden');
  modalContent.querySelectorAll('button[data-vote]').forEach((b) => b.addEventListener('click', voteIncident));
}

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    modal.classList.add('hidden');
    profileModal.classList.add('hidden');
  }
});

async function voteIncident(e) {
  const id = Number(e.target.dataset.id);
  const delta = Number(e.target.dataset.vote);
  await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, delta })
  });
  modal.classList.add('hidden');
  await loadIncidents();
}

function incidentsQuery() {
  const p = new URLSearchParams();
  const severity = document.getElementById('filter-severity').value;
  const status = document.getElementById('filter-status').value;
  const type = document.getElementById('filter-type').value;
  const verified = document.getElementById('filter-verified').value;
  const minVotes = document.getElementById('filter-min-votes').value;
  const dateFrom = document.getElementById('filter-date-from').value;
  const dateTo = document.getElementById('filter-date-to').value;
  if (severity) p.set('severity', severity);
  if (status) p.set('status', status);
  if (type) p.set('type', type);
  if (verified) p.set('verified', verified);
  if (minVotes) p.set('min_votes', minVotes);
  if (dateFrom) p.set('date_from', new Date(dateFrom).toISOString());
  if (dateTo) p.set('date_to', new Date(dateTo).toISOString());
  return p.toString();
}

async function loadIncidents() {
  const query = incidentsQuery();
  const url = query ? `/api/incidents?${query}` : '/api/incidents';
  currentIncidents = await (await fetch(url)).json();
  const keyword = document.getElementById('filter-keyword').value.trim().toLowerCase();
  if (keyword) {
    currentIncidents = currentIncidents.filter((i) => (i.description || '').toLowerCase().includes(keyword));
  }
  markersLayer.clearLayers();

  currentIncidents.forEach((i) => {
    const marker = L.marker([i.latitude, i.longitude], { icon: makeIcon(colorBySeverity(i.severity)) });
    marker.bindTooltip(`${i.type} • ${i.severity}`);
    marker.on('click', () => openModal(i));
    markersLayer.addLayer(marker);
  });
}

function fitAllPins() {
  if (!currentIncidents.length) return;
  const bounds = L.latLngBounds(currentIncidents.map((i) => [i.latitude, i.longitude]));
  map.fitBounds(bounds.pad(0.15));
}

function initMap() {
  map = L.map('map', { zoomControl: false }).setView([14.5995, 120.9842], 12);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
  satelliteLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '&copy; OpenTopoMap' });
  terrainLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap HOT' });
  streetLayer.addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  pickerMap = L.map('picker-map').setView([14.5995, 120.9842], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(pickerMap);

  pickerMap.on('click', (e) => {
    selectedCoords = e.latlng;
    if (pickerMarker) pickerMarker.setLatLng(e.latlng);
    else pickerMarker = L.marker(e.latlng).addTo(pickerMap);
    document.getElementById('coords-label').textContent = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
  });
}

async function compressImage(file, maxWidth = 1280, quality = 0.72) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return new File([blob], `incident-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

async function geolocate() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true }
    );
  });
}

document.getElementById('locate-btn').addEventListener('click', async () => {
  try {
    const coords = await geolocate();
    map.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
  } catch {
    alert('Unable to get location');
  }
});

document.getElementById('search-btn').addEventListener('click', async () => {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (data.length) map.flyTo([Number(data[0].lat), Number(data[0].lon)], 14, { duration: 1.2 });
});

document.getElementById('incident-type').addEventListener('change', (e) => {
  const isRoad = e.target.value === 'Road Block';
  document.getElementById('road-range-wrap').classList.toggle('hidden', !isRoad);
  document.getElementById('critical-hint').classList.toggle('hidden', !isRoad);
});

document.getElementById('authority-assigned').addEventListener('change', (e) => {
  document.getElementById('authority-name').disabled = e.target.value !== 'true';
});

document.getElementById('report-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData();
  let coords = selectedCoords;

  if (!coords) {
    try {
      coords = await geolocate();
      coords = { lat: coords.lat, lng: coords.lng };
    } catch {
      alert('Select location on map or enable GPS');
      return;
    }
  }

  fd.append('latitude', coords.lat);
  fd.append('longitude', coords.lng);
  fd.append('type', form.type.value);
  fd.append('severity', form.severity.value);
  fd.append('description', form.description.value);
  fd.append('blockage_range_m', form.blockage_range_m.value || '');
  fd.append('authority_assigned', form.authority_assigned.value);
  fd.append('authority_name', form.authority_name.value || '');
  fd.append('estimated_resolution_minutes', form.estimated_resolution_minutes.value || '');
  fd.append('casualties', form.casualties.value || '0');

  const fileInput = document.getElementById('photo');
  if (fileInput.files[0]) {
    const compressed = await compressImage(fileInput.files[0]);
    fd.append('photo', compressed);
  }

  const res = await fetch('/api/report', { method: 'POST', body: fd });
  if (!res.ok) return alert('Failed to submit report');

  form.reset();
  selectedCoords = null;
  document.getElementById('coords-label').textContent = 'No location selected';
  document.getElementById('road-range-wrap').classList.add('hidden');
  document.getElementById('authority-name').disabled = true;
  if (pickerMarker) {
    pickerMap.removeLayer(pickerMarker);
    pickerMarker = null;
  }

  await loadIncidents();
  showView('map');
});

async function updateStatus(id, mode) {
  await fetch(`/api/incidents/${id}/${mode}`, { method: 'PATCH' });
  await loadDashboard();
  await loadIncidents();
}

async function loadDashboard() {
  const data = await (await fetch('/api/dashboard')).json();
  document.getElementById('total-count').textContent = data.total;
  document.getElementById('critical-count').textContent = data.critical;
  document.getElementById('avg-response').textContent = data.average_response_time;
  const list = document.getElementById('incident-list');
  list.innerHTML = '';

  data.incidents.forEach((i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div class="meta">
        <strong>${i.type}</strong>
        <span class="badge ${badgeClass(i.severity)}">${i.severity}</span>
        <small>${new Date(i.timestamp).toLocaleString()} • ${i.status}</small>
        <small>ETA: ${i.estimated_response_time} • Votes: ${i.votes}</small>
      </div>
      <div class="button-row tight">
        <button data-id="${i.id}" data-mode="under-response">Under Response</button>
        <button data-id="${i.id}" data-mode="resolve">Resolved</button>
      </div>
    `;
    row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => updateStatus(b.dataset.id, b.dataset.mode)));
    list.appendChild(row);
  });
}

async function loadHistory() {
  const records = await (await fetch('/api/history')).json();
  const list = document.getElementById('history-list');
  list.innerHTML = records.length ? '' : '<div class="empty">No resolved incidents yet.</div>';

  records.forEach((i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div class="meta">
        <strong>${i.type}</strong>
        <span class="badge ${badgeClass(i.severity)}">${i.severity}</span>
        <small>Resolved at ${new Date(i.resolved_at).toLocaleString()}</small>
      </div>
      <button data-id="${i.id}">View</button>
    `;
    row.querySelector('button').addEventListener('click', () => openModal(i));
    list.appendChild(row);
  });
}

document.getElementById('apply-filters').addEventListener('click', async () => {
  await loadIncidents();
});

document.getElementById('reset-filters').addEventListener('click', async () => {
  ['filter-severity', 'filter-status', 'filter-type', 'filter-verified', 'filter-min-votes', 'filter-date-from', 'filter-date-to', 'filter-keyword'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  await loadIncidents();
});

document.getElementById('center-all').addEventListener('click', () => {
  fitAllPins();
  showView('map');
});

document.getElementById('basemap-select').addEventListener('change', (e) => {
  [streetLayer, satelliteLayer, terrainLayer].forEach((layer) => map.removeLayer(layer));
  if (e.target.value === 'satellite') satelliteLayer.addTo(map);
  else if (e.target.value === 'terrain') terrainLayer.addTo(map);
  else streetLayer.addTo(map);
});

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
  alert('Logged out. Local cache/session cleared.');
  location.reload();
});

initMap();
loadIncidents();