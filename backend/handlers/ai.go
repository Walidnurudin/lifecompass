package handlers

import (
	"context"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type AIConsultRequest struct {
	Message string `json:"message"`
}

func ConsultAI(c *gin.Context) {
	var input AIConsultRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GEMINI_API_KEY not configured"})
		return
	}

	// Initialize the Google GenAI client
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize AI client"})
		return
	}
	defer client.Close()

	systemInstruction := "You are a highly motivating, energetic, and slightly demanding productivity coach. Your goal is to encourage the user to stay on track, complete their tasks, and achieve their financial goals. Be concise, direct, and focused on action. You can provide tough love if needed."

	model := client.GenerativeModel("gemini-1.5-flash")
	model.SystemInstruction = genai.NewUserContent(genai.Text(systemInstruction))

	resp, err := model.GenerateContent(ctx, genai.Text(input.Message))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate AI response: " + err.Error()})
		return
	}

	var replyText string
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			replyText = string(text)
		} else {
			replyText = "I received a non-text response. Keep pushing forward anyway!"
		}
	} else {
		replyText = "I couldn't generate a response. Keep pushing forward anyway!"
	}

	c.JSON(http.StatusOK, gin.H{"reply": replyText})
}
