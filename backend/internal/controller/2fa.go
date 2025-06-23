package controller

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Pranjal095/Memora/backend/internal/helpers"
)

var rng = rand.New(rand.NewSource(time.Now().UnixNano()))

type otpEntry struct {
	Code      string
	ExpiresAt time.Time
}

var otpStore = make(map[string]otpEntry)

func Setup2FA(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "username is required"})
		return
	}

	user, err := helpers.GetUserByUsername(c.Request.Context(), req.Username)
	if err != nil {
		c.JSON(404, gin.H{"error": "user not found"})
		return
	}

	code := fmt.Sprintf("%06d", rng.Intn(1_000_000))
	otpStore[req.Username] = otpEntry{
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	if err := helpers.SendOTPEmail(user.Email, code); err != nil {
		c.JSON(500, gin.H{"error": "failed to send OTP"})
		return
	}

	c.JSON(200, gin.H{"message": "OTP sent"})
}

func Verify2FA(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Code     string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "code is required"})
		return
	}

	entry, ok := otpStore[req.Username]
	if !ok || entry.Code != req.Code || time.Now().After(entry.ExpiresAt) {
		c.JSON(401, gin.H{"error": "invalid or expired code"})
		return
	}
	delete(otpStore, req.Username)

	user, err := helpers.GetUserByUsername(c.Request.Context(), req.Username)
	if err != nil {
		c.JSON(500, gin.H{"error": "could not find user"})
		return
	}

	token, err := helpers.GenerateJWT(user.ID)
	if err != nil {
		c.JSON(500, gin.H{"error": "could not generate token"})
		return
	}

	c.JSON(200, gin.H{"token": token})
}
