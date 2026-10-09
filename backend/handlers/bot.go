package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"chudadi/backend/config"
	"chudadi/backend/db"
	"chudadi/backend/models"
)

type BotHandler struct {
	store *db.Store
	cfg   *config.Config
}

func NewBotHandler(store *db.Store, cfg *config.Config) *BotHandler {
	bh := &BotHandler{
		store: store,
		cfg:   cfg,
	}

	// Start background polling if token is present
	go bh.startPolling()

	return bh
}

var botKeyboard = map[string]interface{}{
	"keyboard": [][]map[string]string{
		{{"text": "📱 授权手机号"}, {"text": "📋 授权列表"}},
		{{"text": "👥 玩家清单"}, {"text": "💰 充值积分"}},
		{{"text": "🔑 重置密码"}, {"text": "ℹ️ 运行状态"}},
	},
	"resize_keyboard":   true,
	"one_time_keyboard": false,
}

func formatTokenPath(token string) string {
	clean := strings.TrimSpace(token)
	if clean == "" {
		return ""
	}
	if strings.HasPrefix(strings.ToLower(clean), "bot") {
		return clean
	}
	return "bot" + clean
}

func (bh *BotHandler) SendTelegramMessage(chatID interface{}, text string, token string, includeKeyboard bool) {
	if token == "" {
		token = bh.store.GetData().BotConfig.Token
	}
	if token == "" || strings.Contains(token, "ExampleToken") {
		return
	}

	tokenPath := formatTokenPath(token)
	reqUrl := fmt.Sprintf("%s/%s/sendMessage", bh.cfg.EnvTgApiHost, tokenPath)

	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "Markdown",
	}
	if includeKeyboard {
		payload["reply_markup"] = botKeyboard
	}

	bodyBytes, _ := json.Marshal(payload)
	_, _ = http.Post(reqUrl, "application/json", bytes.NewBuffer(bodyBytes))
}

