package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"chudadi/backend/config"
	"chudadi/backend/db"
	"chudadi/backend/models"
)

type AdminHandler struct {
	store *db.Store
	cfg   *config.Config
}

func NewAdminHandler(store *db.Store, cfg *config.Config) *AdminHandler {
	return &AdminHandler{store: store, cfg: cfg}
}

func (ah *AdminHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	data := ah.store.GetData()

	var userList []*models.UserRecord
	for _, u := range data.Users {
		userList = append(userList, u)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"users":            userList,
		"authorizedPhones": data.AuthorizedPhones,
		"logs":             data.Logs,
		"botConfig":        data.BotConfig,
		"loadedEnvPath":    ah.cfg.LoadedEnvPath,
	})
}

func (ah *AdminHandler) ModifyUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Phone      string  `json:"phone"`
		Coins      *int64  `json:"coins"`
		Password   *string `json:"password"`
		IsBotAdmin *bool   `json:"isBotAdmin"`
		Action     string  `json:"action"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"参数格式错误"}`, http.StatusBadRequest)
		return
	}

	cleanPhone := strings.TrimSpace(body.Phone)
	user, exists := ah.store.GetUser(cleanPhone)

	if !exists && body.Action != "CREATE_AND_AUTH" {
		http.Error(w, `{"error":"未找到该用户"}`, http.StatusNotFound)
		return
	}

	if body.Action == "DELETE_USER" {
		ah.store.DeleteUser(cleanPhone)
		ah.store.AddLog("ADMIN_DELETE", fmt.Sprintf("管理员删除用户: %s", cleanPhone))
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": fmt.Sprintf("已删除用户 %s", cleanPhone),
		})
		return
	}

	if body.Coins != nil && user != nil {
		user.Coins = *body.Coins
		ah.store.AddLog("ADMIN_COINS", fmt.Sprintf("修改用户 %s 积分: %d", user.Nickname, *body.Coins))
	}

	if body.Password != nil && user != nil {
		pwd := *body.Password
		if len(pwd) != 6 {
			http.Error(w, `{"error":"新密码必须为 6 位数"}`, http.StatusBadRequest)
			return
		}
		user.Password = pwd
		ah.store.AddLog("ADMIN_PASSWORD", fmt.Sprintf("重置用户 %s 密码为: %s", user.Nickname, pwd))
	}

	if body.IsBotAdmin != nil && user != nil {
		user.IsBotAdmin = *body.IsBotAdmin
		ah.store.AddLog("ADMIN_ROLE", fmt.Sprintf("修改用户 %s Bot 管理员权限: %v", user.Nickname, *body.IsBotAdmin))
	}

	if user != nil {
		ah.store.SetUser(cleanPhone, user)
	}

	data := ah.store.GetData()
	var allUsers []*models.UserRecord
	for _, u := range data.Users {
		allUsers = append(allUsers, u)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
		"users":   allUsers,
	})
}
