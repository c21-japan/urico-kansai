import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const GENERATE_SCRIPT = path.join(__dirname, 'generate_house.mjs');

// コマンドライン引数パース
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i].replace(/^--/, '');
  const value = process.argv[i + 1];
  args[key] = value;
}

const { mode, logfile, delay } = args;
const DELAY_MS = delay ? parseInt(delay) * 1000 : 5000;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 失敗したターゲットの再生成');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ログファイルから失敗したターゲットを抽出
function extractFailedTargets(logFile) {
  if (!fs.existsSync(logFile)) {
    console.error(`❌ ログファイルが見つかりません: ${logFile}`);
    return [];
  }

  const logContent = fs.readFileSync(logFile, 'utf-8');
  const lines = logContent.split('\n');
  const failedTargets = [];
  
  let currentTarget = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // ターゲット行を検出: 🎯 [X/Y] 都道府県 > 市区町村 または 🎯 [X/Y] 鉄道会社 > 路線 > 駅名
    const targetMatch = line.match(/🎯\s*\[\d+\/\d+\]\s*(.+)/);
    if (targetMatch) {
      currentTarget = {
        label: targetMatch[1].trim(),
        lineIndex: i
      };
    }
    
    // 失敗を検出
    if (currentTarget && line.includes('❌ 生成失敗')) {
      // ターゲット情報を解析
      const label = currentTarget.label;
      
      // エリア形式: 都道府県 > 市区町村
      const areaMatch = label.match(/^(.+?)\s*>\s*(.+)$/);
      if (areaMatch && !label.includes('>', areaMatch[0].indexOf('>') + 1)) {
        failedTargets.push({
          mode: 'area',
          pref: areaMatch[1].trim(),
          city: areaMatch[2].trim(),
          label: label
        });
      } else {
        // 駅形式: 鉄道会社 > 路線 > 駅名
        const parts = label.split('>').map(p => p.trim());
        if (parts.length === 3) {
          failedTargets.push({
            mode: 'station',
            rail: parts[0],
            line: parts[1],
            station: parts[2],
            label: label
          });
        }
      }
      
      currentTarget = null;
    }
    
    // 成功した場合はリセット
    if (currentTarget && (line.includes('✅ 生成成功') || line.includes('⏭️'))) {
      currentTarget = null;
    }
  }
  
  return failedTargets;
}

// ターゲットを再生成
function retryTarget(target) {
  return new Promise((resolve, reject) => {
    const args = ['--mode', target.mode];
    
    if (target.mode === 'area') {
      args.push('--pref', target.pref);
      args.push('--city', target.city);
    } else {
      args.push('--rail', target.rail);
      args.push('--line', target.line);
      args.push('--station', target.station);
    }
    
    // 既存ファイルを削除（強制再生成）
    const outputPath = getOutputPath(target);
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    const child = spawn('node', [GENERATE_SCRIPT, ...args], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, code });
      }
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
}

function getOutputPath(target) {
  function sanitize(str) {
    return str.replace(/[/:]/g, '_');
  }
  
  if (target.mode === 'area') {
    return path.join(PROJECT_ROOT, 'data', 'house', 'area', sanitize(target.pref), `${sanitize(target.city)}.json`);
  } else {
    return path.join(PROJECT_ROOT, 'data', 'house', 'station', sanitize(target.rail), sanitize(target.line), `${sanitize(target.station)}.json`);
  }
}

// メイン処理
async function main() {
  // ログファイルを指定
  let logFiles = [];
  
  if (logfile) {
    logFiles = [logfile];
  } else if (mode === 'area') {
    // エリアのログファイルを検索
    logFiles = [
      'batch_generate_area.log',
      'batch_generate_nara.log',
      'batch_generate_shiga.log',
      'batch_generate_kyoto.log',
      'batch_generate_hyogo.log'
    ].map(f => path.join(PROJECT_ROOT, f)).filter(f => fs.existsSync(f));
  } else if (mode === 'station') {
    // 駅のログファイルを検索
    logFiles = [
      'batch_station_osaka.log',
      'batch_station_nara.log',
      'batch_station_shiga.log',
      'batch_station_kyoto.log',
      'batch_station_hyogo.log'
    ].map(f => path.join(PROJECT_ROOT, f)).filter(f => fs.existsSync(f));
  } else {
    // 全てのログファイルを検索
    const allLogFiles = fs.readdirSync(PROJECT_ROOT)
      .filter(f => f.startsWith('batch_') && f.endsWith('.log'))
      .map(f => path.join(PROJECT_ROOT, f));
    logFiles = allLogFiles;
  }
  
  if (logFiles.length === 0) {
    console.error('❌ ログファイルが見つかりません');
    process.exit(1);
  }
  
  console.log(`📋 ログファイルを解析中: ${logFiles.length}件\n`);
  
  // 失敗したターゲットを抽出
  const allFailedTargets = [];
  for (const logFile of logFiles) {
    const failed = extractFailedTargets(logFile);
    console.log(`  ${path.basename(logFile)}: ${failed.length}件の失敗を検出`);
    allFailedTargets.push(...failed);
  }
  
  // 重複を除去
  const uniqueFailed = [];
  const seen = new Set();
  for (const target of allFailedTargets) {
    const key = target.mode === 'area' 
      ? `${target.mode}:${target.pref}:${target.city}`
      : `${target.mode}:${target.rail}:${target.line}:${target.station}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFailed.push(target);
    }
  }
  
  console.log(`\n✅ 合計 ${uniqueFailed.length}件の失敗したターゲットを検出しました\n`);
  
  if (uniqueFailed.length === 0) {
    console.log('🎉 失敗したターゲットはありません！');
    process.exit(0);
  }
  
  // 再生成開始
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < uniqueFailed.length; i++) {
    const target = uniqueFailed[i];
    
    console.log(`\n[${i + 1}/${uniqueFailed.length}] ${target.label}`);
    
    try {
      const result = await retryTarget(target);
      
      if (result.success) {
        successCount++;
        console.log('✅ 再生成成功');
      } else {
        errorCount++;
        errors.push({ target: target.label, code: result.code });
        console.log(`❌ 再生成失敗 (終了コード: ${result.code})`);
      }
      
      // 次のターゲットまで待機
      if (i < uniqueFailed.length - 1) {
        console.log(`⏳ 次のターゲットまで ${DELAY_MS / 1000}秒待機...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
      
    } catch (error) {
      errorCount++;
      errors.push({ target: target.label, error: error.message });
      console.log(`❌ エラー: ${error.message}`);
    }
  }
  
  // 結果サマリー
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 再生成結果サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);
  console.log(`📝 合計: ${uniqueFailed.length}件`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (errors.length > 0) {
    console.log('❌ エラー詳細:');
    errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.target}`);
      console.log(`     → ${err.error || `終了コード: ${err.code}`}`);
    });
    console.log('');
  }
  
  if (errorCount > 0) {
    console.log('💡 まだ失敗したターゲットがあります。再度実行してください。');
    process.exit(1);
  } else {
    console.log('🎉 全ての再生成が完了しました！');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('[致命的エラー]', error);
  process.exit(1);
});
