package db

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"

	"chudadi/backend/config"
	"chudadi/backend/models"
)

type Store struct {
	mu   sync.RWMutex
	data *models.DatabaseSchema
	cfg  *config.Config
}

const DefaultAdminPhone = "13800138000"

func NewStore(cfg *config.Config) *Store {
	s := &Store{
		cfg: cfg,
	}
	s.load()
	return s
}

func (s *Store) defaultData() *models.DatabaseSchema {
	now := time.Now()
	users := map[string]*models.UserRecord{
		DefaultAdminPhone: {
			Phone:      DefaultAdminPhone,
			Nickname:   "锄神大司马",
			Password:   "admin8",
			Avatar:     "😎",
			Coins:      88888,
			Diamonds:   888,
			Wins:       66,
			Losses:     12,
			IsBotAdmin: true,
			CreatedAt:  now,
		},
		"18888888888": {
			Phone:      "18888888888",
			Nickname:   "赌圣阿星",
			Password:   "123456",
			Avatar:     "👑",
			Coins:      50000,
			Diamonds:   500,
			Wins:       30,
			Losses:     10,
			IsBotAdmin: false,
			CreatedAt:  now,
		},
	}

	botToken := s.cfg.EnvBotToken
	if botToken == "" {
		botToken = "7890123456:AAFdExampleTokenForChuDaDiBot"
	}
	botID := s.cfg.EnvBotID
	if botID == "" {
		botID = "7890123456"
	}

	return &models.DatabaseSchema{
		AuthorizedPhones: []string{
			DefaultAdminPhone,
			"18888888888",
			"15999999999",
			"13333333333",
			"13666666666",
			"13999999999",
		},
		Users: users,
		BotConfig: models.BotConfig{
			Token:       botToken,
			BotUsername: "@ChuDaDiGame_Bot",
			BotId:       botID,
			AdminId:     "123456789",
			WebhookUrl:  "https://example.com/api/bot/webhook",
		},
		Logs: []models.LogItem{
			{
				ID:      fmt.Sprintf("%d", time.Now().UnixMilli()),
				Time:    time.Now().Format("15:04:05"),
				Type:    "BOT_EVENT",
				Message: "经典 4 人锄大地 Go 后端管理中心服务启动",
			},
		},
	}
}

func (s *Store) load() {
	s.mu.Lock()
	defer s.mu.Unlock()

	_ = os.MkdirAll(s.cfg.DataDir, 0755)

	content, err := os.ReadFile(s.cfg.DataFile)
	if err != nil {
		s.data = s.defaultData()
		s.saveUnlocked()
		return
	}

	var loaded models.DatabaseSchema
	if err := json.Unmarshal(content, &loaded); err != nil {
		s.data = s.defaultData()
		return
	}

	if loaded.Users == nil {
		loaded.Users = make(map[string]*models.UserRecord)
	}
	if s.cfg.EnvBotToken != "" {
		loaded.BotConfig.Token = s.cfg.EnvBotToken
	}
	if s.cfg.EnvBotID != "" {
		loaded.BotConfig.BotId = s.cfg.EnvBotID
	}

	s.data = &loaded
}

func (s *Store) saveUnlocked() {
	dataBytes, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return
	}

	tmpFile := s.cfg.DataFile + ".tmp"
	_ = os.WriteFile(tmpFile, dataBytes, 0644)
	_ = os.Rename(tmpFile, s.cfg.DataFile)
}

func (s *Store) Save() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.saveUnlocked()
}

func (s *Store) AddLog(logType, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	item := models.LogItem{
		ID:      fmt.Sprintf("%d", time.Now().UnixMilli()),
		Time:    time.Now().Format("15:04:05"),
		Type:    logType,
		Message: message,
	}

	s.data.Logs = append([]models.LogItem{item}, s.data.Logs...)
	if len(s.data.Logs) > 100 {
		s.data.Logs = s.data.Logs[:100]
	}
	s.saveUnlocked()
}

func (s *Store) GetData() models.DatabaseSchema {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return *s.data
}

func (s *Store) GetUser(phone string) (*models.UserRecord, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.data.Users[phone]
	return u, ok
}

func (s *Store) FindUserByQuery(query string) (*models.UserRecord, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, u := range s.data.Users {
		if u.Phone == query || u.Nickname == query {
			return u, true
		}
	}
	return nil, false
}

func (s *Store) SetUser(phone string, user *models.UserRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Users[phone] = user
	s.saveUnlocked()
}

func (s *Store) DeleteUser(phone string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data.Users, phone)
	s.saveUnlocked()
}

func (s *Store) IsPhoneAuthorized(phone string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, p := range s.data.AuthorizedPhones {
		if p == phone {
			return true
		}
	}
	return false
}

func (s *Store) AuthorizePhone(phone string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, p := range s.data.AuthorizedPhones {
		if p == phone {
			return false
		}
	}
	s.data.AuthorizedPhones = append(s.data.AuthorizedPhones, phone)
	s.saveUnlocked()
	return true
}

func (s *Store) RevokePhone(phone string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var updated []string
	for _, p := range s.data.AuthorizedPhones {
		if p != phone {
			updated = append(updated, p)
		}
	}
	s.data.AuthorizedPhones = updated
	s.saveUnlocked()
}

func (s *Store) UpdateBotConfig(fn func(cfg *models.BotConfig)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	fn(&s.data.BotConfig)
	s.saveUnlocked()
}
