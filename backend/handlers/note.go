package handlers

import (
	"net/http"

	"lifecompass-backend/database"
	"lifecompass-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UpdateNoteInput struct {
	Content string `json:"content"`
}

func GetNote(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var note models.Note
	// Try to find the note. If it doesn't exist, we return an empty one without error.
	if err := database.DB.Where("user_id = ?", userID).First(&note).Error; err != nil {
		// If not found, just return empty content
		c.JSON(http.StatusOK, gin.H{"note": models.Note{Content: ""}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"note": note})
}

func UpdateNote(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input UpdateNoteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var note models.Note
	// Find existing note
	err := database.DB.Where("user_id = ?", userID).First(&note).Error

	if err != nil {
		// Doesn't exist, create it
		note = models.Note{
			UserID:  userID,
			Content: input.Content,
		}
		if err := database.DB.Create(&note).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create note"})
			return
		}
	} else {
		// Exists, update it
		note.Content = input.Content
		if err := database.DB.Save(&note).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update note"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"note": note})
}
