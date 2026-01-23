import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// パス設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MASTER_PATH = path.join(PROJECT_ROOT, 'data', 'kinki_master.json');
const GENERATE_SCRIPT = path.join(__dirname, 'generate_house.mjs');

// コマンドライン引数パース
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i].replace(/^--/, '');
  const value = process.argv[i + 1];
  args[key] = value;
}

const { mode, force, delay, pref } = args;

// デフォルト値
const FORCE_REGENERATE = force === 'true';
const DELAY_MS = delay ? parseInt(delay) * 1000 : 10000; // デフォルト10秒（5秒から延長）
const PREF_FILTER = pref || null; // 都道府県フィルター

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 URICO 戸建てデータ一括生成');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`モード: ${mode || '全て（エリア＋駅）'}`);
if (PREF_FILTER) {
  console.log(`都道府県フィルター: ${PREF_FILTER}`);
}
console.log(`強制再生成: ${FORCE_REGENERATE ? 'ON' : 'OFF'}`);
console.log(`実行間隔: ${DELAY_MS / 1000}秒`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// マスターデータ読み込み
console.log('[1/3] マスターデータ読み込み中...');
const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf-8'));
console.log('✅ マスターデータ読み込み完了\n');

// ターゲットリスト生成
console.log('[2/3] ターゲットリスト生成中...');

const targets = [];

// エリア軸のターゲット
if (!mode || mode === 'area') {
  for (const prefName in master.prefectures) {
    // 都道府県フィルター適用
    if (PREF_FILTER && prefName !== PREF_FILTER) {
      continue;
    }
    const cities = master.prefectures[prefName].cities;
    for (const city of cities) {
      targets.push({
        mode: 'area',
        pref: prefName,
        city
      });
    }
  }
}

// 駅軸のターゲット
if (!mode || mode === 'station') {
  for (const prefName in master.prefectures) {
    // 都道府県フィルター適用
    if (PREF_FILTER && prefName !== PREF_FILTER) {
      continue;
    }
    const railData = master.prefectures[prefName].rail;
    for (const railCompany in railData) {
      const lines = railData[railCompany];
      for (const line in lines) {
        const stations = lines[line];
        for (const station of stations) {
          targets.push({
            mode: 'station',
            rail: railCompany,
            line: line,
            station: station
          });
        }
      }
    }
  }
}

console.log(`✅ ターゲット数: ${targets.length}件`);
console.log(`   - エリア: ${targets.filter(t => t.mode === 'area').length}件`);
console.log(`   - 駅: ${targets.filter(t => t.mode === 'station').length}件\n`);

// generate_house.mjs実行関数
function executeGenerate(target) {
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
    
    if (FORCE_REGENERATE) {
      // 強制再生成の場合、既存ファイルを削除
      const outputPath = getOutputPath(target);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
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

// 進捗表示関数
function getProgressBar(current, total, width = 40) {
  const percent = Math.floor((current / total) * 100);
  const filled = Math.floor((current / total) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percent}% (${current}/${total})`;
}

function getTargetLabel(target) {
  if (target.mode === 'area') {
    return `${target.pref} > ${target.city}`;
  } else {
    return `${target.rail} > ${target.line} > ${target.station}`;
  }
}

// メイン処理
async function main() {
  console.log('[3/3] データ生成開始\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const startTime = Date.now();
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const label = getTargetLabel(target);
    const progress = getProgressBar(i + 1, targets.length);
    
    console.log(`\n${progress}`);
    console.log(`🎯 [${i + 1}/${targets.length}] ${label}`);
    
    try {
      // 既存ファイルチェック
      const outputPath = getOutputPath(target);
      if (fs.existsSync(outputPath) && !FORCE_REGENERATE) {
        console.log('⏭️  スキップ: 既に生成済み');
        skipCount++;
      } else {
        const result = await executeGenerate(target);
        
        if (result.success) {
          successCount++;
          console.log('✅ 生成成功');
        } else {
          errorCount++;
          errors.push({ target: label, code: result.code });
          console.log(`❌ 生成失敗 (終了コード: ${result.code})`);
        }
      }
      
      // 次のターゲットまで待機（API負荷軽減）
      if (i < targets.length - 1) {
        console.log(`⏳ 次のターゲットまで ${DELAY_MS / 1000}秒待機...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
      
    } catch (error) {
      errorCount++;
      errors.push({ target: label, error: error.message });
      console.log(`❌ エラー: ${error.message}`);
    }
  }
  
  // 結果サマリー
  const endTime = Date.now();
  const totalTime = Math.floor((endTime - startTime) / 1000);
  const hours = Math.floor(totalTime / 3600);
  const minutes = Math.floor((totalTime % 3600) / 60);
  const seconds = totalTime % 60;
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 生成結果サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`⏭️  スキップ: ${skipCount}件`);
  console.log(`❌ エラー: ${errorCount}件`);
  console.log(`📝 合計: ${targets.length}件`);
  console.log(`⏱️  所要時間: ${hours}時間${minutes}分${seconds}秒`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (errors.length > 0) {
    console.log('❌ エラー詳細:');
    errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.target}`);
      console.log(`     → ${err.error || `終了コード: ${err.code}`}`);
    });
    console.log('');
  }
  
  console.log('🎉 一括生成完了！');
}

main().catch(error => {
  console.error('[致命的エラー]', error);
  process.exit(1);
});
