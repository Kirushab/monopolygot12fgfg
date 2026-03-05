import { useState, useEffect } from 'react';
import { S, btn, btnOutline, card } from '../theme';

const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// Load/save profile from localStorage
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

export function recordMonopolyResult(profile, { won, finalWealth, rentCollected, rentPaid, propertiesBought }) {
  profile.monopoly.gamesPlayed++;
  if (won) profile.monopoly.wins++;
  profile.monopoly.totalMoney += finalWealth;
  profile.monopoly.totalRent += rentCollected || 0;
  profile.monopoly.totalRentPaid += rentPaid || 0;
  profile.monopoly.propertiesBought += propertiesBought || 0;
  if (finalWealth > profile.monopoly.bestWealth) profile.monopoly.bestWealth = finalWealth;
  saveProfile(profile);
  return profile;
}

export function recordFlappyScore(profile, score) {
  profile.flappy.gamesPlayed++;
  profile.flappy.totalScore += score;
  if (score > profile.flappy.highScore) profile.flappy.highScore = score;
  // Keep last 20 scores
  profile.flappy.scores = [...(profile.flappy.scores || []), { score, date: Date.now() }].slice(-20);
  saveProfile(profile);
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
  const [tab, setTab] = useState('stats'); // stats | flappy | edit
  const [editName, setEditName] = useState(profile.name || '');

  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const ui = devData?.uiConfig || {};
  const text = ui.pageText || S.text;
  const textDim = ui.pageTextDim || S.textDim;
  const pageBg = ui.pageBg || S.bg;
  const cardBg = ui.cardBg || S.bg3;
  const cardBorder = ui.cardBorder || S.border;

  const t = lang === 'ru' ? {
    profile: 'Профиль',
    stats: 'Статистика',
    flappyRating: 'Рейтинг Flappy',
    editProfile: 'Редактировать',
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
  } : {
    profile: 'Profile',
    stats: 'Statistics',
    flappyRating: 'Flappy Rating',
    editProfile: 'Edit',
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
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const updated = { ...profile, avatar: ev.target.result };
      setProfile(updated);
      saveProfile(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = () => {
    const updated = { ...profile, name: editName.trim() };
    setProfile(updated);
    saveProfile(updated);
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: font, padding: 16,
    }}>
      <div style={{
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
          {/* Avatar */}
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
              🎲 {profile.monopoly.gamesPlayed} | 🐉 {profile.flappy.gamesPlayed}
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
          ].map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{
              flex: 1, padding: '10px 8px', fontSize: 12, cursor: 'pointer',
              background: tab === tb.key ? rgba(accent, 0.1) : 'transparent',
              color: tab === tb.key ? accent : textDim,
              border: 'none', borderBottom: tab === tb.key ? `2px solid ${accent}` : '2px solid transparent',
              fontFamily: font, letterSpacing: 1,
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
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={20}
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: 14,
                    background: rgba(accent, 0.05), color: text,
                    border: `1px solid ${rgba(accent, 0.2)}`,
                    borderRadius: 8, fontFamily: font,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: textDim, marginBottom: 4, display: 'block' }}>{t.uploadAvatar}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {profile.avatar && (
                    <img src={profile.avatar} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${rgba(accent, 0.3)}` }} alt="" />
                  )}
                  <label style={{
                    ...btnOutline({ fontSize: 12, padding: '8px 16px' }),
                    display: 'inline-block', textAlign: 'center',
                  }}>
                    📷 {t.uploadAvatar}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <button onClick={handleSaveName} style={btn({ width: '100%', marginTop: 8 })}>{t.save}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
