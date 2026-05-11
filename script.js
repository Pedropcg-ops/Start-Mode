const STORAGE_KEY = "fraguaFocusLastSession";
const STORAGE_HISTORY_KEY = "fraguaFocusSessionHistory";
const INTRO_DURATION = 1700;
const COFFEE_MINUTES = 5;

const screens = {
  intro: document.getElementById("introScreen"),
  menu: document.getElementById("menuScreen"),
  duration: document.getElementById("durationScreen"),
  timer: document.getElementById("timerScreen"),
  coffee: document.getElementById("coffeeScreen"),
  complete: document.getElementById("completeScreen"),
};

const modeButtons = document.querySelectorAll("[data-mode]");
const durationButtons = document.querySelectorAll("[data-minutes]");
const selectedModeLabel = document.getElementById("selectedModeLabel");
const menuLastSession = document.getElementById("menuLastSession");
const customToggle = document.getElementById("customToggle");
const customDuration = document.getElementById("customDuration");
const customMinutes = document.getElementById("customMinutes");
const minusMinutes = document.getElementById("minusMinutes");
const plusMinutes = document.getElementById("plusMinutes");
const startCustom = document.getElementById("startCustom");
const timerModeLabel = document.getElementById("timerModeLabel");
const timerDisplay = document.getElementById("timerDisplay");
const workedTime = document.getElementById("workedTime");
const ascuasCard = document.getElementById("ascuasCard");
const ascuasMessage = document.getElementById("ascuasMessage");
const pauseResume = document.getElementById("pauseResume");
const finishSession = document.getElementById("finishSession");
const progressBar = document.getElementById("progressBar");
const progressMarks = document.getElementById("progressMarks");
const wakeStatus = document.getElementById("wakeStatus");
const coffeeTimer = document.getElementById("coffeeTimer");
const coffeeTitle = document.getElementById("coffeeTitle");
const coffeeSubtitle = document.getElementById("coffeeSubtitle");
const coffeeAscuasMessage = document.getElementById("coffeeAscuasMessage");
const completeSummary = document.getElementById("completeSummary");
const completeAscuasMessage = document.getElementById("completeAscuasMessage");
const sessionNoteInput = document.getElementById("sessionNoteInput");

const ascuaMessages = {
  Trabajo: {
    start: "Bien. Ya has encendido la primera chispa.",
    complete: "Sesión forjada. Has convertido tiempo en avance.",
  },
  Estudio: {
    start: "Empieza por lo que tienes delante. Una capa cada vez.",
    complete: "Has ganado claridad. Eso también se construye.",
  },
  Crear: {
    start: "No esperes la forma perfecta. Dale el primer golpe.",
    complete: "La idea ya ocupa un lugar más real.",
  },
  Organizar: {
    start: "Preparar el terreno también es avanzar.",
    complete: "Menos ruido. Más espacio para empezar mejor.",
  },
  Café: {
    start: "Pausa breve. No te enfríes.",
    complete: "Ahora sí. Vuelve con una intención clara.",
  },
};

const milestoneLabels = {
  10: "Primera chispa",
  15: "Primer tramo",
  20: "Buen ritmo",
  30: "Media fragua",
  45: "Última capa",
};

const modeAudio = {
  Trabajo: null,
  Estudio: null,
  Crear: null,
  Organizar: null,
  Café: null,
};

let selectedMode = "";
let selectedMinutes = 25;
let timerInterval = null;
let elapsedSeconds = 0;
let targetSeconds = 0;
let isPaused = false;
let activeTimerType = "focus";
let achievedMilestones = new Set();
let currentSessionRecord = null;
let wakeLock = null;
let shouldKeepScreenAwake = false;

function safeRead(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // La app sigue funcionando aunque localStorage no esté disponible.
  }
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen?.classList.remove("is-active"));
  screens[name]?.classList.add("is-active");
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatCoffeeTime(totalSeconds) {
  return formatTime(totalSeconds).replace(/^0/, "");
}

