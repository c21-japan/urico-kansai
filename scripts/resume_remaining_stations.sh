#!/bin/bash

# 残りの駅データ生成を続きから再開するスクリプト

cd /Users/milk/urico-kansai

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 残りの駅データ生成を再開します"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 建物（house）データ生成
echo "🏠 建物（house）データ生成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 大阪府（駅）- 建物（残り332件）
echo "🚀 大阪府（駅・建物）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "大阪府" >> batch_station_osaka_house.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_osaka_house.log"
echo ""

sleep 2

# 滋賀県（駅）- 建物（残り122件）
echo "🚀 滋賀県（駅・建物）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "滋賀県" >> batch_station_shiga_house.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_shiga_house.log"
echo ""

sleep 2

# 京都府（駅）- 建物（残り195件）
echo "🚀 京都府（駅・建物）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "京都府" >> batch_station_kyoto_house.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_kyoto_house.log"
echo ""

sleep 2

# 兵庫県（駅）- 建物（残り276件）
echo "🚀 兵庫県（駅・建物）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "兵庫県" >> batch_station_hyogo_house.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_hyogo_house.log"
echo ""

sleep 2

# 土地（land）データ生成
echo "🏞️  土地（land）データ生成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 大阪府（駅）- 土地（残り299件）
echo "🚀 大阪府（駅・土地）を再開中..."
nohup node scripts/batch_generate_land.mjs --mode station --pref "大阪府" >> batch_station_osaka_land.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_osaka_land.log"
echo ""

sleep 2

# 兵庫県（駅）- 土地（残り135件）
echo "🚀 兵庫県（駅・土地）を再開中..."
nohup node scripts/batch_generate_land.mjs --mode station --pref "兵庫県" >> batch_station_hyogo_land.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_hyogo_land.log"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 6つのプロセスを起動しました"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 進捗確認:"
echo "   tail -f batch_station_*_house.log batch_station_*_land.log"
echo ""
echo "🛑 停止方法:"
echo "   pkill -f batch_generate"
