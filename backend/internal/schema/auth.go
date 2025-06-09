package schema

// SignupRequest holds the JSON body for POST /signup
type SignupRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginRequest holds the JSON body for POST /login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse returns the JWT token
type AuthResponse struct {
	Token string `json:"token"`
}