func (bh *BotHandler) ProcessCommand(commandText string, chatID interface{}) string {
	cleanText := strings.TrimSpace(commandText)
	parts := strings.Fields(cleanText)
	if len(parts) == 0 {
		return ""
	}

	cmd := strings.ToLower(parts[0])
	arg1 := ""
	if len(parts) > 1 {
		arg1 = parts[1]
	}
	arg2 := ""
	if len(parts) > 2 {
		arg2 = parts[2]
	}

	data := bh.store.GetData()

	switch cleanText {
	case "📱 授权手机号":
		return "📱 *手机号注册授权*\n\n请发送指令：\n`/auth 手机号`\n\n例如：`/auth 13912345678`"
	case "📋 授权列表":
		return bh.ProcessCommand("/list", chatID)
	case "👥 玩家清单":
		return bh.ProcessCommand("/users", chatID)
	case "💰 充值积分":
		return "💰 *积分充值功能*\n\n请发送指令：\n`/addcoins 手机号 积分数量`\n\n例如：`/addcoins 13800138000 50000`"
	case "🔑 重置密码":
		return "🔑 *重置玩家 6 位数密码*\n\n请发送指令：\n`/resetpwd 手机号 6位新密码`\n\n例如：`/resetpwd 13800138000 666888`"
	case "ℹ️ 运行状态":
		return bh.ProcessCommand("/info", chatID)
	}

	switch cmd {
	case "/start", "/menu", "/help":
		return "🤖 *锄大地 Telegram 管理控制面板 (Go 版)*\n\n" +
			"已为你启动底部**交互按键菜单**，你可以直接点击下方按钮或发送快捷指令：\n\n" +
			"🔹 `/auth 手机号` - 授权该手机号注册账号\n" +
			"🔹 `/unauth 手机号` - 取消手机号注册授权\n" +
			"🔹 `/list` - 查看已授权手机号清单\n" +
			"🔹 `/users` - 查看玩家列表与积分\n" +
			"🔹 `/addcoins 手机号 积分` - 充值游戏积分\n" +
			"🔹 `/resetpwd 手机号 6位密码` - 重置密码\n" +
			"🔹 `/info` - 查看节点运行状态"

	case "/auth", "/authorize":
		if arg1 == "" {
			return "❌ 格式错误！正确格式：`/auth 手机号` 例如：`/auth 13988889999`"
		}
		if bh.store.AuthorizePhone(arg1) {
			bh.store.AddLog("TG_BOT", fmt.Sprintf("Telegram Bot 成功授权手机号: %s", arg1))
			return fmt.Sprintf("✅ 授权成功！手机号 `%s` 已获得注册权限，现在可在游戏中进行注册。", arg1)
		}
		return fmt.Sprintf("ℹ️ 手机号 `%s` 之前已经获得过授权。", arg1)

	case "/unauth", "/revoke":
		if arg1 == "" {
			return "❌ 格式错误！正确格式：`/unauth 手机号`"
		}
		bh.store.RevokePhone(arg1)
		bh.store.AddLog("TG_BOT", fmt.Sprintf("Telegram Bot 取消授权手机号: %s", arg1))
		return fmt.Sprintf("🛑 已取消手机号 `%s` 的注册授权！", arg1)

	case "/list":
		var lines []string
		lines = append(lines, fmt.Sprintf("📋 *已授权手机号列表 (%d 个)*:", len(data.AuthorizedPhones)))
		for idx, p := range data.AuthorizedPhones {
			u, exists := data.Users[p]
			status := "⏳ (未注册)"
			if exists {
				status = fmt.Sprintf("✅ (已注册: %s)", u.Nickname)
			}
			lines = append(lines, fmt.Sprintf("%d. `%s` %s", idx+1, p, status))
		}
		return strings.Join(lines, "\n")

	case "/users":
		var lines []string
		lines = append(lines, fmt.Sprintf("👥 *注册玩家列表 (%d 人)*:", len(data.Users)))
		i := 1
		for _, u := range data.Users {
			role := "玩家"
			if u.IsBotAdmin {
				role = "👑管理员"
			}
			lines = append(lines, fmt.Sprintf("%d. *%s* (`%s`) - 💰%d 积分 [%s]", i, u.Nickname, u.Phone, u.Coins, role))
			i++
		}
		return strings.Join(lines, "\n")

	case "/addcoins":
		delta, err := strconv.ParseInt(arg2, 10, 64)
		if arg1 == "" || arg2 == "" || err != nil {
			return "❌ 格式错误！正确格式：`/addcoins 手机号 积分数量` 例如 `/addcoins 13800138000 50000`"
		}
		u, exists := bh.store.GetUser(arg1)
		if !exists {
			return fmt.Sprintf("❌ 未找到手机号为 `%s` 的玩家，请先确认手机号。", arg1)
		}
		u.Coins += delta
		bh.store.SetUser(arg1, u)
		bh.store.AddLog("TG_BOT", fmt.Sprintf("TG 充值玩家 %s 积分: %d", u.Nickname, delta))
		return fmt.Sprintf("💰 充值成功！玩家 *%s* (`%s`) 当前积分：`%d`", u.Nickname, arg1, u.Coins)

	case "/resetpwd":
		if arg1 == "" || len(arg2) != 6 {
			return "❌ 格式错误！新密码必须为 6 位数。正确格式：`/resetpwd 手机号 6位新密码`"
		}
		u, exists := bh.store.GetUser(arg1)
		if !exists {
			return fmt.Sprintf("❌ 未找到手机号为 `%s` 的玩家", arg1)
		}
		u.Password = arg2
		bh.store.SetUser(arg1, u)
		bh.store.AddLog("TG_BOT", fmt.Sprintf("TG 重置玩家 %s 密码为: %s", u.Nickname, arg2))
		return fmt.Sprintf("🔑 密码重置成功！玩家 *%s* 的新密码设为：`%s`", u.Nickname, arg2)

	case "/info":
		loaded := bh.cfg.LoadedEnvPath
		if loaded == "" {
			loaded = "内置/环境变量"
		}
		return fmt.Sprintf("ℹ️ *Telegram Bot 运行状态 (Go 后端)*\n• 配置文件: `%s`\n• Bot ID: `%s`\n• 授权手机号数: `%d`\n• 游戏注册玩家: `%d`",
			loaded, data.BotConfig.BotId, len(data.AuthorizedPhones), len(data.Users))

	default:
		return fmt.Sprintf("🤖 未知命令: `%s`。发送 `/help` 查看键盘菜单与指令说明。", cleanText)
	}
}

