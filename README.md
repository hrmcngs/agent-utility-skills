# Agent Utility Skills

短いコマンドで成果物を作る、AI コーディングエージェント向けの便利スキル集です。
現在は **qrcode-generator** のみ。URL や文字列から QR コード画像をローカル生成します。
アプリへの機能追加・サーバー起動・URL の公開は行いません。

## 準備

Node.js 20 以上と npm が必要です。このリポジトリで実行します。

```sh
npm run setup
npm test
```

生成時は外部通信しません。最初の依存パッケージのインストールには通信が必要です。
本番用の生成依存だけなら `npm ci --omit=dev --prefix skills/qrcode-generator` を実行します。

## AI から使う

このリポジトリ自体には、Claude Code と Codex 向けのスキル参照を登録済みです。
このフォルダを開き、新しいセッションで呼び出します。

| ツール | 入力例 |
| --- | --- |
| Claude Code | `/qrcode-generator https://example.com` |
| Codex | `$qrcode-generator https://example.com` |

「SVG にして」「1024px で」「output/example.png に保存して」と一緒に指定できます。
引数がなければ AI が内容を質問します。出力ファイルは作業ディレクトリに保存されます。
プレビューの表示は使っている AI 環境に依存します。

### 別のプロジェクトへ導入

このリポジトリのディレクトリから実行します。

```sh
node scripts/install.mjs --target /path/to/project
```

`--tool claude` または `--tool codex` で片方だけ選べます。既定は両方です。
作成するのは `.claude/skills/qrcode-generator` と `.agents/skills/qrcode-generator` のシンボリックリンクだけです。
既存スキルは上書きせず、同じコマンドを再実行できます。アプリの依存関係・AI の権限・認証設定は変更しません。
リンク方式のため、このリポジトリを移動・削除するとリンクが切れます。移動前に解除し、新しい場所から再導入してください。
他の端末では、その端末にリポジトリを用意して再導入してください。シンボリックリンクを作成できる環境が必要です。

```sh
node scripts/install.mjs --target /path/to/project --uninstall
```

このチェックアウトを参照するリンクだけを削除します。生成済み QR 画像やアプリのファイルは削除しません。

## AI を使わず生成する

```sh
node skills/qrcode-generator/scripts/generate.mjs --output output/example.png -- https://example.com
node skills/qrcode-generator/scripts/generate.mjs --format svg --size 1024 --output output/example.svg -- 'こんにちは'
printf '%s' '正確に保持したい文字列' | node skills/qrcode-generator/scripts/generate.mjs --stdin --output output/text.png
```

既定は PNG / 512px / 余白4モジュール / 黒と白 / 誤り訂正 M。
`--margin`、`--dark '#112233'`、`--light '#ffffff'` に対応します。詳細は `--help`。
既存ファイルは上書きしません。URL の補完・正規化も行いません。
色や余白を変更する場合は、実際の端末でも読み取りを確認してください。

## 構成と検証範囲

- `skills/qrcode-generator/`: 共通の SKILL.md、生成スクリプト、固定した依存関係
- `.claude/skills/` / `.agents/skills/`: 同じスキルへの参照
- `scripts/install.mjs`: プロジェクトへの導入・解除
- `test/`: PNG をデコードする往復テスト、SVG 出力、上書き防止、導入・解除の検証

PNG の読み戻しで日本語・改行・URL が保持されることをテストします。
Claude Code / Codex の実際の会話セッションによる呼び出し・スマホ実機での読み取りは別途確認が必要です。
他の対応エージェントでも `skills/qrcode-generator` をその製品の導入方法で配置できますが、動作検証済みとは扱っていません。

## スキルを追加する場合

`skills/<name>/SKILL.md` に Agent Skills 仕様の name / description と手順を書き、必要なスクリプトを同じフォルダに置きます。
製品固有のツール名・フック・認証情報は共通処理に埋め込まず、対応ツールへの参照とインストーラを更新してください。

仕様: [Agent Skills](https://agentskills.io/specification) / [Claude Code](https://code.claude.com/docs/en/skills) / [Codex](https://learn.chatgpt.com/docs/build-skills)
