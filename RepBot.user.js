// ==UserScript==
// @name         Steam RepBot Pro
// @namespace    https://github.com/
// @version      9.0
// @description  Otomatik Steam rep karşılama botu. Humanoid motor, rate limit koruması ve gelişmiş panel.
// @author       RepBot Contributors
// @match        *://steamcommunity.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

 
    // =========================================================================
    // 1. SİSTEM AYARLARI VE YAPILANDIRMA
    // NOT: Bu değerler setup.bat tarafından otomatik doldurulur.
    //      Manuel değiştirmek isterseniz __PLACEHOLDER__ değerlerini değiştirin.
    // =========================================================================
    const DEFAULT_AYARLAR = {
        anaProfilId:   "__PROFILE_ID__",
        dashboardUrl:  "__DASHBOARD_URL__",
        trendUrl:      "https://steamcommunity.com/app/730/guides/?searchText=&browsefilter=trend&browsesort=creationorder&requiredtags%5B%5D=-1",

        // Profil botu mola süreleri (saniye)
        profilMolaMin: 120,
        profilMolaMax: 300,
        profilCeza:    7200,

        // Rehber botu mola süreleri (saniye)
        rehberMolaMin: 300,
        rehberMolaMax: 600,
        rehberCeza:    7200,

        // Humanoid yazma hızı (saniye x10 = ms)
        yazmaHiziMin:  3,
        yazmaHiziMax:  7,

        // Rehber okuma süresi (saniye)
        okumaHiziMin:  4,
        okumaHiziMax:  10,

        // Profile geçiş hızı (saniye)
        profileGecisMin: 3,
        profileGecisMax: 8,

        // Klavye odaklanma süresi (saniye)
        klavyeOdakMin: 2,
        klavyeOdakMax: 5
    };

    // localStorage'dan kayıtlı ayarları yükle (panel üzerinden değiştirilenler)
    let kayitliAyarlar = {};
    try { kayitliAyarlar = JSON.parse(localStorage.getItem('repbot_v9_ayarlar') || '{}'); } catch(e) {}
    const AYARLAR = { ...DEFAULT_AYARLAR, ...kayitliAyarlar };

    // =========================================================================
    // YORUM HAVUZLARI
    // =========================================================================
    const profilYorumHavuzu = [
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
    ];

    const rehberYorumHavuzu = [
        `[REP 4 REP INSTANTLY - I AM ONLINE]\nENG: Choose one from the list below and write on my profile, I will return it instantly!\nTR: Aşağıdaki listeden birini seçin ve profilime yazın, anında karşılık vereceğim!\n+rep good player\n+rep friendly guy\n+rep good teammate`,
        `[FAST REP 4 REP! ONLINE & RESPONDING]\nENG: Copy one of these and paste it on my profile, I will do the same for you!\nTR: Bunlardan birini kopyalayıp profilime yapıştırın, aynısını size geri döneceğim!\n+rep clutch king\n+rep insane aim\n+rep godly AWPer`,
        `[REP 4 REP - RETURN 100%]\nENG: Drop one of these comments on my profile and get a fast +rep back!\nTR: Profilime bu yorumlardan birini bırakın, anında +rep ile geri döneyim!\n+rep nice and non-toxic player\n+rep carry machine\n+rep best igl`
    ];

 
    // =========================================================================
    // 2. ORTAK YARDIMCI FONKSİYONLAR & METRİKLER
    // =========================================================================
    const currentUrl = window.location.href.split('?')[0].toLowerCase().replace(/\/$/, '');

    function cleanUrl(url) {
        if (!url) return "";
        let clean = url.split('?')[0].toLowerCase();
        clean = clean.replace(/\/allcomments\/?$/, '');
        return clean.replace(/\/$/, '');
    }

    // Sistem hazır mı? (setup.bat çalıştırıldı mı?)
    const isConfigured = AYARLAR.dashboardUrl !== "__DASHBOARD_URL__" && AYARLAR.dashboardUrl !== "";

    const isDashboardBase       = isConfigured && cleanUrl(currentUrl) === cleanUrl(AYARLAR.dashboardUrl);
    const isAnaProfilAllComments = isConfigured && currentUrl === `${cleanUrl(AYARLAR.dashboardUrl)}/allcomments`;
    const isTrendPage            = window.location.href.includes('browsefilter=trend');
    const isGuidePage            = window.location.href.includes('/sharedfiles/filedetails/?id=');
    const isProfilePage          = currentUrl.includes('/id/') || currentUrl.includes('/profiles/');
    // Panel sadece kullanıcının kendi profilinde görünsün
    const isOwnProfile           = isConfigured && isProfilePage && cleanUrl(currentUrl).startsWith(cleanUrl(AYARLAR.dashboardUrl));

    function goToUrl(url) {
        setLog("Sayfaya geçiliyor...", 0);
        setTimeout(() => { window.location.href = url; }, 1500);
    }

    // Anti-spam: yoruma görünmez benzersiz karakter + rastgele ek ekler
    function antiHashUret(metin) {
        let gizliBosluk = '\u200B'.repeat(Math.floor(Math.random() * 4) + 1);
        const ekler = ["", " 👍", " 🔥", " 😎", "!", " :)"];
        return metin + ekler[Math.floor(Math.random() * ekler.length)] + gizliBosluk;
    }

    function istatistikEkle(tur) {
        let stats = JSON.parse(localStorage.getItem('repbot_v9_stats') || '{"profil":0,"rehber":0,"zamanLog":[]}');
        if (tur === 'PROFIL') stats.profil++;
        if (tur === 'REHBER') stats.rehber++;
        stats.zamanLog.push(Date.now());
        // Sadece son 24 saati tut
        let birGunMs = 24 * 60 * 60 * 1000;
        stats.zamanLog = stats.zamanLog.filter(t => Date.now() - t < birGunMs);
        localStorage.setItem('repbot_v9_stats', JSON.stringify(stats));
    }

    function metrikleriHesapla() {
        let stats = JSON.parse(localStorage.getItem('repbot_v9_stats') || '{"profil":0,"rehber":0,"zamanLog":[]}');
        let simdi = Date.now();
        let son1Saat  = stats.zamanLog.filter(t => simdi - t < 3600000).length;
        let son6Saat  = stats.zamanLog.filter(t => simdi - t < 21600000).length;
        let son24Saat = stats.zamanLog.filter(t => simdi - t < 86400000).length;

        let saatlikDagilim = [0, 0, 0, 0, 0];
        stats.zamanLog.forEach(t => {
            let farkSaat = Math.floor((simdi - t) / 3600000);
            if (farkSaat < 5) saatlikDagilim[4 - farkSaat]++;
        });

        return {
            toplamProfil:  stats.profil,
            toplamRehber:  stats.rehber,
            son1Saat,
            son6Saat,
            son24Saat,
            tahmini24S:    son1Saat > 0 ? son1Saat * 24 : 0,
            saatlikDagilim
        };
    }

    // Rate-limit risk hesaplayıcı
    // Steam'de saatte ~8-12 yorum güvenli eşik. Bunu %100 risk olarak alıyoruz.
    const RATE_LIMIT_SAFE_PER_HOUR = 10;
    function rateLimitHesapla() {
        let veriler = metrikleriHesapla();
        let oran = veriler.son1Saat / RATE_LIMIT_SAFE_PER_HOUR;
        let yuzde = Math.min(Math.round(oran * 100), 100);
        let seviye, renk, ikon, aciklama;
        if (yuzde <= 30)       { seviye = "DÜŞÜK";   renk = "#a3cf06"; ikon = "🟢"; aciklama = "Bot güvenli hızda çalışıyor."; }
        else if (yuzde <= 65)  { seviye = "ORTA";    renk = "#e5b124"; ikon = "🟡"; aciklama = "Dikkat: hız artıyor. Mola ayarlarını kontrol edin."; }
        else                   { seviye = "YÜKSEK";  renk = "#ff4c4c"; ikon = "🔴"; aciklama = "Uyarı: Steam ban riski! Botu durdurup mola süresini artırın."; }
        return { seviye, renk, ikon, yuzde, aciklama, son1Saat: veriler.son1Saat };
    }

    function formatSaniye(s) {
        let m = Math.floor(s / 60);
        let sn = s % 60;
        return `${m > 0 ? m + ' dk ' : ''}${sn} sn`;
    }

 
    // =========================================================================
    // 3. UI, ARAYÜZ VE LOG YÖNETİMİ
    // =========================================================================

    // --- Worker sayfaları için sağ-alt köşe durum kutusu ---
    let logEkrani;
    function setLog(msg, seconds = 0) {
        if (isOwnProfile) return; // Ana panelde log kutusu gösterme
        if (!logEkrani) {
            let isciIsmi = "Worker Modülü";
            let renk = "#66c0f4";
            if (isProfilePage && !isDashboardBase) { isciIsmi = "Profil İşçisi"; renk = "#a3cf06"; }
            if (isGuidePage || isTrendPage)        { isciIsmi = "Rehber İşçisi"; renk = "#e5b124"; }

            logEkrani = document.createElement("div");
            logEkrani.style.cssText = `position:fixed;bottom:25px;right:25px;background:rgba(23,26,33,0.97);color:#fff;padding:16px 20px;border-radius:10px;z-index:999999;border:1px solid ${renk};font-family:'Segoe UI',Arial;width:310px;box-shadow:0 8px 30px rgba(0,0,0,0.7);backdrop-filter:blur(6px);transition:all 0.3s ease;`;
            logEkrani.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px;margin-bottom:10px;">
                    <span style="font-weight:700;font-size:13px;color:${renk};">🤖 ${isciIsmi}</span>
                    <span style="font-size:10px;color:#555;background:#111;padding:2px 8px;border-radius:10px;">RepBot v9</span>
                </div>
                <div id="wrk-log" style="line-height:1.5;font-size:12px;color:#ccc;min-height:18px;"></div>
                <div id="wrk-time" style="color:${renk};font-weight:bold;margin-top:10px;font-size:11px;text-align:right;"></div>`;
            document.body.appendChild(logEkrani);
        }
        document.getElementById('wrk-log').innerText = msg;
        if (window.workerTimer) clearInterval(window.workerTimer);
        if (seconds > 0) {
            let t = seconds;
            document.getElementById('wrk-time').innerText = `⏳ ${formatSaniye(t)}`;
            window.workerTimer = setInterval(() => {
                t--;
                document.getElementById('wrk-time').innerText = t > 0 ? `⏳ ${formatSaniye(t)}` : "🚀 İşlem ediliyor...";
                if (t <= 0) clearInterval(window.workerTimer);
            }, 1000);
        } else {
            document.getElementById('wrk-time').innerText = "⚡ Aktif";
        }
    }

    // === ANA PANEL (Yalnızca kullanıcının kendi profilinde) ===
    if (isOwnProfile || !isConfigured) {

        // --- CSS ---
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            #repbot-btn { transition: all 0.2s ease; font-family: 'Inter', 'Segoe UI', Arial !important; }
            #repbot-btn:hover { filter: brightness(1.15); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(102,192,244,0.4) !important; }
            .rb-tab { transition: all 0.2s ease; cursor:pointer; }
            .rb-btn { transition: all 0.2s ease; cursor:pointer; border:none; }
            .rb-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
            .rb-input:focus { outline:none; border-color:#66c0f4 !important; box-shadow:0 0 0 2px rgba(102,192,244,0.2); }
            .rb-tip { position:relative; cursor:help; }
            .rb-tip::after {
                content: attr(data-tip); position:absolute; left:0; bottom:calc(100% + 6px);
                background:rgba(0,0,0,0.96); color:#e0e0e0; padding:7px 14px; border-radius:7px;
                font-size:11px; white-space:nowrap; z-index:100001; border:1px solid #2a475e;
                pointer-events:none; opacity:0; transform:translateY(4px); transition:all 0.15s ease;
                box-shadow:0 4px 15px rgba(0,0,0,0.6); font-weight:400;
            }
            .rb-tip:hover::after { opacity:1; transform:translateY(0); }
            .rb-bar-wrap { background:rgba(0,0,0,0.35); border-radius:100px; overflow:hidden; height:8px; }
            .rb-bar { height:100%; border-radius:100px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
            #repbot-modal::-webkit-scrollbar { width:6px; }
            #repbot-modal::-webkit-scrollbar-track { background: #111; }
            #repbot-modal::-webkit-scrollbar-thumb { background: #2a475e; border-radius:3px; }
            .rb-setup-banner { animation: rb-pulse 2s infinite; }
            @keyframes rb-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(229,177,36,0.4)} 50%{box-shadow:0 0 0 8px rgba(229,177,36,0)} }
        `;
        document.head.appendChild(styleSheet);

        // --- Açma Butonu ---
        let openBtn = document.createElement("div");
        openBtn.id = "repbot-btn";
        openBtn.innerHTML = `<span style="opacity:0.7;font-size:16px;">🎯</span> REP KONTROL MERKEZİ`;
        openBtn.style.cssText = `position:fixed;top:20px;left:20px;background:linear-gradient(135deg,#1b2838 0%,#2a475e 100%);color:#66c0f4;padding:11px 18px;border-radius:8px;cursor:pointer;z-index:9999999;font-weight:700;border:1px solid rgba(102,192,244,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.5);font-family:'Inter','Segoe UI',Arial;font-size:13px;letter-spacing:0.3px;display:flex;align-items:center;gap:8px;`;
        document.body.appendChild(openBtn);

        // --- Modal ---
        let modal = document.createElement("div");
        modal.id = "repbot-modal";
        modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);z-index:9999999;display:none;justify-content:center;align-items:center;backdrop-filter:blur(10px);font-family:'Inter','Segoe UI',Arial,sans-serif;`;

        // -- Ayar satırı yardımcıları --
        function inputTek(label, id, value, tip) {
            return `<div class="rb-tip" data-tip="${tip}" style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;background:#0e1117;padding:10px 14px;border-radius:7px;border:1px solid #2a3040;">
                    <label style="color:#9ba8b5;font-size:11px;font-weight:600;">${label} <span style="opacity:0.5;">ℹ</span></label>
                    <input class="rb-input" type="text" id="${id}" value="${value}" style="width:240px;padding:6px 10px;background:#1b2838;border:1px solid #2a3a4a;color:#e0e0e0;border-radius:5px;font-size:12px;font-family:inherit;transition:border-color 0.2s;">
                </div>
            </div>`;
        }

        function inputCift(label, baseId, totalSecs, tip) {
            let m = Math.floor(totalSecs / 60), s = totalSecs % 60;
            return `<div class="rb-tip" data-tip="${tip}" style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;background:#0e1117;padding:10px 14px;border-radius:7px;border:1px solid #2a3040;">
                    <label style="color:#9ba8b5;font-size:11px;font-weight:600;">${label} <span style="opacity:0.5;">ℹ</span></label>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <div style="display:flex;align-items:center;gap:4px;">
                            <input class="rb-input" type="number" id="${baseId}_dk" value="${m}" min="0" style="width:48px;padding:6px;background:#1b2838;border:1px solid #2a3a4a;color:#e0e0e0;border-radius:5px;text-align:center;font-weight:600;font-size:13px;font-family:inherit;transition:border-color 0.2s;">
                            <span style="color:#556070;font-size:11px;">dk</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:4px;">
                            <input class="rb-input" type="number" id="${baseId}_sn" value="${s}" min="0" max="59" style="width:48px;padding:6px;background:#1b2838;border:1px solid #2a3a4a;color:#e0e0e0;border-radius:5px;text-align:center;font-weight:600;font-size:13px;font-family:inherit;transition:border-color 0.2s;">
                            <span style="color:#556070;font-size:11px;">sn</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        // -- Kurulum banner'ı (eğer setup yapılmadıysa) --
        let setupBanner = !isConfigured ? `
            <div class="rb-setup-banner" style="background:rgba(229,177,36,0.08);border:1px solid #e5b124;border-radius:8px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px;">
                <span style="font-size:20px;flex-shrink:0;">⚠️</span>
                <div>
                    <div style="font-weight:700;color:#e5b124;font-size:13px;margin-bottom:4px;">Kurulum Tamamlanmamış</div>
                    <div style="color:#9ba8b5;font-size:12px;line-height:1.5;">Profil URL'niz henüz girilmemiş. Lütfen aşağıdan "Bağlantı Ayarları" bölümüne geçerek profilinizi kaydedin veya <strong>setup.bat</strong> dosyasını çalıştırın.</div>
                </div>
            </div>` : '';

        modal.innerHTML = `
            <div style="width:min(980px,95vw);background:#12161e;border:1px solid #1e2d3d;border-radius:14px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.9);display:flex;flex-direction:column;max-height:92vh;">

                <!-- BAŞLIK BAR -->
                <div style="background:linear-gradient(90deg,#0e1520,#162030);display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1a2a3a;padding:0 8px 0 0;">
                    <div style="display:flex;">
                        <div id="rb-tab-dash" class="rb-tab" style="padding:16px 26px;font-size:13px;font-weight:700;color:#fff;border-bottom:2px solid #66c0f4;background:rgba(102,192,244,0.06);">📊 KONTROL MERKEZİ</div>
                        <div id="rb-tab-ayar" class="rb-tab" style="padding:16px 26px;font-size:13px;font-weight:600;color:#556070;border-bottom:2px solid transparent;">⚙️ AYARLAR</div>
                        <div id="rb-tab-log" class="rb-tab" style="padding:16px 26px;font-size:13px;font-weight:600;color:#556070;border-bottom:2px solid transparent;">📋 AKTİVİTE</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:10px;color:#2a3a4a;background:#0a0e15;padding:4px 10px;border-radius:10px;font-weight:600;">RepBot Pro v9</span>
                        <div id="rb-kapat" class="rb-btn" style="padding:8px 14px;color:#ff4c4c;font-weight:700;font-size:18px;border-radius:6px;background:rgba(255,76,76,0.06);">✕</div>
                    </div>
                </div>

                <!-- === TAB 1: KONTROL MERKEZİ === -->
                <div id="rb-content-dash" style="display:flex;padding:22px;gap:20px;overflow-y:auto;flex:1;">

                    <!-- Sol: İşçi Yönetimi -->
                    <div style="width:300px;flex-shrink:0;display:flex;flex-direction:column;gap:16px;">

                        ${setupBanner}

                        <div style="font-size:11px;font-weight:700;color:#2a4a6a;letter-spacing:1.5px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #1a2430;">İŞÇİ YÖNETİMİ</div>

                        <!-- Profil İşçisi Kartı -->
                        <div style="background:#0e1520;border:1px solid #1a2838;border-radius:10px;padding:18px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                <div style="font-weight:700;color:#a3cf06;font-size:14px;">📌 Profil İşçisi</div>
                                <div id="rb-durum-profil" style="font-size:10px;padding:3px 9px;border-radius:20px;background:#111;color:#556070;font-weight:600;">⚪ BEKLEMEDE</div>
                            </div>
                            <div style="font-size:11px;color:#4a5a6a;margin-bottom:14px;line-height:1.6;">Profilimdeki yorumları tarar. Sana rep yazanlara insansı gecikmelerle karşılık verir.</div>
                            <button id="rb-btn-profil" class="rb-btn" style="width:100%;padding:11px;font-weight:700;border-radius:7px;background:#a3cf06;color:#0a0f00;font-size:12px;letter-spacing:0.5px;">▶ PROFİL BOTUNU BAŞLAT</button>
                        </div>

                        <!-- Rehber İşçisi Kartı -->
                        <div style="background:#0e1520;border:1px solid #1a2838;border-radius:10px;padding:18px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                <div style="font-weight:700;color:#e5b124;font-size:14px;">📚 Rehber İşçisi</div>
                                <div id="rb-durum-rehber" style="font-size:10px;padding:3px 9px;border-radius:20px;background:#111;color:#556070;font-weight:600;">⚪ BEKLEMEDE</div>
                            </div>
                            <div style="font-size:11px;color:#4a5a6a;margin-bottom:14px;line-height:1.6;">Trend CS2 rehberlerine gider, rep ilanı bırakır. Müşteri çekme aracı.</div>
                            <button id="rb-btn-rehber" class="rb-btn" style="width:100%;padding:11px;font-weight:700;border-radius:7px;background:#e5b124;color:#0a0800;font-size:12px;letter-spacing:0.5px;">▶ REHBER BOTUNU BAŞLAT</button>
                        </div>

                        <!-- Tüm İşçileri Durdur -->
                        <button id="rb-btn-durdur" class="rb-btn" style="width:100%;padding:10px;font-weight:600;border-radius:7px;background:rgba(255,76,76,0.08);color:#ff4c4c;border:1px solid rgba(255,76,76,0.25);font-size:12px;">⏹ TÜM BOTLARI DURDUR</button>
                    </div>

                    <!-- Sağ: Metrikler -->
                    <div style="flex:1;display:flex;flex-direction:column;gap:16px;">

                        <!-- Rate Limit Risk Meter -->
                        <div id="rb-risk-panel" style="background:#0e1520;border:1px solid #1a2838;border-radius:10px;padding:18px;">
                            <div style="font-size:11px;font-weight:700;color:#2a4a6a;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">🛡️ BAN RİSKİ & RATE LIMIT</div>
                            <div style="display:flex;gap:16px;align-items:center;">
                                <div id="rb-risk-ikon" style="font-size:32px;flex-shrink:0;line-height:1;">🟢</div>
                                <div style="flex:1;">
                                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                                        <span id="rb-risk-seviye" style="font-weight:700;font-size:13px;color:#a3cf06;">DÜŞÜK RİSK</span>
                                        <span id="rb-risk-yuzde" style="font-size:12px;color:#556070;">0 / saat</span>
                                    </div>
                                    <div class="rb-bar-wrap">
                                        <div id="rb-risk-bar" class="rb-bar" style="width:0%;background:#a3cf06;"></div>
                                    </div>
                                    <div id="rb-risk-aciklama" style="font-size:11px;color:#4a5a6a;margin-top:8px;line-height:1.5;">Bot güvenli hızda çalışıyor.</div>
                                </div>
                            </div>
                        </div>

                        <!-- İstatistik Kartları -->
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                            <div style="background:#0e1520;border:1px solid #1a2838;border-radius:10px;padding:14px;text-align:center;">
                                <div style="font-size:10px;color:#4a5a6a;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;">Profil Rep</div>
                                <div id="rb-tot-profil" style="font-size:26px;font-weight:700;color:#a3cf06;">0</div>
                            </div>
                            <div style="background:#0e1520;border:1px solid #1a2838;border-radius:10px;padding:14px;text-align:center;">
                                <div style="font-size:10px;color:#4a5a6a;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;">Rehber İlan</div>
                                <div id="rb-tot-rehber" style="font-size:26px;font-weight:700;color:#e5b124;">0</div>
                            </div>
                            <div style="background:#0e1520;border:1px solid #1a2838;border-radius:10px;padding:14px;text-align:center;">
                                <div style="font-size:10px;color:#4a5a6a;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;">Son 1 Saat</div>
                                <div id="rb-son1s" style="font-size:26px;font-weight:700;color:#66c0f4;">0</div>
                            </div>
                            <div style="background:#0e1520;border:1px solid #1a2838;border-radius:10px;padding:14px;text-align:center;">
                                <div style="font-size:10px;color:#4a5a6a;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;">24s Projeksiyon</div>
                                <div id="rb-tahmin" style="font-size:26px;font-weight:700;color:#c0a0f4;">0</div>
                            </div>
                        </div>

                        <!-- Saatlik Aktivite Grafiği -->
                        <div style="background:#0e1520;border:1px solid #1a2838;border-radius:10px;padding:18px;flex:1;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                                <span style="font-size:11px;font-weight:700;color:#2a4a6a;letter-spacing:1.5px;text-transform:uppercase;">SON 5 SAATİN AKTİVİTESİ</span>
                                <span style="font-size:10px;color:#2a3a4a;background:#0a0e15;padding:3px 8px;border-radius:10px;">Toplam İşlem</span>
                            </div>
                            <div id="rb-chart" style="display:flex;align-items:flex-end;gap:12px;height:120px;"></div>
                        </div>
                    </div>
                </div>

                <!-- === TAB 2: AYARLAR === -->
                <div id="rb-content-ayar" style="display:none;padding:22px;overflow-y:auto;flex:1;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                        <div>
                            <div style="font-size:11px;font-weight:700;color:#2a4a6a;letter-spacing:1.5px;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid #1a2430;margin-bottom:14px;">🔗 BAĞLANTI AYARLARI</div>
                            ${inputTek("Profil URL", "set_dashboardUrl", AYARLAR.dashboardUrl.replace('__DASHBOARD_URL__',''), "Kendi Steam profil linkiniz (Örn: https://steamcommunity.com/id/kullaniciadiniz)")}
                            ${inputTek("Profil ID", "set_anaProfilId", AYARLAR.anaProfilId.replace('__PROFILE_ID__',''), "Profil URL'sindeki kullanıcı adı/ID (URL'den otomatik çekilir)")}
                            ${inputTek("Trend URL", "set_trendUrl", AYARLAR.trendUrl, "CS2 trend rehberler sayfası (genelde değiştirmenize gerek yok)")}

                            <div style="font-size:11px;font-weight:700;color:#2a4a6a;letter-spacing:1.5px;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid #1a2430;margin:20px 0 14px 0;">📌 PROFİL MOLA SÜRELERİ</div>
                            ${inputCift("Mola Min", "set_pMin", AYARLAR.profilMolaMin, "İki rep yanıtı arasındaki minimum bekleme")}
                            ${inputCift("Mola Max", "set_pMax", AYARLAR.profilMolaMax, "İki rep yanıtı arasındaki maksimum bekleme")}
                            ${inputCift("Hata/Ban Cezası", "set_pCeza", AYARLAR.profilCeza, "Steam hata alındığında profil botunun bekleme cezası")}
                        </div>
                        <div>
                            <div style="font-size:11px;font-weight:700;color:#2a4a6a;letter-spacing:1.5px;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid #1a2430;margin-bottom:14px;">📚 REHBER MOLA SÜRELERİ</div>
                            ${inputCift("Reklam Min", "set_rMin", AYARLAR.rehberMolaMin, "Rehbere reklam atma arası minimum bekleme")}
                            ${inputCift("Reklam Max", "set_rMax", AYARLAR.rehberMolaMax, "Rehbere reklam atma arası maksimum bekleme")}
                            ${inputCift("Hata/Ban Cezası", "set_rCeza", AYARLAR.rehberCeza, "Steam hata alındığında rehber botunun bekleme cezası")}

                            <div style="font-size:11px;font-weight:700;color:#2a4a6a;letter-spacing:1.5px;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid #1a2430;margin:20px 0 14px 0;">🤖 HUMANOID MOTOR</div>
                            ${inputCift("Yazma Min", "set_yazMin", AYARLAR.yazmaHiziMin, "Tuş vuruşları arası min süre (saniye x10 = ms)")}
                            ${inputCift("Yazma Max", "set_yazMax", AYARLAR.yazmaHiziMax, "Tuş vuruşları arası max süre")}
                            ${inputCift("Okuma Min", "set_okuMin", AYARLAR.okumaHiziMin, "Rehberde yorum öncesi min kalma süresi")}
                            ${inputCift("Okuma Max", "set_okuMax", AYARLAR.okumaHiziMax, "Rehberde yorum öncesi max kalma süresi")}
                            ${inputCift("Geçiş Min", "set_gecisMin", AYARLAR.profileGecisMin, "Profile tıklayıp gitme hızı (min)")}
                            ${inputCift("Geçiş Max", "set_gecisMax", AYARLAR.profileGecisMax, "Profile tıklayıp gitme hızı (max)")}
                            ${inputCift("Odaklanma Min", "set_klavyeMin", AYARLAR.klavyeOdakMin, "Profilde textarea'ya tıklama gecikmesi (min)")}
                            ${inputCift("Odaklanma Max", "set_klavyeMax", AYARLAR.klavyeOdakMax, "Profilde textarea'ya tıklama gecikmesi (max)")}
                        </div>
                    </div>

                    <div style="display:flex;gap:12px;margin-top:22px;border-top:1px solid #1a2430;padding-top:18px;">
                        <button id="rb-btn-kaydet" class="rb-btn" style="flex:4;padding:13px;background:linear-gradient(90deg,#1a6090,#2a8bc0);color:#fff;border-radius:7px;font-weight:700;font-size:13px;letter-spacing:0.5px;">💾 TÜM AYARLARI KAYDET</button>
                        <button id="rb-btn-sifirla" class="rb-btn" style="flex:1;padding:13px;background:rgba(255,76,76,0.06);color:#ff4c4c;border:1px solid rgba(255,76,76,0.2);border-radius:7px;font-weight:600;font-size:12px;">🔄 SIFIRLA</button>
                    </div>
                </div>

                <!-- === TAB 3: AKTİVİTE LOGU === -->
                <div id="rb-content-log" style="display:none;padding:22px;overflow-y:auto;flex:1;">
                    <div style="font-size:11px;font-weight:700;color:#2a4a6a;letter-spacing:1.5px;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid #1a2430;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
                        <span>📋 İŞLEM GEÇMİŞİ</span>
                        <button id="rb-btn-log-temizle" class="rb-btn" style="font-size:10px;color:#556070;background:rgba(255,255,255,0.03);border:1px solid #1a2430;padding:4px 10px;border-radius:5px;font-weight:600;">TEMİZLE</button>
                    </div>
                    <div id="rb-activity-log" style="font-size:12px;color:#4a5a6a;line-height:2;font-family:'Courier New',monospace;"></div>
                    <div id="rb-log-empty" style="text-align:center;color:#2a3a4a;font-size:13px;padding:40px 0;">Henüz aktivite yok. Botları başlatın!</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // ============================================================
        // Sekme Geçişleri
        // ============================================================
        function switchTab(activeId) {
            const tabs    = ['dash','ayar','log'];
            const tabEls  = tabs.map(t => document.getElementById(`rb-tab-${t}`));
            const contEls = tabs.map(t => document.getElementById(`rb-content-${t}`));
            tabs.forEach((t, i) => {
                let isActive = t === activeId;
                tabEls[i].style.color         = isActive ? '#fff' : '#556070';
                tabEls[i].style.borderBottom  = isActive ? '2px solid #66c0f4' : '2px solid transparent';
                tabEls[i].style.background    = isActive ? 'rgba(102,192,244,0.06)' : 'transparent';
                contEls[i].style.display      = isActive ? (activeId === 'log' || activeId === 'ayar' ? 'block' : 'flex') : 'none';
            });
        }
        document.getElementById('rb-tab-dash').onclick  = () => switchTab('dash');
        document.getElementById('rb-tab-ayar').onclick  = () => switchTab('ayar');
        document.getElementById('rb-tab-log').onclick   = () => switchTab('log');

        // ============================================================
        // Bot Durum Gösterimi
        // ============================================================
        function botDurumlariniGuncelle() {
            let pAktif = localStorage.getItem('v9_profil_worker') === 'true';
            let rAktif = localStorage.getItem('v9_rehber_worker') === 'true';
            let btnP = document.getElementById('rb-btn-profil');
            let btnR = document.getElementById('rb-btn-rehber');
            let durP = document.getElementById('rb-durum-profil');
            let durR = document.getElementById('rb-durum-rehber');

            if (pAktif) {
                btnP.innerText = "⏹ PROFİL BOTUNU DURDUR";
                btnP.style.background = "rgba(255,76,76,0.12)"; btnP.style.color = "#ff4c4c"; btnP.style.border = "1px solid rgba(255,76,76,0.3)";
                durP.innerHTML = "🟢 ÇALIŞIYOR"; durP.style.color = "#a3cf06"; durP.style.background = "rgba(163,207,6,0.1)";
            } else {
                btnP.innerText = "▶ PROFİL BOTUNU BAŞLAT";
                btnP.style.background = "#a3cf06"; btnP.style.color = "#0a0f00"; btnP.style.border = "none";
                durP.innerHTML = "⚪ BEKLEMEDE"; durP.style.color = "#556070"; durP.style.background = "#111";
            }
            if (rAktif) {
                btnR.innerText = "⏹ REHBER BOTUNU DURDUR";
                btnR.style.background = "rgba(255,76,76,0.12)"; btnR.style.color = "#ff4c4c"; btnR.style.border = "1px solid rgba(255,76,76,0.3)";
                durR.innerHTML = "🟢 ÇALIŞIYOR"; durR.style.color = "#e5b124"; durR.style.background = "rgba(229,177,36,0.1)";
            } else {
                btnR.innerText = "▶ REHBER BOTUNU BAŞLAT";
                btnR.style.background = "#e5b124"; btnR.style.color = "#0a0800"; btnR.style.border = "none";
                durR.innerHTML = "⚪ BEKLEMEDE"; durR.style.color = "#556070"; durR.style.background = "#111";
            }
        }

        // ============================================================
        // Metrikleri & Risk Panelini Güncelle
        // ============================================================
        function panelGuncelle() {
            let v = metrikleriHesapla();
            document.getElementById('rb-tot-profil').innerText = v.toplamProfil;
            document.getElementById('rb-tot-rehber').innerText = v.toplamRehber;
            document.getElementById('rb-son1s').innerText      = v.son1Saat;
            document.getElementById('rb-tahmin').innerText     = v.tahmini24S;

            // Rate limit
            let r = rateLimitHesapla();
            document.getElementById('rb-risk-ikon').innerText        = r.ikon;
            document.getElementById('rb-risk-seviye').innerText      = r.seviye + " RİSK";
            document.getElementById('rb-risk-seviye').style.color    = r.renk;
            document.getElementById('rb-risk-yuzde').innerText       = `${r.son1Saat} / saat`;
            document.getElementById('rb-risk-bar').style.width       = `${r.yuzde}%`;
            document.getElementById('rb-risk-bar').style.background  = r.renk;
            document.getElementById('rb-risk-aciklama').innerText    = r.aciklama;

            // Grafik
            let chart = document.getElementById('rb-chart');
            chart.innerHTML = "";
            let maxVal = Math.max(...v.saatlikDagilim, 1);
            v.saatlikDagilim.forEach((val, idx) => {
                let pct   = (val / maxVal) * 100;
                let label = idx === 4 ? "Şimdi" : `-${4-idx}s`;
                let r2    = rateLimitHesapla();
                let barColor = val === 0 ? '#1a2430' : (pct > 80 ? '#ff4c4c' : (pct > 50 ? '#e5b124' : '#66c0f4'));
                chart.innerHTML += `
                    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px;">
                        <div style="font-size:10px;color:#66c0f4;font-weight:700;opacity:${val>0?1:0}">${val}</div>
                        <div style="width:100%;max-width:36px;background:${barColor};height:${pct}%;border-radius:5px 5px 0 0;transition:height 0.5s cubic-bezier(0.4,0,0.2,1);min-height:${val>0?4:0}px;box-shadow:${val>0?`0 -2px 8px ${barColor}44`:''};"></div>
                        <div style="font-size:10px;color:#2a3a4a;">${label}</div>
                    </div>`;
            });

            botDurumlariniGuncelle();
        }

        // ============================================================
        // Aktivite Log Sistemi
        // ============================================================
        function logEkle(msg) {
            let container = document.getElementById('rb-activity-log');
            let empty = document.getElementById('rb-log-empty');
            if (!container) return;
            let zaman = new Date().toLocaleTimeString('tr-TR');
            container.innerHTML = `<span style="color:#2a4a6a;">[${zaman}]</span> <span style="color:#9ba8b5;">${msg}</span>\n` + container.innerHTML;
            if (empty) empty.style.display = 'none';
        }

        // ============================================================
        // Bot Buton Olayları
        // ============================================================
        document.getElementById('rb-btn-profil').onclick = () => {
            let aktif = localStorage.getItem('v9_profil_worker') === 'true';
            localStorage.setItem('v9_profil_worker', aktif ? 'false' : 'true');
            if (!aktif) {
                logEkle("Profil botu başlatıldı → " + AYARLAR.dashboardUrl + "/allcomments");
                window.open(`${AYARLAR.dashboardUrl}/allcomments`, '_blank', 'width=1100,height=850');
            } else {
                logEkle("Profil botu durduruldu.");
            }
            botDurumlariniGuncelle();
        };

        document.getElementById('rb-btn-rehber').onclick = () => {
            let aktif = localStorage.getItem('v9_rehber_worker') === 'true';
            localStorage.setItem('v9_rehber_worker', aktif ? 'false' : 'true');
            if (!aktif) {
                logEkle("Rehber botu başlatıldı → CS2 Trend Sayfası");
                localStorage.setItem('repbot_guide_queue', '[]');
                window.open(AYARLAR.trendUrl, '_blank', 'width=1100,height=850');
            } else {
                logEkle("Rehber botu durduruldu.");
            }
            botDurumlariniGuncelle();
        };

        document.getElementById('rb-btn-durdur').onclick = () => {
            localStorage.setItem('v9_profil_worker', 'false');
            localStorage.setItem('v9_rehber_worker', 'false');
            logEkle("Tüm botlar durduruldu.");
            botDurumlariniGuncelle();
        };

        // ============================================================
        // Ayar Kaydetme
        // ============================================================
        function alSaniye(id) {
            let dk = parseInt(document.getElementById(id + '_dk').value, 10) || 0;
            let sn = parseInt(document.getElementById(id + '_sn').value, 10) || 0;
            return (dk * 60) + sn;
        }

        document.getElementById('rb-btn-kaydet').onclick = () => {
            let url = document.getElementById('set_dashboardUrl').value.trim().replace(/\/$/, '');
            // Profil ID'yi URL'den otomatik çek
            let idMatch = url.match(/\/id\/([^\/]+)|\/profiles\/([^\/]+)/);
            let autoId  = idMatch ? (idMatch[1] || idMatch[2]) : document.getElementById('set_anaProfilId').value.trim();

            let yeni = {
                dashboardUrl:    url,
                anaProfilId:     autoId || document.getElementById('set_anaProfilId').value.trim(),
                trendUrl:        document.getElementById('set_trendUrl').value.trim(),
                profilMolaMin:   alSaniye('set_pMin'),  profilMolaMax: alSaniye('set_pMax'),  profilCeza:   alSaniye('set_pCeza'),
                rehberMolaMin:   alSaniye('set_rMin'),  rehberMolaMax: alSaniye('set_rMax'),  rehberCeza:   alSaniye('set_rCeza'),
                yazmaHiziMin:    alSaniye('set_yazMin'), yazmaHiziMax: alSaniye('set_yazMax'),
                okumaHiziMin:    alSaniye('set_okuMin'), okumaHiziMax: alSaniye('set_okuMax'),
                profileGecisMin: alSaniye('set_gecisMin'), profileGecisMax: alSaniye('set_gecisMax'),
                klavyeOdakMin:   alSaniye('set_klavyeMin'), klavyeOdakMax: alSaniye('set_klavyeMax')
            };
            localStorage.setItem('repbot_v9_ayarlar', JSON.stringify(yeni));
            logEkle("Ayarlar kaydedildi. Profil ID: " + yeni.anaProfilId);

            let btn = document.getElementById('rb-btn-kaydet');
            btn.innerText = "✅ AYARLAR KAYDEDİLDİ — Sayfa yenileniyor...";
            btn.style.background = "#a3cf06"; btn.style.color = "#0a0f00";
            setTimeout(() => location.reload(), 1500);
        };

        document.getElementById('rb-btn-sifirla').onclick = () => {
            if (confirm("Tüm ayarları sıfırlamak istediğinizden emin misiniz?")) {
                localStorage.removeItem('repbot_v9_ayarlar');
                localStorage.removeItem('repbot_v9_stats');
                location.reload();
            }
        };

        document.getElementById('rb-btn-log-temizle').onclick = () => {
            document.getElementById('rb-activity-log').innerHTML = "";
            document.getElementById('rb-log-empty').style.display = 'block';
        };

        // ============================================================
        // Modal Aç/Kapa
        // ============================================================
        openBtn.onclick = () => { modal.style.display = "flex"; panelGuncelle(); };
        document.getElementById('rb-kapat').onclick = () => { modal.style.display = "none"; };
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

        // Otomatik güncelleme (her 3s)
        setInterval(() => { if (modal.style.display === "flex") panelGuncelle(); }, 3000);
    }

 
    // =========================================================================
    // 4. HUMANOID YAZMA MOTORU
    // Anti-bot korumasına karşı gerçek klavye davranışı simülasyonu
    // =========================================================================
    async function humanoidYazdir(yorumMetni, isGuide, callback) {
        let textarea = document.querySelector('.commentthread_textarea');
        if (!textarea) return callback(false);

        let benzersizYorum = antiHashUret(yorumMetni);
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 1500));
        textarea.focus();
        textarea.value = "";

        // Uzun metinlerde hız artır (doğal davranış)
        let isHeavyText = benzersizYorum.length > 100;
        for (let i = 0; i < benzersizYorum.length; i++) {
            textarea.value += benzersizYorum[i];
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            // Rastgele duraklama (insansı)
            let minTus = isHeavyText ? 8  : ((AYARLAR.yazmaHiziMin * 10) || 40);
            let maxTus = isHeavyText ? 30 : ((AYARLAR.yazmaHiziMax * 10) || 90);
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * (maxTus - minTus + 1)) + minTus));
        }

        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 800));

        let gonderBtn = textarea.closest('.commentthread_entry').querySelector('.btn_green_white_innerfade');
        if (gonderBtn) {
            gonderBtn.classList.remove('btn_disabled');
            let innerSpan = gonderBtn.querySelector('span');
            if (innerSpan) { innerSpan.click(); } else { gonderBtn.click(); }

            let attempts = 0;
            let checkInterval = setInterval(() => {
                attempts++;
                let currentText   = textarea.value.trim();
                let containerText = textarea.closest('.commentthread_entry').innerText.toLowerCase();
                let isError = containerText.includes('hata') || containerText.includes('sık') || containerText.includes('error');

                if (isError || attempts >= 10) {
                    clearInterval(checkInterval);
                    let ceza = isGuide ? AYARLAR.rehberCeza : AYARLAR.profilCeza;
                    localStorage.setItem(isGuide ? 'repbot_guide_next' : 'repbot_profile_next', (Date.now() + (ceza * 1000)).toString());
                    callback(false);
                    return;
                }

                if (currentText === "") {
                    clearInterval(checkInterval);
                    istatistikEkle(isGuide ? 'REHBER' : 'PROFIL');
                    let minMs  = (isGuide ? AYARLAR.rehberMolaMin  : AYARLAR.profilMolaMin)  * 1000;
                    let maxMs  = (isGuide ? AYARLAR.rehberMolaMax  : AYARLAR.profilMolaMax)  * 1000;
                    let waitMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
                    localStorage.setItem(isGuide ? 'repbot_guide_next' : 'repbot_profile_next', (Date.now() + waitMs).toString());
                    callback(true);
                }
            }, 1000);
        } else {
            callback(false);
        }
    }

 
    // =========================================================================
    // 5. İŞÇİ MODÜLLERİ (WORKERS)
    // Her worker ayrı bir sekmede çalışır, localStorage üzerinden senkronize olur
    // =========================================================================

    // localStorage key'leri v9 prefix'i ile (eski v8 kayıtlarla çakışmasın)
    let pWorkerActive = localStorage.getItem('v9_profil_worker') === 'true';

    // --- PROFİL WORKER: Kendi profil yorum sayfasında çalışır ---
    if (pWorkerActive && isAnaProfilAllComments) {
        let waitSecs = Math.ceil((parseInt(localStorage.getItem('repbot_profile_next') || '0') - Date.now()) / 1000);

        if (waitSecs > 0) {
            setLog("Mola sürüyor — Profil botu bekliyor...", waitSecs);
            setTimeout(() => location.reload(), (waitSecs * 1000) + 1500);
        } else {
            setLog("Yorumlar taranıyor...", 3);
            setTimeout(() => {
                let authors = Array.from(document.querySelectorAll('.commentthread_author_link')).filter(a => a.href);
                let replied = JSON.parse(localStorage.getItem('repbot_replied_users') || '[]');
                let target  = null;

                // En yeni yorumdan başlayarak yanıtlanmamış kullanıcı bul
                for (let i = authors.length - 1; i >= 0; i--) {
                    let uUrl = cleanUrl(authors[i].href);
                    if (!uUrl.includes(AYARLAR.anaProfilId) && !replied.includes(uUrl)) {
                        target = uUrl;
                        break;
                    }
                }

                if (target) {
                    let gecisMin = AYARLAR.profileGecisMin * 1000;
                    let gecisMax = AYARLAR.profileGecisMax * 1000;
                    let gecisMs  = Math.floor(Math.random() * (gecisMax - gecisMin + 1)) + gecisMin;
                    setLog(`Hedef bulundu → ${target.split('/').pop()}`, Math.round(gecisMs / 1000));
                    setTimeout(() => {
                        localStorage.setItem('repbot_current_target', target);
                        goToUrl(target + '/allcomments');
                    }, gecisMs);
                } else {
                    setLog("Tüm yorumlar yanıtlandı. 60s bekleniyor...", 60);
                    setTimeout(() => location.reload(), 61000);
                }
            }, 3000);
        }
    }

    // --- PROFİL WORKER: Hedef kullanıcının profilinde çalışır ---
    else if (pWorkerActive && isProfilePage && !isAnaProfilAllComments && !isDashboardBase) {
        let target = localStorage.getItem('repbot_current_target');

        if (cleanUrl(currentUrl) === target) {
            setLog("Müşteri profilindeyiz. Yorum kutusu aranıyor...");
            let checkBox = setInterval(() => {
                let hasCommented = Array.from(document.querySelectorAll('.commentthread_comment_author a'))
                    .some(a => cleanUrl(a.href).includes(AYARLAR.anaProfilId));
                let textarea = document.querySelector('.commentthread_textarea');

                if (hasCommented) {
                    clearInterval(checkBox);
                    setLog("Buraya zaten rep bırakılmış. Geri dönülüyor...", 2);
                    let rep = JSON.parse(localStorage.getItem('repbot_replied_users') || '[]');
                    rep.push(target);
                    localStorage.setItem('repbot_replied_users', JSON.stringify(rep));
                    goToUrl(`${AYARLAR.dashboardUrl}/allcomments`);
                } else if (textarea) {
                    clearInterval(checkBox);
                    let yrm     = profilYorumHavuzu[Math.floor(Math.random() * profilYorumHavuzu.length)];
                    let odakMin = AYARLAR.klavyeOdakMin * 1000;
                    let odakMax = AYARLAR.klavyeOdakMax * 1000;
                    let mola    = Math.floor(Math.random() * (odakMax - odakMin + 1)) + odakMin;
                    setLog("Klavyeye odaklanılıyor...", Math.round(mola / 1000));
                    setTimeout(() => {
                        humanoidYazdir(yrm, false, (success) => {
                            if (success) {
                                let rep = JSON.parse(localStorage.getItem('repbot_replied_users') || '[]');
                                rep.push(target);
                                localStorage.setItem('repbot_replied_users', JSON.stringify(rep));
                                setLog("✅ Rep bırakıldı! Ana profile dönülüyor...", 2);
                            } else {
                                setLog("⚠️ Hata. Ban cezası uygulandı. Dönülüyor...", 3);
                            }
                            goToUrl(`${AYARLAR.dashboardUrl}/allcomments`);
                        });
                    }, mola);
                }
            }, 1200);
        }
    }

    // --- REHBER WORKER ---
    let rWorkerActive = localStorage.getItem('v9_rehber_worker') === 'true';

    if (rWorkerActive && (isTrendPage || isGuidePage)) {

        // Trend sayfasında: rehber linklerini topla
        if (isTrendPage) {
            setLog("CS2 Trend Sayfası analiz ediliyor...", 4);
            setTimeout(() => {
                let links = [...new Set(
                    Array.from(document.querySelectorAll('a'))
                        .map(a => a.href)
                        .filter(h => h.includes('/sharedfiles/filedetails/?id=') && !h.includes('#'))
                )];
                if (links.length > 0) {
                    links = links.slice(0, 20);
                    localStorage.setItem('repbot_guide_queue', JSON.stringify(links));
                    setLog(`${links.length} rehber kuyruğa alındı. Başlanıyor...`, 2);
                    goToUrl(links[0]);
                } else {
                    setLog("Rehber bulunamadı. Yenileniyor...", 5);
                    setTimeout(() => location.reload(), 5000);
                }
            }, 4000);
        }

        // Rehber sayfasında: yorum at, sonrakine geç
        else if (isGuidePage) {
            let waitSecs = Math.ceil((parseInt(localStorage.getItem('repbot_guide_next') || '0') - Date.now()) / 1000);
            if (waitSecs > 0) {
                setLog("Rehber botu molada...", waitSecs);
                setTimeout(() => location.reload(), (waitSecs * 1000) + 1500);
            } else {
                let okuMs = Math.floor(Math.random() * ((AYARLAR.okumaHiziMax - AYARLAR.okumaHiziMin) * 1000)) + (AYARLAR.okumaHiziMin * 1000);
                setLog("Rehber okunuyor (İnsan Simülasyonu)...", Math.round(okuMs / 1000));

                setTimeout(() => {
                    let checkBox = setInterval(() => {
                        let textarea = document.querySelector('.commentthread_textarea');
                        if (textarea) {
                            clearInterval(checkBox);
                            let yrm = rehberYorumHavuzu[Math.floor(Math.random() * rehberYorumHavuzu.length)];
                            humanoidYazdir(yrm, true, () => sonrakiRehbereGec());
                        }
                    }, 1200);
                    // 10 saniye içinde yorum kutusu çıkmazsa geç
                    setTimeout(() => { clearInterval(checkBox); sonrakiRehbereGec(); }, 10000);
                }, okuMs);
            }
        }

        function sonrakiRehbereGec() {
            let q = JSON.parse(localStorage.getItem('repbot_guide_queue') || '[]');
            q = q.filter(u => u !== currentUrl && u !== window.location.href);
            if (q.length > 0) {
                localStorage.setItem('repbot_guide_queue', JSON.stringify(q));
                setLog(`Kuyrukta ${q.length} rehber kaldı. Geçiliyor...`, 2);
                goToUrl(q[0]);
            } else {
                setLog("Tur tamamlandı! Trend sayfasına dönülüyor...", 3);
                goToUrl(AYARLAR.trendUrl);
            }
        }
    }

 

})();
 
