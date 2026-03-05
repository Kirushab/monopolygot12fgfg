import { useState, useEffect } from 'react';
import { S, btn, btnOutline, card } from '../theme';

const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// Session management
export function getSession() {
  try {
    const raw = localStorage.getItem('authSession');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function setSession(session) {
  try { localStorage.setItem('authSession', JSON.stringify(session)); } catch {}
}

export function clearSession() {
  try { localStorage.removeItem('authSession'); } catch {}
}

// Load/save profile from localStorage (fallback for offline)
export function loadProfile() {
  try {
    const raw = localStorage.getItem('playerProfile');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    name: '',
    avatar: null,
    monopoly: { gamesPlayed: 0, wins: 0, totalMoney: 0, totalRent: 0, totalRentPaid: 0, bestWealth: 0, propertiesBought: 0 },
    flappy: { gamesPlayed: 0, highScore: 0, totalScore: 0, scores: [] },
  };
}

export function saveProfile(profile) {
  try { localStorage.setItem('playerProfile', JSON.stringify(profile)); } catch {}
}

export async function recordMonopolyResult(profile, { won, finalWealth, rentCollected, rentPaid, propertiesBought }) {
  profile.monopoly.gamesPlayed++;
  if (won) profile.monopoly.wins++;
  profile.monopoly.totalMoney += finalWealth;
  profile.monopoly.totalRent += rentCollected || 0;
  profile.monopoly.totalRentPaid += rentPaid || 0;
  profile.monopoly.propertiesBought += propertiesBought || 0;
  if (finalWealth > profile.monopoly.bestWealth) profile.monopoly.bestWealth = finalWealth;
  saveProfile(profile);

  // Sync to server if logged in
  const session = getSession();
  if (session) {
    try {
      await fetch('/api/auth/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: session.username,
          password: session.password,
          monopolyResult: { won, finalWealth, rentCollected, rentPaid, propertiesBought },
        }),
      });
    } catch {}
  }
  return profile;
}

export async function recordFlappyScore(profile, score) {
  profile.flappy.gamesPlayed++;
  profile.flappy.totalScore += score;
  if (score > profile.flappy.highScore) profile.flappy.highScore = score;
  profile.flappy.scores = [...(profile.flappy.scores || []), { score, date: Date.now() }].slice(-20);
  saveProfile(profile);

  const session = getSession();
  if (session) {
    try {
      await fetch('/api/auth/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: session.username,
          password: session.password,
          flappyScore: score,
        }),
      });
    } catch {}
  }
  return profile;
}

