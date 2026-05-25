# 🎯 Steam RepBot Pro

<div align="center">

![Version](https://img.shields.io/badge/version-9.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey?style=for-the-badge)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-4.x%2B-orange?style=for-the-badge)

**Steam'de rep takasını tamamen otomatikleştiren, ban riskini minimize eden, humanoid motor kullanan profesyonel userscript.**

</div>

---

## 📌 Ne İşe Yarar?

Steam üzerinde rep (yorum) takasını otomatikleştiren bir araçtır. Manuel işlem yapmak yerine:

- 🤖 **Profil Botu** — Profilinize rep bırakan kullanıcıları tespit eder ve onların profiline gidip karşılıklı rep bırakır
- 📚 **Rehber Botu** — CS2 trend rehberlere giderek rep ilanı yayınlar ve yeni müşteri çeker
- 🛡️ **Rate Limit Koruması** — Steam'in ban mekanizmasını gerçek zamanlı izler, renge kodlanmış risk göstergesi sunar
- 🧠 **Humanoid Motor** — Gerçek klavye davranışı simüle eder; hız, duraklama ve karakterler arası süre rastgele ayarlanır

---

## ⚡ Kurulum (3 Adım)

### Gereksinimler
- Windows 10/11
- Herhangi bir modern tarayıcı (Chrome, Edge, Firefox, Brave)
- [Tampermonkey](https://www.tampermonkey.net/) uzantısı (tarayıcınıza yükleyin)

### Adımlar

**1.** Bu repoyu indirin (Yeşil "Code" → "Download ZIP") ve klasörü açın.

**2.** `setup.bat` dosyasına **çift tıklayın**. Sihirbaz şunları soracak:
```
Steam profil linkinizi girin:
> https://steamcommunity.com/id/kullaniciadiniz
```
Profil linkinizi yapıştırıp Enter'a basın. Geri kalan her şeyi sihirbaz otomatik halleder:
- Profil ID'nizi URL'den çeker
- Ayarları yapılandırır
- `RepBot.user.js` dosyasını derler
- Tarayıcınızı açarak Tampermonkey kurulum ekranını gösterir

**3.** Açılan Tampermonkey penceresinde **"Yükle"** butonuna tıklayın.

> ✅ **Bitti!** Steam profilinize gidin. Sol üstte `🎯 REP KONTROL MERKEZİ` butonunu görüyorsanız kurulum başarılıdır.

---

## 🖥️ Kullanım

### Kontrol Paneli
Sol üstteki `🎯` butonuna tıklayarak paneli açın.

| Sekme | İçerik |
|---|---|
| 📊 Kontrol Merkezi | Bot başlatma/durdurma, rate limit göstergesi, canlı istatistikler |
| ⚙️ Ayarlar | Profil URL, mola süreleri, humanoid motor ayarları |
| 📋 Aktivite | Yapılan işlemlerin zaman damgalı logu |

### Profil Botu'nu Başlatmak
1. **📊 Kontrol Merkezi** sekmesini açın
2. **▶ PROFİL BOTUNU BAŞLAT** butonuna tıklayın
3. Yeni bir sekme açılır ve bot arka planda çalışmaya başlar
4. İstediğinizde **⏹ DURDUR** butonuyla durdurun

### Rehber Botu'nu Başlatmak
1. **▶ REHBER BOTUNU BAŞLAT** butonuna tıklayın
2. Bot CS2 trend rehberleri gezer, her birine ilan bırakır
3. Tur bitince otomatik olarak yeniden başlar

---

## 🛡️ Rate Limit ve Ban Koruması

**Kontrol Merkezi'ndeki gösterge** sizi gerçek zamanlı uyarır:

| Gösterge | Anlam |
|---|---|
| 🟢 DÜŞÜK | < 3 yorum/saat — Tamamen güvenli |
| 🟡 ORTA | 3–7 yorum/saat — Dikkatli olun |
| 🔴 YÜKSEK | > 7 yorum/saat — Botu durdurun! |

Sistem ayrıca hata alındığında otomatik olarak bir **ceza süresi** uygular (varsayılan: 2 saat). Bu süre boyunca bot kendiliğinden bekler.

---

## ⚙️ Gelişmiş Ayarlar

Paneldeki **⚙️ Ayarlar** sekmesinden tüm parametreleri değiştirebilirsiniz:

### Profil Mola Süreleri
| Ayar | Varsayılan | Açıklama |
|---|---|---|
| Mola Min | 2 dk | İki rep arasındaki minimum bekleme |
| Mola Max | 5 dk | İki rep arasındaki maksimum bekleme |
| Hata Cezası | 2 saat | Steam hata verince bekleme süresi |

### Humanoid Motor
| Ayar | Varsayılan | Açıklama |
|---|---|---|
| Yazma Min | ~30ms | Tuş vuruşları arası minimum süre |
| Yazma Max | ~70ms | Tuş vuruşları arası maksimum süre |
| Odaklanma | 2–5 sn | Textarea'ya tıklama gecikmesi |

---

## 📁 Proje Yapısı

```
repbot/
├── src/
│   ├── 1_header.js      # Tampermonkey meta ve IIFE başlangıcı
│   ├── 2_config.js      # Ayarlar ve yorum havuzları (setup.bat doldurur)
│   ├── 3_utils.js       # URL yönetimi, metrikler, rate limit hesaplayıcı
│   ├── 4_ui.js          # Kontrol paneli arayüzü
│   ├── 5_engine.js      # Humanoid yazma motoru
│   ├── 6_workers.js     # Profil ve rehber işçi döngüleri
│   └── 7_main.js        # IIFE kapanışı
├── setup.bat            # ← Kullanıcının çalıştırdığı tek dosya
├── build.bat            # Modülleri birleştirici (geliştiriciler için)
├── RepBot.user.js       # Derlenen hazır script (setup.bat üretir)
└── README.md
```

> **Not:** `src/` klasöründeki dosyalar geliştiriciler içindir. Normal kullanım için yalnızca `setup.bat` yeterlidir.

---

## 🔧 Geliştirici Notları

Bir modülü değiştirip yeniden derlemek için:

```bat
build.bat
```

Ardından `RepBot.user.js` dosyasını Tampermonkey'de güncelleyin.

### localStorage Anahtarları
| Anahtar | Açıklama |
|---|---|
| `repbot_v9_ayarlar` | Kullanıcı ayarları (JSON) |
| `repbot_v9_stats` | İstatistikler (JSON) |
| `v9_profil_worker` | Profil botu aktif mi? (true/false) |
| `v9_rehber_worker` | Rehber botu aktif mi? (true/false) |
| `repbot_replied_users` | Yanıt verilen kullanıcı listesi |
| `repbot_current_target` | Aktif hedef profil URL'si |
| `repbot_guide_queue` | Rehber işleme kuyruğu (JSON array) |

---

## ⚠️ Yasal Uyarı

Bu araç yalnızca eğitim ve kişisel kullanım amaçlıdır. Steam'in Kullanım Koşulları'nı ihlal etmek kullanıcının sorumluluğundadır. Geliştirici, bu aracın kullanımından doğacak hiçbir yaptırımdan sorumlu tutulamaz.

---

## 📄 Lisans

MIT License — Özgürce kullanın, değiştirin ve paylaşın.
