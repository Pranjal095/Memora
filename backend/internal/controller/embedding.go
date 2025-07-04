package controller

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

func SearchPhotos(c *gin.Context) {
	q := c.Query("q")
	k := c.DefaultQuery("k", "10")
	resp, err := http.Get("http://localhost:5000/search?q=" + q + "&k=" + k)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	c.Data(resp.StatusCode, "application/json", body)
}
