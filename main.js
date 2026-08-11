// --- Mod Codes System ---
let keyBuffer = "";
let superSprintActive = false;
let infiniteStaminaActive = false;

function showModNotification(text) {
    const notif = document.getElementById('mod-notification');
    notif.innerText = text;
    notif.style.display = 'block';
    setTimeout(() => { notif.style.display = 'none'; }, 3000);
}

window.addEventListener('keypress', (e) => {
    keyBuffer += e.key;
    if (keyBuffer.length > 20) keyBuffer = keyBuffer.slice(-20);
    if (keyBuffer.includes("120213")) {
        superSprintActive = true;
        showModNotification("MOD ACTIVATED: SUPER SPRINT");
        keyBuffer = "";
    }
    if (keyBuffer.includes("121313")) {
        infiniteStaminaActive = true;
        showModNotification("MOD ACTIVATED: INFINITE STAMINA");
        keyBuffer = "";
    }
});

// --- 1. Core Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.08); 

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let currentLevel = 100;
let hasStarted = false;
let jumpScareTriggered = false;

// --- 2. Procedural Audio Engine & Jumpscare Audio ---
let audioCtx = null;
let ambientGain = null;
let sfxGain = null;
let isAudioSetup = false;

// Local Audio Object
const jumpscareAudio = new Audio('creepy-scream.mp3');
jumpscareAudio.volume = 1.0;

const volAmbientSlider = document.getElementById('vol-ambient');
const volSfxSlider = document.getElementById('vol-sfx');

volAmbientSlider.addEventListener('input', (e) => {
    document.getElementById('lbl-ambient').innerText = Math.round(e.target.value * 100) + '%';
    if (ambientGain) ambientGain.gain.setValueAtTime(e.target.value, audioCtx.currentTime);
});
volSfxSlider.addEventListener('input', (e) => {
    document.getElementById('lbl-sfx').innerText = Math.round(e.target.value * 100) + '%';
    if (sfxGain) sfxGain.gain.setValueAtTime(e.target.value, audioCtx.currentTime);
});

function initProceduralAudio() {
    if (isAudioSetup) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    ambientGain = audioCtx.createGain();
    sfxGain = audioCtx.createGain();
    
    ambientGain.gain.value = volAmbientSlider.value;
    sfxGain.gain.value = volSfxSlider.value;

    ambientGain.connect(audioCtx.destination);
    sfxGain.connect(audioCtx.destination);

    const bufferSize = audioCtx.sampleRate * 5;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02; 
        lastOut = output[i];
        output[i] *= 3.5; 
    }
    const rainSource = audioCtx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, audioCtx.currentTime);

    const lfo = audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime); 
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(250, audioCtx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    rainSource.connect(filter);
    filter.connect(ambientGain);
    rainSource.start();

    isAudioSetup = true;

    setInterval(playThunder, 12000); 
    setInterval(playWhisper, 7000);  
    setInterval(playChildVoice, 15000); 
}

function playThunder() {
    if (!audioCtx || Math.random() > 0.4) return; 
    const bufferSize = audioCtx.sampleRate * 4; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0; i<bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150 + Math.random() * 150; 
    
    const localGain = audioCtx.createGain();
    localGain.gain.setValueAtTime(0, audioCtx.currentTime);
    localGain.gain.linearRampToValueAtTime(1.5, audioCtx.currentTime + 0.2); 
    localGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 3.5); 
    
    source.connect(filter);
    filter.connect(localGain);
    localGain.connect(sfxGain);
    source.start();
}

function playWhisper() {
    if (!audioCtx || currentLevel > 30 || Math.random() > 0.6) return; 
    const bufferSize = audioCtx.sampleRate * 2; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600 + Math.random() * 800; 
    filter.Q.value = 6 + Math.random() * 4; 
    
    const localGain = audioCtx.createGain();
    localGain.gain.setValueAtTime(0, audioCtx.currentTime);
    localGain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.5);
    localGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
    
    source.connect(filter);
    filter.connect(localGain);
    localGain.connect(sfxGain);
    source.start();
}

function playChildVoice() {
    const sfxVal = parseFloat(volSfxSlider.value);
    if (!hasStarted || currentLevel > 75 || sfxVal <= 0 || Math.random() > 0.5) return;

    const u1 = new SpeechSynthesisUtterance("I would");
    u1.pitch = 1.9; u1.rate = 0.85; u1.volume = sfxVal;

    const u2 = new SpeechSynthesisUtterance("never");
    u2.pitch = 0.3; u2.rate = 0.6; u2.volume = sfxVal;

    const u3 = new SpeechSynthesisUtterance("lie to you");
    u3.pitch = 1.9; u3.rate = 0.85; u3.volume = sfxVal;

    window.speechSynthesis.speak(u1);
    window.speechSynthesis.speak(u2);
    window.speechSynthesis.speak(u3);
}

