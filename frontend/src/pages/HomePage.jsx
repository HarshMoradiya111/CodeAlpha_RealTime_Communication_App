import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { token, user, isAuthenticated, logout } = useAuth();
  const [createForm, setCreateForm] = useState({ title: '' });
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleCreateRoom(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      const room = await apiRequest('/api/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: createForm.title }),
      });

      navigate(`/room/${room.roomId}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinRoom(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      await apiRequest('/api/rooms/join', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: joinRoomId }),
      });

      navigate(`/room/${joinRoomId}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <section className="hero-card hero-surface">
        <div className="hero-panel">
          <p className="eyebrow">Live Rooms</p>
          <h1>Sign in to start or join a call</h1>
          <p className="intro">Create a room, share the room code, and open the same room from another browser.</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/login">
              Login
            </Link>
            <Link className="secondary-button" to="/register">
              Register
            </Link>
          </div>
        </div>
        <div className="hero-spotlight">
          <strong>WebRTC</strong>
          <span>Peer-to-peer media with Socket.io signaling</span>
          <strong>Room codes</strong>
          <span>Join by a short code generated on create</span>
          <strong>Mesh</strong>
          <span>Small group calls for 2-4 users</span>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="hero-card hero-surface">
        <div className="hero-panel">
          <p className="eyebrow">Realtime workspace</p>
          <h1>Launch a secure call room in seconds.</h1>
          <p className="intro">
            Create a room, share the code, and let the signaling server connect peers directly.
          </p>
          <div className="hero-actions">
            <span className="status-pill">Signed in as {user?.name}</span>
            <button className="secondary-button" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
        <div className="hero-spotlight">
          <strong>Screen share</strong>
          <span>Coming in the next phase</span>
          <strong>Whiteboard</strong>
          <span>Also coming next</span>
          <strong>File links</strong>
          <span>Upload and share in room</span>
        </div>
      </section>

      <section className="workspace-grid">
        <form className="composer-card" onSubmit={handleCreateRoom}>
          <p className="eyebrow">Create room</p>
          <label>
            Room title
            <input
              value={createForm.title}
              onChange={(event) => setCreateForm({ title: event.target.value })}
              placeholder="Design review"
              required
            />
          </label>
          {error ? <div className="notice-card">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create room'}
          </button>
        </form>

        <form className="composer-card" onSubmit={handleJoinRoom}>
          <p className="eyebrow">Join room</p>
          <label>
            Room code
            <input
              value={joinRoomId}
              onChange={(event) => setJoinRoomId(event.target.value.toUpperCase())}
              placeholder="AB12CD34"
              required
            />
          </label>
          <button className="secondary-button" type="submit" disabled={submitting}>
            {submitting ? 'Joining...' : 'Join room'}
          </button>
        </form>
      </section>
    </>
  );
}

export default HomePage;