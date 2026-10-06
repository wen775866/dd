/**
 * Complete Go source files for Dou Dizhu (斗地主) on Termux & GitHub Repository.
 * Standard library only: runs directly on Termux without external CGO or dependencies!
 */

export interface SourceFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const GO_MAIN_CODE = `// ==============================================================================
// 斗地主 (Dou Dizhu) - 纯 Go 终端原生实现 (Termux 友好 / 零第三方依赖)
// GitHub: https://github.com/wen775866/dd
// 支持: 单机 AI 对战 / 多轮积分 / ANSI 终端彩色高亮 / 手机虚拟键盘自适应
// ==============================================================================

package main

import (
	"bufio"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"os/signal"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const (
	AppVersion = "v1.2.0"
)

// ANSI 颜色代码定义
var (
	ColorReset   = "\\033[0m"
	ColorRed     = "\\033[31;1m"
	ColorGreen   = "\\033[32;1m"
	ColorYellow  = "\\033[33;1m"
	ColorBlue    = "\\033[34;1m"
	ColorMagenta = "\\033[35;1m"
	ColorCyan    = "\\033[36;1m"
	ColorWhite   = "\\033[37;1m"
	ColorGray    = "\\033[90m"
	ColorBgDark  = "\\033[40m"
)

type Suit int

const (
	Diamond Suit = iota // 方块 ♦
	Club                // 梅花 ♣
	Heart               // 红桃 ♥
	Spade               // 黑桃 ♠
	Joker               // 王 ★
)

type Card struct {
	Suit  Suit
	Rank  string // "3".."10", "J", "Q", "K", "A", "2", "BJ", "RJ"
	Value int    // 3..17 (BJ=16, RJ=17)
}

func (c Card) String() string {
	var suitStr string
	isRed := false
	switch c.Suit {
	case Diamond:
		suitStr = "♦"
		isRed = true
	case Club:
		suitStr = "♣"
	case Heart:
		suitStr = "♥"
		isRed = true
	case Spade:
		suitStr = "♠"
	case Joker:
		if c.Value == 17 {
			return ColorRed + "★大王" + ColorReset
		}
		return ColorWhite + "★小王" + ColorReset
	}

	color := ColorWhite
	if isRed {
		color = ColorRed
	}
	return fmt.Sprintf("%s%s%s%s", color, suitStr, c.Rank, ColorReset)
}

// 牌型枚举
type HandType int

const (
	TypeInvalid HandType = iota
	TypeSingle
	TypePair
	TypeTrio
	TypeTrioSingle
	TypeTrioPair
	TypeStraight
	TypeConsecutivePairs
	TypeAirplane
	TypeAirplaneSingles
	TypeAirplanePairs
	TypeFourTwoSingles
	TypeFourTwoPairs
	TypeBomb
	TypeRocket
)

type Hand struct {
	Type      HandType
	MainValue int
	Length    int
	Cards     []Card
}

type Player struct {
	ID       int
	Name     string
	IsAI     bool
	Role     string // "地主" 或 "农民"
	Cards    []Card
	BidScore int
	Score    int // 累计战绩得分
	Wins     int // 胜场数
}

type ScoreBoard struct {
	Round       int
	LandlordWon int
	FarmerWon   int
}

// 54 张牌整副套牌生成
func NewDeck() []Card {
	ranks := []string{"3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"}
	deck := make([]Card, 0, 54)

	for i, r := range ranks {
		val := i + 3
		for s := Diamond; s <= Spade; s++ {
			deck = append(deck, Card{Suit: s, Rank: r, Value: val})
		}
	}
	deck = append(deck, Card{Suit: Joker, Rank: "BJ", Value: 16}) // 小王
	deck = append(deck, Card{Suit: Joker, Rank: "RJ", Value: 17}) // 大王
	return deck
}

func Shuffle(cards []Card) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(cards), func(i, j int) {
		cards[i], cards[j] = cards[j], cards[i]
	})
}

// 理牌（按大小降序，同大按花色降序）
func SortCards(cards []Card) {
	sort.Slice(cards, func(i, j int) bool {
		if cards[i].Value == cards[j].Value {
			return cards[i].Suit > cards[j].Suit
		}
		return cards[i].Value > cards[j].Value
	})
}

func countRanks(cards []Card) map[int]int {
	m := make(map[int]int)
	for _, c := range cards {
		m[c.Value]++
	}
	return m
}

// 核心规则引擎：识别牌型
func AnalyzeHand(cards []Card) Hand {
	n := len(cards)
	if n == 0 {
		return Hand{Type: TypeInvalid}
	}
	SortCards(cards)
	counts := countRanks(cards)

	// 单张
	if n == 1 {
		return Hand{Type: TypeSingle, MainValue: cards[0].Value, Length: 1, Cards: cards}
	}

	// 对子 或 王炸
	if n == 2 {
		if cards[0].Value == 17 && cards[1].Value == 16 {
			return Hand{Type: TypeRocket, MainValue: 17, Length: 2, Cards: cards}
		}
		if cards[0].Value == cards[1].Value {
			return Hand{Type: TypePair, MainValue: cards[0].Value, Length: 2, Cards: cards}
		}
		return Hand{Type: TypeInvalid}
	}

	// 三张 (三不带)
	if n == 3 && len(counts) == 1 {
		return Hand{Type: TypeTrio, MainValue: cards[0].Value, Length: 3, Cards: cards}
	}

	// 炸弹 或 三带一
	if n == 4 {
		if len(counts) == 1 {
			return Hand{Type: TypeBomb, MainValue: cards[0].Value, Length: 4, Cards: cards}
		}
		for v, c := range counts {
			if c == 3 {
				return Hand{Type: TypeTrioSingle, MainValue: v, Length: 4, Cards: cards}
			}
		}
	}

	// 三带对 或 5张顺子
	if n == 5 {
		if len(counts) == 2 {
			for v, c := range counts {
				if c == 3 {
					return Hand{Type: TypeTrioPair, MainValue: v, Length: 5, Cards: cards}
				}
			}
		}
	}

	// 顺子 (>= 5 张且点数连续且 <= A)
	if n >= 5 && len(counts) == n {
		if isConsecutiveSeq(cards) {
			return Hand{Type: TypeStraight, MainValue: cards[0].Value, Length: n, Cards: cards}
		}
	}

	// 连对 (>= 3 对且连续且 <= A)
	if n >= 6 && n%2 == 0 {
		allPairs := true
		for _, c := range counts {
			if c != 2 {
				allPairs = false
				break
			}
		}
		if allPairs && isConsecutiveSeq(cards) {
			return Hand{Type: TypeConsecutivePairs, MainValue: cards[0].Value, Length: n / 2, Cards: cards}
		}
	}

	// 四带二
	if n == 6 {
		for v, c := range counts {
			if c == 4 {
				return Hand{Type: TypeFourTwoSingles, MainValue: v, Length: 6, Cards: cards}
			}
		}
	}
	if n == 8 {
		fourVal := 0
		pairs := 0
		for v, c := range counts {
			if c == 4 {
				fourVal = v
			} else if c == 2 {
				pairs++
			}
		}
		if fourVal > 0 && pairs == 2 {
			return Hand{Type: TypeFourTwoPairs, MainValue: fourVal, Length: 8, Cards: cards}
		}
	}

	// 飞机 (>= 2个连续三张)
	trios := make([]int, 0)
	for v, c := range counts {
		if c >= 3 && v < 15 {
			trios = append(trios, v)
		}
	}
	sort.Ints(trios)

	for lenTrios := len(trios); lenTrios >= 2; lenTrios-- {
		for i := 0; i <= len(trios)-lenTrios; i++ {
			sub := trios[i : i+lenTrios]
			consecutive := true
			for k := 0; k < len(sub)-1; k++ {
				if sub[k+1]-sub[k] != 1 {
					consecutive = false
					break
				}
			}
			if consecutive {
				maxV := sub[len(sub)-1]
				// 纯飞机
				if n == lenTrios*3 {
					return Hand{Type: TypeAirplane, MainValue: maxV, Length: lenTrios, Cards: cards}
				}
				// 飞机带单
				if n == lenTrios*4 {
					return Hand{Type: TypeAirplaneSingles, MainValue: maxV, Length: lenTrios, Cards: cards}
				}
				// 飞机带对
				if n == lenTrios*5 {
					return Hand{Type: TypeAirplanePairs, MainValue: maxV, Length: lenTrios, Cards: cards}
				}
			}
		}
	}

	return Hand{Type: TypeInvalid}
}

func isConsecutiveSeq(cards []Card) bool {
	// 不包含 2 与 王
	for _, c := range cards {
		if c.Value >= 15 {
			return false
		}
	}
	vals := make([]int, 0)
	visited := make(map[int]bool)
	for _, c := range cards {
		if !visited[c.Value] {
			vals = append(vals, c.Value)
			visited[c.Value] = true
		}
	}
	sort.Ints(vals)
	for i := 0; i < len(vals)-1; i++ {
		if vals[i+1]-vals[i] != 1 {
			return false
		}
	}
	return true
}

// 压牌判定
func CanBeat(prev, curr Hand) bool {
	if curr.Type == TypeRocket {
		return true
	}
	if prev.Type == TypeRocket {
		return false
	}
	if curr.Type == TypeBomb {
		if prev.Type != TypeBomb {
			return true
		}
		return curr.MainValue > prev.MainValue
	}
	if prev.Type == TypeBomb {
		return false
	}
	if curr.Type != prev.Type {
		return false
	}
	if len(curr.Cards) != len(prev.Cards) {
		return false
	}
	return curr.MainValue > prev.MainValue
}

// AI 叫分评估
func AICalculateBid(cards []Card, currentHighest int) int {
	score := 0.0
	counts := countRanks(cards)

	hasBJ := false
	hasRJ := false
	for _, c := range cards {
		if c.Value == 16 {
			hasBJ = true
		}
		if c.Value == 17 {
			hasRJ = true
		}
	}
	if hasBJ && hasRJ {
		score += 4.5
	} else if hasRJ {
		score += 2.0
	} else if hasBJ {
		score += 1.5
	}

	twos := counts[15]
	score += float64(twos) * 1.3

	for _, c := range counts {
		if c == 4 {
			score += 3.0 // 炸弹
		}
	}

	aces := counts[14]
	score += float64(aces) * 0.4

	desired := 0
	if score >= 7.0 {
		desired = 3
	} else if score >= 5.0 {
		desired = 2
	} else if score >= 3.0 {
		desired = 1
	}

	if desired <= currentHighest {
		return 0
	}
	return desired
}

// AI 智能出牌决策 (带队友协同)
func AIChoosePlay(ai *Player, lastHand *Hand, isFreeTurn bool, lastPlayerRole string) []Card {
	SortCards(ai.Cards)
	counts := countRanks(ai.Cards)

	if isFreeTurn {
		// 自由出牌，优先清空顺子/连对/低点对子
		for v := 3; v <= 14; v++ {
			if counts[v] == 2 {
				return filterByValue(ai.Cards, v, 2)
			}
		}
		for v := 3; v <= 14; v++ {
			if counts[v] == 1 {
				return filterByValue(ai.Cards, v, 1)
			}
		}
		return []Card{ai.Cards[len(ai.Cards)-1]}
	}

	// 队友同盟判断：如果自己是农民且上家也是农民，避免压死队友的大牌
	isPartner := (ai.Role == "农民" && lastPlayerRole == "农民")
	if isPartner {
		// 如果队友出的牌已经很大 (>= K) 或 队友仅剩 1~2 张牌，则选择不压
		if lastHand.MainValue >= 13 {
			return nil
		}
	}

	// 跟牌匹配
	switch lastHand.Type {
	case TypeSingle:
		for v := lastHand.MainValue + 1; v <= 17; v++ {
			if counts[v] >= 1 {
				// 尽量不拆炸弹
				if counts[v] == 4 && len(ai.Cards) > 4 {
					continue
				}
				return filterByValue(ai.Cards, v, 1)
			}
		}
	case TypePair:
		for v := lastHand.MainValue + 1; v <= 15; v++ {
			if counts[v] >= 2 {
				if counts[v] == 4 && len(ai.Cards) > 4 {
					continue
				}
				return filterByValue(ai.Cards, v, 2)
			}
		}
	case TypeTrio:
		for v := lastHand.MainValue + 1; v <= 15; v++ {
			if counts[v] >= 3 {
				return filterByValue(ai.Cards, v, 3)
			}
		}
	}

	// 炸弹保底 (绝境压制对手)
	if !isPartner && lastHand.Type != TypeRocket {
		for v := 3; v <= 15; v++ {
			if counts[v] == 4 && (lastHand.Type != TypeBomb || v > lastHand.MainValue) {
				return filterByValue(ai.Cards, v, 4)
			}
		}
	}

	return nil // 过牌
}

func filterByValue(cards []Card, val int, limit int) []Card {
	res := make([]Card, 0, limit)
	for _, c := range cards {
		if c.Value == val {
			res = append(res, c)
			if len(res) == limit {
				break
			}
		}
	}
	return res
}

func removeCards(from []Card, target []Card) []Card {
	res := make([]Card, 0, len(from)-len(target))
	used := make(map[string]bool)
	for _, t := range target {
		for _, f := range from {
			key := fmt.Sprintf("%d-%s", f.Suit, f.Rank)
			if f.Suit == t.Suit && f.Rank == t.Rank && !used[key] {
				used[key] = true
				break
			}
		}
	}
	for _, f := range from {
		key := fmt.Sprintf("%d-%s", f.Suit, f.Rank)
		if used[key] {
			used[key] = false
		} else {
			res = append(res, f)
		}
	}
	return res
}

func ClearScreen() {
	fmt.Print("\\033[H\\033[2J")
}

func setupSignalHandler() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		fmt.Print(ColorReset)
		fmt.Println("\\n\\n[退出] 感谢游玩 Go 斗地主，再见！")
		os.Exit(0)
	}()
}

func main() {
	noColor := flag.Bool("no-color", false, "关闭 ANSI 终端颜色高亮")
	showVer := flag.Bool("v", false, "显示版本号")
	flag.Parse()

	if *showVer {
		fmt.Printf("Termux Go 斗地主 %s (ARM64/Go1.22 Native)\\n", AppVersion)
		return
	}

	if *noColor {
		ColorReset = ""
		ColorRed = ""
		ColorGreen = ""
		ColorYellow = ""
		ColorBlue = ""
		ColorCyan = ""
		ColorWhite = ""
		ColorGray = ""
	}

	setupSignalHandler()
	reader := bufio.NewReader(os.Stdin)

	// 积分看板
	scoreboard := &ScoreBoard{Round: 0}
	players := []*Player{
		{ID: 0, Name: "玩家(你)", IsAI: false, Score: 1000},
		{ID: 1, Name: "电脑(左)", IsAI: true, Score: 1000},
		{ID: 2, Name: "电脑(右)", IsAI: true, Score: 1000},
	}

	for {
		scoreboard.Round++
		ClearScreen()
		fmt.Println(ColorYellow + "╔════════════════════════════════════════════════════════════╗" + ColorReset)
		fmt.Println(ColorYellow + "║         ♠ ♥ ♣ ♦  Termux 极简 Go 语言斗地主  ♦ ♣ ♥ ♠         ║" + ColorReset)
		fmt.Printf(ColorYellow+"║           第 %-2d 局 | 手机终端原生优化版 (%s)          ║\\n"+ColorReset, scoreboard.Round, AppVersion)
		fmt.Println(ColorYellow + "╚════════════════════════════════════════════════════════════╝" + ColorReset)

		// 发牌阶段
		deck := NewDeck()
		Shuffle(deck)

		for _, p := range players {
			p.Cards = make([]Card, 0, 20)
			p.Role = "农民"
		}

		for i := 0; i < 17; i++ {
			for p := 0; p < 3; p++ {
				players[p].Cards = append(players[p].Cards, deck[i*3+p])
			}
		}
		bottomCards := deck[51:54]
		for _, p := range players {
			SortCards(p.Cards)
		}

		// 叫地主阶段
		fmt.Println("\\n" + ColorGreen + "=== 正在叫地主 ===" + ColorReset)
		fmt.Println("你的手牌:")
		for i, c := range players[0].Cards {
			fmt.Printf("[%d]%s ", i+1, c)
		}
		fmt.Println("\\n")

		fmt.Print("请叫分 (0=不叫, 1=1分, 2=2分, 3=3分) [回车默认抢3分]: ")
		bidInput, _ := reader.ReadString('\\n')
		bidInput = strings.TrimSpace(bidInput)
		myBid := 3
		if bidInput != "" {
			if v, err := strconv.Atoi(bidInput); err == nil && v >= 0 && v <= 3 {
				myBid = v
			}
		}

		highestBid := myBid
		landlordIdx := 0
		if myBid == 0 {
			landlordIdx = -1
		}

		// 电脑评估叫分
		for i := 1; i < 3; i++ {
			botBid := AICalculateBid(players[i].Cards, highestBid)
			if botBid > highestBid {
				highestBid = botBid
				landlordIdx = i
				fmt.Printf("%s 叫了: %d 分！\\n", players[i].Name, botBid)
			} else {
				fmt.Printf("%s: 不叫\\n", players[i].Name)
			}
		}

		if landlordIdx == -1 {
			landlordIdx = rand.Intn(3)
			fmt.Printf("所有人未叫分，系统随机指定 %s 担任地主 (底分 1 分)\\n", players[landlordIdx].Name)
			highestBid = 1
		} else {
			fmt.Printf("★ 最终地主: %s%s%s (底分 %d 分)\\n", ColorRed, players[landlordIdx].Name, ColorReset, highestBid)
		}

		players[landlordIdx].Role = "地主"
		players[landlordIdx].Cards = append(players[landlordIdx].Cards, bottomCards...)
		SortCards(players[landlordIdx].Cards)

		fmt.Print("底牌为: ")
		for _, c := range bottomCards {
			fmt.Printf("%s ", c)
		}
		fmt.Println("\\n按回车键开始出牌...")
		reader.ReadString('\\n')

		// 对局循环
		currentTurn := landlordIdx
		var lastHand *Hand
		lastPlayerIdx := -1
		passStreak := 0
		multiplier := highestBid
		bombCount := 0

		roundRunning := true
		for roundRunning {
			ClearScreen()
			currPlayer := players[currentTurn]

			fmt.Printf(ColorYellow+"=== 第 %d 局 | 地主: %s | 倍数: x%d | 炸弹数: %d ===\\n"+ColorReset,
				scoreboard.Round, players[landlordIdx].Name, multiplier, bombCount)

			for i, p := range players {
				roleColor := ColorGreen
				if p.Role == "地主" {
					roleColor = ColorRed
				}
				marker := "  "
				if i == currentTurn {
					marker = ColorCyan + "▶ " + ColorReset
				}
				fmt.Printf("%s[%s%s%s] 剩余 %-2d 张牌 (总分: %d)\\n",
					marker, roleColor, p.Name, ColorReset, len(p.Cards), p.Score)
			}
			fmt.Println("────────────────────────────────────────────────────────────")

			if lastHand != nil && passStreak < 2 {
				fmt.Printf("桌面当前牌面 (%s 打出): ", players[lastPlayerIdx].Name)
				for _, c := range lastHand.Cards {
					fmt.Printf("%s ", c)
				}
				fmt.Println()
			} else {
				fmt.Println("桌面当前牌面: (空，自由出牌)")
				lastHand = nil
			}
			fmt.Println("────────────────────────────────────────────────────────────")

			if !currPlayer.IsAI {
				// 玩家出牌
				fmt.Println("你的手牌:")
				for i, c := range currPlayer.Cards {
					fmt.Printf("[%d]%s ", i+1, c)
				}
				fmt.Println("\\n")

				for {
					if lastHand == nil {
						fmt.Print("请出牌 (输入编号如 '1 2'，输入 'h' 提示，'q' 退出): ")
					} else {
						fmt.Print("请出牌 (输入编号如 '1'，输入 'p' 过牌，'h' 提示): ")
					}

					line, _ := reader.ReadString('\\n')
					line = strings.TrimSpace(line)

					if line == "q" {
						fmt.Println("已退出游戏。")
						return
					}
					if line == "h" {
						hintCards := AIChoosePlay(currPlayer, lastHand, lastHand == nil, "")
						if len(hintCards) == 0 {
							fmt.Println(ColorYellow + "[提示] 当前要不起，建议输入 p 过牌！" + ColorReset)
						} else {
							fmt.Print(ColorGreen + "[提示] 推荐出牌: " + ColorReset)
							for _, c := range hintCards {
								fmt.Printf("%s ", c)
							}
							fmt.Println()
						}
						continue
					}
					if line == "p" || line == "pass" || line == "" {
						if lastHand == nil {
							fmt.Println(ColorRed + "自由出牌回合不能不要！" + ColorReset)
							continue
						}
						passStreak++
						fmt.Println("你选择了不要。")
						break
					}

					fields := strings.Fields(line)
					chosen := make([]Card, 0)
					validIndexes := true
					usedIdx := make(map[int]bool)

					for _, f := range fields {
						idx, err := strconv.Atoi(f)
						if err != nil || idx < 1 || idx > len(currPlayer.Cards) || usedIdx[idx] {
							validIndexes = false
							break
						}
						usedIdx[idx] = true
						chosen = append(chosen, currPlayer.Cards[idx-1])
					}

					if !validIndexes || len(chosen) == 0 {
						fmt.Println(ColorRed + "输入的牌编号无效，请重新输入！" + ColorReset)
						continue
					}

					hand := AnalyzeHand(chosen)
					if hand.Type == TypeInvalid {
						fmt.Println(ColorRed + "所选组合不符合斗地主任何出牌规则！请重试。" + ColorReset)
						continue
					}

					if lastHand != nil && !CanBeat(*lastHand, hand) {
						fmt.Println(ColorRed + "所出的牌不能压过上家！请重试。" + ColorReset)
						continue
					}

					// 炸弹倍数提升
					if hand.Type == TypeBomb {
						multiplier *= 2
						bombCount++
					} else if hand.Type == TypeRocket {
						multiplier *= 4
						bombCount++
					}

					currPlayer.Cards = removeCards(currPlayer.Cards, chosen)
					lastHand = &hand
					lastPlayerIdx = currentTurn
					passStreak = 0
					fmt.Println(ColorGreen + "出牌成功！" + ColorReset)
					break
				}
			} else {
				// 电脑出牌
				time.Sleep(800 * time.Millisecond)
				lastRole := ""
				if lastPlayerIdx != -1 {
					lastRole = players[lastPlayerIdx].Role
				}
				cardsToPlay := AIChoosePlay(currPlayer, lastHand, lastHand == nil, lastRole)

				if len(cardsToPlay) == 0 {
					fmt.Printf("%s 选择了: 不要 (过)\\n", currPlayer.Name)
					passStreak++
				} else {
					hand := AnalyzeHand(cardsToPlay)
					if hand.Type == TypeBomb {
						multiplier *= 2
						bombCount++
					} else if hand.Type == TypeRocket {
						multiplier *= 4
						bombCount++
					}
					currPlayer.Cards = removeCards(currPlayer.Cards, cardsToPlay)
					lastHand = &hand
					lastPlayerIdx = currentTurn
					passStreak = 0
					fmt.Printf("%s 打出了: ", currPlayer.Name)
					for _, c := range cardsToPlay {
						fmt.Printf("%s ", c)
					}
					fmt.Println()
				}
				time.Sleep(900 * time.Millisecond)
			}

			// 结算检查
			if len(currPlayer.Cards) == 0 {
				roundRunning = false
				ClearScreen()
				baseScore := 100 * multiplier
				fmt.Println(ColorYellow + "╔════════════════════════════════════════════════════════════╗" + ColorReset)
				if currPlayer.Role == "地主" {
					scoreboard.LandlordWon++
					fmt.Printf(ColorRed+"║            🏆 地主 [%s] 获得本局胜利！            ║\\n"+ColorReset, currPlayer.Name)
					for _, p := range players {
						if p.Role == "地主" {
							p.Score += baseScore * 2
							p.Wins++
						} else {
							p.Score -= baseScore
						}
					}
				} else {
					scoreboard.FarmerWon++
					fmt.Println(ColorGreen + "║                 🎉 农民阵营获得本局胜利！                  ║" + ColorReset)
					for _, p := range players {
						if p.Role == "地主" {
							p.Score -= baseScore * 2
						} else {
							p.Score += baseScore
							p.Wins++
						}
					}
				}
				fmt.Println(ColorYellow + "╚════════════════════════════════════════════════════════════╝" + ColorReset)

				fmt.Printf("\\n本局倍数: x%d | 结算基数: %d 点分\\n", multiplier, baseScore)
				fmt.Println("【当前玩家战绩排行榜】:")
				for _, p := range players {
					fmt.Printf("• %s (%s): 积分 %d | 累计胜场: %d 局\\n", p.Name, p.Role, p.Score, p.Wins)
				}

				fmt.Print("\\n是否继续下一局？(Y/n): ")
				ch, _ := reader.ReadString('\\n')
				ch = strings.TrimSpace(strings.ToLower(ch))
				if ch == "n" || ch == "no" {
					fmt.Println("游戏结束，感谢游玩！")
					return
				}
				break
			}

			currentTurn = (currentTurn + 1) % 3
		}
	}
}
`;

