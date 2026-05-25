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

