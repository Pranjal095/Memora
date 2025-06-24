package controller

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/Pranjal095/Memora/backend/config"
	"github.com/Pranjal095/Memora/backend/internal/schema"
	"github.com/gin-gonic/gin"
)

func AddPhoto(c *gin.Context) {
	userID := c.GetString("userID")
	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "photo file is required"})
		return
	}
	os.MkdirAll("uploads", 0755)
	dst := filepath.Join("uploads", fmt.Sprintf("%d_%s_%s", time.Now().UnixNano(), userID, file.Filename))
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file"})
		return
	}
	note := c.PostForm("note")
	var id int64
	err = config.DB.QueryRow(
		context.Background(),
		`INSERT INTO photos(user_id,url,note) VALUES($1,$2,$3) RETURNING id`,
		userID, "/"+dst, note,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save metadata"})
		return
	}
	c.JSON(http.StatusCreated, schema.PhotoResponse{
		ID:        id,
		URL:       c.Request.Host + "/" + dst,
		Note:      &note,
		CreatedAt: time.Now().Format(time.RFC3339),
	})
}

func ListPhotos(c *gin.Context) {
	userID := c.GetString("userID")
	rows, err := config.DB.Query(context.Background(),
		`SELECT id,url,note,created_at FROM photos WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not query"})
		return
	}
	defer rows.Close()
	var photos []schema.PhotoResponse
	for rows.Next() {
		var p schema.PhotoResponse
		rows.Scan(&p.ID, &p.URL, &p.Note, &p.CreatedAt)
		photos = append(photos, p)
	}
	c.JSON(http.StatusOK, photos)
}
