package models

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Meeting struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	RoomID      string        `bson:"room_id" json:"room_id"`
	Title       string        `bson:"title" json:"title"`
	Description string        `bson:"description" json:"description"`
	CreatedBy   string        `bson:"created_by" json:"created_by"`
	CreatorName string        `bson:"creator_name" json:"creator_name"`
	IsActive    bool          `bson:"is_active" json:"is_active"`
	CreatedAt   time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time     `bson:"updated_at" json:"updated_at"`
	Participants []string     `bson:"participants" json:"participants"` 
}

func GenerateRoomID() string {
	bytes := make([]byte, 6)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func CreateMeeting(collection *mongo.Collection, meeting *Meeting) error {
	meeting.CreatedAt = time.Now()
	meeting.UpdatedAt = time.Now()
	meeting.IsActive = true
	
	if meeting.RoomID == "" {
		meeting.RoomID = GenerateRoomID()
	}
	
	log.Printf("Creating meeting room: %s (ID: %s) by %s", meeting.Title, meeting.RoomID, meeting.CreatorName)
	result, err := collection.InsertOne(context.Background(), meeting)
	if err != nil {
		log.Printf("Error creating meeting: %v", err)
		return err
	}
	
	if oid, ok := result.InsertedID.(bson.ObjectID); ok {
		meeting.ID = oid
		log.Printf("Meeting created successfully with ID: %s, Room ID: %s", oid.Hex(), meeting.RoomID)
	}
	
	return nil
}

func FindMeetingByRoomID(collection *mongo.Collection, roomID string) (*Meeting, error) {
	var meeting Meeting
	filter := bson.M{"room_id": roomID}
	
	log.Printf("Looking for meeting with room ID: %s", roomID)
	err := collection.FindOne(context.Background(), filter).Decode(&meeting)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Printf("Meeting not found with room ID: %s", roomID)
		} else {
			log.Printf("Error finding meeting: %v", err)
		}
		return nil, err
	}
	
	log.Printf("Found meeting: %s (Room ID: %s)", meeting.Title, meeting.RoomID)
	return &meeting, nil
}

func AddParticipant(collection *mongo.Collection, roomID, userID string) error {
	filter := bson.M{"room_id": roomID}
	update := bson.M{
		"$addToSet": bson.M{"participants": userID},
		"$set":      bson.M{"updated_at": time.Now()},
	}
	
	log.Printf("Adding participant %s to room %s", userID, roomID)
	result, err := collection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		log.Printf("Error adding participant: %v", err)
		return err
	}
	
	log.Printf("Participant added successfully. Modified count: %d", result.ModifiedCount)
	return nil
}

func GetUserMeetings(collection *mongo.Collection, userID string) ([]Meeting, error) {
	filter := bson.M{"created_by": userID}
	
	log.Printf("Getting meetings for user: %s", userID)
	cursor, err := collection.Find(context.Background(), filter)
	if err != nil {
		log.Printf("Error finding user meetings: %v", err)
		return nil, err
	}
	defer cursor.Close(context.Background())
	
	var meetings []Meeting
	if err = cursor.All(context.Background(), &meetings); err != nil {
		log.Printf("Error decoding meetings: %v", err)
		return nil, err
	}
	
	log.Printf("Found %d meetings for user %s", len(meetings), userID)
	return meetings, nil
}

func RemoveParticipant(collection *mongo.Collection, roomID, userID string) error {
	filter := bson.M{"room_id": roomID}
	update := bson.M{
		"$pull": bson.M{"participants": userID},
		"$set": bson.M{"updated_at": time.Now()},
	}

	log.Printf("Removing participant %s from room %s", userID, roomID)
	result, err := collection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		log.Printf("Error removing participant: %v", err)
		return err
	}

	log.Printf("Participant removed. Modified count: %d", result.ModifiedCount)
	return nil
}

func DeactivateMeeting(collection *mongo.Collection, roomID string) error {
	filter := bson.M{"room_id": roomID}
	update := bson.M{
		"$set": bson.M{
			"is_active":  false,
			"updated_at": time.Now(),
		},
	}

	log.Printf("Deactivating meeting room: %s", roomID)
	result, err := collection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		log.Printf("Error deactivating meeting: %v", err)
		return err
	}

	log.Printf("Meeting deactivated. Modified count: %d", result.ModifiedCount)
	return nil
}
