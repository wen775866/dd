package server

import (
	"embed"
	"encoding/json"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"chudadi/backend/config"
	"chudadi/backend/db"
	"chudadi/backend/handlers"
)

type Server struct {
	cfg          *config.Config
	store        *db.Store
	authHandler  *handlers.AuthHandler
	roomHandler  *handlers.RoomHandler
	botHandler   *handlers.BotHandler
	adminHandler *handlers.AdminHandler
	mux          *http.ServeMux
	subFS        fs.FS
}

func NewServer(cfg *config.Config, store *db.Store, embeddedWebFS ...embed.FS) *Server {
	var subFS fs.FS
	if len(embeddedWebFS) > 0 {
		if sub, err := fs.Sub(embeddedWebFS[0], "web"); err == nil {
			subFS = sub
		}
	}

	s := &Server{
		cfg:          cfg,
		store:        store,
		authHandler:  handlers.NewAuthHandler(store),
		roomHandler:  handlers.NewRoomHandler(store),
		botHandler:   handlers.NewBotHandler(store, cfg),
		adminHandler: handlers.NewAdminHandler(store, cfg),
		mux:          http.NewServeMux(),
		subFS:        subFS,
	}

	s.registerRoutes()
	return s
}

func (s *Server) registerRoutes() {
	// Health check
	s.mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "ok",
			"server": "go",
			"engine": "Go + React",
		})
	})

	// Auth routes
	s.mux.HandleFunc("/api/auth/check-phone", s.authHandler.CheckPhone)
	s.mux.HandleFunc("/api/auth/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.authHandler.Register(w, r)
	})
	s.mux.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.authHandler.Login(w, r)
	})
	s.mux.HandleFunc("/api/auth/update-profile", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.authHandler.UpdateProfile(w, r)
	})

	// Room routes
	s.mux.HandleFunc("/api/rooms/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.roomHandler.CreateRoom(w, r)
	})
	s.mux.HandleFunc("/api/rooms/list", s.roomHandler.ListRooms)
	s.mux.HandleFunc("/api/rooms/get/", s.roomHandler.GetRoom)
	s.mux.HandleFunc("/api/rooms/join", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.roomHandler.JoinRoom(w, r)
	})
	s.mux.HandleFunc("/api/rooms/add-bot", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.roomHandler.AddBot(w, r)
	})
	s.mux.HandleFunc("/api/rooms/kick-seat", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.roomHandler.KickSeat(w, r)
	})
	s.mux.HandleFunc("/api/rooms/start", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.roomHandler.StartRoom(w, r)
	})

	// Bot routes
	s.mux.HandleFunc("/api/bot/env-status", s.botHandler.EnvStatus)
	s.mux.HandleFunc("/api/bot/set-webhook", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.botHandler.SetWebhook(w, r)
	})
	s.mux.HandleFunc("/api/bot/authorize-phone", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.botHandler.AuthorizePhone(w, r)
	})
	s.mux.HandleFunc("/api/bot/revoke-phone", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.botHandler.RevokePhone(w, r)
	})
	s.mux.HandleFunc("/api/bot/config", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.botHandler.Config(w, r)
	})
	s.mux.HandleFunc("/api/bot/webhook", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			s.botHandler.WebhookGet(w, r)
			return
		}
		s.botHandler.WebhookPost(w, r)
	})

	// Admin routes
	s.mux.HandleFunc("/api/admin/users", s.adminHandler.GetUsers)
	s.mux.HandleFunc("/api/admin/modify-user", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.adminHandler.ModifyUser(w, r)
	})

	// Static & SPA Router Fallback
	s.mux.HandleFunc("/", s.handleStaticAndSPA)
}

func (s *Server) handleStaticAndSPA(w http.ResponseWriter, r *http.Request) {
	cleanPath := filepath.Clean(r.URL.Path)

	// Never catch API requests with HTML/static fallback
	if strings.HasPrefix(cleanPath, "/api/") {
		http.NotFound(w, r)
		return
	}

	// 1. Try embedded web filesystem first (primary distribution)
	if s.subFS != nil {
		relPath := strings.TrimPrefix(cleanPath, "/")
		if relPath == "" || relPath == "." {
			relPath = "index.html"
		}

		// Check if exact file exists in embedded filesystem
		file, err := s.subFS.Open(relPath)
		if err == nil {
			stat, statErr := file.Stat()
			_ = file.Close()
			if statErr == nil && !stat.IsDir() {
				// Serve static file with correct MIME type and caching
				http.FileServer(http.FS(s.subFS)).ServeHTTP(w, r)
				return
			}
		}

		// SPA Client-side Route Fallback: serve index.html from embedded FS
		indexData, err := fs.ReadFile(s.subFS, "index.html")
		if err == nil {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(indexData)
			return
		}
	}

	// 2. Fallback to local dist/ folder on disk if present (for local Vite dev)
	if s.cfg != nil && s.cfg.DistDir != "" {
		targetPath := filepath.Join(s.cfg.DistDir, cleanPath)
		info, err := os.Stat(targetPath)
		if err == nil && !info.IsDir() {
			http.ServeFile(w, r, targetPath)
			return
		}

		indexPath := filepath.Join(s.cfg.DistDir, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			http.ServeFile(w, r, indexPath)
			return
		}
	}

	// 3. Friendly fallback if neither web/ nor dist/ exist
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>经典4人锄大地 · Go + React 后端在线</title>
    <style>
        body { background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .box { background: rgba(30, 41, 59, 0.8); border: 1px solid #334155; padding: 2.5rem; border-radius: 1rem; max-width: 500px; }
        h1 { color: #38bdf8; font-size: 1.5rem; margin-bottom: 0.5rem; }
        p { color: #94a3b8; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="box">
        <h1>🚀 锄大地 Go 后端服务正常运行中</h1>
        <p>Go 语言 API 接口与 Telegram Bot 服务已在线！</p>
    </div>
</body>
</html>`))
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	s.mux.ServeHTTP(w, r)
}
