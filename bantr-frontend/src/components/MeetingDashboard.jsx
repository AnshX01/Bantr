import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import MeetingRoom from './MeetingRoom';

const MeetingDashboard = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [currentMeetingRoom, setCurrentMeetingRoom] = useState(null);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: ''
  });

  useEffect(() => {
    fetchUserMeetings();
  }, []);

  const fetchUserMeetings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUserMeetings();
      setMeetings(data.meetings || []);
    } catch (error) {
      setError(error.message);
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    
    if (!createForm.title.trim()) {
      setError('Meeting title is required');
      return;
    }

    try {
      setLoading(true);
      const data = await apiService.createMeeting(createForm);
      
      setCreateForm({ title: '', description: '' });
      setShowCreateForm(false);
      
      await fetchUserMeetings();
      
      alert(`Meeting "${data.meeting.title}" created! Room ID: ${data.meeting.room_id}`);
    } catch (error) {
      setError(error.message);
      console.error('Error creating meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (roomId) => {
    if (!roomId.trim()) {
      setError('Room ID is required');
      return;
    }

    try {
      setLoading(true);
      setCurrentMeetingRoom(roomId);
      setError('');
    } catch (error) {
      setError(error.message);
      console.error('Error joining meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndMeeting = async (roomId) => {
    if (!window.confirm('Are you sure you want to end this meeting?')) {
      return;
    }

    try {
      await apiService.endMeeting(roomId);
      await fetchUserMeetings();
      alert('Meeting ended successfully');
    } catch (error) {
      setError(error.message);
      console.error('Error ending meeting:', error);
    }
  };

  const handleLeaveMeeting = () => {
    setCurrentMeetingRoom(null);
  };

  const handleLogout = () => {
    apiService.logout();
    window.location.href = '/login';
  };

  if (currentMeetingRoom) {
    return (
      <MeetingRoom 
        roomId={currentMeetingRoom} 
        onLeave={handleLeaveMeeting}
      />
    );
  }

  if (loading && meetings.length === 0) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>Bantr - Video Meetings</h1>
        <button 
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
          <button 
            onClick={() => setError('')}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '15px 30px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          + Create New Meeting
        </button>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && joinRoomId.trim()) {
                handleJoinMeeting(joinRoomId);
              }
            }}
            style={{
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              flex: 1
            }}
          />
          <button
            onClick={() => handleJoinMeeting(joinRoomId)}
            disabled={loading || !joinRoomId.trim()}
            style={{
              padding: '15px 30px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: (!joinRoomId.trim()) ? 0.6 : 1
            }}
          >
            {loading ? 'Joining...' : 'Join Meeting'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{ marginTop: 0 }}>Create New Meeting</h3>
            <form onSubmit={handleCreateMeeting}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                  placeholder="Enter meeting title"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Enter meeting description"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Creating...' : 'Create Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        <h3>Your Meetings ({meetings.length})</h3>
        {meetings.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            color: '#666'
          }}>
            <p>No meetings yet. Create your first meeting to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {meetings.map((meeting) => (
              <div 
                key={meeting.id}
                style={{
                  padding: '20px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: meeting.is_active ? '#f8f9fa' : '#e9ecef'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                      {meeting.title}
                      {!meeting.is_active && <span style={{ color: '#666', fontSize: '14px' }}> (Ended)</span>}
                    </h4>
                    {meeting.description && (
                      <p style={{ margin: '0 0 10px 0', color: '#666' }}>{meeting.description}</p>
                    )}
                    <div style={{ fontSize: '14px', color: '#888' }}>
                      <p style={{ margin: '5px 0' }}>Room ID: <strong>{meeting.room_id}</strong></p>
                      <p style={{ margin: '5px 0' }}>Created: {new Date(meeting.created_at).toLocaleString()}</p>
                      <p style={{ margin: '5px 0' }}>Participants: {meeting.participants?.length || 0}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {meeting.is_active && (
                      <>
                        <button
                          onClick={() => handleJoinMeeting(meeting.room_id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Join
                        </button>
                        <button
                          onClick={() => handleEndMeeting(meeting.room_id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          End Meeting
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingDashboard;
