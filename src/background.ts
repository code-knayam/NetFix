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
    dailyHistory: Array(7).fill(0), // Last 7 days
    weeklyHistory: Array(5).fill(0), // Last 5 weeks
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

  const lastUpdated = new Date(stats.lastUpdated);
  const currentDate = new Date();

  // Check if it's a new day by comparing dates
  if (!isSameDay(lastUpdated, currentDate)) {
    // Shift daily history array
    stats.dailyHistory.unshift(stats.dailyWatchTime);
    stats.dailyHistory = stats.dailyHistory.slice(0, 7);
    
    stats.dailyWatchTime = watchedMinutes;
    currentSessionLength = watchedMinutes;
  } else {
    // Update today's value in history
    stats.dailyHistory[0] = stats.dailyWatchTime;
  }

  // Check if it's a new week by comparing week numbers
  if (!isSameWeek(lastUpdated, currentDate)) {
    // Shift weekly history array
    stats.weeklyHistory.unshift(stats.weeklyWatchTime);
    stats.weeklyHistory = stats.weeklyHistory.slice(0, 5);
    
    stats.weeklyWatchTime = watchedMinutes;
    stats.longestSession = currentSessionLength;
  } else {
    // Update current week's value in history
    stats.weeklyHistory[0] = stats.weeklyWatchTime;
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
    chrome.storage.local.set({ watchStats: {
      dailyWatchTime: 0,
      weeklyWatchTime: 0,
      longestSession: 0,
      lastUpdated: new Date().toISOString(),
      dailyHistory: Array(7).fill(0),
      weeklyHistory: Array(5).fill(0),
    } });
  }
  
  // Uncomment the following line during development to seed test data
  // await seedTestData();
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

// Helper functions for date comparison
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function isSameWeek(date1: Date, date2: Date): boolean {
  // Get week number for both dates
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };
  
  return date1.getFullYear() === date2.getFullYear() &&
         getWeekNumber(date1) === getWeekNumber(date2);
}

// Helper function to seed test data
async function seedTestData() {
  const testStats = {
    dailyWatchTime: 45,
    weeklyWatchTime: 180,
    longestSession: 120,
    lastUpdated: new Date().toISOString(),
    dailyHistory: [0, 0,0,0,0,0,0], // Last 7 days
    weeklyHistory: [0, 0, 0, 0, 0], // Last 5 weeks
  };
  
  await chrome.storage.local.set({ watchStats: testStats });
  console.log('Test data seeded successfully');
}
