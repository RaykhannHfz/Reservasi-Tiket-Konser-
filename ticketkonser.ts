import * as readline from "readline";

// =====================================================================
// BAGIAN 1: TIPE DATA DAN KONSTANTA
// =====================================================================

// Tipe khusus: kategori tiket hanya boleh salah satu dari tiga nilai ini
type Kategori = "VIP" | "Festival" | "Tribun";

// Bentuk (struktur) data untuk satu reservasi, berisi 8 properti
interface Reservasi {
  id: string; // ID unik, contoh: RSV-001
  namaPemesan: string; // nama pembeli tiket
  namaKonser: string; // nama konser yang dipesan
  kategoriTiket: Kategori; // VIP, Festival, atau Tribun
  jumlahTiket: number; // jumlah tiket yang dibeli
  hargaSatuan: number; // harga per tiket sesuai kategori
  totalBayar: number; // hasil hitung setelah diskon
  sudahDibayar: boolean; // true = lunas, false = belum
}

// Nilai tetap (tidak berubah selama program berjalan) memakai const
const HARGA_VIP: number = 750000; // harga satu tiket VIP (Rp)
const HARGA_FESTIVAL: number = 400000; // harga satu tiket Festival (Rp)
const HARGA_TRIBUN: number = 250000; // harga satu tiket Tribun (Rp)
const BATAS_DISKON_ROMBONGAN: number = 5; // minimal tiket untuk dapat diskon
const PERSEN_DISKON: number = 10; // besar diskon rombongan dalam persen

// =====================================================================
// BAGIAN 2: PENYIMPANAN DATA DI MEMORI
// =====================================================================

// Array utama tempat semua reservasi disimpan
const daftarReservasi: Reservasi[] = [];

// Nomor urut untuk membuat ID baru; berubah-ubah sehingga memakai let
let nomorBerikutnya: number = 1;

// =====================================================================
// BAGIAN 3: PEMBACA INPUT DARI TERMINAL
// =====================================================================

// Antrean baris ketikan yang sudah masuk tetapi belum diminta program
const antreanInput: string[] = [];
// Penyimpan "janji" yang menunggu ketikan berikutnya dari pengguna
let penungguInput: ((teks: string) => void) | null = null;
// Penanda bahwa input sudah ditutup (misalnya pengguna menekan Ctrl+D)
let inputSelesai: boolean = false;

// Membuat pembaca baris dari keyboard
const pembaca = readline.createInterface({ input: process.stdin });

// Setiap kali pengguna menekan Enter, baris itu diterima di sini
pembaca.on("line", (baris: string): void => {
  if (penungguInput !== null) {
    // Ada pertanyaan yang sedang menunggu: langsung berikan jawabannya
    const kirim = penungguInput;
    penungguInput = null;
    kirim(baris);
  } else {
    // Belum ada yang menunggu: simpan dulu di antrean
    antreanInput.push(baris);
  }
});

// Jika input ditutup saat program masih menunggu jawaban, hentikan program
pembaca.on("close", (): void => {
  inputSelesai = true;
  if (penungguInput !== null) {
    console.log("\nInput ditutup. Program dihentikan.");
    process.exit(0);
  }
});

/**
 * Menampilkan pertanyaan lalu menunggu pengguna mengetik jawaban.
 * @param pertanyaan teks yang ditampilkan ke pengguna
 * @returns jawaban pengguna (satu baris teks)
 */
function tanya(pertanyaan: string): Promise<string> {
  // Tampilkan pertanyaan tanpa pindah baris
  process.stdout.write(pertanyaan);
  return new Promise<string>((selesai: (teks: string) => void): void => {
    if (antreanInput.length > 0) {
      // Ada jawaban yang sudah tersimpan di antrean: ambil yang paling awal
      selesai(antreanInput.shift() as string);
    } else if (inputSelesai) {
      // Tidak ada jawaban lagi dan input sudah ditutup: hentikan program
      console.log("\nInput ditutup. Program dihentikan.");
      process.exit(0);
    } else {
      // Belum ada jawaban: tunggu sampai pengguna menekan Enter
      penungguInput = selesai;
    }
  });
}

// =====================================================================
// BAGIAN 4: FUNGSI BANTU (TAMPILAN, HITUNG, VALIDASI INPUT)
// =====================================================================

/** Mencetak garis pemisah agar tampilan terminal lebih rapi. */
function tampilkanGaris(): void {
  console.log("=".repeat(80));
}

/**
 * Mengubah angka menjadi tulisan rupiah dengan titik pemisah ribuan.
 * Contoh: 1500000 menjadi "Rp 1.500.000".
 */
function formatRupiah(angka: number): string {
  // Jika angka nol, langsung kembalikan tulisan khusus
  if (angka === 0) {
    return "Rp 0";
  }
  let sisa: number = Math.abs(angka); // angka yang belum diproses
  let hasil: string = ""; // tulisan hasil, disusun dari belakang
  // Ulangi selama masih ada angka yang tersisa
  while (sisa > 0) {
    const tigaDigit: number = sisa % 1000; // ambil 3 digit terakhir (modulus)
    sisa = Math.floor(sisa / 1000); // buang 3 digit terakhir (pembagian)
    if (sisa > 0) {
      // Masih ada digit di depan: beri titik dan lengkapi dengan nol di depan
      hasil = "." + String(tigaDigit).padStart(3, "0") + hasil;
    } else {
      // Ini kelompok paling depan: tidak perlu nol tambahan
      hasil = String(tigaDigit) + hasil;
    }
  }
  return "Rp " + hasil;
}

