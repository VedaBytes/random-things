import "./style.css";
import * as THREE from "three";
import RAPIER, { World } from "@dimforge/rapier3d-compat";
import { DynamicRayCastVehicleController } from "@dimforge/rapier3d-compat";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"; //
import { fill } from "three/src/extras/TextureUtils.js";
import { Wireframe } from "three/examples/jsm/Addons.js";
import { deltaTime } from "three/tsl";
// Scene, Camera, Renderer

const keyState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
};

window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      keyState.forward = true;
      break;
    case "ArrowDown":
    case "KeyS":
      keyState.backward = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      keyState.left = true;
      break;
    case "ArrowRight":
    case "KeyD":
      keyState.right = true;
      break;
    case "KeyB":
      keyState.brake = true;
      break;
  }
});

window.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      keyState.forward = false;
      break;
    case "ArrowDown":
    case "KeyS":
      keyState.backward = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      keyState.left = false;
      break;
    case "ArrowRight":
    case "KeyD":
      keyState.right = false;
      break;
    case "KeyB":
      keyState.brake = false;
      break;
  }
});

const wheelInfo = {
  axleCs: new THREE.Vector3(0, 0, -1),
  suspensionRestLength: 0.125,
  suspensionStiffness: 24,
  maxSuspensionTravel: 1,
  radius: 0.5,
};

const wheels = [
  { position: new THREE.Vector3(-0.5, -0.25, -0.75), ...wheelInfo }, // front-left
  { position: new THREE.Vector3(0.5, -0.25, -0.75), ...wheelInfo }, // front-right
  { position: new THREE.Vector3(0.5, -0.25, 0.75), ...wheelInfo }, // rear-right
  { position: new THREE.Vector3(-0.75, -0.25, 0.75), ...wheelInfo }, // rear-left
];

// Example: Use keyState in your animation loop to control the vehicle

await RAPIER.init();

const dynamicBodies = [];

const up = new THREE.Vector3(0, 1, 0);

const _wheelSteeringQuat = new THREE.Quaternion();
const _wheelRotationQuat = new THREE.Quaternion();

const gravity = new RAPIER.Vector3(0, -9.81, 0);
const world = new RAPIER.World(gravity);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(-4, 3, 5);

const canvas = document.querySelector(".mycanvas");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

// Example geometry
// const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
// const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// Resize event
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const cubeMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x0077ff })
);

cubeMesh.castShadow = true;
scene.add(cubeMesh);

//CAR Mesh

const carMehs = new THREE.Mesh(
  new THREE.BoxGeometry(1, 0.5, 2),
  new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: true })
);

const carBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 0).setCanSleep(false)
);

console.log(wheels);

//Wheels

const controller = new RAPIER.DynamicRayCastVehicleController(carBody);

const suspensionDirection = new THREE.Vector3(0, -1, 0);

wheels.forEach((wheel) => {
  controller.addWheel(
    wheel.position,
    suspensionDirection,
    wheel.axleCs,
    wheel.suspensionRestLength,
    wheel.radius
  );
});

wheels.forEach((wheel, index) => {
  controller.setWheelSuspensionStiffness(index, wheel.suspensionStiffness);
  controller.setWheelMaxSuspensionTravel(index, wheel.maxSuspensionTravel);

  controller.setWheelFrictionSlip(index, 1000);
});

const vehicleController = controller;

const wheelMeshes = [];

for (let i = 0; i < wheels.length; i++) {
  const wheelgeo = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 8);

  wheelgeo.rotateZ(Math.PI * 0.5);

  const wheelMesh = new THREE.Mesh(
    wheelgeo,
    new THREE.MeshNormalMaterial({ color: 0x333333 })
  );

  wheelMesh.position.copy(wheels[i].position);

  wheelMesh.castShadow = true;

  carMehs.add(wheelMesh);
  wheelMeshes.push(wheelMesh);
}

function addWheel() {
  vehicleController.addWheel();
}

const carCollider = RAPIER.ColliderDesc.cuboid(0.5, 0.25, 1).setMass(30);

