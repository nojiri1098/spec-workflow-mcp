# QA Workflow MCP Migration Plan

## 概要

既存の`spec-workflow-mcp`をQAエンジニア向けの`qa-workflow-mcp`に完全改修する設計書。
開発者向けのスペック管理から、QAエンジニア向けのテストワークフロー管理に変更。

## 1. ワークフロー変更

### Before (開発ワークフロー)
```
Requirements → Design → Tasks → Implementation
```

### After (QAワークフロー)
```
Test Perspectives → Test Cases → Test Execution
```

#### Phase 1: Test Perspective Generation (テスト観点生成)
- **目的**: 様々な情報源からテスト観点を抽出・整理
- **入力**: 要件仕様書、設計書、API仕様、UI/UXデザイン、過去のバグレポート、ユーザーストーリー
- **出力**: 構造化されたテスト観点

#### Phase 2: Test Case Design (テストケース設計)
- **目的**: テスト観点からテストケースを体系的に生成
- **入力**: Phase 1のテスト観点
- **出力**: 実行可能なテストケース

#### Phase 3: Test Execution Management (テスト実行管理)
- **目的**: テストケースの実行・結果管理・レポート
- **入力**: Phase 2のテストケース
- **出力**: テスト結果・品質評価

## 2. MCPツール構成変更

### 既存ツールの活用・改修

#### 2.1 `approvals` → QAレビューフロー (改修)
- **用途**: テスト観点、テストケース、テスト結果の人間レビュー
- **変更点**:
  ```typescript
  // Before
  category: 'spec' | 'steering'

  // After
  category: 'test-perspective' | 'test-case' | 'test-result'
  ```
- **新しい承認フロー**:
  1. テスト観点レビュー - 抽出されたテスト観点の妥当性チェック
  2. テストケースレビュー - テストケースの網羅性確認
  3. テスト結果レビュー - テスト実行結果の妥当性

#### 2.2 `spec-status` → `test-status` (改修)
- **用途**: テストプロジェクトの進捗管理
- **変更点**:
  ```typescript
  // Before
  phases: { requirements, design, tasks, implementation }

  // After
  phases: {
    testPerspectives: PhaseStatus,
    testCases: PhaseStatus,
    testExecution: PhaseStatus,
    qualityReport: PhaseStatus
  }
  ```

### 廃棄ツール
- `spec-workflow-guide` - 削除
- `steering-guide` - 削除

### 新規QA専用ツール (6つ)

#### Phase 1: テスト観点生成ツール
1. **`extract_test_perspectives`**
   - 仕様書・要件からテスト観点を抽出
   - 入力: 仕様書、要件書、設計書
   - 出力: 構造化されたテスト観点リスト

2. **`analyze_risk_factors`**
   - 過去データ・リスクからテスト観点を分析
   - 入力: 過去バグ、リスク情報
   - 出力: リスクベーステスト観点

#### Phase 2: テストケース設計ツール
3. **`generate_test_cases`**
   - テスト観点からテストケースを生成
   - 入力: テスト観点、テスト技法指定
   - 出力: 実行可能なテストケース

4. **`design_test_data`**
   - テストケース用のテストデータ設計
   - 入力: テストケース、データ要件
   - 出力: テストデータセット

#### Phase 3: テスト実行管理ツール
5. **`execute_test_session`**
   - テスト実行セッションの管理
   - 入力: テストケース、実行計画
   - 出力: 実行結果、不具合レポート

6. **`generate_quality_report`**
   - 品質評価レポート生成
   - 入力: テスト結果、カバレッジ情報
   - 出力: 品質レポート、リリース判定

### 最終ツール構成 (8ツール)
```
QA専用MCPツール:
├── 管理系 (2ツール)
│   ├── approvals      # QAレビューフロー
│   └── test-status    # 進捗管理
├── Phase1: テスト観点生成 (2ツール)
│   ├── extract_test_perspectives
│   └── analyze_risk_factors
├── Phase2: テストケース設計 (2ツール)
│   ├── generate_test_cases
│   └── design_test_data
└── Phase3: テスト実行管理 (2ツール)
    ├── execute_test_session
    └── generate_quality_report
```

## 3. プロジェクト構造変更

### ディレクトリ構造

#### Before
```
.spec-workflow/
  approvals/
  archive/
  specs/
  steering/
  templates/
    requirements-template.md
    design-template.md
    tasks-template.md
    tech-template.md
    product-template.md
    structure-template.md
  user-templates/
  config.example.toml
```

#### After
```
.qa-workflow/                    # メインQAワークフロー
├── perspectives/                # Phase 1: テスト観点
│   ├── requirements-based/      # 要件ベース観点
│   ├── design-based/           # 設計ベース観点
│   ├── risk-based/             # リスクベース観点
│   └── user-based/             # ユーザビリティ観点
├── test-cases/                 # Phase 2: テストケース
│   ├── functional/             # 機能テスト
│   ├── integration/            # 結合テスト
│   ├── performance/            # 性能テスト
│   └── security/               # セキュリティテスト
├── executions/                 # Phase 3: テスト実行
│   ├── sessions/               # 実行セッション
│   ├── results/                # 実行結果
│   └── reports/                # 品質レポート
├── test-data/                  # テストデータ
├── approvals/                  # QAレビュー管理 (既存活用)
├── templates/                  # QA用テンプレート (新規作成)
│   ├── test-perspective-template.md
│   ├── test-case-template.md
│   ├── test-execution-template.md
│   └── quality-report-template.md
└── config.toml                # QA設定
```

### パッケージ情報変更
```json
{
  "name": "@pimzino/qa-workflow-mcp",  // 変更
  "description": "MCP server for QA-driven testing workflow with test perspective extraction and execution management",  // 変更
  "bin": {
    "qa-workflow-mcp": "dist/index.js"  // 変更
  }
}
```

