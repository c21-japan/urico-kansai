#!/bin/bash

# 自動監視・復旧システムをバックグラウンドで起動

cd /Users/milk/urico-kansai

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 自動監視・復旧システムを起動します"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 このシステムは:"
echo "   1. プロセスを1分ごとに監視"
echo "   2. 停止したプロセスを自動的に再起動"
echo "   3. 全て完了したらエラー再生成を自動実行"
echo "   4. 完全自動で動作（確認不要）"
echo ""

# バックグラウンドで実行
nohup node scripts/auto_monitor_and_continue.mjs > auto_monitor.log 2>&1 &

PID=$!
echo "✅ 監視システムを起動しました"
echo "   PID: $PID"
echo "   ログ: auto_monitor.log"
echo ""
echo "📊 監視状況を確認:"
echo "   tail -f auto_monitor.log"
echo ""
echo "🛑 停止方法:"
echo "   pkill -f auto_monitor_and_continue.mjs"
echo ""
