---
name: article-agent-context-research
description: X(Twitter) 検索を活用して、記事執筆のための周辺情報（Context Pack）を生成するスキル
---

# Article Agent Context Research

このスキルは、指定されたトピックに関して X (旧 Twitter) 上の議論、トレンド、一次情報をリサーチし、記事執筆の「地ならし」となる Context Pack を生成します。

## 目的

記事を書く前に、以下の情報を揃えることを目的とします。

1.  **一次情報**: そのトピックに関する公式発表、開発者の発言、論文、コードリポジトリなど。
2.  **用語定義**: 界隈で使われている用語の正確な意味やニュアンス。
3.  **反論/懸念点**: そのトピックに対する批判的な意見や懸念点（記事の公平性を保つため）。
4.  **Datedな数字**: "As of [Date]" 付きの具体的な数字（パフォーマンス、価格、普及率など）。

## 成果物 (Context Pack)

生成される Context Pack は以下のファイルで構成されます。

1.  `*_context.md`: リサーチ結果をまとめたレポート。
2.  `*_context.json`: リサーチに使用したプロンプト、生の結果、抽出された情報の構造化データ。
3.  `*_context.txt`: 抽出されたテキストデータ（検索用）。

## 使い方

プロジェクトルート (`x-research-skills/`) で以下のコマンドを実行します。

```bash
npx tsx scripts/grok_context_research.ts --topic "リサーチしたいトピック" [options]
```

### オプション

-   `--topic <string>`: **(必須)** リサーチするトピック。
-   `--locale <string>`: 対象の言語/地域 (`ja` または `global`)。デフォルトは `ja`。
-   `--audience <string>`: 想定読者 (`engineer`, `investor`, `both`)。デフォルトは `engineer`。
-   `--goal <string>`: リサーチの具体的なゴール（任意）。指定がない場合はデフォルトのゴールが使用されます。
-   `--days <number>`: 検索範囲（日数）。デフォルトは `30`。
-   `--out-dir <path>`: 出力先ディレクトリ。デフォルトは `data/context-research`。
-   `--model <string>`: 使用するモデル（任意）。デフォルトは `grok-3` (または環境変数 `XAI_MODEL` の値)。
-   `--dry-run`: 実行せずにリクエスト内容を表示します。

## 運用ルール

1.  **一次情報の優先**: 検索結果の中で、公式アカウントや開発者の発言を最優先します。
2.  **情報の鮮度**: 日付が古い情報は、その旨を明記するか、除外します。
3.  **引用の作法**: 長文のコピー＆ペーストは避け、要約と URL のセットで記録します。
4.  **X URL の扱い**: X の投稿 URL は閲覧制限がある場合があるため、内容は必ず要約して Context Pack に含めます。

## 必要な環境変数

-   `XAI_API_KEY`: xAI API のキー。
