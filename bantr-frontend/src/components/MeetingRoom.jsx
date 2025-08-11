import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoCall from './VideoCall';
import apiService from '../services/api';

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    initializeMeeting();
  }, [meetingId]);

  const initializeMeeting = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo({
          userId: payload.user_id,
          name: payload.name || payload.email || 'User'
        });
      } catch (e) {
        console.error('Error decoding token:', e);
        setUserInfo({
          userId: 'user_' + Date.now(),
          name: 'Anonymous User'
        });
      }

      const meetingData = await apiService.joinMeeting(meetingId);
      setMeeting(meetingData.meeting);
      
    } catch (error) {
      console.error('Error initializing meeting:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveMeeting = () => {
    navigate('/meetings');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '18px' }}>Loading meeting...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Room ID: {meetingId}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '8px',
          maxWidth: '500px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>Meeting Error</h3>
          <p>{error}</p>
        </div>
        <button 
          onClick={handleLeaveMeeting}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!meeting || !userInfo) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>Unable to load meeting information</div>
        <button 
          onClick={handleLeaveMeeting}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Meetings
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '15px 20px', 
        backgroundColor: '#2d2d2d',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '500' }}>
            {meeting?.title || 'Meeting'}
          </h2>
          <div style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '4px' }}>
            Room ID: {meetingId}
          </div>
        </div>
        <button 
          onClick={handleLeaveMeeting}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#c82333'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#dc3545'}
        >
          <span>🚪</span> Leave Meeting
        </button>
      </div>
      
      <div style={{ 
        flex: 1, 
        backgroundColor: '#1a1a1a', 
        position: 'relative',
        overflow: 'hidden'
      }}>
        <VideoCall 
          roomId={meetingId} 
          userId={userInfo?.userId} 
          userName={userInfo?.name || 'User'} 
          onLeave={handleLeaveMeeting} 
        />
      </div>
    </div>
  );
};

export default MeetingRoom;
