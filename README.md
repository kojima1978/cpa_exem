# CPA短答ドリル

公認会計士試験（短答式）の問題演習Webアプリ。

## 技術スタック

- **フロントエンド**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **バックエンド**: Next.js API Routes
- **データベース**: SQLite（Prisma ORM）
- **実行環境**: Docker（standalone モード）

## 主な機能

### 演習モード（8種類）

| モード | 説明 |
|--------|------|
| 全問 | 全問題からランダム出題（出題頻度による重み付け） |
| 未回答のみ | まだ回答していない問題のみ |
| 学習単位指定 | 特定の学習単位（セッション）から出題 |
| ブックマークのみ | ブックマーク済みの問題のみ |
| 間違えた問題 | 直近の回答が不正解だった問題 |
| 苦手問題 | 個別問題の正答率が閾値以下の問題（2回以上回答が条件） |
| 苦手分野 | 分野全体の正答率が閾値以下の分野の全問題（5回以上回答が条件） |
| 要復習 | SM-2アルゴリズムによる間隔反復で復習時期の問題 |

### 演習機能

- **正誤問題 / 多肢選択問題** 対応
- **キーボードショートカット**: `1`/`←` = 正しい、`2`/`→` = 誤り、`1-5` = 多肢選択、`Enter`/`Space` = 次へ、`b` = ブックマーク、`s` = わからない、`u` = 自信なし
- **わからない（スキップ）**: 答えがわからない場合に選択肢を選ばずスキップ（不正解扱い、復習対象に登録）
- **自信なし**: 正解したが確信がない場合にマーク（復習対象に登録）
- **ブックマーク**: 問題を保存して後で見返せる
- **回答時間記録**: 問題ごとの回答時間を計測

### 結果画面

- 正答率・平均回答時間
- 分野別正答率（プログレスバー表示）
- 間違えた問題・わからなかった問題・自信なしの問題を個別に表示
- 要復習問題のみ再挑戦ボタン

### 管理機能（/admin）

- **ダッシュボード**: 科目別の問題数・回答数・正答率
- **科目管理**: 科目のCRUD
- **分野管理**: 科目ごとの分野（トピック）管理
- **学習単位管理**: 科目ごとのセッション管理
- **問題管理**: 問題の一覧・検索・編集・削除（科目/分野/学習単位/出題頻度でフィルタ）
- **テキストインポート**: OCR整形済みテキストからの一括インポート

### その他

- **出題頻度重み付け**: A（出題高）:B（普通）:C（出題低） = 5:3:1 の確率で出題
- **SM-2間隔反復**: 回答履歴に基づき最適な復習タイミングを計算
- **学習ストリーク**: 日別の回答数・正解数を記録
- **ホーム画面**: 科目別進捗、今日の学習、復習待ち件数

## セットアップ

### 必要環境

- Docker / Docker Compose

### 起動（本番モード）

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

初回起動時に以下が自動実行されます:
- データベース作成（SQLite）
- スキーマ適用（Prisma db push）
- 初期データ投入（4科目 + 財務会計論の分野・学習単位）

起動後 `http://localhost:3020` でアクセス。

### 起動（開発モード）

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

ソースコードの変更がホットリロードで反映されます。

### 停止

```bash
docker compose down
```

### データの永続化

SQLite データベースは Docker ボリューム `db-data` に保存されます。
`docker compose down` ではデータは保持されます。
`docker compose down -v` でボリュームごと削除されます。

## Raspberry Pi 5 (8GB) へのデプロイ

### 動作要件

| 項目 | 要件 |
|------|------|
| ハードウェア | Raspberry Pi 5（8GB RAM） |
| OS | Raspberry Pi OS（64-bit）またはUbuntu Server 24.04（arm64） |
| Docker | Docker Engine 24+ / Docker Compose v2 |
| ストレージ | microSD 32GB以上（SSD推奨） |

### Docker インストール（Raspberry Pi OS）

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 再ログイン後に有効
```

### デプロイ手順

```bash
# リポジトリをクローン
git clone https://github.com/kojima1978/cpa_exem.git
cd cpa_exem

# 本番モードで起動（初回ビルドは3-5分）
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### パフォーマンス推奨設定

**SSD の使用を推奨**: microSD は I/O が遅く、ビルド時間やDB アクセスに影響します。USB SSD からの起動を推奨します。

**スワップの設定**（ビルド時のメモリ不足対策）:

```bash
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 自動起動

Docker Compose の `restart: unless-stopped` により、Pi の再起動後も自動的にコンテナが起動します。

### LAN 内アクセス

Pi の IP アドレスを確認し、同じネットワーク内の端末からアクセス:

```bash
hostname -I
# 例: 192.168.1.100
```

ブラウザで `http://192.168.1.100:3020` を開く。

### リソース使用量の目安

| 項目 | 目安 |
|------|------|
| メモリ | 200-300MB（実行時） |
| CPU | アイドル時ほぼ0%、回答送信時一瞬スパイク |
| ストレージ | Docker イメージ約500MB + DB数MB |

## 問題データ

問題テキストのインポート手順は [IMPORT_GUIDE.md](IMPORT_GUIDE.md) を参照。

### データ構造

```
科目（Subject）
  └── 分野（Topic）
        └── 問題（Question）
              ├── 選択肢（Choice）
              ├── 回答履歴（AnswerHistory）
              └── ブックマーク（Bookmark）
  └── 学習単位（Session）
        └── 問題（Question）
```

### 現在の問題数

| 科目 | 問題数 |
|------|--------|
| 財務会計論 | 1,690問（40章） |
| 管理会計論 | 準備中 |
| 監査論 | 準備中 |
| 企業法 | 準備中 |

## API一覧

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/subjects | 科目一覧 |
| GET | /api/topics | 分野一覧 |
| GET | /api/topics/accuracy | 分野別正答率 |
| GET | /api/sessions | 学習単位一覧 |
| GET | /api/questions | 問題一覧（フィルタ対応） |
| GET | /api/practice | 演習用問題取得（モード指定） |
| POST | /api/answers | 回答送信 |
| POST | /api/answers/unsure | 自信なしマーク |
| GET | /api/stats | 学習統計 |
| GET | /api/review | 復習対象件数 |
| POST | /api/review/recalculate | nextReviewAt一括再計算 |
| GET | /api/admin/stats | 管理用統計 |
| POST | /api/questions/import-text | テキストインポート |
