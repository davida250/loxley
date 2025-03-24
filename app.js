// Global variables
let scene, camera, renderer;
let controls;        // OrbitControls
let pointsGroup;     // Group holding the points
let sphereWireframe; // Wireframe for sphere outline
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

  // Remove previous wireframe if exists
  if (sphereWireframe) {
    scene.remove(sphereWireframe);
    sphereWireframe.geometry.dispose();
    sphereWireframe.material.dispose();
  }

  // Create a new group for points
  pointsGroup = new THREE.Group();
  scene.add(pointsGroup);

  // Use the 5-digit string as a seed for consistent "random" distribution
  const seed = parseInt(numberString, 10);
  let pseudoRandom = seededRandom(seed);

  // Decide how many points (40-80)
  const totalPoints = 40 + Math.floor(pseudoRandom() * 41); // 40 to 80

  // Set the sphere's radius
  const sphereRadius = 15;

  // For color generation, derive a base hue from the seed
  const hueBase = (seed % 360) / 360; // base hue from the seed (0-1)

  // Create points that live on the surface of the sphere
  for (let i = 0; i < totalPoints; i++) {
    // All points lie on the surface so r = sphereRadius
    const r = sphereRadius;

    // Random angles in spherical coordinates
    const theta = pseudoRandom() * Math.PI * 2; // 0..2π
    const phi = Math.acos((pseudoRandom() * 2) - 1); // 0..π

    // Convert spherical to Cartesian coordinates
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    // Create a small sphere for the point (half the previous size)
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);

    // Generate a brighter color (increased lightness) using HSL
    const hue = (hueBase + pseudoRandom()) % 1.0;
    const color = new THREE.Color().setHSL(hue, 0.8, 0.7); // brighter lightness
    const material = new THREE.MeshStandardMaterial({ color });

    const pointMesh = new THREE.Mesh(geometry, material);
    pointMesh.position.set(x, y, z);
    pointsGroup.add(pointMesh);
  }

  // Add a light blue wireframe sphere to outline the boundary
  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
  const wireframeGeo = new THREE.WireframeGeometry(sphereGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xadd8e6, opacity: 0.5, transparent: true });
  sphereWireframe = new THREE.LineSegments(wireframeGeo, lineMaterial);
  scene.add(sphereWireframe);

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
  // Slowly spin the entire points group
  if (pointsGroup) {
    pointsGroup.rotation.y += rotationSpeed;
    pointsGroup.rotation.x += rotationSpeed * 0.5;
  }

  // Also rotate the wireframe sphere in sync
  if (sphereWireframe) {
    sphereWireframe.rotation.y += rotationSpeed;
    sphereWireframe.rotation.x += rotationSpeed * 0.5;
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
