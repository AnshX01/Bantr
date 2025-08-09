package routes

import (
	"net/http"

	"github.com/AnshX01/Bantr/bantr-backend/middleware"
	"github.com/AnshX01/Bantr/bantr-backend/models"
	"github.com/AnshX01/Bantr/bantr-backend/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func MeetingRoutes(router *gin.Engine) {
	meetingGroup := router.Group("/api/meetings")
	meetingGroup.Use(middleware.AuthMiddleware())
	{
		meetingGroup.POST("", createMeeting)
		
		meetingGroup.GET("/:roomId", getMeeting)
		
		meetingGroup.GET("/user/list", getUserMeetings)
		
		meetingGroup.DELETE("/:roomId", endMeeting)
	}
}

func createMeeting(c *gin.Context) {
	userID, _, userName, _, _ := middleware.GetUserFromContext(c)
	
	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}
	
	meeting := &models.Meeting{
		Title:       req.Title,
		Description: req.Description,
		CreatedBy:   userID,
		CreatorName: userName,
	}
	
	meetingsCollection := utils.GetMeetingsCollection()
	err := models.CreateMeeting(meetingsCollection, meeting)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create meeting"})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"message": "Meeting created successfully",
		"meeting": meeting,
	})
}

func getMeeting(c *gin.Context) {
	roomID := c.Param("roomId")
	userID, _, _, _, _ := middleware.GetUserFromContext(c)
	
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID is required"})
		return
	}
	
	meetingsCollection := utils.GetMeetingsCollection()
	meeting, err := models.FindMeetingByRoomID(meetingsCollection, roomID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find meeting"})
		}
		return
	}
	
	if !meeting.IsActive {
		c.JSON(http.StatusGone, gin.H{"error": "Meeting has ended"})
		return
	}
	
	err = models.AddParticipant(meetingsCollection, roomID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join meeting"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"meeting": meeting,
		"message": "Successfully joined meeting",
	})
}

func getUserMeetings(c *gin.Context) {
	userID, _, _, _, _ := middleware.GetUserFromContext(c)
	
	meetingsCollection := utils.GetMeetingsCollection()
	
	meetings, err := models.GetUserMeetings(meetingsCollection, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get meetings"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"meetings": meetings,
		"count":    len(meetings),
	})
}

func endMeeting(c *gin.Context) {
	roomID := c.Param("roomId")
	userID, _, _, _, _ := middleware.GetUserFromContext(c)
	
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID is required"})
		return
	}
	
	meetingsCollection := utils.GetMeetingsCollection()
	meeting, err := models.FindMeetingByRoomID(meetingsCollection, roomID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find meeting"})
		}
		return
	}
	
	if meeting.CreatedBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the meeting creator can end the meeting"})
		return
	}
	
	err = models.DeactivateMeeting(meetingsCollection, roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to end meeting"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Meeting ended successfully",
		"room_id": roomID,
	})
}
