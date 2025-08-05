package middleware

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/AnshX01/Bantr/bantr-backend/models"
	"github.com/AnshX01/Bantr/bantr-backend/utils"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/idtoken"
)



func GoogleAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Token string `json:"token"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		payload, err := idtoken.Validate(context.Background(), req.Token, os.Getenv("GOOGLE_CLIENT_ID"))
		if err != nil {
			log.Println("Token validation error:", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google token"})
			return
		}

		email := payload.Claims["email"].(string)
		name := payload.Claims["name"].(string)
		picture := payload.Claims["picture"].(string)

		// Get users collection
		usersCollection := utils.GetUsersCollection()

		// Find or create user in database
		user, err := models.FindOrCreateUser(usersCollection, name, email, picture)
		if err != nil {
			log.Println("Database error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}

		tokenString, err := utils.GenerateToken(*user)
		if err != nil {
			log.Println("JWT generation error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": tokenString,
			"user":  user,
		})
	}
}


