package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func home(c *gin.Context) {
	HTMLString := "<h1>Hello from Spidey</h1>"
	c.Writer.WriteHeader(http.StatusOK)

	c.Writer.Write([]byte(HTMLString))
}

func SetupRoutes(router *gin.Engine) {
	router.GET("/", home)
}
