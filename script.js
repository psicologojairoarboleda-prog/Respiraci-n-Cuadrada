let isRunning = false;
let currentCycle = 0;
const maxCycles = 4;
let isDuringIntro = false;
let animationFrameId = null;

const circle = document.getElementById('circle');
const instructionText = document.getElementById('instructionText');
const cycleText = document.getElementById('cycleText');
const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const largeProgress = document.getElementById('largeProgress');
const smallProgress = document.getElementById('smallProgress');
const bgAudio = document.getElementById('bgAudio');

bgAudio.volume = 0.12;

const audios = {
    1: document.getElementById('audio1'),
    2: document.getElementById('audio2'),
    3: document.getElementById('audio3'),
    4: document.getElementById('audio4'),
    5: document.getElementById('audio5'),
    6: document.getElementById('audio6'),
    7: document.getElementById('audio7'),
    8: document.getElementById('audio8')
};

const LARGE_PERIMETER = 800;
const SMALL_PERIMETER = 400;

// Configuración de tiempos de introducción estricta para cada ciclo
const AUDIO_CONFIG = {
    4: { introFin: 3.5 },
    5: { introFin: 3.0 },
    6: { introFin: 3.0 },
    7: { introFin: 3.0 }
};

const BACKGROUND_START_SECOND = 4.0;

// Función blindada para forzar la reproducción limpia y evitar bloqueos del navegador
function playAudioDynamic(audioElem) {
    return new Promise((resolve) => {
        if (!audioElem) {
            resolve();
            return;
        }
        audioElem.currentTime = 0;
        let playPromise = audioElem.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                audioElem.onended = () => resolve();
            }).catch(error => {
                console.log("Reproducción bloqueada o error:", error);
                resolve();
            });
        } else {
            audioElem.onended = () => resolve();
        }
    });
}