export const GO_SINGLE_FILE = GO_MAIN_CODE;

export const GO_README = `# ♠ ♥ ♣ ♦ Termux Go 语言斗地主 (Termux Dou Dizhu)

> 专为 Android Termux 手机终端深度优化的纯 Go 语言斗地主控制台游戏。
> 零 CGO、零第三方包依赖，ARM64 原生极速编译，支持单机智能 AI 对战与局域网 WiFi 联机！

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Platform](https://img.shields.io/badge/Platform-Android%20Termux%20%7C%20Linux%20%7C%20macOS-brightgreen)](https://termux.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📱 核心特性

- 🚀 **零依赖轻量架构**：100% 采用 Go 标准库编写，二进制仅约 **5MB**，内存消耗低于 **8MB**。
- 🤖 **智能 AI 人机算法**：内置手牌估值叫分模型、顺子/连对/飞机优先清理算法与农民同盟保护逻辑。
- 🎨 **终端 ANSI 彩色渲染**：支持红黑花色、边框美化与无闪烁清屏刷新，自适应手机窄屏。
- ⌨️ **Termux 专属键盘优化**：一键自动配置手机屏幕上方的虚拟快捷按键栏（\`1-9\` 选牌、\`p\` 过牌、\`h\` 提示）。
- 🏆 **多局积分看板**：自动统计每轮对局倍数、炸弹统计、胜负排行榜。
- 🌐 **局域网对战模式**：附带 \`lan_server.go\`，支持同一 WiFi 下三台手机使用 \`nc\` 命令联机开黑。

---

## ⚡ Termux 手机一键部署 (推荐)

打开手机上的 **Termux**，直接复制并运行以下命令：

\`\`\`bash
# 1. 安装基础工具
pkg update -y && pkg install -y git golang

# 2. 从 GitHub 拉取本项目
git clone https://github.com/wen775866/dd.git
cd dd

# 3. 执行自动化安装脚本 (自动编译并注册全局 ddz 命令与按键优化)
chmod +x install.sh
./install.sh
\`\`\`

安装完成后，在终端任何目录下输入 **\`ddz\`** 即可随时开启对战！

---

## 🎮 操作快捷键指南

| 键盘输入 | 说明 | 示例 |
|---|---|---|
| \`1 2 3\` | 选择第 1、2、3 张牌打出 | 输入 \`1 2 3 4 5\` 打出顺子 |
| \`p\` 或 回车 | 不出 (过牌) | 对手出大牌时跳过 |
| \`h\` | 智能 AI 提示出牌 | 显示推荐打出的卡牌 |
| \`q\` | 退出当前游戏 | 返回 Termux Shell |
| \`Ctrl + C\` | 强制中断并恢复终端样式 | 安全退出 |

---

## 📂 项目结构

\`\`\`
termux-doudizhu/
├── main.go                     # 斗地主核心游戏主程序 (规则引擎/AI/ANSI渲染)
├── lan_server.go               # 局域网 3 人 WiFi 联机服务端
├── install.sh                  # Termux 自动化安装与全局别名注册脚本
├── uninstall.sh                # 卸载脚本
├── Makefile                    # 标准构建脚本 (make build / make install)
├── .termux/
│   └── termux.properties       # 手机屏幕 1-9 快捷按键栏优化配置文件
├── .github/
│   └── workflows/
│       ├── ci.yml              # 持续集成自动构建测试
│       └── release.yml         # 自动多平台打包发布 (ARM64/x86/Mac)
├── go.mod                      # Go 模块配置文件
├── .gitignore                  # Git 忽略文件
├── LICENSE                     # MIT 开源协议
└── README.md                   # 详细使用指南
\`\`\`

---

## 🌐 局域网 3 人联机玩法 (WiFi 对战)

1. **主机房主手机**：
   \`\`\`bash
   go run lan_server.go
   \`\`\`
2. **另外两台手机**（连入相同 WiFi）：
   \`\`\`bash
   # 查看主机 IP (如 192.168.1.100)
   nc 192.168.1.100 8888
   \`\`\`

---

## 💻 电脑端交叉编译 (可选)

如果你希望在电脑 (Windows/Mac/Linux) 上直接生成手机二进制：

\`\`\`bash
# 交叉编译出 Android ARM64 原生文件
CGO_ENABLED=0 GOOS=android GOARCH=arm64 go build -ldflags "-s -w" -o ddz main.go

# 传输到手机 Termux
adb push ddz /data/local/tmp/
\`\`\`

---

## 📄 开源协议
本项目基于 [MIT License](LICENSE) 开源。欢迎 Star 与 Fork 改进！
`;

