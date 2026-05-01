/**
 * Merone AI実務力チェック - GASバックエンド
 * スプレッドシートに受験結果を自動記録する
 *
 * 使い方：
 * 1. このコードをApps Scriptに貼り付ける
 * 2. SPREADSHEET_ID を実際のスプレッドシートIDに書き換える
 * 3. Webアプリとしてデプロイする
 */

// ============================================================
// 設定（ここだけ書き換える）
// ============================================================
const SPREADSHEET_ID = '1AV4cymg7554ripyvzrxxEmRufL4d5TuVAUbScTG_2G0';
const SHEET_NAME = 'テスト結果';

// ============================================================
// POST受信（HTMLからのデータ受け取り）
// ============================================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    // シートが無ければ作成
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      setupHeader(sheet, data.total);
    }

    // ヘッダーが無ければ作成
    if (sheet.getLastRow() === 0) {
      setupHeader(sheet, data.total);
    }

    // データ行を追加
    var row = buildRow(data);
    sheet.appendRow(row);

    // 行の書式設定
    var lastRow = sheet.getLastRow();
    formatRow(sheet, lastRow, data.passed);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// GET受信（動作確認用）
// ============================================================
function doGet() {
  return ContentService
    .createTextOutput('Merone AI Quiz API is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
// ヘッダー行の作成
// ============================================================
function setupHeader(sheet, totalQ) {
  var header = ['受験日時', '氏名', 'スコア', '正答率', '合否', 'ランク'];

  for (var i = 1; i <= totalQ; i++) {
    header.push('Q' + i + 'トピック');
    header.push('Q' + i + '回答');
    header.push('Q' + i + '正答');
    header.push('Q' + i + '正誤');
  }

  sheet.appendRow(header);

  // ヘッダー書式
  var headerRange = sheet.getRange(1, 1, 1, header.length);
  headerRange.setBackground('#d4738f');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // 列幅調整
  sheet.setColumnWidth(1, 160); // 受験日時
  sheet.setColumnWidth(2, 100); // 氏名
  sheet.setColumnWidth(3, 70);  // スコア
  sheet.setColumnWidth(4, 70);  // 正答率
  sheet.setColumnWidth(5, 70);  // 合否
  sheet.setColumnWidth(6, 70);  // ランク

  // フィルター設定
  sheet.getRange(1, 1, 1, header.length).createFilter();

  // ヘッダー行を固定
  sheet.setFrozenRows(1);
}

// ============================================================
// データ行の組み立て
// ============================================================
function buildRow(data) {
  // タイムスタンプをJST変換
  var now = new Date(data.timestamp);
  var dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  var row = [
    dateStr,
    data.name,
    data.score + '/' + data.total,
    data.percentage + '%',
    data.passed ? '合格' : '不合格',
    data.rank
  ];

  // 各問のデータ
  data.answers.forEach(function(a) {
    row.push(a.topic);
    row.push(a.userAnswer);
    row.push(a.correctAnswer);
    row.push(a.isCorrect ? '◎' : '×');
  });

  return row;
}

// ============================================================
// 行の書式設定（合格=薄緑、不合格=薄ピンク）
// ============================================================
function formatRow(sheet, rowNum, passed) {
  var lastCol = sheet.getLastColumn();
  var range = sheet.getRange(rowNum, 1, 1, lastCol);

  if (passed) {
    range.setBackground('#e8f5e9'); // 薄い緑
  } else {
    range.setBackground('#fce4ec'); // 薄いピンク
  }

  // 合否列を太字に
  var passCell = sheet.getRange(rowNum, 5);
  passCell.setFontWeight('bold');
  if (passed) {
    passCell.setFontColor('#2e7d32');
  } else {
    passCell.setFontColor('#c62828');
  }

  // 各問の正誤列に色付け
  for (var i = 0; i < 12; i++) {
    var correctCol = 6 + (i * 4) + 4; // 正誤列の位置
    if (correctCol <= lastCol) {
      var cell = sheet.getRange(rowNum, correctCol);
      var val = cell.getValue();
      if (val === '◎') {
        cell.setFontColor('#2e7d32');
      } else if (val === '×') {
        cell.setFontColor('#c62828');
      }
    }
  }
}
