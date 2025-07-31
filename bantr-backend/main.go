package main

import (
    "github.com/gin-gonic/gin"
    "log"
    "os"
)

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    router := gin.Default()

    router.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "message": "Bantr backend running!",
        })
    })

    log.Println("Server running on port", port)
    router.Run(":" + port)
}
