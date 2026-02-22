package handlers

import (
	"net/http"
	"strings"
	"time"

	"lifecompass-backend/database"
	"lifecompass-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateTaskInput struct {
	Title       string  `json:"title" binding:"required"`
	Description *string `json:"description"`
	Status      string  `json:"status"`
	DueDate     *string `json:"due_date"`
	Priority    string  `json:"priority"`
	Category    string  `json:"category"`
}

type UpdateTaskInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	DueDate     *string `json:"due_date"`
	Priority    *string `json:"priority"`
	Category    *string `json:"category"`
}

var validStatuses = map[string]bool{"todo": true, "in_progress": true, "done": true}
var validPriorities = map[string]bool{"low": true, "medium": true, "high": true}
var validCategories = map[string]bool{"task": true, "hobby": true, "event": true}

func GetTasks(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	query := database.DB.Where("user_id = ?", userID)

	// Filter by status
	if status := c.Query("status"); status != "" {
		if validStatuses[strings.ToLower(status)] {
			query = query.Where("status = ?", strings.ToLower(status))
		}
	}

	// Filter by priority
	if priority := c.Query("priority"); priority != "" {
		if validPriorities[strings.ToLower(priority)] {
			query = query.Where("priority = ?", strings.ToLower(priority))
		}
	}

	// Filter by due_date
	if dueDate := c.Query("due_date"); dueDate != "" {
		parsed, err := time.Parse("2006-01-02", dueDate)
		if err == nil {
			nextDay := parsed.AddDate(0, 0, 1)
			query = query.Where("due_date >= ? AND due_date < ?", parsed, nextDay)
		}
	}

	// Sorting
	sortBy := c.DefaultQuery("sort_by", "created_at")
	order := c.DefaultQuery("order", "desc")

	allowedSorts := map[string]bool{
		"due_date":   true,
		"priority":   true,
		"created_at": true,
		"title":      true,
		"status":     true,
	}

	if !allowedSorts[sortBy] {
		sortBy = "created_at"
	}

	if order != "asc" && order != "desc" {
		order = "desc"
	}

	// For priority sorting, use a CASE expression for proper ordering
	if sortBy == "priority" {
		priorityOrder := "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END"
		if order == "desc" {
			priorityOrder = "CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END"
		}
		query = query.Order(priorityOrder)
	} else {
		query = query.Order(sortBy + " " + order)
	}

	var tasks []models.Task
	if err := query.Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tasks": tasks})
}

func CreateTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input CreateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	// Validate status
	status := "todo"
	if input.Status != "" {
		s := strings.ToLower(input.Status)
		if !validStatuses[s] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status. Must be: todo, in_progress, or done"})
			return
		}
		status = s
	}

	// Validate priority
	priority := "medium"
	if input.Priority != "" {
		p := strings.ToLower(input.Priority)
		if !validPriorities[p] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid priority. Must be: low, medium, or high"})
			return
		}
		priority = p
	}

	// Validate category
	category := "task"
	if input.Category != "" {
		cat := strings.ToLower(input.Category)
		if !validCategories[cat] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category. Must be: task, hobby, or event"})
			return
		}
		category = cat
	}

	task := models.Task{
		UserID:      userID,
		Title:       strings.TrimSpace(input.Title),
		Description: input.Description,
		Status:      status,
		Priority:    priority,
		Category:    category,
	}

	if input.DueDate != nil && *input.DueDate != "" {
		parsed, err := time.Parse("2006-01-02", *input.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due_date format. Use YYYY-MM-DD"})
			return
		}
		task.DueDate = &parsed
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"task": task})
}

func GetTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID := c.Param("id")

	parsedID, err := uuid.Parse(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task models.Task
	if err := database.DB.Where("id = ? AND user_id = ?", parsedID, userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"task": task})
}

func UpdateTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID := c.Param("id")

	parsedID, err := uuid.Parse(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task models.Task
	if err := database.DB.Where("id = ? AND user_id = ?", parsedID, userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var input UpdateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if input.Title != nil {
		trimmed := strings.TrimSpace(*input.Title)
		if trimmed == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Title cannot be empty"})
			return
		}
		task.Title = trimmed
	}

	if input.Description != nil {
		task.Description = input.Description
	}

	if input.Status != nil {
		s := strings.ToLower(*input.Status)
		if !validStatuses[s] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status. Must be: todo, in_progress, or done"})
			return
		}
		task.Status = s
	}

	if input.Priority != nil {
		p := strings.ToLower(*input.Priority)
		if !validPriorities[p] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid priority. Must be: low, medium, or high"})
			return
		}
		task.Priority = p
	}

	if input.Category != nil {
		cat := strings.ToLower(*input.Category)
		if !validCategories[cat] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category. Must be: task, hobby, or event"})
			return
		}
		task.Category = cat
	}

	if input.DueDate != nil {
		if *input.DueDate == "" {
			task.DueDate = nil
		} else {
			parsed, err := time.Parse("2006-01-02", *input.DueDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due_date format. Use YYYY-MM-DD"})
				return
			}
			task.DueDate = &parsed
		}
	}

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"task": task})
}

func DeleteTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID := c.Param("id")

	parsedID, err := uuid.Parse(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	result := database.DB.Where("id = ? AND user_id = ?", parsedID, userID).Delete(&models.Task{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete task"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
}