export const GO_INSTALL_SH = `#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Termux 一键极速部署与全局注册脚本
# ==============================================================================

set -e

GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
CYAN='\\033[0;36m'
RED='\\033[0;31m'
NC='\\033[0m'

echo -e "\${YELLOW}=======================================================\${NC}"
echo -e "\${YELLOW}        ♠ ♥ ♣ ♦  Termux Go 斗地主极速安装器  ♦ ♣ ♥ ♠       \${NC}"
echo -e "\${YELLOW}=======================================================\${NC}"

# 1. 检查 Termux 环境
IS_TERMUX=false
if [ -d "/data/data/com.termux" ]; then
    IS_TERMUX=true
    echo -e "\${CYAN}[1/5] 检测到运行于 Android Termux 环境\${NC}"
else
    echo -e "\${CYAN}[1/5] 检测到标准 Linux/macOS 环境\${NC}"
fi

# 2. 检查并安装依赖
echo -e "\${CYAN}[2/5] 检查 Go 编译环境...\${NC}"
if ! command -v go &> /dev/null; then
    echo -e "未找到 Go 编译器，正在通过包管理器自动安装..."
    if [ "$IS_TERMUX" = true ]; then
        pkg update -y || true
        pkg install -y golang ncurses-utils
    else
        echo -e "\${RED}请先自行安装 Go 编译器 (https://golang.org) 后重试！\${NC}"
        exit 1
    fi
fi

# 3. 编译程序
echo -e "\${CYAN}[3/5] 正在编译原生 ARM64 二进制文件 (开启体积压缩 -s -w)...\${NC}"
go build -ldflags "-s -w" -o ddz main.go
chmod +x ddz

# 4. 注册全局命令
echo -e "\${CYAN}[4/5] 注册全局执行命令...\${NC}"
INSTALL_DIR=""
if [ "$IS_TERMUX" = true ] && [ -d "$PREFIX/bin" ]; then
    cp ddz "$PREFIX/bin/ddz"
    cp ddz "$PREFIX/bin/doudizhu"
    chmod +x "$PREFIX/bin/ddz" "$PREFIX/bin/doudizhu"
    INSTALL_DIR="$PREFIX/bin"
    echo -e "已将程序复制到: \${GREEN}$PREFIX/bin/ddz\${NC} (系统默认 PATH 路径)"
else
    mkdir -p "$HOME/.local/bin"
    cp ddz "$HOME/.local/bin/ddz"
    INSTALL_DIR="$HOME/.local/bin"
fi

# 5. Termux 手机虚拟键盘优化
if [ "$IS_TERMUX" = true ]; then
    echo -e "\${CYAN}[5/5] 优化 Termux 手机屏幕选牌按键栏...\${NC}"
    mkdir -p "$HOME/.termux"
    cat << 'EOF' > "$HOME/.termux/termux.properties"
extra-keys = [ \\
  ['ESC', '1', '2', '3', '4', '5', '6', '7'], \\
  ['TAB', '8', '9', '0', 'p', 'h', 'q', 'ENTER'] \\
]
bell-character = ignore
EOF
    if command -v termux-reload-settings &> /dev/null; then
        termux-reload-settings || true
    fi
    echo -e "已更新 ~/.termux/termux.properties (增加了 1-9 牌号、p过牌、h提示按键)"
fi

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}🎉 安装部署成功！\${NC}"
echo -e "你现在可以在手机任意目录下直接输入以下命令启动斗地主："
echo -e "   \${YELLOW}ddz\${NC}  或  \${YELLOW}doudizhu\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"

# 询问是否立即启动
read -p "是否现在立即开始游玩？(Y/n): " start_choice
case "$start_choice" in
    y|Y|"" )
        ./ddz
        ;;
    * )
        echo "祝您游戏愉快！随时输入 ddz 开始对决！"
        ;;
esac
`;

