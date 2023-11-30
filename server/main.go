package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"slices"
	"sync"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
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
	// publish connection msg to room
	broadcastMessage(websocket.TextMessage, nil, room, username, "entering")

	defer func() {

		conn.Close()
		connectionsMutex.Lock()
		delete(connections, &cUser)
		connectionsMutex.Unlock()
		// broadcast all home screen conns when someone disconnects
		for hc := range homeConnections {
			broadcastRooms(hc)
		}
		broadcastMessage(websocket.TextMessage, nil, room, username, "leaving")
	}()

	for {
		// Read message from the WebSocket client
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		broadcastMessage(messageType, p, room, username, "chat")
	}
}

type Message struct {
	Msg        string `json:"msg"`
	Username   string `json:"username"`
	Conclusion string `json:"conclusion"`
}

func broadcastMessage(messageType int, message []byte, room string, username string, messageConclusion string) {
	connectionsMutex.Lock()
	defer connectionsMutex.Unlock()

	currentMessage := Message{
		Msg:        string(message),
		Username:   username,
		Conclusion: messageConclusion,
	}

	jsonData, err := json.Marshal(currentMessage)
	if err != nil {
		log.Println(err)
		return
	}

	// send msg to database
	go insertMsg(room, jsonData)
	// err = insertMsg(room, jsonData)
	// if err != nil {
	// 	log.Println(err)
	// 	return
	// }

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
	rooms := allRooms()
	jsonString, err := json.Marshal(rooms)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(jsonString)

	err = myc.WriteMessage(websocket.TextMessage, jsonString)
	if err != nil {
		connectionsMutex.Lock()
		delete(homeConnections, myc)
		connectionsMutex.Unlock()
	}
}

func allRooms() []string {
	rooms := []string{}
	for cUser := range connections {
		if !slices.Contains(rooms, cUser.Room) {
			rooms = append(rooms, cUser.Room)
		}
	}
	return rooms
}

func main() {

	if err := godotenv.Load(); err != nil {
		fmt.Println("Error loading .env file")
	}

	gin.SetMode(gin.ReleaseMode)

	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}
	r.Use(cors.New(config))

	r.LoadHTMLGlob("templates/*")

	r.Static("/assets", "./assets")

	r.GET("/upgrade", handleWebSocket)
	r.GET("/rooms", handleHomeSocket)
	r.GET("/chatlog", handleChatlog)

	r.NoRoute(func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	fmt.Println("server is running")

	r.Run(":80")
}

func handleChatlog(c *gin.Context) {
	room := c.Query("r")
	fmt.Println(room)
	if room == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no query param"})
	}

	connectionString := os.Getenv("POSTGRES_CONN_STR")

	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT msg FROM chatlog WHERE room = $1 ORDER BY msg_time ASC LIMIT 50;", room)
	if err != nil {
		fmt.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query error"})
		return
	}
	defer rows.Close()

	// Slice to store the messages
	var messages []json.RawMessage

	// Iterate through rows and append raw JSON messages to the array
	for rows.Next() {
		var msgJSON json.RawMessage
		err := rows.Scan(&msgJSON)
		if err != nil {
			fmt.Println(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		messages = append(messages, msgJSON)
	}

	// Check for errors from iterating over rows
	if err := rows.Err(); err != nil {
		fmt.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// Send the JSON array of raw messages in the response
	c.JSON(http.StatusOK, messages)

}

func insertMsg(room string, msg []byte) error {

	connectionString := os.Getenv("POSTGRES_CONN_STR")

	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return err
	}
	defer db.Close()

	rows, err := db.Query("INSERT INTO chatlog (room, msg) VALUES ($1, $2)", room, msg)
	if err != nil {
		fmt.Println(err)
		return err
	}
	defer rows.Close()

	return nil

}
