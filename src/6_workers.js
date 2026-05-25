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

