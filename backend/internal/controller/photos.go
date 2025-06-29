package controller

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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
		userID, dst, note,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save metadata"})
		return
	}

	protocol := "http"
	if c.Request.TLS != nil {
		protocol = "https"
	}
	fullURL := fmt.Sprintf("%s://%s/%s", protocol, c.Request.Host, dst)

	c.JSON(http.StatusCreated, schema.PhotoResponse{
		ID:        id,
		URL:       fullURL,
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

	protocol := "http"
	if c.Request.TLS != nil {
		protocol = "https"
	}
	baseURL := fmt.Sprintf("%s://%s", protocol, c.Request.Host)

	var photos []schema.PhotoResponse
	for rows.Next() {
		var p schema.PhotoResponse
		var note sql.NullString
		var createdAt time.Time

		err := rows.Scan(&p.ID, &p.URL, &note, &createdAt)
		if err != nil {
			continue
		}

		if note.Valid {
			p.Note = &note.String
		}

		p.CreatedAt = createdAt.Format(time.RFC3339)

		if !strings.HasPrefix(p.URL, "http") {
			p.URL = baseURL + "/" + p.URL
		}
		photos = append(photos, p)
	}

	if err = rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading photos"})
		return
	}

	c.JSON(http.StatusOK, photos)
}
