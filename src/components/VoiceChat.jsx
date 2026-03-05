import { useState, useEffect, useRef, useCallback } from 'react';
import { S } from '../theme';

const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function VoiceChat({ socket, roomId, playerName, lang, devData }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [peers, setPeers] = useState({});
  const [volume, setVolume] = useState(0);

  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const ui = devData?.uiConfig || {};

  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const audioCtxRef = useRef(null);
  const remoteAudiosRef = useRef({});
  const isActiveRef = useRef(false);
  const peersRef = useRef({}); // Mirror of peers state for use in callbacks
  const socketRef = useRef(socket);

  // Keep socketRef current
  useEffect(() => { socketRef.current = socket; }, [socket]);

  // Keep peersRef in sync with peers state
  useEffect(() => { peersRef.current = peers; }, [peers]);

  // Create a peer connection and handle audio for a remote peer
  const createPeerConnection = useCallback((peerId, peerName, isInitiator) => {
    if (!streamRef.current || !socketRef.current) return null;

    // Don't recreate if already connected/connecting
    const existing = peerConnectionsRef.current[peerId];
    if (existing && existing.connectionState !== 'failed' && existing.connectionState !== 'closed') {
      return existing;
    }
    if (existing) existing.close();

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current[peerId] = pc;

    // Add local audio tracks
    streamRef.current.getAudioTracks().forEach(track => {
      pc.addTrack(track, streamRef.current);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('voice_signal', {
          targetId: peerId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    // Handle remote audio stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!remoteStream) return;

      // Create audio element and play
      let audio = remoteAudiosRef.current[peerId];
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.playsInline = true;
        remoteAudiosRef.current[peerId] = audio;
      }
      audio.srcObject = remoteStream;
      audio.play().catch(err => console.warn('Audio play failed:', err));

      // Detect remote speaking
      try {
        const actx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
        if (!audioCtxRef.current) audioCtxRef.current = actx;
        const src = actx.createMediaStreamSource(remoteStream);
        const an = actx.createAnalyser();
        an.fftSize = 256;
        src.connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        const checkSpeaking = () => {
          if (!peerConnectionsRef.current[peerId]) return;
          an.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          setPeers(prev => {
            if (!prev[peerId]) return prev;
            const speaking = avg > 12;
            if (prev[peerId].speaking === speaking) return prev;
            return { ...prev, [peerId]: { ...prev[peerId], speaking } };
          });
          requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();
      } catch (e) { console.warn('Speaking detection failed:', e); }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed') {
        console.warn(`Peer connection to ${peerId} failed, cleaning up`);
        cleanupPeer(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        // Try ICE restart
        if (isInitiator) {
          pc.createOffer({ iceRestart: true }).then(offer => {
            pc.setLocalDescription(offer);
            socketRef.current?.emit('voice_signal', {
              targetId: peerId,
              signal: { type: 'offer', sdp: offer },
            });
          }).catch(() => cleanupPeer(peerId));
        }
      }
    };

    // If initiator, create and send offer
    if (isInitiator) {
      pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer);
      }).then(() => {
        socketRef.current?.emit('voice_signal', {
          targetId: peerId,
          signal: { type: 'offer', sdp: pc.localDescription },
        });
      }).catch(err => {
        console.error('Failed to create offer:', err);
        cleanupPeer(peerId);
      });
    }

    return pc;
  }, []);

  const cleanupPeer = useCallback((peerId) => {
    const pc = peerConnectionsRef.current[peerId];
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
      delete peerConnectionsRef.current[peerId];
    }
    if (remoteAudiosRef.current[peerId]) {
      remoteAudiosRef.current[peerId].srcObject = null;
      delete remoteAudiosRef.current[peerId];
    }
    setPeers(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  // Start/stop voice
  const toggleVoice = useCallback(async () => {
    if (isActive) {
      // Stop everything
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (socketRef.current) socketRef.current.emit('voice_leave');
      Object.keys(peerConnectionsRef.current).forEach(id => cleanupPeer(id));
      peerConnectionsRef.current = {};
      setIsActive(false);
      isActiveRef.current = false;
      setVolume(0);
      setPeers({});
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      streamRef.current = stream;

      // Audio analysis for volume meter
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!isActiveRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(Math.round(avg));
        rafRef.current = requestAnimationFrame(updateVolume);
      };

      setIsActive(true);
      isActiveRef.current = true;
      setIsMuted(false);
      updateVolume();

      // Notify server — server will send back list of existing voice peers
      if (socketRef.current) socketRef.current.emit('voice_join', { name: playerName });
    } catch (err) {
      console.warn('Microphone access denied:', err);
    }
  }, [isActive, playerName, cleanupPeer]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  // Socket listeners for WebRTC signaling
  useEffect(() => {
    if (!socket) return;

    // A new peer joined the voice chat — they will send us an offer, so we just track them
    const onVoiceJoin = ({ socketId, name }) => {
      setPeers(prev => ({ ...prev, [socketId]: { name, speaking: false } }));
      // Do NOT initiate here — the new joiner will initiate via voice_peers
    };

    const onVoiceLeave = ({ socketId }) => {
      cleanupPeer(socketId);
    };

    // We just joined — server sends us the list of existing peers. WE initiate connections.
    const onVoicePeers = (peerList) => {
      if (!isActiveRef.current || !streamRef.current) return;
      const p = {};
      peerList.forEach(({ socketId, name }) => {
        p[socketId] = { name, speaking: false };
        // We are the new joiner — we initiate to each existing peer
        createPeerConnection(socketId, name, true);
      });
      setPeers(prev => ({ ...prev, ...p }));
    };

    const onVoiceSignal = ({ fromId, signal }) => {
      if (!isActiveRef.current || !streamRef.current) return;

      if (signal.type === 'offer') {
        // Someone sent us an offer — create connection (non-initiator) and answer
        const peerName = peersRef.current[fromId]?.name || '???';
        // Add to peers if not already there
        setPeers(prev => {
          if (!prev[fromId]) return { ...prev, [fromId]: { name: peerName, speaking: false } };
          return prev;
        });

        const pc = createPeerConnection(fromId, peerName, false);
        if (!pc) return;

        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => pc.createAnswer())
          .then(answer => pc.setLocalDescription(answer))
          .then(() => {
            socket.emit('voice_signal', {
              targetId: fromId,
              signal: { type: 'answer', sdp: pc.localDescription },
            });
          })
          .catch(err => {
            console.error('Failed to handle offer:', err);
            cleanupPeer(fromId);
          });
      } else if (signal.type === 'answer') {
        const pc = peerConnectionsRef.current[fromId];
        if (pc && pc.signalingState === 'have-local-offer') {
          pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .catch(err => console.error('Failed to set answer:', err));
        }
      } else if (signal.type === 'candidate') {
        const pc = peerConnectionsRef.current[fromId];
        if (pc && pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
            .catch(err => console.warn('Failed to add ICE candidate:', err));
        }
      }
    };

    socket.on('voice_join', onVoiceJoin);
    socket.on('voice_leave', onVoiceLeave);
    socket.on('voice_peers', onVoicePeers);
    socket.on('voice_signal', onVoiceSignal);

    return () => {
      socket.off('voice_join', onVoiceJoin);
      socket.off('voice_leave', onVoiceLeave);
      socket.off('voice_peers', onVoicePeers);
      socket.off('voice_signal', onVoiceSignal);
    };
  }, [socket, createPeerConnection, cleanupPeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      Object.keys(peerConnectionsRef.current).forEach(id => {
        const pc = peerConnectionsRef.current[id];
        if (pc) { pc.onicecandidate = null; pc.ontrack = null; pc.close(); }
      });
      Object.values(remoteAudiosRef.current).forEach(a => { if (a) a.srcObject = null; });
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  const peerList = Object.entries(peers);
  const isSpeaking = volume > 15;

  const tr = lang === 'ru' ? {
    voice: 'Голосовой чат',
    join: 'Войти',
    leave: 'Выйти',
    noOne: 'Никого нет',
  } : {
    voice: 'Voice Chat',
    join: 'Join',
    leave: 'Leave',
    noOne: 'No one here',
  };

  return (
    <div style={{
      background: rgba(accent, 0.05),
      border: `1px solid ${rgba(accent, 0.15)}`,
      borderRadius: 10, padding: 8, fontFamily: font,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>🎙</span>
        <span style={{ fontSize: 12, color: accent, fontWeight: 'bold', letterSpacing: 1 }}>{tr.voice}</span>
        {isActive && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isSpeaking && !isMuted ? '#50c878' : '#888',
            boxShadow: isSpeaking && !isMuted ? '0 0 6px #50c878' : 'none',
            transition: 'all 0.15s',
          }} />
        )}
      </div>

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
                boxShadow: p.speaking ? '0 0 4px #50c878' : 'none',
                transition: 'all 0.15s',
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
            }} />
            {playerName} {isMuted ? '🔇' : '🔊'}
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(volume / 2, 100)}%`,
              background: isMuted ? '#555' : `linear-gradient(90deg, #50c878, ${accent})`,
              borderRadius: 2, transition: 'width 0.05s',
            }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={toggleVoice} style={{
          flex: 1, padding: '6px 10px', fontSize: 11, cursor: 'pointer',
          background: isActive ? rgba('#ff6b6b', 0.15) : rgba(accent, 0.1),
          color: isActive ? '#ff6b6b' : accent,
          border: `1px solid ${isActive ? '#ff6b6b44' : rgba(accent, 0.2)}`,
          borderRadius: 6, fontFamily: font,
        }}>
          {isActive ? `📴 ${tr.leave}` : `🎙 ${tr.join}`}
        </button>
        {isActive && (
          <button onClick={toggleMute} style={{
            padding: '6px 10px', fontSize: 11, cursor: 'pointer',
            background: isMuted ? rgba('#ff6b6b', 0.1) : rgba('#50c878', 0.1),
            color: isMuted ? '#ff6b6b' : '#50c878',
            border: `1px solid ${isMuted ? '#ff6b6b44' : '#50c87844'}`,
            borderRadius: 6, fontFamily: font,
          }}>
            {isMuted ? '🔇' : '🔊'}
          </button>
        )}
      </div>
    </div>
  );
}
