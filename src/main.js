import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="hud">
    <div class="brand"><span class="brand-mark">✦</span><div><strong>SOLAR SYSTEM</strong><small>EXPLORER / LIVE ORRERY</small></div></div>
    <div class="status"><span class="status-dot"></span><span id="statusText">SIMULATION ACTIVE</span></div>
  </div>
  <aside class="control-panel glass">
    <p class="eyebrow">OBSERVATORY CONTROL</p>
    <h1>Our cosmic<br/><em>system</em></h1><div class="control-row"><label>SIMULATION TIME <span id="speedValue">1×</span></label><input id="speed" type="range" min="0" max="100" value="1" /></div>
    <div class="button-row"><button id="pause" class="primary">Ⅱ &nbsp; PAUSE</button><button id="reset" class="secondary">↺</button></div>
    <div class="toggle-row"><span>ORBITAL PATHS</span><button id="orbits" class="switch on"><span></span></button></div>
    <button id="systemView" class="system-view">⌾ &nbsp; FULL SYSTEM</button>
    <div class="legend" id="legend"></div>
  </aside>
  <div class="coordinates"><span id="simTime">SOL 001 · 00:00:00</span><span id="fps">LIVE / 60 FPS</span></div>
`;

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
for (let i = 0; i < starPositions.length; i += 3) { const r = 900 * Math.cbrt(Math.random()); const a = Math.random() * Math.PI * 2; const z = Math.random() * 2 - 1; const s = Math.sqrt(1 - z * z); starPositions[i] = r * s * Math.cos(a); starPositions[i + 1] = r * z; starPositions[i + 2] = r * s * Math.sin(a); }
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
  { name:'Earth', color:0x4a87c5, radius:0.0916, orbit:44, period:1, eccentricity:0.0167, tilt:0.04, texture:'/textures/earth.png' }, { name:'Mars', color:0xc8624c, radius:0.0488, orbit:57, period:1.881, eccentricity:0.0934, tilt:0.02, texture:'/textures/mars.png' },
  { name:'Jupiter', color:0xd3a67b, radius:1.003, orbit:82, period:11.86, eccentricity:0.0489, tilt:0.04, texture:'/textures/jupiter.png' }, { name:'Saturn', color:0xd8c08e, radius:0.837, orbit:110, period:29.46, eccentricity:0.0565, tilt:0.05, texture:'/textures/saturn.png', rings:true },
  { name:'Uranus', color:0x73cbd0, radius:0.364, orbit:138, period:84.01, eccentricity:0.046, tilt:0.04, texture:'/textures/uranus.png' }, { name:'Neptune', color:0x527de0, radius:0.354, orbit:165, period:164.8, eccentricity:0.009, tilt:0.04, texture:'/textures/neptune.png' }
];
const orbitGroup = new THREE.Group(); system.add(orbitGroup);
const objects = [];
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
  const item = document.createElement('button'); item.className='legend-item'; item.innerHTML=`<i style="background:#${p.color.toString(16).padStart(6,'0')}"></i><span>${p.name}</span><small>${p.period < 2 ? p.period.toFixed(3) : p.period.toFixed(2)} years</small>`; legend.append(item);
  const object = { holder, mesh, period:p.period, orbit:p.orbit, eccentricity:p.eccentricity, semiMinor, name:p.name, item };
  item.onclick=()=>focusPlanet(object); objects.push(object); if(p.name === 'Earth') earthObject = object;
}
const moonTexture = textureLoader.load('/textures/moon.png'); moonTexture.colorSpace = THREE.SRGBColorSpace;
const moonOrbit = new THREE.Group(); earthObject.holder.add(moonOrbit);
const moonHolder = new THREE.Group(); moonHolder.position.set(1.65, 0, 0); moonOrbit.add(moonHolder);
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.025, 32, 20), new THREE.MeshLambertMaterial({ color:0xbab8b0, map:moonTexture })); moonHolder.add(moon);
const moonItem = document.createElement('button'); moonItem.className='legend-item moon-item'; moonItem.innerHTML='<i style="background:#bab8b0"></i><span>Moon</span><small>27.32 days</small>'; legend.append(moonItem);
const moonObject = { holder:moonHolder, mesh:moon, period:27.3217/365.256, name:'Moon', item:moonItem };
moonItem.onclick=()=>focusPlanet(moonObject);
const sunItem = document.createElement('button'); sunItem.className='legend-item sun-item'; sunItem.innerHTML='<i style="background:#ffb632"></i><span>Sun</span><small>focus</small>'; legend.prepend(sunItem);
const sunObject = { mesh:sun, name:'Sun', item:sunItem };
sunItem.onclick=()=>focusPlanet(sunObject);

const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping=true; controls.dampingFactor=0.055; controls.minDistance=0.08; controls.maxDistance=1400; controls.target.set(0,0,0); controls.enablePan=true;
let running=true, simSpeed=1, elapsed=0, focusedPlanet=null; const keys = {};
const focusPoint = new THREE.Vector3();
function focusPlanet(object){ focusedPlanet=object; object.mesh.getWorldPosition(focusPoint); const distance=Math.max(object.mesh.geometry.parameters.radius*25, 0.5); camera.position.copy(focusPoint).add(new THREE.Vector3(distance*0.7, distance*0.48, distance)); controls.target.copy(focusPoint); controls.update(); document.querySelectorAll('.legend-item').forEach(item=>item.classList.remove('selected')); object.item.classList.add('selected'); document.querySelector('#systemView').classList.remove('active'); }
function focusSystem(){ focusedPlanet=null; camera.position.set(0,115,245); controls.target.set(0,0,0); controls.update(); document.querySelectorAll('.legend-item').forEach(item=>item.classList.remove('selected')); document.querySelector('#systemView').classList.add('active'); }
addEventListener('keydown', e => { keys[e.code]=true; if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); if(e.code==='Space') togglePause(); });
addEventListener('keyup', e => keys[e.code]=false);
function togglePause(){ running=!running; document.querySelector('#pause').innerHTML=running?'Ⅱ &nbsp; PAUSE':'▶ &nbsp; RESUME'; document.querySelector('#statusText').textContent=running?'SIMULATION ACTIVE':'SIMULATION PAUSED'; }
document.querySelector('#pause').onclick=togglePause;
document.querySelector('#reset').onclick=()=>{ focusSystem(); elapsed=0; };
document.querySelector('#systemView').onclick=focusSystem;
function formatSpeed(value){ if(value===0)return '0×'; if(value>=1000000)return `${(value/1000000).toFixed(1)}M×`; if(value>=1000)return `${(value/1000).toFixed(value>=10000?0:1)}k×`; return `${value.toFixed(value<10?1:0)}×`; }
document.querySelector('#speed').oninput=e=>{ const level=Number(e.target.value); simSpeed=level===0?0:10**((level-1)*(6/99)); document.querySelector('#speedValue').textContent=formatSpeed(simSpeed); };
document.querySelector('#orbits').onclick=e=>{ e.currentTarget.classList.toggle('on'); orbitGroup.visible=e.currentTarget.classList.contains('on'); };
const clock = new THREE.Clock();
function animate(){ requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),0.05); if(running){ elapsed+=dt*simSpeed; objects.forEach(o=>{ const angle=elapsed*(Math.PI*2/(o.period*365.256*86400)); o.holder.position.set(o.orbit*(Math.cos(angle)-o.eccentricity),0,o.semiMinor*Math.sin(angle)); o.mesh.rotation.y += dt*simSpeed*(Math.PI*2/(27*86400)); }); moonOrbit.rotation.y += dt*simSpeed*(Math.PI*2/(27.3217*86400)); moon.rotation.y += dt*simSpeed*(Math.PI*2/(27.3217*86400)); sun.rotation.y+=dt*simSpeed*(Math.PI*2/(25.38*86400)); }
  if(focusedPlanet){ focusedPlanet.mesh.getWorldPosition(focusPoint); const followDelta=focusPoint.clone().sub(controls.target); controls.target.copy(focusPoint); camera.position.add(followDelta); }
  const move = (keys.KeyW||keys.ArrowUp?1:0) - (keys.KeyS||keys.ArrowDown?1:0); const strafe=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0); const lift=(keys.KeyE?1:0)-(keys.KeyQ?1:0); const speed=(keys.ShiftLeft||keys.ShiftRight?1.8:0.7)*dt; camera.translateZ(-move*speed*20); camera.translateX(strafe*speed*20); camera.translateY(lift*speed*20); controls.update(); renderer.render(scene,camera); document.querySelector('#simTime').textContent=`SOL ${String(Math.floor(elapsed/86400)+1).padStart(3,'0')} · ${new Date(elapsed*1000).toISOString().slice(11,19)}`; }
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
