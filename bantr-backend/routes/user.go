package routes

import (
	"net/http"

	"github.com/AnshX01/Bantr/bantr-backend/middleware"
	"github.com/gin-gonic/gin"
)

func UserRoutes(router *gin.Engine) {
	userGroup := router.Group("/api/user")
	userGroup.Use(middleware.AuthMiddleware())
	{
		userGroup.GET("/profile", getUserProfile)
		
		userGroup.PUT("/profile", updateUserProfile)
		
	
	}
}

func getUserProfile(c *gin.Context) {
	userID, email, name, picture, _ := middleware.GetUserFromContext(c)
	
	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":      userID,
			"email":   email,
			"name":    name,
			"picture": picture,
		},
	})
}

// updateUserProfile updates the authenticated user's profile
func updateUserProfile(c *gin.Context) {
	userID, _, _, _, _ := middleware.GetUserFromContext(c)
	
	var req struct {
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user_id": userID,
		"updates": req,
	})
}


