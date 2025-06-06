package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type analyzeRequest struct {
	URL string `json:"url" binding:"required"`
}

type analyzeResponse struct {
	Probability float64 `json:"probability"`
	Label       string  `json:"label"`
}

func Analyze(c *gin.Context) {
	var req analyzeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. detect type (YouTube / Instagram / direct)
	// 2. run yt-dlp + ffmpeg via exec.Command → output.wav
	//    e.g. exec.Command("yt-dlp", "-x", "--audio-format", "wav", req.URL, "-o", "temp.%(ext)s")
	// 3. call external AI service:
	//    curl -F "file=@temp.wav" http://localhost:5000/detect-audio
	//
	// For now return a dummy:
	res := analyzeResponse{
		Probability: 0.42,
		Label:       "human",
	}
	c.JSON(http.StatusOK, res)
}
