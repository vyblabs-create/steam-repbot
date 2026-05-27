// ============================================================
// STEAM REPBOT PRO — Content Script v3
// Injected into every steamcommunity.com page.
// Reads state from chrome.storage, executes bot logic,
// and reports activity back to the Dashboard.
// ============================================================

const STORAGE = chrome.storage.local;

// ----- Core storage helpers -----
function get(key) {
  return new Promise(r => STORAGE.get([key], d => r(d[key])));
}
function set(key, val) {
  return new Promise(r => STORAGE.set({ [key]: val }, r));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const rawUrl = window.location.href;
const currentUrl = rawUrl.split('?')[0].replace(/\/$/, '');

function cleanUrl(u) {
  if (!u) return '';
  if (u.includes('/sharedfiles/filedetails')) {
    try {
      const urlObj = new URL(u);
      const id = urlObj.searchParams.get('id');
      return id ? `${urlObj.origin}${urlObj.pathname}?id=${id}` : u;
    } catch(e) { return u; }
  }
  return u.split('?')[0].replace(/\/$/, '').replace(/\/allcomments$/, '');
}

// Extract the profile segment from a Steam URL (handles /id/xxx and /profiles/xxx)
function extractProfileSegment(url) {
  const m = (url || '').match(/steamcommunity\.com\/(id|profiles)\/([^/]+)/);
  return m ? m[2].toLowerCase() : '';
}

// ----- Anti-hash (unique suffix) -----
function antiHashUret(text) {
  const suffix = Math.random().toString(36).slice(2, 5);
  return text + ' ' + suffix;
}

// ----- Log helper (writes to chrome.storage activity log) -----
async function log(icon, text, kind = '') {
  try {
    const entry = { icon, text, kind, time: new Date().toISOString() };
    const existing = (await get('repbot_activity_log')) || [];
    existing.unshift(entry);
    if (existing.length > 200) existing.pop();
    await set('repbot_activity_log', existing);
  } catch (_) {}
}

// ----- Send Chrome desktop notification -----
async function notify(title, message) {
  try {
    const settings = (await get('repbot_settings')) || {};
    if (settings.enableNotifications !== false) {
      chrome.runtime.sendMessage({ type: 'NOTIFICATION', title, message });
    }
  } catch (_) {}
}

// ----- Discord webhook -----
async function sendDiscord(message) {
  try {
    const settings = (await get('repbot_settings')) || {};
    const url = settings.discordWebhook;
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `🤖 **RepBot Pro** — ${message}` })
    });
  } catch (_) {}
}

// ----- Memory helpers -----
async function markReplied(url, name, type, isSuccess = true) {
  const cleanedUrl = cleanUrl(url);

  // Add to replied_users list
  const replied = (await get('repbot_replied_users')) || [];
  if (!replied.includes(cleanedUrl)) replied.push(cleanedUrl);
  await set('repbot_replied_users', replied);

  // Add to visual memory
  const mem = (await get('repbot_memory')) || [];
  mem.unshift({ url: cleanedUrl, name: name || cleanedUrl.split('/').pop(), type, date: new Date().toISOString() });
  if (mem.length > 500) mem.pop();
  await set('repbot_memory', mem);

  if (isSuccess) {
    // Increment stats
    const statsKey = type === 'guide' ? 'repbot_guide_stats' : 'repbot_prof_stats';
    const s = (await get(statsKey)) || { total: 0, today: 0, todayDate: '' };
    const today = new Date().toDateString();
    const newStats = {
      total: (s.total || 0) + 1,
      today: s.todayDate === today ? (s.today || 0) + 1 : 1,
      todayDate: today
    };
    await set(statsKey, newStats);

    // Update 7-day daily history
    const history = (await get('repbot_daily_history')) || [];
    const todayStr = new Date().toISOString().split('T')[0];
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
    await set('repbot_daily_history', filtered);

    return newStats;
  }
  return { today: 0, total: 0 }; // Return empty stats on skip
}

