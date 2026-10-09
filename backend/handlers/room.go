package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"chudadi/backend/db"
	"chudadi/backend/models"
)

type RoomHandler struct {
	store *db.Store
	mu    sync.RWMutex
	rooms map[string]*models.RoomRecord
}

func NewRoomHandler(store *db.Store) *RoomHandler {
	rh := &RoomHandler{
		store: store,
		rooms: make(map[string]*models.RoomRecord),
	}

	// Background cleaner for stale rooms older than 6 hours
	go func() {
		ticker := time.NewTicker(30 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			rh.cleanupStaleRooms()
		}
	}()

	return rh
}

func (rh *RoomHandler) cleanupStaleRooms() {
	rh.mu.Lock()
	defer rh.mu.Unlock()
	now := time.Now().UnixMilli()
	maxAge := int64(6 * 3600 * 1000)
	for code, r := range rh.rooms {
		if now-r.CreatedAt > maxAge {
			delete(rh.rooms, code)
		}
	}
}

func (rh *RoomHandler) generateCode() string {
	for {
		code := fmt.Sprintf("%06d", rand.Intn(900000)+100000)
		if _, exists := rh.rooms[code]; !exists {
			return code
		}
	}
}

func (rh *RoomHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Mode         string `json:"mode"`
		RoomName     string `json:"roomName"`
		BaseScore    int64  `json:"baseScore"`
		EntryMin     int64  `json:"entryMin"`
		HostName     string `json:"hostName"`
		HostPhone    string `json:"hostPhone"`
		Avatar       string `json:"avatar"`
		IsPrivate    bool   `json:"isPrivate"`
		Passcode     string `json:"passcode"`
		AllowBotFill *bool  `json:"allowBotFill"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"请求参数错误"}`, http.StatusBadRequest)
		return
	}

	rh.mu.Lock()
	defer rh.mu.Unlock()

	code := rh.generateCode()
	mode := "room-chudadi"
	if body.Mode == "room-yansan" {
		mode = "room-yansan"
	}

	roomName := body.RoomName
	if roomName == "" {
		if mode == "room-yansan" {
			roomName = "🔥 烟三火爆房"
		} else {
			roomName = "♠️ 锄大地好友场"
		}
	}

	baseScore := body.BaseScore
	if baseScore <= 0 {
		if mode == "room-yansan" {
			baseScore = 2000
		} else {
			baseScore = 1000
		}
	}

	entryMin := body.EntryMin
	if entryMin <= 0 {
		if mode == "room-yansan" {
			entryMin = 2000
		} else {
			entryMin = 100
		}
	}

	hostName := body.HostName
	if hostName == "" {
		hostName = "房主"
	}

	avatar := body.Avatar
	if avatar == "" {
		avatar = "😎"
	}

	allowBot := true
	if body.AllowBotFill != nil {
		allowBot = *body.AllowBotFill
	}

	room := &models.RoomRecord{
		Code:         code,
		Mode:         mode,
		RoomName:     roomName,
		BaseScore:    baseScore,
		EntryMin:     entryMin,
		HostName:     hostName,
		HostPhone:    body.HostPhone,
		IsPrivate:    body.IsPrivate,
		Passcode:     body.Passcode,
		AllowBotFill: allowBot,
		Seats: []models.RoomSeat{
			{Position: "bottom", PlayerName: hostName, Avatar: avatar, IsHost: true, IsAI: false, Ready: true, Phone: body.HostPhone},
			{Position: "left", PlayerName: "空位", Avatar: "❓", IsHost: false, IsAI: false, Ready: false},
			{Position: "top", PlayerName: "空位", Avatar: "❓", IsHost: false, IsAI: false, Ready: false},
			{Position: "right", PlayerName: "空位", Avatar: "❓", IsHost: false, IsAI: false, Ready: false},
		},
		CreatedAt: time.Now().UnixMilli(),
		Status:    "WAITING",
	}

	rh.rooms[code] = room
	rh.store.AddLog("ROOM_CREATE", fmt.Sprintf("创建房间 [%s]: %s (房主: %s)", code, roomName, hostName))

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"room":    room,
	})
}

func (rh *RoomHandler) ListRooms(w http.ResponseWriter, r *http.Request) {
	rh.mu.RLock()
	defer rh.mu.RUnlock()

	var list []*models.RoomRecord
	for _, room := range rh.rooms {
		if room.Status == "WAITING" {
			list = append(list, room)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"rooms":   list,
	})
}

