# FXリアルタイムモニター＆シグナルシステム設計メモ（GMOコイン対応）

## ゴール
- GMOコイン（https://api.coin.z.com/docs/）のPublic WebSocketからFXティックを取得し、1分足・5分足の指標（SMA/RSI/ボリンジャーバンド）を更新。
- ティックごとに逆張りロジックでシグナル判定。
- シグナル発生時だけPostgreSQLへ履歴保存し、Reactフロントでリアルタイム表示。

## 技術スタック
- **バックエンド**: Python 3.12 + FastAPI, websockets/aiohttp, pandas, pandas_ta, SQLAlchemy, Alembic
- **ミドルウェア**: PostgreSQL (Render Managed). 将来スケール用にRedis等の導入余地を残す。
- **フロントエンド**: React + TypeScript + Vite, React Query, WebSocket API, UI（Tailwind CSS or Chakra UI）
- **デプロイ**: Render（FastAPI Web Service, React Static Site, Managed PostgreSQL）

## GMOコイン WebSocket要点
- エンドポイント (FX): `wss://forex-api.coin.z.com/ws/public/v1`
- 主要チャンネル:
  - `ticker`（最新レート: ask/bid/last/volume/timestamp）
  - `orderbooks`（板情報）
  - `trades`（約定履歴）
- 購読メッセージ例:
  ```json
  {"command":"subscribe","channel":"ticker","symbol":"USD_JPY"}
  ```
- Public WebSocketは認証不要。リクエストは1秒に1回が上限のため、接続時はRateLimiterでsubscribe間隔を制御。
- Private REST API を利用する場合は `GET: 6回/秒`、`POST: 1回/秒` の制限を守る（`services/rate_limiter.py` にラッパーを用意）。

## システム全体フロー
```mermaid
flowchart TD
    A[WebSocketティック受信<br/>GMOコイン] --> B[最新価格キャッシュ更新]
    B --> C{足確定?}
    C -- Yes --> D[インジケータ計算<br/>SMA/RSI/BB]
    C -- No --> E[ティック判定]
    D --> E
    E --> F{シグナル発生?}
    F -- Yes --> G[PostgreSQLへ保存]
    F -- No --> H[フロントへ配信]
    G --> H
```

## バックエンド構成案
```
backend/
  app/
    main.py                # FastAPI初期化, 起動フック
    deps.py                # DI/設定
    configs.py             # 設定管理（APIキー, 銘柄リスト, トリガー閾値）
    api/
      routes/
        websocket.py       # /ws/prices で最新価格/シグナルをpush
        signals.py         # /api/signals/history などREST
    core/
      stream.py            # GMOコインWSの接続・再接続
      candles.py           # 1分/5分足集約・足確定判定
      indicators.py        # pandas/pandas_taでインジ計算
      signals.py           # BB逆張りなどのシグナル判定
      notifier.py          # 判定結果をWebSocketブロードキャストへ渡す
    repositories/
      signals_repo.py      # PostgreSQL書き込み
    models/
      signal.py            # SQLAlchemyモデル
    schemas/
      signal.py            # Pydanticレスポンス
    services/
      indicator_store.py   # メモリキャッシュ（最新指標, dataclasses）
    utils/
      time.py, logger.py
  tests/
    unit/*
    integration/*
```

### 主要処理の詳細
- **ティック受信（core/stream.py）**
- `websockets.connect` で `wss://forex-api.coin.z.com/ws/public/v1` に接続。
  - 心拍監視（30sec ping/pong）、エラー時は指数バックオフで再接続。
  - 購読チャンネル: 最低限 `ticker`（USD_JPYなどFXペア）。追加で必要なら `orderbooks`。
  - 受信ごとに非同期Queueへティックデータをpush。
- **足集約（core/candles.py）**
  - Queueからティックを取り出し、1分/5分バケット単位でOHLCVを更新。
  - 足確定条件: `floor(timestamp/60) != 現行分` でフラッシュし、新しいDataFrameへappend。
