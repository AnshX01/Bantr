package models

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type User struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string        `bson:"name" json:"name"`
	Email     string        `bson:"email" json:"email"`
	Picture   string        `bson:"picture" json:"picture"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time     `bson:"updated_at" json:"updated_at"`
}

// CreateUser creates a new user in the database
func CreateUser(collection *mongo.Collection, user *User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	log.Printf("Creating new user: %s (%s)", user.Name, user.Email)
	result, err := collection.InsertOne(context.Background(), user)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		return err
	}

	// Update the user's ID with the inserted ID
	if oid, ok := result.InsertedID.(bson.ObjectID); ok {
		user.ID = oid
		log.Printf("User created successfully with ID: %s", oid.Hex())
	}

	return nil
}

// FindUserByEmail finds a user by email address
func FindUserByEmail(collection *mongo.Collection, email string) (*User, error) {
	var user User
	filter := bson.M{"email": email}

	log.Printf("Looking for user with email: %s", email)
	err := collection.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Printf("User not found with email: %s", email)
		} else {
			log.Printf("Error finding user: %v", err)
		}
		return nil, err
	}

	log.Printf("Found existing user: %s (ID: %s)", user.Name, user.ID.Hex())
	return &user, nil
}

// UpdateUser updates an existing user
func UpdateUser(collection *mongo.Collection, user *User) error {
	user.UpdatedAt = time.Now()

	filter := bson.M{"_id": user.ID}
	update := bson.M{
		"$set": bson.M{
			"name":       user.Name,
			"picture":    user.Picture,
			"updated_at": user.UpdatedAt,
		},
	}

	log.Printf("Updating user: %s (ID: %s)", user.Name, user.ID.Hex())
	result, err := collection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		log.Printf("Error updating user: %v", err)
		return err
	}

	log.Printf("User updated successfully. Modified count: %d", result.ModifiedCount)
	return nil
}

// FindOrCreateUser finds a user by email or creates a new one
func FindOrCreateUser(collection *mongo.Collection, name, email, picture string) (*User, error) {
	log.Printf("FindOrCreateUser called for: %s (%s)", name, email)

	// Try to find existing user
	existingUser, err := FindUserByEmail(collection, email)
	if err == nil {
		// User exists, update their info
		log.Printf("User exists, updating info")
		existingUser.Name = name
		existingUser.Picture = picture
		err = UpdateUser(collection, existingUser)
		return existingUser, err
	}

	// User doesn't exist, create new one
	if err == mongo.ErrNoDocuments {
		log.Printf("User doesn't exist, creating new user")
		newUser := &User{
			Name:    name,
			Email:   email,
			Picture: picture,
		}

		err = CreateUser(collection, newUser)
		if err != nil {
			log.Printf("Failed to create new user: %v", err)
			return nil, err
		}

		log.Printf("New user created successfully: %s (ID: %s)", newUser.Name, newUser.ID.Hex())
		return newUser, nil
	}

	// Other error occurred
	log.Printf("Unexpected error in FindOrCreateUser: %v", err)
	return nil, err
}
