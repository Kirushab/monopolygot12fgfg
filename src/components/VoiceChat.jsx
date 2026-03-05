import { useState, useEffect, useRef, useCallback } from 'react';
import { S } from '../theme';

const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export default function VoiceChat({ socket, roomId, playerName, lang, devData }) {
  const [isMuted, setIsMuted] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [peers, setPeers] = useState({}); // peerId -> { name, speaking }
  const [volume, setVolume] = useState(0);

  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const ui = devData?.uiConfig || {};

  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const audioCtxRef = useRef(null);

  // Start/stop microphone
  const toggleVoice = useCallback(async () => {
    if (isActive) {
      // Stop
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Notify peers
      if (socket) socket.emit('voice_leave', { roomId });
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      setIsActive(false);
      setVolume(0);
      setPeers({});
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      // Audio analysis for volume indicator
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Volume meter loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(Math.round(avg));
        rafRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      setIsActive(true);
      setIsMuted(false);

      // Notify server
      if (socket) socket.emit('voice_join', { roomId, name: playerName });
    } catch (err) {
      console.warn('Microphone access denied:', err);
    }
  }, [isActive, socket, roomId, playerName]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  // Socket listeners for voice chat signaling
  useEffect(() => {
    if (!socket) return;

    const onVoiceJoin = ({ socketId, name }) => {
      setPeers(prev => ({ ...prev, [socketId]: { name, speaking: false } }));
    };

    const onVoiceLeave = ({ socketId }) => {
      setPeers(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
    };

    const onVoicePeers = (peerList) => {
      const p = {};
      peerList.forEach(({ socketId, name }) => { p[socketId] = { name, speaking: false }; });
      setPeers(p);
    };

    socket.on('voice_join', onVoiceJoin);
    socket.on('voice_leave', onVoiceLeave);
    socket.on('voice_peers', onVoicePeers);

    return () => {
      socket.off('voice_join', onVoiceJoin);
      socket.off('voice_leave', onVoiceLeave);
      socket.off('voice_peers', onVoicePeers);
    };
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const peerList = Object.entries(peers);
  const isSpeaking = volume > 15;

  const tr = lang === 'ru' ? {
    voice: 'Голос',
    join: 'Войти',
    leave: 'Выйти',
    mute: 'Выкл. микр.',
    unmute: 'Вкл. микр.',
    inVoice: 'В голосовом чате',
    noOne: 'Никого нет',
  } : {
    voice: 'Voice',
    join: 'Join',
    leave: 'Leave',
    mute: 'Mute',
    unmute: 'Unmute',
    inVoice: 'In voice chat',
    noOne: 'No one here',
  };

  return (
    <div style={{
      background: rgba(accent, 0.05),
      border: `1px solid ${rgba(accent, 0.15)}`,
      borderRadius: 10,
      padding: 8,
      fontFamily: font,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>🎙</span>
        <span style={{ fontSize: 12, color: accent, fontWeight: 'bold', letterSpacing: 1 }}>{tr.voice}</span>
        {isActive && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isSpeaking ? '#50c878' : '#888',
            boxShadow: isSpeaking ? '0 0 6px #50c878' : 'none',
            transition: 'all 0.1s',
          }} />
        )}
      </div>

      {/* Peers */}
      {isActive && (
        <div style={{ marginBottom: 6 }}>
          {peerList.length === 0 && (
            <div style={{ fontSize: 11, color: ui.pageTextDim || S.textDim, textAlign: 'center', padding: '4px 0' }}>{tr.noOne}</div>
          )}
          {peerList.map(([id, p]) => (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
              fontSize: 11, color: ui.pageText || S.text,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: p.speaking ? '#50c878' : '#555',
              }} />
              {p.name}
            </div>
          ))}
          {/* Self */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
            fontSize: 11, color: accent, fontWeight: 'bold',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isSpeaking && !isMuted ? '#50c878' : '#555',
              boxShadow: isSpeaking && !isMuted ? '0 0 4px #50c878' : 'none',
            }} />
            {playerName} {isMuted ? '🔇' : '🔊'}
          </div>
          {/* Volume bar */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(volume / 2, 100)}%`,
              background: isMuted ? '#555' : `linear-gradient(90deg, #50c878, ${accent})`,
              borderRadius: 2, transition: 'width 0.05s',
            }} />
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={toggleVoice}
          style={{
            flex: 1, padding: '6px 10px', fontSize: 11, cursor: 'pointer',
            background: isActive ? rgba('#ff6b6b', 0.15) : rgba(accent, 0.1),
            color: isActive ? '#ff6b6b' : accent,
            border: `1px solid ${isActive ? '#ff6b6b44' : rgba(accent, 0.2)}`,
            borderRadius: 6, fontFamily: font,
          }}
        >
          {isActive ? `📴 ${tr.leave}` : `🎙 ${tr.join}`}
        </button>
        {isActive && (
          <button
            onClick={toggleMute}
            style={{
              padding: '6px 10px', fontSize: 11, cursor: 'pointer',
              background: isMuted ? rgba('#ff6b6b', 0.1) : rgba('#50c878', 0.1),
              color: isMuted ? '#ff6b6b' : '#50c878',
              border: `1px solid ${isMuted ? '#ff6b6b44' : '#50c87844'}`,
              borderRadius: 6, fontFamily: font,
            }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        )}
      </div>
    </div>
  );
}
