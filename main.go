package main

import (
	"embed"
	"fmt"
	"log"
	"net/http"

	"chudadi/backend/config"
	"chudadi/backend/db"
	"chudadi/backend/server"
)

//go:embed web
var embeddedWebFS embed.FS

func main() {
	cfg := config.LoadConfig()
	store := db.NewStore(cfg)
	srv := server.NewServer(cfg, store, embeddedWebFS)

	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	fmt.Println("\n==============================================================")
	fmt.Printf("🚀 欢聚锄大地 (Go + React) 一键启动就绪！\n")
	fmt.Printf("👉 本地服务地址: http://0.0.0.0:%s\n", port)
	fmt.Printf("🎮 React 前端与全部静态资源已内置于 Go 服务中，无需 Node.js/npm！\n")
	if cfg.LoadedEnvPath != "" {
		fmt.Printf("📄 成功加载配置: %s\n", cfg.LoadedEnvPath)
	}
	fmt.Println("==============================================================\n")

	addr := ":" + port
	if err := http.ListenAndServe(addr, srv); err != nil {
		log.Fatalf("❌ 服务启动失败: %v", err)
	}
}