func (rh *RoomHandler) GetRoom(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/rooms/get/")
	code := strings.TrimSpace(path)

	rh.mu.RLock()
	room, exists := rh.rooms[code]
	rh.mu.RUnlock()

	if !exists {
		http.Error(w, `{"error":"未找到该房号对应的房间，请检查 6 位房号"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"room":    room,
	})
}

func (rh *RoomHandler) JoinRoom(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Code       string `json:"code"`
		PlayerName string `json:"playerName"`
		Avatar     string `json:"avatar"`
		Phone      string `json:"phone"`
		Passcode   string `json:"passcode"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"请求参数错误"}`, http.StatusBadRequest)
		return
	}

	cleanCode := strings.TrimSpace(body.Code)

	rh.mu.Lock()
	defer rh.mu.Unlock()

	room, exists := rh.rooms[cleanCode]
	if !exists {
		http.Error(w, `{"error":"房号不存在，请核对 6 位数字房号"}`, http.StatusNotFound)
		return
	}

	if room.Status != "WAITING" {
		http.Error(w, `{"error":"该房间对局已开始或已关闭"}`, http.StatusBadRequest)
		return
	}

	if room.IsPrivate && room.Passcode != "" && room.Passcode != strings.TrimSpace(body.Passcode) {
		http.Error(w, `{"error":"房间密码不正确"}`, http.StatusForbidden)
		return
	}

	// Find empty seat
	emptyIdx := -1
	for idx, s := range room.Seats {
		if s.PlayerName == "空位" || (!s.IsHost && s.IsAI) {
			emptyIdx = idx
			break
		}
	}

	if emptyIdx == -1 {
		http.Error(w, `{"error":"房间玩家已满 4 人"}`, http.StatusBadRequest)
		return
	}

	positions := []string{"bottom", "left", "top", "right"}
	name := body.PlayerName
	if name == "" {
		name = "玩家"
	}
	avatar := body.Avatar
	if avatar == "" {
		avatar = "🤠"
	}

	room.Seats[emptyIdx] = models.RoomSeat{
		Position:   positions[emptyIdx],
		PlayerName: name,
		Avatar:     avatar,
		IsHost:     false,
		IsAI:       false,
		Ready:      true,
		Phone:      body.Phone,
	}

	rh.store.AddLog("ROOM_JOIN", fmt.Sprintf("加入房间 [%s]: %s", cleanCode, name))

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"room":    room,
	})
}

func (rh *RoomHandler) AddBot(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Code      string `json:"code"`
		SeatIndex int    `json:"seatIndex"`
		BotName   string `json:"botName"`
		Avatar    string `json:"avatar"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"参数错误"}`, http.StatusBadRequest)
		return
	}

	rh.mu.Lock()
	defer rh.mu.Unlock()

	room, exists := rh.rooms[strings.TrimSpace(body.Code)]
	if !exists {
		http.Error(w, `{"error":"房间不存在"}`, http.StatusNotFound)
		return
	}

	idx := body.SeatIndex
	if idx < 1 || idx > 3 {
		http.Error(w, `{"error":"无效座位"}`, http.StatusBadRequest)
		return
	}

	positions := []string{"bottom", "left", "top", "right"}
	botName := body.BotName
	if botName == "" {
		botName = fmt.Sprintf("电脑·人偶%d", idx)
	}
	avatar := body.Avatar
	if avatar == "" {
		avatar = "🤖"
	}

	room.Seats[idx] = models.RoomSeat{
		Position:   positions[idx],
		PlayerName: botName,
		Avatar:     avatar,
		IsHost:     false,
		IsAI:       true,
		Ready:      true,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"room":    room,
	})
}

func (rh *RoomHandler) KickSeat(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Code      string `json:"code"`
		SeatIndex int    `json:"seatIndex"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"参数错误"}`, http.StatusBadRequest)
		return
	}

	rh.mu.Lock()
	defer rh.mu.Unlock()

	room, exists := rh.rooms[strings.TrimSpace(body.Code)]
	if !exists {
		http.Error(w, `{"error":"房间不存在"}`, http.StatusNotFound)
		return
	}

	idx := body.SeatIndex
	if idx < 1 || idx > 3 {
		http.Error(w, `{"error":"无法更改房主位置"}`, http.StatusBadRequest)
		return
	}

	positions := []string{"bottom", "left", "top", "right"}
	room.Seats[idx] = models.RoomSeat{
		Position:   positions[idx],
		PlayerName: "空位",
		Avatar:     "❓",
		IsHost:     false,
		IsAI:       false,
		Ready:      false,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"room":    room,
	})
}

func (rh *RoomHandler) StartRoom(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Code string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"参数错误"}`, http.StatusBadRequest)
		return
	}

	cleanCode := strings.TrimSpace(body.Code)

	rh.mu.Lock()
	defer rh.mu.Unlock()

	room, exists := rh.rooms[cleanCode]
	if !exists {
		http.Error(w, `{"error":"房间不存在"}`, http.StatusNotFound)
		return
	}

	readyCount := 0
	for _, s := range room.Seats {
		if s.PlayerName != "空位" && s.Ready {
			readyCount++
		}
	}

	if readyCount < 4 {
		http.Error(w, `{"error":"房间必须凑齐 4 位玩家才可以开局！"}`, http.StatusBadRequest)
		return
	}

	room.Status = "PLAYING"
	rh.store.AddLog("ROOM_START", fmt.Sprintf("房间开局 [%s]: %s", cleanCode, room.RoomName))

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"room":    room,
	})
}
