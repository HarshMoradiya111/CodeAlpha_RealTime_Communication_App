import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { createSocket } from '../socket';

const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const [room, setRoom] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [status, setStatus] = useState('Connecting to camera...');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRoom() {
      try {
        const roomData = await apiRequest(`/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (active) {
          setRoom(roomData);
        }
      } catch (requestError) {
        setStatus(requestError.message);
      }
    }

    if (isAuthenticated) {
      loadRoom();
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated, roomId, token]);

  useEffect(() => {
    let cancelled = false;

    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        if (cancelled) {
          return;
        }

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setStatus('Camera ready');
      } catch (requestError) {
        setStatus(requestError.message);
      }
    }

    setupMedia();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !roomId || !localStreamRef.current) {
      return undefined;
    }

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { roomId });
      setStatus('Connected to signaling server');
    });

    function ensurePeer(peerId, initiator) {
      if (peersRef.current[peerId]) {
        return peersRef.current[peerId];
      }

      const peerConnection = new RTCPeerConnection(rtcConfig);
      peersRef.current[peerId] = peerConnection;

      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal', {
            targetId: peerId,
            signal: { candidate: event.candidate },
          });
        }
      };

      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;

        if (!stream) {
          return;
        }

        setRemoteStreams((currentStreams) => {
          const existingIndex = currentStreams.findIndex((item) => item.peerId === peerId);
          const nextItem = { peerId, stream };

          if (existingIndex >= 0) {
            return currentStreams.map((item) => (item.peerId === peerId ? nextItem : item));
          }

          return [...currentStreams, nextItem];
        });
      };

      if (initiator) {
        peerConnection
          .createOffer()
          .then((offer) => peerConnection.setLocalDescription(offer))
          .then(() => {
            socket.emit('signal', {
              targetId: peerId,
              signal: { sdp: peerConnection.localDescription },
            });
          })
          .catch((requestError) => setStatus(requestError.message));
      }

      return peerConnection;
    }

    socket.on('all-users', (peerIds) => {
      peerIds.forEach((peerId) => {
        ensurePeer(peerId, true);
      });
    });

    socket.on('user-joined', (peerId) => {
      ensurePeer(peerId, false);
    });

    socket.on('signal', async ({ senderId, signal }) => {
      const peerConnection = ensurePeer(senderId, false);

      try {
        if (signal.sdp) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          if (signal.sdp.type === 'offer') {
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('signal', {
              targetId: senderId,
              signal: { sdp: peerConnection.localDescription },
            });
          }
        }

        if (signal.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (requestError) {
        setStatus(requestError.message);
      }
    });

    return () => {
      socket.disconnect();
      Object.values(peersRef.current).forEach((peerConnection) => peerConnection.close());
      peersRef.current = {};
    };
  }, [isAuthenticated, roomId, token]);

  function toggleAudio() {
    if (!localStreamRef.current) {
      return;
    }

    const nextValue = !audioEnabled;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = nextValue;
    });
    setAudioEnabled(nextValue);
  }

  function toggleVideo() {
    if (!localStreamRef.current) {
      return;
    }

    const nextValue = !videoEnabled;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = nextValue;
    });
    setVideoEnabled(nextValue);
  }

  const participantCount = useMemo(() => remoteStreams.length + 1, [remoteStreams.length]);

  if (!isAuthenticated) {
    return (
      <div className="notice-card empty-state">
        Please <Link to="/login">log in</Link> to join rooms.
      </div>
    );
  }

  return (
    <section className="room-shell">
      <header className="room-header">
        <div>
          <p className="eyebrow">Room</p>
          <h1>{room?.title || 'Calling room'}</h1>
          <p className="muted-copy">Code: {roomId}</p>
        </div>
        <div className="hero-actions">
          <span className="status-pill">{participantCount} participants</span>
          <button className="secondary-button" type="button" onClick={() => navigate('/')}>
            Leave room
          </button>
        </div>
      </header>

      <div className="call-toolbar">
        <button className="primary-button" type="button" onClick={toggleAudio}>
          {audioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button className="primary-button" type="button" onClick={toggleVideo}>
          {videoEnabled ? 'Hide video' : 'Show video'}
        </button>
        <span className="status-note">{status}</span>
      </div>

      <div className="video-grid">
        <article className="video-card featured">
          <video ref={localVideoRef} autoPlay playsInline muted />
          <div className="video-label">You</div>
        </article>

        {remoteStreams.map((item) => (
          <article key={item.peerId} className="video-card">
            <video autoPlay playsInline ref={(node) => node && (node.srcObject = item.stream)} />
            <div className="video-label">Peer {item.peerId.slice(0, 4)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RoomPage;