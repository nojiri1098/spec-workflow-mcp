import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';

export const qaWorkflowGuideTool: Tool = {
  name: 'qa-workflow-guide',
  description: `QAワークフローの重要な指示を読み込み、テスト観点の抽出からレビューまでのプロセスをガイドします。

# 使用方法
ユーザーがテスト観点抽出、QAワークフロー、テストレビューについて質問した際に、最初にこのツールを呼び出してください。完全なワークフローシーケンス（文書分析 → テスト観点抽出 → レビュー → 承認）に従う必要があります。適切なワークフロー理解を確保するため、他のQAツールより前に必ず読み込んでください。`,
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function qaWorkflowGuideHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  // Get dashboard URL from context or session
  let dashboardUrl = context.dashboardUrl;
  if (!dashboardUrl && context.sessionManager) {
    dashboardUrl = await context.sessionManager.getDashboardUrl();
  }

  const dashboardMessage = dashboardUrl ?
    `ダッシュボードで進捗監視: ${dashboardUrl}` :
    'ダッシュボード利用不可 - ヘッドレスモードで実行中';

  return {
    success: true,
    message: '完全なQAワークフローガイドが読み込まれました - このワークフローに正確に従ってください',
    data: {
      guide: getQAWorkflowGuide(),
      dashboardUrl: dashboardUrl,
      dashboardAvailable: !!dashboardUrl
    },
    nextSteps: [
      'シーケンスに従う: 文書分析 → テスト観点抽出 → レビュー → 承認',
      '必要に応じてテンプレートを使用',
      '各段階でレビューを要求',
      'MCPツールのみを使用',
      dashboardMessage
    ]
  };
}