function playJumpscareScream() {
    jumpscareAudio.currentTime = 0;
    jumpscareAudio.volume = 1.0;
    jumpscareAudio.play().catch(e => console.log("Audio play blocked:", e));
}

// --- 3. UI, Controls & Horror Text Setup ---
const controls = new THREE.PointerLockControls(camera, document.body);
const startMenu = document.getElementById('instructions-menu');
const settingsMenu = document.getElementById('settings-menu');
const crosshair = document.getElementById('crosshair');
const staminaUI = document.getElementById('stamina-container');
const hotbarUI = document.getElementById('hotbar');
const resumeBtn = document.getElementById('resume-btn');
const horrorTextEl = document.getElementById('horror-text');

const horrorMessages = [
    "DON'T KEEP GOING",
    "DON'T LISTEN TO THE GIRL",
    "THE VOICES ARE LYING"
];
let totalStepsTaken = 0;
let isHorrorTextActive = false;
let stepCooldown = 0;

function triggerHorrorText() {
    if (isHorrorTextActive) return;
    isHorrorTextActive = true;

    const randomMsg = horrorMessages[Math.floor(Math.random() * horrorMessages.length)];
    horrorTextEl.innerText = randomMsg;

    const randomTop = 35 + Math.random() * 30; 
    const randomLeft = 20 + Math.random() * 60; 
    horrorTextEl.style.top = `${randomTop}%`;
    horrorTextEl.style.left = `${randomLeft}%`;
    horrorTextEl.style.transform = `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 10}deg)`;

    horrorTextEl.style.display = 'block';

    setTimeout(() => {
        horrorTextEl.style.display = 'none';
        isHorrorTextActive = false;
    }, 1200);
}

startMenu.addEventListener('click', () => controls.lock());
resumeBtn.addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
    startMenu.style.display = 'none';
    settingsMenu.style.display = 'none';
    crosshair.style.display = 'block';
    staminaUI.style.display = 'block';
    hotbarUI.style.display = 'flex';
    hasStarted = true;

    initProceduralAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
});

controls.addEventListener('unlock', () => {
    if (hasStarted && !jumpScareTriggered) {
        settingsMenu.style.display = 'block'; 
    }
    crosshair.style.display = 'none';
    staminaUI.style.display = 'none';
    hotbarUI.style.display = 'none';
});

scene.add(controls.getObject());

const ambientLight = new THREE.AmbientLight(0xffffff, 0.01);
scene.add(ambientLight);
const flashlight = new THREE.PointLight(0xdddddd, 1.0, 14);
camera.add(flashlight);

// --- Create Monster Face Texture from user image ---
const textureLoader = new THREE.TextureLoader();
const monsterTexture = textureLoader.load('image_8211bd.png');

const monsterGeo = new THREE.PlaneGeometry(3.5, 3.5);
const monsterMat = new THREE.MeshBasicMaterial({ map: monsterTexture, transparent: true });
const jumpscareMonster = new THREE.Mesh(monsterGeo, monsterMat);
jumpscareMonster.position.set(0, 0, -1.5);
jumpscareMonster.visible = false;
camera.add(jumpscareMonster);

function triggerJumpScare() {
    if (jumpScareTriggered) return;
    jumpScareTriggered = true;

    controls.unlock();
    settingsMenu.style.display = 'none';
    crosshair.style.display = 'none';
    staminaUI.style.display = 'none';
    hotbarUI.style.display = 'none';

    jumpscareMonster.visible = true;
    playJumpscareScream();

    let shakeTime = 0;
    const shakeInterval = setInterval(() => {
        shakeTime += 0.05;
        camera.position.x = (Math.random() - 0.5) * 0.4;
        camera.position.y = 1.6 + (Math.random() - 0.5) * 0.4;
        if (shakeTime > 2.5) {
            clearInterval(shakeInterval);
            document.body.style.backgroundColor = '#000';
            camera.position.set(0, 1.6, 0);
            jumpscareMonster.visible = false;
            window.location.reload(); // Restarts the game completely
        }
    }, 20);
}

// --- 4. Inventory System ---
let inventory = [null, null, null];
let activeSlotIndex = 0;
const collectibleCrosses = []; 

