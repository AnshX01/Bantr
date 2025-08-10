import React, { useState, useEffect, useRef } from 'react';
import WebRTCService from '../services/webrtc';

const VideoCall = ({ roomId, userId, userName, onLeave }) => {
  const [webrtcService] = useState(() => new WebRTCService());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  const [videoDebugInfo, setVideoDebugInfo] = useState('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteVideosRef = useRef(new Map());

  useEffect(() => {
    console.log('useEffect running with localStream:', !!webrtcService.localStream);
    
    if (!webrtcService.localStream) {
      console.log('No local stream available yet');
      return;
    }
    
    const video = localVideoRef.current;
    if (!video) {
      console.error('Video element not found');
      return;
    }
    
    console.log('Setting up video element with stream');
    video.srcObject = webrtcService.localStream;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    
    const playVideo = async () => {
      console.log('Attempting to play video...');
      try {
        await video.play();
        console.log('Video play succeeded');
      } catch (e) {
        console.error('Video play error:', e);
      }
    };
    
    video.onloadedmetadata = () => {
      console.log('Video metadata loaded');
      playVideo();
    };
    
    // Try to play after a short delay
    const playTimeout = setTimeout(() => {
      if (video.paused) {
        console.log('Attempting delayed play...');
        playVideo();
      }
    }, 500);
    
    return () => {
      clearTimeout(playTimeout);
      if (video) {
        video.onloadedmetadata = null;
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      }
    };
  }, [webrtcService.localStream]);
  
  useEffect(() => {
    initializeCall();
    
    return () => {
      webrtcService.leaveRoom();
    };
  }, []);

  const initializeCall = async () => {
    try {
      setIsConnecting(true);
      setError('');

      webrtcService.onRemoteStreamAdded = handleRemoteStreamAdded;
      webrtcService.onRemoteStreamRemoved = handleRemoteStreamRemoved;
      webrtcService.onUserJoined = handleUserJoined;
      webrtcService.onUserLeft = handleUserLeft;
      webrtcService.onError = handleError;

      console.log('Initializing local media...');
      const localStream = await webrtcService.initializeLocalMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      console.log('Local stream initialized:', localStream);
      localStreamRef.current = localStream;
      
      const videoTracks = localStream.getVideoTracks();
      console.log('Video tracks in stream:', videoTracks.length);
      if (videoTracks.length > 0) {
        console.log('First video track settings:', videoTracks[0].getSettings());
      } else {
        console.error('No video tracks in the stream!');
      }
      
      console.log('Joining room...');
      await webrtcService.joinRoom(roomId, userId, userName);
      
      setIsConnecting(false);
    } catch (error) {
      console.error('Error initializing call:', error);
      setError(error.message || 'Failed to initialize call');
      setIsConnecting(false);
    }
  };

  const handleRemoteStreamAdded = (userId, stream) => {
    console.log('Remote stream added for user:', userId);
    
    const videoElement = remoteVideosRef.current.get(userId);
    if (videoElement) {
      videoElement.srcObject = stream;
    }
  };

  const handleRemoteStreamRemoved = (userId) => {
    console.log('Remote stream removed for user:', userId);
    
    const videoElement = remoteVideosRef.current.get(userId);
    if (videoElement) {
      videoElement.srcObject = null;
    }
    
    setParticipants(prev => prev.filter(p => p.userId !== userId));
  };

  const handleUserJoined = ({ userId, name }) => {
    console.log('User joined:', name);
    setParticipants(prev => {
      if (prev.find(p => p.userId === userId)) return prev;
      return [...prev, { userId, name }];
    });
  };

  const handleUserLeft = ({ userId, name }) => {
    console.log('User left:', name);
    setParticipants(prev => prev.filter(p => p.userId !== userId));
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
  };

  const toggleVideo = () => {
    const enabled = webrtcService.toggleVideo();
    setIsVideoEnabled(enabled);
  };

  const toggleAudio = () => {
    const enabled = webrtcService.toggleAudio();
    setIsAudioEnabled(enabled);
  };

  const handleLeaveCall = () => {
    webrtcService.leaveRoom();
    if (onLeave) onLeave();
  };

  if (isConnecting) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '18px' }}>Connecting to meeting...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
        </div>
        <div>Connecting to meeting...</div>
        <div style={{ fontSize: '14px', color: '#aaa' }}>Room ID: {roomId}</div>
        <button 
          onClick={handleLeaveCall}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
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
          <h3>Connection Error</h3>
          <p>{error}</p>
          <button 
            onClick={handleLeaveCall}
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

  const containerStyle = {
    height: '100vh',
    backgroundColor: '#1a1a1a',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative'
  };

  const videoContainerStyle = {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    aspectRatio: '16/9',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto'
  };

  const videoStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transform: 'scaleX(-1)'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        padding: '15px 20px',
        backgroundColor: '#2d2d2d',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0 }}>Meeting Room: {roomId}</h3>
          <div style={{ fontSize: '14px', color: '#ccc' }}>
            {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
          </div>
        </div>
        <button 
          onClick={handleLeaveCall}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Leave Meeting
        </button>
      </div>

      <div className="video-grid" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(100vh - 100px)'
      }}>
        <div className="video-container" style={videoContainerStyle}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={videoStyle}
          />
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {userName} (You)
          </div>
          {!isVideoEnabled && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              fontSize: '48px'
            }}>
              📹
            </div>
          )}
        </div>

        {participants.map((participant) => (
          <div 
            key={participant.userId}
            style={{ 
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              maxWidth: '800px',
              width: '100%',
              margin: '0 auto'
            }}
          >
            <video
              ref={(el) => {
                if (el) {
                  remoteVideosRef.current.set(participant.userId, el);
                } else {
                  remoteVideosRef.current.delete(participant.userId);
                }
              }}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {participant.name}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#2d2d2d',
        display: 'flex',
        justifyContent: 'center',
        gap: '15px'
      }}>
        <button
          onClick={toggleAudio}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isAudioEnabled ? '#28a745' : '#dc3545',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>

        <button
          onClick={toggleVideo}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isVideoEnabled ? '#28a745' : '#dc3545',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? '📹' : '📷'}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
