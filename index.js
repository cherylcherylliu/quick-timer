var state = {
  phase: 'idle',
  timerId: null,
  endTime: null,
  remainingMs: 0,
  cycles: 1,
  currentCycle: 0,
  prepareMs: 0,
  workMs: 0,
  onComplete: null,
  lastBeepSecond: null,
  isRunning: false
};

function toggleButton() {
  var text;
  switch (state.phase) {
    case 'idle':
      text = '開始';
      break;
    case 'done':
      text = '再來一次';
      break;
    default:
      text = state.isRunning ? '暫停' : '繼續';
      break;
  }
  $('#toggle').text(text);
}

function readInt(selector, fallback) {
  if (fallback === void 0) { fallback = 0; }
  var val = parseInt($(selector).val(), 10);
  return isNaN(val) ? fallback : val;
}

function formatTime(ms) {
  var total = Math.max(0, Math.round(ms / 1000));
  var mins = Math.floor(total / 60);
  var secs = total % 60;
  return ("0" + mins).slice(-2) + ':' + ("0" + secs).slice(-2);
}

function updatePhaseText() {
  var label;
  switch (state.phase) {
    case 'prepare':
      label = '準備時間';
      break;
    case 'cycle':
      label = "第" + state.currentCycle + " 組 / " + state.cycles;
      break;
    case 'done':
      label = '完成！';
      break;
    default:
      label = '待命';
  }
  $('#phase').text(label);
  var progress;
  switch (state.phase) {
    case 'cycle':
      progress = "進行中：" + state.currentCycle + "/" + state.cycles;
      break;
    case 'prepare':
      progress = '準備中';
      break;
    case 'done':
      progress = '全部完成';
      break;
    default:
      progress = '尚未開始';
  }
  $('#cycle-progress').text(progress);
}

function drawTimer() {
  $('#timer').text(formatTime(state.remainingMs));
}

function updateUI() {
  updatePhaseText();
  drawTimer();
  toggleButton();
}

function clearTick() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

var audioContext = null;

function ensureAudio() {
  if (!audioContext) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctx();
  }
}

function playDing() {
  ensureAudio();
  var now = audioContext.currentTime;
  var oscillator = audioContext.createOscillator();
  var gain = audioContext.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.25);
}

function pause() {
  clearTick();
  state.isRunning = false;
  toggleButton();
}

function startTick() {
  state.endTime = new Date().getTime() + state.remainingMs;
  state.isRunning = true;
  toggleButton();
  clearTick();
  state.timerId = setInterval(function () {
    var left = state.endTime - new Date().getTime();
    if (left <= 0) {
      state.remainingMs = 0;
      drawTimer();
      pause();
      if (state.onComplete) { state.onComplete(); }
    } else {
      state.remainingMs = left;
      drawTimer();
      var secondsLeft = Math.ceil(state.remainingMs / 1000);
      if (secondsLeft <= 3 && secondsLeft !== state.lastBeepSecond) {
        state.lastBeepSecond = secondsLeft;
        playDing();
      }
    }
  }, 100);
}

function startPhase(phase, duration, onComplete) {
  state.phase = phase;
  state.remainingMs = duration;
  state.lastBeepSecond = null;
  state.onComplete = onComplete;
  updateUI();
  startTick();
}

function finish() {
  state.phase = 'done';
  state.remainingMs = 0;
  state.currentCycle = state.cycles;
  state.isRunning = false;
  clearTick();
  updateUI();
  $('#quote').removeClass('hidden');
}

function startCycle() {
  state.currentCycle += 1;
  if (state.currentCycle > state.cycles) {
    finish();
  } else {
    startPhase('cycle', state.workMs, startCycle);
  }
}

function startSequence() {
  $('#quote').addClass('hidden');
  state.currentCycle = 0;
  if (state.prepareMs > 0) {
    startPhase('prepare', state.prepareMs, startCycle);
  } else {
    startCycle();
  }
}

function resetTimerInternal(keepConfig) {
  pause();
  if (!keepConfig) { applyConfig(); }
  state.phase = 'idle';
  state.currentCycle = 0;
  state.onComplete = null;
  state.lastBeepSecond = null;
  state.remainingMs = state.workMs > 0 ? state.workMs : 0;
  updateUI();
  $('#quote').addClass('hidden');
}

function applyConfig() {
  state.cycles = Math.max(1, readInt('#cycles', 1));
  state.prepareMs = Math.max(0, readInt('#prepare', 0)) * 1000;
  var mins = Math.max(0, readInt('#minutes', 0));
  var secs = Math.max(0, readInt('#seconds', 0));
  var total = mins * 60 + secs;
  if (total <= 0) { total = 1; }
  state.workMs = total * 1000;
  $('#timer').text(formatTime(state.workMs));
  $('#cycle-progress').text('尚未開始');
  $('#phase').text('待命');
}

function toggle() {
  if (state.phase === 'idle' || state.phase === 'done') {
    applyConfig();
    startSequence();
  } else if (state.isRunning) {
    pause();
  } else {
    startTick();
  }
}

function resetTimer() {
  resetTimerInternal(false);
}

window.onload = function () {
  applyConfig();
  resetTimerInternal(true);
};
