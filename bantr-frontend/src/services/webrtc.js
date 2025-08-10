class WebRTCService {
  constructor() {
    this.localStream = null;
    this.remoteStreams = new Map(); 
    this.peerConnections = new Map(); 
    this.websocket = null;
    this.currentRoomId = null;
    this.currentUserId = null;
    this.currentUserName = null;
    
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    this.onRemoteStreamAdded = null;
    this.onRemoteStreamRemoved = null;
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onError = null;
  }

  async initializeLocalMedia(constraints = { 
    video: { 
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user' 
    }, 
    audio: true 
  }) {
    try {
      console.log('=== initializeLocalMedia ===');
      console.log('Requesting media with constraints:', JSON.stringify(constraints, null, 2));
      
      if (this.localStream) {
        console.log('Releasing existing stream tracks');
        this.localStream.getTracks().forEach(track => {
          console.log(`Stopping track: ${track.kind} (${track.id})`);
          track.stop();
        });
      }
      
      console.log('Calling getUserMedia...');
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!this.localStream) {
        throw new Error('getUserMedia returned null/undefined stream');
      }
      
      const tracks = this.localStream.getTracks();
      console.log(`Got ${tracks.length} tracks in local stream`);
      
      tracks.forEach((track, index) => {
        console.log(`Track ${index + 1}:`, {
          id: track.id,
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          label: track.label || 'no-label',
          settings: track.getSettings ? track.getSettings() : 'no-settings',
          constraints: track.getConstraints ? track.getConstraints() : 'no-constraints'
        });
        
        track.onended = () => {
          console.log(`Track ${track.kind} (${track.id}) ended`);
        };
        
        track.onmute = () => {
          console.log(`Track ${track.kind} (${track.id}) muted`);
        };
        
        track.onunmute = () => {
          console.log(`Track ${track.kind} (${track.id}) unmuted`);
        };
      });
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        console.warn('Falling back to basic constraints');
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          return this.localStream;
        } catch (fallbackError) {
          console.error('Error with fallback constraints:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  async joinRoom(roomId, userId, userName) {
    return new Promise((resolve, reject) => {
      try {
        this.currentRoomId = roomId;
        this.currentUserId = userId;
        this.currentUserName = userName;
        
        // Connect to WebSocket
        this.websocket = new WebSocket(`ws://localhost:8080/ws/${roomId}`);
        
        this.websocket.onopen = () => {
          console.log('WebSocket connected');
          
          // Send join room message
          this.sendMessage({
            type: 'join-room',
            data: {
              room_id: roomId,
              user_id: userId,
              name: userName
            }
          });
          
          resolve();
        };
        
        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(JSON.parse(event.data));
        };
        
        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('Failed to connect to meeting room'));
        };
        
        this.websocket.onclose = () => {
          console.log('WebSocket disconnected');
          this.cleanup();
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  handleWebSocketMessage(message) {
    console.log('Received WebSocket message:', message);
    
    switch (message.type) {
      case 'user-joined':
        this.handleUserJoined(message);
        break;
      case 'user-left':
        this.handleUserLeft(message);
        break;
      case 'offer':
        this.handleOffer(message);
        break;
      case 'answer':
        this.handleAnswer(message);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(message);
        break;
      case 'error':
        console.error('WebSocket error:', message.error);
        if (this.onError) this.onError(message.error);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  async handleUserJoined(message) {
    const userData = JSON.parse(message.data);
    const { user_id: userId, name } = userData;
    
    console.log(`User ${name} (${userId}) joined`);
    
    if (this.onUserJoined) {
      this.onUserJoined({ userId, name });
    }
    
    await this.createPeerConnection(userId);
    await this.createOffer(userId);
  }

  handleUserLeft(message) {
    const userData = JSON.parse(message.data);
    const { user_id: userId, name } = userData;
    
    console.log(`User ${name} (${userId}) left`);
    
    if (this.peerConnections.has(userId)) {
      this.peerConnections.get(userId).close();
      this.peerConnections.delete(userId);
    }
    
    if (this.remoteStreams.has(userId)) {
      this.remoteStreams.delete(userId);
      if (this.onRemoteStreamRemoved) {
        this.onRemoteStreamRemoved(userId);
      }
    }
    
    if (this.onUserLeft) {
      this.onUserLeft({ userId, name });
    }
  }

  async createPeerConnection(userId) {
    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }
    
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', userId);
      const [remoteStream] = event.streams;
      this.remoteStreams.set(userId, remoteStream);
      
      if (this.onRemoteStreamAdded) {
        this.onRemoteStreamAdded(userId, remoteStream);
      }
    };
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendMessage({
          type: 'ice-candidate',
          data: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            target: userId
          }
        });
      }
    };
    
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
    };
    
    this.peerConnections.set(userId, peerConnection);
    return peerConnection;
  }

  async createOffer(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) return;
    
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.sendMessage({
        type: 'offer',
        data: {
          sdp: offer.sdp,
          type: offer.type,
          target: userId
        }
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  async handleOffer(message) {
    const offerData = JSON.parse(message.data);
    const { sdp, type, target } = offerData;
    const senderId = message.user_id;
    
    if (!this.peerConnections.has(senderId)) {
      await this.createPeerConnection(senderId);
    }
    
    const peerConnection = this.peerConnections.get(senderId);
    
    try {
      await peerConnection.setRemoteDescription({ sdp, type });
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      this.sendMessage({
        type: 'answer',
        data: {
          sdp: answer.sdp,
          type: answer.type,
          target: senderId
        }
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(message) {
    const answerData = JSON.parse(message.data);
    const { sdp, type } = answerData;
    const senderId = message.user_id;
    
    const peerConnection = this.peerConnections.get(senderId);
    if (!peerConnection) return;
    
    try {
      await peerConnection.setRemoteDescription({ sdp, type });
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(message) {
    const iceData = JSON.parse(message.data);
    const { candidate, sdpMid, sdpMLineIndex } = iceData;
    const senderId = message.user_id;
    
    const peerConnection = this.peerConnections.get(senderId);
    if (!peerConnection) return;
    
    try {
      await peerConnection.addIceCandidate({
        candidate,
        sdpMid,
        sdpMLineIndex
      });
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  sendMessage(message) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  leaveRoom() {
    if (this.websocket) {
      this.websocket.close();
    }
    this.cleanup();
  }

  cleanup() {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.remoteStreams.clear();
    
    this.currentRoomId = null;
    this.currentUserId = null;
    this.currentUserName = null;
    this.websocket = null;
  }
}

export default WebRTCService;