const heldCrossGroup = new THREE.Group();
const crossMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xff8800, emissiveIntensity: 1 });
const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), crossMat);
const hBeam = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.04), crossMat);
hBeam.position.y = 0.05;
heldCrossGroup.add(vBeam, hBeam);

const crossGlow = new THREE.PointLight(0xffaa00, 1.2, 8);
heldCrossGroup.add(crossGlow);

heldCrossGroup.position.set(0.4, -0.4, -0.6);
heldCrossGroup.rotation.set(-0.2, 0.3, -0.1);
heldCrossGroup.visible = false;
camera.add(heldCrossGroup);

function updateInventoryUI() {
    for(let i=0; i<3; i++) {
        const slotEl = document.getElementById(`slot-${i}`);
        if (i === activeSlotIndex) slotEl.classList.add('active');
        else slotEl.classList.remove('active');

        if (inventory[i] === 'cross') slotEl.classList.add('filled');
        else slotEl.classList.remove('filled');
    }
    heldCrossGroup.visible = (inventory[activeSlotIndex] === 'cross');
}

// --- 5. Optimized World Generation ---
const START_LEVEL_Y = 100;
const TOTAL_LEVELS = 100;
const STEP_WIDTH = 4.0;
const STEP_DEPTH = 0.3;
const STEP_HEIGHT = 0.18;
const STEPS_PER_FLIGHT = 18;
const LANDING_DEPTH = 3.5;
const FLIGHT_Z_LENGTH = STEPS_PER_FLIGHT * STEP_DEPTH;
const FLIGHT_Y_DROP = STEPS_PER_FLIGHT * STEP_HEIGHT;
const MODULE_DEPTH = LANDING_DEPTH + FLIGHT_Z_LENGTH;

const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.9, metalness: 0.1 });
const stepGeometry = new THREE.BoxGeometry(STEP_WIDTH, STEP_HEIGHT, STEP_DEPTH);
const postGeo = new THREE.BoxGeometry(0.06, 1.2, 0.06);
const wellGeo = new THREE.CylinderGeometry(1.2, 1.2, 15, 16);
const wellMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); 

const levelChunks = [];
scene.add(new THREE.Group()); 

function createSignTexture(levelNumber) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, 512, 256);
    for(let i = 0; i < 200; i++) { 
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.8})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 256, Math.random() * 15, Math.random() * 15);
    }
    ctx.fillStyle = '#660000'; 
    ctx.font = 'bold 80px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${levelNumber}`, 256, 120);
    ctx.font = 'italic 26px "Courier New"';
    ctx.fillStyle = '#330000';
    const phrases = ["DON'T LOOK DOWN", "KEEP MOVING", "NO GOING BACK", "IT HEARS YOU", "ALMOST THERE"];
    ctx.fillText(phrases[(100 - levelNumber) % phrases.length], 256, 190);
    return new THREE.CanvasTexture(canvas);
}

