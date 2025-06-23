package controller

import (
	"net/http"

	"github.com/Pranjal095/Memora/backend/internal/helpers"
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

	res, err := helpers.AnalyzeURL(c.Request.Context(), req.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, analyzeResponse{
		Probability: res.Probability,
		Label:       res.Label,
	})
}