function stopAllAudios() {
    Object.values(audios).forEach(a => {
        if (a) {
            a.pause();
            a.currentTime = 0;
            a.onended = null;
        }
    });
    bgAudio.pause();
    bgAudio.currentTime = 0;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

async function toggleExercise() {
    if (isRunning) {
        stopExercise();
    } else {
        startExercise();
    }
}

async function startExercise() {
    if (isRunning) return;
    isRunning = true;
    startBtn.textContent = 'Detener';
    startBtn.style.backgroundColor = '#d9534f';
    skipBtn.style.display = 'block';
    isDuringIntro = true;

    // Inicialización explícita del audio de fondo saltando el silencio inicial
    try {
        bgAudio.currentTime = BACKGROUND_START_SECOND;
        await bgAudio.play();
    } catch(e) {
        bgAudio.currentTime = 0;
        bgAudio.play().catch(err => console.log("Fondo bloqueado:", err));
    }

    instructionText.textContent = "Preparación...";
    await playAudioDynamic(audios[1]);
    if (!isRunning || !isDuringIntro) return;

    await playAudioDynamic(audios[2]);
    if (!isRunning || !isDuringIntro) return;

    instructionText.textContent = "Toma aire profundo...";
    await playAudioDynamic(audios[3]);
    if (!isRunning || !isDuringIntro) return;

    skipBtn.style.display = 'none';
    isDuringIntro = false;

    currentCycle = 0;
    runNextCycle();
}

function skipIntro() {
    if (!isDuringIntro) return;
    audios[1].pause();
    audios[2].pause();
    audios[3].pause();
    
    isDuringIntro = false;
    skipBtn.style.display = 'none';

    currentCycle = 0;
    runNextCycle();
}

function stopExercise() {
    isRunning = false;
    isDuringIntro = false;
    skipBtn.style.display = 'none';
    stopAllAudios();

    circle.style.transform = 'scale(1)';
    circle.style.backgroundColor = 'var(--primary-color)';
    circle.textContent = '--';
    instructionText.textContent = 'Haz clic en Iniciar';
    cycleText.textContent = 'Ciclo: 0 / 4';
    largeProgress.style.strokeDashoffset = LARGE_PERIMETER;
    smallProgress.style.strokeDashoffset = SMALL_PERIMETER;
    startBtn.textContent = 'Iniciar Respiración';
    startBtn.style.backgroundColor = 'var(--primary-color)';
}

function runNextCycle() {
    if (!isRunning) return;

    currentCycle++;
    if (currentCycle > maxCycles) {
        finishSession();
        return;
    }

    cycleText.textContent = `Ciclo: ${currentCycle} / ${maxCycles}`;

    let audioIndex = currentCycle + 3;
    let cycleAudio = audios[audioIndex];

    if (!cycleAudio) return;

    // Cuadrados congelados durante la intro hablada
    largeProgress.style.strokeDashoffset = LARGE_PERIMETER;
    smallProgress.style.strokeDashoffset = SMALL_PERIMETER;
    circle.textContent = '--';
    instructionText.textContent = "Escucha la guía...";

    let config = AUDIO_CONFIG[audioIndex] || { introFin: 3.0 };
    let introOffset = config.introFin;

    cycleAudio.currentTime = 0;
    cycleAudio.play().then(() => {
        let totalDuration = cycleAudio.duration;
        let activeDuration = totalDuration - introOffset;
        if (activeDuration < 10) activeDuration = 16; 

        let phaseDuration = activeDuration / 4; 
        let startTime = null;

        function animateCycle(timestamp) {
            if (!isRunning) return;
            if (!startTime) startTime = timestamp;

            let elapsed = (timestamp - startTime) / 1000;

            // Congelados estrictos durante la introducción de cada ciclo
            if (elapsed < introOffset) {
                largeProgress.style.strokeDashoffset = LARGE_PERIMETER;
                smallProgress.style.strokeDashoffset = SMALL_PERIMETER;
                circle.textContent = '--';
                animationFrameId = requestAnimationFrame(animateCycle);
                return;
            }

            let activeTime = elapsed - introOffset;
            let currentPhaseIndex = Math.floor(activeTime / phaseDuration);

            if (currentPhaseIndex > 3) {
                currentPhaseIndex = 3;
            }

            let phaseElapsed = activeTime - (currentPhaseIndex * phaseDuration);
            let phaseProgress = Math.min(phaseElapsed / phaseDuration, 1);

            // Cuadrado Grande: Avanza por fase
            let largeStartOffset = LARGE_PERIMETER - (currentPhaseIndex * 200);
            let largeTargetOffset = largeStartOffset - (200 * phaseProgress);
            largeProgress.style.strokeDashoffset = largeTargetOffset;

            // Cuadrado Pequeño: Se mueve solo durante el conteo (1, 2, 3, 4)
            let secondDuration = phaseDuration / 4;
            let currentSecond = Math.min(Math.floor(phaseElapsed / secondDuration) + 1, 4);
            circle.textContent = currentSecond;

            let secondProgress = (phaseElapsed % secondDuration) / secondDuration;
            let smallOffset = SMALL_PERIMETER - (((currentSecond - 1) * 100) + (100 * secondProgress));
            smallProgress.style.strokeDashoffset = smallOffset;

            if (currentPhaseIndex === 0) {
                instructionText.textContent = "1. INHALA por la nariz";
                largeProgress.style.stroke = varColor('--accent-inhale');
                smallProgress.style.stroke = "#ffffff";
                circle.style.backgroundColor = varColor('--accent-inhale');
            } else if (currentPhaseIndex === 1) {
                instructionText.textContent = "2. SOSTÉN EL AIRE";
                largeProgress.style.stroke = varColor('--accent-hold1');
                smallProgress.style.stroke = "#ffffff";
                circle.style.backgroundColor = varColor('--accent-hold1');
            } else if (currentPhaseIndex === 2) {
                instructionText.textContent = "3. EXHALA despacio";
                largeProgress.style.stroke = varColor('--accent-exhale');
                smallProgress.style.stroke = "#ffffff";
                circle.style.backgroundColor = varColor('--accent-exhale');
            } else if (currentPhaseIndex === 3) {
                instructionText.textContent = "4. SOSTÉN EN VACÍO";
                largeProgress.style.stroke = varColor('--accent-hold2');
                smallProgress.style.stroke = "#ffffff";
                circle.style.backgroundColor = varColor('--accent-hold2');
            }

            if (activeTime < activeDuration) {
                animationFrameId = requestAnimationFrame(animateCycle);
            }
        }

        animationFrameId = requestAnimationFrame(animateCycle);

    }).catch(e => console.log("Audio play error:", e));

    cycleAudio.onended = () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (isRunning) {
            runNextCycle();
        }
    };
}

function varColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function finishSession() {
    instructionText.textContent = 'Regresando a tu ritmo natural...';
    cycleText.textContent = 'Completado';
    
    await playAudioDynamic(audios[8]);
    
    instructionText.textContent = '¡Excelente trabajo!';
    stopExercise();
}
