import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ログファイルのリスト
const logFiles = [
  { name: 'batch_station_osaka_house.log', type: 'house', mode: 'station', pref: '大阪府' },
  { name: 'batch_station_shiga_house.log', type: 'house', mode: 'station', pref: '滋賀県' },
  { name: 'batch_station_kyoto_house.log', type: 'house', mode: 'station', pref: '京都府' },
  { name: 'batch_station_hyogo_house.log', type: 'house', mode: 'station', pref: '兵庫県' },
  { name: 'batch_station_osaka_land.log', type: 'land', mode: 'station', pref: '大阪府' },
  { name: 'batch_station_hyogo_land.log', type: 'land', mode: 'station', pref: '兵庫県' },
  { name: 'batch_station_osaka.log', type: 'house', mode: 'station', pref: '大阪府' },
  { name: 'batch_station_shiga.log', type: 'house', mode: 'station', pref: '滋賀県' },
  { name: 'batch_station_kyoto.log', type: 'house', mode: 'station', pref: '京都府' },
  { name: 'batch_station_hyogo.log', type: 'house', mode: 'station', pref: '兵庫県' },
  { name: 'logs/batch_land_大阪府.log', type: 'land', mode: 'all', pref: '大阪府' },
  { name: 'logs/batch_land_奈良県.log', type: 'land', mode: 'all', pref: '奈良県' },
  { name: 'logs/batch_land_京都府.log', type: 'land', mode: 'all', pref: '京都府' },
  { name: 'logs/batch_land_滋賀県.log', type: 'land', mode: 'all', pref: '滋賀県' },
  { name: 'logs/batch_land_兵庫県.log', type: 'land', mode: 'all', pref: '兵庫県' }
];

// エラーパターン
const errorPatterns = [
  /❌ 生成失敗/,
  /最大リトライ回数を超えました/,
  /Claude CLI終了コード: 1/,
  /終了コード: [1-9]/
];

function sanitize(str) {
  return str.replace(/[/:]/g, '_');
}

function getOutputPath(mode, type, pref, rail, line, station, city) {
  const baseDir = path.join(PROJECT_ROOT, 'data', type);
  
  if (mode === 'area') {
    return path.join(baseDir, 'area', sanitize(pref), `${sanitize(city)}.json`);
  } else {
    return path.join(baseDir, 'station', sanitize(rail), sanitize(line), `${sanitize(station)}.json`);
  }
}

// ログからエラーが発生したターゲットを抽出
function extractFailedTargets(logFile) {
  const fullPath = path.join(PROJECT_ROOT, logFile.name);
  
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const failedTargets = [];
  
  // ターゲットとエラーのマッピングを作成
  const targetErrorMap = new Map();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // ターゲット行を検出
    const targetMatch = line.match(/🎯 \[(\d+)\/(\d+)\] (.+)/);
    if (targetMatch) {
      const targetStr = targetMatch[3];
      let target = null;
      
      // エリア形式: "都道府県 > 市区町村"
      const areaMatch = targetStr.match(/^(.+?) > (.+)$/);
      if (areaMatch) {
        target = {
          mode: 'area',
          pref: areaMatch[1],
          city: areaMatch[2],
          lineNum: i + 1
        };
      } else {
        // 駅形式: "鉄道会社 > 路線 > 駅"
        const stationMatch = targetStr.match(/^(.+?) > (.+?) > (.+)$/);
        if (stationMatch) {
          target = {
            mode: 'station',
            rail: stationMatch[1],
            line: stationMatch[2],
            station: stationMatch[3],
            lineNum: i + 1
          };
        }
      }
      
      if (target) {
        // ターゲットのキーを作成
        const key = target.mode === 'area' 
          ? `${target.mode}_${target.pref}_${target.city}`
          : `${target.mode}_${target.rail}_${target.line}_${target.station}`;
        
        targetErrorMap.set(key, { target, startLine: i + 1 });
      }
    }
    
    // エラー行を検出
    if (line.includes('❌ 生成失敗') || 
        line.includes('最大リトライ回数を超えました') ||
        (line.includes('終了コード:') && line.match(/終了コード: [1-9]/))) {
      
      // 直前30行以内のターゲットを探す
      for (let j = Math.max(0, i - 30); j < i; j++) {
        const prevLine = lines[j];
        const targetMatch = prevLine.match(/🎯 \[(\d+)\/(\d+)\] (.+)/);
        if (targetMatch) {
          const targetStr = targetMatch[3];
          let target = null;
          
          // 駅形式を先にチェック（3つの > がある）
          const stationMatch = targetStr.match(/^(.+?) > (.+?) > (.+)$/);
          if (stationMatch) {
            target = {
              mode: 'station',
              rail: stationMatch[1],
              line: stationMatch[2],
              station: stationMatch[3]
            };
          } else {
            // エリア形式（2つの > がある）
            const areaMatch = targetStr.match(/^(.+?) > (.+)$/);
            if (areaMatch) {
              target = {
                mode: 'area',
                pref: areaMatch[1],
                city: areaMatch[2]
              };
            }
          }
          
          if (target) {
            const key = target.mode === 'area' 
              ? `${target.mode}_${target.pref}_${target.city}`
              : `${target.mode}_${target.rail}_${target.line}_${target.station}`;
            
            const existing = targetErrorMap.get(key);
            if (existing && !existing.hasError) {
              existing.hasError = true;
              existing.errorLine = i + 1;
            }
          }
          break;
        }
      }
    }
  }
  
  // エラーが発生したターゲットを抽出
  for (const [key, value] of targetErrorMap.entries()) {
    if (value.hasError) {
      failedTargets.push({
        ...value.target,
        logFile: logFile.name,
        errorLine: value.errorLine,
        startLine: value.startLine
      });
    }
  }
  
  return failedTargets;
}

