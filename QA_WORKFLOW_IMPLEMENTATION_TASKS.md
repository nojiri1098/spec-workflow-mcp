# QA Workflow MCP Implementation Tasks

## フェーズ別実装タスク

設計ドキュメント `QA_WORKFLOW_MIGRATION_PLAN.md` に基づく具体的な実装タスクリスト。

---

## Phase 1: プロジェクト基盤変更 (1-2週間)

### 1.1 パッケージ・設定変更
- [ ] 1.1.1 `package.json` の変更
  - File: `package.json`
  - Change: `name`, `description`, `bin` 名称変更
  - Purpose: プロジェクト名をQA向けに変更

- [ ] 1.1.2 `README.md` の完全書き換え
  - File: `README.md`
  - Change: QAエンジニア向け説明に変更
  - Purpose: プロジェクト概要をQAワークフローに変更

- [ ] 1.1.3 バイナリファイル名変更
  - File: `src/index.ts` (shebang)
  - Change: コマンド名を `qa-workflow-mcp` に変更
  - Purpose: CLI コマンドの統一

### 1.2 TypeScript型定義変更
- [ ] 1.2.1 基本型定義の変更
  - File: `src/types.ts`
  - Change: `SpecData` → `TestProjectData` 型変更
  - Purpose: QAワークフローの型安全性確保

- [ ] 1.2.2 新しいQA専用型の追加
  - File: `src/types.ts`
  - Add: `TestPerspective`, `TestCase`, `TestExecution`, `QualityReport` 型
  - Purpose: QA成果物の型定義

- [ ] 1.2.3 MCPツール応答型の更新
  - File: `src/types.ts`
  - Change: `ToolContext`, `ToolResponse` のQA向け調整
  - Purpose: QAワークフロー対応

### 1.3 設定システム変更
- [ ] 1.3.1 設定ファイル構造変更
  - File: `src/config.ts`
  - Change: QA設定項目の追加、開発設定項目の削除
  - Purpose: QAワークフロー設定対応

- [ ] 1.3.2 ワークスペース初期化変更
  - File: `src/core/workspace-initializer.ts`
  - Change: `.spec-workflow` → `.qa-workflow` ディレクトリ作成
  - Purpose: QA専用ワークスペース構築

---

## Phase 2: 既存ツール改修 (1-2週間)

### 2.1 approvals ツール改修
- [ ] 2.1.1 承認カテゴリ変更
  - File: `src/tools/approvals.ts`
  - Change: `category` enum を QA用に変更 (`'test-perspective' | 'test-case' | 'test-result'`)
  - Purpose: QAレビューフロー対応

- [ ] 2.1.2 承認プロセス説明変更
  - File: `src/tools/approvals.ts`
  - Change: ツール説明文をQAレビュー向けに変更
  - Purpose: QAエンジニア向けガイダンス

- [ ] 2.1.3 承認ワークフローパス変更
  - File: `src/tools/approvals.ts`
  - Change: `.spec-workflow` → `.qa-workflow` パス変更
  - Purpose: QAワークスペース対応

### 2.2 spec-status → test-status 変更
- [ ] 2.2.1 ツール名・説明変更
  - File: `src/tools/spec-status.ts` → `src/tools/test-status.ts`
  - Change: ツール名、説明をQA進捗管理向けに変更
  - Purpose: テストプロジェクト進捗管理

- [ ] 2.2.2 フェーズ構造変更
  - File: `src/tools/test-status.ts`
  - Change: フェーズを QA 3フェーズ + レポートに変更
  - Purpose: QAワークフローの進捗追跡

- [ ] 2.2.3 パーサー対応変更
  - File: `src/core/parser.ts`
  - Change: QAワークフロー構造解析対応
  - Purpose: QA成果物の解析

---

## Phase 3: 不要ファイル削除 (0.5週間)

### 3.1 不要ツール削除
- [ ] 3.1.1 spec-workflow-guide 削除
  - File: `src/tools/spec-workflow-guide.ts`
  - Action: 削除
  - Purpose: 開発向けガイドの廃棄

- [ ] 3.1.2 steering-guide 削除
  - File: `src/tools/steering-guide.ts`
  - Action: 削除
  - Purpose: 運営ガイドの廃棄

- [ ] 3.1.3 プロンプト関連削除
  - Files: `src/prompts/create-spec.ts`, `src/prompts/create-steering-doc.ts`, etc.
  - Action: 削除または大幅変更
  - Purpose: 開発向けプロンプトの廃棄

### 3.2 不要テンプレート削除
- [ ] 3.2.1 開発用テンプレート削除
  - Files: `.spec-workflow/templates/*.md`
  - Action: 削除
  - Purpose: 開発向けテンプレートの廃棄