func (bh *BotHandler) startPolling() {
	var lastUpdateID int64
	for {
		data := bh.store.GetData()
		token := data.BotConfig.Token
		if token == "" || strings.Contains(token, "ExampleToken") {
			time.Sleep(5 * time.Second)
			continue
		}

		tokenPath := formatTokenPath(token)
		urlStr := fmt.Sprintf("%s/%s/getUpdates?offset=%d&timeout=20", bh.cfg.EnvTgApiHost, tokenPath, lastUpdateID+1)

		resp, err := http.Get(urlStr)
		if err != nil {
			time.Sleep(3 * time.Second)
			continue
		}

		var result struct {
			Ok     bool `json:"ok"`
			Result []struct {
				UpdateID int64 `json:"update_id"`
				Message  struct {
					Chat struct {
						ID int64 `json:"id"`
					} `json:"chat"`
					Text string `json:"text"`
				} `json:"message"`
			} `json:"result"`
		}

		_ = json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()

		if result.Ok {
			for _, upd := range result.Result {
				if upd.UpdateID > lastUpdateID {
					lastUpdateID = upd.UpdateID
				}
				if upd.Message.Text != "" {
					reply := bh.ProcessCommand(upd.Message.Text, upd.Message.Chat.ID)
					bh.SendTelegramMessage(upd.Message.Chat.ID, reply, token, true)
				}
			}
		}

		time.Sleep(1 * time.Second)
	}
}

func (bh *BotHandler) EnvStatus(w http.ResponseWriter, r *http.Request) {
	data := bh.store.GetData()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"loadedEnvPath":         bh.cfg.LoadedEnvPath,
		"botConfig":             data.BotConfig,
		"authorizedPhonesCount": len(data.AuthorizedPhones),
		"usersCount":            len(data.Users),
	})
}

func (bh *BotHandler) SetWebhook(w http.ResponseWriter, r *http.Request) {
	var body struct {
		WebhookUrl string `json:"webhookUrl"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	data := bh.store.GetData()
	token := data.BotConfig.Token
	if token == "" || strings.Contains(token, "ExampleToken") {
		http.Error(w, `{"error":"请先配置有效的 Telegram BOT_TOKEN"}`, http.StatusBadRequest)
		return
	}

	urlToSet := body.WebhookUrl
	if urlToSet == "" {
		urlToSet = data.BotConfig.WebhookUrl
	}
	if urlToSet == "" {
		http.Error(w, `{"error":"请提供 Webhook URL 地址"}`, http.StatusBadRequest)
		return
	}

	tokenPath := formatTokenPath(token)
	tgUrl := fmt.Sprintf("%s/%s/setWebhook?url=%s", bh.cfg.EnvTgApiHost, tokenPath, url.QueryEscape(urlToSet))
	resp, err := http.Get(tgUrl)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var tgData map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&tgData)

	bh.store.UpdateBotConfig(func(cfg *models.BotConfig) {
		cfg.WebhookUrl = urlToSet
	})
	bh.store.AddLog("TG_WEBHOOK", fmt.Sprintf("注册 Telegram Webhook: %s", urlToSet))

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("✅ 成功绑定 Webhook 到: %s", urlToSet),
		"result":  tgData,
	})
}

func (bh *BotHandler) AuthorizePhone(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Phone string `json:"phone"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	phone := strings.TrimSpace(body.Phone)
	if phone == "" {
		http.Error(w, `{"error":"请输入要授权的手机号"}`, http.StatusBadRequest)
		return
	}

	bh.store.AuthorizePhone(phone)
	bh.store.AddLog("TG_BOT_AUTH", fmt.Sprintf("管理员/Bot 授权新手机号: %s", phone))
	data := bh.store.GetData()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":          true,
		"phone":            phone,
		"authorizedPhones": data.AuthorizedPhones,
		"message":          fmt.Sprintf("手机号 %s 已成功授权！", phone),
	})
}

