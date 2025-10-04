let timerInterval;
let endTime;

const timerDisplay = document.getElementById('timer-display');
const status = document.getElementById('status');
const startWorkBtn = document.getElementById('start-work');
const startShortBreakBtn = document.getElementById('start-short-break');
const startLongBreakBtn = document.getElementById('start-long-break');
const stopBtn = document.getElementById('stop');
const customDuration = document.getElementById('custom-duration');
const startCustomBtn = document.getElementById('start-custom');
const pomodoroCount = document.getElementById('pomodoro-count');

loadState();
updatePomodoroCount();

function startPomodoro(minutes, isBreak = false) {
  endTime = Date.now() + (minutes * 60 * 1000);
  
  startWorkBtn.disabled = true;
  startShortBreakBtn.disabled = true;
  startLongBreakBtn.disabled = true;
  startCustomBtn.disabled = true;
  stopBtn.disabled = false;
  
  if (isBreak) {
    status.textContent = 'Break time!';
    status.className = 'status break';
    chrome.runtime.sendMessage({ 
      type: 'START_BREAK',
      duration: minutes 
    });
  } else {
    status.textContent = 'Focus mode active';
    status.className = 'status active';
    chrome.runtime.sendMessage({ 
      type: 'START_POMODORO',
      duration: minutes 
    });
  }
  
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function stopPomodoro() {
  clearInterval(timerInterval);
  
  timerDisplay.textContent = '25:00';
  status.textContent = 'Ready to focus';
  status.className = 'status';
  startWorkBtn.disabled = false;
  startShortBreakBtn.disabled = false;
  startLongBreakBtn.disabled = false;
  startCustomBtn.disabled = false;
  stopBtn.disabled = true;
  
  chrome.runtime.sendMessage({ type: 'STOP_POMODORO' });
}

function updateTimer() {
  const remaining = endTime - Date.now();
  
  if (remaining <= 0) {
    stopPomodoro();
    updatePomodoroCount();
    return;
  }
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function loadState() {
  chrome.storage.local.get(['pomodoroActive', 'breakActive', 'endTime'], (result) => {
    if (result.pomodoroActive || result.breakActive) {
      endTime = result.endTime;
      if (endTime > Date.now()) {
        startWorkBtn.disabled = true;
        startShortBreakBtn.disabled = true;
        startLongBreakBtn.disabled = true;
        startCustomBtn.disabled = true;
        stopBtn.disabled = false;
        
        if (result.breakActive) {
          status.textContent = 'Break time!';
          status.className = 'status break';
        } else {
          status.textContent = 'Focus mode active';
          status.className = 'status active';
        }
        
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
      }
    }
  });
}

function updatePomodoroCount() {
  chrome.storage.local.get(['pomodoroCount'], (result) => {
    pomodoroCount.textContent = result.pomodoroCount || 0;
  });
}

function incrementPomodoroCount() {
  chrome.storage.local.get(['pomodoroCount'], (result) => {
    const count = (result.pomodoroCount || 0) + 1;
    chrome.storage.local.set({ pomodoroCount: count });
    pomodoroCount.textContent = count;
  });
}

startWorkBtn.addEventListener('click', () => {
  startPomodoro(25, false);
  incrementPomodoroCount();
});

startShortBreakBtn.addEventListener('click', () => {
  startPomodoro(5, true);
});

startLongBreakBtn.addEventListener('click', () => {
  startPomodoro(15, true);
});

startCustomBtn.addEventListener('click', () => {
  const minutes = parseInt(customDuration.value);
  if (minutes > 0 && minutes <= 120) {
    startPomodoro(minutes, false);
    incrementPomodoroCount();
  }
});

stopBtn.addEventListener('click', () => {
  stopPomodoro();
});

let cameraActive = false;
const toggleCameraBtn = document.getElementById('toggle-camera');

if (toggleCameraBtn) {
  toggleCameraBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (cameraActive) {
        await chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_CAMERA_IFRAME' });
        toggleCameraBtn.textContent = 'Enable Camera';
        cameraActive = false;
      } else {
        await chrome.tabs.sendMessage(tab.id, { type: 'INJECT_CAMERA_IFRAME' });
        toggleCameraBtn.textContent = 'Disable Camera';
        cameraActive = true;
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      alert('Could not access camera. Make sure you are on a regular webpage (not chrome:// or extension pages).');
    }
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'POMODORO_ENDED' || message.type === 'BREAK_ENDED') {
    stopPomodoro();
  } else if (message.type === 'CAMERA_STARTED') {
    console.log('Camera started in iframe');
  } else if (message.type === 'CAMERA_ERROR') {
    console.error('Camera error:', message.error);
  }
});