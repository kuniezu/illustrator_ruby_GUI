/**
 * Illustrator Ruby GUI Script
 * ルビ（ふりがな）をGUIで対話的に設定し、Illustrator上に配置するスクリプト
 * 
 * Based on illustrator-ruby by いなにわうどん (inaniwaudon)
 * https://github.com/inaniwaudon/illustrator-ruby
 * 
 * Original License: MIT License
 * Copyright (c) 2022 いなにわうどん
 * 
 * Modifications:
 * Copyright (c) 2026 鈴木明世（北海道博物館）／Suzuki Akiyo_Hokkaido Museum
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * 使い方:
 * 1. テキストフレームを選択（複数可）
 * 2. スクリプトを実行
 * 3. ウィンドウで文字を選択し、ルビを入力
 * 4. 「実行」ボタンでルビを配置
 */

// ============================================================
// Polyfills for ExtendScript
// ============================================================
// 注意: Array.prototypeへのメソッド追加はIllustratorの内部コードと
// 干渉しクラッシュの原因となるため、ポリフィルは使用しない。
// 必要な処理は各関数内でforループで記述する。

// ============================================================
// 捨て仮名変換テーブル
// ============================================================
var suteganaList = [
    { before: "\u3041", after: "\u3042" }, // ぁ→あ
    { before: "\u3043", after: "\u3044" }, // ぃ→い
    { before: "\u3045", after: "\u3046" }, // ぅ→う
    { before: "\u3047", after: "\u3048" }, // ぇ→え
    { before: "\u3049", after: "\u304A" }, // ぉ→お
    { before: "\u3063", after: "\u3064" }, // っ→つ
    { before: "\u3083", after: "\u3084" }, // ゃ→や
    { before: "\u3085", after: "\u3086" }, // ゅ→ゆ
    { before: "\u3087", after: "\u3088" }, // ょ→よ
    { before: "\u308E", after: "\u308F" }, // ゎ→わ
    { before: "\u30A1", after: "\u30A2" }, // ァ→ア
    { before: "\u30A3", after: "\u30A4" }, // ィ→イ
    { before: "\u30A5", after: "\u30A6" }, // ゥ→ウ
    { before: "\u30A7", after: "\u30A8" }, // ェ→エ
    { before: "\u30A9", after: "\u30AA" }, // ォ→オ
    { before: "\u30C3", after: "\u30C4" }, // ッ→ツ
    { before: "\u30E3", after: "\u30E4" }, // ャ→ヤ
    { before: "\u30E5", after: "\u30E6" }, // ュ→ユ
    { before: "\u30E7", after: "\u30E8" }, // ョ→ヨ
    { before: "\u30EE", after: "\u30EF" }, // ヮ→ワ
];

function convertSutegana(text) {
    var result = text;
    for (var i = 0; i < suteganaList.length; i++) {
        var re = new RegExp(suteganaList[i].before, "g");
        result = result.replace(re, suteganaList[i].after);
    }
    return result;
}

// ============================================================
// 文字分類
// ============================================================
var kanjiCodes = [
    [0x4e00, 0x9fef], [0x3400, 0x4db5], [0x20000, 0x2a6d6],
    [0x2a700, 0x2b734], [0x2b740, 0x2b81d], [0x2b820, 0x2cea1],
    [0xf900, 0xfaff], [0x2f800, 0x2fa1f],
    [0x3005, 0x3007], // 々〆〇（漢字的に使われるCJK記号）
    [0x30f5, 0x30f6], // ヵヶ（漢字的に使われる小書きカタカナ）
];

function isKanji(ch) {
    var code = ch.charCodeAt(0);
    for (var i = 0; i < kanjiCodes.length; i++) {
        if (kanjiCodes[i][0] <= code && code <= kanjiCodes[i][1]) return true;
    }
    return false;
}