func (bh *BotHandler) RevokePhone(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Phone string `json:"phone"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	phone := strings.TrimSpace(body.Phone)
	if phone == "" {
		http.Error(w, `{"error":"请输入手机号"}`, http.StatusBadRequest)
		return
	}

	bh.store.RevokePhone(phone)
	bh.store.AddLog("TG_BOT_REVOKE", fmt.Sprintf("取消授权手机号: %s", phone))
	data := bh.store.GetData()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":          true,
		"phone":            phone,
		"authorizedPhones": data.AuthorizedPhones,
		"message":          fmt.Sprintf("已取消手机号 %s 的授权", phone),
	})
}

func (bh *BotHandler) Config(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token       *string `json:"token"`
		BotUsername *string `json:"botUsername"`
		BotId       *string `json:"botId"`
		AdminId     *string `json:"adminId"`
		WebhookUrl  *string `json:"webhookUrl"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	bh.store.UpdateBotConfig(func(cfg *models.BotConfig) {
		if body.Token != nil {
			cfg.Token = *body.Token
		}
		if body.BotUsername != nil {
			cfg.BotUsername = *body.BotUsername
		}
		if body.BotId != nil {
			cfg.BotId = *body.BotId
		}
		if body.AdminId != nil {
			cfg.AdminId = *body.AdminId
		}
		if body.WebhookUrl != nil {
			cfg.WebhookUrl = *body.WebhookUrl
		}
	})

	bh.store.AddLog("BOT_CONFIG", "更新 Telegram Bot 配置信息")
	data := bh.store.GetData()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"botConfig": data.BotConfig,
	})
}

func (bh *BotHandler) WebhookGet(w http.ResponseWriter, r *http.Request) {
	data := bh.store.GetData()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":                "ok",
		"message":               "✅ Telegram Bot Webhook 接口服务正常在线 (Go 后端)！请在 Telegram 软件中向 Bot 发送指令进行对讲。",
		"botId":                 data.BotConfig.BotId,
		"botUsername":           data.BotConfig.BotUsername,
		"authorizedPhonesCount": len(data.AuthorizedPhones),
		"usersCount":            len(data.Users),
	})
}

func (bh *BotHandler) WebhookPost(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Message struct {
			Text string `json:"text"`
			Chat struct {
				ID interface{} `json:"id"`
			} `json:"chat"`
		} `json:"message"`
		Text string `json:"text"`
	}

	_ = json.NewDecoder(r.Body).Decode(&body)

	commandText := body.Message.Text
	if commandText == "" {
		commandText = body.Text
	}
	commandText = strings.TrimSpace(commandText)

	if commandText == "" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ignored", "reason": "No text message"})
		return
	}

	chatID := body.Message.Chat.ID
	bh.store.AddLog("TG_WEBHOOK", fmt.Sprintf("接收到 Telegram Webhook 指令: %s", commandText))
	replyText := bh.ProcessCommand(commandText, chatID)

	w.Header().Set("Content-Type", "application/json")
	if chatID != nil {
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"method":       "sendMessage",
			"chat_id":      chatID,
			"text":         replyText,
			"parse_mode":   "Markdown",
			"reply_markup": botKeyboard,
		})
		return
	}

	data := bh.store.GetData()
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":               true,
		"replyText":        replyText,
		"authorizedPhones": data.AuthorizedPhones,
		"usersCount":       len(data.Users),
	})
}
