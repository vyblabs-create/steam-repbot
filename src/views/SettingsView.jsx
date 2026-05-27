import { useState, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { useToast } from '../App.jsx';
import { loadSettings, saveSettings, resetSettings, exportAllSettings, importSettings } from '../storage.js';

// ============================================================
// UI COMPONENTS
// ============================================================
function Tooltip({ content }) {
  return (
    <span className="tooltip-trigger">
      <Icon.HelpCircle />
      <span className="tooltip-content">{content}</span>
    </span>
  );
}

function RangeInput({ label, hint, minKey, maxKey, settings, onChange, unit = 'dk', tooltip }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </label>
      <div className="form-input-range">
        <input
          className="form-input"
          type="number"
          min="0"
          value={settings[minKey] ?? ''}
          onChange={e => onChange(minKey, Number(e.target.value))}
        />
        <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>—</span>
        <input
          className="form-input"
          type="number"
          min="0"
          value={settings[maxKey] ?? ''}
          onChange={e => onChange(maxKey, Number(e.target.value))}
        />
        <span style={{ color: 'var(--text-3)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{unit}</span>
      </div>
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange, tooltip }) {
  return (
    <div className="toggle-wrapper">
      <div className="toggle-info">
        <span className="toggle-label">
          {label} {tooltip && <Tooltip content={tooltip} />}
        </span>
        <span className="toggle-desc">{desc}</span>
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
}

// ============================================================
// SETTINGS VIEW
// ============================================================
export default function SettingsView() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [urlStatus, setUrlStatus] = useState('idle'); // idle, valid, invalid

  useEffect(() => {
    loadSettings().then(s => {
      setSettings(s);
      validateUrl(s.anaProfilUrl);
    });
  }, []);

  if (!settings) {
    return (
      <div className="page-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-3)' }}>Yükleniyor...</span>
      </div>
    );
  }

  const update = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }));
    if (key === 'anaProfilUrl') validateUrl(value);
  };

  const validateUrl = (url) => {
    if (!url) {
      setUrlStatus('idle');
      return;
    }
    const match = url.match(/steamcommunity\.com\/(id|profiles)\/([^/]+)/);
    setUrlStatus(match ? 'valid' : 'invalid');
  };

  const handleSave = async () => {
    const url = settings.anaProfilUrl || '';
    const match = url.match(/steamcommunity\.com\/(id|profiles)\/([^/]+)/);
    const id = match ? match[2] : '';
    
    // Process whitelist string array
    const whitelistRaw = Array.isArray(settings.whitelist) 
      ? settings.whitelist 
      : (settings.whitelist || '').split('\n').map(l => l.trim()).filter(Boolean);

    const updated = { 
      ...settings, 
      anaProfilId: id,
      whitelist: whitelistRaw
    };
    
    setSettings(updated);
    await saveSettings(updated);
    setSaved(true);
    addToast('Ayarlar başarıyla kaydedildi!', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    try {
      const data = await exportAllSettings();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repbot-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Yedekleme dosyası indirildi.', 'success');
    } catch (e) {
      addToast('Dışa aktarma başarısız.', 'danger');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.version) throw new Error('Geçersiz dosya');
        await importSettings(data);
        const s = await loadSettings();
        setSettings(s);
        validateUrl(s.anaProfilUrl);
        addToast('Ayarlar başarıyla geri yüklendi!', 'success');
      } catch (err) {
        addToast('Geri yükleme hatası. Geçersiz JSON.', 'danger');
      }
    };
    input.click();
  };

  const handleReset = async () => {
    if (!window.confirm('Tüm ayarlar (yorumlar dahil) varsayılana döndürülecek. Onaylıyor musunuz?')) return;
    await resetSettings();
    const s = await loadSettings();
    setSettings(s);
    validateUrl(s.anaProfilUrl);
    addToast('Ayarlar sıfırlandı.', 'info');
  };

  return (
    <div className="page-content fade-in">

      <div className="settings-actions slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="settings-actions-left">
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>
            <Icon.Download /> Dışa Aktar (Yedekle)
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleImport}>
            <Icon.Upload /> Geri Yükle
          </button>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleReset}>
          <Icon.RotateCcw /> Varsayılana Sıfırla
        </button>
      </div>

      {/* Profile Settings */}
      <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="card-header">
          <div className="card-title">
            <div className="card-icon blue"><Icon.User /></div>
            Profil Ayarları
          </div>
        </div>
        <div className="settings-section">
          <div className="form-group">
            <label className="form-label">
              Steam Profil URL'niz
              <Tooltip content="Bot bu profildeki cevaplanmamış yorumları arar." />
            </label>
            <input
              className={`form-input ${urlStatus === 'valid' ? 'valid' : urlStatus === 'invalid' ? 'invalid' : ''}`}
              type="url"
              placeholder="https://steamcommunity.com/id/kullaniciadiniz"
              value={settings.anaProfilUrl || ''}
              onChange={e => update('anaProfilUrl', e.target.value)}
            />
            {urlStatus === 'valid' && (
              <span className="form-validation valid">
                <Icon.Check /> Profil Doğrulandı (ID: {settings.anaProfilUrl.match(/\/([^/]+)$/)?.[1] || '?'})
              </span>
            )}
            {urlStatus === 'invalid' && (
              <span className="form-validation invalid">
                <Icon.X /> Geçersiz veya eksik Steam URL'si
              </span>
            )}
          </div>
          
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Beyaz Liste (Whitelist) <Tooltip content="Bot bu listedeki isimlere veya ID'lere sahip kişilere asla otomatik yanıt vermez." /></label>
              <textarea
                className="textarea-pool"
                rows={3}
                placeholder="Örn: enyakinarkadasim&#10;steam_id_12345"
                value={Array.isArray(settings.whitelist) ? settings.whitelist.join('\n') : (settings.whitelist || '')}
                onChange={e => update('whitelist', e.target.value)}
                style={{ minHeight: '80px' }}
              />
              <span className="form-hint">Her satıra bir profil ID veya isim girin.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Limits & Protection */}
      <div className="card slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="card-header">
          <div className="card-title">
            <div className="card-icon yellow"><Icon.Shield /></div>
            Limitler & Ban Koruması
          </div>
        </div>
        <div className="settings-section">
          
          <Toggle 
            label="Günlük Hedef Sınırı (Hard Cap)" 
            desc="Günlük hedefe ulaşıldığında bot otomatik olarak durur ve hesabınızı korur."
            checked={settings.enableDailyLimit}
            onChange={v => update('enableDailyLimit', v)}
            tooltip="Aktif edildiğinde, günlük hedef aşılamaz. Tavsiye edilen maksimum rep sayısı 80'dir."
          />

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Günlük Profil Hedefi</label>
              <input className="form-input" type="number" min="1" value={settings.dailyProfTarget || 50} onChange={e => update('dailyProfTarget', Number(e.target.value))} disabled={!settings.enableDailyLimit} />
            </div>
            <div className="form-group">
              <label className="form-label">Günlük Rehber Hedefi</label>
              <input className="form-input" type="number" min="1" value={settings.dailyGuideTarget || 30} onChange={e => update('dailyGuideTarget', Number(e.target.value))} disabled={!settings.enableDailyLimit} />
            </div>
            <RangeInput label="Profil Bot Mola Süresi" minKey="profilMolaMin" maxKey="profilMolaMax" settings={settings} onChange={update} unit="dk" tooltip="İki profil yorumu arasındaki bekleme aralığı." />
            <RangeInput label="Rehber Bot Mola Süresi" minKey="rehberMolaMin" maxKey="rehberMolaMax" settings={settings} onChange={update} unit="dk" tooltip="İki rehber yorumu arasındaki bekleme aralığı." />
            
            <div className="form-group">
              <label className="form-label">Profil Bot Hata Cezası</label>
              <div className="form-input-range">
                <input className="form-input" type="number" min="0" value={Math.round((settings.profilCeza || 7200) / 60)} onChange={e => update('profilCeza', Number(e.target.value) * 60)} />
                <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>dk</span>
              </div>
              <span className="form-hint">Steam hata verince beklenecek süre.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Rehber Bot Hata Cezası</label>
              <div className="form-input-range">
                <input className="form-input" type="number" min="0" value={Math.round((settings.rehberCeza || 7200) / 60)} onChange={e => update('rehberCeza', Number(e.target.value) * 60)} />
                <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>dk</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Humanoid Engine */}
      <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="card-header">
          <div className="card-title">
            <div className="card-icon purple"><Icon.Activity /></div>
            İnsansılaştırma (Humanoid Engine)
          </div>
        </div>
        <div className="settings-section">
          <Toggle 
            label="Test Modu (Dry Run)" 
            desc="Aktif edildiğinde bot her şeyi simüle eder ancak 'Gönder' butonuna basmaz."
            checked={settings.testMode}
            onChange={v => update('testMode', v)}
            tooltip="Ayarlarınızı ve yorum havuzunuzu ban riski olmadan test etmek için idealdir."
          />

          <div className="grid-2">
            <RangeInput label="Tuş Vuruş Hızı" hint="Karakterler arası bekleme" minKey="yazmaHiziMin" maxKey="yazmaHiziMax" settings={settings} onChange={update} unit="× 10ms" />
            <RangeInput label="Tıklama Gecikmesi" hint="Yorum kutusuna tıklamadan önceki bekleme" minKey="klavyeOdakMin" maxKey="klavyeOdakMax" settings={settings} onChange={update} unit="sn" />
            <RangeInput label="Profil Geçiş Süresi" hint="Hedef profile yönlendirmeden önceki bekleme" minKey="profileGecisMin" maxKey="profileGecisMax" settings={settings} onChange={update} unit="sn" />
            <RangeInput label="Rehber Okuma Hızı" hint="Rehberde aşağı kaydırıp okuma bekleme süresi" minKey="okumaHiziMin" maxKey="okumaHiziMax" settings={settings} onChange={update} unit="sn" />
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="card slide-up" style={{ animationDelay: '0.25s' }}>
        <div className="card-header">
          <div className="card-title">
            <div className="card-icon" style={{ background: '#5865F220', color: '#5865F2' }}><Icon.Bell /></div>
            Entegrasyonlar & Bildirimler
          </div>
        </div>
        <div className="settings-section">
          <Toggle 
            label="Masaüstü Bildirimleri" 
            desc="Bot hata aldığında veya hedefe ulaştığında Chrome üzerinden bildirim gönderir."
            checked={settings.enableNotifications}
            onChange={v => update('enableNotifications', v)}
          />
          <div className="form-group">
            <label className="form-label">Discord Webhook URL (Opsiyonel) <Tooltip content="Hata ve uyarıları otomatik olarak Discord sunucunuza gönderir." /></label>
            <input
              className="form-input"
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={settings.discordWebhook || ''}
              onChange={e => update('discordWebhook', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Comment Pools */}
      <div className="card slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="card-header">
          <div className="card-title">
            <div className="card-icon green"><Icon.Book /></div>
            Yorum Havuzları
          </div>
        </div>
        <div className="settings-section">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Profil Yorumları (Her satır ayrı yorum)</label>
              <textarea
                className="textarea-pool"
                rows={6}
                value={(settings.profilYorumlar || []).join('\n')}
                onChange={e => update('profilYorumlar', e.target.value.split('\n').filter(l => l.trim()))}
                placeholder="+rep güzel oyuncu, teşekkürler!&#10;+rep çok nazik, tavsiye ederim 👍&#10;..."
              />
              <span className="form-hint">{(settings.profilYorumlar || []).length} yorum tanımlı. Bot rastgele birini seçer.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Rehber Yorumları (Her satır ayrı yorum)</label>
              <textarea
                className="textarea-pool"
                rows={6}
                value={(settings.rehberYorumlar || []).join('\n')}
                onChange={e => update('rehberYorumlar', e.target.value.split('\n').filter(l => l.trim()))}
                placeholder="Harika bir rehber! +rep 🔥&#10;Çok işime yaradı, teşekkürler! +rep&#10;..."
              />
              <span className="form-hint">{(settings.rehberYorumlar || []).length} yorum tanımlı. (Çok satırlı yorumlar için \n kullanmayın, orijinal metni bozmayın)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', position: 'sticky', bottom: '0', padding: '1rem 0', background: 'var(--bg-base)', zIndex: 10 }}>
        <button className={`btn ${saved ? 'btn-success' : 'btn-primary'}`} onClick={handleSave} style={{ minWidth: '200px' }}>
          <Icon.Save /> {saved ? 'Kaydedildi!' : 'Tüm Ayarları Kaydet'}
        </button>
      </div>

    </div>
  );
}