// ----- Check daily limit -----
async function isDailyLimitReached(type) {
  const settings = (await get('repbot_settings')) || {};
  if (!settings.enableDailyLimit) return false;

  const statsKey = type === 'guide' ? 'repbot_guide_stats' : 'repbot_prof_stats';
  const s = (await get(statsKey)) || { total: 0, today: 0, todayDate: '' };
  const today = new Date().toDateString();
  const todayCount = s.todayDate === today ? (s.today || 0) : 0;
  const limit = type === 'guide' ? (settings.dailyGuideTarget || 30) : (settings.dailyProfTarget || 50);

  if (todayCount >= limit) {
    await log('🏁', `<strong>${type === 'guide' ? 'Rehber' : 'Profil'} Botu</strong> günlük hedefe ulaştı (${todayCount}/${limit}). Otomatik durduruldu.`, 'warning');
    await set(type === 'guide' ? 'repbot_guide_active' : 'repbot_prof_active', false);
    await notify('Günlük Hedef Tamamlandı', `${type === 'guide' ? 'Rehber' : 'Profil'} botu ${todayCount} işlem ile günlük hedefe ulaştı.`);
    return true;
  }
  return false;
}

// ----- Check whitelist -----
async function isWhitelisted(url) {
  const settings = (await get('repbot_settings')) || {};
  const whitelist = settings.whitelist || [];
  if (whitelist.length === 0) return false;
  const segment = extractProfileSegment(url);
  return whitelist.some(w => {
    const ws = w.trim().toLowerCase();
    return ws && (url.toLowerCase().includes(ws) || segment === ws);
  });
}

// ----- Humanoid typing engine -----
async function humanoidYazdir(text, textarea, isGuide) {
  const AYARLAR = (await get('repbot_settings')) || {};

  // Test mode: simulate without actually posting
  if (AYARLAR.testMode) {
    await log('🧪', `<strong>TEST MODU:</strong> Yorum simüle edildi — "${text.substring(0, 50)}..."`, 'info');
    await sleep(2000);
    return true;
  }

  const benzersiz = antiHashUret(text);

  // Scroll textarea into view and ensure it's visible
  textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(1500);

  // Click on the textarea to focus & expand it (Steam sometimes collapses comment areas)
  textarea.click();
  await sleep(500);
  textarea.focus();
  await sleep(300);
  textarea.value = '';
  textarea.dispatchEvent(new Event('focus', { bubbles: true }));
  await sleep(500);

  const isHeavy = benzersiz.length > 100;
  for (let i = 0; i < benzersiz.length; i++) {
    textarea.value += benzersiz[i];
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    const minMs = isHeavy ? 8  : ((AYARLAR.yazmaHiziMin || 3) * 10);
    const maxMs = isHeavy ? 30 : ((AYARLAR.yazmaHiziMax || 7) * 10);
    await sleep(rand(minMs, maxMs));
  }

  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(800);

  // Find the submit button — try multiple selectors for robustness
  const commentEntry = textarea.closest('.commentthread_entry') || textarea.closest('.commentthread_entry_quotebox')?.parentElement;
  const btn = commentEntry?.querySelector('.btn_green_white_innerfade')
    || commentEntry?.querySelector('button[type="submit"]')
    || document.querySelector('.commentthread_entry .btn_green_white_innerfade');

  if (!btn) {
    await log('⚠️', 'Gönder butonu bulunamadı!', 'warning');
    return false;
  }

  btn.classList.remove('btn_disabled');
  await sleep(300);
  const span = btn.querySelector('span');
  if (span) span.click(); else btn.click();

  // Wait for submit result
  return new Promise(resolve => {
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      const container = commentEntry?.innerText?.toLowerCase() || '';
      const isError = container.includes('hata') || container.includes('sık') || container.includes('error') || container.includes('limit') || container.includes('rate');

      if (isError || attempts >= 15) {
        clearInterval(iv);
        resolve(false);
      } else if (textarea.value.trim() === '') {
        clearInterval(iv);
        resolve(true);
      }
    }, 1000);
  });
}

// ----- Navigate (replace current tab) -----
function goTo(url) {
  window.location.href = url;
}

