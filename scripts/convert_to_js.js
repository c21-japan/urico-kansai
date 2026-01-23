#!/usr/bin/env node

/**
 * 変換スクリプト
 * out/*.txt → src/generated/*.js に変換
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../out');
const GENERATED_DIR = path.join(__dirname, '../src/generated');

const AUTO_GENERATED_COMMENT = '// AUTO-GENERATED. DO NOT EDIT BY HAND.\n\n';

/**
 * テキストファイルをJSファイルに変換
 */
function convertToJs() {
  // 出力ディレクトリ作成
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }

  // サブディレクトリ作成
  const houseDir = path.join(GENERATED_DIR, 'house');
  const landDir = path.join(GENERATED_DIR, 'land');
  const mansionDir = path.join(GENERATED_DIR, 'mansion');

  [houseDir, landDir, mansionDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // outディレクトリ内のファイルを取得
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.txt'));

  let converted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const inputPath = path.join(OUT_DIR, file);
      const content = fs.readFileSync(inputPath, 'utf-8').trim();

      // ファイル名からタイプとエリアを判定
      let type, outputPath;
      if (file.startsWith('house_')) {
        type = 'house';
        outputPath = path.join(houseDir, file.replace('.txt', '.js'));
      } else if (file.startsWith('land_')) {
        type = 'land';
        outputPath = path.join(landDir, file.replace('.txt', '.js'));
      } else if (file.startsWith('mansion_')) {
        type = 'mansion';
        outputPath = path.join(mansionDir, file.replace('.txt', '.js'));
      } else {
        console.log(`⚠️  スキップ: ${file} (タイプ不明)`);
        skipped++;
        continue;
      }

      // 既に存在する場合はスキップ（オプション: 上書きする場合は削除）
      if (fs.existsSync(outputPath)) {
        // 既存ファイルをスキップ（上書きしない）
        skipped++;
        continue;
      }

      // 内容を検証（export文が含まれているか）
      if (!content.includes('export const')) {
        console.log(`⚠️  スキップ: ${file} (export文が見つかりません)`);
        skipped++;
        continue;
      }

      // JSファイルとして保存
      const jsContent = AUTO_GENERATED_COMMENT + content;
      fs.writeFileSync(outputPath, jsContent, 'utf-8');
      converted++;
    } catch (error) {
      console.error(`❌ エラー: ${file} - ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 変換結果');
  console.log(`  ✅ 変換: ${converted}件`);
  console.log(`  ⏭️  スキップ: ${skipped}件`);
  console.log(`  ❌ エラー: ${errors}件`);
}

// 実行
convertToJs();
