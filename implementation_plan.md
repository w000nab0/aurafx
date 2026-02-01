# aurafx 要件定義 & 実装計画書 (TypeScript版)

## 1. アプリ概要
GMOコインのAPIを利用し、成行注文（Market）を繰り返すリピート系自動売買ツール。ローカルMacでの運用に特化。

## 2. 機能要件
- **取引方式**: 成行（Market）のみ。リピート注文。
- **リスクフィルター**: 新規/決済インターバル、発注許容スプレッド。
- **管理**: ストラテジー別の損益（実現/評価/合計）のリアルタイム集計。

## 3. 技術スタック (TypeScript/Docker)
- **Runtime**: Node.js (TypeScript) / Docker Compose
- **Backend**: Fastify (TypeScript)
- **Frontend**: Next.js (TypeScript)
- **Database**: SQLite
- **Repository**: GitHub

## 4. 開発ステップ
1. **初期環境構築**: Docker Compose と GitHub リポジトリの作成。
2. **API接続確認**: GMOコイン Public API (Ticker取得) の実装。
3. **認証の実装**: Private API用の署名生成ロジック。
4. **DB & ロジック実装**: ストラテジー管理とリピート売買エンジン。
5. **UI構築**: ダークモードのダッシュボード。

---
## Pythonとの比較・懸念点
- **データ分析**: Pythonが得意とする複雑な統計解析は少し手間が増えますが、リピート売買のロジックや損益集計ならTypeScriptで全く問題ありません。
- **同期・非同期**: Node.jsは非同期処理が得意なので、複数のストラテジーを並列で動かす際もスムーズです。
