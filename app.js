// Global variables
let scene, camera, renderer;
let controls;        // OrbitControls
let pointsGroup;     // Group holding the points
let animationFrameId;
let rotationSpeed = 0.0005; // Slow spin

// Default 5-digit number
const DEFAULT_SEED = "12345";

// 1. Initialize the scene
initScene();

// 2. Render the scene with the default seed
createSphereWithSeed(DEFAULT_SEED);

// --------------------
// initScene() function
// --------------------
function initScene() {
  // Scene & Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,                             // FOV
    window.innerWidth / window.innerHeight, // Aspect
    0.1,                            // Near
    1000                            // Far
  );
  camera.position.set(0, 0, 40);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  // OrbitControls for mouse interaction
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Smooth camera motion
  controls.dampingFactor = 0.05;
  // (Optionally disable auto-rotation if you only want manual rotation)
  // controls.autoRotate = true;
  // controls.autoRotateSpeed = 0.1;

  // Listen for window resize
  window.addEventListener("resize", onWindowResize, false);

  // On "Update" button click
  const updateBtn = document.getElementById("updateBtn");
  updateBtn.addEventListener("click", () => {
    const seedInput = document.getElementById("digitInput").value.trim();
    if (!/^\d{5}$/.test(seedInput)) {
      alert("Please enter exactly 5 digits, e.g. 12345.");
      return;
    }
    createSphereWithSeed(seedInput);
  });
}

// ----------------------------------
// createSphereWithSeed(numberString)
// ----------------------------------
function createSphereWithSeed(numberString) {
  // Cancel any existing animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // If we already have a pointsGroup, remove it from the scene and dispose
  if (pointsGroup) {
    scene.remove(pointsGroup);
    pointsGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    });
  }

  // Create a new group for points
  pointsGroup = new THREE.Group();
  scene.add(pointsGroup);

  // Use the 5-digit string as a seed for consistent "random" distribution
  // 1) Convert the string to an integer for seed
  //    or combine digits in some way to generate a pseudo-random seed
  const seed = parseInt(numberString, 10);

  // 2) Create a seeded random function
  let pseudoRandom = seededRandom(seed);

  // Decide how many points (40-80)
  // We can use a bit of the seed or random to pick a count within that range
  const totalPoints = 40 + Math.floor(pseudoRandom() * 41); // 40 to 80

  // We'll keep the radius of the sphere constant (e.g., 15)
  const sphereRadius = 15;

  // For color generation, we might:
  // - Use hue variations with the seed as an offset
  // - Or create a random color for each point based on the seeded RNG
  // We'll do something like a random HSL for each point
  // but with an offset from the seed
  const hueBase = (seed % 360) / 360; // base hue from the seed (0-1)

  for (let i = 0; i < totalPoints; i++) {
    // Random radius from 0..sphereRadius
    // but for a uniform distribution in a sphere, we sample radius^(1/3).
    const r = Math.cbrt(pseudoRandom()) * sphereRadius;

    // Random angles in spherical coordinates
    const theta = pseudoRandom() * Math.PI * 2; // 0..2π
    const phi = Math.acos((pseudoRandom() * 2) - 1); // 0..π

    // Convert spherical to Cartesian
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    // Create a small sphere (point) or use Points
    // We'll use a small sphere geometry
    const geometry = new THREE.SphereGeometry(0.4, 8, 8);

    // Unique color per point (random hue, but base offset from hueBase)
    const hue = (hueBase + pseudoRandom()) % 1.0;
    const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
    const material = new THREE.MeshStandardMaterial({ color });

    const pointMesh = new THREE.Mesh(geometry, material);
    pointMesh.position.set(x, y, z);
    pointsGroup.add(pointMesh);
  }

  // Add some lighting to see the spheres
  // (Remove old lights if re-creating them, or store them globally.)
  addLights();

  // Update stats in the top-right panel
  document.getElementById("nftAddressStat").textContent = `NFT Address: ${numberString}`;
  document.getElementById("pointCountStat").textContent = `Points: ${totalPoints}`;
  document.getElementById("speedStat").textContent = `Rotation Speed: ${rotationSpeed.toFixed(5)}`;

  // Start the animation loop
  animate();
}

// ----------------
// addLights()
// ----------------
function addLights() {
  // Remove any existing lights from the scene if needed
  // (Optional – if you re-add them each time)
  // For simplicity, let's just remove all lights:
  const oldLights = [];
  scene.traverse((obj) => {
    if (obj.isLight) oldLights.push(obj);
  });
  oldLights.forEach((light) => scene.remove(light));

  // Add an ambient light
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Add a directional light
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 50, 50);
  scene.add(dirLight);
}

// -----------------------
// animate() - Render Loop
// -----------------------
function animate() {
  // Slowly spin the entire points group
  if (pointsGroup) {
    pointsGroup.rotation.y += rotationSpeed;
    pointsGroup.rotation.x += rotationSpeed * 0.5;
  }

  // Update OrbitControls
  controls.update();

  // Render the scene
  renderer.render(scene, camera);

  // Next frame
  animationFrameId = requestAnimationFrame(animate);
}

// -----------------------
// onWindowResize()
// -----------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------------------------
// A simple pseudo-random generator (PRNG)
// --------------------------------------
function seededRandom(seed) {
  // Based on https://stackoverflow.com/a/47593316
  // Returns a function that yields numbers in [0,1)
  return function() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}
