package middleware

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/AnshX01/Bantr/bantr-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"google.golang.org/api/idtoken"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

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

		user := models.User{
			Email:   email,
			Name:    name,
			Picture: picture,
		}

		tokenString, err := generateJWT(user)
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

func generateJWT(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"email":   user.Email,
		"name":    user.Name,
		"picture": user.Picture,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}
