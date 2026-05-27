// ============================================================
// Background Service Worker — RepBot Pro v3
// Handles: icon click, notifications, keyboard shortcuts,
// storage change monitoring
// ============================================================

// Open dashboard tab on extension icon click
chrome.action.onClicked.addListener(async () => {
  openDashboard();
});

async function openDashboard() {
  const dashUrl = chrome.runtime.getURL('index.html');
  const tabs = await chrome.tabs.query({ url: dashUrl });
  if (tabs.length > 0) {
    chrome.tabs.update(tabs[0].id, { active: true });
    chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    chrome.tabs.create({ url: dashUrl });
  }
}

// Handle keyboard shortcut (Alt+R)
chrome.commands?.onCommand?.addListener((command) => {
  if (command === 'open-dashboard') {
    openDashboard();
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'NOTIFICATION') {
    showNotification(msg.title, msg.message);
  }
  if (msg.type === 'OPEN_TAB') {
    chrome.tabs.create({ url: msg.url, active: msg.active ?? false });
  }
  sendResponse({ ok: true });
});

// Chrome desktop notification
function showNotification(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon128.png'),
      title: title || 'RepBot Pro',
      message: message || '',
      priority: 1
    });
  } catch (e) {
    // notifications permission might not be available
    console.log('[RepBot] Notification error:', e);
  }
}

// Monitor storage changes for daily summary notifications
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  // Check if a bot was auto-stopped (active flag changed to false)
  if (changes.repbot_prof_active && changes.repbot_prof_active.newValue === false && changes.repbot_prof_active.oldValue === true) {
    showNotification('Profil Botu Durduruldu', 'Profil botu otomatik olarak durduruldu.');
  }
  if (changes.repbot_guide_active && changes.repbot_guide_active.newValue === false && changes.repbot_guide_active.oldValue === true) {
    showNotification('Rehber Botu Durduruldu', 'Rehber botu otomatik olarak durduruldu.');
  }
});

console.log('[RepBot Pro] Background Service Worker v3 aktif.');
