package controller

import (
    "context"
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/Pranjal095/EchoCast/backend/internal/helpers"
    "github.com/Pranjal095/EchoCast/backend/internal/schema"
)

func Signup(c *gin.Context) {
    var req schema.SignupRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    if err := helpers.CreateUser(context.Background(), req.Email, req.Password); err != nil {
        if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
            c.JSON(http.StatusConflict, gin.H{"error": "email already in use"})
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "server error"})
        }
        return
    }
    c.JSON(http.StatusCreated, gin.H{"message": "user created"})
}

func Login(c *gin.Context) {
    var req schema.LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    userID, err := helpers.AuthenticateUser(context.Background(), req.Email, req.Password)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
        return
    }
    token, err := helpers.GenerateJWT(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create token"})
        return
    }
    c.JSON(http.StatusOK, schema.AuthResponse{Token: token})
}