// ============================================================
// 学習漢字データ（2020年 学習指導要領）
// ============================================================
var gakushuKanji = {
    // 小1: 80字
    1: "\u4E00\u53F3\u96E8\u5186\u738B\u97F3\u4E0B\u706B\u82B1\u8C9D\u5B66\u6C17\u4E5D\u4F11\u7389\u91D1\u7A7A\u6708\u72AC\u898B\u4E94\u53E3\u6821\u5DE6\u4E09\u5C71\u5B50\u56DB\u7CF8\u5B57\u8033\u4E03\u8ECA\u624B\u5341\u51FA\u5973\u5C0F\u4E0A\u68EE\u4EBA\u6C34\u6B63\u751F\u9752\u5915\u77F3\u8D64\u5343\u5DDD\u5148\u65E9\u8349\u8DB3\u6751\u5927\u7537\u7AF9\u4E2D\u866B\u753A\u5929\u7530\u571F\u4E8C\u65E5\u5165\u5E74\u767D\u516B\u767E\u6587\u6728\u672C\u540D\u76EE\u7ACB\u529B\u6797\u516D",
    // 小2: 160字
    2: "\u5F15\u7FBD\u96F2\u5712\u9060\u4F55\u79D1\u590F\u5BB6\u6B4C\u753B\u56DE\u4F1A\u6D77\u7D75\u5916\u89D2\u697D\u6D3B\u9593\u4E38\u5CA9\u9854\u6C7D\u8A18\u5E30\u5F13\u725B\u9B5A\u4EAC\u5F37\u6559\u8FD1\u5144\u5F62\u8A08\u5143\u8A00\u539F\u6238\u53E4\u5348\u5F8C\u8A9E\u5DE5\u516C\u5E83\u4EA4\u5149\u8003\u884C\u9AD8\u9EC4\u5408\u8C37\u56FD\u9ED2\u4ECA\u624D\u7D30\u4F5C\u7B97\u6B62\u5E02\u77E2\u59C9\u601D\u7D19\u5BFA\u81EA\u6642\u5BA4\u793E\u5F31\u9996\u79CB\u9031\u6625\u66F8\u5C11\u5834\u8272\u98DF\u5FC3\u65B0\u89AA\u56F3\u6570\u897F\u58F0\u661F\u6674\u5207\u96EA\u8239\u7DDA\u524D\u7D44\u8D70\u591A\u592A\u4F53\u53F0\u5730\u6C60\u77E5\u8336\u663C\u9577\u9CE5\u671D\u76F4\u901A\u5F1F\u5E97\u70B9\u96FB\u5200\u51AC\u5F53\u6771\u7B54\u982D\u540C\u9053\u8AAD\u5185\u5357\u8089\u99AC\u58F2\u8CB7\u9EA6\u534A\u756A\u7236\u98A8\u5206\u805E\u7C73\u6B69\u6BCD\u65B9\u5317\u6BCE\u59B9\u4E07\u660E\u9CF4\u6BDB\u9580\u591C\u91CE\u53CB\u7528\u66DC\u6765\u91CC\u7406\u8A71",
    // 小3: 200字
    3: "\u60AA\u5B89\u6697\u533B\u59D4\u610F\u80B2\u54E1\u9662\u98F2\u904B\u6CF3\u99C5\u592E\u6A2A\u5C4B\u6E29\u5316\u8377\u754C\u958B\u968E\u5BD2\u611F\u6F22\u9928\u5CB8\u8D77\u671F\u5BA2\u7A76\u6025\u7D1A\u5BAE\u7403\u53BB\u6A4B\u696D\u66F2\u5C40\u9280\u533A\u82E6\u5177\u541B\u4FC2\u8EFD\u8840\u6C7A\u7814\u770C\u5EAB\u6E56\u5411\u5E78\u6E2F\u53F7\u6839\u796D\u76BF\u4ED5\u6B7B\u4F7F\u59CB\u6307\u6B6F\u8A69\u6B21\u4E8B\u6301\u5F0F\u5B9F\u5199\u8005\u4E3B\u5B88\u53D6\u9152\u53D7\u5DDE\u62FE\u7D42\u7FD2\u96C6\u4F4F\u91CD\u5BBF\u6240\u6691\u52A9\u662D\u6D88\u5546\u7AE0\u52DD\u4E57\u690D\u7533\u8EAB\u795E\u771F\u6DF1\u9032\u4E16\u6574\u6614\u5168\u76F8\u9001\u60F3\u606F\u901F\u65CF\u4ED6\u6253\u5BFE\u5F85\u4EE3\u7B2C\u984C\u70AD\u77ED\u8AC7\u7740\u6CE8\u67F1\u4E01\u5E33\u8ABF\u8FFD\u5B9A\u5EAD\u7B1B\u9244\u8EE2\u90FD\u5EA6\u6295\u8C46\u5CF6\u6E6F\u767B\u7B49\u52D5\u7AE5\u8FB2\u6CE2\u914D\u500D\u7BB1\u7551\u767A\u53CD\u5742\u677F\u76AE\u60B2\u7F8E\u9F3B\u7B46\u6C37\u8868\u79D2\u75C5\u54C1\u8CA0\u90E8\u670D\u798F\u7269\u5E73\u8FD4\u52C9\u653E\u5473\u547D\u9762\u554F\u5F79\u85AC\u7531\u6CB9\u6709\u904A\u4E88\u7F8A\u6D0B\u8449\u967D\u69D8\u843D\u6D41\u65C5\u4E21\u7DD1\u793C\u5217\u7DF4\u8DEF\u548C",
    // 小4: 202字
    4: "\u611B\u6848\u4EE5\u8863\u4F4D\u8328\u5370\u82F1\u6804\u5A9B\u5869\u5CA1\u5104\u52A0\u679C\u8CA8\u8AB2\u82BD\u8CC0\u6539\u68B0\u5BB3\u8857\u5404\u899A\u6F5F\u5B8C\u5B98\u7BA1\u95A2\u89B3\u9858\u5C90\u5E0C\u5B63\u65D7\u5668\u6A5F\u8B70\u6C42\u6CE3\u7D66\u6319\u6F01\u5171\u5354\u93E1\u7AF6\u6975\u718A\u8A13\u8ECD\u90E1\u7FA4\u5F84\u666F\u82B8\u6B20\u7D50\u5EFA\u5065\u9A13\u56FA\u529F\u597D\u9999\u5019\u5EB7\u4F50\u5DEE\u83DC\u6700\u57FC\u6750\u5D0E\u6628\u672D\u5237\u5BDF\u53C2\u7523\u6563\u6B8B\u6C0F\u53F8\u8A66\u5150\u6CBB\u6ECB\u8F9E\u9E7F\u5931\u501F\u7A2E\u5468\u795D\u9806\u521D\u677E\u7B11\u5531\u713C\u7167\u57CE\u7E04\u81E3\u4FE1\u4E95\u6210\u7701\u6E05\u9759\u5E2D\u7A4D\u6298\u7BC0\u8AAC\u6D45\u6226\u9078\u7136\u4E89\u5009\u5DE3\u675F\u5074\u7D9A\u5352\u5B6B\u5E2F\u968A\u9054\u5358\u7F6E\u4EF2\u6C96\u5146\u4F4E\u5E95\u7684\u5178\u4F1D\u5F92\u52AA\u706F\u50CD\u7279\u5FB3\u6803\u5948\u68A8\u71B1\u5FF5\u6557\u6885\u535A\u962A\u98EF\u98DB\u5FC5\u7968\u6A19\u4E0D\u592B\u4ED8\u5E9C\u961C\u5BCC\u526F\u5175\u5225\u8FBA\u5909\u4FBF\u5305\u6CD5\u671B\u7267\u672B\u6E80\u672A\u6C11\u7121\u7D04\u52C7\u8981\u990A\u6D74\u5229\u9678\u826F\u6599\u91CF\u8F2A\u985E\u4EE4\u51B7\u4F8B\u9023\u8001\u52B4\u9332",
    // 小5: 193字
    5: "\u5727\u56F2\u79FB\u56E0\u6C38\u55B6\u885B\u6613\u76CA\u6DB2\u6F14\u5FDC\u5F80\u685C\u53EF\u4EEE\u4FA1\u6CB3\u904E\u5FEB\u89E3\u683C\u78BA\u984D\u520A\u5E79\u6163\u773C\u7D00\u57FA\u5BC4\u898F\u559C\u6280\u7FA9\u9006\u4E45\u65E7\u6551\u5C45\u8A31\u5883\u5747\u7981\u53E5\u578B\u7D4C\u6F54\u4EF6\u967A\u691C\u9650\u73FE\u6E1B\u6545\u500B\u8B77\u52B9\u539A\u8015\u822A\u9271\u69CB\u8208\u8B1B\u544A\u6DF7\u67FB\u518D\u707D\u59BB\u63A1\u969B\u5728\u8CA1\u7F6A\u6BBA\u96D1\u9178\u8CDB\u58EB\u652F\u53F2\u5FD7\u679D\u5E2B\u8CC7\u98FC\u793A\u4F3C\u8B58\u8CEA\u820E\u8B1D\u6388\u4FEE\u8FF0\u8853\u6E96\u5E8F\u62DB\u8A3C\u8C61\u8CDE\u6761\u72B6\u5E38\u60C5\u7E54\u8077\u5236\u6027\u653F\u52E2\u7CBE\u88FD\u7A0E\u8CAC\u7E3E\u63A5\u8A2D\u7D76\u7956\u7D20\u7DCF\u9020\u50CF\u5897\u5247\u6E2C\u5C5E\u7387\u640D\u8CB8\u614B\u56E3\u65AD\u7BC9\u8CAF\u5F35\u505C\u63D0\u7A0B\u9069\u7D71\u5802\u9285\u5C0E\u5F97\u6BD2\u72EC\u4EFB\u71C3\u80FD\u7834\u72AF\u5224\u7248\u6BD4\u80A5\u975E\u8CBB\u5099\u8A55\u8CA7\u5E03\u5A66\u6B66\u5FA9\u8907\u4ECF\u7C89\u7DE8\u5F01\u4FDD\u5893\u5831\u8C4A\u9632\u8CBF\u66B4\u8108\u52D9\u5922\u8FF7\u7DBF\u8F38\u4F59\u5BB9\u7565\u7559\u9818\u6B74",
    // 小6: 191字
    6: "\u80C3\u7570\u907A\u57DF\u5B87\u6620\u5EF6\u6CBF\u6069\u6211\u7070\u62E1\u9769\u95A3\u5272\u682A\u5E72\u5DFB\u770B\u7C21\u5371\u673A\u63EE\u8CB4\u7591\u5438\u4F9B\u80F8\u90F7\u52E4\u7B4B\u7CFB\u656C\u8B66\u5287\u6FC0\u7A74\u5238\u7D79\u6A29\u61B2\u6E90\u53B3\u5DF1\u547C\u8AA4\u540E\u5B5D\u7687\u7D05\u964D\u92FC\u523B\u7A40\u9AA8\u56F0\u7802\u5EA7\u6E08\u88C1\u7B56\u518A\u8695\u81F3\u79C1\u59FF\u8996\u8A5E\u8A8C\u78C1\u5C04\u6368\u5C3A\u82E5\u6A39\u53CE\u5B97\u5C31\u8846\u5F93\u7E26\u7E2E\u719F\u7D14\u51E6\u7F72\u8AF8\u9664\u627F\u5C06\u50B7\u969C\u84B8\u91DD\u4EC1\u5782\u63A8\u5BF8\u76DB\u8056\u8AA0\u820C\u5BA3\u5C02\u6CC9\u6D17\u67D3\u92AD\u5584\u594F\u7A93\u5275\u88C5\u5C64\u64CD\u8535\u81D3\u5B58\u5C0A\u9000\u5B85\u62C5\u63A2\u8A95\u6BB5\u6696\u5024\u5B99\u5FE0\u8457\u5E81\u9802\u8178\u6F6E\u8CC3\u75DB\u6575\u5C55\u8A0E\u515A\u7CD6\u5C4A\u96E3\u4E73\u8A8D\u7D0D\u8133\u6D3E\u62DD\u80CC\u80BA\u4FF3\u73ED\u6669\u5426\u6279\u79D8\u4FF5\u8179\u596E\u4E26\u965B\u9589\u7247\u88DC\u66AE\u5B9D\u8A2A\u4EA1\u5FD8\u68D2\u679A\u5E55\u5BC6\u76DF\u6A21\u8A33\u90F5\u512A\u9810\u5E7C\u6B32\u7FCC\u4E71\u5375\u89A7\u88CF\u5F8B\u81E8\u6717\u8AD6"
};

var _kanjiGradeCache = null;
function getKanjiGrade(ch) {
    if (!_kanjiGradeCache) {
        _kanjiGradeCache = {};
        for (var grade = 1; grade <= 6; grade++) {
            var str = gakushuKanji[grade];
            for (var i = 0; i < str.length; i++) {
                _kanjiGradeCache[str.charAt(i)] = grade;
            }
        }
    }
    return _kanjiGradeCache[ch] || 0;
}

// ============================================================
// テキストフレーム取得
// ============================================================
function getSelectedTextFrames() {
    var frames = [];
    if (!app.activeDocument || !app.activeDocument.selection) return frames;
    var sel = app.activeDocument.selection;
    for (var i = 0; i < sel.length; i++) {
        if (sel[i].typename === "TextFrame") {
            frames.push(sel[i]);
        }
    }
    return frames;
}