// ============================================================
// PROFILE WORKER — Runs on the user's own /allcomments page
// Scans comments, finds unreplied users, navigates to their profiles
// ============================================================
async function runProfileWorker() {
  const AYARLAR = (await get('repbot_settings')) || {};
  const anaProfilId = (AYARLAR.anaProfilId || '').toLowerCase();
  const dashUrl = cleanUrl(AYARLAR.anaProfilUrl || '');

  if (!anaProfilId || !dashUrl) {
    await log('⚠️', 'Profil ID ayarlanmamış! Lütfen <strong>Ayarlar</strong> sayfasından Steam URL\'nizi girin.', 'warning');
    return;
  }

  // Daily limit check
  if (await isDailyLimitReached('profile')) return;

  // Rate limit check
  const nextTime = parseInt((await get('repbot_profile_next')) || '0');
  if (Date.now() < nextTime) {
    const waitSecs = Math.ceil((nextTime - Date.now()) / 1000);
    await log('⏳', `Profil botu molada, <strong>${waitSecs}sn</strong> bekleniyor...`, 'warning');
    // Update last action to show countdown
    await set('repbot_prof_last', { text: `Molada: ${Math.ceil(waitSecs / 60)} dk kaldı`, time: new Date().toISOString(), nextTime });
    setTimeout(() => location.reload(), Math.min(waitSecs * 1000 + 1500, 300000));
    return;
  }

  await log('🔍', 'Yorumlar taranıyor, cevaplanmamış profil aranıyor...', 'info');
  await sleep(2000);

  // Get all comment author links on the page
  const authors = Array.from(document.querySelectorAll('.commentthread_author_link')).filter(a => a.href);
  const replied = (await get('repbot_replied_users')) || [];

  let target = null;
  let targetName = null;

  // Iterate from oldest to newest (bottom to top) to find an unreplied user
  for (let i = authors.length - 1; i >= 0; i--) {
    const url = cleanUrl(authors[i].href);
    const name = authors[i].textContent.trim();
    const segment = extractProfileSegment(url);

    // Skip self, skip already-replied, skip whitelisted
    if (segment === anaProfilId) continue;
    if (replied.includes(url)) continue;
    if (await isWhitelisted(url)) {
      await log('⏭️', `<strong>${name}</strong> beyaz listede, atlanıyor.`);
      continue;
    }

    target = url;
    targetName = name;
    break;
  }

  if (!target) {
    await log('✅', 'Tüm yorumlar yanıtlandı. 60sn sonra yeniden kontrol edilecek.', 'success');
    await set('repbot_prof_last', { text: 'Tüm yorumlar yanıtlandı, bekleniyor.', time: new Date().toISOString() });
    setTimeout(() => location.reload(), 61000);
    return;
  }

  const gecisMs = rand(
    (AYARLAR.profileGecisMin || 2) * 1000,
    (AYARLAR.profileGecisMax || 4) * 1000
  );

  await log('🎯', `Hedef bulundu: <strong>${targetName}</strong> — ${Math.round(gecisMs / 1000)}sn içinde yönlendiriliyor...`, 'info');

  setTimeout(async () => {
    await set('repbot_current_target', target);
    await set('repbot_current_target_name', targetName);
    goTo(target + '/allcomments');
  }, gecisMs);
}

