// Vercel Edge Functions用のミドルウェア
import { ipAddress, next } from '@vercel/functions';

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
 */
function detectBot(userAgent: string): { isBot: boolean; isAllowed: boolean } {
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

  // 一般的なボットパターンの検出
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
 */
function getRateLimitKey(ip: string, windowMinutes: number = 1): string {
  const window = Math.floor(Date.now() / (windowMinutes * 60 * 1000));
  return `${ip}-${window}`;
}

// レート制限のストレージ（メモリベース、本番環境ではRedis等の使用を推奨）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// レート制限の設定
const RATE_LIMIT = {
  maxRequests: 30, // 1分間あたりの最大リクエスト数
  windowMinutes: 1, // 時間窓（分）
};

export default function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = ipAddress(request) || 'unknown';

  // ボット検知
  const { isBot, isAllowed } = detectBot(userAgent);

  // 悪質なボットをブロック
  if (isBot && !isAllowed) {
    return new Response('Forbidden: Bot access denied', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // レート制限チェック（ボット以外のみ）
  if (!isBot) {
    const rateLimitKey = getRateLimitKey(ip, RATE_LIMIT.windowMinutes);
    const now = Date.now();
    const resetTime = now + (RATE_LIMIT.windowMinutes * 60 * 1000);

    const current = rateLimitMap.get(rateLimitKey);

    if (current) {
      // 時間窓がリセットされている場合は新しいカウントを開始
      if (now > current.resetTime) {
        rateLimitMap.set(rateLimitKey, { count: 1, resetTime });
      } else {
        // レート制限を超過している場合
        if (current.count >= RATE_LIMIT.maxRequests) {
          return new Response('Too Many Requests', {
            status: 429,
            headers: {
              'Content-Type': 'text/plain',
              'Retry-After': String(Math.ceil((current.resetTime - now) / 1000)),
            },
          });
        }
        // カウントを増やす
        rateLimitMap.set(rateLimitKey, {
          count: current.count + 1,
          resetTime: current.resetTime,
        });
      }
    } else {
      // 初回アクセス
      rateLimitMap.set(rateLimitKey, { count: 1, resetTime });
    }

    // 古いエントリをクリーンアップ（メモリリーク防止）
    if (rateLimitMap.size > 10000) {
      const now = Date.now();
      for (const [key, value] of rateLimitMap.entries()) {
        if (now > value.resetTime) {
          rateLimitMap.delete(key);
        }
      }
    }
  }

  // リクエストを通過させる
  // Vercel Edge Functionsでは、next()関数を使用してリクエストを通過させます
  // セキュリティヘッダーはvercel.jsonで設定されているため、ここでは通過のみ
  return next();
}

// Vercel Edge Functionsの設定
// すべてのリクエストに対してこのミドルウェアが実行されます
export const config = {
  matcher: [
    /*
     * 以下のパスを除くすべてのリクエストパスにマッチ:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
