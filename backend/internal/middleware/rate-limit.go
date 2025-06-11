package middleware

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

var (
	visitors   = make(map[string]*rate.Limiter)
	visitorsMu sync.Mutex
	r          = rate.Limit(1)
	b          = 3
)

func getVisitor(ip string) *rate.Limiter {
	visitorsMu.Lock()
	defer visitorsMu.Unlock()

	if lim, exists := visitors[ip]; exists {
		return lim
	}
	lim := rate.NewLimiter(r, b)
	visitors[ip] = lim
	return lim
}

func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := getVisitor(ip)
		if !limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, slow down",
			})
			return
		}
		c.Next()
	}
}
