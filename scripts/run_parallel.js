#!/usr/bin/env node

/**
 * 並列実行スクリプト
 * Claude CLIを使用して複数のジョブを並列実行
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const JOBS_DIR = path.join(__dirname, '../jobs');
const OUT_DIR = path.join(__dirname, '../out');

// 並列数（デフォルト: 6）
const PARALLEL_COUNT = parseInt(process.argv[2]) || 6;

// ジョブタイプフィルター（オプション）
const TYPE_FILTER = process.argv[3] || null; // 'house', 'land', 'mansion'

// 都道府県フィルター（オプション）
const PREFECTURE_FILTER = process.argv[4] || null; // '大阪府', '奈良県', '京都府', '滋賀県', '兵庫県'

/**
 * Claude CLIでジョブを実行
 */
function runJob(job, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`  ⏳ 実行中: ${job.id}...`);
    
    const claude = spawn('npx', ['--yes', '@anthropic-ai/claude-code', '-p', job.prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    claude.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    claude.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      // npxの進捗メッセージは無視
      if (!text.includes('Need to install') && !text.includes('Installing')) {
        console.log(`  📝 ${job.id}: ${text.trim()}`);
      }
    });

    // タイムアウト設定（5分）
    const timeout = setTimeout(() => {
      claude.kill();
      reject({ success: false, job: job.id, error: 'タイムアウト（5分）' });
    }, 5 * 60 * 1000);

    claude.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && stdout.trim()) {
        fs.writeFileSync(outputPath, stdout, 'utf-8');
        resolve({ success: true, job: job.id });
      } else {
        reject({ success: false, job: job.id, error: stderr || `終了コード: ${code}` });
      }
    });

    claude.on('error', (error) => {
      clearTimeout(timeout);
      reject({ success: false, job: job.id, error: error.message });
    });
  });
}

/**
 * 並列実行
 */
async function runParallel() {
  // 出力ディレクトリ作成
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // ジョブ一覧を読み込み
  const jobsListPath = path.join(JOBS_DIR, '_jobs_list.json');
  if (!fs.existsSync(jobsListPath)) {
    console.error('❌ ジョブ一覧が見つかりません。先に generate_jobs.js を実行してください。');
    process.exit(1);
  }

  const allJobs = JSON.parse(fs.readFileSync(jobsListPath, 'utf-8'));
  
  // タイプフィルター適用
  let jobs = allJobs;
  if (TYPE_FILTER) {
    jobs = jobs.filter(job => job.type === TYPE_FILTER);
  }

  // 都道府県フィルター適用
  if (PREFECTURE_FILTER) {
    jobs = jobs.filter(job => {
      // prefectureフィールドで判定（市区町村のジョブのみ）
      return job.prefecture === PREFECTURE_FILTER;
    });
  }

  // 既に完了したジョブをスキップ
  const pendingJobs = jobs.filter(job => {
    const outputPath = path.join(OUT_DIR, job.outputFile);
    return !fs.existsSync(outputPath);
  });

  console.log(`📋 総ジョブ数: ${jobs.length}件`);
  console.log(`⏳ 未完了: ${pendingJobs.length}件`);
  console.log(`🚀 並列数: ${PARALLEL_COUNT}件`);
  if (TYPE_FILTER) {
    console.log(`📌 タイプフィルター: ${TYPE_FILTER}`);
  }
  if (PREFECTURE_FILTER) {
    console.log(`📍 都道府県フィルター: ${PREFECTURE_FILTER}`);
  }
  console.log('');

  if (pendingJobs.length === 0) {
    console.log('✅ すべてのジョブが完了しています');
    return;
  }

  const results = {
    success: [],
    failed: []
  };

  // 並列実行
  for (let i = 0; i < pendingJobs.length; i += PARALLEL_COUNT) {
    const batch = pendingJobs.slice(i, i + PARALLEL_COUNT);
    console.log(`\n📦 バッチ ${Math.floor(i / PARALLEL_COUNT) + 1}: ${batch.length}件を実行中...`);

    const promises = batch.map(job => {
      const outputPath = path.join(OUT_DIR, job.outputFile);
      return runJob(job, outputPath)
        .then(result => {
          console.log(`  ✅ ${job.id}`);
          return result;
        })
        .catch(error => {
          console.log(`  ❌ ${job.id}: ${error.error || error.message}`);
          return error;
        });
    });

    const batchResults = await Promise.all(promises);
    
    batchResults.forEach(result => {
      if (result.success) {
        results.success.push(result.job);
      } else {
        results.failed.push({ job: result.job, error: result.error });
      }
    });

    // レート制限対策: バッチ間で少し待機
    if (i + PARALLEL_COUNT < pendingJobs.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 実行結果');
  console.log(`  ✅ 成功: ${results.success.length}件`);
  console.log(`  ❌ 失敗: ${results.failed.length}件`);
  
  if (results.failed.length > 0) {
    console.log('\n失敗したジョブ:');
    results.failed.forEach(f => {
      console.log(`  - ${f.job}`);
    });
  }
}

// 実行
runParallel().catch(console.error);