## 4. TypeScript型定義変更

### 4.1 基本型の変更

#### Before
```typescript
export interface SpecData {
  name: string;
  phases: {
    requirements: PhaseStatus;
    design: PhaseStatus;
    tasks: PhaseStatus;
    implementation: PhaseStatus;
  };
}
```

#### After
```typescript
export interface TestProjectData {
  name: string;
  phases: {
    testPerspectives: PhaseStatus;
    testCases: PhaseStatus;
    testExecution: PhaseStatus;
    qualityReport: PhaseStatus;
  };
}
```

### 4.2 新しい型定義

```typescript
export interface TestPerspective {
  id: string;
  category: 'requirements-based' | 'design-based' | 'risk-based' | 'user-based';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  source: string; // 情報源
  testConditions: string[];
}

export interface TestCase {
  id: string;
  perspectiveId: string;
  title: string;
  description: string;
  preconditions: string[];
  steps: TestStep[];
  expectedResult: string;
  testData?: string;
  priority: 'high' | 'medium' | 'low';
  category: 'functional' | 'integration' | 'performance' | 'security';
}

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface TestExecution {
  id: string;
  testCaseId: string;
  sessionId: string;
  status: 'pass' | 'fail' | 'blocked' | 'skip';
  executedAt: string;
  actualResult?: string;
  notes?: string;
  defects?: string[];
}

export interface QualityReport {
  projectName: string;
  testSummary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    blockedTests: number;
    skippedTests: number;
  };
  coverage: {
    perspectiveCoverage: number;
    testCaseCoverage: number;
  };
  riskAssessment: {
    highRiskAreas: string[];
    mitigatedRisks: string[];
  };
  recommendation: string;
  releaseReadiness: 'ready' | 'not-ready' | 'conditional';
}
```

## 5. ダッシュボード機能変更

### 5.1 新しいダッシュボード構成

#### Before (開発向け)
- Specs Overview
- Tasks Progress
- Approval Requests

#### After (QA向け)
- Test Project Overview
- Test Execution Dashboard
- Bug Tracking Board
- Quality Metrics View
- Test Coverage Matrix
- Release Readiness View

### 5.2 新しいUI コンポーネント

1. **Test Execution Dashboard** - 実行状況の可視化
2. **Bug Tracking Board** - バグステータス管理
3. **Quality Metrics View** - 品質指標表示
4. **Test Coverage Matrix** - カバレッジ管理
5. **Release Readiness View** - リリース判定支援

## 6. テンプレートシステム変更

### 廃棄テンプレート
- `requirements-template.md`
- `design-template.md`
- `tasks-template.md`
- `tech-template.md`
- `product-template.md`
- `structure-template.md`

### 新規QA用テンプレート

#### 6.1 `test-perspective-template.md`
```markdown
# Test Perspectives: [Project Name]

## Requirements-Based Perspectives
- [テスト観点1]
- [テスト観点2]

## Design-Based Perspectives
- [テスト観点1]
- [テスト観点2]

## Risk-Based Perspectives
- [テスト観点1]
- [テスト観点2]

## User-Based Perspectives
- [テスト観点1]
- [テスト観点2]
```

#### 6.2 `test-case-template.md`
```markdown
# Test Cases: [Feature Name]

## TC001: [Test Case Title]
- **Perspective**: [対応するテスト観点ID]
- **Priority**: High/Medium/Low
- **Category**: Functional/Integration/Performance/Security
- **Preconditions**:
- **Test Steps**:
  1. [Step 1]
  2. [Step 2]
- **Expected Result**:
- **Test Data**:
```

#### 6.3 `test-execution-template.md`
```markdown
# Test Execution Session: [Session Name]

## Session Information
- **Date**: [YYYY-MM-DD]
- **Tester**: [Name]
- **Environment**: [Test Environment]

## Test Results
| Test Case ID | Status | Notes |
|--------------|--------|-------|
| TC001        | Pass   |       |
| TC002        | Fail   | [Bug#] |
```

#### 6.4 `quality-report-template.md`
```markdown
# Quality Report: [Project Name]

## Test Summary
- **Total Tests**: X
- **Pass Rate**: X%
- **Fail Rate**: X%

## Risk Assessment
- **High Risk Areas**:
- **Mitigated Risks**:

## Release Recommendation
- **Status**: Ready/Not Ready/Conditional
- **Reasoning**:
```

## 7. 設定ファイル変更

### config.toml の変更
```toml
[project]
name = "qa-workflow-mcp"
type = "qa-testing"

[qa]
defaultTestEnvironment = "staging"
bugTrackingIntegration = "jira" # jira, github, none
automationIntegration = "selenium" # selenium, playwright, none

[dashboard]
port = 3000
autoStart = false

[templates]
customTemplatesDir = "user-templates"
```

## 8. 国際化対応 (i18n)

### QA用語集の追加
- Test Perspective → テスト観点
- Test Case → テストケース
- Test Execution → テスト実行
- Quality Report → 品質レポート
- Risk Assessment → リスク評価
- Release Readiness → リリース判定

## 9. 統合機能

### 9.1 外部ツール連携
- **Jira/GitHub Issues連携** - バグトラッキング
- **自動化ツール連携** - Selenium, Playwright等
- **CI/CDパイプライン統合** - テスト結果の自動取り込み
- **テスト結果インポート/エクスポート** - JUnit XML, Allure等

### 9.2 レポート機能
- テスト実行サマリー
- 品質メトリクス
- カバレッジレポート
- リスク分析レポート

---

## 次のステップ

このドキュメントを基に、具体的な実装タスクを洗い出し、段階的に移行を実行する。