- **インジケータ計算（core/indicators.py）**
- pandasでOHLCを保持し、pandas_ta等を利用してSMA(5/21)/RSI(14)/BB(21±2,±3)を計算。RCI(6/9/27)は自前実装。
- 線形回帰（Window=10本）でSMA21の傾きを算出し、1.5pipsを閾値に上昇/下降/横ばいを判定。
- 結果は `IndicatorSnapshot` に格納し、WebSocketで `indicator` イベントとして配信。
- **シグナル判定 + ポジション管理（core/signals.py / services/positions.py）**
  - ティック受信ごとに最新スナップショットを参照し、BB±σタッチで BUY/SELL を判定。使用σは `INDICATOR_CONFIG.signal_bb_sigma` で切替可能。
  - `PositionManager` は Lot・pipサイズ・損切り/利確pips・手数料率（0.002%）を保持。ポジションオープン時にオープン手数料、クローズ時にクローズ手数料を差し引いた純損益を算出。
  - 損益計算: `PnL = (価格差 × lot × 方向) - (open_fee + close_fee)`。各イベントに `fee_paid` を付与し、履歴に反映。
- **API層**
  - `/ws/prices`: ティック・足・指標・シグナル・ポジションイベントを push。
  - `/api/trading/config`: 逆張りロジックの各種パラメータを取得/更新。
- `/api/trading/positions`: 現在のポジション一覧を返却（オープン手数料・評価損益を含む）。
  - `/api/trading/positions/{symbol}/close`: 手動クローズ。
- **API層**
  - `/ws/prices`: FastAPI `WebSocket`。バックエンド内の`Broadcast`（Starlette）か`asyncio.Queue`でリアルタイムpush。
  - `/api/signals/latest`: 直近シグナルを返す。
  - `/api/signals/history?limit=100&cursor=...`: ページング対応。React Queryで利用。
- **永続化**
  - Alembicでマイグレーション管理。
  - テーブル定義:
    ```sql
    CREATE TABLE signals (
      id            SERIAL PRIMARY KEY,
      occurred_at   timestamptz NOT NULL,
      symbol        text NOT NULL,
      price         numeric(18,6) NOT NULL,
      timeframe     text NOT NULL,
      sma           numeric(18,6),
      rsi           numeric(10,4),
      bb_upper      numeric(18,6),
      bb_lower      numeric(18,6),
      signal_type   text NOT NULL CHECK (signal_type IN ('BUY','SELL')),
      metadata      jsonb DEFAULT '{}'::jsonb
    );
    CREATE INDEX idx_signals_occurred_at ON signals (occurred_at DESC);
    CREATE INDEX idx_signals_symbol_timeframe ON signals (symbol, timeframe);
    ```

## フロントエンド設計
- **主要ビュー**
  1. **ヘッダー/ステータス**: 現在の接続状態・遅延ms。
  2. **最新レートカード**: bid/ask/spread, 前日比。WebSocketイベントで即時更新。
  3. **最新シグナルパネル**: 方向（BUY/SELL）, 価格, timeframe, 発生時刻。
  4. **履歴テーブル**: ページング or 無限スクロール, タグ/フィルタ（銘柄, timeframe, シグナル種別）。
  5. （拡張）チャート描画: `lightweight-charts` で1分足を描画し、シグナル位置にマーカーを表示。
- **状態管理**
  - WebSocket → Zustand store（`useMarketStore`）。
  - RESTレスポンス → React Query (`useQuery` / `useInfiniteQuery`).
  - 接続が切れた場合はトースト通知し、自動再接続（指数バックオフ）。
- **コンポーネント構成例**
  - `App.tsx`
  - `components/PriceTicker.tsx`
  - `components/SignalBadge.tsx`
  - `components/SignalTable.tsx`
  - `components/LatencyIndicator.tsx`
  - `hooks/useMarketWS.ts`
  - `services/api.ts`

### 実装済みUI
- 価格・指標・ポジションをカード/テーブルで可視化。チャート表示は無し。
- `TradingConfigForm` から Lot数/損切りpips/利確pips を操作可能（pipサイズと手数料率は読み取り専用）。
- `PositionPanel` で保有ポジションの評価損益・手数料を確認、手動クローズボタンあり。
- `IndicatorPanel` で SMA5/21・RSI14・RCI6/9/27・BB21±2/±3・トレンド（傾きpips）を表示。
- `SignalList` にシグナル時点の SMA/RSI とトレンド判定を表示。
- `PositionPanel` で保有ポジションの評価損益と手動クローズボタンを表示（API経由でクローズすると WebSocket にも反映）。
- `IndicatorPanel` / `CandleTable` で最新1分・5分足のOHLCとインジケータ値を確認。
- `SignalList` は逆張りシグナルの履歴を表示（SMA/RSI含む）。