function readLastSession() {
  return safeRead(STORAGE_KEY, null);
}

function readHistory() {
  const history = safeRead(STORAGE_HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}

function saveLastSession(session) {
  safeWrite(STORAGE_KEY, session);
  updateLastSessionText();
}

function saveSessionToHistory(session) {
  const history = readHistory();
  const nextHistory = [session, ...history.filter((item) => item.date !== session.date)].slice(0, 20);
  safeWrite(STORAGE_HISTORY_KEY, nextHistory);
  saveLastSession(session);
}

function updateLastSessionText() {
  const last = readLastSession();
  const note = last?.note ? ` · ${last.note}` : "";
  const state = last?.completed === false ? "sin cerrar" : "completada";
  const text = last?.mode && last?.minutes ? `Última sesión: ${last.mode} · ${last.minutes} min · ${state}${note}` : "";

  if (menuLastSession) menuLastSession.textContent = text;
  if (last?.minutes && customMinutes) customMinutes.value = last.minutes;
}

async function requestWakeLock() {
  if (!wakeStatus) return;

  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeStatus.textContent = "Pantalla activa";
    } else {
      wakeLock = null;
      wakeStatus.textContent = "Pantalla activa no disponible";
    }
  } catch {
    wakeLock = null;
    wakeStatus.textContent = "Pantalla activa no disponible";
  }
}

async function releaseWakeLock() {
  shouldKeepScreenAwake = false;
  try {
    if (wakeLock) await wakeLock.release();
  } catch {
    // Algunos navegadores liberan el bloqueo automáticamente.
  } finally {
    wakeLock = null;
  }
}

function stopTimer() {
  window.clearInterval(timerInterval);
  timerInterval = null;
}

function getRemainingSeconds() {
  return Math.max(targetSeconds - elapsedSeconds, 0);
}

function updateTimerDisplay() {
  if (activeTimerType === "coffee") {
    if (coffeeTimer) coffeeTimer.textContent = formatCoffeeTime(getRemainingSeconds());
    return;
  }

  if (timerDisplay) timerDisplay.textContent = formatTime(getRemainingSeconds());
  if (workedTime) workedTime.textContent = `Tiempo trabajado: ${formatTime(elapsedSeconds)}`;
}

function updateProgress() {
  const progress = targetSeconds > 0 ? Math.min(elapsedSeconds / targetSeconds, 1) : 0;
  if (progressBar) progressBar.style.width = `${progress * 100}%`;
}

function flashAscuasCard() {
  if (!ascuasCard) return;
  ascuasCard.classList.remove("is-new");
  window.setTimeout(() => ascuasCard.classList.add("is-new"), 10);
}

function setAscuasMessage(message) {
  if (ascuasMessage) ascuasMessage.textContent = message;
  flashAscuasCard();
}

function buildMilestones(minutes, isCustom) {
  if (isCustom) {
    if (minutes < 20) return [];
    if (minutes <= 40) {
      return [{ second: Math.round(minutes * 30), label: "Buen ritmo", text: "Una capa más. Ya estás dentro del bloque." }];
    }
    return [
      { second: Math.round(minutes * 60 * 0.33), label: "Primera chispa", text: "Una capa más. Ya has empezado de verdad." },
      { second: Math.round(minutes * 60 * 0.66), label: "Buen ritmo", text: "Sigue. La idea empieza a tomar forma." },
    ];
  }

  const table = {
    15: [],
    25: [
      { second: 10 * 60, label: "Primera chispa", text: "Una capa más. Ya llevas 10 minutos construyendo." },
      { second: 20 * 60, label: "Buen ritmo", text: "Buen ritmo. No hace falta correr." },
    ],
    45: [
      { second: 15 * 60, label: "Primera chispa", text: "Bien. Ya has entrado en calor." },
      { second: 30 * 60, label: "Buen ritmo", text: "Sigue. La idea empieza a tomar forma." },
    ],
    60: [
      { second: 15 * 60, label: "Primera chispa", text: "Primera chispa estable. Sigue con calma." },
      { second: 30 * 60, label: "Buen ritmo", text: "Media sesión. Una capa más." },
      { second: 45 * 60, label: "Última capa", text: "Último tramo. Cierra bien, sin correr." },
    ],
  };

  return table[minutes] || [];
}

