// マンションデータベース
// フォルダ内のデータファイルをインポート
import { MANSION_DB_PART as PART1 } from './data/mansion/part1.js';
import { MANSION_DB_PART as PART2 } from './data/mansion/part2.js';
import { MANSION_DB_PART as PART3 } from './data/mansion/part3.js';
import { MANSION_DB_PART as PART4 } from './data/mansion/part4.js';
import { MANSION_DB_PART as PART5 } from './data/mansion/part5.js';

export const MANSION_DB = [
  ...PART1,
  ...PART2,
  ...PART3,
  ...PART4,
  ...PART5
];

export default MANSION_DB;
