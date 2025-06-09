package helpers

import (
    "context"
    "fmt"
    "time"

    "github.com/golang-jwt/jwt"
    "golang.org/x/crypto/bcrypt"

    "github.com/Pranjal095/EchoCast/backend/config"
)

var jwtKey = []byte("replace_with_secure_secret")

// CreateUser hashes the password and inserts a new user.
func CreateUser(c context.Context, email, password string) error {
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return fmt.Errorf("hash password: %w", err)
    }
    _, err = config.DB.Exec(c,
        "INSERT INTO users(email,password) VALUES($1,$2)", email, string(hash))
    return err
}

// AuthenticateUser checks credentials and returns the user ID.
func AuthenticateUser(c context.Context, email, password string) (int, error) {
    var (
        id    int
        hash  string
    )
    err := config.DB.QueryRow(c,
        "SELECT id,password FROM users WHERE email=$1", email).
        Scan(&id, &hash)
    if err != nil {
        return 0, fmt.Errorf("no such user")
    }
    if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
        return 0, fmt.Errorf("invalid credentials")
    }
    return id, nil
}

// GenerateJWT issues a token for the given user ID.
func GenerateJWT(userID int) (string, error) {
    exp := time.Now().Add(24 * time.Hour)
    claims := jwt.StandardClaims{
        Subject:   fmt.Sprint(userID),
        ExpiresAt: exp.Unix(),
    }
    return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtKey)
}