package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"chudadi/backend/db"
	"chudadi/backend/models"
)

type AuthHandler struct {
	store *db.Store
}

func NewAuthHandler(store *db.Store) *AuthHandler {
	return &AuthHandler{store: store}
}

func (h *AuthHandler) CheckPhone(w http.ResponseWriter, r *http.Request) {
	phone := strings.TrimSpace(r.URL.Query().Get("phone"))
	if phone == "" {
		http.Error(w, `{"error":"请提供手机号"}`, http.StatusBadRequest)
		return
	}

	isAuth := h.store.IsPhoneAuthorized(phone)
	_, isReg := h.store.GetUser(phone)

	msg := "该手机号未经 Telegram Bot 授权，无法注册"
	if isAuth {
		if isReg {
			msg = "该手机号已获得 TG 授权且已注册"
		} else {
			msg = "该手机号已获得 TG 授权，可进行注册"
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"phone":        phone,
		"isAuthorized": isAuth,
		"isRegistered": isReg,
		"message":      msg,
	})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Phone    string `json:"phone"`
		Nickname string `json:"nickname"`
		Password string `json:"password"`
		Avatar   string `json:"avatar"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"请求参数格式错误"}`, http.StatusBadRequest)
		return
	}

	cleanPhone := strings.TrimSpace(body.Phone)
	cleanNickname := strings.TrimSpace(body.Nickname)
	cleanPassword := strings.TrimSpace(body.Password)

	if cleanPhone == "" || cleanNickname == "" || cleanPassword == "" {
		http.Error(w, `{"error":"请填写手机号、昵称和密码"}`, http.StatusBadRequest)
		return
	}

	if !h.store.IsPhoneAuthorized(cleanPhone) {
		http.Error(w, `{"error":"该手机号未获得 Telegram Bot 授权！请通过 Telegram 机器人授权后再进行注册。"}`, http.StatusForbidden)
		return
	}

	if len(cleanPassword) != 6 {
		http.Error(w, `{"error":"密码必须为 6 位数 (不限大小写字母或数字)"}`, http.StatusBadRequest)
		return
	}

	if _, exists := h.store.GetUser(cleanPhone); exists {
		http.Error(w, `{"error":"该手机号已注册，请直接登录"}`, http.StatusBadRequest)
		return
	}

	avatar := body.Avatar
	if avatar == "" {
		avatar = "😎"
	}

	newUser := &models.UserRecord{
		Phone:      cleanPhone,
		Nickname:   cleanNickname,
		Password:   cleanPassword,
		Avatar:     avatar,
		Coins:      30000,
		Diamonds:   300,
		Wins:       0,
		Losses:     0,
		IsBotAdmin: cleanPhone == db.DefaultAdminPhone,
		CreatedAt:  time.Now(),
	}

	h.store.SetUser(cleanPhone, newUser)
	h.store.AddLog("REGISTER", "新用户注册: "+cleanNickname+" ("+cleanPhone+")")

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    newUser,
		"message": "注册成功，欢迎加入锄大地！",
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PhoneOrNickname string `json:"phoneOrNickname"`
		Password        string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"请求参数错误"}`, http.StatusBadRequest)
		return
	}

	query := strings.TrimSpace(body.PhoneOrNickname)
	password := strings.TrimSpace(body.Password)

	if query == "" || password == "" {
		http.Error(w, `{"error":"请输入手机号/昵称和密码"}`, http.StatusBadRequest)
		return
	}

	user, ok := h.store.FindUserByQuery(query)
	if !ok {
		http.Error(w, `{"error":"账号不存在，请先核对手机号或进行注册"}`, http.StatusNotFound)
		return
	}

	if !strings.EqualFold(user.Password, password) {
		http.Error(w, `{"error":"密码不正确，密码为 6 位数"}`, http.StatusUnauthorized)
		return
	}

	h.store.AddLog("LOGIN", "用户登录: "+user.Nickname+" ("+user.Phone+")")

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
		"message": "登录成功！",
	})
}

func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Phone    string  `json:"phone"`
		Coins    *int64  `json:"coins"`
		Wins     *int    `json:"wins"`
		Losses   *int    `json:"losses"`
		Nickname *string `json:"nickname"`
		Avatar   *string `json:"avatar"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"参数格式错误"}`, http.StatusBadRequest)
		return
	}

	cleanPhone := strings.TrimSpace(body.Phone)
	user, exists := h.store.GetUser(cleanPhone)
	if !exists {
		http.Error(w, `{"error":"无效用户"}`, http.StatusBadRequest)
		return
	}

	if body.Coins != nil {
		user.Coins = *body.Coins
	}
	if body.Wins != nil {
		user.Wins = *body.Wins
	}
	if body.Losses != nil {
		user.Losses = *body.Losses
	}
	if body.Nickname != nil {
		user.Nickname = *body.Nickname
	}
	if body.Avatar != nil {
		user.Avatar = *body.Avatar
	}

	h.store.SetUser(cleanPhone, user)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}
