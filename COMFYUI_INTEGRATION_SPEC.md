# Storyboarder × ComfyUI連携仕様書

## プロジェクト概要

Storyboarder（ストーリーボード作成アプリケーション）にComfyUI（AI画像生成ツール）を統合し、従来の3Dレンダリングによるプレビズ機能にAI画像生成機能を追加する。

## 現在のStoryboarder構造分析

### アプリケーション概要
- **プラットフォーム**: Electron (Node.js v22対応済み)
- **フロントエンド**: React + Three.js (React Three Fiber)
- **バックエンド**: Express Server (P2P通信用)
- **主要機能**: 3Dシーン作成、ストーリーボード編集、VR/AR対応

### 主要コンポーネント

#### 1. Shot Generator (`/src/js/shot-generator/`)
- **役割**: 3Dシーン作成・編集のメイン機能
- **技術**: Three.js + React Three Fiber + WebGL
- **現在のワークフロー**: 
  1. 3Dシーン構成 → 2. WebGLレンダリング → 3. Canvas出力 → 4. 画像保存

#### 2. サーバー (`/server/`)
- **役割**: P2P通信、静的アセット配信
- **技術**: Express + PeerJS
- **現在のAPI**: 主にP2P通信用のエンドポイント

#### 3. 画像処理システム
- **インポート**: ドラッグ&ドロップ、クリップボード、PSDファイル対応
- **エクスポート**: PNG、JPG、PDF、PSD、GIF、動画形式対応
- **処理**: Canvas API、WebGL、PSD解析

## ComfyUI統合戦略

### 統合アプローチ: Shot Generator統合型（推奨）

Shot Generatorに新しい画像生成オプションとしてComfyUIを統合する方式。

#### メリット
- 既存ワークフローに自然に統合
- ユーザビリティが高い
- 開発工数が比較的少ない
- 段階的な機能追加が可能

### 統合ポイントと実装方針

#### 1. UI統合
**場所**: `/src/js/shot-generator/components/Toolbar/`

**新機能**:
- `AI Generate`ボタンをツールバーに追加
- ComfyUIワークフロー選択パネル
- プロンプト入力フォーム
- 生成進捗表示

#### 2. API統合
**場所**: `/src/js/shot-generator/hooks/` および `/server/src/`

**新機能**:
- ComfyUI API通信フック (`use-comfyui-generate.js`)
- サーバー側プロキシエンドポイント (`/api/comfyui/*`)
- WebSocket通信による進捗通知

#### 3. 画像パイプライン統合
**場所**: `/src/js/shot-generator/utils/`

**拡張機能**:
- 既存画像インポートシステムの拡張
- AI生成画像のプロジェクト内統合
- メタデータ管理（生成パラメータ、ワークフロー情報）

## 技術仕様

### 1. サーバーサイド拡張

#### 新規エンドポイント
```
POST /api/comfyui/generate
GET  /api/comfyui/status/:jobId
GET  /api/comfyui/result/:jobId
POST /api/comfyui/workflows
GET  /api/comfyui/workflows
```

#### 実装ファイル
- `/server/src/routes/comfyui/index.js` - APIルート定義
- `/server/src/services/comfyui-client.js` - ComfyUI API通信
- `/server/src/utils/job-queue.js` - 非同期ジョブ管理

### 2. フロントエンド拡張

#### 新規コンポーネント
- `ComfyUIPanel` - メイン統合パネル
- `WorkflowSelector` - ワークフロー選択UI
- `PromptEditor` - プロンプト入力UI
- `GenerationProgress` - 進捗表示UI

#### 実装ファイル
```
/src/js/shot-generator/components/ComfyUIPanel/
├── index.js
├── WorkflowSelector.js
├── PromptEditor.js
├── GenerationProgress.js
└── styles.css
```

#### 新規フック
- `use-comfyui-generate.js` - 生成機能
- `use-comfyui-workflows.js` - ワークフロー管理
- `use-generation-status.js` - 状態管理

### 3. Redux状態管理拡張

#### 新規Reducer
```javascript
// ComfyUI関連の状態管理
const comfyuiReducer = {
  workflows: [],
  currentGeneration: null,
  generationHistory: [],
  settings: {
    comfyuiServerUrl: 'http://localhost:8188',
    defaultWorkflow: null
  }
}
```

### 4. IPC通信拡張

#### 新規IPCチャンネル
- `comfyui:generate` - 生成トリガー
- `comfyui:status` - 状態更新
- `comfyui:complete` - 生成完了通知
- `comfyui:error` - エラー通知

## ユーザーワークフロー設計

### 基本フロー
1. **シーン作成**: 従来通り3Dシーンを構成
2. **AI生成オプション**: 「AI Generate」ボタンクリック
3. **ワークフロー選択**: 利用可能なComfyUIワークフローから選択
4. **パラメータ入力**: プロンプト、設定値入力
5. **生成実行**: ComfyUIでの画像生成開始
6. **結果統合**: 生成画像をプロジェクトに統合

### 高度なワークフロー
- **バッチ生成**: 複数シーンの一括生成
- **スタイル統一**: プロジェクト全体でのスタイル一貫性
- **アニメーション**: キーフレーム間の補間生成

## 実装ロードマップ

### Phase 1: 基盤実装 (2-3週間)
- [ ] サーバーサイドAPI基盤
- [ ] 基本UI統合
- [ ] シンプルな画像生成機能

### Phase 2: 機能拡張 (2-3週間)
- [ ] ワークフロー管理システム
- [ ] 詳細パラメータ制御
- [ ] 生成履歴管理

### Phase 3: 高度機能 (2-4週間)
- [ ] バッチ生成機能
- [ ] カスタムワークフロー対応
- [ ] パフォーマンス最適化

### Phase 4: 統合・最適化 (1-2週間)
- [ ] UI/UX改善
- [ ] エラーハンドリング強化
- [ ] ドキュメント整備

## セキュリティ・運用考慮事項

### セキュリティ
- ComfyUI APIキーの安全な管理
- 生成画像のローカル保存
- ユーザープロンプトのサニタイゼーション

### パフォーマンス
- 大容量画像の効率的な処理
- メモリ使用量の最適化
- 非同期処理によるUI応答性確保

### 互換性
- ComfyUIバージョン管理
- 既存プロジェクトとの互換性維持
- クロスプラットフォーム対応

## 期待される効果

### ユーザーベネフィット
1. **創造性の向上**: AIによる新しいビジュアル表現
2. **効率性の向上**: 高品質な背景・アセットの迅速生成
3. **コスト削減**: 外部アーティストへの依存度低減

### 技術的価値
1. **AI統合の先駆け**: ストーリーボードツールでの先進的AI活用
2. **ワークフロー革新**: 従来手法とAIの効果的な組み合わせ
3. **拡張性**: 将来のAI技術統合への基盤構築

---

**作成日**: 2025-07-14
**バージョン**: v1.0
**次回更新予定**: 実装開始時