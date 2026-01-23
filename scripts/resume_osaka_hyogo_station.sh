#!/bin/bash

# 大阪府と兵庫県の駅データ生成を続きから再開するスクリプト
# 建物（house）と土地（land）の両方を生成

cd /Users/milk/urico-kansai

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 大阪府・兵庫県の駅データ生成を再開します"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 建物（house）データ生成
echo "🏠 建物（house）データ生成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 大阪府（駅）- 建物
echo "🚀 大阪府（駅・建物）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "大阪府" >> batch_station_osaka_house.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_osaka_house.log"
echo ""

# 兵庫県（駅）- 建物
echo "🚀 兵庫県（駅・建物）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "兵庫県" >> batch_station_hyogo_house.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_hyogo_house.log"
echo ""

# 少し待機
sleep 2

# 土地（land）データ生成
echo "🏞️  土地（land）データ生成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 大阪府（駅）- 土地
echo "🚀 大阪府（駅・土地）を再開中..."
nohup node scripts/batch_generate_land.mjs --mode station --pref "大阪府" >> batch_station_osaka_land.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_osaka_land.log"
echo ""

# 兵庫県（駅）- 土地
echo "🚀 兵庫県（駅・土地）を再開中..."
nohup node scripts/batch_generate_land.mjs --mode station --pref "兵庫県" >> batch_station_hyogo_land.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_hyogo_land.log"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 4つのプロセスを起動しました"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 進捗確認:"
echo "   tail -f batch_station_osaka_*.log batch_station_hyogo_*.log"
echo ""
echo "🛑 停止方法:"
echo "   pkill -f 'batch_generate.*(大阪府|兵庫県)'"
