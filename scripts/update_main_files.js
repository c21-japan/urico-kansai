#!/usr/bin/env node

/**
 * メインファイル更新スクリプト
 * src/generated/内のファイルを読み込んで、house_db.js, land_db.js, mansion_db.jsを更新
 */

const fs = require('fs');
const path = require('path');

const GENERATED_DIR = path.join(__dirname, '../src/generated');
const ROOT_DIR = path.join(__dirname, '..');

/**
 * メインファイルを更新
 */
function updateMainFiles() {
  const houseDir = path.join(GENERATED_DIR, 'house');
  const landDir = path.join(GENERATED_DIR, 'land');
  const mansionDir = path.join(GENERATED_DIR, 'mansion');

  // 戸建データベースを更新
  if (fs.existsSync(houseDir)) {
    const houseFiles = fs.readdirSync(houseDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    const imports = houseFiles.map((file, index) => {
      const varName = `PART${index + 1}`;
      return `import { HOUSE_DB_PART as ${varName} } from './src/generated/house/${file}';`;
    }).join('\n');

    const spreads = houseFiles.map((_, index) => {
      return `  ...PART${index + 1}`;
    }).join(',\n');

    const houseDbContent = `// 戸建データベース
// AUTO-GENERATED. DO NOT EDIT BY HAND.
// フォルダ内のデータファイルをインポート
${imports}

export const HOUSE_DB = [
${spreads}
];

export default HOUSE_DB;
`;

    fs.writeFileSync(
      path.join(ROOT_DIR, 'house_db.js'),
      houseDbContent,
      'utf-8'
    );
    console.log(`✅ house_db.js を更新しました (${houseFiles.length}ファイル)`);
  }

  // 土地データベースを更新
  if (fs.existsSync(landDir)) {
    const landFiles = fs.readdirSync(landDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    const imports = landFiles.map((file, index) => {
      const varName = `PART${index + 1}`;
      return `import { LAND_DB_PART as ${varName} } from './src/generated/land/${file}';`;
    }).join('\n');

    const spreads = landFiles.map((_, index) => {
      return `  ...PART${index + 1}`;
    }).join(',\n');

    const landDbContent = `// 土地データベース
// AUTO-GENERATED. DO NOT EDIT BY HAND.
// フォルダ内のデータファイルをインポート
${imports}

export const LAND_DB = [
${spreads}
];

export default LAND_DB;
`;

    fs.writeFileSync(
      path.join(ROOT_DIR, 'land_db.js'),
      landDbContent,
      'utf-8'
    );
    console.log(`✅ land_db.js を更新しました (${landFiles.length}ファイル)`);
  }

  // マンションデータベースを更新
  if (fs.existsSync(mansionDir)) {
    const mansionFiles = fs.readdirSync(mansionDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    const imports = mansionFiles.map((file, index) => {
      const varName = `PART${index + 1}`;
      return `import { MANSION_DB_PART as ${varName} } from './src/generated/mansion/${file}';`;
    }).join('\n');

    const spreads = mansionFiles.map((_, index) => {
      return `  ...PART${index + 1}`;
    }).join(',\n');

    const mansionDbContent = `// マンションデータベース
// AUTO-GENERATED. DO NOT EDIT BY HAND.
// フォルダ内のデータファイルをインポート
${imports}

export const MANSION_DB = [
${spreads}
];

export default MANSION_DB;
`;

    fs.writeFileSync(
      path.join(ROOT_DIR, 'mansion_db.js'),
      mansionDbContent,
      'utf-8'
    );
    console.log(`✅ mansion_db.js を更新しました (${mansionFiles.length}ファイル)`);
  }
}

// 実行
updateMainFiles();