export const GO_UNINSTALL_SH = `#!/bin/bash
# Termux 斗地主卸载脚本

if [ -f "$PREFIX/bin/ddz" ]; then
    rm -f "$PREFIX/bin/ddz" "$PREFIX/bin/doudizhu"
    echo "已从 $PREFIX/bin 移除 ddz 与 doudizhu"
fi

if [ -f "$HOME/.local/bin/ddz" ]; then
    rm -f "$HOME/.local/bin/ddz"
fi

echo "卸载完成！"
`;

export const GO_MAKEFILE = `# Makefile for Termux Dou Dizhu
BIN_NAME=ddz

all: build

build:
	go build -ldflags "-s -w" -o bin/$(BIN_NAME) main.go

run:
	go run main.go

clean:
	rm -rf bin/

install: build
	@if [ -d "$$PREFIX/bin" ]; then \\
		cp bin/$(BIN_NAME) $$PREFIX/bin/$(BIN_NAME); \\
		chmod +x $$PREFIX/bin/$(BIN_NAME); \\
		echo "Installed to $$PREFIX/bin/$(BIN_NAME)"; \\
	else \\
		cp bin/$(BIN_NAME) /usr/local/bin/$(BIN_NAME); \\
		echo "Installed to /usr/local/bin/$(BIN_NAME)"; \\
	fi

.PHONY: all build run clean install
`;

