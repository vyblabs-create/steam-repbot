// ============================================================
// STORAGE — Persistent State via chrome.storage.local
// Falls back to localStorage when running outside extension
// ============================================================

const IS_EXT = typeof chrome !== 'undefined' && chrome.storage;

export const STORAGE_KEYS = {
  SETTINGS:       'repbot_settings',
  PROF_STATS:     'repbot_prof_stats',
  GUIDE_STATS:    'repbot_guide_stats',
  PROF_ACTIVE:    'repbot_prof_active',
  GUIDE_ACTIVE:   'repbot_guide_active',
  MEMORY:         'repbot_memory',
  ACTIVITY_LOG:   'repbot_activity_log',
  PROF_LAST:      'repbot_prof_last_action',
  GUIDE_LAST:     'repbot_guide_last_action',
  REPLIED_USERS:  'repbot_replied_users',
  GUIDE_QUEUE:    'repbot_guide_queue',
  CURRENT_TARGET: 'repbot_current_target',
  CURRENT_TARGET_NAME: 'repbot_current_target_name',
  PROF_NEXT_TIME: 'repbot_profile_next',
  GUIDE_NEXT_TIME:'repbot_guide_next',
  DAILY_HISTORY:  'repbot_daily_history',
};

export const DEFAULT_SETTINGS = {
  // === Profile ===
  anaProfilUrl:     '',
  anaProfilId:      '',
  // === Timing ===
  profilMolaMin:    2,
  profilMolaMax:    5,
  profilCeza:       7200,
  rehberMolaMin:    3,
  rehberMolaMax:    8,
  rehberCeza:       7200,
  // === Humanoid Motor ===
  okumaHiziMin:     8,
  okumaHiziMax:     20,
  yazmaHiziMin:     3,
  yazmaHiziMax:     7,
  klavyeOdakMin:    2,
  klavyeOdakMax:    5,
  profileGecisMin:  2,
  profileGecisMax:  4,
  // === Targets ===
  dailyProfTarget:  50,
  dailyGuideTarget: 30,
  // === V3: Advanced Settings ===
  enableDailyLimit: true,
  enableNotifications: true,
  testMode:         false,
  discordWebhook:   '',
  whitelist:        [],
  // === Comment Pools ===
  profilYorumlar: [
    "+rep good player",
    "+rep friendly guy",
    "+rep good teammate",
    "+rep nice profile",
    "+rep clutch king",
    "+rep insane aim",
    "+rep godly AWPer",
    "+rep 300 IQ plays",
    "+rep nice and non-toxic player",
    "+rep carry machine",
    "+rep good comms",
    "+rep absolute legend",
    "+rep simply the best",
    "+rep fast and safe",
    "+rep trustworthy trader",
    "+rep very helpful",
    "+rep great sportsmanship"
  ],
  rehberYorumlar: [
    "[REP 4 REP INSTANTLY - I AM ONLINE]\nENG: Choose one from the list below and write on my profile, I will return it instantly!\nTR: Aşağıdaki listeden birini seçin ve profilime yazın, anında karşılık vereceğim!\n+rep good player\n+rep friendly guy\n+rep good teammate\n+rep nice profile\n+rep clutch king\n+rep insane aim\n+rep great sportsmanship\n+rep godly AWPer\n+rep 300 IQ plays\n+rep carry machine\n+rep absolute legend\n+rep fast and safe",
    "[FAST REP 4 REP! ONLINE & RESPONDING]\nENG: Copy one of these and paste it on my profile, I will do the same for you!\nTR: Bunlardan birini kopyalayıp profilime yapıştırın, aynısını size geri döneceğim!\n+rep clutch king\n+rep insane aim\n+rep godly AWPer\n+rep 300 IQ plays\n+rep carry machine\n+rep good comms\n+rep absolute legend\n+rep simply the best\n+rep friendly guy\n+rep nice profile\n+rep trustworthy trader\n+rep great sportsmanship",
    "[REP 4 REP - RETURN 100%]\nENG: Drop one of these comments on my profile and get a fast +rep back!\nTR: Profilime bu yorumlardan birini bırakın, anında +rep ile geri döneyim!\n+rep nice and non-toxic player\n+rep carry machine\n+rep best igl\n+rep simply the best\n+rep fast and safe\n+rep trustworthy trader\n+rep very helpful\n+rep good player\n+rep clutch king\n+rep insane aim\n+rep godly AWPer\n+rep 300 IQ plays"
  ],
  poolMigratedV31: true
};

// ============================================================
// Core CRUD
// ============================================================
async function get(key) {
  if (IS_EXT) {
    return new Promise(res => chrome.storage.local.get([key], r => res(r[key])));
  }
  const v = localStorage.getItem(key);
  return v ? JSON.parse(v) : undefined;
}

async function set(key, value) {
  if (IS_EXT) {
    return new Promise(res => chrome.storage.local.set({ [key]: value }, res));
  }
  localStorage.setItem(key, JSON.stringify(value));
}

async function remove(key) {
  if (IS_EXT) {
    return new Promise(res => chrome.storage.local.remove([key], res));
  }
  localStorage.removeItem(key);
}

// ============================================================
// Settings
// ============================================================
export async function loadSettings() {
  let s = await get(STORAGE_KEYS.SETTINGS);
  if (!s) s = {};

  // Auto-migrate comment pools for V3.1 to ensure new pools are applied
  if (!s.poolMigratedV31) {
    s.profilYorumlar = DEFAULT_SETTINGS.profilYorumlar;
    s.rehberYorumlar = DEFAULT_SETTINGS.rehberYorumlar;
    s.poolMigratedV31 = true;
    await set(STORAGE_KEYS.SETTINGS, s);
  }

  return { ...DEFAULT_SETTINGS, ...s };
}

