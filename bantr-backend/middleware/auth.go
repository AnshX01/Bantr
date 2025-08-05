package middleware

import (
	"net/http"
	"strings"

	"github.com/AnshX01/Bantr/bantr-backend/utils"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT tokens and protects routes
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check if header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
			c.Abort()
			return
		}

		// Verify token
		claims, err := utils.VerifyToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Check if token is expired
		if utils.IsTokenExpired(tokenString) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
			c.Abort()
			return
		}

		// Store user information in context for use in handlers
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_name", claims.Name)
		c.Set("user_picture", claims.Picture)

		// Continue to next handler
		c.Next()
	}
}

// OptionalAuthMiddleware validates JWT tokens but doesn't require them
func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No token provided, continue without authentication
			c.Next()
			return
		}

		// Check if header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			// Invalid format, continue without authentication
			c.Next()
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			// Empty token, continue without authentication
			c.Next()
			return
		}

		// Verify token
		claims, err := utils.VerifyToken(tokenString)
		if err != nil {
			// Invalid token, continue without authentication
			c.Next()
			return
		}

		// Check if token is expired
		if utils.IsTokenExpired(tokenString) {
			// Expired token, continue without authentication
			c.Next()
			return
		}

		// Store user information in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_name", claims.Name)
		c.Set("user_picture", claims.Picture)
		c.Set("authenticated", true)

		// Continue to next handler
		c.Next()
	}
}

// GetUserFromContext extracts user information from gin context
func GetUserFromContext(c *gin.Context) (userID, email, name, picture string, authenticated bool) {
	userIDVal, _ := c.Get("user_id")
	emailVal, _ := c.Get("user_email")
	nameVal, _ := c.Get("user_name")
	pictureVal, _ := c.Get("user_picture")
	authenticatedVal, _ := c.Get("authenticated")
	
	userIDStr, ok1 := userIDVal.(string)
	emailStr, ok2 := emailVal.(string)
	nameStr, ok3 := nameVal.(string)
	pictureStr, ok4 := pictureVal.(string)
	authBool, ok5 := authenticatedVal.(bool)
	
	if !ok1 || !ok2 || !ok3 || !ok4 {
		return "", "", "", "", false
	}
	
	if !ok5 {
		authBool = true // If we have user data, assume authenticated
	}
	
	return userIDStr, emailStr, nameStr, pictureStr, authBool
}
