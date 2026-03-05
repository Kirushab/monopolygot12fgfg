import { useState, useEffect, useRef, useCallback } from 'react';
import { S, btnOutline } from '../theme';
import { loadProfile, recordFlappyScore, addToFlappyLeaderboard, loadFlappyLeaderboard } from './Profile';

const W = 400, H = 600;
const GRAVITY = 0.4;
const JUMP = -7;
const PIPE_W = 52;
const GAP = 150;
const PIPE_SPEED = 2.5;
const DRAGON_SIZE = 30;

const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export default function FlappyDragon({ onClose, devData }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('idle'); // idle, playing, dead
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('flappy_hi') || '0'); } catch { return 0; }
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState(loadFlappyLeaderboard);

  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;

  const flappyCfg = devData?.flappyConfig || {};
  const dragonEmoji = flappyCfg.dragonEmoji || '🐉';
  const pipeColor = flappyCfg.pipeColor || '#50c878';
  const bgColor = flappyCfg.bgColor || '#0a0a1a';
  const groundColor = flappyCfg.groundColor || '#1a1a2e';
  const customDragonImg = flappyCfg.dragonImage || null;

  const stateRef = useRef({
    dragon: { x: 80, y: H / 2, vy: 0 },
    pipes: [],
    frame: 0,
    score: 0,
    playing: false,
    dead: false,
  });

  const dragonImgRef = useRef(null);
  useEffect(() => {
    if (customDragonImg) {
      const img = new Image();
      img.src = customDragonImg;
      img.onload = () => { dragonImgRef.current = img; };
    } else {
      dragonImgRef.current = null;
    }
  }, [customDragonImg]);

  const resetGame = useCallback(() => {
    stateRef.current = {
      dragon: { x: 80, y: H / 2, vy: 0 },
      pipes: [],
      frame: 0,
      score: 0,
      playing: true,
      dead: false,
    };
    setScore(0);
    setGameState('playing');
    setShowLeaderboard(false);
  }, []);

  const handleDeath = useCallback((finalScore) => {
    const profile = loadProfile();
    recordFlappyScore(profile, finalScore);
    const playerName = profile.name || 'Player';
    const lb = addToFlappyLeaderboard(playerName, finalScore);
    setLeaderboard(lb);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      try { localStorage.setItem('flappy_hi', String(finalScore)); } catch {}
    }
  }, [highScore]);

  const jump = useCallback(() => {
    if (showLeaderboard) return;
    if (gameState === 'idle' || gameState === 'dead') { resetGame(); return; }
    if (gameState === 'playing') { stateRef.current.dragon.vy = JUMP; }
  }, [gameState, resetGame, showLeaderboard]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump, onClose]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const loop = () => {
      const s = stateRef.current;

      if (s.playing && !s.dead) {
        s.dragon.vy += GRAVITY;
        s.dragon.y += s.dragon.vy;
        s.frame++;

        if (s.frame % 90 === 0) {
          const gapY = 100 + Math.random() * (H - 250);
          s.pipes.push({ x: W, gapY, scored: false });
        }

        for (const pipe of s.pipes) {
          pipe.x -= PIPE_SPEED;
          if (!pipe.scored && pipe.x + PIPE_W < s.dragon.x) {
            pipe.scored = true;
            s.score++;
            setScore(s.score);
          }
        }
        s.pipes = s.pipes.filter(p => p.x > -PIPE_W);

        const dx = s.dragon.x, dy = s.dragon.y;
        const die = () => {
          s.dead = true;
          s.playing = false;
          setGameState('dead');
          handleDeath(s.score);
        };
        if (dy < 0 || dy > H - 50) die();
        for (const pipe of s.pipes) {
          if (dx + DRAGON_SIZE > pipe.x && dx < pipe.x + PIPE_W) {
            if (dy < pipe.gapY || dy + DRAGON_SIZE > pipe.gapY + GAP) { die(); break; }
          }
        }
      }

      // Draw
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137 + stateRef.current.frame * 0.1) % W;
        const sy = (i * 97) % (H - 60);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      ctx.fillStyle = groundColor;
      ctx.fillRect(0, H - 50, W, 50);
      ctx.fillStyle = rgba(accent, 0.3);
      ctx.fillRect(0, H - 50, W, 2);

      for (const pipe of stateRef.current.pipes) {
        ctx.fillStyle = pipeColor;
        ctx.fillRect(pipe.x, 0, PIPE_W, pipe.gapY);
        ctx.fillStyle = rgba(pipeColor, 0.6);
        ctx.fillRect(pipe.x - 4, pipe.gapY - 20, PIPE_W + 8, 20);
        ctx.fillStyle = pipeColor;
        ctx.fillRect(pipe.x, pipe.gapY + GAP, PIPE_W, H - pipe.gapY - GAP);
        ctx.fillStyle = rgba(pipeColor, 0.6);
        ctx.fillRect(pipe.x - 4, pipe.gapY + GAP, PIPE_W + 8, 20);
      }

      const d = stateRef.current.dragon;
      if (dragonImgRef.current) {
        ctx.save();
        ctx.translate(d.x + DRAGON_SIZE / 2, d.y + DRAGON_SIZE / 2);
        ctx.rotate(Math.min(d.vy * 0.05, 0.5));
        ctx.drawImage(dragonImgRef.current, -DRAGON_SIZE / 2, -DRAGON_SIZE / 2, DRAGON_SIZE, DRAGON_SIZE);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(d.x + DRAGON_SIZE / 2, d.y + DRAGON_SIZE / 2);
        ctx.rotate(Math.min(d.vy * 0.05, 0.5));
        ctx.font = `${DRAGON_SIZE}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dragonEmoji, 0, 0);
        ctx.restore();
      }

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(stateRef.current.score, W / 2, 50);

      if (gameState === 'idle' || stateRef.current.dead) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = accent;
        ctx.font = 'bold 28px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(stateRef.current.dead ? 'GAME OVER' : 'FLAPPY DRAGON', W / 2, H / 2 - 40);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Georgia';
        if (stateRef.current.dead) {
          ctx.fillText(`Score: ${stateRef.current.score}`, W / 2, H / 2);
          ctx.fillText(`Best: ${Math.max(highScore, stateRef.current.score)}`, W / 2, H / 2 + 25);
        }
        ctx.fillStyle = rgba(accent, 0.8);
        ctx.fillText('Tap or Space to play', W / 2, H / 2 + 60);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState, accent, bgColor, groundColor, pipeColor, dragonEmoji, highScore, handleDeath]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: font,
    }}>
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16,
        background: 'transparent', border: `1px solid ${rgba(accent, 0.3)}`,
        color: S.textDim, fontSize: 16, cursor: 'pointer',
        padding: '6px 12px', borderRadius: 8, zIndex: 201,
      }}>ESC ✕</button>

      {/* Leaderboard toggle */}
      <button onClick={() => setShowLeaderboard(!showLeaderboard)} style={{
        position: 'absolute', top: 16, left: 16,
        background: showLeaderboard ? rgba(accent, 0.2) : 'transparent',
        border: `1px solid ${rgba(accent, 0.3)}`,
        color: accent, fontSize: 14, cursor: 'pointer',
        padding: '6px 12px', borderRadius: 8, zIndex: 201, fontFamily: font,
      }}>🏆</button>

      <div style={{ color: accent, fontSize: 18, fontWeight: 'bold', marginBottom: 8, letterSpacing: 2 }}>
        {dragonEmoji} FLAPPY DRAGON
      </div>

      {showLeaderboard ? (
        <div style={{
          width: '90%', maxWidth: 400, maxHeight: '70vh',
          background: S.bg2, borderRadius: 12,
          border: `1px solid ${rgba(accent, 0.2)}`,
          overflow: 'auto', padding: 16,
        }}>
          <div style={{ fontSize: 16, color: accent, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, letterSpacing: 2 }}>
            🏆 LEADERBOARD
          </div>
          {leaderboard.length === 0 && (
            <div style={{ textAlign: 'center', color: S.textDim, padding: 20 }}>No scores yet</div>
          )}
          {leaderboard.slice(0, 20).map((entry, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              borderBottom: `1px solid ${S.border}`,
              background: i < 3 ? rgba(accent, 0.05) : 'transparent',
            }}>
              <span style={{
                fontSize: 14, fontWeight: 'bold', width: 28, textAlign: 'center',
                color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : S.textDim,
              }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: S.text }}>{entry.name || 'Player'}</span>
              <span style={{ fontSize: 14, fontWeight: 'bold', color: accent }}>{entry.score}</span>
            </div>
          ))}
          <button onClick={() => setShowLeaderboard(false)} style={{
            ...btnOutline({ width: '100%', marginTop: 12, fontSize: 13 }),
          }}>← Back</button>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={jump}
            onTouchStart={(e) => { e.preventDefault(); jump(); }}
            style={{
              border: `2px solid ${rgba(accent, 0.3)}`,
              borderRadius: 12,
              cursor: 'pointer',
              maxWidth: '95vw',
              maxHeight: '70vh',
              touchAction: 'none',
            }}
          />
          <div style={{ color: S.textDim, fontSize: 12, marginTop: 8, display: 'flex', gap: 16, alignItems: 'center' }}>
            <span>Best: {highScore}</span>
            <span>|</span>
            <span>Tap / Space / Click</span>
          </div>
        </>
      )}
    </div>
  );
}
