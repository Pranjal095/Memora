package helpers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type embedRequest struct {
	ImagePath string `json:"image_path"`
	Note      string `json:"note"`
	City      string `json:"city"`
	ID        int64  `json:"id"`
}

func SendToEmbedService(c context.Context, imgPath, note, city string, id int64) error {
	req := embedRequest{
		ImagePath: imgPath,
		Note:      note,
		City:      city,
		ID:        id,
	}
	b, _ := json.Marshal(req)
	client := &http.Client{Timeout: 2 * time.Minute}
	resp, err := client.Post("http://localhost:5000/embed", "application/json", bytes.NewReader(b))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("embed service error: %s", resp.Status)
	}
	return nil
}