world.createCollider(carCollider, carBody);

dynamicBodies.push([carMehs, carBody]);

carMehs.castShadow = true;
scene.add(carMehs);

const cubeBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.dynamic().setTranslation(4, 3, 0).setCanSleep(false)
);

const cubeCollider = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
  .setMass(5)
  .setRestitution(1.2);

dynamicBodies.push([cubeMesh, cubeBody]);

world.createCollider(cubeCollider, cubeBody);

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(50, 1, 50),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);

floor.receiveShadow = true;

scene.add(floor);

const floorBody = world
  .createRigidBody(RAPIER.RigidBodyDesc.fixed())
  .setTranslation(0, -2, 0);

const floorSape = RAPIER.ColliderDesc.cuboid(25, 0.5, 25);

world.createCollider(floorSape, floorBody);

const clock = new THREE.Clock();
let delta;

const updateWheel = () => {
  if (vehicleController === undefined) return;

  wheelMeshes?.forEach((wheel, index) => {
    if (!wheel) return;

    const wheelAxleCs = controller.wheelAxleCs(index);
    const connection = controller.wheelChassisConnectionPointCs(index)?.y || 0;
    const suspension = controller.wheelSuspensionLength(index) || 0;
    const steering = controller.wheelSteering(index) || 0;
    const rotationRad = controller.wheelRotation(index) || 0;

    wheel.position.y = connection - suspension;

    _wheelSteeringQuat.setFromAxisAngle(up, steering);
    _wheelRotationQuat.setFromAxisAngle(wheelAxleCs, rotationRad);

    wheel.quaternion.multiplyQuaternions(
      _wheelSteeringQuat,
      _wheelRotationQuat
    );
  });
};

let ground = null;

const updatevehicle = () => {
  let outOfBounds = false;

  // Raycast to check if car is on the ground
  const ray = new RAPIER.Ray(carBody.translation(), { x: 0, y: -1, z: 0 });
  const raycastResult = world.castRay(
    ray,
    1,
    false,
    undefined,
    undefined,
    undefined,
    carBody
  );
  ground = null;

  if (raycastResult) {
    const collider = raycastResult.collider;
    const userData = collider.parent()?.userData;
    outOfBounds = userData?.outOfBounds;
    ground = collider;
  }

  // Engine force (scale as needed)
  const engineForce =
    ((keyState.forward ? 1 : 0) - (keyState.backward ? 1 : 0)) * 50;
  controller.setWheelEngineForce(0, engineForce);
  controller.setWheelEngineForce(1, engineForce);

  // Brake all wheels
  const brakeForce = keyState.brake ? 100 : 0;
  for (let i = 0; i < 4; i++) controller.setWheelBrake(i, brakeForce);

  // Steering
  const steerDirection = (keyState.left ? 1 : 0) - (keyState.right ? 1 : 0);
  const steerAngle = Math.PI / 4; // adjust for sharper turns
  const currentSteering = controller.wheelSteering(0) || 0;
  const steering = THREE.MathUtils.lerp(
    currentSteering,
    steerAngle * steerDirection,
    0.2
  );
  controller.setWheelSteering(0, steering);
  controller.setWheelSteering(1, steering);

  // Reset car if out of bounds or pressing R
  if (keyState.reset || outOfBounds) {
    carBody.setTranslation(new RAPIER.Vector3(0, 5, 0), true);
    carBody.setRotation(new THREE.Quaternion(), true);
    carBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
    carBody.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
  }
};

// Animate function
function animate() {
  requestAnimationFrame(animate);

  delta = clock.getDelta();
  world.timestep = Math.min(delta, 0.1);
  world.step();

  if (vehicleController) {
    updatevehicle();
    controller.updateVehicle(deltaTime);
    updateWheel();
  }

  for (let i = 0; i < dynamicBodies.length; i++) {
    dynamicBodies[i][0].position.copy(dynamicBodies[i][1].translation());
    dynamicBodies[i][0].quaternion.copy(dynamicBodies[i][1].rotation());
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();
