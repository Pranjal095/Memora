package controller

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/gin-gonic/gin"
)

func SearchPhotos(c *gin.Context) {
	q := c.Query("q")
	k := c.DefaultQuery("k", "10")

	svc := os.Getenv("EMBEDDING_SERVICE_URL")
	if svc == "" {
		svc = "http://localhost:5000"
	}

	encodedQ := url.QueryEscape(q)
	reqURL := fmt.Sprintf("%s/search?q=%s&k=%s", svc, encodedQ, k)

	resp, err := http.Get(reqURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	c.Data(resp.StatusCode, "application/json", body)
}