// ============================================================
// メインGUI
// ============================================================
// ============================================================
// メインGUI
// ============================================================
function showRubyGUI(textFrames, options) {
    // ルビデータ格納: rubyData[frameIndex][characterIndex] = {ruby: "...", mode: "group"|"individual", ...}
    var rubyData = [];
    if (options && options.rubyData) {
        rubyData = options.rubyData;
    } else {
        for (var f = 0; f < textFrames.length; f++) {
            rubyData.push({});
        }
    }

    // 学習漢字ハイライト設定（0=なし、1〜6=その学年まで既習とみなす、デフォルト4）
    var kanjiHighlightGrade = (options && options.kanjiHighlightGrade !== undefined) ? options.kanjiHighlightGrade : 4;

    // メインウィンドウ（画面サイズに応じて調整）
    var screenWidth = $.screens[0].right - $.screens[0].left;
    var screenHeight = $.screens[0].bottom - $.screens[0].top;

    // サイドバー幅を固定し、左パネルは画面に応じて決定
    var rightPanelWidth = 260;  // サイドバー固定幅
    var winWidth, winHeight, leftPanelWidth;

    if (options && options.winBounds) {
        // 再描画時: 前回のウィンドウサイズを引き継ぐ
        winWidth = options.winBounds[2] - options.winBounds[0];
        winHeight = options.winBounds[3] - options.winBounds[1];
        // 左パネル幅の最低値を確保（約9文字/行を保証）
        leftPanelWidth = Math.max(400, winWidth - rightPanelWidth - 40);
        winWidth = leftPanelWidth + rightPanelWidth + 40;
    } else {
        var minHeight = 700;
        var maxHeight = Math.min(1000, screenHeight - 100);
        winHeight = Math.max(minHeight, Math.min(maxHeight, screenHeight * 0.80));
        leftPanelWidth = Math.max(800, Math.min(screenWidth * 0.6, 1200));
        winWidth = leftPanelWidth + rightPanelWidth + 40;
    }

    var win = new Window("dialog", "\u30EB\u30D3\u8A2D\u5B9A", undefined, { resizeable: true });
    win.orientation = "row";  // 横長レイアウト：左右配置
    win.alignChildren = ["fill", "fill"];
    win.preferredSize = [winWidth, winHeight];
    win.minimumSize = [700, 700];

    // ===== レイアウト: 左側（文字表示）+ 右側（設定）=====
    var characterButtonGroups = []; // 文字ボタン参照（現ページ分のみ）
    var rubyInputGroups = []; // ルビ入力フィールド参照（現ページ分のみ）
    var charInfoMap = {}; // 全文字のメタ情報 { characterIndex: { ch, frameIndex } }
    var selectedCharIndices = {}; // 選択状態（characterIndexベース、ページをまたいで保持）
    var panelHeight = winHeight - 60;
    var containerPadding = 20;
    var containerWidth = leftPanelWidth - containerPadding;
    var contentWidth = containerWidth - 10; // パネル内余白分
    var navAreaHeight = 30;
    var redrawAreaHeight = 30;
    var contentAreaHeight = panelHeight - 40 - navAreaHeight - redrawAreaHeight;

    // レイアウト定数
    var charWidth = 40;
    var charSpacing = 2;
    var lineGroupHeight = 42; // 40px(ルビ16+ボタン24) + 2px(行間)
    var linesPerPage = Math.max(1, Math.floor(contentAreaHeight / lineGroupHeight));

    // 左側グループ：文字表示エリア
    var leftGroup = win.add("group");
    leftGroup.orientation = "column";
    leftGroup.alignChildren = ["fill", "fill"];
    leftGroup.preferredSize = [leftPanelWidth, panelHeight];

    // 再描画ボタン（左上に配置）
    var redrawFlag = false;
    var savedWinBounds = null;
    var redrawGroup = leftGroup.add("group");
    redrawGroup.orientation = "row";
    redrawGroup.alignChildren = ["left", "center"];
    redrawGroup.preferredSize = [-1, 24];
    redrawGroup.alignment = ["fill", "top"];

    var redrawBtn = redrawGroup.add("button", undefined, "\u518D\u63CF\u753B");
    redrawBtn.preferredSize = [70, 24];

    var redrawHint = redrawGroup.add("statictext", undefined, "\u203B\u30A6\u30A3\u30F3\u30C9\u30A6\u30B5\u30A4\u30BA\u5909\u66F4\u5F8C\u306B\u62BC\u3057\u3066\u304F\u3060\u3055\u3044");
    redrawHint.graphics.font = ScriptUI.newFont("dialog", "Regular", 10);

    // テキストフレームの文字パネルを作成（データ事前計算＋ページ送りUI）
    var pageState = null; // ページ状態（単一フレーム前提）
    var scrollContainer = null; // ページ内容のコンテナ
    var pageLabel = null; // ページ表示ラベル
    var prevBtn = null; // 前ページボタン
    var nextBtn = null; // 次ページボタン

    for (var f = 0; f < textFrames.length; f++) {
        var container = leftGroup.add("panel", undefined, "\u30C6\u30AD\u30B9\u30C8\u5185\u5BB9");
        container.orientation = "column";
        container.alignChildren = ["fill", "top"];
        container.preferredSize = [containerWidth, contentAreaHeight + navAreaHeight + 20];

        // ページ内容のコンテナ
        scrollContainer = container.add("group");
        scrollContainer.orientation = "column";
        scrollContainer.alignChildren = ["left", "top"];
        scrollContainer.preferredSize = [contentWidth, contentAreaHeight];
        scrollContainer.alignment = ["fill", "fill"];

        // ページナビゲーション
        var navRow = container.add("group");
        navRow.orientation = "row";
        navRow.alignment = ["center", "bottom"];
        navRow.preferredSize = [-1, navAreaHeight];

        prevBtn = navRow.add("button", undefined, "< \u524D");
        prevBtn.preferredSize = [60, 24];
        pageLabel = navRow.add("statictext", undefined, "1 / 1");
        pageLabel.preferredSize = [60, 24];
        pageLabel.justify = "center";
        nextBtn = navRow.add("button", undefined, "\u6B21 >");
        nextBtn.preferredSize = [60, 24];

        // ===== 事前計算: 全文字を視覚行に分割 =====
        var contents = textFrames[f].contents;
        var lines = contents.split(/[\r\n]/);
        var globalCharacterIdx = 0;
        var maxCharsPerLine = Math.max(1, Math.floor(contentWidth / (charWidth + charSpacing)));

        var allVisualLines = []; // 全視覚行: [[{ch, globalIdx, code}, ...], ...]
        var currentVisualLine = [];

        for (var lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            var line = lines[lineIdx];
            if (line.length === 0) {
                globalCharacterIdx++;
                continue;
            }

            for (var ci = 0; ci < line.length; ci++) {
                var ch = line.charAt(ci);
                var code = ch.charCodeAt(0);

                if (code === 9) {
                    globalCharacterIdx++;
                    continue;
                }

                if (currentVisualLine.length >= maxCharsPerLine) {
                    allVisualLines.push(currentVisualLine);
                    currentVisualLine = [];
                }

                charInfoMap[globalCharacterIdx] = { ch: ch, frameIndex: f };
                currentVisualLine.push({ ch: ch, globalIdx: globalCharacterIdx, code: code });
                globalCharacterIdx++;
            }

            // 行末で視覚行を確定
            if (currentVisualLine.length > 0) {
                allVisualLines.push(currentVisualLine);
                currentVisualLine = [];
            }
            globalCharacterIdx++; // 改行分
        }

        // ページ状態を初期化
        var initialPage = (options && options.currentPage !== undefined) ? options.currentPage : 0;
        pageState = {
            currentPage: initialPage,
            totalPages: Math.max(1, Math.ceil(allVisualLines.length / linesPerPage)),
            linesPerPage: linesPerPage,
            allVisualLines: allVisualLines,
            scrollContainer: scrollContainer,
            scrollGroup: null,
            frameIndex: f,
            maxCharsPerLine: maxCharsPerLine
        };
        // ページ番号の上限チェック
        if (pageState.currentPage >= pageState.totalPages) {
            pageState.currentPage = pageState.totalPages - 1;
        }

        // 初期化用の空配列を確保
        characterButtonGroups.push([]);
        rubyInputGroups.push([]);
    }

    // ===== 右側: サイドバー（ルビ表示、グループ操作、条件設定、ボタン） =====
    var rightSidebar = win.add("group");
    rightSidebar.orientation = "column";
    rightSidebar.alignChildren = ["fill", "top"];
    rightSidebar.preferredSize = [rightPanelWidth - 10, panelHeight];

    // 1. ルビ表示・編集エリア
    var currentRubyPanel = rightSidebar.add("panel", undefined, "\u9078\u629E\u4E2D\u306E\u30EB\u30D3");
    currentRubyPanel.orientation = "column";
    currentRubyPanel.alignChildren = ["fill", "top"];
    currentRubyPanel.preferredSize = [rightPanelWidth - 20, 80];

    var currentCharLabel = currentRubyPanel.add("statictext", undefined, "\u6587\u5B57: -");
    var currentRubyInput = currentRubyPanel.add("edittext", undefined, "");
    currentRubyInput.preferredSize = [rightPanelWidth - 60, 24];
    currentRubyInput.enabled = false;

    // 2. グループ操作エリア
    var groupPanel = rightSidebar.add("panel", undefined, "\u30B0\u30EB\u30FC\u30D7\u64CD\u4F5C");
    groupPanel.orientation = "column";
    groupPanel.alignChildren = ["fill", "top"];
    groupPanel.preferredSize = [rightPanelWidth - 20, 140];

    var selInfoLabel = groupPanel.add("statictext", undefined, "\u9078\u629E\u6570: 0");

    var groupBtnGroup = groupPanel.add("group");
    groupBtnGroup.orientation = "column";
    groupBtnGroup.alignChildren = ["fill", "center"];
    groupBtnGroup.spacing = 5;
    var groupBtn = groupBtnGroup.add("button", undefined, "\u30B0\u30EB\u30FC\u30D7\u5316");
    groupBtn.preferredSize = [rightPanelWidth - 60, 30];
    var ungroupBtn = groupBtnGroup.add("button", undefined, "\u30B0\u30EB\u30FC\u30D7\u89E3\u9664");
    ungroupBtn.preferredSize = [rightPanelWidth - 60, 30];
    var clearSelBtn = groupBtnGroup.add("button", undefined, "\u9078\u629E\u4E00\u62EC\u89E3\u9664");
    clearSelBtn.preferredSize = [rightPanelWidth - 60, 30];

    // 3. 条件設定エリア
    var settingsPanel = rightSidebar.add("panel", undefined, "\u6761\u4EF6\u8A2D\u5B9A");
    settingsPanel.orientation = "column";
    settingsPanel.alignChildren = ["fill", "top"];
    settingsPanel.preferredSize = [rightPanelWidth - 20, 320];

    // サイズ
    var sizeGroup = settingsPanel.add("group");
    sizeGroup.add("statictext", undefined, "\u30B5\u30A4\u30BA (%):");
    var sizeInput = sizeGroup.add("edittext", undefined, "40");
    sizeInput.preferredSize = [60, 24];
    var sizeDown = sizeGroup.add("button", undefined, "\u25BC");
    sizeDown.preferredSize = [24, 24];
    var sizeUp = sizeGroup.add("button", undefined, "\u25B2");
    sizeUp.preferredSize = [24, 24];
    sizeUp.onClick = function() { sizeInput.text = String((parseFloat(sizeInput.text) || 40) + 5); };
    sizeDown.onClick = function() { var v = (parseFloat(sizeInput.text) || 40) - 5; sizeInput.text = String(Math.max(5, v)); };

    // 間隔
    var gapGroup = settingsPanel.add("group");
    gapGroup.add("statictext", undefined, "\u9593\u9694 (%):");
    var gapInput = gapGroup.add("edittext", undefined, "3");
    gapInput.preferredSize = [60, 24];
    var gapDown = gapGroup.add("button", undefined, "\u25BC");
    gapDown.preferredSize = [24, 24];
    var gapUp = gapGroup.add("button", undefined, "\u25B2");
    gapUp.preferredSize = [24, 24];
    gapUp.onClick = function() { gapInput.text = String((parseFloat(gapInput.text) || 3) + 1); };
    gapDown.onClick = function() { var v = (parseFloat(gapInput.text) || 3) - 1; gapInput.text = String(Math.max(0, v)); };

    // はみだし
    var overflowGroup = settingsPanel.add("group");
    overflowGroup.add("statictext", undefined, "\u306F\u307F\u3060\u3057:");
    var overflowDropdown = overflowGroup.add("dropdownlist", undefined,
        ["\u8ABF\u6574\u306A\u3057", "\u5909\u5F62"]);
    overflowDropdown.selection = 0;

    // 捨て仮名
    var suteganaGroup = settingsPanel.add("group");
    var suteganaCheck = suteganaGroup.add("checkbox", undefined, "\u5C0F\u6587\u5B57\u306E\u5927\u6587\u5B57\u5909\u63DB");
    suteganaCheck.value = false;

    // 学習漢字ハイライト
    var highlightGroup = settingsPanel.add("group");
    highlightGroup.orientation = "column";
    highlightGroup.alignChildren = ["fill", "top"];
    var highlightLabel = highlightGroup.add("statictext", undefined, "\u5B66\u7FD2\u6F22\u5B57\u30CF\u30A4\u30E9\u30A4\u30C8:");
    highlightLabel.graphics.font = ScriptUI.newFont("dialog", "Regular", 11);
    var highlightDropdown = highlightGroup.add("dropdownlist", undefined,
        ["\u306A\u3057", "\u5C0F1\u307E\u3067\u3067\u672A\u7FD2", "\u5C0F2\u307E\u3067\u3067\u672A\u7FD2", "\u5C0F3\u307E\u3067\u3067\u672A\u7FD2", "\u5C0F4\u307E\u3067\u3067\u672A\u7FD2", "\u5C0F5\u307E\u3067\u3067\u672A\u7FD2", "\u5C0F6\u307E\u3067\u3067\u672A\u7FD2"]);
    highlightDropdown.selection = kanjiHighlightGrade;
    highlightDropdown.onChange = function() {
        kanjiHighlightGrade = highlightDropdown.selection.index;
        renderPage();
        scrollContainer.layout.layout(true);
    };

    // 4. 実行ボタン（右サイドバーの下部）
    var btnGroup = rightSidebar.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignChildren = ["center", "bottom"];
    btnGroup.preferredSize = [rightPanelWidth - 20, 60];
    var executeBtn = btnGroup.add("button", undefined, "\u5B9F\u884C", { name: "ok" });
    var cancelBtn = btnGroup.add("button", undefined, "\u30AD\u30E3\u30F3\u30BB\u30EB", { name: "cancel" });

    // 5. 使い方パネル（ボタン群と同じ幅）
    var helpPanel = rightSidebar.add("panel", undefined, "\u4F7F\u3044\u65B9");
    helpPanel.orientation = "column";
    helpPanel.alignChildren = ["fill", "top"];
    helpPanel.preferredSize = [rightPanelWidth - 20, -1];
    helpPanel.spacing = 0;

    var helpFont = ScriptUI.newFont("dialog", "Regular", 7);
    var helpBoldFont = ScriptUI.newFont("dialog", "Bold", 7);

    var helpBasicTitle = helpPanel.add("statictext", undefined, "\u25CF \u57FA\u672C");
    helpBasicTitle.graphics.font = helpBoldFont;
    var helpBasic1 = helpPanel.add("statictext", undefined, "Tab/Shift+Tab\u3067\u6F22\u5B57\u9593\u79FB\u52D5");
    helpBasic1.graphics.font = helpFont;
    var helpBasic2 = helpPanel.add("statictext", undefined, "\u5404\u6B04\u30AF\u30EA\u30C3\u30AF\u3067\u76F4\u63A5\u7DE8\u96C6\u3082\u53EF");
    helpBasic2.graphics.font = helpFont;

    var helpSpacer1 = helpPanel.add("statictext", undefined, "");
    helpSpacer1.preferredSize = [1, 2];

    var helpGroupTitle = helpPanel.add("statictext", undefined, "\u25CF \u30B0\u30EB\u30FC\u30D7");
    helpGroupTitle.graphics.font = helpBoldFont;
    var helpGroup1 = helpPanel.add("statictext", undefined, "\u6F22\u5B57\u3092\u8907\u6570\u30AF\u30EA\u30C3\u30AF\u3067\u9078\u629E");
    helpGroup1.graphics.font = helpFont;
    var helpGroup2 = helpPanel.add("statictext", undefined, "\u2192\u30B0\u30EB\u30FC\u30D7\u5316\u3067\u8907\u6570\u6587\u5B57\u306B\u30EB\u30D3");
    helpGroup2.graphics.font = helpFont;

    var helpSpacer2 = helpPanel.add("statictext", undefined, "");
    helpSpacer2.preferredSize = [1, 2];

    var helpSettingsTitle = helpPanel.add("statictext", undefined, "\u25CF \u6761\u4EF6\u8A2D\u5B9A");
    helpSettingsTitle.graphics.font = helpBoldFont;
    var helpSettings1 = helpPanel.add("statictext", undefined, "\u30D5\u30A9\u30F3\u30C8\u30FB\u8272\uFF1A\u5BFE\u8C61\u6587\u5B57\u306B\u6E96\u62E0");
    helpSettings1.graphics.font = helpFont;
    var helpSettings2 = helpPanel.add("statictext", undefined, "\u30B5\u30A4\u30BA\uFF1A\u89AA\u6587\u5B57\u306B\u5BFE\u3059\u308B\u6BD4\u7387");
    helpSettings2.graphics.font = helpFont;
    var helpSettings3 = helpPanel.add("statictext", undefined, "\u9593\u9694\uFF1A\u30EB\u30D3\u3068\u89AA\u6587\u5B57\u306E\u8DDD\u96E2");
    helpSettings3.graphics.font = helpFont;
    var helpSettings4 = helpPanel.add("statictext", undefined, "\u306F\u307F\u3060\u3057\uFF1A\u6587\u5B57\u4E0A\u306B\u53CE\u3081\u308B\u5E45\u8ABF\u6574");
    helpSettings4.graphics.font = helpFont;

    var helpSpacer3 = helpPanel.add("statictext", undefined, "");
    helpSpacer3.preferredSize = [1, 2];

    var helpHighlightTitle = helpPanel.add("statictext", undefined, "\u25CF \u5B66\u7FD2\u6F22\u5B57\u30CF\u30A4\u30E9\u30A4\u30C8");
    helpHighlightTitle.graphics.font = helpBoldFont;
    var helpHighlight1 = helpPanel.add("statictext", undefined, "\u25C6\u4ED8\u304D\uFF1D\u672A\u7FD2\u6F22\u5B57\uFF08\u30EB\u30D3\u63A8\u5968\uFF09");
    helpHighlight1.graphics.font = helpFont;

    // 6. クレジット表示
    var creditSpacer = rightSidebar.add("statictext", undefined, "");
    creditSpacer.preferredSize = [1, 5];
    var creditLabel = rightSidebar.add("statictext", undefined, "\u5236\u4F5C: \u9234\u6728\u660E\u4E16\uFF08\u5317\u6D77\u9053\u535A\u7269\u9928\uFF09");
    creditLabel.alignment = ["center", "top"];
    creditLabel.graphics.font = ScriptUI.newFont("dialog", "Regular", 10);

    // ============================================================
    // ロジック・イベントハンドラ
    // ============================================================
    var selectedButtons = []; // 現ページのUI参照
    var currentFrameIndex = 0;

    // 選択数の表示を更新（selectedCharIndicesベース）
    function updateSelectionInfoLabel() {
        var count = 0;
        var firstChar = "";
        var sortedKeys = [];
        for (var key in selectedCharIndices) {
            if (selectedCharIndices.hasOwnProperty(key)) {
                sortedKeys.push(parseInt(key));
                count++;
            }
        }
        if (sortedKeys.length > 0) {
            sortedKeys.sort(function(a, b) { return a - b; });
            firstChar = charInfoMap[sortedKeys[0]].ch;
        }
        selInfoLabel.text = "\u9078\u629E\u6570: " + count +
            (count > 0 ? " (" + firstChar + "...)" : "");
    }

    // 選択表示リセット
    function resetSelectionDisplay() {
        var buttons = characterButtonGroups[currentFrameIndex];
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].text = buttons[i].needsHighlight ? ("\u25C6" + buttons[i].originalCharacter) : buttons[i].originalCharacter;
        }
        selectedButtons = [];
        selectedCharIndices = {};
        selInfoLabel.text = "\u9078\u629E\u6570: 0";
        currentCharLabel.text = "\u6587\u5B57: -";
        currentRubyInput.text = "";
        currentRubyInput.enabled = false;
    }

    // 選択中ルビ表示の更新（selectedCharIndicesベース）
    function updateCurrentRubyDisplay() {
        var sortedKeys = [];
        for (var key in selectedCharIndices) {
            if (selectedCharIndices.hasOwnProperty(key)) {
                sortedKeys.push(parseInt(key));
            }
        }
        if (sortedKeys.length === 0) {
            currentCharLabel.text = "\u6587\u5B57: -";
            currentRubyInput.text = "";
            currentRubyInput.enabled = false;
            return;
        }

        sortedKeys.sort(function(a, b) { return a - b; });
        var charText = "";
        for (var i = 0; i < sortedKeys.length; i++) {
            charText += charInfoMap[sortedKeys[i]].ch;
        }
        currentCharLabel.text = "\u6587\u5B57: " + charText;

        var firstIdx = sortedKeys[0];
        var existingRuby = rubyData[currentFrameIndex][firstIdx];
        if (existingRuby && existingRuby.ruby) {
            currentRubyInput.text = existingRuby.ruby;
        } else {
            // 現ページの入力欄から取得を試みる
            var inputs = rubyInputGroups[currentFrameIndex];
            var found = false;
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].characterIndex === firstIdx) {
                    currentRubyInput.text = inputs[i].text || "";
                    found = true;
                    break;
                }
            }
            if (!found) currentRubyInput.text = "";
        }
        currentRubyInput.enabled = true;
    }

    // 選択状態更新
    function updateSelection(btn) {
        var ci = btn.characterIndex;

        if (selectedCharIndices[ci]) {
            // 解除
            delete selectedCharIndices[ci];
            btn.text = btn.needsHighlight ? ("\u25C6" + btn.originalCharacter) : btn.originalCharacter;
            // selectedButtonsから除去
            for (var i = selectedButtons.length - 1; i >= 0; i--) {
                if (selectedButtons[i] === btn) { selectedButtons.splice(i, 1); break; }
            }
        } else {
            // 追加
            selectedCharIndices[ci] = true;
            btn.text = "\u25A0" + btn.originalCharacter + "\u25A0";
            selectedButtons.push(btn);
            selectedButtons.sort(function (a, b) { return a.characterIndex - b.characterIndex; });
        }

        updateSelectionInfoLabel();
        updateCurrentRubyDisplay();
    }

    // ===== ページ描画関数 =====
    function renderPage() {
        var fIdx = pageState.frameIndex;
        var page = pageState.currentPage;
        var startLine = page * pageState.linesPerPage;
        var endLine = Math.min(startLine + pageState.linesPerPage, pageState.allVisualLines.length);

        // scrollGroupを破棄して再作成
        var sc = pageState.scrollContainer;
        if (pageState.scrollGroup) {
            sc.remove(pageState.scrollGroup);
        }
        var scrollGroup = sc.add("group");
        scrollGroup.orientation = "column";
        scrollGroup.alignChildren = ["left", "top"];
        scrollGroup.spacing = 2;
        scrollGroup.preferredSize = [sc.preferredSize[0], sc.preferredSize[1]];
        pageState.scrollGroup = scrollGroup;

        var frameButtons = [];
        var frameInputs = [];
        var pageSelectedButtons = [];

        for (var li = startLine; li < endLine; li++) {
            var visualLine = pageState.allVisualLines[li];
            var lineGroup = scrollGroup.add("group");
            lineGroup.orientation = "row";
            lineGroup.alignChildren = ["left", "top"];
            lineGroup.spacing = charSpacing;

            for (var vi = 0; vi < visualLine.length; vi++) {
                var entry = visualLine[vi];
                var charGroup = lineGroup.add("group");
                charGroup.orientation = "column";
                charGroup.alignChildren = ["fill", "center"];
                charGroup.spacing = 0;
                charGroup.preferredSize = [40, -1];

                // 既存のルビデータを読み込み
                var existingRuby = "";
                var isDisabled = false;
                if (rubyData[fIdx] && rubyData[fIdx][entry.globalIdx]) {
                    var data = rubyData[fIdx][entry.globalIdx];
                    if (data.isGroupMember) {
                        existingRuby = "-";
                        isDisabled = true;
                    } else if (data.ruby) {
                        existingRuby = data.ruby;
                    }
                }

                var rubyInput = charGroup.add("edittext", undefined, existingRuby);
                rubyInput.preferredSize = [40, 16];
                rubyInput.graphics.font = ScriptUI.newFont("dialog:7");
                rubyInput.frameIndex = fIdx;
                rubyInput.characterIndex = entry.globalIdx;
                rubyInput.originalCharacter = entry.ch;
                rubyInput.enabled = !isDisabled;

                // 未習漢字ハイライト判定
                var needsHighlight = false;
                if (kanjiHighlightGrade > 0 && isKanji(entry.ch)) {
                    var grade = getKanjiGrade(entry.ch);
                    if (grade === 0 || grade > kanjiHighlightGrade) {
                        needsHighlight = true;
                    }
                }

                var isSelected = selectedCharIndices[entry.globalIdx] ? true : false;
                var btnText;
                if (isSelected) {
                    btnText = "\u25A0" + entry.ch + "\u25A0";
                } else if (needsHighlight) {
                    btnText = "\u25C6" + entry.ch;
                } else {
                    btnText = entry.ch;
                }
                var charBtn = charGroup.add("button", undefined, btnText);
                charBtn.preferredSize = [40, 24];
                charBtn.frameIndex = fIdx;
                charBtn.characterIndex = entry.globalIdx;
                charBtn.originalCharacter = entry.ch;
                charBtn.toggleState = isSelected;
                charBtn.needsHighlight = needsHighlight;

                // graphicsAPIでハイライト色を設定（対応環境のみ）
                if (needsHighlight && !isSelected) {
                    try {
                        var g = charBtn.graphics;
                        var highlightPen = g.newPen(g.PenType.SOLID_COLOR, [0.8, 0.2, 0.2, 1], 1);
                        g.foregroundColor = highlightPen;
                    } catch (e) {
                        // graphics API非対応の場合はマーカー文字で代替（既に付与済み）
                    }
                }

                frameButtons.push(charBtn);
                frameInputs.push(rubyInput);

                if (isSelected) {
                    pageSelectedButtons.push(charBtn);
                }
            }
        }

        // 参照を更新
        characterButtonGroups[fIdx] = frameButtons;
        rubyInputGroups[fIdx] = frameInputs;
        selectedButtons = pageSelectedButtons;

        // イベントハンドラをアタッチ
        for (var i = 0; i < frameButtons.length; i++) {
            frameButtons[i].onClick = function() {
                updateSelection(this);
            };
        }

        for (var i = 0; i < frameInputs.length; i++) {
            (function(idx) {
                var input = frameInputs[idx];

                input.onChanging = function() {
                    var val = this.text;
                    var ci = this.characterIndex;
                    var existing = rubyData[fIdx][ci];
                    if (existing && existing.mode === "group" && existing.isGroupMember) return;

                    if (existing && existing.mode === "group" && !existing.isGroupMember) {
                        existing.ruby = val;
                    } else {
                        rubyData[fIdx][ci] = {
                            mode: "individual",
                            ruby: val,
                            individualRubys: [val],
                            baseChar: this.originalCharacter,
                            baseLength: 1
                        };
                    }
                };

                input.addEventListener("focus", function() {
                    currentCharLabel.text = "\u6587\u5B57: " + this.originalCharacter;
                    currentRubyInput.text = this.text;
                    currentRubyInput.enabled = true;

                    var syncedInput = this;
                    currentRubyInput.onChanging = function() {
                        syncedInput.text = this.text;
                        var ci = syncedInput.characterIndex;
                        var existing = rubyData[fIdx][ci];
                        if (existing && existing.mode === "group" && existing.isGroupMember) return;

                        if (existing && existing.mode === "group" && !existing.isGroupMember) {
                            existing.ruby = this.text;
                        } else {
                            rubyData[fIdx][ci] = {
                                mode: "individual",
                                ruby: this.text,
                                individualRubys: [this.text],
                                baseChar: syncedInput.originalCharacter,
                                baseLength: 1
                            };
                        }
                    };
                });

                // Tabキーで次の漢字のルビ欄に移動（ページ境界で自動遷移）
                input.addEventListener("keydown", function(e) {
                    if (e.keyName === "Tab") {
                        e.preventDefault();
                        var currentInputs = rubyInputGroups[fIdx];
                        var nextIdx = e.shiftKey ? idx - 1 : idx + 1;

                        // 現ページ内を検索
                        while (nextIdx >= 0 && nextIdx < currentInputs.length) {
                            if (currentInputs[nextIdx].enabled &&
                                (isKanji(currentInputs[nextIdx].originalCharacter) || currentInputs[nextIdx].text !== "")) {
                                currentInputs[nextIdx].active = true;
                                return;
                            }
                            nextIdx += e.shiftKey ? -1 : 1;
                        }

                        // ページ境界を越える
                        if (!e.shiftKey && pageState.currentPage < pageState.totalPages - 1) {
                            pageState.currentPage++;
                            renderPage();
                            sc.layout.layout(true);
                            // 次ページの最初の漢字入力欄にフォーカス
                            var newInputs = rubyInputGroups[fIdx];
                            for (var ni = 0; ni < newInputs.length; ni++) {
                                if (newInputs[ni].enabled &&
                                    (isKanji(newInputs[ni].originalCharacter) || newInputs[ni].text !== "")) {
                                    newInputs[ni].active = true;
                                    return;
                                }
                            }
                        } else if (e.shiftKey && pageState.currentPage > 0) {
                            pageState.currentPage--;
                            renderPage();
                            sc.layout.layout(true);
                            // 前ページの最後の漢字入力欄にフォーカス
                            var newInputs = rubyInputGroups[fIdx];
                            for (var ni = newInputs.length - 1; ni >= 0; ni--) {
                                if (newInputs[ni].enabled &&
                                    (isKanji(newInputs[ni].originalCharacter) || newInputs[ni].text !== "")) {
                                    newInputs[ni].active = true;
                                    return;
                                }
                            }
                        }
                    }
                });
            })(i);
        }

        // ページ表示更新
        pageLabel.text = (page + 1) + " / " + pageState.totalPages;
        prevBtn.enabled = page > 0;
        nextBtn.enabled = page < pageState.totalPages - 1;
    }

    // グループ化処理（selectedCharIndicesベース）
    groupBtn.onClick = function () {
        var sortedIndices = [];
        for (var key in selectedCharIndices) {
            if (selectedCharIndices.hasOwnProperty(key)) {
                sortedIndices.push(parseInt(key));
            }
        }
        sortedIndices.sort(function(a, b) { return a - b; });

        if (sortedIndices.length < 2) {
            alert("\u30B0\u30EB\u30FC\u30D7\u5316\u3059\u308B\u6587\u5B57\u30922\u3064\u4EE5\u4E0A\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044");
            return;
        }

        // 連続チェック
        for (var i = 0; i < sortedIndices.length - 1; i++) {
            if (sortedIndices[i + 1] !== sortedIndices[i] + 1) {
                alert("\u9078\u629E\u3057\u305F\u6587\u5B57\u304C\u9023\u7D9A\u3057\u3066\u3044\u307E\u305B\u3093");
                return;
            }
        }

        var leaderIdx = sortedIndices[0];
        var leaderChar = charInfoMap[leaderIdx].ch;
        var inputs = rubyInputGroups[currentFrameIndex];

        // 既存データの読み出し
        var defaultText = "";
        var leaderInput = null;
        for (var k = 0; k < inputs.length; k++) {
            if (inputs[k].characterIndex === leaderIdx) { leaderInput = inputs[k]; break; }
        }
        if (leaderInput) defaultText = leaderInput.text;

        var rubyText = prompt("\u30B0\u30EB\u30FC\u30D7\u30EB\u30D3\u3092\u5165\u529B", defaultText);
        if (rubyText === null) return;

        // Leader データ登録
        rubyData[currentFrameIndex][leaderIdx] = {
            mode: "group",
            ruby: rubyText,
            baseChar: leaderChar,
            baseLength: sortedIndices.length,
            isGroupMember: false
        };

        // Members データ登録
        for (var i = 1; i < sortedIndices.length; i++) {
            rubyData[currentFrameIndex][sortedIndices[i]] = {
                mode: "group",
                ruby: "",
                isGroupMember: true,
                leaderIndex: leaderIdx
            };
        }

        // 選択解除してページを再描画（UIをデータから再構築）
        selectedButtons = [];
        selectedCharIndices = {};
        renderPage();
        scrollContainer.layout.layout(true);
        resetSelectionDisplay();
    };

    // グループ解除（selectedCharIndicesベース）
    ungroupBtn.onClick = function () {
        var sortedIndices = [];
        for (var key in selectedCharIndices) {
            if (selectedCharIndices.hasOwnProperty(key)) {
                sortedIndices.push(parseInt(key));
            }
        }
        if (sortedIndices.length === 0) return;

        for (var i = 0; i < sortedIndices.length; i++) {
            var ci = sortedIndices[i];
            if (rubyData[currentFrameIndex][ci]) {
                delete rubyData[currentFrameIndex][ci];
            }
        }

        selectedButtons = [];
        selectedCharIndices = {};
        renderPage();
        scrollContainer.layout.layout(true);
        resetSelectionDisplay();
    };

    clearSelBtn.onClick = function () {
        selectedButtons = [];
        selectedCharIndices = {};
        resetSelectionDisplay();
        updateSelectionInfoLabel();
    };

    // 選択中のルビ編集エリアの入力処理
    currentRubyInput.onChanging = function () {
        var sortedKeys = [];
        for (var key in selectedCharIndices) {
            if (selectedCharIndices.hasOwnProperty(key)) {
                sortedKeys.push(parseInt(key));
            }
        }
        if (sortedKeys.length === 0) return;
        sortedKeys.sort(function(a, b) { return a - b; });

        var val = this.text;
        var firstIdx = sortedKeys[0];
        var inputs = rubyInputGroups[currentFrameIndex];

        if (sortedKeys.length > 1) {
            var existing = rubyData[currentFrameIndex][firstIdx];
            if (existing && existing.mode === "group" && !existing.isGroupMember) {
                existing.ruby = val;
            }
        } else {
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].characterIndex === firstIdx) {
                    inputs[i].text = val;
                    rubyData[currentFrameIndex][firstIdx] = {
                        mode: "individual",
                        ruby: val,
                        individualRubys: [val],
                        baseChar: charInfoMap[firstIdx].ch,
                        baseLength: 1
                    };
                    break;
                }
            }
        }
    };

    // ページナビゲーションイベント
    prevBtn.onClick = function() {
        if (pageState.currentPage > 0) {
            pageState.currentPage--;
            renderPage();
            scrollContainer.layout.layout(true);
        }
    };
    nextBtn.onClick = function() {
        if (pageState.currentPage < pageState.totalPages - 1) {
            pageState.currentPage++;
            renderPage();
            scrollContainer.layout.layout(true);
        }
    };

    // 実行ボタン
    executeBtn.onClick = function () {
        var rubySizePercent = parseFloat(sizeInput.text) || 40;
        var rubySizeRatio = rubySizePercent / 100;
        var gapPercent = parseFloat(gapInput.text);
        if (isNaN(gapPercent)) gapPercent = 3;
        var rubyGapRatio = gapPercent / 100;
        var overflowMap = ["none", "narrow"];
        var overflow = overflowMap[overflowDropdown.selection.index];
        var useSutegana = suteganaCheck.value;

        try {
            placeRubys(textFrames, rubyData, {
                rubySizeRatio: rubySizeRatio,
                rubyGapRatio: rubyGapRatio,
                overflow: overflow,
                sutegana: useSutegana
            });
            win.close();
        } catch (e) {
            alert("\u30A8\u30E9\u30FC: " + e.message);
        }
    };

    // 再描画ボタンのイベントハンドラ
    redrawBtn.onClick = function() {
        redrawFlag = true;
        savedWinBounds = win.bounds;
        win.close();
    };

    // 初回ページを描画してレイアウト確定
    renderPage();
    win.layout.layout(true);
    // ウィンドウ表示後に実サイズで再計算（preferredSizeと実際のサイズが異なるため）
    win.onShow = function() {
        var actualHeight = leftGroup.size[1];
        var newContentAreaHeight = actualHeight - 40 - navAreaHeight - redrawAreaHeight;
        var newLinesPerPage = Math.max(1, Math.floor(newContentAreaHeight / lineGroupHeight));
        if (pageState && newLinesPerPage !== pageState.linesPerPage) {
            pageState.linesPerPage = newLinesPerPage;
            pageState.totalPages = Math.max(1, Math.ceil(pageState.allVisualLines.length / newLinesPerPage));
            if (pageState.currentPage >= pageState.totalPages) {
                pageState.currentPage = pageState.totalPages - 1;
            }
            scrollContainer.preferredSize[1] = newContentAreaHeight;
            renderPage();
        }
        scrollContainer.layout.layout(true);
        win.layout.layout(true);
    };

    win.show();

    // 再描画が要求された場合
    if (redrawFlag) {
        return {
            action: "redraw",
            rubyData: rubyData,
            winBounds: savedWinBounds,
            currentPage: pageState.currentPage,
            kanjiHighlightGrade: kanjiHighlightGrade
        };
    }
}

