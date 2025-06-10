package helpers

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt"
	"golang.org/x/crypto/bcrypt"

	"github.com/Pranjal095/EchoCast/backend/config"
)

var jwtKey = []byte(os.Getenv("JWT_SECRET"))

type User struct {
	ID    int
	Email string
}

func GetUserByUsername(ctx context.Context, username string) (*User, error) {
	var u User
	err := config.DB.QueryRow(ctx,
		"SELECT id, email FROM users WHERE username=$1", username).
		Scan(&u.ID, &u.Email)
	if err != nil {
		return nil, fmt.Errorf("lookup user: %w", err)
	}
	return &u, nil
}

func CreateUser(c context.Context, username, email, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	_, err = config.DB.Exec(c,
		"INSERT INTO users(username,email,password) VALUES($1,$2,$3)",
		username, email, string(hash))
	return err
}

func AuthenticateUser(c context.Context, username, password string) (int, error) {
	var (
		id   int
		hash string
	)
	err := config.DB.QueryRow(c,
		"SELECT id,password FROM users WHERE username=$1", username).
		Scan(&id, &hash)
	if err != nil {
		return 0, fmt.Errorf("no such user")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return 0, fmt.Errorf("invalid credentials")
	}
	return id, nil
}

func GenerateJWT(userID int) (string, error) {
	exp := time.Now().Add(7 * 24 * time.Hour)
	claims := jwt.StandardClaims{
		Subject:   fmt.Sprint(userID),
		ExpiresAt: exp.Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtKey)
}