// ============================================================
// PROFILE WORKER — On target user's profile
// Finds comment box, types humanoid comment, returns to home profile
// ============================================================
async function runTargetProfileWorker() {
  const AYARLAR = (await get('repbot_settings')) || {};
  const anaProfilId = (AYARLAR.anaProfilId || '').toLowerCase();
  const dashUrl = cleanUrl(AYARLAR.anaProfilUrl || '');

  const target     = await get('repbot_current_target');
  const targetName = (await get('repbot_current_target_name')) || target?.split('/')?.pop() || '???';

  if (!target) return;

  // Check if we're on the right page (normalize both URLs for comparison)
  const currentSegment = extractProfileSegment(currentUrl);
  const targetSegment = extractProfileSegment(target);

  if (!targetSegment || currentSegment !== targetSegment) return;

  await log('👤', `<strong>${targetName}</strong> profilinde. Yorum kutusu aranıyor...`);

  let found = false;
  let attempts = 0;
  const maxAttempts = 15;

  const iv = setInterval(async () => {
    attempts++;
    if (found || attempts > maxAttempts) return;

    // Check if we already commented on this profile
    const commentAuthors = Array.from(document.querySelectorAll('.commentthread_comment_author a, .commentthread_author_link'));
    const alreadyCommented = commentAuthors.some(a => {
      const seg = extractProfileSegment(a.href || '');
      return seg === anaProfilId;
    });

    // Find the textarea
    const textarea = document.querySelector('.commentthread_textarea');

    if (alreadyCommented) {
      clearInterval(iv);
      found = true;
      await log('ℹ️', `<strong>${targetName}</strong> profiline zaten rep bırakılmış, atlanıyor.`, 'warning');
      await markReplied(target, targetName, 'profile', false);
      // Clear target so we don't loop
      await set('repbot_current_target', '');
      await set('repbot_current_target_name', '');
      await sleep(1500);
      goTo(dashUrl + '/allcomments');
    } else if (textarea) {
      clearInterval(iv);
      found = true;

      const yorumlar = AYARLAR.profilYorumlar || ['+rep 👍'];
      let yorum = yorumlar[Math.floor(Math.random() * yorumlar.length)];

      // Randomize with emojis for profile comments
      const emojis = ['👍', '🔥', '👑', '💯', '🎯', '🚀', '⭐', '✨', '🏆', '🎮', '💥', '⚡', '🌟', '💪', '🤝', '✌️', '😎'];
      const addEmojiCount = rand(1, 3);
      let emojiStr = ' ';
      for(let e=0; e<addEmojiCount; e++) {
        emojiStr += emojis[Math.floor(Math.random() * emojis.length)];
      }
      yorum += emojiStr;
      const odakMs = rand(
        (AYARLAR.klavyeOdakMin || 2) * 1000,
        (AYARLAR.klavyeOdakMax || 5) * 1000
      );

      await log('⌨️', `<strong>${targetName}</strong> için klavyeye odaklanılıyor... (${Math.round(odakMs / 1000)}sn)`);
      await sleep(odakMs);

      const success = await humanoidYazdir(yorum, textarea, false);

      if (success) {
        await log('✅', `<strong>${targetName}</strong> profiline rep bırakıldı!`, 'success');
        const stats = await markReplied(target, targetName, 'profile');
        await set('repbot_prof_last', { text: `${targetName} profiline rep bırakıldı.`, time: new Date().toISOString() });
        await notify('Rep Bırakıldı ✅', `${targetName} profiline başarıyla rep bırakıldı! (Bugün: ${stats.today})`);

        // Set mola
        const molaMs = rand(
          (AYARLAR.profilMolaMin || 2) * 60 * 1000,
          (AYARLAR.profilMolaMax || 5) * 60 * 1000
        );
        const nextTime = Date.now() + molaMs;
        await set('repbot_profile_next', nextTime.toString());
      } else {
        await log('❌', `<strong>${targetName}</strong> için hata oluştu. Ceza süresi uygulandı.`, 'danger');
        const cezaMs = (AYARLAR.profilCeza || 7200) * 1000;
        const nextTime = Date.now() + cezaMs;
        await set('repbot_profile_next', nextTime.toString());
        await notify('Hata Algılandı ❌', `${targetName} profili için hata. ${Math.round(cezaMs / 60000)} dakika ceza süresi.`);
        await sendDiscord(`❌ Hata: ${targetName} profili — ${Math.round(cezaMs / 60000)} dk ceza`);
      }

      // Clear target and go back
      await set('repbot_current_target', '');
      await set('repbot_current_target_name', '');
      await sleep(2500);
      goTo(dashUrl + '/allcomments');
    }
  }, 1200);

  // If no textarea found in time, skip
  setTimeout(async () => {
    if (!found) {
      clearInterval(iv);
      await log('⚠️', `<strong>${targetName}</strong> profilinde yorum kutusu bulunamadı, atlanıyor.`, 'warning');
      await markReplied(target, targetName, 'profile', false);
      await set('repbot_current_target', '');
      await set('repbot_current_target_name', '');
      goTo(dashUrl + '/allcomments');
    }
  }, maxAttempts * 1200 + 2000);
}