for (let l = 0; l < TOTAL_LEVELS; l++) {
    const levelChunk = new THREE.Group();
    const levelNum = 100 - l;
    const baseY = START_LEVEL_Y - (l * FLIGHT_Y_DROP);
    const baseZ = - (l * MODULE_DEPTH);

    const landing = new THREE.Mesh(new THREE.BoxGeometry(STEP_WIDTH, STEP_HEIGHT, LANDING_DEPTH), darkMaterial);
    landing.position.set(0, baseY - (STEP_HEIGHT/2), baseZ - (LANDING_DEPTH/2));
    levelChunk.add(landing);

    const lWall = new THREE.Mesh(new THREE.PlaneGeometry(LANDING_DEPTH, 12), darkMaterial);
    lWall.rotation.y = Math.PI / 2;
    lWall.position.set(- (STEP_WIDTH/2), baseY + 5, baseZ - (LANDING_DEPTH/2));
    levelChunk.add(lWall);

    const signMat = new THREE.MeshBasicMaterial({ map: createSignTexture(levelNum) });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.25), signMat);
    sign.position.set(- (STEP_WIDTH/2) + 0.02, baseY + 1.5, baseZ - (LANDING_DEPTH/2));
    sign.rotation.y = Math.PI / 2;
    levelChunk.add(sign);

    const well = new THREE.Mesh(wellGeo, wellMat);
    well.position.set((STEP_WIDTH/2) + 2.0, baseY - 5, baseZ - (LANDING_DEPTH/2));
    levelChunk.add(well);
    
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, LANDING_DEPTH), darkMaterial);
    rail.position.set((STEP_WIDTH/2) - 0.1, baseY + 0.5, baseZ - (LANDING_DEPTH/2));
    levelChunk.add(rail);

    if (Math.random() < 0.05) {
        const worldCross = new THREE.Group();
        const wv = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), crossMat);
        const wh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), crossMat);
        wh.position.y = 0.15;
        worldCross.add(wv, wh);
        
        const randX = (Math.random() * (STEP_WIDTH - 1)) - (STEP_WIDTH/2) + 0.5;
        const randZ = baseZ - (Math.random() * (LANDING_DEPTH - 1)) - 0.5;
        worldCross.position.set(randX, baseY + 0.4, randZ);
        
        worldCross.userData.isCollectible = true; 
        worldCross.userData.chunkIndex = l; 
        
        levelChunk.add(worldCross);
        collectibleCrosses.push(worldCross);
    }

    let currentStairY = baseY;
    let currentStairZ = baseZ - LANDING_DEPTH;
    for (let s = 0; s < STEPS_PER_FLIGHT; s++) {
        currentStairY -= STEP_HEIGHT;
        const boxZ = currentStairZ - (STEP_DEPTH / 2);
        const boxY = currentStairY - (STEP_HEIGHT / 2);

        const step = new THREE.Mesh(stepGeometry, darkMaterial);
        step.position.set(0, boxY, boxZ);
        levelChunk.add(step);

        if (s % 3 === 0) {
            const post = new THREE.Mesh(postGeo, darkMaterial);
            post.position.set((STEP_WIDTH/2) - 0.1, currentStairY + 0.6, boxZ);
            levelChunk.add(post);
        }
        currentStairZ -= STEP_DEPTH;
    }

    const sWallLength = Math.sqrt(Math.pow(FLIGHT_Z_LENGTH, 2) + Math.pow(FLIGHT_Y_DROP, 2));
    const sWall = new THREE.Mesh(new THREE.PlaneGeometry(sWallLength, 12), darkMaterial);
    sWall.rotation.y = Math.PI / 2;
    sWall.rotation.z = Math.atan2(STEP_HEIGHT, STEP_DEPTH);
    sWall.position.set(- (STEP_WIDTH/2), baseY - (FLIGHT_Y_DROP / 2) + 5, baseZ - LANDING_DEPTH - (FLIGHT_Z_LENGTH / 2));
    levelChunk.add(sWall);

    scene.add(levelChunk);
    levelChunks.push(levelChunk);
}

// --- Lurking Monster (Bottom of the stairs) ---
const lurkingGeo = new THREE.PlaneGeometry(25, 25);
const lurkingMat = new THREE.MeshBasicMaterial({ map: monsterTexture, transparent: true, opacity: 0 });
const lurkingMonster = new THREE.Mesh(lurkingGeo, lurkingMat);
const bottomLevelY = START_LEVEL_Y - (99 * FLIGHT_Y_DROP);
const bottomLevelZ = -(99 * MODULE_DEPTH);
lurkingMonster.position.set(0, bottomLevelY + 5, bottomLevelZ - 15);
scene.add(lurkingMonster);

// --- 6. Input & Movement ---
const keys = { w: false, a: false, s: false, d: false, shift: false };
let stamina = 100;
let isExhausted = false;
const clock = new THREE.Clock();
let deepestZ = 0; 

let frameCount = 0;
let lastTime = performance.now();
const fpsDisplay = document.getElementById('fps-counter');

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'shift') keys.shift = true;
    if (keys.hasOwnProperty(key)) keys[key] = true;
    
    if (e.key === '1') { activeSlotIndex = 0; updateInventoryUI(); }
    if (e.key === '2') { activeSlotIndex = 1; updateInventoryUI(); }
    if (e.key === '3') { activeSlotIndex = 2; updateInventoryUI(); }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'shift') keys.shift = false;
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