// ============================================================
// ルビ配置メインロジック
// ============================================================
function placeRubys(textFrames, rubyData, settings) {
    var doc = app.activeDocument;
    rubyMetadataWriteFailureCount = 0;

    // Rubyレイヤー取得/作成
    var rubyLayer;
    try {
        rubyLayer = doc.layers.getByName("Ruby");
    } catch (e) {
        rubyLayer = doc.layers.add();
        rubyLayer.name = "Ruby";
    }

    var totalRubyCount = 0;

    for (var f = 0; f < textFrames.length; f++) {
        var frame = textFrames[f];
        var data = rubyData[f];
        var isVertical = (frame.orientation === TextOrientation.VERTICAL);

        // テキストフレーム用グループ作成
        var frameGroup = rubyLayer.groupItems.add();
        frameGroup.name = "ruby_" + (frame.name || ("frame" + (f + 1)));

        // アウトライン化を1回だけ行い、全ルビで共有（クラッシュ防止）
        var tempFrame = frame.duplicate();
        var tempOutline = null;
        var compoundPaths = [];
        try {
            tempOutline = tempFrame.createOutline();
            for (var cp = 0; cp < tempOutline.compoundPathItems.length; cp++) {
                compoundPaths.push(tempOutline.compoundPathItems[cp]);
            }
        } catch (e) {
            // アウトライン化に失敗した場合はスキップ
            if (tempOutline) {
                try { tempOutline.remove(); } catch (ignore) {}
            }
            continue;
        }

        // 可視文字インデックスのルックアップテーブルを事前計算（ルビごとの再計算を回避）
        var contents = frame.contents;
        var visibleIndexMap = [];
        var visIdx = 0;
        for (var vi = 0; vi < contents.length; vi++) {
            var code = contents.charCodeAt(vi);
            if (code === 13 || code === 10 || code === 9 ||
                code === 32 || code === 12288 || code === 8195) {
                visibleIndexMap.push(visIdx);
            } else {
                visibleIndexMap.push(visIdx);
                visIdx++;
            }
        }

        // charactersコレクションを1回だけ取得（IPC通信の削減）
        var characters = frame.textRange.characters;

        // 処理済みグループリーダーを追跡
        var processedLeaders = {};

        // 各文字のルビを処理
        var characterKeys = [];
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                characterKeys.push(parseInt(key));
            }
        }
        characterKeys.sort(function (a, b) { return a - b; });

        // 全てのルビを配置（try-finallyでアウトライン削除を保証）
        var allRubies = [];
        try {
            for (var ki = 0; ki < characterKeys.length; ki++) {
                var characterIndex = characterKeys[ki];
                var rubyInfo = data[characterIndex];

                if (!rubyInfo) continue;
                if (rubyInfo.isGroupMember) continue;
                if (processedLeaders[characterIndex]) continue;

                var baseLength = rubyInfo.baseLength || 1;

                if (rubyInfo.mode === "individual") {
                    for (var ic = 0; ic < (rubyInfo.individualRubys || []).length; ic++) {
                        var individualRuby = rubyInfo.individualRubys[ic];
                        if (!individualRuby || individualRuby === "") continue;

                        var rubyFrame = placeOneRuby(frame, frameGroup, characterIndex, 1,
                            individualRuby, settings, isVertical, compoundPaths, visibleIndexMap, characters);
                        if (rubyFrame) allRubies.push(rubyFrame);
                        totalRubyCount++;
                    }
                    processedLeaders[characterIndex] = true;
                } else {
                    var rubyText = rubyInfo.ruby;
                    if (rubyText && rubyText !== "") {
                        var rubyFrame = placeOneRuby(frame, frameGroup, characterIndex, baseLength,
                            rubyText, settings, isVertical, compoundPaths, visibleIndexMap, characters);
                        if (rubyFrame) allRubies.push(rubyFrame);
                        totalRubyCount++;
                        processedLeaders[characterIndex] = true;
                    }
                }
            }
        } finally {
            // エラーの有無にかかわらずアウトライン化した一時オブジェクトを確実に削除
            try { tempOutline.remove(); } catch (ignore) {}
        }

        // 横書きの場合、Y座標を基準に行をグループ化して下端揃え
        if (!isVertical && allRubies.length > 0) {
            // Y座標でグループ化（誤差5pt以内は同じ行とみなす）
            var tolerance = 5;
            var lineGroups = [];

            for (var ri = 0; ri < allRubies.length; ri++) {
                var ruby = allRubies[ri];
                var baseY = ruby.geometricBounds[1]; // top座標

                var foundGroup = false;
                for (var gi = 0; gi < lineGroups.length; gi++) {
                    var group = lineGroups[gi];
                    if (Math.abs(group.baseY - baseY) <= tolerance) {
                        group.rubies.push(ruby);
                        foundGroup = true;
                        break;
                    }
                }

                if (!foundGroup) {
                    lineGroups.push({
                        baseY: baseY,
                        rubies: [ruby]
                    });
                }
            }

            // 各行グループで下端揃え
            for (var gi = 0; gi < lineGroups.length; gi++) {
                var group = lineGroups[gi];
                var maxTop = null;

                for (var ri = 0; ri < group.rubies.length; ri++) {
                    var top = group.rubies[ri].top;
                    if (maxTop === null || top > maxTop) {
                        maxTop = top;
                    }
                }

                for (var ri = 0; ri < group.rubies.length; ri++) {
                    group.rubies[ri].top = maxTop;
                }
            }
        }
    }

    alert(totalRubyCount + " \u500B\u306E\u30EB\u30D3\u3092\u914D\u7F6E\u3057\u307E\u3057\u305F");
    if (rubyMetadataWriteFailureCount > 0) {
        alert(rubyMetadataWriteFailureCount + "件のルビでメタデータを書き込めませんでした。配置結果は変更していません。");
    }
}

