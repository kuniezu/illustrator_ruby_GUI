# Illustrator TextFrame selection-gate research

調査日: 2026-09-06

## 根拠資料

- Adobe Illustrator Scripting Guide: [Document.selection](https://ai-scripting.docsforadobe.dev/jsobjref/Document/) は現在選択中のオブジェクト配列を返し、挿入点または文字選択時はTextRangeを返す。
- Adobe Illustrator Scripting Guide: [TextFrameItem](https://ai-scripting.docsforadobe.dev/jsobjref/TextFrameItem/) は `typename`, `kind`, `orientation`, `textRange`, `textPath`, `rowCount`, `columnCount`, `story` を公開する。`kind` はpoint/path/areaの種別、row/columnはarea text専用、textPathはarea/pathで有効と説明されている。
- Adobe Illustrator Scripting Guide: [TextFrameItems.areaText](https://ai-scripting.docsforadobe.dev/jsobjref/TextFrameItems/) はPathItemからArea TextFrameを作成する公式APIである。
- Adobe Illustrator Scripting Guide: [Text Objects](https://ai-scripting.docsforadobe.dev/objectmodel/textObjects/) はarea/pathの位置・方向をtextPathが定義し、TextFrameItem.orientationは本文の向きを定義すると説明する。
- AdobeのDocument JavaScript Object Referenceには `Document.selection` はあるが `Document.textSelection` は掲載されていないため、未確認のdocument-level propertyをproduction fallbackとして仮定しない。textSelectionはTextFrameItem/Story/TextRange側の資料に限定して扱う。

## repository内の観測

- `v2/formal-step2/selection-adapter.jsx` はTextRangeまたは1件選択をsource frameへ解決し、`kind`/`orientation`をenumのstrict比較で検査する。
- `v2/diagnostics/Formal Multi Selection Check.jsx` はselection、TextRange parent、story.textFramesを記録するが、enumのraw/String/数値・strict/loose比較を記録しない。
- Issue #14 comment `#issuecomment-5558398712` では、ユーザーの実機で想定した横書きArea Textが `area-text-horizontal-only` で停止した。これはproduction gateを弱める根拠ではなく、同じ対象を複数経路で観測するresearch gateが必要な証拠と扱う。
- したがって今回のprobeは、selectionの形、TextFrame候補のDOM値、enum比較、Area Text構造値を一括記録する。どの比較方法をproduction resolverに採用するかは、この実機結果後に決める。

## 今回の候補戦略

| Strategy | 候補 | 判定材料 |
|---|---|---|
| A | selection自体がTextFrame + enum strict比較 | `kind === TextType.AREATEXT` と `orientation === TextOrientation.HORIZONTAL` |
| B | selection自体がTextFrame + enum loose比較 | `kind == ...` と `orientation == ...` |
| C | selection[0]がTextRangeの場合のparent/story由来TextFrame | derived frameのidentityとenum evidence |
| D | Area Text構造property | row/column、textPath、textRange、storyの取得可否 |

判定はprobeの実値に基づき、候補が取れない場合はINCONCLUSIVEとする。probeはread-onlyで、source text・selection・document・production resolverを変更しない。
