package router

import (
	"net/http"

	"github.com/Pranjal095/Memora/backend/internal/controller"
	"github.com/Pranjal095/Memora/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func home(c *gin.Context) {
	HTMLString := "<h1>Hello from Spidey</h1>"
	c.Writer.WriteHeader(http.StatusOK)

	c.Writer.Write([]byte(HTMLString))
}

func SetupRoutes(router *gin.Engine) {
	router.GET("/", home)
	router.POST("/signup", middleware.RateLimitMiddleware(), controller.Signup)
	router.POST("/login", middleware.RateLimitMiddleware(), controller.Login)
	router.POST("2fa/setup", middleware.RateLimitMiddleware(), controller.Setup2FA)
	router.POST("2fa/verify", middleware.RateLimitMiddleware(), controller.Verify2FA)
	router.POST("/photos", middleware.AuthMiddleware(), controller.AddPhoto)
	router.GET("/photos", middleware.AuthMiddleware(), controller.ListPhotos)
}
