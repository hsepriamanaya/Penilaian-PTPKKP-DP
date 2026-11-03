/* Profil relevansi item per tipe vendor (usulan awal, dapat diubah per sel di menu Penilaian).
   Item N/A pada profil dikeluarkan dari penilaian entitas bertipe itu. Item khusus IUP sudah otomatis tidak berlaku bagi mitra. */
const PROFIL = {
 "Produksi": {
  "info": "Kontraktor/vendor yang bekerja di proses produksi penambangan (punya pekerja dan alat sendiri, bukan penyusun desain/RKAB tambang).",
  "na": [
   [
    "2.2.3",
    "RKAB milik pemegang IUP; kontraktor/vendor tidak menyusun RKAB."
   ],
   [
    "2.2.4",
    "RKAB milik pemegang IUP; kontraktor/vendor tidak menyusun RKAB."
   ],
   [
    "4.4.1",
    "Desain dan perancangan tambang dibuat pemegang IUP/kontraktor utama."
   ],
   [
    "4.4.5",
    "Desain dan perancangan tambang dibuat pemegang IUP/kontraktor utama."
   ]
  ]
 },
 "Labor Supply": {
  "info": "Vendor penyedia tenaga kerja; pekerja bekerja di bawah pengawasan dan prosedur pemberi kerja.",
  "na": [
   [
    "2.2.3",
    "RKAB milik pemegang IUP; kontraktor/vendor tidak menyusun RKAB."
   ],
   [
    "2.2.4",
    "RKAB milik pemegang IUP; kontraktor/vendor tidak menyusun RKAB."
   ],
   [
    "2.3.3",
    "Undangan/arahan Instansi Pembina Sektor ditujukan ke pemegang izin (IUP/IUJP); labor supply bukan pemegang izin."
   ],
   [
    "2.3.4",
    "Undangan/arahan Instansi Pembina Sektor ditujukan ke pemegang izin (IUP/IUJP); labor supply bukan pemegang izin."
   ],
   [
    "2.6.16",
    "Pemangku kepentingan eksternal (masyarakat, instansi) dikelola pemegang IUP."
   ],
   [
    "2.6.17",
    "Pemangku kepentingan eksternal (masyarakat, instansi) dikelola pemegang IUP."
   ],
   [
    "2.7.8",
    "Penetapan area/aktivitas kritis dan distribusi pengawasan: kewenangan operator area, bukan labor supply."
   ],
   [
    "2.7.9",
    "Penetapan area/aktivitas kritis dan distribusi pengawasan: kewenangan operator area, bukan labor supply."
   ],
   [
    "4.4.1",
    "Desain dan perancangan tambang dibuat pemegang IUP/kontraktor utama."
   ],
   [
    "4.4.2",
    "Metode kerja: kontraktor produksi sering menyusun metode kerja detail. Periksa."
   ],
   [
    "4.4.4",
    "Perangkat lunak penunjang operasi (fleet management, dll.): periksa penggunaannya."
   ],
   [
    "4.4.5",
    "Desain dan perancangan tambang dibuat pemegang IUP/kontraktor utama."
   ],
   [
    "4.5.3",
    "Manajemen rantai pasokan: tidak relevan bagi vendor tenaga kerja."
   ],
   [
    "4.5.4",
    "SPIP/commissioning/pemeliharaan: labor supply tidak memiliki sarana tambang."
   ],
   [
    "4.5.5",
    "SPIP/commissioning/pemeliharaan: labor supply tidak memiliki sarana tambang."
   ],
   [
    "4.5.6",
    "SPIP/commissioning/pemeliharaan: labor supply tidak memiliki sarana tambang."
   ],
   [
    "4.7.4",
    "Kajian teknis pertambangan: tanggung jawab teknis IUP/kontraktor utama."
   ],
   [
    "4.9.1",
    "Mengelola perusahaan jasa pertambangan: berlaku bila vendor punya sub-kontraktor."
   ],
   [
    "4.9.2",
    "Mengelola perusahaan jasa pertambangan: berlaku bila vendor punya sub-kontraktor."
   ],
   [
    "4.9.3",
    "Mengelola perusahaan jasa pertambangan: berlaku bila vendor punya sub-kontraktor."
   ]
  ]
 }
};
