# 進捗確認コマンド一覧

各プロセスの進捗を個別のターミナルで確認するコマンドです。

## 🏠 建物（house）データ生成の進捗確認

### 1. 大阪府（駅・建物）
```bash
cd /Users/milk/urico-kansai
tail -f batch_station_osaka_house.log
```

### 2. 滋賀県（駅・建物）
```bash
cd /Users/milk/urico-kansai
tail -f batch_station_shiga_house.log
```

### 3. 京都府（駅・建物）
```bash
cd /Users/milk/urico-kansai
tail -f batch_station_kyoto_house.log
```

### 4. 兵庫県（駅・建物）
```bash
cd /Users/milk/urico-kansai
tail -f batch_station_hyogo_house.log
```

## 🏞️ 土地（land）データ生成の進捗確認

### 5. 大阪府（駅・土地）
```bash
cd /Users/milk/urico-kansai
tail -f batch_station_osaka_land.log
```

### 6. 兵庫県（駅・土地）
```bash
cd /Users/milk/urico-kansai
tail -f batch_station_hyogo_land.log
```

## 📊 全体の進捗を一度に確認

### 全てのログを同時に確認
```bash
cd /Users/milk/urico-kansai
tail -f batch_station_*.log logs/batch_land_*.log
```

### 進捗サマリーを確認（数値で確認）
```bash
cd /Users/milk/urico-kansai
node scripts/check_progress.mjs
```

## 🔍 プロセス状態の確認

### 実行中のプロセスを確認
```bash
ps aux | grep batch_generate | grep -v grep
```

### プロセス数を確認
```bash
ps aux | grep batch_generate | grep -v grep | wc -l
```

## 📝 ログファイルの最新10行を確認（tail -f を使わない場合）

### 大阪府（建物）
```bash
cd /Users/milk/urico-kansai
tail -20 batch_station_osaka_house.log
```

### 滋賀県（建物）
```bash
cd /Users/milk/urico-kansai
tail -20 batch_station_shiga_house.log
```

### 京都府（建物）
```bash
cd /Users/milk/urico-kansai
tail -20 batch_station_kyoto_house.log
```

### 兵庫県（建物）
```bash
cd /Users/milk/urico-kansai
tail -20 batch_station_hyogo_house.log
```

### 大阪府（土地）
```bash
cd /Users/milk/urico-kansai
tail -20 batch_station_osaka_land.log
```

### 兵庫県（土地）
```bash
cd /Users/milk/urico-kansai
tail -20 batch_station_hyogo_land.log
```

## 🛑 プロセスを停止する場合

### 全ての生成プロセスを停止
```bash
pkill -f batch_generate
```

### 特定の都道府県のみ停止（例：大阪府）
```bash
pkill -f "batch_generate.*大阪府"
```
