    // =========================================================================
    // 1. SÃ„Â°STEM AYARLARI VE YAPILANDIRMA
    // NOT: Bu deÃ„Å¸erler setup.bat tarafÃ„Â±ndan otomatik doldurulur.
    //      Manuel deÃ„Å¸iÃ…Å¸tirmek isterseniz __PLACEHOLDER__ deÃ„Å¸erlerini deÃ„Å¸iÃ…Å¸tirin.
    // =========================================================================
    const DEFAULT_AYARLAR = {
        anaProfilId:   "v3cna1998",
        dashboardUrl:  "https://steamcommunity.com/id/v3cna1998",
        trendUrl:      "https://steamcommunity.com/app/730/guides/?searchText=&browsefilter=trend&browsesort=creationorder&requiredtags%5B%5D=-1",

        // Profil botu mola sÃƒÂ¼releri (saniye)
        profilMolaMin: 120,
        profilMolaMax: 300,
        profilCeza:    7200,

        // Rehber botu mola sÃƒÂ¼releri (saniye)
        rehberMolaMin: 300,
        rehberMolaMax: 600,
        rehberCeza:    7200,

        // Humanoid yazma hÃ„Â±zÃ„Â± (saniye x10 = ms)
        yazmaHiziMin:  3,
        yazmaHiziMax:  7,

        // Rehber okuma sÃƒÂ¼resi (saniye)
        okumaHiziMin:  4,
        okumaHiziMax:  10,

        // Profile geÃƒÂ§iÃ…Å¸ hÃ„Â±zÃ„Â± (saniye)
        profileGecisMin: 3,
        profileGecisMax: 8,

        // Klavye odaklanma sÃƒÂ¼resi (saniye)
        klavyeOdakMin: 2,
        klavyeOdakMax: 5
    };

    // localStorage'dan kayÃ„Â±tlÃ„Â± ayarlarÃ„Â± yÃƒÂ¼kle (panel ÃƒÂ¼zerinden deÃ„Å¸iÃ…Å¸tirilenler)
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
        `[REP 4 REP INSTANTLY - I AM ONLINE]\nENG: Choose one from the list below and write on my profile, I will return it instantly!\nTR: AÃ…Å¸aÃ„Å¸Ã„Â±daki listeden birini seÃƒÂ§in ve profilime yazÃ„Â±n, anÃ„Â±nda karÃ…Å¸Ã„Â±lÃ„Â±k vereceÃ„Å¸im!\n+rep good player\n+rep friendly guy\n+rep good teammate`,
        `[FAST REP 4 REP! ONLINE & RESPONDING]\nENG: Copy one of these and paste it on my profile, I will do the same for you!\nTR: Bunlardan birini kopyalayÃ„Â±p profilime yapÃ„Â±Ã…Å¸tÃ„Â±rÃ„Â±n, aynÃ„Â±sÃ„Â±nÃ„Â± size geri dÃƒÂ¶neceÃ„Å¸im!\n+rep clutch king\n+rep insane aim\n+rep godly AWPer`,
        `[REP 4 REP - RETURN 100%]\nENG: Drop one of these comments on my profile and get a fast +rep back!\nTR: Profilime bu yorumlardan birini bÃ„Â±rakÃ„Â±n, anÃ„Â±nda +rep ile geri dÃƒÂ¶neyim!\n+rep nice and non-toxic player\n+rep carry machine\n+rep best igl`
    ];





