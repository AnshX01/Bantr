package routes

import (
	"github.com/AnshX01/Bantr/bantr-backend/middleware"
	"github.com/gin-gonic/gin"
)

func AuthRoutes(router *gin.Engine) {
	router.POST("/api/auth/google", middleware.GoogleAuthMiddleware())
}
