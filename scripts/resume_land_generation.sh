#!/bin/bash

# 土地データ生成：続きから再開するスクリプト
# 各都道府県を別々のバックグラウンドプロセスで実行
# 既存ファイルは自動的にスキップされるため、未生成のものだけが生成されます

cd /Users/milk/urico-kansai

PREFECTURES=("大阪府" "奈良県" "京都府" "滋賀県" "兵庫県")
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

echo "🚀 土地データ生成：5都道府県並列実行（続きから再開）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for PREF in "${PREFECTURES[@]}"; do
  LOG_FILE="$LOG_DIR/batch_land_${PREF}.log"
  echo "📍 ${PREF} をバックグラウンドで起動中..."
  echo "   ログ: ${LOG_FILE}"
  
  # バックグラウンドで実行
  nohup node scripts/batch_generate_land.mjs --pref "${PREF}" > "${LOG_FILE}" 2>&1 &
  
  echo "   PID: $!"
  echo ""
  
  # 少し待機（起動の重複を避ける）
  sleep 2
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 5つのプロセスを起動しました"
echo ""
echo "📊 ログファイル:"
for PREF in "${PREFECTURES[@]}"; do
  echo "   - ${PREF}: logs/batch_land_${PREF}.log"
done
echo ""
echo "📝 プロセス確認:"
echo "   ps aux | grep batch_generate_land"
echo ""
echo "📊 進捗確認:"
echo "   tail -f logs/batch_land_*.log"
echo ""
echo "🛑 停止方法:"
echo "   pkill -f batch_generate_land.mjs"