// ターゲットを再生成
function retryTarget(target, type, delay) {
  return new Promise((resolve) => {
    const scriptName = type === 'house' ? 'generate_house.mjs' : 'generate_land.mjs';
    const scriptPath = path.join(__dirname, scriptName);
    
    const args = ['--mode', target.mode];
    
    if (target.mode === 'area') {
      if (!target.pref || !target.city) {
        resolve({ success: false, target, error: 'エリアターゲットにprefまたはcityがありません' });
        return;
      }
      args.push('--pref', target.pref);
      args.push('--city', target.city);
    } else if (target.mode === 'station') {
      if (!target.rail || !target.line || !target.station) {
        resolve({ success: false, target, error: '駅ターゲットにrail、line、またはstationがありません' });
        return;
      }
      args.push('--rail', target.rail);
      args.push('--line', target.line);
      args.push('--station', target.station);
    } else {
      resolve({ success: false, target, error: '不明なモード: ' + target.mode });
      return;
    }
    
    // 既存ファイルを削除（強制再生成）
    const outputPath = getOutputPath(
      target.mode,
      type,
      target.pref,
      target.rail,
      target.line,
      target.station,
      target.city
    );
    
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, target });
      } else {
        resolve({ success: false, target, code });
      }
    });
    
    child.on('error', (err) => {
      resolve({ success: false, target, error: err.message });
    });
  });
}

// メイン処理
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 エラーが発生したターゲットの再生成');
  console.log('='.repeat(80) + '\n');
  
  // デフォルトの実行間隔（秒）
  const DELAY_SECONDS = 10; // 5秒から10秒に延長
  
  console.log(`⏳ 実行間隔: ${DELAY_SECONDS}秒\n`);
  
  const allFailedTargets = [];
  
  // 各ログファイルからエラーを抽出
  for (const logFile of logFiles) {
    console.log(`📄 ${logFile.name} を解析中...`);
    const failed = extractFailedTargets(logFile);
    
    if (failed.length > 0) {
      console.log(`   ❌ ${failed.length}件のエラーを検出`);
      failed.forEach(t => {
        t.type = logFile.type;
        allFailedTargets.push(t);
      });
    } else {
      console.log(`   ✅ エラーなし`);
    }
  }
  
  console.log(`\n📊 合計: ${allFailedTargets.length}件のエラーターゲットを検出\n`);
  
  if (allFailedTargets.length === 0) {
    console.log('✅ エラーが発生したターゲットはありません\n');
    return;
  }
  
  // タイプ別にグループ化
  const houseTargets = allFailedTargets.filter(t => t.type === 'house');
  const landTargets = allFailedTargets.filter(t => t.type === 'land');
  
  console.log(`🏠 建物（house）: ${houseTargets.length}件`);
  console.log(`🏞️  土地（land）: ${landTargets.length}件\n`);
  
  // 再生成実行
  let successCount = 0;
  let errorCount = 0;
  
  const allTargets = [...houseTargets, ...landTargets];
  
  for (let i = 0; i < allTargets.length; i++) {
    const target = allTargets[i];
    const label = target.mode === 'area' 
      ? `${target.pref} > ${target.city}`
      : `${target.rail} > ${target.line} > ${target.station}`;
    
    console.log(`\n[${i + 1}/${allTargets.length}] ${target.type === 'house' ? '🏠' : '🏞️'} ${label}`);
    console.log(`   ログ: ${target.logFile} (行 ${target.errorLine})`);
    
    const result = await retryTarget(target, target.type, DELAY_SECONDS);
    
    if (result.success) {
      successCount++;
      console.log('   ✅ 再生成成功');
    } else {
      errorCount++;
      console.log(`   ❌ 再生成失敗: ${result.error || `終了コード: ${result.code}`}`);
    }
    
    // 次のターゲットまで待機
    if (i < allTargets.length - 1) {
      console.log(`   ⏳ 次のターゲットまで ${DELAY_SECONDS}秒待機...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_SECONDS * 1000));
    }
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 再生成結果サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);
  console.log(`📝 合計: ${allTargets.length}件`);
  console.log('='.repeat(80) + '\n');
}

main().catch(error => {
  console.error('[致命的エラー]', error);
  process.exit(1);
});
