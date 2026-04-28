const STORAGE_KEY = "startModeLastSession";
const INTRO_DURATION = 1800;
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
const durationLastSession = document.getElementById("durationLastSession");
const customToggle = document.getElementById("customToggle");
const customDuration = document.getElementById("customDuration");
const customMinutes = document.getElementById("customMinutes");
const minusMinutes = document.getElementById("minusMinutes");
const plusMinutes = document.getElementById("plusMinutes");
const startCustom = document.getElementById("startCustom");
const timerModeLabel = document.getElementById("timerModeLabel");
const timerDisplay = document.getElementById("timerDisplay");
const motivationText = document.getElementById("motivationText");
const pauseResume = document.getElementById("pauseResume");
const finishSession = document.getElementById("finishSession");
const coffeeTimer = document.getElementById("coffeeTimer");
const coffeeTitle = document.getElementById("coffeeTitle");
const coffeeSubtitle = document.getElementById("coffeeSubtitle");

const motivations = [
  "Una sesión. Una intención.",
  "Empieza pequeño. Sigue constante.",
  "Tu escritorio ya está listo. Ahora tú.",
  "Hazlo fácil. Hazlo ahora.",
  "No necesitas hacerlo perfecto. Solo empezar.",
];

let selectedMode = "";
let selectedMinutes = 25;
let timerInterval = null;
let remainingSeconds = 0;
let isPaused = false;
let activeTimerType = "focus";

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
  screens[name].classList.add("is-active");
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function readLastSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveLastSession(mode, minutes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, minutes }));
  updateLastSessionText();
}

function updateLastSessionText() {
  const last = readLastSession();
  const text = last ? `Última sesión: ${last.mode} · ${last.minutes} min` : "";
  menuLastSession.textContent = text;
  durationLastSession.textContent = text;

  if (last?.minutes) {
    customMinutes.value = last.minutes;
  }
}

function stopTimer() {
  window.clearInterval(timerInterval);
  timerInterval = null;
}

function tick() {
  if (isPaused) return;

  remainingSeconds -= 1;

  if (activeTimerType === "coffee") {
    coffeeTimer.textContent = formatTime(Math.max(remainingSeconds, 0)).replace(/^0/, "");
  } else {
    timerDisplay.textContent = formatTime(Math.max(remainingSeconds, 0));
  }

  if (remainingSeconds <= 0) {
    stopTimer();
    if (activeTimerType === "coffee") {
      completeCoffee();
    } else {
      showScreen("complete");
    }
  }
}

function startCountdown(minutes, type = "focus") {
  stopTimer();
  activeTimerType = type;
  remainingSeconds = minutes * 60;
  isPaused = false;
  pauseResume.textContent = "Pausar";

  if (type === "coffee") {
    coffeeTimer.textContent = formatTime(remainingSeconds).replace(/^0/, "");
  } else {
    timerDisplay.textContent = formatTime(remainingSeconds);
    timerModeLabel.textContent = `Modo: ${selectedMode}`;
    motivationText.textContent = motivations[Math.floor(Math.random() * motivations.length)];
    saveLastSession(selectedMode, minutes);
    showScreen("timer");
  }

  timerInterval = window.setInterval(tick, 1000);
}

function startFocusSession(minutes) {
  selectedMinutes = minutes;
  startCountdown(minutes, "focus");
}

function openDuration(mode) {
  selectedMode = mode;
  selectedModeLabel.textContent = `Modo: ${mode}`;
  customDuration.hidden = true;
  showScreen("duration");
}

function openCoffee() {
  stopTimer();
  activeTimerType = "coffee";
  coffeeTitle.textContent = "Disfruta.";
  coffeeSubtitle.textContent = "Tómate este momento antes de empezar.";
  showScreen("coffee");
  startCountdown(COFFEE_MINUTES, "coffee");
}

function completeCoffee() {
  coffeeTitle.textContent = "Ahora sí.";
  coffeeSubtitle.textContent = "Vamos con ello.";
  coffeeTimer.textContent = "0:00";
}

function getCustomMinutes() {
  const value = Number.parseInt(customMinutes.value, 10);
  return Math.min(Math.max(Number.isFinite(value) ? value : selectedMinutes, 1), 180);
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
    startFocusSession(Number(button.dataset.minutes));
  });
});

document.getElementById("backToMenuFromDuration").addEventListener("click", () => {
  showScreen("menu");
});

customToggle.addEventListener("click", () => {
  customDuration.hidden = !customDuration.hidden;
  if (!customDuration.hidden) {
    customMinutes.focus();
    customMinutes.select();
  }
});

minusMinutes.addEventListener("click", () => {
  customMinutes.value = Math.max(getCustomMinutes() - 5, 1);
});

plusMinutes.addEventListener("click", () => {
  customMinutes.value = Math.min(getCustomMinutes() + 5, 180);
});

startCustom.addEventListener("click", () => {
  startFocusSession(getCustomMinutes());
});

pauseResume.addEventListener("click", () => {
  isPaused = !isPaused;
  pauseResume.textContent = isPaused ? "Reanudar" : "Pausar";
});

finishSession.addEventListener("click", () => {
  stopTimer();
  showScreen("menu");
});

document.getElementById("coffeeDone").addEventListener("click", () => {
  stopTimer();
  showScreen("menu");
});

document.getElementById("newSession").addEventListener("click", () => {
  showScreen("duration");
});

document.getElementById("homeFromComplete").addEventListener("click", () => {
  showScreen("menu");
});

window.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (activeTimerType === "focus") {
    timerDisplay.textContent = formatTime(Math.max(remainingSeconds, 0));
  }
});

updateLastSessionText();

window.setTimeout(() => {
  showScreen("menu");
}, INTRO_DURATION);
