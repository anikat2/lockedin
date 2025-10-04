let pomodoroActive = false;
let breakActive = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_POMODORO') {
    startPomodoro(message.duration);
  } else if (message.type === 'STOP_POMODORO') {
    stopPomodoro();
  } else if (message.type === 'START_BREAK') {
    startBreak(message.duration);
  }
});

function startPomodoro(duration) {
  pomodoroActive = true;
  breakActive = false;
  
  chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: ['distraction_blocking']
  });
  
  chrome.storage.local.set({ 
    pomodoroActive: true,
    breakActive: false,
    endTime: Date.now() + (duration * 60 * 1000)
  });
  
  chrome.alarms.create('pomodoroEnd', { delayInMinutes: duration });
  
  console.log(`Pomodoro started: ${duration} minutes`);
}

function startBreak(duration) {
  pomodoroActive = false;
  breakActive = true;
  
  chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: ['distraction_blocking']
  });
  
  chrome.storage.local.set({ 
    pomodoroActive: false,
    breakActive: true,
    endTime: Date.now() + (duration * 60 * 1000)
  });
  
  chrome.alarms.create('breakEnd', { delayInMinutes: duration });
  
  console.log(`Break started: ${duration} minutes`);
}

function stopPomodoro() {
  pomodoroActive = false;
  breakActive = false;
  
  chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: ['distraction_blocking']
  });
  
  chrome.storage.local.set({ 
    pomodoroActive: false,
    breakActive: false,
    endTime: null
  });
  
  chrome.alarms.clearAll();
  
  console.log('Pomodoro stopped');
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoroEnd') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Pomodoro Complete!',
      message: 'Great work! Time for a break.',
      priority: 2
    });
    
    stopPomodoro();
    
    chrome.runtime.sendMessage({ type: 'POMODORO_ENDED' });
  } else if (alarm.name === 'breakEnd') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Break Complete!',
      message: 'Ready to start another pomodoro?',
      priority: 2
    });
    
    stopPomodoro();
    
    chrome.runtime.sendMessage({ type: 'BREAK_ENDED' });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Focus Guardian installed');
  chrome.storage.local.set({ 
    pomodoroActive: false,
    breakActive: false,
    pomodoroCount: 0
  });
});