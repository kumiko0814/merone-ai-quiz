# VS Code × GAS 自動デプロイ引き継ぎ書

**プロジェクト名**：Merone AI実務力チェック  
**作成日**：2026年5月  
**作業者**：森川公美子  
**目的**：GAS（Google Apps Script）をVS Codeで管理し、`clasp` を使ってコマンド一発でデプロイできる環境を作る

---

## 0. 前提・このドキュメントの読み方

### このドキュメントで実現すること

- VS Code で GAS のコードを書ける
- ターミナルから `clasp push` でGASに反映
- ターミナルから `clasp deploy` でWebアプリをデプロイ
- Git管理で変更履歴を残せる

### 必要な前提環境

| 項目 | 確認方法 | 状態 |
|---|---|---|
| VS Code インストール済み | アプリを開いて確認 | ✓ 済 |
| Node.js v18以上 | `node -v` | 要確認 |
| npm | `npm -v` | 要確認 |
| Googleアカウント | - | ✓ 済 |
| Git | `git --version` | 要確認 |

---

## 1. ファイル構成（最終形）

作業完了後、こうなる：

```
~/projects/merone-ai-quiz/
├── .clasp.json              ← claspの設定ファイル（GASプロジェクトと紐付け）
├── .claspignore             ← claspにアップしないファイルを指定
├── .gitignore               ← Gitに含めないファイルを指定
├── appsscript.json          ← GASマニフェスト（自動生成）
├── gas/
│   └── Code.gs              ← GASコード本体
├── web/
│   └── merone-ai-quiz.html  ← クイズHTML
├── docs/
│   └── SETUP_GUIDE.md       ← 設定手順書
└── README.md                ← プロジェクト説明
```

---

## 2. 環境構築（初回のみ）

### Step 1：Node.js のインストール確認

ターミナルを開いて：

```bash
node -v
```

**結果別の対応**：