function renderProgressMarks(minutes, isCustom) {
  if (!progressMarks) return;
  const milestones = buildMilestones(minutes, isCustom);
  progressMarks.innerHTML = "";

  milestones.forEach((milestone) => {
    const mark = document.createElement("span");
    mark.className = "progress-mark";
    mark.dataset.second = String(milestone.second);
    mark.title = milestone.label;
    mark.style.left = `${Math.min((milestone.second / (minutes * 60)) * 100, 100)}%`;
    progressMarks.appendChild(mark);
  });
}

function markMilestoneAsHit(second) {
  const mark = progressMarks?.querySelector(`[data-second="${second}"]`);
  mark?.classList.add("is-hit");
}

function checkMilestones() {
  const isCustom = ![15, 25, 45, 60].includes(selectedMinutes);
  const milestones = buildMilestones(selectedMinutes, isCustom);

  milestones.forEach((milestone) => {
    if (elapsedSeconds >= milestone.second && !achievedMilestones.has(milestone.second)) {
      achievedMilestones.add(milestone.second);
      markMilestoneAsHit(milestone.second);
      setAscuasMessage(milestone.text);
    }
  });
}

function getFinalMessage(completed) {
  if (!completed) return "Has parado a tiempo. También es una forma de cuidar el foco.";
  return ascuaMessages[selectedMode]?.complete || "Sesión forjada. Has convertido tiempo en avance.";
}

function createSessionRecord(completed) {
  return {
    date: currentSessionRecord?.date || new Date().toISOString(),
    mode: selectedMode,
    note: currentSessionRecord?.note || "",
    minutes: selectedMinutes,
    completed,
    elapsedSeconds,
  };
}

function renderCompleteScreen(completed) {
  const status = completed ? "completada" : "terminada antes";
  const summary = `${selectedMode} · ${formatTime(elapsedSeconds)} de ${formatTime(targetSeconds)} · ${status}`;

  if (completeSummary) completeSummary.textContent = summary;
  if (completeAscuasMessage) completeAscuasMessage.textContent = getFinalMessage(completed);
  if (sessionNoteInput) sessionNoteInput.value = currentSessionRecord?.note || "";
}

function finishFocusSession(completed) {
  stopTimer();
  releaseWakeLock();
  currentSessionRecord = createSessionRecord(completed);
  saveSessionToHistory(currentSessionRecord);
  renderCompleteScreen(completed);
  showScreen("complete");
}

function tick() {
  if (isPaused) return;

  elapsedSeconds += 1;
  updateTimerDisplay();

  if (activeTimerType === "focus") {
    checkMilestones();
    updateProgress();
  }

  if (elapsedSeconds >= targetSeconds) {
    if (activeTimerType === "coffee") {
      completeCoffee();
    } else {
      finishFocusSession(true);
    }
  }
}

function startTimer(minutes, type = "focus", isCustom = false) {
  stopTimer();
  activeTimerType = type;
  selectedMinutes = minutes;
  elapsedSeconds = 0;
  targetSeconds = minutes * 60;
  isPaused = false;
  achievedMilestones = new Set();
  shouldKeepScreenAwake = true;
  requestWakeLock();

  if (pauseResume) pauseResume.textContent = "Pausar";

  if (type === "coffee") {
    updateTimerDisplay();
    timerInterval = window.setInterval(tick, 1000);
    return;
  }

  currentSessionRecord = {
    date: new Date().toISOString(),
    mode: selectedMode,
    note: "",
    minutes,
    completed: false,
    elapsedSeconds: 0,
    isCustom,
  };

  if (timerModeLabel) timerModeLabel.textContent = `Modo: ${selectedMode}`;
  setAscuasMessage(ascuaMessages[selectedMode]?.start || "Bien. Ya has encendido la primera chispa.");
  renderProgressMarks(minutes, isCustom);
  updateTimerDisplay();
  updateProgress();
  saveLastSession(currentSessionRecord);
  showScreen("timer");

  timerInterval = window.setInterval(tick, 1000);
}

