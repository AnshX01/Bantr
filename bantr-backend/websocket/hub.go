package websocket

import (
	"crypto/rand"
	"encoding/json"
	"log"
	"math/big"
	"net/http"
	"sync"

	"github.com/AnshX01/Bantr/bantr-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:3000"
	},
}

type Hub struct {
	rooms      map[string]*models.Room
	clients    map[string]*models.Client
	register   chan *models.Client
	unregister chan *models.Client
	broadcast  chan []byte
	mutex      sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]*models.Room),
		clients:    make(map[string]*models.Client),
		register:   make(chan *models.Client),
		unregister: make(chan *models.Client),
		broadcast:  make(chan []byte),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)
			
		case client := <-h.unregister:
			h.unregisterClient(client)
			
		case message := <-h.broadcast:
			log.Printf("Broadcasting message: %s", string(message))
		}
	}
}

func (h *Hub) registerClient(client *models.Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	
	h.clients[client.ID] = client
	log.Printf("Client registered: %s", client.ID)
}

func (h *Hub) unregisterClient(client *models.Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	
	if _, ok := h.clients[client.ID]; ok {
		if client.RoomID != "" {
			if room, exists := h.rooms[client.RoomID]; exists {
				room.RemoveClient(client.ID)
				
				if room.GetClientCount() == 0 {
					delete(h.rooms, client.RoomID)
					log.Printf("Room %s deleted (empty)", client.RoomID)
				}
			}
		}
		
		delete(h.clients, client.ID)
		close(client.Send)
		log.Printf("Client unregistered: %s", client.ID)
	}
}

func (h *Hub) JoinRoom(client *models.Client, roomID string) error {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	
	if _, exists := h.rooms[roomID]; !exists {
		h.rooms[roomID] = models.NewRoom(roomID)
		log.Printf("Room %s created", roomID)
	}
	
	room := h.rooms[roomID]
	room.AddClient(client)
	
	return nil
}

func (h *Hub) HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	
	clientID := generateClientID()
	
	client := &models.Client{
		ID:   clientID,
		Conn: conn,
		Send: make(chan []byte, 256),
	}
	
	h.register <- client
	
	go h.writePump(client)
	go h.readPump(client)
}

func (h *Hub) readPump(client *models.Client) {
	defer func() {
		h.unregister <- client
		client.Conn.Close()
	}()
	
	for {
		_, messageBytes, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		
		var message models.WebSocketMessage
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}
		
		h.handleMessage(client, message)
	}
}

func (h *Hub) writePump(client *models.Client) {
	defer client.Conn.Close()
	
	for message := range client.Send {
		client.Conn.WriteMessage(websocket.TextMessage, message)
	}
}

func (h *Hub) handleMessage(client *models.Client, message models.WebSocketMessage) {
	switch message.Type {
	case models.MessageTypeJoinRoom:
		h.handleJoinRoom(client, message)
		
	case models.MessageTypeOffer:
		h.handleOffer(client, message)
		
	case models.MessageTypeAnswer:
		h.handleAnswer(client, message)
		
	case models.MessageTypeIceCandidate:
		h.handleIceCandidate(client, message)
		
	default:
		log.Printf("Unknown message type: %s", message.Type)
	}
}

func (h *Hub) handleJoinRoom(client *models.Client, message models.WebSocketMessage) {
	var joinData models.JoinRoomData
	if err := json.Unmarshal(message.Data, &joinData); err != nil {
		log.Printf("Error unmarshaling join room data: %v", err)
		h.sendError(client, "Invalid join room data")
		return
	}
	
	client.UserID = joinData.UserID
	client.Name = joinData.Name
	
	if err := h.JoinRoom(client, joinData.RoomID); err != nil {
		log.Printf("Error joining room: %v", err)
		h.sendError(client, "Failed to join room")
		return
	}
	
	log.Printf("Client %s joined room %s", client.UserID, joinData.RoomID)
}

func (h *Hub) handleOffer(client *models.Client, message models.WebSocketMessage) {
	var offerData models.RTCOfferData
	if err := json.Unmarshal(message.Data, &offerData); err != nil {
		log.Printf("Error unmarshaling offer data: %v", err)
		return
	}
	
	h.forwardToTarget(client, offerData.Target, models.MessageTypeOffer, message.Data)
}

func (h *Hub) handleAnswer(client *models.Client, message models.WebSocketMessage) {
	var answerData models.RTCAnswerData
	if err := json.Unmarshal(message.Data, &answerData); err != nil {
		log.Printf("Error unmarshaling answer data: %v", err)
		return
	}
	
	h.forwardToTarget(client, answerData.Target, models.MessageTypeAnswer, message.Data)
}

func (h *Hub) handleIceCandidate(client *models.Client, message models.WebSocketMessage) {
	var iceData models.RTCIceCandidateData
	if err := json.Unmarshal(message.Data, &iceData); err != nil {
		log.Printf("Error unmarshaling ice candidate data: %v", err)
		return
	}
	
	h.forwardToTarget(client, iceData.Target, models.MessageTypeIceCandidate, message.Data)
}

func (h *Hub) forwardToTarget(sender *models.Client, targetUserID string, messageType models.MessageType, data json.RawMessage) {
	if sender.RoomID == "" {
		log.Printf("Client %s not in a room", sender.UserID)
		return
	}
	
	h.mutex.RLock()
	room, exists := h.rooms[sender.RoomID]
	h.mutex.RUnlock()
	
	if !exists {
		log.Printf("Room %s not found", sender.RoomID)
		return
	}
	
	forwardMessage := models.WebSocketMessage{
		Type:   messageType,
		RoomID: sender.RoomID,
		UserID: sender.UserID,
		Data:   data,
	}
	
	room.SendToClient(targetUserID, forwardMessage)
}

func (h *Hub) sendError(client *models.Client, errorMsg string) {
	errorMessage := models.WebSocketMessage{
		Type:  models.MessageTypeError,
		Error: errorMsg,
	}
	
	if messageBytes, err := json.Marshal(errorMessage); err == nil {
		select {
		case client.Send <- messageBytes:
		default:
			close(client.Send)
		}
	}
}

func generateClientID() string {
	return "client_" + randomString(8)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[num.Int64()]
	}
	return string(b)
}