/**
 * Menentukan harga satu tiket berdasarkan kategorinya.
 * @param kategori VIP, Festival, atau Tribun
 * @returns harga satuan dalam rupiah
 */
function hargaPerKategori(kategori: Kategori): number {
  let harga: number; // tempat menyimpan harga hasil pilihan
  switch (kategori) {
    case "VIP":
      harga = HARGA_VIP;
      break;
    case "Festival":
      harga = HARGA_FESTIVAL;
      break;
    case "Tribun":
      harga = HARGA_TRIBUN;
      break;
    default:
      harga = 0; // jaga-jaga jika ada kategori tak dikenal
      break;
  }
  return harga;
}

/**
 * Menghitung total bayar = harga x jumlah, lalu dikurangi diskon rombongan.
 * @param harga harga satuan satu tiket
 * @param jumlah banyaknya tiket yang dibeli
 * @returns total yang harus dibayar
 */
function hitungTotalBayar(harga: number, jumlah: number): number {
  let total: number = harga * jumlah; // total sebelum diskon
  // Diskon hanya berlaku jika jumlah tiket mencapai batas rombongan
  if (jumlah >= BATAS_DISKON_ROMBONGAN) {
    let potongan: number = total; // mulai dari total sebelum diskon
    potongan *= PERSEN_DISKON; // dikali besar persen
    potongan /= 100; // dibagi 100 menjadi nilai potongan
    total -= potongan; // total dikurangi potongan
  }
  return total;
}

/**
 * Menjumlahkan total bayar seluruh reservasi yang sudah lunas.
 * @param data kumpulan reservasi yang akan dijumlahkan
 * @returns total pendapatan dari reservasi lunas
 */
function hitungPendapatanLunas(data: Reservasi[]): number {
  let jumlahUang: number = 0; // penampung hasil penjumlahan
  // Periksa satu per satu setiap reservasi dalam data
  for (const r of data) {
    if (r.sudahDibayar) {
      jumlahUang += r.totalBayar; // tambahkan jika sudah lunas
    }
  }
  return jumlahUang;
}

/**
 * Membuat ID unik berurutan, contoh RSV-001, RSV-002, dan seterusnya.
 * @returns ID baru yang belum dipakai reservasi lain
 */
function buatIdUnik(): string {
  let id: string; // ID calon
  // Buat ID, naikkan nomor, ulangi bila ternyata ID sudah dipakai
  do {
    id = "RSV-" + String(nomorBerikutnya).padStart(3, "0");
    nomorBerikutnya++;
  } while (cariIndeksById(id) !== -1);
  return id;
}

/**
 * Mencari posisi (index) reservasi di array berdasarkan ID.
 * @param id ID yang dicari (huruf besar atau kecil sama saja)
 * @returns posisi di array, atau -1 jika tidak ditemukan
 */
function cariIndeksById(id: string): number {
  const idBersih: string = id.trim().toUpperCase(); // samakan huruf besar
  return daftarReservasi.findIndex((r: Reservasi): boolean => r.id === idBersih);
}

/**
 * Meminta teks yang tidak boleh kosong; mengulang sampai pengguna mengisi.
 * @param label pertanyaan yang ditampilkan
 */
async function inputTeks(label: string): Promise<string> {
  while (true) {
    const jawaban: string = (await tanya(label)).trim(); // hapus spasi tepi
    if (jawaban === "") {
      console.log("[!] Input tidak boleh kosong. Silakan ulangi.");
    } else {
      return jawaban; // jawaban valid, keluar dari perulangan
    }
  }
}

/**
 * Meminta bilangan bulat dengan batas minimal; mengulang sampai valid.
 * @param label pertanyaan yang ditampilkan
 * @param minimal nilai terkecil yang diperbolehkan
 */
async function inputAngkaMinimal(label: string, minimal: number): Promise<number> {
  while (true) {
    const teks: string = (await tanya(label)).trim();
    const angka: number = Number(teks); // ubah teks menjadi angka
    // Tidak valid jika kosong, bukan angka, bukan bulat, atau di bawah minimal
    if (teks === "" || Number.isNaN(angka) || !Number.isInteger(angka) || angka < minimal) {
      console.log("[!] Masukkan bilangan bulat minimal " + minimal + ".");
    } else {
      return angka;
    }
  }
}

/**
 * Meminta jawaban Y atau N (huruf besar/kecil sama saja).
 * @param label pertanyaan yang ditampilkan
 * @returns true jika Y, false jika N
 */
async function inputYaTidak(label: string): Promise<boolean> {
  while (true) {
    const jawaban: string = (await tanya(label)).trim().toUpperCase();
    if (jawaban === "Y") {
      return true;
    }
    if (jawaban === "N") {
      return false;
    }
    console.log("[!] Jawab dengan Y atau N.");
  }
}

/**
 
 * @returns  kategori yang dipilih pengguna
 */
async function pilihKategori(): Promise<Kategori> {
  console.log("Kategori tiket: 1. VIP  2. Festival  3. Tribun");
  let hasil: Kategori | null = null; // belum ada pilihan
  // Ulangi sampai pengguna memilih nomor yang benar
  while (hasil === null) {
    const pilihan: string = (await tanya("Pilih kategori [1-3]: ")).trim();
    switch (pilihan) {
      case "1":
        hasil = "VIP";
        break;
      case "2":
        hasil = "Festival";
        break;
      case "3":
        hasil = "Tribun";
        break;
      default:
        console.log("[!] Pilihan kategori harus 1, 2, atau 3.");
        break;
    }
  }
  return hasil;
}
