// Global variables
let scene, camera, renderer;
let controls;        // OrbitControls
let pointsGroup;     // Group holding the points and connections
let animationFrameId;
let rotationSpeed = 0.0005; // Slow spin

// Default 5-digit number seed
const DEFAULT_SEED = "12345";

// Initialize the scene
initScene();

// Render the scene with the default seed
createSphereWithSeed(DEFAULT_SEED);

// --------------------
// initScene() function
// --------------------
function initScene() {
  // Create scene and camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60, // FOV
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
  );
  camera.position.set(0, 0, 40);

  // Create renderer and attach to container
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  // Set up OrbitControls for mouse interaction
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Handle window resize
  window.addEventListener("resize", onWindowResize, false);

  // Set up update button
  document.getElementById("updateBtn").addEventListener("click", () => {
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

  // Remove previous points group if it exists
  if (pointsGroup) {
    scene.remove(pointsGroup);
    pointsGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    });
  }

  // Create a new group for points and connections
  pointsGroup = new THREE.Group();
  scene.add(pointsGroup);

  // Use the 5-digit string as a seed for deterministic randomness
  const seed = parseInt(numberString, 10);
  let pseudoRandom = seededRandom(seed);

  // Determine total points (between 40 and 80)
  const totalPoints = 40 + Math.floor(pseudoRandom() * 41);

  // Sphere radius constant
  const sphereRadius = 15;

  // Derive a base hue from the seed (0-1 range)
  const hueBase = (seed % 360) / 360;

  // Array to store point meshes for computing connections
  const pointsArray = [];

  // Create points on the surface of the sphere
  for (let i = 0; i < totalPoints; i++) {
    // All points lie on the sphere's surface
    const r = sphereRadius;
    // Random spherical coordinates
    const theta = pseudoRandom() * Math.PI * 2;
    const phi = Math.acos((pseudoRandom() * 2) - 1);
    // Convert to Cartesian coordinates
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    // Create a sphere geometry for the point (radius 0.3, 1.5x larger than before)
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    // Generate a colored material with an ambient (emissive) tint.
    // Adjusted so the point is 2x brighter and not too white.
    const hue = (hueBase + pseudoRandom()) % 1.0;
    const pointColor = new THREE.Color().setHSL(hue, 0.8, 0.8);
    const material = new THREE.MeshStandardMaterial({ 
      color: pointColor, 
      emissive: pointColor, 
      emissiveIntensity: 1.0 
    });
    
    const pointMesh = new THREE.Mesh(geometry, material);
    pointMesh.position.set(x, y, z);
    pointsGroup.add(pointMesh);
    pointsArray.push(pointMesh);
  }

  // Create connections group for lines
  const connectionsGroup = new THREE.Group();
  // Use a set to avoid duplicate lines
  const addedConnections = new Set();

  // Connect each point to its 3 closest neighbors
  for (let i = 0; i < pointsArray.length; i++) {
    const p1 = pointsArray[i].position;
    // Build an array of distances from point i to all other points
    let distances = [];
    for (let j = 0; j < pointsArray.length; j++) {
      if (i === j) continue;
      const p2 = pointsArray[j].position;
      const dist = p1.distanceTo(p2);
      distances.push({ index: j, distance: dist });
    }
    // Sort distances in ascending order
    distances.sort((a, b) => a.distance - b.distance);
    
    // Connect to the 3 closest neighbors
    let connections = 0;
    for (let k = 0; k < distances.length && connections < 3; k++) {
      const j = distances[k].index;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!addedConnections.has(key)) {
        addedConnections.add(key);
        const geometry = new THREE.BufferGeometry().setFromPoints([
          p1.clone(),
          pointsArray[j].position.clone()
        ]);
        const material = new THREE.LineBasicMaterial({
          color: 0xffffff,
          opacity: 0.8,
          transparent: true
        });
        const line = new THREE.Line(geometry, material);
        connectionsGroup.add(line);
        connections++;
      }
    }
  }
  // Add connections as a child so they rotate with the points
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
  // Remove any existing lights
  const oldLights = [];
  scene.traverse((obj) => {
    if (obj.isLight) oldLights.push(obj);
  });
  oldLights.forEach((light) => scene.remove(light));

  // Add ambient and directional lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 50, 50);
  scene.add(dirLight);
}

// -----------------------
// animate() - Render Loop
// -----------------------
function animate() {
  // Slowly spin the entire points group (points and connections)
  if (pointsGroup) {
    pointsGroup.rotation.y += rotationSpeed;
    pointsGroup.rotation.x += rotationSpeed * 0.5;
  }
  controls.update();
  renderer.render(scene, camera);
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