function getQAWorkflowGuide(): string {
  return `# QAワークフロー ガイド

## 概要

MCPツールを使用してQAエンジニアをガイドし、テスト観点主導の品質保証を実現します。様々な文書（要件、設計、API仕様）からテスト観点を抽出し、レビュープロセスを通じて品質を確保します。

プロジェクト名はケバブケース（例：user-authentication）を使用します。一度に一つのプロジェクトを扱います。

## ワークフロー図
\`\`\`mermaid
flowchart TD
    Start([開始: ユーザーがテスト観点抽出を要求]) --> CheckDocs{文書の準備完了?}
    CheckDocs -->|はい| P1_Extract
    CheckDocs -->|いいえ| P1_Prepare[文書の準備を支援]

    %% フェーズ1: テスト観点抽出
    P1_Prepare --> P1_Extract[extract_test_perspectives<br/>複数文書分析]
    P1_Extract --> P1_Review[テスト観点レビュー]
    P1_Review --> P1_Approve[approvals<br/>action: request]
    P1_Approve --> P1_Status[approvals<br/>action: status]
    P1_Status --> P1_Check{承認状況?}
    P1_Check -->|要修正| P1_Update[フィードバックに基づく修正]
    P1_Update --> P1_Extract
    P1_Check -->|承認済み| P1_Complete[承認完了]

    %% フェーズ2: テストケース設計（将来実装）
    P1_Complete --> P2_Future[将来: テストケース設計]
    P2_Future --> P3_Future[将来: テスト実行]
    P3_Future --> End([QAプロセス完了])

    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style P1_Check fill:#ffe6e6
    style CheckDocs fill:#fff4e6
    style P2_Future fill:#f0f0f0
    style P3_Future fill:#f0f0f0
\`\`\`

## QAワークフロー詳細

### フェーズ1: テスト観点抽出
**目的**: 様々な文書からテスト観点を体系的に抽出し、テストの網羅性を確保する。

**使用ツール**:
- extract_test_perspectives: 文書からテスト観点を抽出
- approvals: レビューと承認プロセスの管理
- spec-status: 進捗状況の確認

**プロセス**:
1. **文書の準備と確認**
   - 要件文書、設計文書、API仕様書などの入力文書を確認
   - 文書タイプを適切に分類（requirements, design, api-spec, ui-design, user-story）

2. **テスト観点の抽出**
   \`\`\`
   extract_test_perspectives
   projectPath: "/path/to/project"
   projectName: "project-name"
   inputDocuments: [
     {filePath: "requirements.md", type: "requirements"},
     {filePath: "api-spec.yaml", type: "api-spec"}
   ]
   \`\`\`

3. **抽出結果の構造化**
   - 機能テスト観点
   - 非機能テスト観点（性能、セキュリティ、使いやすさ）
   - リスク分析
   - テスト条件の定義

4. **レビュープロセス**
   \`\`\`
   approvals action: "request"
   category: "test-perspective"
   title: "プロジェクト名 テスト観点レビュー"
   filePath: "test-perspectives/extracted/ProjectName.md"
   \`\`\`

5. **承認状況の確認**
   \`\`\`
   approvals action: "status"
   approvalId: "[生成されたID]"
   \`\`\`

6. **修正と再提出**
   - フィードバックがある場合、テスト観点を修正
   - 新しいレビューリクエストを作成
   - 承認されるまで繰り返し

### フェーズ2: テストケース設計（将来実装予定）
**目的**: 承認されたテスト観点からテストケースを設計する。

**将来の機能**:
- テスト観点からテストケースへの変換
- テストケースの優先順位付け
- テスト実行計画の作成

### フェーズ3: テスト実行（将来実装予定）
**目的**: 設計されたテストケースを実行し、結果を管理する。

**将来の機能**:
- テスト実行追跡
- 結果記録と分析
- 品質メトリクスの生成

## テスト観点の分類

### 1. 機能テスト観点
- **正常系テスト**: 仕様通りの動作確認
- **異常系テスト**: エラーハンドリングの確認
- **境界値テスト**: 入力値の境界での動作確認
- **統合テスト**: システム間連携の確認

### 2. 非機能テスト観点
- **性能テスト**: レスポンス時間、スループット
- **セキュリティテスト**: 認証、認可、データ保護
- **使いやすさテスト**: UI/UX、アクセシビリティ
- **信頼性テスト**: 可用性、障害復旧

### 3. リスク分析
- **技術的リスク**: 新技術、複雑な実装
- **ビジネスリスク**: 重要な機能、影響範囲
- **運用リスク**: デプロイ、設定変更

## ワークフローのルール

- **MCPツールの使用**: 手動でドキュメントを作成せず、必ずMCPツールを使用
- **テンプレートの活用**: 既存のテンプレート構造に従う
- **段階的なレビュー**: 各フェーズで明示的なレビューを実施
- **一度に一つのプロジェクト**: 複数プロジェクトの並行処理は避ける
- **ケバブケースの使用**: プロジェクト名にはケバブケースを使用
- **承認の確認**: 口頭での承認は受け付けず、システムでの承認状況のみを確認
- **継続的改善**: フィードバックに基づくテスト観点の継続的な改善

## 文書タイプ別の抽出戦略

### 要件文書 (requirements)
- ユーザーストーリーから機能テスト観点を抽出
- 受け入れ条件をテスト条件に変換
- 非機能要件から性能・セキュリティテスト観点を導出

### 設計文書 (design)
- アーキテクチャから統合テスト観点を抽出
- データフローからテストシナリオを作成
- エラーハンドリング設計から異常系テストを導出

### API仕様書 (api-spec)
- エンドポイントごとのテストケースを作成
- リクエスト/レスポンスの検証項目を定義
- 認証・認可のテスト観点を抽出

### UI設計書 (ui-design)
- ユーザビリティテストの観点を抽出
- アクセシビリティ要件の確認
- レスポンシブデザインのテスト項目

### ユーザーストーリー (user-story)
- ユーザージャーニーテストの設計
- ペルソナベースのテストシナリオ
- ユーザー受け入れテストの観点

## 品質保証のポイント

### テスト観点の網羅性
- すべての要件に対応するテスト観点の存在確認
- 機能・非機能の両面からの検討
- リスクベースのテスト優先順位付け

### レビューの効果性
- 複数の観点からのレビュー実施
- フィードバックの具体性と実行可能性
- 継続的な改善サイクルの確立

### 文書化の品質
- テスト観点の明確性と実行可能性
- トレーサビリティの確保
- メンテナンスの容易性

このワークフローに従うことで、体系的で効果的なQAプロセスを実現できます。`;
}