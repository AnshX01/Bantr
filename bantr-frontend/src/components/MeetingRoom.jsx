import React, { useState, useEffect } from 'react';
import VideoCall from './VideoCall';
import apiService from '../services/api';

const MeetingRoom = ({ roomId, onLeave }) => {
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    initializeMeeting();
  }, [roomId]);

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

      const meetingData = await apiService.joinMeeting(roomId);
      setMeeting(meetingData.meeting);
      
    } catch (error) {
      console.error('Error initializing meeting:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveMeeting = () => {
    if (onLeave) {
      onLeave();
    }
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
          Room ID: {roomId}
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
        gap: '20px'
      }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '8px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h3>Meeting Error</h3>
          <p>{error}</p>
          <button 
            onClick={handleLeaveMeeting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!meeting || !userInfo) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        <div>Unable to load meeting information</div>
      </div>
    );
  }

  return (
    <VideoCall
      roomId={roomId}
      userId={userInfo.userId}
      userName={userInfo.name}
      onLeave={handleLeaveMeeting}
    />
  );
};

export default MeetingRoom;