// ============================================================
// 個別ルビ配置
// ============================================================
// ============================================================
// ルビメタデータ（Phase 1A）
// ============================================================
// name / note の可用性や保存後の保持はIllustrator実機で検証する。
// noteを主候補、nameを短い識別子またはフォールバックとして扱い、
// どちらも利用できない場合は既存の配置処理を止めない。
var rubyRecordSequence = 0;
var rubyMetadataPrefix = "illustrator-ruby-v1;";
var rubyMetadataNamePrefix = "ruby-meta-v1:";
var rubyAnchorNeedsReviewCount = 0;
var rubyMetadataWriteFailureCount = 0;

function rubyMetadataEncode(value) {
    var text = value === undefined || value === null ? "" : String(value);
    try {
        return encodeURIComponent(text);
    } catch (e) {
        return text.replace(/%/g, "%25").replace(/;/g, "%3B").split("=").join("%3D");
    }
}

function rubyMetadataDecode(value) {
    try {
        return decodeURIComponent(value);
    } catch (e) {
        return value;
    }
}

function makeRubyRecordId() {
    rubyRecordSequence++;
    return "ruby-" + (new Date().getTime()) + "-" + rubyRecordSequence;
}

function serializeRubyRecord(record) {
    var fields = [
        "schema=" + rubyMetadataEncode(record.schema || "illustrator-ruby/v1"),
        "recordId=" + rubyMetadataEncode(record.recordId || makeRubyRecordId()),
        "frameName=" + rubyMetadataEncode(record.frameName || ""),
        "groupName=" + rubyMetadataEncode(record.groupName || ""),
        "baseText=" + rubyMetadataEncode(record.baseText || ""),
        "start=" + rubyMetadataEncode(record.start === undefined ? "" : record.start),
        "length=" + rubyMetadataEncode(record.length === undefined ? 1 : record.length),
        "before=" + rubyMetadataEncode(record.before || ""),
        "after=" + rubyMetadataEncode(record.after || ""),
        "ruby=" + rubyMetadataEncode(record.ruby || ""),
        "state=" + rubyMetadataEncode(record.state || "auto"),
        "needsReview=" + (record.needsReview ? "true" : "false")
    ];
    return rubyMetadataPrefix + fields.join(";");
}

