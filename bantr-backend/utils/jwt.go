package utils

import (
	"errors"
	"os"
	"time"

	"github.com/AnshX01/Bantr/bantr-backend/models"
	"github.com/golang-jwt/jwt/v4"
	"go.mongodb.org/mongo-driver/v2/bson"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

type Claims struct {
	UserID  string `json:"user_id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token for a user
func GenerateToken(user models.User) (string, error) {
	expirationTime := time.Now().Add(72 * time.Hour)
	
	claims := &Claims{
		UserID:  user.ID.Hex(),
		Email:   user.Email,
		Name:    user.Name,
		Picture: user.Picture,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// VerifyToken validates and parses a JWT token
func VerifyToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// GetUserIDFromToken extracts user ID from token string
func GetUserIDFromToken(tokenString string) (bson.ObjectID, error) {
	claims, err := VerifyToken(tokenString)
	if err != nil {
		return bson.ObjectID{}, err
	}

	userID, err := bson.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return bson.ObjectID{}, errors.New("invalid user ID in token")
	}

	return userID, nil
}

// IsTokenExpired checks if a token is expired
func IsTokenExpired(tokenString string) bool {
	claims, err := VerifyToken(tokenString)
	if err != nil {
		return true
	}

	return time.Now().After(claims.ExpiresAt.Time)
}
