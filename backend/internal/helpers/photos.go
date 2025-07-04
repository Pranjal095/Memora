package helpers

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Pranjal095/Memora/backend/config"
	"github.com/Pranjal095/Memora/backend/internal/schema"
)

func SavePhotoFile(filename, userID string, file []byte) (string, error) {
	if err := os.MkdirAll("uploads", 0755); err != nil {
		return "", fmt.Errorf("failed to create uploads directory: %w", err)
	}

	dst := filepath.Join("uploads", fmt.Sprintf("%d_%s_%s", time.Now().UnixNano(), userID, filename))

	if err := os.WriteFile(dst, file, 0644); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return dst, nil
}

func CreatePhotoRecord(ctx context.Context, userID, url, note string) (int64, error) {
	var id int64
	err := config.DB.QueryRow(
		ctx,
		`INSERT INTO photos(user_id,url,note) VALUES($1,$2,$3) RETURNING id`,
		userID, url, note,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("failed to create photo record: %w", err)
	}
	return id, nil
}

func GetUserPhotos(ctx context.Context, userID string) ([]schema.PhotoResponse, error) {
	rows, err := config.DB.Query(ctx,
		`SELECT id,url,note,created_at FROM photos WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query photos: %w", err)
	}
	defer rows.Close()

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
		photos = append(photos, p)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading photos: %w", err)
	}

	return photos, nil
}

func BuildFullURL(baseURL, path string) string {
	if strings.HasPrefix(path, "http") {
		return path
	}
	return baseURL + "/" + path
}