// ============================================================
// GUIDE WORKER — Trend page
// Scrapes guide links from CS2 trending guides page
// ============================================================
async function runGuideTrendWorker() {
  // Daily limit check
  if (await isDailyLimitReached('guide')) return;

  await log('📊', 'CS2 Trend sayfası analiz ediliyor...', 'info');
  await sleep(4000);

  // Find guide links — try multiple selectors for different Steam layouts
  const links = [...new Set(
    Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(h => h && h.includes('/sharedfiles/filedetails/') && !h.includes('#'))
  )].slice(0, 20);

  if (links.length === 0) {
    await log('⚠️', 'Rehber linki bulunamadı. Sayfa yenileniyor...', 'warning');
    setTimeout(() => location.reload(), 8000);
    return;
  }

  // Filter out already-commented guides
  const replied = (await get('repbot_replied_users')) || [];
  const freshLinks = links.filter(l => !replied.includes(cleanUrl(l)));

  if (freshLinks.length === 0) {
    await log('✅', 'Tüm trend rehberlerine zaten yorum yapılmış. 120sn sonra yeniden kontrol edilecek.', 'success');
    setTimeout(() => location.reload(), 120000);
    return;
  }

  await set('repbot_guide_queue', freshLinks);
  await log('📚', `<strong>${freshLinks.length}</strong> yeni rehber kuyruğa alındı. İlk rehbere geçiliyor...`, 'info');
  await sleep(2000);
  goTo(freshLinks[0]);
}

// ============================================================
// GUIDE WORKER — Individual guide page
// Finds comment textarea, posts REP4REP comment with humanoid typing
// ============================================================
async function runGuidePageWorker() {
  const AYARLAR = (await get('repbot_settings')) || {};

  // Daily limit check
  if (await isDailyLimitReached('guide')) return;

  // Rate limit
  const nextTime = parseInt((await get('repbot_guide_next')) || '0');
  if (Date.now() < nextTime) {
    const waitSecs = Math.ceil((nextTime - Date.now()) / 1000);
    await log('⏳', `Rehber botu molada, <strong>${waitSecs}sn</strong> bekleniyor...`, 'warning');
    await set('repbot_guide_last', { text: `Molada: ${Math.ceil(waitSecs / 60)} dk kaldı`, time: new Date().toISOString(), nextTime });
    setTimeout(() => location.reload(), Math.min(waitSecs * 1000 + 1500, 300000));
    return;
  }

  // Get guide title from page
  const guideTitle = document.querySelector('.workshopItemTitle')?.textContent?.trim()
    || document.querySelector('.workshop_item_header .title')?.textContent?.trim()
    || document.title.replace(/Steam (Community|Workshop)\s*::\s*/i, '').trim()
    || 'Bilinmeyen Rehber';

  const okuMs = rand(
    (AYARLAR.okumaHiziMin || 8) * 1000,
    (AYARLAR.okumaHiziMax || 20) * 1000
  );

  await log('📖', `"<strong>${guideTitle}</strong>" rehberi okunuyor... (${Math.round(okuMs / 1000)}sn)`, 'info');
  await sleep(okuMs);

  // Try to scroll down to load comment section
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  await sleep(2000);

  // Try to find and click "Load Comments" or "Show Comments" button if exists
  const expandBtns = document.querySelectorAll('.commentthread_area .commentthread_paging, .commentthread_allcommentslink a');
  expandBtns.forEach(btn => { try { btn.click(); } catch(_) {} });
  await sleep(1500);

  let found = false;
  let attempts = 0;
  const maxAttempts = 15;

  const iv = setInterval(async () => {
    attempts++;
    if (found || attempts > maxAttempts) return;

    const textarea = document.querySelector('.commentthread_textarea');
    if (textarea) {
      clearInterval(iv);
      found = true;

      const yorumlar = AYARLAR.rehberYorumlar || ['+rep harika rehber! 🔥'];
      const yorum = yorumlar[Math.floor(Math.random() * yorumlar.length)];

      await log('⌨️', `"<strong>${guideTitle}</strong>" için yorum yazılıyor...`);
      const success = await humanoidYazdir(yorum, textarea, true);

      if (success) {
        await log('✅', `"<strong>${guideTitle}</strong>" rehberine yorum bırakıldı!`, 'success');
        const stats = await markReplied(rawUrl, guideTitle, 'guide', true);
        await set('repbot_guide_last', { text: `"${guideTitle}" rehberine yorum bırakıldı.`, time: new Date().toISOString() });
        await notify('Rehber Yorumu ✅', `"${guideTitle}" rehberine başarıyla yorum bırakıldı! (Bugün: ${stats.today})`);

        // Mola
        const molaMs = rand(
          (AYARLAR.rehberMolaMin || 3) * 60 * 1000,
          (AYARLAR.rehberMolaMax || 8) * 60 * 1000
        );
        const nextTime = Date.now() + molaMs;
        await set('repbot_guide_next', nextTime.toString());
      } else {
        await log('❌', `"<strong>${guideTitle}</strong>" için hata, ceza süresi uygulandı.`, 'danger');
        const cezaMs = (AYARLAR.rehberCeza || 7200) * 1000;
        const nextTime = Date.now() + cezaMs;
        await set('repbot_guide_next', nextTime.toString());
        await notify('Rehber Hatası ❌', `"${guideTitle}" — ${Math.round(cezaMs / 60000)} dk ceza`);
        await sendDiscord(`❌ Rehber hatası: "${guideTitle}" — ${Math.round(cezaMs / 60000)} dk ceza`);
      }

      await nextGuide(guideTitle);
    }
  }, 1200);

  setTimeout(async () => {
    if (!found) {
      clearInterval(iv);
      await log('⚠️', `"<strong>${guideTitle}</strong>" yorum kutusu yok, atlanıyor.`, 'warning');
      // Mark as replied to skip it next time
      await markReplied(rawUrl, guideTitle, 'guide', false);
      await nextGuide(guideTitle);
    }
  }, maxAttempts * 1200 + 2000);
}

