# SQDT Problem Management Dashboard

Dashboard statis untuk GitHub Pages dengan sumber data Google Sheets melalui Google Apps Script Web App.

## Isi paket
- `index.html` — struktur dashboard
- `styles.css` — tampilan dark monitoring responsif
- `app.js` — pengambilan data API, filter, KPI, grafik, tabel, auto-refresh, dan ekspor CSV

## Cara upload ke GitHub
1. Download dan ekstrak ZIP ini.
2. Buka repository GitHub dashboard SQDT.
3. Upload **semua isi folder** (index.html, styles.css, app.js, README.md) ke root repository, bukan folder ZIP-nya.
4. Jika GitHub menanyakan replace file, pilih commit perubahan.
5. Pastikan GitHub Pages aktif dari Settings → Pages dan sumbernya branch utama / root.
6. Buka URL GitHub Pages dan tekan `Refresh Data`.

## Koneksi Google Sheets
`app.js` sudah diisi URL Apps Script Web App yang sebelumnya digunakan pada proyek SQDT. Jika URL deployment berubah, ganti nilai `API_URL` di baris paling atas `app.js`.

Apps Script harus:
- membaca tab bernama persis `rawdata`;
- mengembalikan JSON, idealnya `{ "success": true, "headers": [...], "data": [...], "total": 123, "updatedAt": "..." }`;
- deployment Web App dapat diakses oleh pengguna dashboard (misalnya akses Anyone, sesuai kebijakan organisasi).

## Nama kolom
Dashboard mengenali beberapa variasi header untuk SQDT/Service Incident Case, Severity, Status, Branch/Node, Kabupaten, Region, Circle, RCA, MTTR, MTTD, Traffic Loss, Achievement CESO, SLA, serta Incident Date/Time Open.

Jika kolom tanggal tidak cocok, grafik trend dan filter tanggal tidak dapat mengelompokkan data berdasarkan tanggal. Jika kolom SLA atau CESO tidak tersedia, KPI akan menampilkan `N/A` dan bukan membuat angka perkiraan.

## Catatan
- Refresh otomatis setiap 15 menit.
- Tombol Download CSV mengekspor seluruh baris hasil filter yang sedang aktif.
- Tabel menampilkan maksimum 1.500 baris agar browser tetap responsif; ekspor CSV tetap mencakup seluruh baris hasil filter.
- Chart.js dimuat dari CDN, sehingga koneksi internet diperlukan.
- Jika API mengembalikan `success:false`, cek URL deployment, izin akses, ID spreadsheet, dan nama tab `rawdata`.