- [ ] 3.2.2 steering 関連削除
  - Directory: `.spec-workflow/steering/`
  - Action: 削除
  - Purpose: 運営関連ディレクトリの廃棄

---

## Phase 4: QA専用テンプレート作成 (1週間)

### 4.1 QA用テンプレート作成
- [ ] 4.1.1 テスト観点テンプレート
  - File: `.qa-workflow/templates/test-perspective-template.md`
  - Create: テスト観点抽出用テンプレート
  - Purpose: テスト観点の標準化

- [ ] 4.1.2 テストケーステンプレート
  - File: `.qa-workflow/templates/test-case-template.md`
  - Create: テストケース設計用テンプレート
  - Purpose: テストケースの標準化

- [ ] 4.1.3 テスト実行テンプレート
  - File: `.qa-workflow/templates/test-execution-template.md`
  - Create: テスト実行記録用テンプレート
  - Purpose: テスト実行の標準化

- [ ] 4.1.4 品質レポートテンプレート
  - File: `.qa-workflow/templates/quality-report-template.md`
  - Create: 品質評価レポート用テンプレート
  - Purpose: 品質レポートの標準化

### 4.2 QAディレクトリ構造作成
- [ ] 4.2.1 perspectives ディレクトリ作成
  - Directory: `.qa-workflow/perspectives/`
  - Subdirs: `requirements-based/`, `design-based/`, `risk-based/`, `user-based/`
  - Purpose: テスト観点の分類管理

- [ ] 4.2.2 test-cases ディレクトリ作成
  - Directory: `.qa-workflow/test-cases/`
  - Subdirs: `functional/`, `integration/`, `performance/`, `security/`
  - Purpose: テストケースの分類管理

- [ ] 4.2.3 executions ディレクトリ作成
  - Directory: `.qa-workflow/executions/`
  - Subdirs: `sessions/`, `results/`, `reports/`
  - Purpose: テスト実行管理

- [ ] 4.2.4 test-data ディレクトリ作成
  - Directory: `.qa-workflow/test-data/`
  - Purpose: テストデータ管理

---

## Phase 5: 新規QAツール実装 (3-4週間)

### 5.1 Phase 1 ツール: テスト観点生成
- [ ] 5.1.1 extract_test_perspectives ツール
  - File: `src/tools/extract-test-perspectives.ts`
  - Create: 仕様書からテスト観点抽出ツール
  - Purpose: 要件・設計からのテスト観点生成

- [ ] 5.1.2 analyze_risk_factors ツール
  - File: `src/tools/analyze-risk-factors.ts`
  - Create: リスク分析によるテスト観点ツール
  - Purpose: 過去データからのリスクベーステスト観点

### 5.2 Phase 2 ツール: テストケース設計
- [ ] 5.2.1 generate_test_cases ツール
  - File: `src/tools/generate-test-cases.ts`
  - Create: テスト観点からテストケース生成ツール
  - Purpose: 体系的なテストケース生成

- [ ] 5.2.2 design_test_data ツール
  - File: `src/tools/design-test-data.ts`
  - Create: テストデータ設計ツール
  - Purpose: テストケース対応のデータ設計

### 5.3 Phase 3 ツール: テスト実行管理
- [ ] 5.3.1 execute_test_session ツール
  - File: `src/tools/execute-test-session.ts`
  - Create: テスト実行セッション管理ツール
  - Purpose: テスト実行の進捗・結果管理

- [ ] 5.3.2 generate_quality_report ツール
  - File: `src/tools/generate-quality-report.ts`
  - Create: 品質レポート生成ツール
  - Purpose: テスト結果の品質評価・レポート

### 5.4 ツール統合
- [ ] 5.4.1 ツールインデックス更新
  - File: `src/tools/index.ts`
  - Update: 新しいQAツールの登録、不要ツールの削除
  - Purpose: MCPツールの統合管理

---

## Phase 6: ダッシュボード改修 (2-3週間)

### 6.1 React コンポーネント変更
- [ ] 6.1.1 メインナビゲーション変更
  - File: `src/dashboard_frontend/src/components/Navigation.tsx`
  - Change: QAワークフロー向けナビゲーション
  - Purpose: QAダッシュボード対応

- [ ] 6.1.2 プロジェクト概要画面変更
  - File: `src/dashboard_frontend/src/pages/Dashboard.tsx`
  - Change: テストプロジェクト概要表示
  - Purpose: QA進捗の可視化

### 6.2 新しいQA専用画面
- [ ] 6.2.1 テスト実行ダッシュボード
  - File: `src/dashboard_frontend/src/pages/TestExecution.tsx`
  - Create: テスト実行状況の可視化画面
  - Purpose: リアルタイムテスト進捗