function parseRubyRecord(serialized) {
    if (!serialized || serialized.indexOf(rubyMetadataPrefix) !== 0) return null;

    var record = {};
    var fields = serialized.substr(rubyMetadataPrefix.length).split(";");
    for (var i = 0; i < fields.length; i++) {
        var separator = fields[i].indexOf("=");
        if (separator < 0) continue;
        var key = fields[i].substr(0, separator);
        var value = rubyMetadataDecode(fields[i].substr(separator + 1));
        record[key] = value;
    }

    if (!record.schema || !record.recordId || !record.baseText) return null;
    record.start = parseInt(record.start, 10);
    record.length = parseInt(record.length, 10) || 1;
    record.needsReview = record.needsReview === "true";
    return record;
}

function writeRubyRecord(pageItem, record) {
    if (!pageItem || !record) return false;

    var serialized = serializeRubyRecord(record);
    var wrote = false;

    // note は構造化レコードの主候補。実機で保存後の保持を確認する。
    try {
        pageItem.note = serialized;
        if (pageItem.note === serialized) wrote = true;
    } catch (noteError) {}

    // name は短い識別子または note 非対応時のフォールバック候補。
    try {
        var nameValue = rubyMetadataNamePrefix + rubyMetadataEncode(record.recordId || "");
        pageItem.name = nameValue;
        if (!wrote && pageItem.name === nameValue) {
            // nameだけの場合も最小レコードを読めるよう、可能な範囲で全体を保持する。
            var namePayload = rubyMetadataNamePrefix + rubyMetadataEncode(serialized);
            try {
                pageItem.name = namePayload;
                wrote = pageItem.name === namePayload;
            } catch (namePayloadError) {}
        }
    } catch (nameError) {}

    return wrote;
}