// Load/save global flappy leaderboard
export function loadFlappyLeaderboard() {
  try {
    const raw = localStorage.getItem('flappyLeaderboard');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveFlappyLeaderboard(lb) {
  try { localStorage.setItem('flappyLeaderboard', JSON.stringify(lb)); } catch {}
}

export function addToFlappyLeaderboard(name, score) {
  const lb = loadFlappyLeaderboard();
  lb.push({ name, score, date: Date.now() });
  lb.sort((a, b) => b.score - a.score);
  const trimmed = lb.slice(0, 50);
  saveFlappyLeaderboard(trimmed);
  return trimmed;
}

export default function Profile({ onClose, lang, devData }) {
  const [profile, setProfile] = useState(loadProfile);
  const [flappyLB, setFlappyLB] = useState(loadFlappyLeaderboard);
  const [tab, setTab] = useState('stats');
  const [editName, setEditName] = useState(profile.name || '');

  // Auth state
  const [session, setSessionState] = useState(getSession);
  const [authMode, setAuthMode] = useState('login'); // login | register
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const ui = devData?.uiConfig || {};
  const text = ui.pageText || S.text;
  const textDim = ui.pageTextDim || S.textDim;
  const pageBg = ui.pageBg || S.bg;
  const cardBg = ui.cardBg || S.bg3;
  const cardBorder = ui.cardBorder || S.border;

  // Fetch server leaderboard
  useEffect(() => {
    fetch('/api/leaderboard/flappy').then(r => r.json()).then(d => {
      if (d.leaderboard?.length) setFlappyLB(d.leaderboard);
    }).catch(() => {});
  }, []);

  // Sync profile from server if logged in
  useEffect(() => {
    if (!session) return;
    fetch(`/api/auth/profile/${session.username}`).then(r => r.json()).then(d => {
      if (d.user?.stats) {
        const updated = {
          ...profile,
          name: d.user.displayName || profile.name,
          avatar: d.user.avatar || profile.avatar,
          monopoly: { ...profile.monopoly, ...d.user.stats.monopoly },
          flappy: { ...profile.flappy, ...d.user.stats.flappy },
        };
        setProfile(updated);
        saveProfile(updated);
      }
    }).catch(() => {});
  }, [session]);

  const t = lang === 'ru' ? {
    profile: 'Профиль',
    stats: 'Статистика',
    flappyRating: 'Рейтинг Flappy',
    editProfile: 'Профиль',
    account: 'Аккаунт',
    monopolyStats: 'Монополия',
    flappyStats: 'Flappy Dragon',
    gamesPlayed: 'Игр сыграно',
    wins: 'Побед',
    winRate: 'Процент побед',
    totalMoney: 'Всего заработано',
    bestWealth: 'Лучшее богатство',
    totalRent: 'Аренда получена',
    totalRentPaid: 'Аренда оплачена',
    propertiesBought: 'Куплено владений',
    highScore: 'Рекорд',
    avgScore: 'Средний счёт',
    totalGames: 'Всего игр',
    name: 'Имя',
    save: 'Сохранить',
    noData: 'Нет данных',
    rank: '#',
    player: 'Игрок',
    score: 'Счёт',
    uploadAvatar: 'Загрузить аватар',
    login: 'Войти',
    register: 'Регистрация',
    logout: 'Выйти',
    username: 'Логин',
    password: 'Пароль',
    loggedAs: 'Вы вошли как',
    noAccount: 'Нет аккаунта?',
    haveAccount: 'Есть аккаунт?',
  } : {
    profile: 'Profile',
    stats: 'Statistics',
    flappyRating: 'Flappy Rating',
    editProfile: 'Profile',
    account: 'Account',
    monopolyStats: 'Monopoly',
    flappyStats: 'Flappy Dragon',
    gamesPlayed: 'Games Played',
    wins: 'Wins',
    winRate: 'Win Rate',
    totalMoney: 'Total Earned',
    bestWealth: 'Best Wealth',
    totalRent: 'Rent Collected',
    totalRentPaid: 'Rent Paid',
    propertiesBought: 'Properties Bought',
    highScore: 'High Score',
    avgScore: 'Avg Score',
    totalGames: 'Total Games',
    name: 'Name',
    save: 'Save',
    noData: 'No data',
    rank: '#',
    player: 'Player',
    score: 'Score',
    uploadAvatar: 'Upload Avatar',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    loggedAs: 'Logged in as',
    noAccount: 'No account?',
    haveAccount: 'Have account?',
  };

  const doAuth = async () => {
    if (!authUser.trim() || !authPass.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUser.trim(), password: authPass.trim(), displayName: editName || authUser.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Error'); setAuthLoading(false); return; }
      const sess = { username: authUser.trim().toLowerCase(), password: authPass.trim(), user: data.user };
      setSession(sess);
      setSessionState(sess);
      if (data.user?.displayName) {
        const updated = { ...profile, name: data.user.displayName };
        setProfile(updated);
        saveProfile(updated);
        setEditName(data.user.displayName);
      }
    } catch (e) {
      setAuthError(lang === 'ru' ? 'Ошибка сети' : 'Network error');
    }
    setAuthLoading(false);
  };

  const doLogout = () => {
    clearSession();
    setSessionState(null);
    setAuthUser('');
    setAuthPass('');
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const updated = { ...profile, avatar: ev.target.result };
      setProfile(updated);
      saveProfile(updated);
      if (session) {
        try {
          await fetch('/api/auth/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: session.username, password: session.password, avatar: ev.target.result }),
          });
        } catch {}
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async () => {
    const updated = { ...profile, name: editName.trim() };
    setProfile(updated);
    saveProfile(updated);
    if (session) {
      try {
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: session.username, password: session.password, displayName: editName.trim() }),
        });
      } catch {}
    }
    setTab('stats');
  };

  const winRate = profile.monopoly.gamesPlayed > 0
    ? Math.round((profile.monopoly.wins / profile.monopoly.gamesPlayed) * 100)
    : 0;
  const avgFlappy = profile.flappy.gamesPlayed > 0
    ? Math.round(profile.flappy.totalScore / profile.flappy.gamesPlayed)
    : 0;

  const StatRow = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${cardBorder}` }}>
      <span style={{ fontSize: 13, color: textDim }}>{label}</span>
      <span style={{ fontSize: 13, color: color || accent, fontWeight: 'bold' }}>{value}</span>
    </div>
  );

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 14,
    background: rgba(accent, 0.05), color: text,
    border: `1px solid ${rgba(accent, 0.2)}`,
    borderRadius: 8, fontFamily: font,
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: font, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, maxHeight: '90vh',
        background: pageBg, borderRadius: 16,
        border: `1px solid ${rgba(accent, 0.2)}`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: `0 8px 40px rgba(0,0,0,0.6)`,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: `1px solid ${rgba(accent, 0.15)}`,
          background: rgba(accent, 0.05),
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: rgba(accent, 0.15), border: `2px solid ${rgba(accent, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {profile.avatar
              ? <img src={profile.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: 26 }}>👤</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: text }}>{profile.name || (lang === 'ru' ? 'Игрок' : 'Player')}</div>
            <div style={{ fontSize: 11, color: textDim }}>
              {session ? `${t.loggedAs}: ${session.username}` : `🎲 ${profile.monopoly.gamesPlayed} | 🐉 ${profile.flappy.gamesPlayed}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: `1px solid ${rgba(accent, 0.2)}`,
            color: textDim, fontSize: 16, cursor: 'pointer', padding: '4px 10px', borderRadius: 8,
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${rgba(accent, 0.1)}` }}>
          {[
            { key: 'stats', label: t.stats },
            { key: 'flappy', label: t.flappyRating },
            { key: 'edit', label: t.editProfile },
            { key: 'account', label: t.account },
          ].map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{
              flex: 1, padding: '10px 4px', fontSize: 11, cursor: 'pointer',
              background: tab === tb.key ? rgba(accent, 0.1) : 'transparent',
              color: tab === tb.key ? accent : textDim,
              border: 'none', borderBottom: tab === tb.key ? `2px solid ${accent}` : '2px solid transparent',
              fontFamily: font, letterSpacing: 0.5,
            }}>{tb.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {tab === 'stats' && (
            <>
              <div style={{ fontSize: 14, color: accent, fontWeight: 'bold', marginBottom: 8, letterSpacing: 2 }}>🎲 {t.monopolyStats}</div>
              <div style={{ ...card({ background: cardBg, borderColor: cardBorder }), marginBottom: 16 }}>
                <StatRow label={t.gamesPlayed} value={profile.monopoly.gamesPlayed} />
                <StatRow label={t.wins} value={profile.monopoly.wins} color="#50c878" />
                <StatRow label={t.winRate} value={`${winRate}%`} />
                <StatRow label={t.bestWealth} value={profile.monopoly.bestWealth} />
                <StatRow label={t.totalRent} value={profile.monopoly.totalRent} color="#50c878" />
                <StatRow label={t.totalRentPaid} value={profile.monopoly.totalRentPaid} color="#ff6b6b" />
                <StatRow label={t.propertiesBought} value={profile.monopoly.propertiesBought} />
              </div>

              <div style={{ fontSize: 14, color: accent, fontWeight: 'bold', marginBottom: 8, letterSpacing: 2 }}>🐉 {t.flappyStats}</div>
              <div style={card({ background: cardBg, borderColor: cardBorder })}>
                <StatRow label={t.totalGames} value={profile.flappy.gamesPlayed} />
                <StatRow label={t.highScore} value={profile.flappy.highScore} color="#ffd700" />
                <StatRow label={t.avgScore} value={avgFlappy} />
              </div>
            </>
          )}

          {tab === 'flappy' && (
            <>
              <div style={{ fontSize: 14, color: accent, fontWeight: 'bold', marginBottom: 12, letterSpacing: 2 }}>🏆 {t.flappyRating}</div>
              {flappyLB.length === 0 && (
                <div style={{ textAlign: 'center', color: textDim, padding: 20 }}>{t.noData}</div>
              )}
              {flappyLB.slice(0, 20).map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  borderBottom: `1px solid ${cardBorder}`,
                  background: i < 3 ? rgba(accent, 0.05) : 'transparent',
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 'bold', width: 24, textAlign: 'center',
                    color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : textDim,
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: text }}>{entry.name || (lang === 'ru' ? 'Игрок' : 'Player')}</span>
                  <span style={{ fontSize: 14, fontWeight: 'bold', color: accent }}>{entry.score}</span>
                </div>
              ))}
            </>
          )}

          {tab === 'edit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: textDim, marginBottom: 4, display: 'block' }}>{t.name}</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={20} style={inputStyle} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: textDim, marginBottom: 4, display: 'block' }}>{t.uploadAvatar}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {profile.avatar && (
                    <img src={profile.avatar} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${rgba(accent, 0.3)}` }} alt="" />
                  )}
                  <label style={{
                    ...btnOutline({ fontSize: 12, padding: '8px 16px' }),
                    display: 'inline-block', textAlign: 'center', cursor: 'pointer',
                  }}>
                    📷 {t.uploadAvatar}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <button onClick={handleSaveName} style={btn({ width: '100%', marginTop: 8 })}>{t.save}</button>
            </div>
          )}

          {tab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {session ? (
                <>
                  <div style={{ textAlign: 'center', padding: 16 }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: text }}>{session.user?.displayName || session.username}</div>
                    <div style={{ fontSize: 12, color: textDim, marginTop: 4 }}>{t.loggedAs}: {session.username}</div>
                  </div>
                  <button onClick={doLogout} style={{ ...btnOutline({ width: '100%', fontSize: 14, padding: '10px' }), color: '#ff6b6b', borderColor: '#ff6b6b44' }}>
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, color: accent, fontWeight: 'bold', textAlign: 'center', letterSpacing: 2 }}>
                    {authMode === 'login' ? t.login : t.register}
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: textDim, marginBottom: 4, display: 'block' }}>{t.username}</label>
                    <input value={authUser} onChange={(e) => setAuthUser(e.target.value)} maxLength={20} style={inputStyle} />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: textDim, marginBottom: 4, display: 'block' }}>{t.password}</label>
                    <input type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} maxLength={50} style={inputStyle}
                      onKeyDown={e => e.key === 'Enter' && doAuth()} />
                  </div>

                  {authError && <div style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center' }}>{authError}</div>}

                  <button onClick={doAuth} disabled={authLoading} style={btn({ width: '100%', fontSize: 14, padding: '10px', opacity: authLoading ? 0.5 : 1 })}>
                    {authLoading ? '...' : authMode === 'login' ? t.login : t.register}
                  </button>

                  <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} style={{
                    background: 'transparent', border: 'none', color: accent, cursor: 'pointer', fontSize: 12, fontFamily: font, padding: 8,
                  }}>
                    {authMode === 'login' ? t.noAccount : t.haveAccount}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
