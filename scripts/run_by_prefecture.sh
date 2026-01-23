#!/bin/bash

# 都道府県別に並列実行するスクリプト
# 複数のターミナルで同時実行可能

PREFECTURES=("大阪府" "奈良県" "京都府" "滋賀県" "兵庫県")
PARALLEL_COUNT=${1:-6}
TYPE_FILTER=${2:-""}

echo "🚀 都道府県別実行スクリプト"
echo "並列数: ${PARALLEL_COUNT}"
if [ -n "$TYPE_FILTER" ]; then
  echo "タイプフィルター: ${TYPE_FILTER}"
fi
echo ""

for PREF in "${PREFECTURES[@]}"; do
  echo "=========================================="
  echo "📍 ${PREF} を実行中..."
  echo "=========================================="
  
  if [ -n "$TYPE_FILTER" ]; then
    node scripts/run_parallel.js ${PARALLEL_COUNT} ${TYPE_FILTER} "${PREF}"
  else
    node scripts/run_parallel.js ${PARALLEL_COUNT} "" "${PREF}"
  fi
  
  echo ""
  echo "✅ ${PREF} 完了"
  echo ""
done

echo "🎉 すべての都道府県の実行が完了しました"
