# GENIUS ASSESSMENT — AI FOR TEACHERS

Aplikasi asesmen digital statis untuk Projek IPAS SMK kelas X, materi **Zat dan Perubahannya**. Dibuat dengan HTML, CSS, JavaScript, Bootstrap 5, dan JSON; siap dipublikasikan melalui GitHub Pages.

## Isi folder
- `index.html` — halaman identitas, asesmen, dan hasil.
- `style.css` — tampilan responsif.
- `app.js` — alur asesmen, timer, pengacakan, penguncian jawaban, penilaian, dan ekspor CSV.
- `questions.json` — 40 soal pilihan ganda dan 5 soal esai.

## Menjalankan secara lokal
Karena browser biasanya membatasi `fetch()` terhadap file JSON jika HTML dibuka langsung lewat `file://`, jalankan dengan server lokal. Contoh:
1. Buka folder ini di VS Code.
2. Jalankan ekstensi Live Server pada `index.html`, atau jalankan `python -m http.server 8000` dari folder ini.
3. Buka `http://localhost:8000`.

## Publikasi ke GitHub Pages
1. Buat repository baru di GitHub, misalnya `genius-assessment`.
2. Unggah `index.html`, `style.css`, `app.js`, `questions.json`, dan `README.md` ke root repository.
3. Buka **Settings → Pages**.
4. Pada bagian **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/(root)`, lalu klik **Save**.
6. Tunggu proses publikasi selesai. GitHub akan menampilkan URL Pages di halaman tersebut.

## Catatan penting tentang penilaian
- Pilihan ganda: 1 poin untuk jawaban benar, 0 untuk salah atau tidak dijawab.
- Esai: sistem memberi skor sementara 0–4 per soal berdasarkan kata kunci, maksimum 20. Ini bukan pemahaman bahasa alami dan dapat melewatkan jawaban benar yang menggunakan istilah berbeda. Guru sebaiknya memeriksa jawaban esai sebelum menetapkan nilai resmi.
- Nilai akhir mengikuti formula: `(jumlah PG benar + skor esai/4) / 45 × 100`. Dengan demikian, setiap esai setara maksimum satu butir benar agar formula berbasis 45 butir tetap konsisten.
- Nilai dan identitas diproses di browser dan tidak dikirim ke server. Ekspor CSV disimpan ke perangkat pengguna. GitHub Pages tidak menyediakan database atau penyimpanan terpusat.
- Karena kunci jawaban berada di `questions.json` pada aplikasi statis, pengguna yang memahami alat pengembang browser dapat melihatnya. Untuk ujian berisiko tinggi, gunakan backend dengan autentikasi dan penilaian di server.
- Pengacakan soal dan opsi terjadi setiap sesi baru. Hubungan opsi dengan kunci dipertahankan melalui penanda jawaban benar, bukan mengandalkan huruf asli.
- Jika waktu habis, aplikasi menampilkan hasil dan memproses jawaban yang sudah tersimpan. Soal yang belum dijawab dihitung sebagai tidak benar/tidak dijawab.
- Bootstrap dan font eksternal dimuat dari CDN, sehingga membutuhkan koneksi internet saat aplikasi digunakan.

## Penyesuaian
Durasi diatur melalui `TOTAL_MINUTES` di `app.js`; bank soal dan kunci berada di `questions.json`; warna dan gaya di `style.css`.