function readRubyRecords(doc) {
    var records = [];
    if (!doc) return records;

    var rubyLayer = null;
    try {
        rubyLayer = doc.layers.getByName("Ruby");
    } catch (layerError) {
        return records;
    }

    // 現行生成物はフレーム別グループ直下にルビTextFrameを持つ。
    for (var gi = 0; gi < rubyLayer.groupItems.length; gi++) {
        var frameGroup = rubyLayer.groupItems[gi];
        for (var ti = 0; ti < frameGroup.textFrames.length; ti++) {
            var item = frameGroup.textFrames[ti];
            var record = null;
            try { record = parseRubyRecord(item.note); } catch (noteError) {}

            // noteが読めない場合は、nameに全体を保持したフォールバックを試す。
            if (!record) {
                try {
                    if (item.name.indexOf(rubyMetadataNamePrefix) === 0) {
                        record = parseRubyRecord(rubyMetadataDecode(item.name.substr(rubyMetadataNamePrefix.length)));
                    }
                } catch (nameError) {}
            }

            if (record) {
                if (!record.groupName) {
                    try { record.groupName = frameGroup.name || ""; } catch (groupNameError) {}
                }
                records.push(record);
            }
        }
    }
    return records;
}

function resolveBaseAnchor(contents, record) {
    var result = { index: -1, length: record ? (record.length || 1) : 1, needsReview: true };
    if (!contents || !record || !record.baseText) return result;

    var candidates = [];
    var oldStart = parseInt(record.start, 10);
    var hasOldStart = !isNaN(oldStart) && oldStart >= 0;
    var searchFrom = 0;
    var found;
    while ((found = contents.indexOf(record.baseText, searchFrom)) >= 0) {
        var beforeStart = Math.max(0, found - (record.before || "").length);
        var afterStart = found + record.baseText.length;
        var beforeMatch = !record.before || contents.substr(beforeStart, record.before.length) === record.before;
        var afterMatch = !record.after || contents.substr(afterStart, record.after.length) === record.after;
        if (beforeMatch && afterMatch) {
            candidates.push({
                index: found,
                distanceFromOldStart: hasOldStart ? Math.abs(found - oldStart) : Number.MAX_VALUE
            });
        }
        searchFrom = found + Math.max(1, record.baseText.length);
    }

    // 旧位置は候補の評価順と診断に使うが、候補が複数ある場合の自動決定には使わない。
    candidates.sort(function (a, b) { return a.distanceFromOldStart - b.distanceFromOldStart; });
    if (candidates.length === 1) {
        result.index = candidates[0].index;
        result.needsReview = false;
    }
    return result;
}

function rubyDataFromRecords(textFrame, records) {
    var data = [{}];
    if (!textFrame || !records) return data;

    rubyAnchorNeedsReviewCount = 0;
    var contents = textFrame.contents;
    var currentFrameName = "";
    try { currentFrameName = textFrame.name || ""; } catch (frameNameError) {}
    var expectedGroupName = currentFrameName ? "ruby_" + currentFrameName : "";
    for (var i = 0; i < records.length; i++) {
        var record = records[i];
        if (record.needsReview) {
            rubyAnchorNeedsReviewCount++;
            continue;
        }
        // 本文フレーム名または生成グループ名が欠けるレコードは別フレームへ混ぜない。
        if (!record.frameName || !currentFrameName || record.frameName !== currentFrameName ||
            !record.groupName || (expectedGroupName && record.groupName !== expectedGroupName)) {
            record.needsReview = true;
            rubyAnchorNeedsReviewCount++;
            continue;
        }

        var resolved = resolveBaseAnchor(contents, record);
        if (resolved.needsReview) {
            record.needsReview = true;
            rubyAnchorNeedsReviewCount++;
            continue;
        }
        if (!record.ruby) continue;

        if ((record.length || 1) > 1) {
            data[0][resolved.index] = {
                mode: "group",
                ruby: record.ruby,
                baseChar: record.baseText.charAt(0),
                baseLength: record.length,
                isGroupMember: false
            };
        } else {
            data[0][resolved.index] = {
                mode: "individual",
                ruby: record.ruby,
                individualRubys: [record.ruby],
                baseChar: record.baseText,
                baseLength: 1
            };
        }
    }
    return data;
}

