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

type CreateCashFlowInput struct {
	Title       string  `json:"title" binding:"required"`
	Type        string  `json:"type" binding:"required"`
	Category    string  `json:"category" binding:"required"`
	Amount      float64 `json:"amount" binding:"required"`
	Description *string `json:"description"`
	Date        *string `json:"date"`
}

type UpdateCashFlowInput struct {
	Title       *string  `json:"title"`
	Type        *string  `json:"type"`
	Category    *string  `json:"category"`
	Amount      *float64 `json:"amount"`
	Description *string  `json:"description"`
	Date        *string  `json:"date"`
}

var validTypes = map[string]bool{"income": true, "outcome": true}
var validIncomeCategories = map[string]bool{"salary": true, "business": true, "other": true}
var validOutcomeCategories = map[string]bool{
	"snacks":         true,
	"food":           true,
	"internet":       true,
	"transportation": true,
	"shopping":       true,
	"toiletries":     true,
	"other":          true,
}

func GetCashFlows(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	query := database.DB.Where("user_id = ?", userID)

	// Month / Year filtering for the dashboard
	if month := c.Query("month"); month != "" {
		if year := c.Query("year"); year != "" {
			// Basic approach: date >= YYYY-MM-01 AND date < YYYY-(MM+1)-01
			startDateStr := year + "-" + month + "-01"
			startDate, err := time.Parse("2006-01-02", startDateStr)
			if err == nil {
				endDate := startDate.AddDate(0, 1, 0)
				query = query.Where("date >= ? AND date < ?", startDate, endDate)
			}
		}
	}

	// Sorting
	sortBy := c.DefaultQuery("sort_by", "date")
	order := c.DefaultQuery("order", "desc")

	allowedSorts := map[string]bool{
		"date":       true,
		"created_at": true,
		"title":      true,
		"amount":     true,
		"category":   true,
		"type":       true,
	}

	if !allowedSorts[sortBy] {
		sortBy = "date"
	}
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	query = query.Order(sortBy + " " + order)

	var list []models.CashFlow
	if err := query.Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cash flow entries"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"cash_flows": list})
}

func CreateCashFlow(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input CreateCashFlowInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	cfType := strings.ToLower(input.Type)
	if !validTypes[cfType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid type. Must be: income or outcome"})
		return
	}

	category := strings.ToLower(input.Category)
	if cfType == "income" && !validIncomeCategories[category] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid income category"})
		return
	}
	if cfType == "outcome" && !validOutcomeCategories[category] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid outcome category"})
		return
	}

	cf := models.CashFlow{
		UserID:      userID,
		Title:       strings.TrimSpace(input.Title),
		Type:        cfType,
		Category:    category,
		Amount:      input.Amount,
		Description: input.Description,
	}

	if input.Date != nil && *input.Date != "" {
		parsed, err := time.Parse("2006-01-02", *input.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
		cf.Date = &parsed
	} else {
		// default to today
		now := time.Now()
		cf.Date = &now
	}

	if err := database.DB.Create(&cf).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create entry"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"cash_flow": cf})
}

func UpdateCashFlow(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	cfID := c.Param("id")

	parsedID, err := uuid.Parse(cfID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cash flow ID"})
		return
	}

	var cf models.CashFlow
	if err := database.DB.Where("id = ? AND user_id = ?", parsedID, userID).First(&cf).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entry not found"})
		return
	}

	var input UpdateCashFlowInput
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
		cf.Title = trimmed
	}

	// If type is updated, validate it
	if input.Type != nil {
		cfType := strings.ToLower(*input.Type)
		if !validTypes[cfType] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid type"})
			return
		}
		cf.Type = cfType
	}

	// Verify category against the (potentially new) type
	if input.Category != nil {
		cat := strings.ToLower(*input.Category)
		if cf.Type == "income" && !validIncomeCategories[cat] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid income category"})
			return
		}
		if cf.Type == "outcome" && !validOutcomeCategories[cat] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid outcome category"})
			return
		}
		cf.Category = cat
	}

	if input.Amount != nil {
		cf.Amount = *input.Amount
	}

	if input.Description != nil {
		cf.Description = input.Description
	}

	if input.Date != nil {
		if *input.Date == "" {
			cf.Date = nil
		} else {
			parsed, err := time.Parse("2006-01-02", *input.Date)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
				return
			}
			cf.Date = &parsed
		}
	}

	if err := database.DB.Save(&cf).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"cash_flow": cf})
}

func DeleteCashFlow(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	cfID := c.Param("id")

	parsedID, err := uuid.Parse(cfID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cash flow ID"})
		return
	}

	result := database.DB.Where("id = ? AND user_id = ?", parsedID, userID).Delete(&models.CashFlow{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete entry"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entry not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Entry deleted successfully"})
}
