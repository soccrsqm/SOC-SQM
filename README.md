# SQM COMMAND CENTER — Problem Management 2025

Dashboard statis untuk GitHub Pages dengan sumber data Google Sheets melalui Google Apps Script Web App.

## Fitur
- Filter tanggal current dan compare period (dua rentang tanggal terpisah)
- Filter Severity (P1/P2/P3/L1/L2), Status (Open/Closed), RCA
- Pencarian nomor SQDT
- KPI: total SQDT unik, Open, Closed, MTTR, **MTTD 1 (terhadap Initial Posting)**, Traffic Loss, Achievement CESO
- Grafik trend SQDT, severity, status, RCA, MTTR/MTTD 1, Traffic Loss
- Tabel data dan ekspor CSV
- Tidak menggunakan Region, Branch, atau Kabupaten sebagai filter/grafik

## 1. Siapkan Google Apps Script
Pada Google Sheet, pilih Extensions → Apps Script. Script perlu membaca tab data yang benar dan mengembalikan JSON. Contoh API sederhana:

```javascript
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('rawdata'); // sesuaikan nama tab
  if (!sheet) return json({error: 'Tab rawdata tidak ditemukan', data: []});
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(String);
  const data = values.filter(row => row.some(v => v !== '')).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] instanceof Date
      ? Utilities.formatDate(row[i], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : row[i]);
    return obj;
  });
  return json({data, total: data.length, updatedAt: new Date().toISOString()});
}
function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone (atau pilihan akses sesuai kebijakan organisasi). Salin URL `/exec`.

> Jika Apps Script saat ini menggunakan struktur respons atau parameter berbeda, pertahankan API yang sudah ada dan pastikan respons JSON memiliki `data` berupa array objek dengan header kolom sebagai key.

## 2. Masukkan URL API
Buka `app.js`, ganti:

```javascript
const GOOGLE_SHEETS_API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

dengan URL `/exec` hasil deployment.

## 3. Header data yang dibutuhkan
Dashboard memetakan header berikut (nama dapat bervariasi sedikit):
- `SQDT`
- `Date/Time`, `Date`, atau `SQDT` yang mengandung tanggal `SQDT-YYYYMMDD`
- `SEVERITY` atau `SQDT SEVERITY`
- `Status`
- `RCA`
- `MTTR`
- **`MTTD 1 (terhadap Initial Posting)`** — dipakai untuk KPI MTTD
- `TRAFFIC LOSS (TB) TOTAL` atau `TRAFFIC LOSS (TB)`
- `Achievement CESO`

Periksa nama header aktual pada sheet jika field tertentu tampil sebagai `—`. Pastikan nilai CESO berupa angka persentase yang konsisten (contoh 98.7 atau 0.987; dashboard menganggap nilai sumber sebagai persen, sehingga 98.7 akan tampil sebagai 98.7%).

## 4. Publikasikan di GitHub Pages
Upload `index.html`, `style.css`, `app.js`, dan `README.md` ke root repository. Aktifkan Settings → Pages → Deploy from a branch, pilih branch dan folder root. Buka URL GitHub Pages setelah deployment selesai.

## Catatan
- Angka KPI tidak ditanam di HTML; semua dihitung dari data yang berhasil dimuat.
- Total SQDT dihitung sebagai ID SQDT unik.
- Data contoh di mockup visual sebelumnya bukan data live.
- Untuk organisasi, jangan membuat Apps Script dapat diakses publik bila datanya rahasia; pilih kontrol akses yang sesuai.
