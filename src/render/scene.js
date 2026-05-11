import * as THREE from 'three';

export function createSceneBundle() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef7ff);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 240);
  camera.position.set(0, 6.2, 10.5);
  camera.lookAt(0, -2.2, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  return { scene, camera, renderer };
}

export function resizeScene({ camera, renderer }) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
