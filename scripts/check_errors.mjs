import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ログファイルのリスト
const logFiles = [
  'batch_station_osaka_house.log',
  'batch_station_shiga_house.log',
  'batch_station_kyoto_house.log',
  'batch_station_hyogo_house.log',
  'batch_station_osaka_land.log',
  'batch_station_hyogo_land.log',
  'batch_station_osaka.log',
  'batch_station_shiga.log',
  'batch_station_kyoto.log',
  'batch_station_hyogo.log',
  'batch_station_nara.log',
  'logs/batch_land_大阪府.log',
  'logs/batch_land_奈良県.log',
  'logs/batch_land_京都府.log',
  'logs/batch_land_滋賀県.log',
  'logs/batch_land_兵庫県.log'
];

// エラーパターン
const errorPatterns = [
  /❌/g,
  /エラー/g,
  /失敗/g,
  /Failed/g,
  /Error/g,
  /終了コード: [1-9]/g,
  /最大リトライ回数を超えました/g
];

function checkLogFile(logPath) {
  const fullPath = path.join(PROJECT_ROOT, logPath);
  
  if (!fs.existsSync(fullPath)) {
    return { exists: false, errors: [] };
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const errors = [];
  
  // エラー行を探す
  lines.forEach((line, index) => {
    for (const pattern of errorPatterns) {
      if (pattern.test(line)) {
        // 前後3行のコンテキストを取得
        const start = Math.max(0, index - 3);
        const end = Math.min(lines.length, index + 4);
        const context = lines.slice(start, end);
        
        errors.push({
          line: index + 1,
          content: line.trim(),
          context: context.map((l, i) => ({
            lineNum: start + i + 1,
            content: l
          }))
        });
        break; // 1つのエラーパターンにマッチしたら次の行へ
      }
    }
  });
  
  // サマリー情報を取得
  const summaryMatch = content.match(/📊 生成結果サマリー[\s\S]*?❌ エラー: (\d+)件/);
  const errorCount = summaryMatch ? parseInt(summaryMatch[1]) : 0;
  
  const successMatch = content.match(/✅ 成功: (\d+)件/);
  const successCount = successMatch ? parseInt(successMatch[1]) : 0;
  
  const totalMatch = content.match(/📝 合計: (\d+)件/);
  const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;
  
  return {
    exists: true,
    errors: errors.slice(0, 20), // 最初の20件のみ
    errorCount,
    successCount,
    totalCount,
    isCompleted: content.includes('🎉 一括生成完了！')
  };
}

console.log('\n' + '='.repeat(80));
console.log('🔍 エラーチェック結果');
console.log('='.repeat(80) + '\n');

let totalErrors = 0;
let totalFiles = 0;

for (const logFile of logFiles) {
  const result = checkLogFile(logFile);
  
  if (!result.exists) {
    continue;
  }
  
  totalFiles++;
  
  console.log(`📄 ${logFile}`);
  console.log('━'.repeat(80));
  
  if (result.errors.length > 0) {
    totalErrors += result.errors.length;
    console.log(`❌ エラー検出: ${result.errors.length}件`);
    
    // 最初の5件のエラーを表示
    result.errors.slice(0, 5).forEach((error, idx) => {
      console.log(`\n  [エラー ${idx + 1}] 行 ${error.line}:`);
      console.log(`  ${error.content}`);
      
      // コンテキストを表示（最初のエラーのみ詳細表示）
      if (idx === 0 && error.context.length > 0) {
        console.log(`\n  コンテキスト:`);
        error.context.slice(0, 3).forEach(ctx => {
          const marker = ctx.lineNum === error.line ? '>>>' : '   ';
          console.log(`  ${marker} ${ctx.lineNum}: ${ctx.content.substring(0, 100)}`);
        });
      }
    });
    
    if (result.errors.length > 5) {
      console.log(`\n  ... 他 ${result.errors.length - 5}件のエラー`);
    }
  } else {
    console.log('✅ エラーなし');
  }
  
  if (result.errorCount > 0) {
    console.log(`\n📊 サマリー: 成功 ${result.successCount}件 / エラー ${result.errorCount}件 / 合計 ${result.totalCount}件`);
  }
  
  if (result.isCompleted) {
    console.log('✅ 完了済み');
  } else {
    console.log('🔄 進行中');
  }
  
  console.log('');
}

console.log('━'.repeat(80));
console.log(`📊 全体サマリー: ${totalFiles}ファイル中、${totalErrors}件のエラーを検出`);
console.log('━'.repeat(80) + '\n');