camera.position.set(0, START_LEVEL_Y + 1.6, 0);

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const now = performance.now();

    frameCount++;
    if (now >= lastTime + 1000) {
        fpsDisplay.innerText = `FPS: ${Math.round((frameCount * 1000) / (now - lastTime))}`;
        frameCount = 0;
        lastTime = now;
    }

    if (controls.isLocked && !jumpScareTriggered) {
        const isMoving = keys.w || keys.s || keys.a || keys.d;
        const isSprinting = keys.shift && isMoving && (!isExhausted || infiniteStaminaActive) && (stamina > 0 || infiniteStaminaActive);

        if (isSprinting && !infiniteStaminaActive) {
            stamina -= 35 * delta;
            if (stamina <= 0) { stamina = 0; isExhausted = true; staminaUI.querySelector('#stamina-bar-fill').style.backgroundColor = '#330000'; }
        } else if (!infiniteStaminaActive) {
            stamina += 20 * delta;
            if (stamina >= 100) { stamina = 100; isExhausted = false; staminaUI.querySelector('#stamina-bar-fill').style.backgroundColor = '#660000'; } 
            else if (stamina > 20 && isExhausted) { isExhausted = false; staminaUI.querySelector('#stamina-bar-fill').style.backgroundColor = '#660000'; }
        } else {
            stamina = 100;
            staminaUI.querySelector('#stamina-bar-fill').style.backgroundColor = '#0055ff'; 
        }
        staminaUI.querySelector('#stamina-bar-fill').style.width = `${(stamina / 100) * 100}%`;

        const baseMoveSpeed = isSprinting ? (superSprintActive ? 16.0 : 8.0) : 4.0;
        const actualSpeed = baseMoveSpeed * delta;
        const cameraObj = controls.getObject();

        if (keys.w) controls.moveForward(actualSpeed);
        if (keys.s) controls.moveForward(-actualSpeed);
        if (keys.a) controls.moveRight(-actualSpeed);
        if (keys.d) controls.moveRight(actualSpeed);

        if (isMoving) {
            totalStepsTaken += actualSpeed;
            stepCooldown += actualSpeed;

            if (stepCooldown > 5.0) {
                stepCooldown = 0;
                const currentPopChance = Math.min(0.35, totalStepsTaken * 0.0003);
                if (Math.random() < currentPopChance) {
                    triggerHorrorText();
                }
            }
        }

        cameraObj.position.x = Math.max(-1.6, Math.min(1.6, cameraObj.position.x));

        if (cameraObj.position.z < deepestZ) deepestZ = cameraObj.position.z;
        if (cameraObj.position.z > deepestZ + 0.3) cameraObj.position.z = deepestZ + 0.3;
        if (cameraObj.position.z > 0) cameraObj.position.z = 0;

        const absZ = Math.abs(cameraObj.position.z);
        const moduleIndex = Math.floor(absZ / MODULE_DEPTH);
        currentLevel = 100 - moduleIndex; 

        if (currentLevel === 1 && absZ > (99 * MODULE_DEPTH) + LANDING_DEPTH + 1.5) {
            triggerJumpScare();
        }

        for (let i = 0; i < TOTAL_LEVELS; i++) {
            levelChunks[i].visible = Math.abs(i - moduleIndex) <= 1;
        }

        const localZ = absZ % MODULE_DEPTH;
        const baseModuleY = START_LEVEL_Y - (moduleIndex * FLIGHT_Y_DROP);
        if (localZ <= LANDING_DEPTH) {
            cameraObj.position.y = baseModuleY + 1.6;
        } else {
            const stairIndex = Math.floor((localZ - LANDING_DEPTH) / STEP_DEPTH);
            cameraObj.position.y = baseModuleY - ((stairIndex + 1) * STEP_HEIGHT) + 1.6;
        }
        
        if (isMoving && inventory[activeSlotIndex] === 'cross') {
            const bobSpeed = isSprinting ? 15 : 8;
            heldCrossGroup.position.y = -0.4 + Math.sin(clock.elapsedTime * bobSpeed) * 0.03;
        }

        for (let i = collectibleCrosses.length - 1; i >= 0; i--) {
            const cross = collectibleCrosses[i];
            if (levelChunks[cross.userData.chunkIndex].visible) {
                cross.rotation.y += 1.5 * delta; 

                if (cameraObj.position.distanceTo(cross.position) < 2.0) {
                    const emptyIndex = inventory.indexOf(null);
                    if (emptyIndex !== -1) {
                        inventory[emptyIndex] = 'cross';
                        updateInventoryUI();
                        levelChunks[cross.userData.chunkIndex].remove(cross);
                        collectibleCrosses.splice(i, 1);
                    }
                }
            }
        }
        
        // Unveil the Lurking Monster once you reach Level 6 or below
        if (currentLevel <= 6) {
            lurkingMonster.material.opacity = Math.min(0.5, lurkingMonster.material.opacity + delta * 0.15);
            lurkingMonster.position.y = bottomLevelY + 5 + Math.sin(clock.elapsedTime * 1.2) * 0.8;
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

updateInventoryUI();
animate();
