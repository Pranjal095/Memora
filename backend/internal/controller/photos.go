package controller

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/Pranjal095/Memora/backend/internal/helpers"
	"github.com/Pranjal095/Memora/backend/internal/schema"
	"github.com/gin-gonic/gin"
	exif "github.com/rwcarlsen/goexif/exif"
)

func AddPhoto(c *gin.Context) {
	userID := c.GetString("userID")
	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "photo file is required"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not read file"})
		return
	}
	defer src.Close()

	fileContent, err := io.ReadAll(src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not read file content"})
		return
	}

	dst, err := helpers.SavePhotoFile(file.Filename, userID, fileContent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file"})
		return
	}

	note := c.PostForm("note")

	id, err := helpers.CreatePhotoRecord(context.Background(), userID, dst, note)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save metadata"})
		return
	}

	var city string
	if f, err := os.Open(dst); err == nil {
		if x, err := exif.Decode(f); err == nil {
			if lat, lon, err := x.LatLong(); err == nil {
				city, _ = reverseGeocode(lat, lon)
			}
		}
		f.Close()
	}

	protocol := "http"
	if c.Request.TLS != nil {
		protocol = "https"
	}
	fullURL := fmt.Sprintf("%s://%s/%s", protocol, c.Request.Host, dst)

	go func() {
		_ = helpers.SendToEmbedService(
			context.Background(),
			fullURL,
			note,
			city,
			id,
		)
	}()

	c.JSON(http.StatusCreated, schema.PhotoResponse{
		ID:        id,
		URL:       fullURL,
		Note:      &note,
		CreatedAt: time.Now().Format(time.RFC3339),
	})
}

func ListPhotos(c *gin.Context) {
	userID := c.GetString("userID")

	photos, err := helpers.GetUserPhotos(context.Background(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not query photos"})
		return
	}

	protocol := "http"
	if c.Request.TLS != nil {
		protocol = "https"
	}
	baseURL := fmt.Sprintf("%s://%s", protocol, c.Request.Host)

	for i := range photos {
		photos[i].URL = helpers.BuildFullURL(baseURL, photos[i].URL)
	}

	c.JSON(http.StatusOK, photos)
}
