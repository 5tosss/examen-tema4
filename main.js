import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// LUZ
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

// Cargar escenario inmersivo (ejemplo: una habitación)
const loader = new GLTFLoader();
loader.load('models/scene.glb', (gltf) => {
    const room = gltf.scene;
    room.scale.set(1, 1, 1);
    room.position.set(0, 0, 0);
    scene.add(room);
}, undefined, (error) => {
    console.error('Error al cargar el escenario:', error);
});

// Crear 15 objetos 3D con geometrías diferentes
const geometries = [
    new THREE.BoxGeometry(), new THREE.SphereGeometry(), new THREE.ConeGeometry(),
    new THREE.CylinderGeometry(), new THREE.TorusGeometry(), new THREE.TetrahedronGeometry(),
    new THREE.OctahedronGeometry(), new THREE.DodecahedronGeometry(), new THREE.IcosahedronGeometry(),
    new THREE.TorusKnotGeometry(), new THREE.CapsuleGeometry(0.3, 0.5, 4, 8),
    new THREE.RingGeometry(0.2, 0.5, 32), new THREE.CircleGeometry(0.5, 32),
    new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.3, 1)]),
    new THREE.ConeGeometry(0.5, 1, 6)
];

const objects = [];
geometries.forEach((geom) => {
    const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(Math.random() * 6 - 3, Math.random() * 2 + 0.5, Math.random() * 6 - 3);
    scene.add(mesh);
    objects.push({
        mesh,
        rotSpeed: new THREE.Vector3(Math.random(), Math.random(), Math.random())
    });
});

// Manos e interacción
const handFactory = new XRHandModelFactory();
const grabbedObjects = [null, null];

function isGrabbing(hand) {
    const indexTip = hand.joints['index-finger-tip'];
    const thumbTip = hand.joints['thumb-tip'];
    if (indexTip && thumbTip) {
        const distance = indexTip.position.distanceTo(thumbTip.position);
        return distance < 0.025;
    }
    return false;
}

function updateHandInteraction(hand, handIndex) {
    if (!hand.joints) return;

    const indexTip = hand.joints['index-finger-tip'];
    if (!indexTip) return;

    const grabbing = isGrabbing(hand);

    if (grabbing && !grabbedObjects[handIndex]) {
        let closest = null;
        let minDist = Infinity;
        objects.forEach(obj => {
            const dist = indexTip.position.distanceTo(obj.mesh.position);
            if (dist < 0.15 && dist < minDist) {
                minDist = dist;
                closest = obj.mesh;
            }
        });

        if (closest) {
            grabbedObjects[handIndex] = closest;
            closest.userData.offset = new THREE.Vector3().subVectors(closest.position, indexTip.position);
        }
    }

    if (grabbedObjects[handIndex]) {
        if (grabbing) {
            grabbedObjects[handIndex].position.copy(indexTip.position).add(grabbedObjects[handIndex].userData.offset);
        } else {
            grabbedObjects[handIndex] = null;
        }
    }
}

for (let i = 0; i < 2; i++) {
    const hand = renderer.xr.getHand(i);
    scene.add(hand);

    const handModel = handFactory.createHandModel(hand, 'boxes'); // usa 'boxes' o 'mesh'
    hand.add(handModel);
}


// Animación
renderer.setAnimationLoop(() => {
    objects.forEach(obj => {
        obj.mesh.rotation.x += 0.01 * obj.rotSpeed.x;
        obj.mesh.rotation.y += 0.01 * obj.rotSpeed.y;
        obj.mesh.rotation.z += 0.01 * obj.rotSpeed.z;
    });

    updateHandInteraction(renderer.xr.getHand(0), 0);
    updateHandInteraction(renderer.xr.getHand(1), 1);

    renderer.render(scene, camera);
});