function openDuration(mode) {
  selectedMode = mode;
  if (selectedModeLabel) selectedModeLabel.textContent = `Modo: ${mode}`;
  if (customDuration) customDuration.hidden = true;
  showScreen("duration");
}

function openCoffee() {
  selectedMode = "Café";
  stopTimer();
  activeTimerType = "coffee";
  if (coffeeTitle) coffeeTitle.textContent = "Disfruta.";
  if (coffeeSubtitle) coffeeSubtitle.textContent = "Tómate este momento antes de empezar.";
  if (coffeeAscuasMessage) coffeeAscuasMessage.textContent = ascuaMessages.Café.start;
  showScreen("coffee");
  startTimer(COFFEE_MINUTES, "coffee");
}

function completeCoffee() {
  stopTimer();
  releaseWakeLock();
  if (coffeeTitle) coffeeTitle.textContent = "Ahora sí.";
  if (coffeeSubtitle) coffeeSubtitle.textContent = "Vuelve con una intención clara.";
  if (coffeeTimer) coffeeTimer.textContent = "0:00";
  if (coffeeAscuasMessage) coffeeAscuasMessage.textContent = ascuaMessages.Café.complete;
}

function getCustomMinutes() {
  const value = Number.parseInt(customMinutes?.value, 10);
  return Math.min(Math.max(Number.isFinite(value) ? value : selectedMinutes, 1), 180);
}

function saveCurrentNote() {
  if (!currentSessionRecord) return;
  const note = sessionNoteInput?.value.trim() || "";
  currentSessionRecord = { ...currentSessionRecord, note };
  saveSessionToHistory(currentSessionRecord);
  showScreen("menu");
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    if (mode === "Café") {
      openCoffee();
      return;
    }
    openDuration(mode);
  });
});

durationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    startTimer(Number(button.dataset.minutes), "focus", false);
  });
});

document.getElementById("backToMenuFromDuration")?.addEventListener("click", () => {
  showScreen("menu");
});

customToggle?.addEventListener("click", () => {
  if (!customDuration) return;
  customDuration.hidden = !customDuration.hidden;
  if (!customDuration.hidden) {
    customMinutes?.focus();
    customMinutes?.select();
  }
});

minusMinutes?.addEventListener("click", () => {
  if (customMinutes) customMinutes.value = Math.max(getCustomMinutes() - 5, 1);
});

plusMinutes?.addEventListener("click", () => {
  if (customMinutes) customMinutes.value = Math.min(getCustomMinutes() + 5, 180);
});

startCustom?.addEventListener("click", () => {
  startTimer(getCustomMinutes(), "focus", true);
});

pauseResume?.addEventListener("click", () => {
  isPaused = !isPaused;
  pauseResume.textContent = isPaused ? "Reanudar" : "Pausar";
});

finishSession?.addEventListener("click", () => {
  finishFocusSession(false);
});

document.getElementById("coffeeDone")?.addEventListener("click", () => {
  stopTimer();
  releaseWakeLock();
  showScreen("menu");
});

document.getElementById("saveSessionNote")?.addEventListener("click", saveCurrentNote);

document.getElementById("continueWithoutNote")?.addEventListener("click", () => {
  if (sessionNoteInput) sessionNoteInput.value = "";
  saveCurrentNote();
});

document.getElementById("homeFromComplete")?.addEventListener("click", () => {
  saveCurrentNote();
});

sessionNoteInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveCurrentNote();
});

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && shouldKeepScreenAwake) {
    await requestWakeLock();
  }
});

updateLastSessionText();

window.setTimeout(() => {
  showScreen("menu");
}, INTRO_DURATION);