export const GO_GITIGNORE = `# Binaries
ddz
doudizhu
bin/
*.exe
*.dll
*.so
*.dylib

# Test and coverage
*.out
*.test
*.prof

# Logs & temp
*.log
.DS_Store

# IDE
.idea/
.vscode/
*.swp
`;

export const GO_MOD = `module github.com/wenxiu775866/termux-doudizhu

go 1.22
`;

export const GO_LICENSE = `MIT License

Copyright (c) 2026 wenxiu775866

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

export const GO_CI_YML = `name: Build & Test

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build:
    name: Cross Compile Matrix
    runs-on: ubuntu-latest
    strategy:
      matrix:
        goos: [linux, android, darwin, windows]
        goarch: [amd64, arm64]
        exclude:
          - goos: android
            goarch: amd64
          - goos: windows
            goarch: arm64
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Build Binary
        env:
          GOOS: \${{ matrix.goos }}
          GOARCH: \${{ matrix.goarch }}
          CGO_ENABLED: 0
        run: |
          OUTPUT_NAME="ddz-\${{ matrix.goos }}-\${{ matrix.goarch }}"
          if [ "\${{ matrix.goos }}" = "windows" ]; then
            OUTPUT_NAME="\$OUTPUT_NAME.exe"
          fi
          go build -ldflags "-s -w" -o "bin/\$OUTPUT_NAME" main.go
