import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 監視対象のプロセスパターン
const PROCESS_PATTERNS = [
  'batch_generate.mjs',
  'batch_generate_land.mjs'
];

// プロセスが実行中か確認
function isProcessRunning() {
  return new Promise((resolve) => {
    const ps = spawn('ps', ['aux'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    
    ps.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ps.on('close', () => {
      let hasRunning = false;
      for (const pattern of PROCESS_PATTERNS) {
        if (output.includes(pattern)) {
          hasRunning = true;
          break;
        }
      }
      resolve(hasRunning);
    });
    
    ps.on('error', () => {
      resolve(false);
    });
  });
}

// 実行中のプロセス一覧を取得
function getRunningProcesses() {
  return new Promise((resolve) => {
    const ps = spawn('ps', ['aux'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    
    ps.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ps.on('close', () => {
      const processes = [];
      const lines = output.split('\n');
      
      for (const line of lines) {
        for (const pattern of PROCESS_PATTERNS) {
          if (line.includes(pattern) && !line.includes('grep')) {
            const match = line.match(/(\d+)\s+.*?node.*?scripts\/(batch_generate[^\s]+)/);
            if (match) {
              processes.push({
                pid: match[1],
                script: match[2],
                line: line.trim()
              });
            }
          }
        }
      }
      
      resolve(processes);
    });
    
    ps.on('error', () => {
      resolve([]);
    });
  });
}

// メイン処理
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('⏳ 現在実行中の生成プロセスを監視中...');
  console.log('='.repeat(80) + '\n');
  
  let checkCount = 0;
  const CHECK_INTERVAL = 30000; // 30秒ごとにチェック
  
  while (true) {
    checkCount++;
    const running = await isProcessRunning();
    const processes = await getRunningProcesses();
    
    if (processes.length > 0) {
      console.log(`[チェック ${checkCount}] 実行中のプロセス: ${processes.length}個`);
      processes.forEach((proc, idx) => {
        console.log(`  ${idx + 1}. PID ${proc.pid}: ${proc.script}`);
      });
      console.log(`\n⏳ ${CHECK_INTERVAL / 1000}秒後に再チェックします...\n`);
    } else {
      console.log('✅ 全ての生成プロセスが完了しました！\n');
      break;
    }
    
    // 待機
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
  
  console.log('━'.repeat(80));
  console.log('🔄 エラーターゲットの再生成を開始します');
  console.log('━'.repeat(80) + '\n');
  
  // エラー再生成スクリプトを実行
  const retryScript = path.join(__dirname, 'retry_errors.mjs');
  const child = spawn('node', [retryScript], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ エラー再生成が完了しました');
    } else {
      console.log(`\n❌ エラー再生成が終了コード ${code} で終了しました`);
    }
    process.exit(code);
  });
  
  child.on('error', (err) => {
    console.error('❌ エラー:', err.message);
    process.exit(1);
  });
}

main().catch(error => {
  console.error('❌ 致命的エラー:', error);
  process.exit(1);
});