| 結果 | 対応 |
|---|---|
| `v18.x.x` 以上が表示 | OK、次へ |
| `v17` 以下が表示 | アンインストール後、最新版をインストール |
| `command not found` | [Node.js公式サイト](https://nodejs.org/) からLTS版をダウンロード |

**Mac でインストール（Homebrew経由が推奨）**：

```bash
# Homebrew が無い場合は先にインストール
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js インストール
brew install node

# 確認
node -v
npm -v
```

---

### Step 2：clasp（Google Apps Script CLI）のインストール

```bash
npm install -g @google/clasp
```

**確認**：

```bash
clasp --version
```

→ バージョン番号（`2.x.x` 等）が出ればOK

**つまずきポイント**：

| エラー | 対処 |
|---|---|
| `EACCES: permission denied` | `sudo npm install -g @google/clasp` で再実行 |
| `command not found: clasp` | `export PATH="/usr/local/bin:$PATH"` を `~/.zshrc` に追加して再起動 |

---

### Step 3：Googleアカウントでclaspにログイン

```bash
clasp login
```

→ ブラウザが自動で開く  
→ Meroneで使う Googleアカウントを選択  
→ 「Google Apps Script API」へのアクセスを許可  
→ ターミナルに `Authorization successful.` と表示されれば成功

**注意点**：
- 一度ログインすれば情報は保存される（`~/.clasprc.json`）
- 別アカウントに切り替える場合：`clasp logout` → `clasp login` で再ログイン

---

### Step 4：Google Apps Script API の有効化（重要・忘れがち）

1. ブラウザで [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings) にアクセス
2. 「**Google Apps Script API**」のスイッチを **ON** にする

→ これをONにしないと `clasp create` などが失敗する

---

### Step 5：VS Code 拡張機能のインストール（推奨）

VS Code を開き、左サイドバーの拡張機能アイコンから以下をインストール：

| 拡張機能名 | 用途 |
|---|---|
| Google Apps Script - Snippets | GAS のコード補完 |
| ESLint | JS のエラー検出 |
| GitLens | Git の変更履歴を可視化 |
| Live Server | HTML のローカルプレビュー |

---

## 3. プロジェクト作成

### Step 1：作業フォルダを作る

```bash
# ホームディレクトリ配下にプロジェクトフォルダ作成
mkdir -p ~/projects/merone-ai-quiz
cd ~/projects/merone-ai-quiz

# VS Code で開く
code .
```

---

### Step 2：先に Google スプレッドシートを作成

1. [https://sheets.new](https://sheets.new) にアクセス
2. ファイル名を「**Merone_AIテスト結果**」に変更
3. URLからスプレッドシートIDをコピー
   - `https://docs.google.com/spreadsheets/d/【ここがID】/edit`
   - 例：`1A2B3C4D5E6F7G8H9I0JaBcDeFgHiJkLmNoPqRsTuVwXyZ`
4. **テキストファイルにメモ**しておく（後で使う）

---

### Step 3：claspでGASプロジェクトをスプレッドシートに紐付けて作成

```bash
# プロジェクトフォルダ直下で実行
cd ~/projects/merone-ai-quiz

# GASプロジェクト作成（スプレッドシートに紐付け）
clasp create --type sheets --title "Merone_AIテスト結果_GAS" --rootDir ./gas
```

**注意**：
- 上記コマンドは新規スプレッドシートを作るタイプ
- **既に作ったスプレッドシートに紐付けたい場合**は下の方法を使う

---

### Step 3-Alt：既存スプレッドシートに紐付ける場合（推奨）

1. ステップ2で作ったスプレッドシートを開く
2. メニュー：「**拡張機能 → Apps Script**」
3. 開いたApps Scriptエディタの「**プロジェクト設定（⚙）**」をクリック
4. **スクリプトID**をコピー（例：`1xYzAbCdEfGhIjKlMnOpQrStUvWxYz...`）
5. ターミナルで：

```bash
cd ~/projects/merone-ai-quiz
mkdir gas
cd gas

# 既存プロジェクトをクローン
clasp clone "ここにスクリプトIDを貼り付け"

cd ..
```

→ `gas/` フォルダに `Code.gs` `appsscript.json` `.clasp.json` がダウンロードされる

---

### Step 4：`.clasp.json` の確認

`gas/.clasp.json` が以下のような内容になっているか確認：

```json
{
  "scriptId": "1xYzAbCdEfGhIjKlMnOpQrStUvWxYz...",
  "rootDir": "/Users/morikawa/projects/merone-ai-quiz/gas"
}
```

**もし `rootDir` が無い場合は手動で追記**

---

## 4. 開発フロー（日常作業）

### A：コードを書く

VS Code で `gas/Code.gs` を編集（普通のJavaScriptとして書ける）

---

### B：GASに反映（push）

```bash
cd ~/projects/merone-ai-quiz/gas
clasp push
```

→ ローカルの `Code.gs` の内容が GAS に反映される

**確認方法**：

```bash
# ブラウザで GAS エディタを開く
clasp open
```

→ 反映されているか目視確認

---

### C：Webアプリとしてデプロイ

#### 初回デプロイ

```bash
cd ~/projects/merone-ai-quiz/gas
clasp deploy --description "v1 初版"
```

**出力例**：
```
Created version 1.
- AKfycbx...... @1.
```

→ `AKfycbx......` の部分が**デプロイID**

#### デプロイURLの取得

```bash
clasp deployments
```

**出力例**：
```
2 Deployments.
- AKfycbx-... @HEAD
- AKfycby-...... @1 - v1 初版
```

WebアプリのURLは：
```
https://script.google.com/macros/s/【デプロイID】/exec
```

つまり：
```
https://script.google.com/macros/s/AKfycby-...... /exec
```

→ このURLを `merone-ai-quiz.html` の `GAS_URL` 定数に貼り付ける

---

#### 2回目以降のデプロイ（コード更新時）

**重要**：コードを変更したら、デプロイを更新しないとWeb上の動作は変わらない

```bash
# まずコードをpush
clasp push

# 既存のデプロイを更新（URLは変わらない）
clasp deploy --deploymentId AKfycby-...... --description "v2 修正"
```

---

## 5. ファイル整備（コピペ用）

### `.gitignore` の中身

```
# clasp
.clasprc.json

# Node
node_modules/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/

# 機密情報
*-secret.*
*.env
```

---

### `.claspignore` の中身（gas フォルダ内に配置）

```
**/**
!appsscript.json
!Code.gs
```

→ claspで余計なファイルがアップされないようにする

---

### `gas/Code.gs` の中身

（前回作成した `gas_code.gs` の内容をそのまま使う）

**重要**：6行目の `SPREADSHEET_ID` を、ステップ2でメモしたIDに書き換える

```javascript
const SPREADSHEET_ID = '1A2B3C4D5E6F7G8H9I0JaBcDeFgHiJkLmNoPqRsTuVwXyZ';
```

---

### `appsscript.json`（GASマニフェスト）

`gas/appsscript.json` を以下の内容に編集：

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

**ポイント**：
- `executeAs: USER_DEPLOYING` → くみこの権限で実行
- `access: ANYONE_ANONYMOUS` → 誰でも（Googleログイン不要で）アクセス可能

---

## 6. Git連携（推奨）

### 初回セットアップ

```bash
cd ~/projects/merone-ai-quiz

# Git初期化
git init

# GitHubリポジトリ作成（GitHub Desktopまたはgh CLIで）
# 例：https://github.com/kumiko-merone/merone-ai-quiz

# リモート追加
git remote add origin git@github.com:kumiko-merone/merone-ai-quiz.git

# 初回コミット
git add .
git commit -m "feat: Merone AIクイズ初版＋GAS連携"

# プッシュ
git branch -M main
git push -u origin main
```

---

### 日常のGit運用

```bash
# 変更を確認
git status

# 変更をコミット
git add .
git commit -m "fix: 質問文を修正"

# プッシュ
git push
```

---

## 7. 完了確認チェックリスト

セットアップ完了の確認項目：

### 環境

- [ ] `node -v` が v18以上を表示
- [ ] `clasp --version` がバージョン表示
- [ ] `clasp login` でログイン済み
- [ ] Google Apps Script API が有効化済み

### プロジェクト

- [ ] `~/projects/merone-ai-quiz/` フォルダが存在
- [ ] `gas/.clasp.json` に正しい scriptId が記載
- [ ] `gas/Code.gs` の SPREADSHEET_ID が正しく設定
- [ ] `gas/appsscript.json` の webapp 設定済み

### 動作

- [ ] `clasp push` が成功する
- [ ] `clasp deploy` でデプロイURLが取得できる
- [ ] HTMLにURL設定済み
- [ ] テスト受験で結果がスプレッドシートに記録される

### Git

- [ ] `git status` でリポジトリ認識
- [ ] GitHubリポジトリにpush済み

---

## 8. よくあるトラブル

### Q1：`clasp push` で `User has not enabled the Apps Script API` エラー

→ ステップ2-4のAPI有効化を再確認  
→ [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings)

---

### Q2：HTMLからGASに送信したのに記録されない

**チェック項目**：
1. `merone-ai-quiz.html` の `GAS_URL` が最新のデプロイURLか
2. デプロイが「**全員**」アクセス可能になっているか
3. `clasp push` 後に `clasp deploy --deploymentId XXX` で更新したか

---

### Q3：`clasp open` でブラウザが開かない

```bash
# 直接URLで開く
clasp deployments
# ↑ 出力されたURLをブラウザに貼り付け
```

---

### Q4：デプロイ後にコードを修正したが反映されない

**原因**：デプロイは「特定バージョン」を指している。最新コードを反映するには再デプロイが必要。

```bash
clasp push
clasp deploy --deploymentId 既存のデプロイID --description "更新"
```

---

### Q5：複数人で開発したい

→ GitHubリポジトリに招待  
→ 招待された人も `clasp login` で自分のGoogleアカウントでログイン  
→ ただし**スクリプト編集権限**もスプレッドシートで付与する必要あり

---

## 9. 参考リンク

- [clasp 公式ドキュメント](https://github.com/google/clasp)
- [clasp コマンドリファレンス](https://github.com/google/clasp/blob/master/docs/commands.md)
- [Google Apps Script ドキュメント](https://developers.google.com/apps-script)
- [appsscript.json マニフェスト仕様](https://developers.google.com/apps-script/concepts/manifests)

---

## 10. このプロジェクトを次の人に引き継ぐ場合

引き継ぎ時に渡すもの：

1. このドキュメント（`SETUP_GUIDE.md`）
2. GitHubリポジトリのアクセス権
3. スプレッドシートの編集権限
4. Apps Scriptプロジェクトの編集者権限

引き継ぎ先のセットアップ手順：

```bash
# リポジトリをクローン
git clone git@github.com:kumiko-merone/merone-ai-quiz.git
cd merone-ai-quiz

# claspでログイン
clasp login

# gasフォルダに移動してclasp初期化
cd gas
# .clasp.json はGitに含まれているので clone と同時に取得済み
# 必要に応じて scriptId を確認・調整

# 動作確認
clasp push
```

---

## まとめ：日常の開発フロー（覚えておくのはこれだけ）

```bash
# 1. コードを編集（VS Code）

# 2. GASに反映
cd ~/projects/merone-ai-quiz/gas
clasp push

# 3. デプロイを更新
clasp deploy --deploymentId XXX --description "更新内容"

# 4. Gitに記録
cd ..
git add .
git commit -m "fix: 修正内容"
git push
```

**この4ステップを覚えれば、VS Codeで完結したGAS開発ができる。**
