package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Task struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	Title       string     `gorm:"not null" json:"title"`
	Description *string    `json:"description"`
	Status      string     `gorm:"not null;default:'todo'" json:"status"`
	DueDate     *time.Time `json:"due_date"`
	Priority    string     `gorm:"not null;default:'medium'" json:"priority"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (t *Task) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	if t.Status == "" {
		t.Status = "todo"
	}
	if t.Priority == "" {
		t.Priority = "medium"
	}
	return nil
}
