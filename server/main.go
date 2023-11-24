package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type ConnectionUser struct {
	Connection *websocket.Conn
	Username   string
	Room       string
}

var (
	connections = make(map[ConnectionUser]bool)
	//This mutex locks everything insode this code block
	connectionsMutex sync.Mutex
	upgrader         = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}

	username := c.Query("username")
	room := c.Query("room")

	cUser := ConnectionUser{
		Connection: conn,
		Username:   username,
		Room:       room,
	}

	connectionsMutex.Lock()
	connections[cUser] = true
	connectionsMutex.Unlock()

	defer func() {
		conn.Close()

		connectionsMutex.Lock()
		delete(connections, cUser)
		connectionsMutex.Unlock()
	}()

	for {
		// Read message from the WebSocket client
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		broadcastMessage(messageType, p, room)
	}
}

func broadcastMessage(messageType int, message []byte, room string) {
	connectionsMutex.Lock()
	defer connectionsMutex.Unlock()

	for cUser := range connections {
		if cUser.Room == room { // need to select the correct room
			err := cUser.Connection.WriteMessage(messageType, message)
			if err != nil {
				fmt.Printf(cUser.Room)
				log.Println(err)
				connectionsMutex.Lock()
				delete(connections, cUser)
				connectionsMutex.Unlock()
				cUser.Connection.Close()
				continue
			}
		}

	}
}

func main() {
	r := gin.Default()
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}
	r.Use(cors.New(config))

	r.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello, Gin!")
	})

	r.GET("/upgrade", handleWebSocket)

	r.Run(":80")
}