## デプロイと運用（Render）
1. **FastAPIサービス**
   - Dockerfile例:
     ```Dockerfile
     FROM python:3.12-slim
     WORKDIR /app
     RUN pip install --upgrade pip && pip install poetry
     COPY pyproject.toml poetry.lock ./
     RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-root
     COPY app ./app
     CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
     ```
   - Render環境変数: `DATABASE_URL`, `GMO_SYMBOLS=USD_JPY,EUR_JPY`, `SIGNAL_CONFIG=...`。
   - スタートコマンドでAlembicマイグレーション: `alembic upgrade head && uvicorn ...`。
2. **PostgreSQL**
   - Render Managed PostgreSQLを作成。バックアップ設定、SSL必須。
3. **Reactフロント**
   - `yarn build` → Render Static Site。
   - `VITE_API_BASE=https://<fastapi-service>.onrender.com` を設定。
4. **ドメイン/HTTPS**: Render標準。必要に応じてカスタムドメイン。
5. **監視**
   - FastAPIログでエラー検知。
   - RenderのHealth Check（`/healthz`）を追加し、WebSocket接続中も監視。
   - 将来的にはOpenTelemetry or Sentry導入。

## セキュリティ・信頼性
- WebSocket再接続時の一時データ欠落を最小にするため、最後の受信タイムスタンプを保持し、ギャップが生じた場合はREST APIで補完（`/public/v1/ticker`）。
- DB書き込みは非同期タスクで行い、APIレスポンス遅延を防止。
- Renderの環境変数で機密情報を管理。Gitに含めない。
- Alembic、pytest、mypy、ruffなどをCIに組み込む。

## ローカル開発環境（Docker Compose）
ローカルのPython/Node環境を汚さずに開発できるよう、Docker Composeでバックエンド・フロント・DBをまとめて起動する。

リポジトリ直下の `compose.yaml` を使って、以下の構成でスタックを起動できる。

```yaml
services:
  api:
    build:
      context: .
      dockerfile: backend/Dockerfile.dev
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql+psycopg://postgres:postgres@db:5432/fxsignals
      - GMO_SYMBOLS=["USD_JPY"]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8001:8000"
    depends_on:
      - db

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/usr/src/app
    environment:
      - VITE_API_BASE=http://localhost:8001
    command: npm run dev -- --host 0.0.0.0 --port 5173
    ports:
      - "5173:5173"
    depends_on:
      - api

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=fxsignals
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5433:5432"

volumes:
  pgdata:
```

### セットアップ手順
1. `backend/Dockerfile.dev` には `poetry install` や `uv` を使った開発用セットアップを記述。`frontend/Dockerfile.dev` は `node:20` などをベースに `npm install` を実行。
2. `.env` などでAPIキーやRenderと異なる設定を管理。GMOのPrivate APIを使う場合は `GMO_API_KEY` / `GMO_API_SECRET` を `.env.dev` に記載し、本番はRenderの環境変数に設定する。Compose起動時は `docker compose --env-file .env.dev up --build` を利用。
3. FastAPIのホットリロードが効くように `volumes` でソースをコンテナにマウントし、`--reload` を付与。フロントも同様にViteのHMRを利用。
4. テストやマイグレーションは `docker compose run --rm api pytest`、`docker compose run --rm api alembic upgrade head` のように実行。
5. フロントエンドは必要に応じて `docker compose --profile ui up frontend` で起動する（APIとDBは自動依存起動）。

## MVP開発ステップ
1. **ティック受信プロトタイプ**: ローカルで`websockets`を使いUSD_JPY tickerを受信・ログ出力。
2. **足集約と指標計算**: ダミーティックをリプレイし、1分/5分足に対してSMA/RSI/BBを更新するユニットテストを作成。
3. **シグナルロジック**: BB±2σタッチでのBUY/SELL判定を検証。ヒステリシス設定。
4. **FastAPI統合**: 背景タスクでWSを走らせつつ、REST/WebSocketエンドポイントを提供。
5. **PostgreSQL接続**: Alembicでテーブル作成、INSERTテスト。
6. **React UIモック**: WebSocketのダミーサーバーから流すデータを表示する。
7. **Renderデプロイ**: ステージング環境で実データ流しを確認。

## 参考URL
- GMOコインAPIドキュメント: https://api.coin.z.com/docs/
- pandas_ta: https://github.com/twopirllc/pandas-ta
- Render Docs: https://render.com/docs
