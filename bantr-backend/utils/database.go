package utils

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var (
	Client   *mongo.Client
	Database *mongo.Database
)

func ConnectDB() {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "bantr"
	}

	log.Printf("Connecting to MongoDB...")
	log.Printf("MongoDB URI: %s", mongoURI)
	log.Printf("Database Name: %s", dbName)

	clientOptions := options.Client().ApplyURI(mongoURI)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(clientOptions)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}

	log.Println("Connected to MongoDB successfully!")

	Client = client
	Database = client.Database(dbName)

	log.Printf("Using database: %s", Database.Name())
}

func DisconnectDB() {
	if Client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		err := Client.Disconnect(ctx)
		if err != nil {
			log.Printf("Error disconnecting from MongoDB: %v", err)
		} else {
			log.Println("Disconnected from MongoDB")
		}
	}
}

func GetCollection(collectionName string) *mongo.Collection {
	if Database == nil {
		log.Fatal("Database not initialized. Call ConnectDB() first.")
	}
	log.Printf("Getting collection: %s from database: %s", collectionName, Database.Name())
	return Database.Collection(collectionName)
}

func GetUsersCollection() *mongo.Collection {
	return GetCollection("users")
}
func GetMeetingsCollection() *mongo.Collection {
	return GetCollection("meetings")
}
