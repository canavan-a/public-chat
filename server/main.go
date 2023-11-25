package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"slices"
	"strings"
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
	homeConnections = make(map[*websocket.Conn]bool)

	connections = make(map[*ConnectionUser]bool)
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

	if len(username) == 0 || username == "null" {
		conn.Close()
		return
	}
	if len(room) == 0 || room == "null" {
		conn.Close()
		return
	}

	cUser := ConnectionUser{
		Connection: conn,
		Username:   username,
		Room:       room,
	}
	// need to check if there is currently a user so we dont have

	for cUser := range connections {

		if cUser.Username == username && cUser.Room == room {
			fmt.Println("closed due to condition")
			conn.Close()
			return
		}
	}

	connectionsMutex.Lock()
	connections[&cUser] = true
	connectionsMutex.Unlock()

	// publish rooms to all home screen connections
	for hc := range homeConnections {
		broadcastRooms(hc)
	}

	defer func() {
		conn.Close()

		connectionsMutex.Lock()
		delete(connections, &cUser)
		connectionsMutex.Unlock()
		// broadcast all home screen conns when someone disconnects
		for hc := range homeConnections {
			broadcastRooms(hc)
		}
	}()

	for {
		// Read message from the WebSocket client
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		broadcastMessage(messageType, p, room, username)
	}
}

type Message struct {
	Msg      string `json:"msg"`
	Username string `json:"username"`
}

func broadcastMessage(messageType int, message []byte, room string, username string) {
	connectionsMutex.Lock()
	defer connectionsMutex.Unlock()

	currentMessage := Message{
		Msg:      string(message),
		Username: username,
	}

	jsonData, err := json.Marshal(currentMessage)
	if err != nil {
		log.Println(err)
		return
	}

	for cUser := range connections {
		if cUser.Room == room { // need to select the correct room
			err := cUser.Connection.WriteMessage(messageType, jsonData)
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

func handleHomeSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}

	connectionsMutex.Lock()
	homeConnections[conn] = true
	connectionsMutex.Unlock()

	broadcastRooms(conn)

	defer func() {
		conn.Close()

		connectionsMutex.Lock()
		delete(homeConnections, conn)
		connectionsMutex.Unlock()
	}()

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}
		fmt.Println(messageType, p)
	}

}

func broadcastRooms(myc *websocket.Conn) {
	stringList := ("['" + strings.Join(allRooms(), "','") + "']")
	message := []byte(strings.Replace(stringList, "''", "", 1))
	myc.WriteMessage(websocket.TextMessage, message)
}

func allRooms() []string {
	rooms := []string{}
	for cUser := range connections {
		if !slices.Contains(rooms, cUser.Username) {
			rooms = append(rooms, cUser.Room)
		}
	}
	return rooms
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}
	r.Use(cors.New(config))

	r.LoadHTMLGlob("templates/*")

	r.Static("/assets", "./assets")

	// r.GET("/", func(c *gin.Context) {
	// 	c.String(http.StatusOK, "Server is running.")
	// })

	r.GET("/upgrade", handleWebSocket)
	r.GET("/rooms", handleHomeSocket)

	r.NoRoute(func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	fmt.Println("server is running")

	r.Run(":80")
}