export async function saveSettings(settings) {
  return set(STORAGE_KEYS.SETTINGS, settings);
}

export async function resetSettings() {
  return set(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
}

// ============================================================
// Bot Active Flags
// ============================================================
export async function getBotActive(type) {
  const key = type === 'profile' ? STORAGE_KEYS.PROF_ACTIVE : STORAGE_KEYS.GUIDE_ACTIVE;
  return !!(await get(key));
}

export async function setBotActive(type, val) {
  const key = type === 'profile' ? STORAGE_KEYS.PROF_ACTIVE : STORAGE_KEYS.GUIDE_ACTIVE;
  return set(key, val);
}

// ============================================================
// Stats
// ============================================================
export async function getStats(type) {
  const key = type === 'profile' ? STORAGE_KEYS.PROF_STATS : STORAGE_KEYS.GUIDE_STATS;
  const s = await get(key);
  return s || { total: 0, today: 0, todayDate: '' };
}

export async function incrementStats(type) {
  const s = await getStats(type);
  const today = new Date().toDateString();
  const updated = {
    total: (s.total || 0) + 1,
    today: s.todayDate === today ? (s.today || 0) + 1 : 1,
    todayDate: today
  };
  const key = type === 'profile' ? STORAGE_KEYS.PROF_STATS : STORAGE_KEYS.GUIDE_STATS;
  await set(key, updated);

  // Also update 7-day daily history
  await updateDailyHistory(type);

  return updated;
}

// ============================================================
// 7-Day Daily History (for chart)
// ============================================================
export async function getDailyHistory() {
  const h = await get(STORAGE_KEYS.DAILY_HISTORY);
  return h || [];
}

async function updateDailyHistory(type) {
  const history = await getDailyHistory();
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  let todayEntry = history.find(e => e.date === todayStr);
  if (!todayEntry) {
    todayEntry = { date: todayStr, profile: 0, guide: 0 };
    history.push(todayEntry);
  }

  if (type === 'profile') todayEntry.profile++;
  else todayEntry.guide++;

  // Keep only last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const filtered = history.filter(e => new Date(e.date) >= sevenDaysAgo);

  await set(STORAGE_KEYS.DAILY_HISTORY, filtered);
}

// ============================================================
// Memory / History
// ============================================================
export async function getMemory() {
  return (await get(STORAGE_KEYS.MEMORY)) || [];
}

export async function addMemoryEntry(entry) {
  const mem = await getMemory();
  mem.unshift({ ...entry, date: new Date().toISOString() });
  // Keep only 500 entries
  if (mem.length > 500) mem.pop();
  return set(STORAGE_KEYS.MEMORY, mem);
}

export async function clearMemory() {
  await remove(STORAGE_KEYS.MEMORY);
  await remove(STORAGE_KEYS.REPLIED_USERS);
  await remove(STORAGE_KEYS.GUIDE_QUEUE);
}

// ============================================================
// Activity Log
// ============================================================
export async function getActivityLog() {
  return (await get(STORAGE_KEYS.ACTIVITY_LOG)) || [];
}

export async function addActivityLog(entry) {
  const log = await getActivityLog();
  log.unshift({ ...entry, time: new Date().toISOString() });
  if (log.length > 200) log.pop();
  return set(STORAGE_KEYS.ACTIVITY_LOG, log);
}

export async function clearActivityLog() {
  return remove(STORAGE_KEYS.ACTIVITY_LOG);
}

// ============================================================
// Last Action
// ============================================================
export async function setLastAction(type, text) {
  const key = type === 'profile' ? STORAGE_KEYS.PROF_LAST : STORAGE_KEYS.GUIDE_LAST;
  return set(key, { text, time: new Date().toISOString() });
}

export async function getLastAction(type) {
  const key = type === 'profile' ? STORAGE_KEYS.PROF_LAST : STORAGE_KEYS.GUIDE_LAST;
  return (await get(key)) || { text: 'Henüz işlem yapılmadı.', time: null };
}

// ============================================================
// Next Time (countdown timers)
// ============================================================
export async function getNextTime(type) {
  const key = type === 'profile' ? STORAGE_KEYS.PROF_NEXT_TIME : STORAGE_KEYS.GUIDE_NEXT_TIME;
  const v = await get(key);
  return parseInt(v || '0');
}

export async function setNextTime(type, timestamp) {
  const key = type === 'profile' ? STORAGE_KEYS.PROF_NEXT_TIME : STORAGE_KEYS.GUIDE_NEXT_TIME;
  return set(key, timestamp.toString());
}

// ============================================================
// Export helpers
// ============================================================
export async function exportAllSettings() {
  const settings = await loadSettings();
  const memory = await getMemory();
  const log = await getActivityLog();
  const profStats = await getStats('profile');
  const guideStats = await getStats('guide');
  return {
    version: '3.0',
    exportDate: new Date().toISOString(),
    settings,
    memory,
    activityLog: log,
    stats: { profile: profStats, guide: guideStats }
  };
}

export async function importSettings(data) {
  if (data.settings) await saveSettings(data.settings);
  // Optionally import memory and stats
  if (data.memory) await set(STORAGE_KEYS.MEMORY, data.memory);
  if (data.stats?.profile) await set(STORAGE_KEYS.PROF_STATS, data.stats.profile);
  if (data.stats?.guide) await set(STORAGE_KEYS.GUIDE_STATS, data.stats.guide);
}

export default { get, set, remove };
