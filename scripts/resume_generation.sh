#!/bin/bash

# 続きから生成を再開するスクリプト
# 既存ファイルは自動的にスキップされるため、未生成のものだけが生成されます

cd /Users/milk/urico-kansai

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 続きから生成を再開します"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 駅データ生成の続きから再開
echo "📍 駅データ生成を再開します..."
echo ""

# 大阪府（駅）- 続きから再開
echo "🚀 大阪府（駅）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "大阪府" >> batch_station_osaka.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_osaka.log"
echo ""

# 滋賀県（駅）- 続きから再開
echo "🚀 滋賀県（駅）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "滋賀県" >> batch_station_shiga.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_shiga.log"
echo ""

# 京都府（駅）- 続きから再開
echo "🚀 京都府（駅）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "京都府" >> batch_station_kyoto.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_kyoto.log"
echo ""

# 兵庫県（駅）- 続きから再開
echo "🚀 兵庫県（駅）を再開中..."
nohup node scripts/batch_generate.mjs --mode station --pref "兵庫県" >> batch_station_hyogo.log 2>&1 &
echo "   PID: $!"
echo "   ログ: batch_station_hyogo.log"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 駅データ生成を再開しました"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 進捗確認:"
echo "   tail -f batch_station_*.log"
echo ""
echo "🛑 停止方法:"
echo "   pkill -f batch_generate.mjs"
echo ""