function placeOneRuby(textFrame, group, characterIndex, baseLength, rubyText, settings, isVertical, compoundPaths, visibleIndexMap, characters) {
    // 範囲チェック
    if (characterIndex >= characters.length) return null;

    var baseCharacter = characters[characterIndex];
    var baseSize = baseCharacter.characterAttributes.size;
    var rubySize = baseSize * settings.rubySizeRatio;

    // フォントは対象文字と同じものを使用
    var rubyFont = baseCharacter.characterAttributes.textFont;

    // 捨て仮名変換
    var finalRubyText = settings.sutegana ? convertSutegana(rubyText) : rubyText;

    // 事前計算済みのルックアップテーブルから可視文字インデックスを取得
    var visibleIndex = visibleIndexMap[characterIndex] || 0;

    var baseX, baseY, baseWidth, baseHeight;

    // 基準文字のパス位置を取得
    var pathIndex = compoundPaths.length - 1 - visibleIndex;

    if (pathIndex >= 0 && pathIndex < compoundPaths.length) {
        var basePath = compoundPaths[pathIndex];
        baseX = basePath.left;
        baseY = basePath.top;
        baseWidth = basePath.width;
        baseHeight = basePath.height;

        // 複数文字の場合、最後の文字まで幅を拡張
        if (baseLength > 1) {
            var endPathIndex = compoundPaths.length - 1 - (visibleIndex + baseLength - 1);
            if (endPathIndex >= 0 && endPathIndex < compoundPaths.length) {
                var endPath = compoundPaths[endPathIndex];
                if (isVertical) {
                    baseHeight = baseY - endPath.top + endPath.height;
                } else {
                    baseWidth = endPath.left + endPath.width - baseX;
                }
            }
        }
    } else {
        // フォールバック: テキストフレームの位置を使用
        baseX = textFrame.left;
        baseY = textFrame.top;
        baseWidth = baseSize * baseLength;
        baseHeight = baseSize;
    }

    // 字形が仮想ボディより著しく小さい場合の補正（「一」「二」「三」等）
    var minDimension = baseSize * 0.5;

    // 高さの補正（横書きでルビが近すぎる問題の対策）
    if (baseHeight < minDimension) {
        var corrected = false;
        // 隣接文字の上端位置を参照
        var prevIdx = pathIndex + 1; // compoundPathsは逆順なので+1が前の文字
        var nextIdx = pathIndex - 1;
        if (prevIdx < compoundPaths.length && compoundPaths[prevIdx].height >= minDimension) {
            baseY = compoundPaths[prevIdx].top;
            corrected = true;
        } else if (nextIdx >= 0 && compoundPaths[nextIdx].height >= minDimension) {
            baseY = compoundPaths[nextIdx].top;
            corrected = true;
        }
        // フォールバック: em squareを推定
        if (!corrected) {
            var outlineCenterY = baseY - baseHeight / 2;
            baseHeight = baseSize * 0.8;
            baseY = outlineCenterY + baseHeight / 2;
        }
    }

    // 幅の補正（縦書きでルビが近すぎる場合の対策）
    if (baseWidth < minDimension) {
        var outlineCenterX = baseX + baseWidth / 2;
        baseWidth = baseSize * 0.8;
        baseX = outlineCenterX - baseWidth / 2;
    }

    // 文字サイズを基準にルビ幅を計算（形状ではなく）
    var baseLen = baseSize * baseLength;

    // ルビのテキストフレーム作成
    var rubyFrame = group.textFrames.add();
    rubyFrame.textRange.characterAttributes.size = rubySize;
    rubyFrame.textRange.characterAttributes.textFont = rubyFont;
    rubyFrame.textRange.characterAttributes.fillColor = baseCharacter.characterAttributes.fillColor;
    rubyFrame.contents = finalRubyText;
    rubyFrame.orientation = isVertical ? TextOrientation.VERTICAL : TextOrientation.HORIZONTAL;

    // 中央揃えを設定（縦横共通）
    rubyFrame.textRange.paragraphs[0].justification = Justification.CENTER;

    // 基本トラッキングを100に設定、ルビの文字数に応じて-100まで調整
    var baseTracking = 100;
    var rubyCharCount = finalRubyText.length;

    // ルビが親文字より長い場合のみトラッキングを調整
    var rubyLength = rubySize * rubyCharCount;
    var tracking = baseTracking;

    if (rubyLength > baseLen && rubyCharCount > 1) {
        var neededReduction = rubyLength - baseLen;
        var maxReduction = baseTracking + 100; // 100から-100まで = 200の範囲
        var reductionTotal = (neededReduction / rubySize) * 1000;

        tracking = Math.max(baseTracking - reductionTotal, -100);
    }

    // トラッキング適用
    rubyFrame.textRange.characterAttributes.tracking = tracking;

    // トラッキング適用後のルビ長を再計算
    rubyLength = rubySize * rubyCharCount + (tracking / 1000) * rubySize * rubyCharCount;

    // はみだし処理
    if (settings.overflow === "narrow" && rubyLength > baseLen) {
        // 変形: ルビを縮小して親文字幅に収める
        if (isVertical) {
            rubyFrame.textRange.characterAttributes.verticalScale = (baseLen / rubyLength) * 100;
        } else {
            rubyFrame.textRange.characterAttributes.horizontalScale = (baseLen / rubyLength) * 100;
        }
        rubyLength = baseLen;
    }

    // ルビと親文字の間隔（親文字サイズに対する比率、GUIから設定可能）
    var rubyGap = baseSize * settings.rubyGapRatio;

    // 位置計算と配置（アウトラインの実際のサイズを基準に中央揃え）
    if (isVertical) {
        // 縦書き: ルビを親文字の右側に配置し、縦方向の中心を合わせる
        rubyFrame.left = baseX + baseWidth + rubyGap;
        rubyFrame.top = baseY;
        var actualRubyHeight = rubyFrame.height;

        // 親文字の縦方向の中心にルビの中心を合わせる
        // Illustratorのtopは上端（Y座標が大きいほど上）
        var baseCenterY = baseY - baseHeight / 2;
        rubyFrame.top = baseCenterY + actualRubyHeight / 2;
    } else {
        // 横書き: ルビを親文字の上に配置し、横方向の中心を合わせる
        rubyFrame.left = baseX;
        rubyFrame.top = baseY + rubySize + rubyGap;
        var actualRubyWidth = rubyFrame.width;

        // 親文字のアウトライン幅の中心にルビの中心を合わせる
        var baseCenterX = baseX + baseWidth / 2;
        rubyFrame.left = baseCenterX - actualRubyWidth / 2;
    }

    // 配置結果は変更せず、生成ルビに再編集用の最小メタデータだけ付与する。
    var frameContents = textFrame.contents;
    var baseText = frameContents.substr(characterIndex, baseLength);
    var contextLength = 8;
    var beforeStart = Math.max(0, characterIndex - contextLength);
    var afterStart = characterIndex + baseLength;
    var frameName = "";
    try { frameName = textFrame.name || ""; } catch (frameNameError) {}
    var groupName = "";
    try { groupName = group.name || ""; } catch (groupNameError) {}

    var metadataWritten = writeRubyRecord(rubyFrame, {
        schema: "illustrator-ruby/v1",
        recordId: makeRubyRecordId(),
        frameName: frameName,
        groupName: groupName,
        baseText: baseText,
        start: characterIndex,
        length: baseLength,
        before: frameContents.substr(beforeStart, characterIndex - beforeStart),
        after: frameContents.substr(afterStart, contextLength),
        ruby: rubyText,
        state: "auto",
        needsReview: false
    });
    if (!metadataWritten) rubyMetadataWriteFailureCount++;

    return rubyFrame;
}

// ============================================================
// 可視文字インデックス計算
// ============================================================
function getVisibleCharacterIndex(textFrame, characterIndex) {
    var contents = textFrame.contents;
    var visibleIdx = 0;
    for (var i = 0; i < characterIndex && i < contents.length; i++) {
        var code = contents.charCodeAt(i);
        // アウトライン化でcompoundPathが生成されない文字をスキップ
        // CR(13), LF(10), Tab(9), 半角スペース(32), 全角スペース(12288), emスペース(8195)
        if (code === 13 || code === 10 || code === 9 ||
            code === 32 || code === 12288 || code === 8195) {
            continue;
        }
        visibleIdx++;
    }
    return visibleIdx;
}

// ============================================================
// エントリーポイント
// ============================================================
function main() {
    if (!app.documents.length) {
        alert("\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3092\u958B\u3044\u3066\u304F\u3060\u3055\u3044");
        return;
    }

    var textFrames = getSelectedTextFrames();
    if (textFrames.length === 0) {
        alert("\u30C6\u30AD\u30B9\u30C8\u30D5\u30EC\u30FC\u30E0\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
    }

    // 複数選択時は先頭1つだけ処理
    if (textFrames.length > 1) {
        alert("\u8907\u6570\u306E\u30C6\u30AD\u30B9\u30C8\u30D5\u30EC\u30FC\u30E0\u304C\u9078\u629E\u3055\u308C\u3066\u3044\u307E\u3059\u3002\n\u5148\u982D\u306E1\u3064\u3092\u51E6\u7406\u3057\u307E\u3059\u3002");
    }

    // 保存済みメタデータは、既存の配置計算を通さずUIの初期rubyDataへ復元する。
    // メタデータがない文書は従来どおり空の状態から開始する。
    var persistedRubyRecords = readRubyRecords(app.activeDocument);
    var restoredRubyData = rubyDataFromRecords(textFrames[0], persistedRubyRecords);
    if (rubyAnchorNeedsReviewCount > 0) {
        alert(rubyAnchorNeedsReviewCount + "件のルビ本文アンカーを一意に解決できません。要確認のため自動更新しません。");
    }
    var guiOptions = persistedRubyRecords.length > 0 ? { rubyData: restoredRubyData } : undefined;

    // 再描画ループ: 再描画ボタンが押されたらrubyDataを保持してUIを再構築
    while (true) {
        var result = showRubyGUI([textFrames[0]], guiOptions);
        if (result && result.action === "redraw") {
            guiOptions = { rubyData: result.rubyData, winBounds: result.winBounds, currentPage: result.currentPage, kanjiHighlightGrade: result.kanjiHighlightGrade };
        } else {
            break;
        }
    }
}

main();
