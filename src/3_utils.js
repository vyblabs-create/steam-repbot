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

