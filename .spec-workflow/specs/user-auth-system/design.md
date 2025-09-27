# ユーザー認証システム - 設計仕様書

## アーキテクチャ概要

### システム構成

```
[フロントエンド]
    ↓ HTTPS
[API Gateway]
    ↓
[認証サービス] ← → [Redis] (セッション)
    ↓
[データベース] (PostgreSQL)
    ↓
[監査ログ] (Elasticsearch)
```

### 技術スタック

- **フロントエンド**: React + TypeScript
- **バックエンド**: Node.js + Express + TypeScript
- **データベース**: PostgreSQL 14+
- **セッション管理**: Redis 6+
- **認証**: bcrypt + express-session
- **監査ログ**: Elasticsearch + Kibana

## データベース設計

### ユーザーテーブル (users)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### セッションテーブル (sessions)

```sql
CREATE TABLE sessions (
    sid VARCHAR(36) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);
```

### 認証トークンテーブル (auth_tokens)

```sql
CREATE TABLE auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset'
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 監査ログテーブル (audit_logs)

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API設計

### 認証API

#### POST /api/auth/register
ユーザー登録

**リクエスト**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "太郎",
  "lastName": "田中",
  "phone": "090-1234-5678"
}
```

**レスポンス**
```json
{
  "success": true,
  "message": "確認メールを送信しました",
  "userId": 123
}
```

#### POST /api/auth/login
ログイン

**リクエスト**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**レスポンス**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "太郎",
    "lastName": "田中"
  },
  "sessionId": "sess_abc123"
}
```

#### POST /api/auth/logout
ログアウト

**レスポンス**
```json
{
  "success": true,
  "message": "ログアウトしました"
}
```

#### POST /api/auth/forgot-password
パスワードリセット要求

**リクエスト**
```json
{
  "email": "user@example.com"
}
```

#### POST /api/auth/reset-password
パスワードリセット実行

**リクエスト**
```json
{
  "token": "reset_token_abc123",
  "newPassword": "NewSecurePass123!"
}
```

### ユーザー管理API

#### GET /api/user/profile
プロフィール取得

#### PUT /api/user/profile
プロフィール更新

#### POST /api/user/change-password
パスワード変更

## セキュリティ設計

### パスワードハッシュ化

```javascript
const bcrypt = require('bcrypt');
const saltRounds = 12;

// ハッシュ化
const hashedPassword = await bcrypt.hash(password, saltRounds);

// 検証
const isValid = await bcrypt.compare(password, hashedPassword);
```

### セッション管理

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS必須
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000 // 2時間
  }
}));
```

### CSRF対策

```javascript
const csrf = require('csurf');
app.use(csrf());
```

### レート制限

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の試行
  skipSuccessfulRequests: true
});

app.post('/api/auth/login', loginLimiter, loginHandler);
```

## フロントエンド設計

### React コンポーネント構成

```
src/
├── components/
│   ├── Auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   └── ResetPasswordForm.tsx
│   ├── Common/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Loading.tsx
│   └── User/
│       ├── Profile.tsx
│       └── ChangePassword.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useApi.ts
├── services/
│   ├── authService.ts
│   └── userService.ts
└── utils/
    ├── validation.ts
    └── api.ts
```

### 認証コンテキスト

```typescript
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 認証状態管理ロジック
};
```

### バリデーション

```typescript
export const passwordSchema = z.string()
  .min(8, '8文字以上入力してください')
  .regex(/[A-Z]/, '大文字を含めてください')
  .regex(/[a-z]/, '小文字を含めてください')
  .regex(/[0-9]/, '数字を含めてください')
  .regex(/[^A-Za-z0-9]/, '記号を含めてください');

export const emailSchema = z.string()
  .email('有効なメールアドレスを入力してください');
```

## エラーハンドリング

### エラーコード体系

| コード | 説明 |
|--------|------|
| AUTH001 | メールアドレスまたはパスワードが間違っています |
| AUTH002 | アカウントがロックされています |
| AUTH003 | メール認証が完了していません |
| AUTH004 | セッションが無効です |
| AUTH005 | トークンが無効または期限切れです |
| VALID001 | 入力データが不正です |
| VALID002 | メールアドレスが既に登録されています |

### エラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "AUTH001",
    "message": "メールアドレスまたはパスワードが間違っています",
    "details": {}
  }
}
```

## 監視・ログ設計

### 監査ログ

```javascript
const auditLog = {
  userId: 123,
  action: 'LOGIN_SUCCESS',
  details: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    sessionId: 'sess_abc123'
  },
  timestamp: '2025-09-27T10:00:00Z'
};
```

### メトリクス

- ログイン成功/失敗率
- 平均レスポンス時間
- アクティブセッション数
- パスワードリセット頻度

## テスト設計

### ユニットテスト

- パスワードハッシュ化/検証
- バリデーション関数
- セッション管理

### 統合テスト

- API エンドポイント
- データベース操作
- 外部サービス連携

### E2Eテスト

- ユーザー登録フロー
- ログインフロー
- パスワードリセットフロー

---

## 技術的考慮事項

### スケーラビリティ

- セッションストアのクラスタリング
- データベースの読み取り専用レプリカ
- CDN活用

### セキュリティ

- 定期的なセキュリティ監査
- 脆弱性スキャン
- ペネトレーションテスト

### 運用

- 自動デプロイパイプライン
- 監視アラート設定
- 障害対応手順書

---
最終更新: 2025-09-27
バージョン: 1.0