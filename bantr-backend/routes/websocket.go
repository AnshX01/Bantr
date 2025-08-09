package routes

import (
	"github.com/AnshX01/Bantr/bantr-backend/websocket"
	"github.com/gin-gonic/gin"
)

func WebSocketRoutes(router *gin.Engine, hub *websocket.Hub) {
	router.GET("/ws", hub.HandleWebSocket)
	
	router.GET("/ws/:roomId", func(c *gin.Context) {
		hub.HandleWebSocket(c)
	})
}
