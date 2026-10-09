package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Port           string
	EnvBotToken    string
	EnvBotID       string
	EnvTgApiHost   string
	LoadedEnvPath  string
	DataDir        string
	DataFile       string
	DistDir        string
}

func LoadConfig() *Config {
	cfg := &Config{
		Port:         "8080",
		EnvTgApiHost: "https://api.telegram.org",
		DataDir:      "data",
		DataFile:     filepath.Join("data", "db.json"),
		DistDir:      "dist",
	}

	if p := os.Getenv("PORT"); p != "" {
		cfg.Port = p
	}

	// Potential .env paths
	homeDir, _ := os.UserHomeDir()
	candidatePaths := []string{
		filepath.Join("..", ".env"),
		".env",
		filepath.Join(homeDir, ".env"),
		"/data/data/com.termux/files/home/.env",
	}

	for _, p := range candidatePaths {
		if _, err := os.Stat(p); err == nil {
			loadEnvFile(p)
			cfg.LoadedEnvPath = p
			break
		}
	}

	if t := os.Getenv("BOT_TOKEN"); t != "" {
		cfg.EnvBotToken = t
	} else if t := os.Getenv("TELEGRAM_BOT_TOKEN"); t != "" {
		cfg.EnvBotToken = t
	} else if t := os.Getenv("TG_BOT_TOKEN"); t != "" {
		cfg.EnvBotToken = t
	}

	if id := os.Getenv("BOT_ID"); id != "" {
		cfg.EnvBotID = id
	} else if id := os.Getenv("TELEGRAM_BOT_ID"); id != "" {
		cfg.EnvBotID = id
	} else if id := os.Getenv("TG_BOT_ID"); id != "" {
		cfg.EnvBotID = id
	} else if cfg.EnvBotToken != "" {
		parts := strings.Split(cfg.EnvBotToken, ":")
		if len(parts) > 0 {
			cfg.EnvBotID = parts[0]
		}
	}

	if host := os.Getenv("TG_API_HOST"); host != "" {
		cfg.EnvTgApiHost = strings.TrimRight(host, "/")
	}

	return cfg
}

func loadEnvFile(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
			if os.Getenv(k) == "" {
				os.Setenv(k, v)
			}
		}
	}
}
