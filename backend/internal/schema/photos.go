package schema

type AddPhotoRequest struct {
	Note string `form:"note"`
}

type PhotoResponse struct {
	ID        int64   `json:"id"`
	URL       string  `json:"url"`
	Note      *string `json:"note,omitempty"`
	CreatedAt string  `json:"created_at"`
}
