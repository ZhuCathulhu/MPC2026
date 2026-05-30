import * as THREE from 'three';

// --- SCENE, CAMERA, RENDERER ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,                                       // Field of view
  window.innerWidth / window.innerHeight,   // Aspect ratio
  0.1,                                      // Near clip
  1000                                      // Far clip
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// --- A SIMPLE OBJECT ---
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00aaff });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// --- GAME LOOP ---
function animate() {
  requestAnimationFrame(animate);

  // Game logic goes here
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}
animate();

// --- HANDLE RESIZE ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});