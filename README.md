# SQM COMMAND CENTER — Problem Management 2025

Dashboard statis untuk GitHub Pages dengan sumber data Google Sheets melalui Google Apps Script Web App. Tampilan dark navy-cyan, filter Date / Severity / Status / RCA, pencarian SQDT, perbandingan periode, KPI, grafik, tabel, dan ekspor CSV.

## File dalam paket

- `index.html` — struktur dashboard
- `style.css` — tema premium dark navy-cyan
- `app.js` — filter, grafik, KPI, tabel, JSONP loader
- `Code.gs` — Google Apps Script API JSON/JSONP
- `appsscript.json` — manifest Apps Script

## 1. Hubungkan Google Sheets

Kode `Code.gs` dikonfigurasi untuk spreadsheet ID yang sudah diberikan dan tab bernama `rawdata`. Pastikan nama tab dan header baris pertama benar.

Header yang dikenali oleh dashboard:
- SQDT
- DATE/TIME atau DATE (atau tanggal yang sesuai)
- SEVERITY / SQDT SEVERITY
- STATUS
- RCA
- MTTR
- MTTD 1 (terhadap Initial Posting) — metrik MTTD yang digunakan dashboard
- TRAFFIC LOSS (TB) TOTAL / TRAFFIC LOSS (TB)
- ACHIEVEMENT CESO

Jika header berbeda, tambahkan nama aktual pada `aliases` di `app.js`.

## 2. Deploy Apps Script

1. Buka spreadsheet, pilih Extensions → Apps Script.
2. Tempel isi `Code.gs` ke editor.
3. Jika diperlukan, aktifkan tampilnya file manifest `appsscript.json`, lalu salin isi manifest yang disertakan.
4. Jalankan `testSpreadsheetAccess()` dari editor dan izinkan akses yang diminta.
5. Pilih Deploy → New deployment → Web app.
6. Execute as: Me / User deploying.
7. Who has access: Anyone (opsi ini membuat data API bisa diakses publik; jangan gunakan jika data bersifat rahasia).
8. Deploy, selesaikan otorisasi, lalu salin URL yang berakhir dengan `/exec`.

## 3. Masukkan URL Web App

Buka `app.js` dan ganti:

`const GOOGLE_SHEETS_API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";`

dengan URL `/exec` hasil deployment, contoh format saja:

`https://script.google.com/macros/s/DEPLOYMENT_ID/exec`

Jangan gunakan URL editor Apps Script. Jika `Code.gs` diubah setelah deploy, buka Deploy → Manage deployments dan edit/update deployment ke versi baru.

## 4. Upload ke GitHub Pages

Upload `index.html`, `style.css`, dan `app.js` ke root repository GitHub Pages. File `Code.gs` dan `appsscript.json` dipasang di Apps Script, bukan dijalankan oleh browser. `README.md` untuk panduan.

Aktifkan GitHub Pages dari repository Settings → Pages, lalu buka URL Pages yang diberikan GitHub.

## Catatan penting

- Dashboard memakai JSONP (`?callback=...`) supaya tidak bergantung pada CORS untuk fetch lintas origin. Endpoint Apps Script harus mengembalikan JSONP sesuai `Code.gs`.
- API yang dipublikasikan dengan akses `Anyone` dapat membuat data spreadsheet terbaca oleh siapa pun yang mengetahui URL. Pastikan kebijakan organisasi mengizinkannya.
- Jumlah Total SQDT dihitung dari record dengan ID SQDT yang terisi, setelah deduplikasi berdasarkan SQDT.
- MTTR dan MTTD 1 ditampilkan sebagai rata-rata nilai numerik yang tersedia. Jika nilai durasi di sheet berupa format teks nonnumerik, sesuaikan parsing terlebih dahulu.
- Traffic Loss dijumlahkan dari nilai yang terbaca, dan diasumsikan satuannya TB.
- Achievement CESO dirata-ratakan dari nilai yang terbaca. Pastikan sumber menyimpan nilai dalam skala persen (mis. 95 untuk 95), bukan pecahan (mis. 0.95), atau ubah format sesuai sumber.
- Filter tanggal menggunakan kolom tanggal yang dipetakan dalam `aliases.date`. Pastikan kolom tersebut adalah tanggal yang ingin dijadikan dasar filter.