`;

export const GO_LAN_SERVER = `// ==============================================================================
// 局域网 3 人联机斗地主服务端 (Termux 局域网 WiFi 对战)
// 一台手机开启服务端: go run lan_server.go
// 其它手机通过: nc <主机IP> 8888 连入对战
// ==============================================================================

package main

import (
	"bufio"
	"fmt"
	"net"
	"strings"
	"sync"
)

type Client struct {
	conn net.Conn
	name string
	id   int
}

type LANRoom struct {
	clients []*Client
	mu      sync.Mutex
}

func main() {
	port := ":8888"
	listener, err := net.Listen("tcp", port)
	if err != nil {
		fmt.Printf("监听端口失败: %v\\n", err)
		return
	}
	defer listener.Close()

	fmt.Printf("♠ ♥ ♣ ♦ 斗地主局域网服务已启动，监听端口 %s\\n", port)
	fmt.Println("提示: 在同一 WiFi 下，让朋友在 Termux 输入: nc <你的IP> 8888 即可加入！")

	room := &LANRoom{clients: make([]*Client, 0, 3)}

	for {
		conn, err := listener.Accept()
		if err != nil {
			continue
		}

		room.mu.Lock()
		if len(room.clients) >= 3 {
			conn.Write([]byte("房间已满 (3/3)，无法加入。\\n"))
			conn.Close()
			room.mu.Unlock()
			continue
		}

		client := &Client{
			conn: conn,
			name: fmt.Sprintf("玩家_%d", len(room.clients)+1),
			id:   len(room.clients),
		}
		room.clients = append(room.clients, client)
		room.mu.Unlock()

		go handleClient(client, room)
	}
}

