import { useState, useEffect, useRef } from 'react';
import { Icon } from '../icons.jsx';
import { useToast } from '../App.jsx';
import {
  loadSettings, getBotActive, setBotActive, getStats, getDailyHistory,
  getActivityLog, addActivityLog, getLastAction, setLastAction,
  clearActivityLog, getNextTime
} from '../storage.js';

// ============================================================
// HELPERS
// ============================================================
function fmtTime(iso) {
  if (!iso) return '--:--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour12: false });
}

function GaugeCircle({ pct, color }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} stroke="rgba(255,255,255,0.07)" strokeWidth="7" fill="none" />
      <circle
        cx="40" cy="40" r={r}
        stroke={color}
        strokeWidth="7"
        fill="none"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1), stroke 0.4s' }}
        filter={`drop-shadow(0 0 6px ${color})`}
      />
    </svg>
  );
}

// ============================================================
// COUNTDOWN COMPONENT
// ============================================================
function CountdownDisplay({ nextTimeMs }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!nextTimeMs || nextTimeMs <= Date.now()) {
      setTimeLeft(0);
      return;
    }
    
    const update = () => {
      const diff = Math.max(0, Math.floor((nextTimeMs - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [nextTimeMs]);

  if (timeLeft <= 0) return null;

  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="countdown-bar">
      <Icon.Clock />
      <span>Mola Süresi:</span>
      <span className="countdown-time">{m}:{s}</span>
    </div>
  );
}

// ============================================================
// 7-DAY CHART COMPONENT
// ============================================================
function DailyChart({ history, dailyTarget }) {
  // Pad to 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('tr-TR', { weekday: 'short' });
    const entry = history.find(h => h.date === dateStr) || { profile: 0, guide: 0 };
    days.push({ dayName, ...entry });
  }

  const maxVal = Math.max(dailyTarget * 1.5, ...days.map(d => d.profile + d.guide), 10);

  return (
    <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="card-header" style={{ marginBottom: '0.5rem' }}>
        <div className="card-title">
          <div className="card-icon blue" style={{ width: 24, height: 24 }}><Icon.BarChart /></div>
          7 Günlük Performans
        </div>
        <div className="chart-legend">
          <div className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: 'var(--accent)' }} /> Profil
          </div>
          <div className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: 'var(--accent-2)' }} /> Rehber
          </div>
        </div>
      </div>
      
      <div className="chart-container">
        {days.map((d, i) => {
          const total = d.profile + d.guide;
          const profPct = Math.min((d.profile / maxVal) * 100, 100);
          const guidePct = Math.min((d.guide / maxVal) * 100, 100);
          
          return (
            <div key={i} className="chart-bar-group">
              <span className="chart-value">{total > 0 ? total : ''}</span>
              <div className="chart-bar-stack" style={{ height: '70px', justifyContent: 'flex-end' }}>
                <div className="chart-bar guide" style={{ height: `${guidePct}%` }} title={`Rehber: ${d.guide}`} />
                <div className="chart-bar profile" style={{ height: `${profPct}%` }} title={`Profil: ${d.profile}`} />
              </div>
              <span className="chart-label">{d.dayName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// BOT CARD COMPONENT
// ============================================================
function BotCard({ type, label, emoji, description, trendUrl }) {
  const { addToast } = useToast();
  const [active, setActive] = useState(false);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [lastAction, setLastActionState] = useState({ text: 'Henüz işlem yapılmadı.', time: null, nextTime: 0 });

  useEffect(() => {
    const load = async () => {
      setActive(await getBotActive(type));
      setStats(await getStats(type));
      const last = await getLastAction(type);
      
      // If we have a nextTime that is in the future, bot is paused/mola
      const nextTime = await getNextTime(type);
      setLastActionState({ ...last, nextTime });
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [type]);

  const toggle = async () => {
    const settings = await loadSettings();
    if (type === 'profile' && !settings.anaProfilId) {
      addToast('Önce Ayarlar kısmından profil URL\'nizi girmelisiniz.', 'warning');
      return;
    }

    const next = !active;
    await setBotActive(type, next);
    setActive(next);

    const msg = next ? `${label} başlatıldı.` : `${label} durduruldu.`;
    
    await addActivityLog({ icon: next ? '▶️' : '⏹', text: msg, kind: next ? 'info' : 'warning' });
    await setLastAction(type, msg);
    setLastActionState({ text: msg, time: new Date().toISOString(), nextTime: 0 });

    addToast(msg, next ? 'success' : 'warning');

    if (next) {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        let url = '';
        if (type === 'guide' && trendUrl) url = trendUrl;
        if (type === 'profile') url = settings.anaProfilUrl + '/allcomments';
        
        if (url) {
          chrome.runtime.sendMessage({ type: 'OPEN_TAB', url, active: false });
        }
      }
    }
  };

  const isPaused = active && lastAction.nextTime > Date.now();
  const stateClass = isPaused ? 'paused' : (active ? 'running' : '');

  return (
    <div className={`bot-card ${stateClass}`}>
      <div className="bot-header">
        <div className="bot-name">
          <span>{emoji}</span>
          <span>{label}</span>
        </div>
        <span className={`bot-badge ${isPaused ? 'paused' : (active ? 'running' : 'idle')}`}>
          {isPaused ? 'MOLADA' : (active ? 'ÇALIŞIYOR' : 'BEKLEMEDE')}
        </span>
      </div>

      <p className="bot-description">{description}</p>

      {isPaused && <CountdownDisplay nextTimeMs={lastAction.nextTime} />}

      <div className="bot-stats">
        <div className="bot-stat">
          <span className="bot-stat-label">Bugün</span>
          <span className="bot-stat-value">{stats.today}</span>
        </div>
        <div className="bot-stat">
          <span className="bot-stat-label">Toplam</span>
          <span className="bot-stat-value">{stats.total}</span>
        </div>
        <div className="bot-stat">
          <span className="bot-stat-label">Son İşlem</span>
          <span className="bot-stat-value" style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>
            {fmtTime(lastAction.time)}
          </span>
        </div>
      </div>

      <div className="bot-last-action">{lastAction.text}</div>

      <button
        className={`btn btn-full ${active ? (isPaused ? 'btn-warning' : 'btn-danger') : 'btn-primary'}`}
        onClick={toggle}
      >
        {active ? <><Icon.Stop /> {isPaused ? 'Molayı İptal Et / Durdur' : 'Durdur'}</> : <><Icon.Play /> {label}&apos;u Başlat</>}
      </button>
    </div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
export default function DashboardView({ onNavigate }) {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [profStats, setProfStats] = useState({ total: 0, today: 0 });
  const [guideStats, setGuideStats] = useState({ total: 0, today: 0 });
  const [riskPct, setRiskPct] = useState(5);
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      setSettings(await loadSettings());
    };
    init();

    const load = async () => {
      const l = await getActivityLog();
      setLogs(l.slice(0, 80));
      
      const pStats = await getStats('profile');
      const gStats = await getStats('guide');
      setProfStats(pStats);
      setGuideStats(gStats);
      setHistory(await getDailyHistory());

      const total = (pStats.today || 0) + (gStats.today || 0);
      setRiskPct(Math.min(total * 4, 100)); // 25 reps = 100% risk roughly
    };
    
    load();
    const iv = setInterval(load, 2000);
    return () => clearInterval(iv);
  }, []);

  const handleMasterToggle = async () => {
    if (!settings?.anaProfilId) {
      addToast('Önce Ayarlar kısmından profil URL\'nizi girmelisiniz.', 'warning');
      onNavigate('settings');
      return;
    }

    const profActive = await getBotActive('profile');
    const guideActive = await getBotActive('guide');
    
    const shouldStart = !(profActive && guideActive); // If both are not active, start both. If both active, stop both.
    
    await setBotActive('profile', shouldStart);
    await setBotActive('guide', shouldStart);
    
    addToast(`Tüm botlar ${shouldStart ? 'başlatıldı' : 'durduruldu'}!`, shouldStart ? 'success' : 'warning');
    
    if (shouldStart) {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'OPEN_TAB', url: settings.anaProfilUrl + '/allcomments', active: false });
        chrome.runtime.sendMessage({ type: 'OPEN_TAB', url: 'https://steamcommunity.com/app/730/guides/?searchText=&browsefilter=trend&browsesort=creationorder&requiredtags%5B%5D=-1', active: false });
      }
    }
  };

  if (!settings) return null;

  const riskColor = riskPct < 35 ? 'var(--success)' : riskPct < 65 ? 'var(--warning)' : 'var(--danger)';
  const riskLabel = riskPct < 35 ? 'DÜŞÜK' : riskPct < 65 ? 'ORTA' : 'YÜKSEK';
  const riskClass = riskPct < 35 ? 'risk-low' : riskPct < 65 ? 'risk-mid' : 'risk-high';

  const totalToday = (profStats.today || 0) + (guideStats.today || 0);
  const dailyTarget = (settings.dailyProfTarget || 50) + (settings.dailyGuideTarget || 30);

  return (
    <div className="page-content fade-in">
      
      {/* Test Mode Banner */}
      {settings.testMode && (
        <div className="test-mode-banner fade-in">
          <Icon.AlertTriangle />
          TEST MODU AKTİF: Bot yorum yapıyormuş gibi davranır ancak gerçekte yorum göndermez. Sadece loglara kaydeder.
        </div>
      )}

      {/* Onboarding Wizard */}
      {!settings.anaProfilId && (
        <div className="onboarding-card">
          <div className="onboarding-icon">👋</div>
          <h2 className="onboarding-title">RepBot Pro'ya Hoş Geldiniz!</h2>
          <p className="onboarding-desc">
            Botu çalıştırmadan önce <strong>Ana Profil URL</strong>'nizi sisteme tanıtmanız gerekmektedir. 
            Bu profil, botun gelen yorumları okuyacağı "merkez üssü" olacaktır.
          </p>
          <div className="onboarding-steps">
            <div className="onboarding-step">
              <div className="onboarding-step-number">1</div>
              <div className="onboarding-step-text">Steam Profilinize Gidin</div>
            </div>
            <div className="onboarding-step">
              <div className="onboarding-step-number">2</div>
              <div className="onboarding-step-text">URL'yi Kopyalayın</div>
            </div>
            <div className="onboarding-step">
              <div className="onboarding-step-number">3</div>
              <div className="onboarding-step-text">Ayarlara Yapıştırın</div>
            </div>
          </div>
          <button className="btn btn-primary mt-3" onClick={() => onNavigate('settings')}>
            Ayarlara Git ve URL'yi Gir <Icon.ArrowRight />
          </button>
        </div>
      )}

      {settings.anaProfilId && (
        <>
          {/* Master Switch & Stats */}
          <div className="grid-2">
            <div className="master-switch-card slide-up">
              <div className="master-switch-info">
                <div className="master-switch-icon"><Icon.Power /></div>
                <div className="master-switch-text">
                  <h3>Sistem Anahtarı</h3>
                  <p>Her iki botu da eşzamanlı olarak kontrol et</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleMasterToggle}>
                Hepsini Aç / Kapat
              </button>
            </div>
            <DailyChart history={history} dailyTarget={dailyTarget} />
          </div>

          {/* Stat Row */}
          <div className="grid-3 slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="stat-card">
              <span className="stat-label">Bugün Atılan Rep</span>
              <span className="stat-number">{profStats.today || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>/ {settings.dailyProfTarget}</span></span>
              <span className="stat-sub">Profil işlemleri</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Bugün Rehber Yorumu</span>
              <span className="stat-number">{guideStats.today || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>/ {settings.dailyGuideTarget}</span></span>
              <span className="stat-sub">CS2 rehberlerine</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Toplam İşlem</span>
              <span className="stat-number">{(profStats.total || 0) + (guideStats.total || 0)}</span>
              <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
                <div className="progress-fill" style={{ width: `${Math.min((totalToday / dailyTarget) * 100, 100)}%` }} />
              </div>
              <span className="stat-sub">{totalToday} / {dailyTarget} günlük hedef</span>
            </div>
          </div>

          {/* Bot Cards */}
          <div className="grid-2 slide-up" style={{ animationDelay: '0.2s' }}>
            <BotCard
              type="profile"
              label="Profil Botu"
              emoji="👤"
              description="Profilinize yorum bırakanları tespit eder, kendi profillerine gidip insansılaştırılmış rep bırakır."
            />
            <BotCard
              type="guide"
              label="Rehber Botu"
              emoji="📚"
              description="CS2 trend rehberlerine giderek rep4rep yorumu bırakır, profilinize yeni müşteri çeker."
              trendUrl="https://steamcommunity.com/app/730/guides/?searchText=&browsefilter=trend&browsesort=creationorder&requiredtags%5B%5D=-1"
            />
          </div>

          {/* Bottom Row: Risk + Log */}
          <div className="grid-2 slide-up" style={{ animationDelay: '0.3s' }}>
            {/* Ban Risk */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon" style={{ background: riskPct < 35 ? 'var(--success-dim)' : riskPct < 65 ? 'var(--warning-dim)' : 'var(--danger-dim)', color: riskColor }}>
                    <Icon.Shield />
                  </div>
                  Spam Risk Göstergesi
                </div>
              </div>
              <div className="gauge-wrapper">
                <div className="gauge-svg-wrap">
                  <GaugeCircle pct={riskPct} color={riskColor} />
                  <div className="gauge-label">
                    <span className="gauge-percent">{riskPct}%</span>
                    <span className="gauge-text">risk</span>
                  </div>
                </div>
                <div className="gauge-info">
                  <div className={`gauge-risk-level ${riskClass}`}>{riskLabel}</div>
                  <p className="gauge-desc">
                    {riskPct < 35 && 'Güvenli bölgedesiniz. Steam algoritmaları için normal bir kullanıcı gibi görünüyorsunuz.'}
                    {riskPct >= 35 && riskPct < 65 && 'Dikkatli olun. İşlem sayınız artıyor, mola sürelerini uzun tutun.'}
                    {riskPct >= 65 && 'Tehlikeli bölge! Spam limitine yaklaşıyorsunuz, günlük hedefe ulaşıldığında bot duracaktır.'}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>
                  <span>🟢 Güvenli</span><span>🟡 Dikkat</span><span>🔴 Tehlike</span>
                </div>
                <div style={{ height: '6px', background: 'linear-gradient(to right, var(--success), var(--warning), var(--danger))', borderRadius: '3px' }} />
                <div style={{ marginTop: '4px', marginLeft: `${Math.min(riskPct - 2, 96)}%`, width: 8, height: 8, borderRadius: '50%', background: riskColor, boxShadow: `0 0 8px ${riskColor}`, transition: 'margin-left 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
              </div>
            </div>

            {/* Activity Log */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon blue"><Icon.Activity /></div>
                  Canlı Sistem Kayıtları
                </div>
                <button className="btn btn-ghost btn-sm" onClick={async () => { await clearActivityLog(); setLogs([]); addToast('Kayıtlar temizlendi'); }}>
                  <Icon.Trash /> Temizle
                </button>
              </div>
              <div className="log-container" ref={logEndRef} style={{ flex: 1 }}>
                {logs.length === 0 && (
                  <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', padding: '1rem', textAlign: 'center', margin: 'auto' }}>
                    Henüz aktivite yok. Botu başlatın.
                  </div>
                )}
                {logs.map((entry, i) => (
                  <div key={i} className="log-entry">
                    <span className="log-time">{fmtTime(entry.time)}</span>
                    <span className="log-icon">{entry.icon || '•'}</span>
                    <span
                      className={`log-text ${entry.kind || ''}`}
                      dangerouslySetInnerHTML={{ __html: entry.text }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
