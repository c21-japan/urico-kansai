// 悪質なクローラーのUser-Agentパターン
const MALICIOUS_BOTS = [
  'scrapy',
  'curl',
  'wget',
  'python-requests',
  'go-http-client',
  'java',
  'apache-httpclient',
  'okhttp',
  'semrushbot',
  'ahrefsbot',
  'dotbot',
  'mj12bot',
  'blexbot',
  'petalbot',
  'applebot',
  'crawler',
  'spider',
  'bot',
  'crawling',
];

// 許可する正規の検索エンジンボット
const ALLOWED_BOTS = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
];

/**
 * ボットを検知し、許可されているかどうかを判定
 * @param userAgent - User-Agent文字列
 * @returns { isBot: boolean, isAllowed: boolean } - ボットかどうか、許可されているかどうか
 */
export function detectBot(userAgent: string): { isBot: boolean; isAllowed: boolean } {
  if (!userAgent) {
    return { isBot: false, isAllowed: true };
  }

  const ua = userAgent.toLowerCase();

  // 正規ボットチェック（優先度が高い）
  const isAllowedBot = ALLOWED_BOTS.some(bot => ua.includes(bot));
  if (isAllowedBot) {
    return { isBot: true, isAllowed: true };
  }

  // 悪質ボットチェック
  const isMaliciousBot = MALICIOUS_BOTS.some(bot => ua.includes(bot));
  if (isMaliciousBot) {
    return { isBot: true, isAllowed: false };
  }

  // 一般的なボットパターンの検出（より厳密な判定）
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /fetcher/i,
  ];

  const matchesBotPattern = botPatterns.some(pattern => pattern.test(ua));
  if (matchesBotPattern) {
    // パターンに一致しても、許可リストに含まれていない場合はブロック
    return { isBot: true, isAllowed: false };
  }

  return { isBot: false, isAllowed: true };
}

/**
 * IPアドレスからレート制限のキーを生成
 * @param ip - IPアドレス
 * @param windowMinutes - 時間窓（分）
 * @returns レート制限キー
 */
export function getRateLimitKey(ip: string, windowMinutes: number = 1): string {
  const window = Math.floor(Date.now() / (windowMinutes * 60 * 1000));
  return `${ip}-${window}`;
}
