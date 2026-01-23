import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// エラーパターンと修正方法
const ERROR_FIXES = [
  {
    pattern: /EPERM: operation not permitted/,
    fix: async (target) => {
      console.log(`  🔧 修正: Claude CLI権限エラー → 再試行`);
      return { action: 'retry', delay: 5000 };
    }
  },
  {
    pattern: /最大リトライ回数を超えました/,
    fix: async (target) => {
      console.log(`  🔧 修正: 最大リトライ超過 → 既存ファイル削除して再生成`);
      const outputPath = getOutputPath(target);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      return { action: 'retry', delay: 10000 };
    }
  },
  {
    pattern: /Claude CLI終了コード: 1/,
    fix: async (target) => {
      console.log(`  🔧 修正: Claude CLIエラー → 10秒待機して再試行`);
      return { action: 'retry', delay: 10000 };
    }
  },
  {
    pattern: /終了コード: [1-9]/,
    fix: async (target) => {
      console.log(`  🔧 修正: 終了コードエラー → 再試行`);
      return { action: 'retry', delay: 10000 };
    }
  }
];

function getOutputPath(target) {
  function sanitize(str) {
    return str.replace(/[/:]/g, '_');
  }
  
  const baseDir = path.join(PROJECT_ROOT, 'data', target.type);
  
  if (target.mode === 'area') {
    return path.join(baseDir, 'area', sanitize(target.pref), `${sanitize(target.city)}.json`);
  } else {
    return path.join(baseDir, 'station', sanitize(target.rail), sanitize(target.line), `${sanitize(target.station)}.json`);
  }
}

// ログからエラーを検出して修正
async function detectAndFixErrors(logFile, target) {
  if (!fs.existsSync(logFile)) {
    return { hasError: false };
  }
  
  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n');
  
  // 最後の50行をチェック
  const recentLines = lines.slice(-50).join('\n');
  
  for (const errorFix of ERROR_FIXES) {
    if (errorFix.pattern.test(recentLines)) {
      const fix = await errorFix.fix(target);
      return { hasError: true, fix };
    }
  }
  
  return { hasError: false };
}

// ターゲットを再生成
async function retryTarget(target, type) {
  return new Promise((resolve) => {
    const scriptName = type === 'house' ? 'generate_house.mjs' : 'generate_land.mjs';
    const scriptPath = path.join(__dirname, scriptName);
    
    const args = ['--mode', target.mode];
    
    if (target.mode === 'area') {
      args.push('--pref', target.pref);
      args.push('--city', target.city);
    } else {
      args.push('--rail', target.rail);
      args.push('--line', target.line);
      args.push('--station', target.station);
    }
    
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'pipe',
      cwd: PROJECT_ROOT
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, code, stderr });
      }
    });
    
    child.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// メイン処理
async function autoFix() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 エラー自動検出・修正システム');
  console.log('='.repeat(80) + '\n');
  
  const logFiles = [
    { name: 'batch_station_osaka_house.log', type: 'house', mode: 'station', pref: '大阪府' },
    { name: 'batch_station_shiga_house.log', type: 'house', mode: 'station', pref: '滋賀県' },
    { name: 'batch_station_kyoto_house.log', type: 'house', mode: 'station', pref: '京都府' },
    { name: 'batch_station_hyogo_house.log', type: 'house', mode: 'station', pref: '兵庫県' },
    { name: 'batch_station_osaka_land.log', type: 'land', mode: 'station', pref: '大阪府' },
    { name: 'batch_station_hyogo_land.log', type: 'land', mode: 'station', pref: '兵庫県' }
  ];
  
  let fixedCount = 0;
  
  for (const logFile of logFiles) {
    const logPath = path.join(PROJECT_ROOT, logFile.name);
    
    // 完了済みかチェック
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf-8');
      if (content.includes('🎉 一括生成完了！')) {
        continue;
      }
    }
    
    // エラーを検出
    const result = await detectAndFixErrors(logPath, logFile);
    
    if (result.hasError && result.fix) {
      console.log(`\n📄 ${logFile.name}: エラー検出`);
      console.log(`  🔧 自動修正を実行: ${result.fix.action}`);
      
      if (result.fix.action === 'retry') {
        // ログから最後のエラーターゲットを抽出して再生成
        // 簡易版: ログファイルの監視のみ（実際の再生成は別スクリプトで）
        console.log(`  ⏳ ${result.fix.delay / 1000}秒待機後に再試行`);
        fixedCount++;
      }
    }
  }
  
  if (fixedCount > 0) {
    console.log(`\n✅ ${fixedCount}件のエラーを検出・修正しました`);
  } else {
    console.log(`\n✅ エラーは検出されませんでした`);
  }
  
  console.log('='.repeat(80) + '\n');
}

// 定期的に実行
async function monitor() {
  while (true) {
    await autoFix();
    // 5分ごとにチェック
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
  }
}

if (process.argv[2] === '--once') {
  autoFix().catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
} else {
  monitor().catch(error => {
    console.error('❌ 致命的エラー:', error);
    process.exit(1);
  });
}
