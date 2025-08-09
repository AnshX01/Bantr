package models

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type MessageType string

const (
	MessageTypeJoinRoom     MessageType = "join-room"
	MessageTypeUserJoined   MessageType = "user-joined"
	MessageTypeUserLeft     MessageType = "user-left"
	MessageTypeOffer        MessageType = "offer"
	MessageTypeAnswer       MessageType = "answer"
	MessageTypeIceCandidate MessageType = "ice-candidate"
	MessageTypeError        MessageType = "error"
)

type WebSocketMessage struct {
	Type    MessageType     `json:"type"`
	RoomID  string          `json:"room_id,omitempty"`
	UserID  string          `json:"user_id,omitempty"`
	Data    json.RawMessage `json:"data,omitempty"`
	Error   string          `json:"error,omitempty"`
}

type JoinRoomData struct {
	RoomID string `json:"room_id"`
	UserID string `json:"user_id"`
	Name   string `json:"name"`
}

type UserJoinedData struct {
	UserID string `json:"user_id"`
	Name   string `json:"name"`
}

type UserLeftData struct {
	UserID string `json:"user_id"`
	Name   string `json:"name"`
}

type RTCOfferData struct {
	SDP    string `json:"sdp"`
	Type   string `json:"type"`
	Target string `json:"target"` // Target user ID
}

type RTCAnswerData struct {
	SDP    string `json:"sdp"`
	Type   string `json:"type"`
	Target string `json:"target"` // Target user ID
}

type RTCIceCandidateData struct {
	Candidate     string `json:"candidate"`
	SdpMid        string `json:"sdpMid"`
	SdpMLineIndex int    `json:"sdpMLineIndex"`
	Target        string `json:"target"` // Target user ID
}

type Client struct {
	ID     string
	UserID string
	Name   string
	RoomID string
	Conn   *websocket.Conn
	Send   chan []byte
}

type Room struct {
	ID      string
	Clients map[string]*Client
	mutex   sync.RWMutex
}

func NewRoom(id string) *Room {
	return &Room{
		ID:      id,
		Clients: make(map[string]*Client),
	}
}

func (r *Room) AddClient(client *Client) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	r.Clients[client.ID] = client
	client.RoomID = r.ID
	
	log.Printf("Client %s (%s) joined room %s", client.UserID, client.Name, r.ID)
	
	userJoinedData := UserJoinedData{
		UserID: client.UserID,
		Name:   client.Name,
	}
	
	message := WebSocketMessage{
		Type:   MessageTypeUserJoined,
		RoomID: r.ID,
		UserID: client.UserID,
	}
	
	if data, err := json.Marshal(userJoinedData); err == nil {
		message.Data = data
		r.broadcastToOthers(client.ID, message)
	}
}

func (r *Room) RemoveClient(clientID string) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if client, exists := r.Clients[clientID]; exists {
		delete(r.Clients, clientID)
		
		log.Printf("Client %s (%s) left room %s", client.UserID, client.Name, r.ID)
		
		userLeftData := UserLeftData{
			UserID: client.UserID,
			Name:   client.Name,
		}
		
		message := WebSocketMessage{
			Type:   MessageTypeUserLeft,
			RoomID: r.ID,
			UserID: client.UserID,
		}
		
		if data, err := json.Marshal(userLeftData); err == nil {
			message.Data = data
			r.broadcastToOthers(clientID, message)
		}
	}
}

func (r *Room) GetClientCount() int {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	return len(r.Clients)
}

func (r *Room) BroadcastMessage(message WebSocketMessage) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}
	
	for _, client := range r.Clients {
		select {
		case client.Send <- messageBytes:
		default:
			close(client.Send)
			delete(r.Clients, client.ID)
		}
	}
}

func (r *Room) broadcastToOthers(excludeClientID string, message WebSocketMessage) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}
	
	for clientID, client := range r.Clients {
		if clientID != excludeClientID {
			select {
			case client.Send <- messageBytes:
			default:
				close(client.Send)
				delete(r.Clients, clientID)
			}
		}
	}
}

func (r *Room) SendToClient(targetUserID string, message WebSocketMessage) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}
	
	for _, client := range r.Clients {
		if client.UserID == targetUserID {
			select {
			case client.Send <- messageBytes:
			default:
				close(client.Send)
				delete(r.Clients, client.ID)
			}
			break
		}
	}
}
