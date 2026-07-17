import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
import '@shoelace-style/shoelace/dist/components/range/range.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="hud">
  </div>
  <sl-drawer id="controlPanel" class="control-panel" label="Solar System" placement="start" contained no-modal open>
    <div slot="label" class="brand"><span class="brand-mark">✦</span><div><strong>SOLAR SYSTEM</strong></div></div>
    <div class="control-row"><label>Simulation time <span id="speedValue">1×</span></label><sl-range id="speed" min="1" max="100" value="1" tooltip="none"></sl-range></div>
    <div class="button-row"><sl-button id="pause" variant="primary" size="large">Ⅱ &nbsp; PAUSE</sl-button><sl-button id="reset" class="secondary" variant="default" size="large">↺</sl-button></div>
    <div class="toggle-row"><span>Orbital paths</span><sl-switch id="orbits" checked aria-label="Toggle orbital paths"></sl-switch></div>
    <sl-divider></sl-divider>
    <div class="legend" id="legend"></div>
    <div class="audio-row"><sl-icon-button id="audioToggle" class="audio-on" label="Turn ambient audio off" aria-pressed="true" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M12 3v12.55A4 4 0 1 0 14 19V8h5V3z'/%3E%3C/svg%3E"></sl-icon-button></div>
  </sl-drawer>
  <sl-dialog id="focusConfirm" no-header aria-label="Confirm focus">
    <span id="focusConfirmText"></span>
    <sl-button slot="footer" id="focusCancel" variant="default">NO</sl-button>
    <sl-button slot="footer" id="focusAccept" variant="primary">YES</sl-button>
  </sl-dialog>
  <div class="coordinates"><span id="simTime">SOL 001 · 00:00:00</span><sl-icon-button id="simulationState" class="simulation-state" label="Pause simulation"></sl-icon-button></div>
