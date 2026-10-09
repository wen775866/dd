package models

import "time"

// UserRecord represents a player in the system
type UserRecord struct {
	Phone      string    `json:"phone"`
	Nickname   string    `json:"nickname"`
	Password   string    `json:"password"` // 6 characters
	Avatar     string    `json:"avatar"`
	Coins      int64     `json:"coins"`
	Diamonds   int64     `json:"diamonds"`
	Wins       int       `json:"wins"`
	Losses     int       `json:"losses"`
	IsBotAdmin bool      `json:"isBotAdmin"`
	CreatedAt  time.Time `json:"createdAt"`
}

// BotConfig represents Telegram Bot credentials and settings
type BotConfig struct {
	Token       string `json:"token"`
	BotUsername string `json:"botUsername"`
	BotId       string `json:"botId"`
	AdminId     string `json:"adminId"`
	WebhookUrl  string `json:"webhookUrl"`
}

// LogItem represents an activity log
type LogItem struct {
	ID      string `json:"id"`
	Time    string `json:"time"`
	Type    string `json:"type"`
	Message string `json:"message"`
}

// DatabaseSchema represents persistent JSON storage
type DatabaseSchema struct {
	AuthorizedPhones []string               `json:"authorizedPhones"`
	Users            map[string]*UserRecord `json:"users"`
	BotConfig        BotConfig              `json:"botConfig"`
	Logs             []LogItem              `json:"logs"`
}

// RoomSeat represents a player seat in a room
type RoomSeat struct {
	Position   string `json:"position"` // bottom, left, top, right
	PlayerName string `json:"playerName"`
	Avatar     string `json:"avatar"`
	IsHost     bool   `json:"isHost"`
	IsAI       bool   `json:"isAI"`
	Ready      bool   `json:"ready"`
	Phone      string `json:"phone,omitempty"`
}

// RoomRecord represents a multiplayer game room
type RoomRecord struct {
	Code         string     `json:"code"` // 6-digit code, e.g. "883921"
	Mode         string     `json:"mode"` // room-chudadi or room-yansan
	RoomName     string     `json:"roomName"`
	BaseScore    int64      `json:"baseScore"`
	EntryMin     int64      `json:"entryMin"`
	HostName     string     `json:"hostName"`
	HostPhone    string     `json:"hostPhone,omitempty"`
	IsPrivate    bool       `json:"isPrivate"`
	Passcode     string     `json:"passcode,omitempty"`
	AllowBotFill bool       `json:"allowBotFill"`
	Seats        []RoomSeat `json:"seats"`
	CreatedAt    int64      `json:"createdAt"`
	Status       string     `json:"status"` // WAITING, PLAYING, CLOSED
}