async function nextGuide() {
  let q = (await get('repbot_guide_queue')) || [];
  // Remove current URL from queue
  const currentClean = cleanUrl(currentUrl);
  const currentFull = rawUrl;
  q = q.filter(u => cleanUrl(u) !== currentClean && u !== currentFull);

  if (q.length > 0) {
    await set('repbot_guide_queue', q);
    await log('➡️', `Sıradaki rehbere geçiliyor. Kuyrukta <strong>${q.length}</strong> rehber kaldı.`);
    await sleep(2000);
    goTo(q[0]);
  } else {
    const trendUrl = 'https://steamcommunity.com/app/730/guides/?searchText=&browsefilter=trend&browsesort=creationorder&requiredtags%5B%5D=-1';
    await log('🔄', 'Tur tamamlandı! CS2 trend sayfasına dönülüyor...', 'info');
    await sendDiscord('🔄 Rehber turu tamamlandı, yeni tura başlanıyor.');
    await sleep(3000);
    goTo(trendUrl);
  }
}

// ============================================================
// MAIN — Async page detection & worker dispatch
// ============================================================
async function main() {
  const profActive  = (await get('repbot_prof_active'))  === true;
  const guideActive = (await get('repbot_guide_active')) === true;

  if (!profActive && !guideActive) return;

  const AYARLAR = (await get('repbot_settings')) || {};
  const anaProfilId = (AYARLAR.anaProfilId || '').toLowerCase();
  const anaProfilUrl = cleanUrl(AYARLAR.anaProfilUrl || '');

  // ----- Determine page type (async, using storage-read profile ID) -----
  const currentSegment = extractProfileSegment(currentUrl);
  const isOwnProfile = anaProfilId && currentSegment === anaProfilId;
  const isAllComments = rawUrl.includes('/allcomments');
  const isProfilePage = /steamcommunity\.com\/(id|profiles)\/[^/]+/.test(rawUrl) && !rawUrl.includes('/games') && !rawUrl.includes('/sharedfiles');
  const isTrendPage = rawUrl.includes('/guides') && (rawUrl.includes('browsefilter=trend') || document.title.toLowerCase().includes('trend'));
  const isGuidePage = rawUrl.includes('/sharedfiles/filedetails');

  console.log('[RepBot] Page detected:', { isOwnProfile, isAllComments, isProfilePage, isTrendPage, isGuidePage, currentSegment, anaProfilId });

  // ----- Profile Bot -----
  if (profActive) {
    if (isOwnProfile && isAllComments) {
      // We're on our own profile's /allcomments → scan for targets
      await runProfileWorker();
    } else if (isOwnProfile && !isAllComments) {
      // We're on our own profile but not /allcomments → redirect
      goTo(anaProfilUrl + '/allcomments');
    } else if (isProfilePage && !isOwnProfile) {
      // We're on someone else's profile → check if it's our target
      await runTargetProfileWorker();
    }
  }

  // ----- Guide Bot -----
  if (guideActive) {
    if (isTrendPage) {
      await runGuideTrendWorker();
    } else if (isGuidePage) {
      await runGuidePageWorker();
    }
  }
}

// Small delay to let Steam's React/JS load the DOM
setTimeout(main, 2200);
