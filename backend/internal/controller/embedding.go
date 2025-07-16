package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/Pranjal095/Memora/backend/internal/helpers"
	"github.com/gin-gonic/gin"
	exif "github.com/rwcarlsen/goexif/exif"
)

type nominatimResp struct {
	Address struct {
		City    string `json:"city"`
		Town    string `json:"town"`
		Village string `json:"village"`
	} `json:"address"`
}

func reverseGeocode(lat, lon float64) (string, error) {
	u := fmt.Sprintf(
		"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=%f&lon=%f",
		lat, lon,
	)
	resp, err := http.Get(u)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var nr nominatimResp
	if err := json.NewDecoder(resp.Body).Decode(&nr); err != nil {
		return "", err
	}
	if nr.Address.City != "" {
		return nr.Address.City, nil
	}
	if nr.Address.Town != "" {
		return nr.Address.Town, nil
	}
	return nr.Address.Village, nil
}

func SearchPhotos(c *gin.Context) {
	q := c.Query("q")
	k := c.DefaultQuery("k", "50")

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

func UploadAndEmbed(c *gin.Context) {
	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "must upload photo"})
		return
	}
	dst := fmt.Sprintf("/tmp/%d_%s", time.Now().UnixNano(), file.Filename)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file"})
		return
	}

	f, _ := os.Open(dst)
	x, _ := exif.Decode(f)
	f.Close()

	var city string
	if lat, lon, err := x.LatLong(); err == nil {
		city, _ = reverseGeocode(lat, lon)
	}

	id := time.Now().UnixNano()
	note := c.PostForm("note")
	if err := helpers.SendToEmbedService(
		c.Request.Context(),
		dst,
		note,
		city,
		id,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "queued",
		"id":     id,
		"city":   city,
	})
}
