// app.js

let scene, camera, renderer;
let dotsGroup;          // A group to hold all the dot meshes
let animationFrameId;   // To manage requestAnimationFrame

// Some default settings
const DEFAULT_NUMBER = "12345";

// Rotation speeds for x, y, z axes (we’ll use the last digit for speed)
let rotationSpeed = 0.01;

// Initialize
initScene();
renderScene(DEFAULT_NUMBER); // Render with default on initial load

// -----------------------
// 1. Scene Initialization
// -----------------------
function initScene() {
  // Create the scene
  scene = new THREE.Scene();
  
  // Create a perspective camera
  camera = new THREE.PerspectiveCamera(
    75,                       // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1,                      // Near clipping
    1000                      // Far clipping
  );
  camera.position.z = 50;     // Pull camera back so we can see the dots

  // Create the renderer and add it to our container
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  // Handle window resizing
  window.addEventListener("resize", onWindowResize, false);

  // Setup an ambient light (optional)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  // Setup a directional light (optional)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(10, 10, 10);
  scene.add(dirLight);

  // Listen to the update button click
  document.getElementById("updateBtn").addEventListener("click", () => {
    const inputVal = document.getElementById("digitInput").value.trim();
    // Validate the input, ensure it’s exactly 5 digits
    const isFiveDigits = /^[0-9]{5}$/.test(inputVal);
    if (!isFiveDigits) {
      alert("Please enter a valid 5-digit number (e.g., 12345).");
      return;
    }
    // Re-render the scene with the new number
    renderScene(inputVal);
  });
}

// ---------------------------------
// 2. Rendering / Creating the Dots
// ---------------------------------
function renderScene(numberStr) {
  // Cancel any ongoing animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Clear old dots from the scene if they exist
  if (dotsGroup) {
    scene.remove(dotsGroup);
    dotsGroup.traverse((obj) => {
      if (obj.isMesh) obj.geometry.dispose();
    });
  }

  // Parse the 5 digits
  const digits = numberStr.split("").map(d => parseInt(d, 10));
  // Example mapping:
  // digit[0] -> number of dots along X
  // digit[1] -> number of dots along Y
  // digit[2] -> number of dots along Z
  // digit[3] -> spacing between dots
  // digit[4] -> rotation speed (and optional color offset)

  const xCount = Math.max(digits[0], 1);
  const yCount = Math.max(digits[1], 1);
  const zCount = Math.max(digits[2], 1);
  const spacing = digits[3] === 0 ? 1 : digits[3]; // Avoid zero spacing
  rotationSpeed = digits[4] * 0.005 + 0.005; // e.g. digit 5 => speed from 0.005 to 0.05

  // Create a group to hold the dots
  dotsGroup = new THREE.Group();
  
  // Optional color offset from last digit
  const colorOffset = digits[4] * 30; // Shift hue by increments

  // Geometry & material
  const geometry = new THREE.SphereGeometry(0.3, 8, 8);

  // We’ll loop through xCount, yCount, zCount
  for (let x = 0; x < xCount; x++) {
    for (let y = 0; y < yCount; y++) {
      for (let z = 0; z < zCount; z++) {
        // Create a mesh
        // Color can be a function of x, y, z plus offset
        const hue = ((x + y + z) * 5 + colorOffset) % 360;
        const color = new THREE.Color(`hsl(${hue}, 100%, 50%)`);
        const material = new THREE.MeshStandardMaterial({ color });

        const dot = new THREE.Mesh(geometry, material);

        // Position the dot
        dot.position.set(
          x * spacing - ((xCount - 1) * spacing) / 2,
          y * spacing - ((yCount - 1) * spacing) / 2,
          z * spacing - ((zCount - 1) * spacing) / 2
        );

        dotsGroup.add(dot);
      }
    }
  }

  // Add the group to the scene
  scene.add(dotsGroup);

  // Begin animation
  animate();
}

// ------------------------
// 3. Animation & Rendering
// ------------------------
function animate() {
  // Rotate the dots group
  if (dotsGroup) {
    dotsGroup.rotation.x += rotationSpeed;
    dotsGroup.rotation.y += rotationSpeed;
  }

  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(animate);
}

// ----------------------------
// 4. Handle Window Resize
// ----------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
