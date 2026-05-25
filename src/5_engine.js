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