- [ ] 6.2.2 品質メトリクス画面
  - File: `src/dashboard_frontend/src/pages/QualityMetrics.tsx`
  - Create: 品質指標表示画面
  - Purpose: 品質状況の可視化

- [ ] 6.2.3 テストカバレッジマトリックス
  - File: `src/dashboard_frontend/src/pages/CoverageMatrix.tsx`
  - Create: カバレッジ管理画面
  - Purpose: テスト網羅性の管理

- [ ] 6.2.4 リリース判定画面
  - File: `src/dashboard_frontend/src/pages/ReleaseReadiness.tsx`
  - Create: リリース判定支援画面
  - Purpose: 品質基準に基づくリリース判定

### 6.3 データ管理・API変更
- [ ] 6.3.1 QAデータパーサー
  - File: `src/dashboard/qa-parser.ts`
  - Create: QAワークフロー専用データ解析
  - Purpose: QA成果物の解析・表示

- [ ] 6.3.2 QA専用API エンドポイント
  - File: `src/dashboard/server.ts`
  - Update: QAデータ取得API追加
  - Purpose: QAダッシュボードデータ連携

---

## Phase 7: 国際化・設定対応 (1週間)

### 7.1 多言語対応
- [ ] 7.1.1 QA用語の翻訳追加
  - Files: `src/dashboard_frontend/src/locales/*.json`
  - Add: QAワークフロー用語の多言語対応
  - Purpose: グローバルQAエンジニア対応

### 7.2 設定システム拡張
- [ ] 7.2.1 QA設定項目追加
  - File: `src/config.ts`
  - Add: バグトラッキング連携、自動化ツール連携設定
  - Purpose: QAツール統合対応

---

## Phase 8: テスト・統合 (1-2週間)

### 8.1 ユニットテスト作成
- [ ] 8.1.1 QAツールのテスト
  - Files: `tests/tools/qa-*.test.ts`
  - Create: 新しいQAツールのユニットテスト
  - Purpose: ツール品質保証

- [ ] 8.1.2 型定義テスト
  - File: `tests/types.test.ts`
  - Update: QA型定義のテスト
  - Purpose: 型安全性保証

### 8.2 統合テスト
- [ ] 8.2.1 QAワークフロー統合テスト
  - File: `tests/integration/qa-workflow.test.ts`
  - Create: エンドツーエンドQAワークフローテスト
  - Purpose: 統合動作確認

### 8.3 ダッシュボードテスト
- [ ] 8.3.1 QAダッシュボードテスト
  - Files: `tests/dashboard/qa-*.test.ts`
  - Create: QAダッシュボード機能テスト
  - Purpose: UI/UX品質保証

---

## Phase 9: ドキュメント・パッケージング (1週間)

### 9.1 ドキュメント更新
- [ ] 9.1.1 ユーザーガイド作成
  - File: `docs/QA-USER-GUIDE.md`
  - Create: QAエンジニア向け使用ガイド
  - Purpose: ユーザビリティ向上

- [ ] 9.1.2 API リファレンス更新
  - File: `docs/QA-TOOLS-REFERENCE.md`
  - Create: QAツールの完全リファレンス
  - Purpose: 開発者・ユーザー支援

- [ ] 9.1.3 設定ガイド更新
  - File: `docs/QA-CONFIGURATION.md`
  - Create: QAワークフロー設定ガイド
  - Purpose: セットアップ支援

### 9.2 パッケージング
- [ ] 9.2.1 ビルド設定更新
  - File: `package.json` scripts
  - Update: QA向けビルドプロセス
  - Purpose: 配布準備

- [ ] 9.2.2 リリースノート作成
  - File: `CHANGELOG.md`
  - Update: QA Workflow MCP への移行記録
  - Purpose: 変更履歴管理

---

## 優先度付きタスクサマリー

### 🔴 高優先度 (Phase 1-3: 基盤変更)
1. TypeScript型定義変更
2. 既存ツール改修 (approvals, test-status)
3. 不要ファイル削除
4. ワークスペース構造変更

### 🟡 中優先度 (Phase 4-6: QA機能実装)
1. QA専用テンプレート作成
2. 新規QAツール実装
3. ダッシュボード改修

### 🟢 低優先度 (Phase 7-9: 仕上げ)
1. 多言語対応
2. テスト・品質保証
3. ドキュメント整備

---

## 推定工数
- **合計**: 約 10-16週間
- **コア機能**: 約 6-8週間 (Phase 1-5)
- **UI/UX**: 約 2-3週間 (Phase 6)
- **品質保証**: 約 2-3週間 (Phase 7-9)

## 次のアクション
1. フェーズ1から順次実装開始
2. 各フェーズ完了時に動作確認
3. 継続的な統合テスト実施