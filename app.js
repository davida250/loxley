// Global variables
let scene, camera, renderer;
let controls;        // OrbitControls
let pointsGroup;     // Group holding the points and connections
let animationFrameId;
let rotationSpeed = 0.0015; // Slow spin

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
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1,                            // Near clipping plane
    1000                            // Far clipping plane
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

  // Remove previous points group if exists
  if (pointsGroup) {
    scene.remove(pointsGroup);
    pointsGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    });
  }

  // Create a new group for points (and later connections)
  pointsGroup = new THREE.Group();
  scene.add(pointsGroup);

  // Use the 5-digit string as a seed for a consistent random distribution
  const seed = parseInt(numberString, 10);
  let pseudoRandom = seededRandom(seed);

  // Decide how many points (between 40 and 80)
  const totalPoints = 40 + Math.floor(pseudoRandom() * 41); // 40 to 80 points

  // Set the sphere's radius
  const sphereRadius = 15;

  // Derive a base hue from the seed (0-1 range)
  const hueBase = (seed % 360) / 360;

  // Array to store the points for connection computation
  const pointsArray = [];

  // Create points on the surface of the sphere
  for (let i = 0; i < totalPoints; i++) {
    // All points lie on the surface, so r = sphereRadius
    const r = sphereRadius;

    // Generate random angles in spherical coordinates
    const theta = pseudoRandom() * Math.PI * 2; // 0..2π
    const phi = Math.acos((pseudoRandom() * 2) - 1); // 0..π

    // Convert spherical coordinates to Cartesian coordinates
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    // Create a sphere geometry for the point (1.5 times larger than before: 0.3 vs 0.2)
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);

    // Generate a brighter color (2x brighter than before, set lightness to 1.0)
    const hue = (hueBase + pseudoRandom()) % 1.0;
    const color = new THREE.Color().setHSL(hue, 0.8, 1.0);
    const material = new THREE.MeshStandardMaterial({ color });

    const pointMesh = new THREE.Mesh(geometry, material);
    pointMesh.position.set(x, y, z);
    pointsGroup.add(pointMesh);
    pointsArray.push(pointMesh);
  }

  // Create a group for connection lines and compute connections
  const connectionsGroup = new THREE.Group();
  const addedConnections = new Set();
  for (let i = 0; i < pointsArray.length; i++) {
    const p1 = pointsArray[i].position;
    let minDistance = Infinity;
    let closestIndex = -1;
    // Find the closest neighbor for point i
    for (let j = 0; j < pointsArray.length; j++) {
      if (i === j) continue;
      const p2 = pointsArray[j].position;
      const dist = p1.distanceTo(p2);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = j;
      }
    }
    // Use a key to avoid duplicate connections (order-independent)
    const key = i < closestIndex ? `${i}-${closestIndex}` : `${closestIndex}-${i}`;
    if (!addedConnections.has(key)) {
      addedConnections.add(key);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        p1.clone(),
        pointsArray[closestIndex].position.clone()
      ]);
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.8,
        transparent: true
      });
      const line = new THREE.Line(geometry, material);
      connectionsGroup.add(line);
    }
  }
  // Add the connections group as a child of pointsGroup so they rotate together
  pointsGroup.add(connectionsGroup);

  // Add lights to the scene
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
  // Remove any existing lights from the scene
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
  // Slowly spin the entire points group (which now includes both points and connections)
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