`;

const audioTracks = [
  '/audio/music_track_1.mp3',
  '/audio/music_track_2.mp3',
  '/audio/music_track_3.mp3'
];
const spaceAudio = new Audio();
spaceAudio.loop = false;
spaceAudio.preload = 'metadata';
spaceAudio.volume = 0.22;
const audioOnIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M12 3v12.55A4 4 0 1 0 14 19V8h5V3z'/%3E%3C/svg%3E";
const audioOffIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M12 3v12.55A4 4 0 1 0 14 19V8h5V3z'/%3E%3Cpath fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' d='M4 4l16 16'/%3E%3C/svg%3E";
let audioEnabled = true;
let audioStarted = false;
let currentTrack = null;

function chooseRandomTrack() {
  const availableTracks = audioTracks.filter(track => track !== currentTrack);
  currentTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
  spaceAudio.src = currentTrack;
}

async function playNextTrack() {
  if (!audioEnabled) return;
  chooseRandomTrack();
  audioStarted = false;
  try {
    await spaceAudio.play();
    audioStarted = true;
  } catch {
    // Playback will be retried after the next user interaction if needed.
  }
}

async function startAmbientAudio(interactionEvent) {
  if (interactionEvent?.composedPath?.().includes(audioToggle)) return;
  if (!audioEnabled || audioStarted) return;
  try {
    if (!currentTrack) chooseRandomTrack();
    await spaceAudio.play();
    audioStarted = true;
  } catch {
    // Autoplay is blocked until the user interacts with the page. The next
    // pointer/keyboard interaction will call this function again.
  }
}

spaceAudio.addEventListener('ended', playNextTrack);

function setAmbientAudio(enabled) {
  audioEnabled = enabled;
  audioToggle.classList.toggle('audio-on', enabled);
  audioToggle.src = enabled ? audioOnIcon : audioOffIcon;
  audioToggle.label = enabled ? 'Turn ambient audio off' : 'Turn ambient audio on';
  audioToggle.setAttribute('aria-pressed', String(enabled));
  if (enabled) {
    startAmbientAudio();
  } else {
    spaceAudio.pause();
    audioStarted = false;
  }
}

document.addEventListener('pointerdown', startAmbientAudio, { passive: true });
document.addEventListener('keydown', startAmbientAudio, { passive: true });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03050d);
scene.fog = new THREE.FogExp2(0x03050d, 0.00055);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.01, 10000);
camera.position.set(0, 115, 245);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

scene.add(new THREE.AmbientLight(0x59627f, 1.15));
const sunLight = new THREE.PointLight(0xfff0cc, 950, 1200, 1.25); scene.add(sunLight);

// Radial star field: tiny, distant points make the scene feel deep without distracting from the orbits.
const starPositions = new Float32Array(2600 * 3);
for (let i = 0; i < starPositions.length; i += 3) { const r = 240 + Math.random() * 360; const a = Math.random() * Math.PI * 2; const z = Math.random() * 2 - 1; const s = Math.sqrt(1 - z * z); starPositions[i] = r * s * Math.cos(a); starPositions[i + 1] = r * z; starPositions[i + 2] = r * s * Math.sin(a); }
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starPositions, 3)), new THREE.PointsMaterial({ color: 0x9da9d2, size: 1.15, transparent: true, opacity: 0.75, sizeAttenuation: true })); scene.add(stars);

const textureLoader = new THREE.TextureLoader();
const sunTexture = textureLoader.load('/textures/sun.png'); sunTexture.colorSpace = THREE.SRGBColorSpace;
const system = new THREE.Group(); scene.add(system);
const sun = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 40), new THREE.MeshStandardMaterial({ color: 0xffc247, map:sunTexture, emissive: 0xff8a00, emissiveMap:sunTexture, emissiveIntensity: 1.45, roughness: 0.72, metalness: 0 })); system.add(sun);
const sunShapeLight = new THREE.DirectionalLight(0xffd49a, 3.2); sunShapeLight.position.set(55, 45, 80); system.add(sunShapeLight);
// A single soft sprite avoids the hard, two-tone rings created by nested shells.
const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256;
const glowContext = glowCanvas.getContext('2d');
const glowGradient = glowContext.createRadialGradient(128, 128, 0, 128, 128, 128);
glowGradient.addColorStop(0, 'rgba(255, 205, 85, 0.78)');
glowGradient.addColorStop(0.28, 'rgba(255, 160, 35, 0.48)');
glowGradient.addColorStop(0.62, 'rgba(255, 105, 12, 0.18)');
glowGradient.addColorStop(1, 'rgba(255, 70, 0, 0)');
glowContext.fillStyle = glowGradient; glowContext.fillRect(0, 0, 256, 256);
const glowTexture = new THREE.CanvasTexture(glowCanvas); glowTexture.colorSpace = THREE.SRGBColorSpace;
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTexture, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:true }));
sunGlow.scale.set(52, 52, 1); sunGlow.renderOrder = -1; system.add(sunGlow);

const planets = [
  { name:'Mercury', color:0xb8a98f, radius:0.0366, orbit:22, period:0.241, eccentricity:0.206, tilt:0.03, texture:'/textures/mercury.png' }, { name:'Venus', color:0xe5a45d, radius:0.091, orbit:32, period:0.615, eccentricity:0.0067, tilt:0.02, texture:'/textures/venus.png' },
  { name:'Earth', color:0x4a87c5, radius:0.0916, orbit:44, period:1, eccentricity:0.0167, tilt:0.04, texture:'/textures/earth.png' }, { name:'Mars', color:0xe1c29b, radius:0.0488, orbit:57, period:1.881, eccentricity:0.0934, tilt:0.02, texture:'/textures/mars.png' },
  { name:'Jupiter', color:0xd3a67b, radius:1.003, orbit:82, period:11.86, eccentricity:0.0489, tilt:0.04, texture:'/textures/jupiter.png' }, { name:'Saturn', color:0xd8c08e, radius:0.837, orbit:110, period:29.46, eccentricity:0.0565, tilt:0.05, texture:'/textures/saturn.png', rings:true },
  { name:'Uranus', color:0x73cbd0, radius:0.364, orbit:138, period:84.01, eccentricity:0.046, tilt:0.04, texture:'/textures/uranus.png' }, { name:'Neptune', color:0x527de0, radius:0.354, orbit:165, period:164.8, eccentricity:0.009, tilt:0.04, texture:'/textures/neptune.png' }
];
const orbitGroup = new THREE.Group(); system.add(orbitGroup);
const objects = [];
const pickableBodies = [];
let earthObject = null;
const ringCanvas = document.createElement('canvas'); ringCanvas.width = ringCanvas.height = 512;
const ringContext = ringCanvas.getContext('2d');
const ringCenter = 256;
const ringBands = [
  [0.84, 0.34, 'rgba(201, 193, 174, 0.72)'],
  [0.695, 0.018, 'rgba(150, 145, 132, 0.38)'], [0.735, 0.028, 'rgba(239, 230, 202, 0.88)'],
  [0.775, 0.012, 'rgba(169, 163, 148, 0.34)'], [0.805, 0.035, 'rgba(230, 220, 193, 0.86)'],
  [0.85, 0.018, 'rgba(46, 43, 39, 0.86)'], [0.885, 0.042, 'rgba(235, 225, 199, 0.82)'],
  [0.925, 0.012, 'rgba(160, 154, 140, 0.36)'], [0.955, 0.030, 'rgba(215, 207, 187, 0.82)'],
  [0.985, 0.012, 'rgba(145, 139, 127, 0.32)']
];
for (const [position, width, color] of ringBands) {
  ringContext.beginPath(); ringContext.arc(ringCenter, ringCenter, position * ringCenter, 0, Math.PI * 2);
  ringContext.lineWidth = width * ringCenter; ringContext.strokeStyle = color; ringContext.stroke();
}
const ringTexture = new THREE.CanvasTexture(ringCanvas); ringTexture.colorSpace = THREE.SRGBColorSpace;
const legend = document.querySelector('#legend');
for (const p of planets) {
  const semiMinor = p.orbit * Math.sqrt(1 - p.eccentricity * p.eccentricity);
  const points = []; for (let i=0;i<=128;i++){ const a=i/128*Math.PI*2; points.push(new THREE.Vector3(p.orbit*(Math.cos(a)-p.eccentricity),0,semiMinor*Math.sin(a))); }
  const orientation = Math.random()*Math.PI*2;
  const orbitRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, orientation, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, p.tilt)));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: p.color, transparent:true, opacity:0.62, blending:THREE.AdditiveBlending, depthWrite:false })); line.quaternion.copy(orbitRotation); orbitGroup.add(line);
  const pivot = new THREE.Group(); pivot.quaternion.copy(orbitRotation); system.add(pivot);
  const holder = new THREE.Group(); holder.position.set(p.orbit*(1-p.eccentricity), 0, 0); pivot.add(holder);
  const texture = p.texture ? textureLoader.load(p.texture) : null;
  if(texture) texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 32, 20), new THREE.MeshLambertMaterial({ color:p.color, map:texture })); holder.add(mesh);
  if (p.rings) { const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.72, 96), new THREE.MeshBasicMaterial({ map:ringTexture, color:0xffffff, side:THREE.DoubleSide, transparent:true, opacity:0.82, depthWrite:false })); ring.rotation.x=Math.PI/2.35; holder.add(ring); }
  const item = document.createElement('sl-button'); item.className='legend-item'; item.variant='text'; item.innerHTML=`<i style="background:#${p.color.toString(16).padStart(6,'0')}"></i><span>${p.name}</span><small>${p.period < 2 ? p.period.toFixed(3) : p.period.toFixed(2)} years</small>`; legend.append(item);
  const object = { holder, mesh, period:p.period, orbit:p.orbit, eccentricity:p.eccentricity, semiMinor, name:p.name, item };
  item.onclick=()=>focusPlanet(object); objects.push(object); pickableBodies.push(mesh); mesh.userData.focusObject = object; if(p.name === 'Earth') earthObject = object;
}
const moonTexture = textureLoader.load('/textures/moon.png'); moonTexture.colorSpace = THREE.SRGBColorSpace;
const moonOrbit = new THREE.Group(); earthObject.holder.add(moonOrbit);
const moonOrbitPoints = [];
for (let i = 0; i <= 128; i++) {
  const angle = i / 128 * Math.PI * 2;
  moonOrbitPoints.push(new THREE.Vector3(1.65 * Math.cos(angle), 0, 1.65 * Math.sin(angle)));
}
const moonOrbitLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(moonOrbitPoints),
  new THREE.LineBasicMaterial({ color:0xbab8b0, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false })
);
moonOrbit.add(moonOrbitLine);
const moonHolder = new THREE.Group(); moonHolder.position.set(1.65, 0, 0); moonOrbit.add(moonHolder);
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.025, 32, 20), new THREE.MeshLambertMaterial({ color:0xbab8b0, map:moonTexture })); moonHolder.add(moon);
const moonItem = document.createElement('sl-button'); moonItem.className='legend-item moon-item'; moonItem.variant='text'; moonItem.innerHTML='<i style="background:#bab8b0"></i><span>Moon</span><small>27.32 days</small>'; legend.append(moonItem);
const moonObject = { holder:moonHolder, mesh:moon, period:27.3217/365.256, name:'Moon', item:moonItem };
moonItem.onclick=()=>focusPlanet(moonObject); pickableBodies.push(moon); moon.userData.focusObject = moonObject;
const sunItem = document.createElement('sl-button'); sunItem.className='legend-item sun-item'; sunItem.variant='text'; sunItem.innerHTML='<i style="background:#ffb632"></i><span>Sun</span><small>focus</small>'; legend.prepend(sunItem);
const sunObject = { mesh:sun, name:'Sun', item:sunItem };
sunItem.onclick=()=>focusPlanet(sunObject); pickableBodies.push(sun); sun.userData.focusObject = sunObject;

const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping=true; controls.dampingFactor=0.055; controls.minDistance=0.08; controls.maxDistance=1400; controls.target.set(0,0,0); controls.enablePan=true;
// Shift + left-drag pans the camera without changing the normal orbit gesture.
let shiftPan = null;
const panRight = new THREE.Vector3();
const panUp = new THREE.Vector3();
function panCamera(deltaX, deltaY) {
  const viewportHeight = renderer.domElement.clientHeight || innerHeight;
  const viewportWidth = renderer.domElement.clientWidth || innerWidth;
  const distance = camera.position.distanceTo(controls.target);
  const worldHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const worldPerPixel = worldHeight / viewportHeight;

  panRight.setFromMatrixColumn(camera.matrix, 0);
  panUp.setFromMatrixColumn(camera.matrix, 1);
  const panX = deltaX * worldPerPixel * (viewportWidth / viewportHeight);
  const panY = deltaY * worldPerPixel;
  const pan = panRight.multiplyScalar(-panX).add(panUp.multiplyScalar(panY));
  camera.position.add(pan);
  controls.target.add(pan);
}
function beginShiftPan(event) {
  if (event.button !== 0 || !event.shiftKey) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  // Focus mode follows the selected body and would otherwise undo the pan
  // on the next animation frame.
  if (focusedPlanet) {
    focusedPlanet = null;
    setSelectedLegendItem(null);
  }
  shiftPan = { x: event.clientX, y: event.clientY };
  renderer.domElement.classList.add('is-panning');
  renderer.domElement.setPointerCapture?.(event.pointerId);
}
function moveShiftPan(event) {
  if (!shiftPan) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  panCamera(event.clientX - shiftPan.x, event.clientY - shiftPan.y);
  shiftPan.x = event.clientX;
  shiftPan.y = event.clientY;
}
function endShiftPan(event) {
  if (!shiftPan) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderer.domElement.releasePointerCapture?.(event.pointerId);
  shiftPan = null;
  renderer.domElement.classList.remove('is-panning');
}
renderer.domElement.addEventListener('pointerdown', beginShiftPan, true);
renderer.domElement.addEventListener('pointermove', moveShiftPan, true);
renderer.domElement.addEventListener('pointerup', endShiftPan, true);
renderer.domElement.addEventListener('pointercancel', endShiftPan, true);
const pickRaycaster = new THREE.Raycaster();
let clickStart = null;
let pendingFocusObject = null;
const focusConfirm = document.querySelector('#focusConfirm');
const focusConfirmText = document.querySelector('#focusConfirmText');
// Keep the modal outside the transparent canvas container so its backdrop
// receives clicks instead of letting them reach the scene.
document.body.appendChild(focusConfirm);
const requestFocus = object => {
  if (focusedPlanet === object) return;
  pendingFocusObject = object;
  focusConfirmText.textContent = `Focus ${object.name}?`;
  focusConfirm.setAttribute('aria-label', `Focus ${object.name}?`);
  focusConfirm.show();
};
document.querySelector('#focusAccept').onclick = () => {
  if (pendingFocusObject) focusPlanet(pendingFocusObject);
  pendingFocusObject = null;
  focusConfirm.hide();
};
document.querySelector('#focusCancel').onclick = () => {
  pendingFocusObject = null;
  focusConfirm.hide();
};
renderer.domElement.addEventListener('pointerdown', event => {
  if (event.button === 0 && !event.shiftKey) clickStart = { x:event.clientX, y:event.clientY, pointerId:event.pointerId };
}, true);
renderer.domElement.addEventListener('pointerup', event => {
  if (!clickStart || clickStart.pointerId !== event.pointerId) return;
  const moved = Math.hypot(event.clientX - clickStart.x, event.clientY - clickStart.y);
  clickStart = null;
  if (moved > 5 || event.shiftKey) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  );
  pickRaycaster.setFromCamera(pointer, camera);
  const hit = pickRaycaster.intersectObjects(pickableBodies, false)[0];
  if (hit?.object.userData.focusObject) requestFocus(hit.object.userData.focusObject);
}, true);
renderer.domElement.addEventListener('pointercancel', () => { clickStart = null; }, true);
let running=true, simSpeed=1, elapsed=0, focusedPlanet=earthObject; const keys = {};
const focusPoint = new THREE.Vector3();
function setSelectedLegendItem(selectedItem){ document.querySelectorAll('.legend-item').forEach(item=>{ item.variant='text'; item.classList.remove('selected'); }); if(selectedItem) selectedItem.variant='primary'; }
setSelectedLegendItem(earthObject.item);
function focusPlanet(object){ focusedPlanet=object; object.mesh.getWorldPosition(focusPoint); const distance=Math.max(object.mesh.geometry.parameters.radius*25, 0.5); camera.position.copy(focusPoint).add(new THREE.Vector3(distance*0.7, distance*0.48, distance)); controls.target.copy(focusPoint); controls.update(); setSelectedLegendItem(object.item); }
focusPlanet(earthObject);
function focusSystem(){ focusedPlanet=null; camera.position.set(0,115,245); controls.target.set(0,0,0); controls.update(); setSelectedLegendItem(null); }
addEventListener('keydown', e => { keys[e.code]=true; if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); if(e.code==='Space') togglePause(); });
addEventListener('keyup', e => keys[e.code]=false);
const pauseIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M6 4h4v16H6zm8 0h4v16h-4z'/%3E%3C/svg%3E";
const playIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M8 5v14l11-7z'/%3E%3C/svg%3E";
const simulationState = document.querySelector('#simulationState');
function updateSimulationState(){ simulationState.src=running?playIcon:pauseIcon; simulationState.label=running?'Simulation playing':'Simulation paused'; }
function togglePause(){ running=!running; document.querySelector('#pause').innerHTML=running?'Ⅱ &nbsp; PAUSE':'▶ &nbsp; RESUME'; updateSimulationState(); }
document.querySelector('#pause').onclick=togglePause;
simulationState.onclick=togglePause;
updateSimulationState();
document.querySelector('#reset').onclick=()=>{ focusSystem(); elapsed=0; };
function formatSpeed(value){ if(value===0)return '0×'; if(value>=1000000)return `${(value/1000000).toFixed(1)}M×`; if(value>=1000)return `${(value/1000).toFixed(value>=10000?0:1)}k×`; return `${value.toFixed(value<10?1:0)}×`; }
document.querySelector('#speed').addEventListener('sl-input',e=>{ const level=Number(e.target.value); simSpeed=level===0?0:10**((level-1)*(6/99)); document.querySelector('#speedValue').textContent=formatSpeed(simSpeed); });
document.querySelector('#orbits').addEventListener('sl-change',e=>{ orbitGroup.visible=e.target.checked; moonOrbitLine.visible=e.target.checked; });
const audioToggle = document.querySelector('#audioToggle');
audioToggle.addEventListener('click', () => {
  if (audioEnabled && !audioStarted) startAmbientAudio();
  else setAmbientAudio(!audioEnabled);
});
const toggleUi = document.querySelector('#toggleUi');
const sidebarToggle = document.querySelector('#sidebarToggle');
const controlPanel = document.querySelector('#controlPanel');
function toggleInterface(){
  const hidden = !document.body.classList.contains('ui-hidden');
  syncInterface(hidden);
  if (hidden) controlPanel.hide();
}
function syncInterface(hidden){
  document.body.classList.toggle('ui-hidden', hidden);
  toggleUi.textContent = hidden ? 'SHOW UI' : 'HIDE UI';
  toggleUi.setAttribute('aria-label', hidden ? 'Show interface' : 'Hide interface');
  toggleUi.title = hidden ? 'Show interface' : 'Hide interface';
}
function syncSidebar(open){
  sidebarToggle.label = open ? 'Close sidebar' : 'Open sidebar';
  document.body.classList.toggle('sidebar-open', open);
}
function toggleSidebar(){
  if (controlPanel.open) controlPanel.hide(); else controlPanel.show();
}
toggleUi.onclick = toggleInterface;
sidebarToggle.onclick = toggleSidebar;
controlPanel.addEventListener('sl-after-show',()=>syncSidebar(true));
controlPanel.addEventListener('sl-after-hide',()=>syncSidebar(false));
syncSidebar(controlPanel.open);
const mobileViewport = matchMedia('(max-width: 700px)');
document.addEventListener('pointerdown', event => {
  if (!mobileViewport.matches || !controlPanel.open) return;
  const path = event.composedPath();
  if (path.includes(controlPanel) || path.includes(sidebarToggle)) return;
  controlPanel.hide();
});
const clock = new THREE.Clock();
function animate(){ requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),0.05); if(running){ elapsed+=dt*simSpeed; objects.forEach(o=>{ const angle=elapsed*(Math.PI*2/(o.period*365.256*86400)); o.holder.position.set(o.orbit*(Math.cos(angle)-o.eccentricity),0,o.semiMinor*Math.sin(angle)); o.mesh.rotation.y += dt*simSpeed*(Math.PI*2/(27*86400)); }); moonOrbit.rotation.y += dt*simSpeed*(Math.PI*2/(27.3217*86400)); moon.rotation.y += dt*simSpeed*(Math.PI*2/(27.3217*86400)); sun.rotation.y+=dt*simSpeed*(Math.PI*2/(25.38*86400)); }
  if(focusedPlanet){ focusedPlanet.mesh.getWorldPosition(focusPoint); const followDelta=focusPoint.clone().sub(controls.target); controls.target.copy(focusPoint); camera.position.add(followDelta); }
  const move = (keys.KeyW||keys.ArrowUp?1:0) - (keys.KeyS||keys.ArrowDown?1:0); const strafe=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0); const lift=(keys.KeyE?1:0)-(keys.KeyQ?1:0); const speed=(keys.ShiftLeft||keys.ShiftRight?1.8:0.7)*dt; camera.translateZ(-move*speed*20); camera.translateX(strafe*speed*20); camera.translateY(lift*speed*20); controls.update(); renderer.render(scene,camera); document.querySelector('#simTime').textContent=`SOL ${String(Math.floor(elapsed/86400)+1).padStart(3,'0')} · ${new Date(elapsed*1000).toISOString().slice(11,19)}`; }
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
