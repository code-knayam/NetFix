let watchStartTime: number | null = null;
let lastUpdateTime = Date.now();
let currentSessionLength = 0; // Track current session length
let alarmSetup = false;

function setupAlarms() {
  // Initialize alarm for periodic checks
  chrome.alarms.create('checkWatchTime', { periodInMinutes: 1 });

  // Listen for alarm
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkWatchTime') {
      await updateWatchTime();
    }
  });
}

function clearAlarms() {
  chrome.alarms.clear('checkWatchTime');
}

// Update watch time stats
async function updateWatchTime() {
  if (!watchStartTime) return;

  const result = await chrome.storage.local.get('watchStats');
  const stats = result['watchStats'] || {
    dailyWatchTime: 0,
    weeklyWatchTime: 0,
    longestSession: 0,
    lastUpdated: new Date().toISOString(),
  };

  // Calculate minutes since last update
  const now = Date.now();
  const watchedMinutes = (now - lastUpdateTime) / (1000 * 60);

  // Update session length
  currentSessionLength += watchedMinutes;

  // Update stats
  stats.dailyWatchTime += watchedMinutes;
  stats.weeklyWatchTime += watchedMinutes;

  // Check if current session is the longest
  if (currentSessionLength > (stats.longestSession || 0)) {
    stats.longestSession = currentSessionLength;
  }

  // Check for day/week reset
  const lastUpdated = new Date(stats.lastUpdated);
  const currentDate = new Date();

  // Reset daily stats if it's a new day
  if (lastUpdated.getDate() !== currentDate.getDate()) {
    stats.dailyWatchTime = watchedMinutes;
    currentSessionLength = watchedMinutes;
  }

  // Reset weekly stats if it's a new week
  if (lastUpdated.getDay() > currentDate.getDay()) {
    stats.weeklyWatchTime = watchedMinutes;
    stats.longestSession = currentSessionLength;
  }

  stats.lastUpdated = currentDate.toISOString();
  await chrome.storage.local.set({ watchStats: stats });
  lastUpdateTime = now;

  // Check if limits are exceeded
  const settings = await chrome.storage.sync.get('netflixSettings');

  if (settings['netflixSettings']) {
    const { dailyLimit, weeklyLimit } = settings['netflixSettings'];
    const dailyTimeLeft = dailyLimit - stats.dailyWatchTime;
    const weeklyTimeLeft = weeklyLimit - stats.weeklyWatchTime;

    if (dailyTimeLeft <= 0 || weeklyTimeLeft <= 0) {
      // Time limit already exceeded, block immediately
      await blockPlayback();
    } else if (dailyTimeLeft <= 1 || weeklyTimeLeft <= 1) {
      // Convert remaining minutes to milliseconds, handling negative values
      const timeLeftMs = Math.min(
        dailyTimeLeft > 0 ? dailyTimeLeft * 60 * 1000 : 0,
        weeklyTimeLeft > 0 ? weeklyTimeLeft * 60 * 1000 : 0
      );

      if (timeLeftMs > 0) {
        // Set timeout to block after remaining time
        setTimeout(async () => {
          clearAlarms();
          await blockPlayback();
        }, timeLeftMs);
      } else {
        // No time left, block immediately
        await blockPlayback();
      }
    }
  }
}

async function blockPlayback() {
  const tabs = await chrome.tabs.query({ url: '*://*.netflix.com/*' });
  tabs.forEach((tab) => {
    chrome.tabs.sendMessage(tab.id!, { type: 'BLOCK_PLAYBACK' });
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  switch (message.action) {
    case 'WATCHING_STARTED':
      if (!alarmSetup) {
        alarmSetup = true;
      }
      console.log('WATCHING_STARTED received');
      setupAlarms();
      watchStartTime = Date.now();
      lastUpdateTime = Date.now();
      currentSessionLength = 0;
      updateWatchTime();
      break;

    case 'WATCHING_PAUSED':
      updateWatchTime();
      clearAlarms();
      break;

    case 'WATCHING_STOPPED':
      updateWatchTime();
      currentSessionLength = 0;
      clearAlarms();
      break;
  }
  
  return true; // Indicates async response
});

chrome.tabs.onUpdated.addListener((tabId, tab) => {
  if (tab.url && tab.url.includes('netflix.com/')) {
    if (tab.url.includes('netflix.com/watch')) {
      chrome.tabs.sendMessage(tabId, {
        type: 'NEW_VIDEO',
      });
    } else {
      updateWatchTime();
      currentSessionLength = 0;
      clearAlarms();
    }

    if (tab.url.includes('netflix.com/browse')) {
      chrome.tabs.sendMessage(tabId, {
        type: 'HIDE_RECOMMENDATIONS',
      });
    }

    if (tab.url.includes('netflix.com/search')) {
      chrome.tabs.sendMessage(tabId, {
        type: 'SEARCH_PAGE',
      });
    }
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  //setup default settings
  const settings = await chrome.storage.sync.get('netflixSettings');
  if (!settings['netflixSettings']) {
    chrome.storage.sync.set({
      netflixSettings: {
        dailyLimit: 30,
        weeklyLimit: 200,
        hideRecommendations: true,
        disableAutoplay: true,
        showEndTime: true,
      },
    });
  }
});

// Add this at the top of background.ts
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});

// Keep service worker alive
chrome.runtime.onConnect.addListener(function(port) {
  port.onDisconnect.addListener(function() {
    console.log('Port disconnected');
  });
});
