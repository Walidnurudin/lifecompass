package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CashFlow struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	Title       string     `gorm:"not null" json:"title"`
	Type        string     `gorm:"not null" json:"type"`     // "income" or "outcome"
	Category    string     `gorm:"not null" json:"category"` // "food", "salary", etc.
	Amount      float64    `gorm:"not null" json:"amount"`
	Description *string    `json:"description"`
	Date        *time.Time `json:"date"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (c *CashFlow) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