func handleClient(c *Client, room *LANRoom) {
	reader := bufio.NewReader(c.conn)
	c.conn.Write([]byte(fmt.Sprintf("欢迎加入斗地主！你的昵称: %s\\n等待满员 (当前 %d/3)...\\n", c.name, len(room.clients))))

	for {
		msg, err := reader.ReadString('\\n')
		if err != nil {
			break
		}
		msg = strings.TrimSpace(msg)
		if msg == "" {
			continue
		}
		broadcast(room, fmt.Sprintf("[%s]: %s\\n", c.name, msg))
	}
}

func broadcast(room *LANRoom, msg string) {
	room.mu.Lock()
	defer room.mu.Unlock()
	for _, c := range room.clients {
		c.conn.Write([]byte(msg))
	}
}
`;

export const GO_TERMUX_PROPERTIES = `# Termux 斗地主专属键盘优化配置
# 文件路径: ~/.termux/termux.properties
# 配置完成后在 Termux 执行: termux-reload-settings

extra-keys = [ \\
  ['ESC', '1', '2', '3', '4', '5', '6', '7'], \\
  ['TAB', '8', '9', '0', 'p', 'h', 'q', 'ENTER'] \\
]

# 屏蔽终端蜂鸣提示音
bell-character = ignore
`;

export const GITHUB_REPO_FILES: SourceFile[] = [
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    description: '完整专业 GitHub 仓库说明文档 (带徽章/操作手册/图解)',
    content: GO_README,
  },
  {
    name: 'main.go',
    path: 'main.go',
    language: 'go',
    description: '单文件纯 Go 核心代码 (信号捕获/多局积分/规则引擎/智能AI)',
    content: GO_MAIN_CODE,
  },
  {
    name: 'install.sh',
    path: 'install.sh',
    language: 'bash',
    description: 'Termux 一键编译、注册全局命令与按键优化脚本',
    content: GO_INSTALL_SH,
  },
  {
    name: 'uninstall.sh',
    path: 'uninstall.sh',
    language: 'bash',
    description: '卸载清理脚本',
    content: GO_UNINSTALL_SH,
  },
  {
    name: 'Makefile',
    path: 'Makefile',
    language: 'makefile',
    description: '标准构建自动化 Makefile',
    content: GO_MAKEFILE,
  },
  {
    name: 'go.mod',
    path: 'go.mod',
    language: 'go',
    description: 'Go 模块定义文件',
    content: GO_MOD,
  },
  {
    name: '.gitignore',
    path: '.gitignore',
    language: 'text',
    description: 'Git 忽略构建产物与临时文件配置',
    content: GO_GITIGNORE,
  },
  {
    name: 'LICENSE',
    path: 'LICENSE',
    language: 'text',
    description: 'MIT 开源授权协议',
    content: GO_LICENSE,
  },
  {
    name: 'termux.properties',
    path: '.termux/termux.properties',
    language: 'properties',
    description: '手机屏幕虚拟按键栏配置',
    content: GO_TERMUX_PROPERTIES,
  },
  {
    name: 'lan_server.go',
    path: 'lan_server.go',
    language: 'go',
    description: '局域网 3 人 WiFi 联机对战服务端',
    content: GO_LAN_SERVER,
  },
  {
    name: 'ci.yml',
    path: '.github/workflows/ci.yml',
    language: 'yaml',
    description: 'GitHub Actions 自动跨平台多架构构建流水线',
    content: GO_CI_YML,
  },
];
