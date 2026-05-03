/* ============================================================
   1. VARIABEL GLOBAL & INISIALISASI
   ============================================================ */
let isPremium = false;
let database = JSON.parse(localStorage.getItem('database_karet_final')) || [];
let dbKeuangan = JSON.parse(localStorage.getItem('gun_db_keuangan')) || {
    saldo: 0,
    pos: [
        { nama: "Modal Kerja", persen: 60, warna: "#3b82f6" },
        { nama: "Profit Bersih", persen: 30, warna: "#10b981" },
        { nama: "Dana Darurat", persen: 10, warna: "#f59e0b" }
    ],
    riwayat: []
};

if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(granted => {
        if (granted) console.log("Penyimpanan dijamin aman oleh sistem.");
    });
}

let currentCalcId = null;
let idHapusNotaSementara = null;
let indexHapusKeuanganSementara = null;
let idSedangDiedit = null;

// Cek lisensi
if (localStorage.getItem('gun_project_license') === 'AKTIF') {
    isPremium = true;
}

// Generate Device ID
function getDeviceId() {
    let id = localStorage.getItem('gun_device_id');
    if (!id) {
        id = Math.floor(Math.random() * 9000 + 1000).toString();
        localStorage.setItem('gun_device_id', id);
    }
    return id;
}
const userDeviceId = getDeviceId();

// Render pertama kali
tampilkanData(database);
updateStatistik();

/* ============================================================
   2. FUNGSI TOAST & UTILITAS
   ============================================================ */
function showToast(pesan) {
    const x = document.getElementById("toast");
    x.innerText = pesan;
    x.className = "show";
    setTimeout(() => { x.className = ""; }, 2500);
}

function formatDate(dateStr) {
    return dateStr.replace('Januari', 'Jan').replace('Februari', 'Feb').replace('Maret', 'Mar')
                  .replace('April', 'Apr').replace('Agustus', 'Agu').replace('September', 'Sep')
                  .replace('Oktober', 'Okt').replace('November', 'Nov').replace('Desember', 'Des');
}

/* ============================================================
   3. FUNGSI NAVIGASI (IMPLEMENTASI BARU)
   ============================================================ */
function navigasi(el, target) {
    // 1. JALANKAN ANIMASI DULU (Penting agar ikon naik ke atas)
    tutupSemuaModal();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');

    // 2. CEK PROTEKSI PREMIUM (Dijalankan setelah jeda animasi agar terlihat mulus)
    if ((target === 'catatan' || target === 'pengaturan') && !isPremium) {
        setTimeout(() => {
            proteksiPremium(target === 'catatan' ? 'Manajemen Keuangan' : 'Pengaturan Sistem');
            
            // Opsional: Balikkan ke home jika tidak ingin user terjebak di halaman kosong
            // navigasi(document.querySelectorAll('.nav-item')[0], 'home'); 
        }, 300); // Jeda 300ms agar animasi 'naik' selesai dulu
        return; 
    }

    // 3. LOGIKA RENDER HALAMAN (Hanya jalan jika Premium atau menu gratis)
    const headTitle = document.getElementById('main-header-title');
    const headSub = document.getElementById('main-header-subtitle');
    const listArea = document.getElementById('view-list');
    
    listArea.innerHTML = ''; 
    document.getElementById('view-stats').classList.add('hidden');
    document.getElementById('view-form').classList.add('hidden');

    const footerKeren = `
        <div style="text-align: center; margin-top: 50px; padding-bottom: 50px;">
            <div style="width: 50px; height: 2px; background: var(--border-light); margin: 0 auto 20px; border-radius: 2px; opacity: 0.5;"></div>
            <div style="display: inline-flex; align-items: center; gap: 8px; background: var(--bg-card); padding: 6px 16px; border-radius: 50px; border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
                <div style="width: 18px; height: 18px; background: var(--primary); border-radius: 5px; display: flex; align-items: center; justify-content: center; transform: rotate(-10deg);">
                    <span style="color: white; font-size: 10px; font-weight: 900;">G</span>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: var(--text-main); letter-spacing: 0.5px;">GUN ORIGINAL PROJECT</span>
                <span style="font-size: 8px; font-weight: 900; color: var(--primary); background: rgba(5, 150, 105, 0.1); padding: 2px 6px; border-radius: 6px;">V1.2</span>
            </div>
            <p style="font-size: 9px; color: var(--text-muted); margin-top: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Digital Solution Provider</p>
        </div>
    `;

    if(target === 'home'){
        headTitle.innerText = "Nota Timbangan";
        headSub.innerText = "Beranda Utama • Monitoring Data";
        listArea.innerHTML = `
            <div class="search-box"><span class="search-icon">🔍</span><input type="text" id="input-cari" onkeyup="cariNota()" placeholder="Cari nama atau tanggal..."></div>
            <div id="daftar-nota"></div>
            ${footerKeren}
        `;
        document.getElementById('view-stats').classList.remove('hidden');
        tampilkanData(database); 
    } 
    else if (target === 'orang') {
        headTitle.innerText = "Buat Nota";
        headSub.innerText = "Transaksi Baru • Input Berat";
        listArea.innerHTML = `<div id="daftar-nota"></div>${footerKeren}`;
        document.getElementById('view-form').classList.remove('hidden');
        tampilkanData(database); 
    } 
    else if (target === 'catatan') {
        headTitle.innerText = "Keuangan";
        headSub.innerText = "Arus Kas • Strategi Alokasi";
        renderKeuanganHalaman();
    } 
    else if (target === 'panduan') {
        headTitle.innerText = "Bantuan";
        headSub.innerText = "Panduan • Pusat Informasi";
        renderPanduanHalamanFull();
    } 
    else if (target === 'pengaturan') {
        headTitle.innerText = "Pengaturan";
        headSub.innerText = "Opsi Sistem • Personalisasi";
        renderPengaturanHalaman();
    }
    window.scrollTo(0,0);
}

function renderKeuanganHalaman() {
    const wadahUtama = document.getElementById('view-list');
    
    // Sembunyikan Statistik & Form Nota
    document.getElementById('view-stats').classList.add('hidden');
    document.getElementById('view-form').classList.add('hidden');

    // Logic Riwayat
    let riwayatHtml = '';
    const listRiwayat = [...dbKeuangan.riwayat].reverse().slice(0, 10);
    
    if (listRiwayat.length === 0) {
        riwayatHtml = `<div style="text-align: center; padding: 30px; opacity: 0.5;"><p style="font-size: 13px; color: var(--text-muted);">Belum ada riwayat transaksi</p></div>`;
    } else {
        listRiwayat.forEach((r, idx) => {
            const originalIndex = dbKeuangan.riwayat.length - 1 - idx;
            const isMasuk = r.tipe === 'masuk';
            riwayatHtml += `
                <div style="background: var(--bg-main); padding: 15px; border-radius: 20px; border: 1px solid var(--border-color); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="width: 35px; height: 35px; border-radius: 10px; background: ${isMasuk ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; display: flex; align-items: center; justify-content: center; color: ${isMasuk ? '#059669' : '#ef4444'}; font-weight: bold;">
                            ${isMasuk ? '↓' : '↑'}
                        </div>
                        <div>
                            <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">${r.ket}</div>
                            <div style="font-size: 9px; color: var(--text-muted); font-weight: 700;">${r.waktu}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 14px; font-weight: 900; color: ${isMasuk ? '#059669' : '#ef4444'};">
                            ${isMasuk ? '+' : '-'} ${r.jumlah.toLocaleString('id-ID')}
                        </div>
                        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 5px;">
                            <button onclick="bukaEditKeuangan(${originalIndex})" style="border:none; background:transparent; color:var(--text-muted); cursor:pointer; padding:2px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button onclick="konfirmasiHapusKeuangan(${originalIndex})" style="border:none; background:transparent; color:#ef4444; cursor:pointer; padding:2px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                </div>`;
        });
    }

    let posHtml = '';
    dbKeuangan.pos.forEach(p => {
        const nominal = (p.persen / 100) * dbKeuangan.saldo;
        posHtml += `<div style="background: var(--bg-main); padding: 15px; border-radius: 18px; border: 1px solid var(--border-color);"><div style="font-size: 9px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">${p.nama}</div><div style="font-size: 13px; font-weight: 900; color: var(--text-main); margin-top: 2px;">Rp ${Math.round(nominal).toLocaleString('id-ID')}</div></div>`;
    });

    wadahUtama.innerHTML = `
        <div style="padding: 10px 10px 120px;">
            <div style="height: 20px;"></div>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 65px; height: 65px; background: #ecfdf5; border-radius: 22px; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; box-shadow: 0 10px 20px rgba(5, 150, 105, 0.1);">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                </div>
                <h3 style="font-size: 1.5rem; font-weight: 900; color: var(--text-main); margin-bottom: 5px;">Catatan Keuangan</h3>
                <p style="font-size: 13px; color: var(--text-muted); font-weight: 600;">Manajemen Kas & Alokasi Dana</p>
            </div>

            <div style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); padding: 30px; border-radius: 30px; color: white; margin-bottom: 20px; box-shadow: 0 15px 30px rgba(5, 150, 105, 0.25); position: relative; overflow: hidden;">
                <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                <p style="font-size: 11px; font-weight: 800; opacity: 0.8; letter-spacing: 1px; margin-bottom: 5px;">SALDO AKTIF SAAT INI</p>
                <div style="font-size: 2.2rem; font-weight: 900;">Rp ${dbKeuangan.saldo.toLocaleString('id-ID')}</div>
            </div>

            <div style="display: flex; gap: 15px; margin-bottom: 25px;">
                <button onclick="bukaInputKeuangan('masuk')" style="flex: 1; background: var(--bg-card); border: 1px solid var(--border-color); padding: 18px; border-radius: 20px; color: #059669; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 10px var(--shadow-custom); cursor: pointer;">
                    <span style="font-size: 18px; font-weight:bold;">+</span> MASUK
                </button>
                <button onclick="bukaInputKeuangan('keluar')" style="flex: 1; background: var(--bg-card); border: 1px solid var(--border-color); padding: 18px; border-radius: 20px; color: #ef4444; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 10px var(--shadow-custom); cursor: pointer;">
                    <span style="font-size: 18px; font-weight:bold;">-</span> KELUAR
                </button>
            </div>

            <div style="background: var(--bg-card); padding: 25px; border-radius: 30px; border: 1px solid var(--border-color); margin-bottom: 25px; box-shadow: 0 4px 15px var(--shadow-custom);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 class="label-small" style="color: var(--primary); margin: 0;">Alokasi Dana Terbagi</h4>
                    <button onclick="renderPengaturanHalaman()" style="border:none; background:rgba(5, 150, 105, 0.1); width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor:pointer;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05L5.636 5.636"></path></svg>
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    ${posHtml}
                </div>
            </div>

            <div style="background: var(--bg-card); padding: 25px; border-radius: 30px; border: 1px solid var(--border-color); box-shadow: 0 4px 15px var(--shadow-custom);">
                <h4 class="label-small" style="margin-bottom: 15px; color: var(--primary);">Aktivitas Terakhir</h4>
                ${riwayatHtml}
            </div>
        </div>
        
         <div style="text-align: center; margin-top: 50px; padding-bottom: 20px;">
    <div style="width: 50px; height: 2px; background: var(--border-light); margin: 0 auto 20px; border-radius: 2px; opacity: 0.5;"></div>
    
    <div style="display: inline-flex; align-items: center; gap: 8px; background: var(--bg-card); padding: 6px 16px; border-radius: 50px; border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
        <div style="width: 18px; height: 18px; background: var(--primary); border-radius: 5px; display: flex; align-items: center; justify-content: center; transform: rotate(-10deg);">
            <span style="color: white; font-size: 10px; font-weight: 900;">G</span>
        </div>
        
        <span style="font-size: 10px; font-weight: 800; color: var(--text-main); letter-spacing: 0.5px;">
            GUN ORIGINAL PROJECT
        </span>
        
        <span style="font-size: 8px; font-weight: 900; color: var(--primary); background: rgba(5, 150, 105, 0.1); padding: 2px 6px; border-radius: 6px;">
            V1.2
        </span>
    </div>
    
    <p style="font-size: 9px; color: var(--text-muted); margin-top: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
        Digital Solution for You
    </p>
</div>
</div>
    `;
}

// Fungsi pembantu untuk membersihkan layar dari modal/overlay
function tutupSemuaModal() {
    // Tutup Modal Overlay (Kalkulator, Keuangan, Pengaturan, dll)
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Tutup Halaman Panduan
    const panduan = document.getElementById('halamanPanduan');
    if(panduan) panduan.style.display = 'none';
    
    // Tutup Modal Struk jika ada
    const struk = document.getElementById('modal-struk');
    if(struk) struk.classList.remove('active');
}

function backupData() {
    const data = {
        nota: database,
        keuangan: dbKeuangan
    };
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_gun_project_${new Date().toLocaleDateString()}.json`;
    a.click();
    showToast("File Backup Berhasil Diunduh! 📥");
}

let tempImportedData = null; // Penampung data sementara

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            tempImportedData = JSON.parse(e.target.result);
            
            // Isi data ke dalam preview modal
            document.getElementById('preview-nota-count').innerText = tempImportedData.nota ? tempImportedData.nota.length : 0;
            document.getElementById('preview-saldo-val').innerText = tempImportedData.keuangan ? "Rp " + tempImportedData.keuangan.saldo.toLocaleString('id-ID') : "Rp 0";
            document.getElementById('preview-date').innerText = file.lastModifiedDate ? file.lastModifiedDate.toLocaleDateString() : 'Tidak diketahui';

            // Tampilkan modal konfirmasi
            document.getElementById('modal-restore-confirm').classList.add('active');
        } catch (err) {
            showToast("❌ File JSON tidak valid!");
        }
    };
    reader.readAsText(file);
    // Reset input agar bisa pilih file yang sama lagi jika batal
    event.target.value = '';
}

function tutupModalRestore() {
    document.getElementById('modal-restore-confirm').classList.remove('active');
    tempImportedData = null;
}

// Fungsi eksekusi final
document.getElementById('btn-final-restore').onclick = function() {
    if (tempImportedData) {
        if (tempImportedData.nota) localStorage.setItem('database_karet_final', JSON.stringify(tempImportedData.nota));
        if (tempImportedData.keuangan) localStorage.setItem('gun_db_keuangan', JSON.stringify(tempImportedData.keuangan));
        
        showToast("Data Berhasil Dipulihkan! ✨");
        setTimeout(() => location.reload(), 1500);
    }
};

function renderListPosSetting() {
    const container = document.getElementById('list-pengaturan-pos');
    if (!container) return; // Guard clause agar tidak error jika elemen belum ada
    container.innerHTML = '';
    
    dbKeuangan.pos.forEach((p, idx) => {
        container.innerHTML += `
            <div style="background: var(--bg-slate); padding: 15px; border-radius: 20px; border: 1px solid var(--border-light); margin-bottom: 12px;">
                <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 15px;">
                    <input type="color" value="${p.warna}" onchange="dbKeuangan.pos[${idx}].warna = this.value" style="width: 35px; height: 35px; border: 3px solid white; border-radius: 10px; background: none; cursor: pointer; padding: 0;">
                    <input type="text" value="${p.nama}" onchange="dbKeuangan.pos[${idx}].nama = this.value" style="flex:1; border: none; background: transparent; font-weight: 800; font-size: 14px; color: var(--text-main);" placeholder="Nama Pos...">
                    <button onclick="hapusPos(${idx})" style="background: #fee2e2; border: none; color: #ef4444; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; font-weight: 900;">✕</button>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <input type="range" min="0" max="100" step="5" value="${p.persen}" style="flex: 1; accent-color: var(--primary);" oninput="updatePersenPos(${idx}, this.value)">
                    <div style="width: 60px; font-weight: 900; text-align: right; color: var(--primary); font-size: 16px;">${p.persen}%</div>
                </div>
            </div>
        `;
    });
    hitungTotalPersenSetting();
}

function updatePersenPos(idx, val) {
    dbKeuangan.pos[idx].persen = parseInt(val);
    renderListPosSetting();
}

function hitungTotalPersenSetting() {
    let total = 0;
    dbKeuangan.pos.forEach(p => total += p.persen);
    
    const textEl = document.getElementById('total-persen-text');
    const btn = document.getElementById('btn-save-setting-pos');
    
    if(textEl) textEl.innerText = total + '%';
    
    if(btn) {
        if(total === 100) {
            if(textEl) textEl.style.color = "#10b981";
            btn.disabled = false;
            btn.style.opacity = "1";
        } else {
            if(textEl) textEl.style.color = "#ef4444";
            btn.disabled = true;
            btn.style.opacity = "0.5";
        }
    }
}

function tambahPosBaru() {
    const warnaRandom = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    dbKeuangan.pos.push({
        nama: "Pos Baru",
        persen: 0,
        warna: warnaRandom[Math.floor(Math.random() * warnaRandom.length)]
    });
    renderListPosSetting();
}

function hapusPos(idx) {
    if(dbKeuangan.pos.length <= 1) {
        showToast("⚠️ Minimal harus ada 1 pos!");
        return;
    }
    dbKeuangan.pos.splice(idx, 1);
    renderListPosSetting();
}

function hitungTotalPersenSetting() {
    let total = 0;
    dbKeuangan.pos.forEach(p => total += p.persen);
    
    const textEl = document.getElementById('total-persen-text');
    const btn = document.getElementById('btn-save-setting-pos');
    
    textEl.innerText = total + '%';
    
    if(total === 100) {
        textEl.style.color = "#10b981";
        btn.disabled = false;
        btn.style.opacity = "1";
    } else {
        textEl.style.color = "#ef4444";
        btn.disabled = true;
        btn.style.opacity = "0.5";
    }
}

function renderPengaturanHalaman() {
    const wadahUtama = document.getElementById('view-list');
    
    // Sembunyikan elemen beranda agar layar bersih
    document.getElementById('view-stats').classList.add('hidden');
    document.getElementById('view-form').classList.add('hidden');
    
    const userProfile = JSON.parse(localStorage.getItem('gun_user_profile')) || { nama: 'Gunawan Gunawan', email: 'gunawan@mail.com' };
    const savedPhoto = localStorage.getItem('gun_user_photo');
    const currentTheme = localStorage.getItem('gun_theme') || 'light';
    const isDarkChecked = currentTheme === 'dark' ? 'checked' : '';
    const inisial = userProfile.nama ? userProfile.nama.charAt(0).toUpperCase() : 'G';
    
    wadahUtama.innerHTML = `
        <div style="padding: 10px 10px 120px;"> 
            <div style="height: 20px;"></div>

            <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 65px; height: 65px; background: #ecfdf5; border-radius: 22px; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; box-shadow: 0 10px 20px rgba(5, 150, 105, 0.1);">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </div>
                <h3 style="font-size: 1.5rem; font-weight: 900; color: var(--text-main); margin-bottom: 5px;">Pengaturan</h3>
                <p style="font-size: 13px; color: var(--text-muted); font-weight: 600;">Kelola Profil & Sistem</p>
            </div>

            <div style="background: var(--bg-card); padding: 25px; border-radius: 25px; border: 1px solid var(--border-light); margin-bottom: 15px;">
                <h4 class="label-small" style="margin-bottom: 20px; color: var(--primary);">Profil Pengguna</h4>
                
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px; background: var(--bg-slate); padding: 15px; border-radius: 20px;">
                    <div id="preview-foto-pengaturan" style="width: 65px; height: 65px; border-radius: 50%; border: 2px solid var(--primary); overflow: hidden; background: var(--bg-card); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${savedPhoto ? `<img src="${savedPhoto}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="color: var(--primary); font-weight: 900; font-size: 20px;">${inisial}</span>`}
                    </div>
                    <div style="flex: 1;">
                        <label style="display: inline-block; background: var(--primary); color: white; padding: 10px 18px; border-radius: 12px; font-size: 11px; font-weight: 800; cursor: pointer; margin-bottom: 5px;">
                            PILIH FOTO
                            <input type="file" accept="image/*" onchange="prosesUnggahFoto(this)" style="display: none;">
                        </label>
                        ${savedPhoto ? `<div onclick="hapusFotoProfil()" style="font-size: 10px; color: #ef4444; font-weight: 800; cursor: pointer; text-decoration: underline; margin-left: 5px;">Hapus Foto</div>` : ''}
                    </div>
                </div>

                <div class="form-group">
                    <label class="label-small">Nama Lengkap</label>
                    <input type="text" id="prof-nama" value="${userProfile.nama}" onchange="simpanProfil()">
                </div>
                <div class="form-group" style="margin-top:15px;">
                    <label class="label-small">Email</label>
                    <input type="email" id="prof-email" value="${userProfile.email}" onchange="simpanProfil()">
                </div>
            </div>

            <div style="background: var(--bg-card); padding: 25px; border-radius: 25px; border: 1px solid var(--border-light); margin-bottom: 15px;">
                <h4 class="label-small" style="margin-bottom: 15px; color: var(--primary);">Sistem & Data</h4>
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid var(--border-light);">
                    <div><strong style="display: block; font-size: 14px;">Mode Gelap</strong></div>
                    <label class="switch">
                        <input type="checkbox" id="dark-toggle" onchange="toggleTema(this.checked)" ${isDarkChecked}>
                        <span class="slider"></span>
                    </label>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid var(--border-light);">
                    <div>
                        <strong style="display: block; font-size: 14px;">ID Pengguna</strong>
                        <span style="font-size: 10px; color: var(--text-muted); font-family: monospace;">${userDeviceId}</span>
                    </div>
                    <button onclick="navigator.clipboard.writeText('${userDeviceId}'); showToast('ID Disalin! 📋')" style="background: var(--bg-slate); border: none; padding: 8px 15px; border-radius: 10px; font-size: 10px; font-weight: 800; color: var(--primary);">SALIN</button>
                </div>

                <div style="margin-top: 15px;">
                    <label class="label-small" style="margin-bottom: 10px;">Pencadangan (Backup)</label>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="backupData()" style="flex: 1; background: var(--bg-slate); border: 1px solid var(--border-light); padding: 12px; border-radius: 15px; font-weight: 800; font-size: 11px; cursor: pointer;">DOWNLOAD JSON</button>
                        <label style="flex: 1; background: var(--bg-slate); border: 1px solid var(--border-light); padding: 12px; border-radius: 15px; font-weight: 800; font-size: 11px; cursor: pointer; text-align: center;">
                            UPLOAD JSON
                            <input type="file" accept=".json" onchange="restoreData(event)" style="display: none;">
                        </label>
                    </div>
                </div>
            </div>

            <div style="background: var(--bg-card); padding: 25px; border-radius: 25px; border: 1px solid var(--border-light); margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 class="label-small" style="margin: 0; color: var(--primary);">Strategi Pos Dana</h4>
                    <button onclick="tambahPosBaru()" style="background: var(--primary); color: white; border: none; padding: 8px 15px; border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer;">+ TAMBAH</button>
                </div>
                <div id="notif-persen-setting" style="background: var(--bg-main); padding: 20px; border-radius: 20px; text-align: center; margin-bottom: 20px; border: 1px dashed var(--border-light);">
                    <div id="total-persen-text" style="font-size: 2rem; font-weight: 900; color: var(--text-main);">0%</div>
                    <span style="font-size: 9px; font-weight: 800; color: var(--text-muted);">TOTAL PERSENTASE (WAJIB 100%)</span>
                </div>
                <div id="list-pengaturan-pos"></div>
                <button onclick="simpanSemuaPengaturanPos()" id="btn-save-setting-pos" style="width: 100%; background: linear-gradient(135deg, var(--primary-light), var(--primary)); color: white; border: none; padding: 20px; border-radius: 20px; font-weight: 800; cursor: pointer; margin-top: 20px;">
                    SIMPAN PERUBAHAN POS
                </button>
            </div>

<div class="danger-card">
    <h4 class="label-small" style="color: #e11d48; margin-bottom: 15px;">Zona Berbahaya</h4>
    <button onclick="hapusSemuaData()" class="btn-danger-outline">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        BERSIHKAN SELURUH DATA
    </button>
    <p style="font-size: 10px; color: #fb7185; margin-top: 12px; text-align: center; font-weight: 700; opacity: 0.8;">Hati-hati: Tindakan ini akan mengosongkan aplikasi.</p>
</div>

            <div style="text-align: center; margin-top: 50px; padding-bottom: 20px;">
    <div style="width: 50px; height: 2px; background: var(--border-light); margin: 0 auto 20px; border-radius: 2px; opacity: 0.5;"></div>
    
    <div style="display: inline-flex; align-items: center; gap: 8px; background: var(--bg-card); padding: 6px 16px; border-radius: 50px; border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
        <div style="width: 18px; height: 18px; background: var(--primary); border-radius: 5px; display: flex; align-items: center; justify-content: center; transform: rotate(-10deg);">
            <span style="color: white; font-size: 10px; font-weight: 900;">G</span>
        </div>
        
        <span style="font-size: 10px; font-weight: 800; color: var(--text-main); letter-spacing: 0.5px;">
            GUN ORIGINAL PROJECT
        </span>
        
        <span style="font-size: 8px; font-weight: 900; color: var(--primary); background: rgba(5, 150, 105, 0.1); padding: 2px 6px; border-radius: 6px;">
            V1.2
        </span>
    </div>
    
    <p style="font-size: 9px; color: var(--text-muted); margin-top: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
        Digital Solution Provider
    </p>
</div>
    `;
    
    renderListPosSetting();
}

/* ============================================================
   4. FUNGSI NOTA (CRUD)
   ============================================================ */
function simpanNota() {
    const namaInput = document.getElementById('nama');
    const hargaInput = document.getElementById('harga');
    const inputs = document.querySelectorAll('.input-berat');
    const nama = namaInput.value.trim();
    const harga = parseFloat(hargaInput.value) || 0;

    if (!nama || harga <= 0) {
        showToast("⚠️ Lengkapi Nama & Harga!");
        return;
    }

    let rincianArr = [];
    let totalBerat = 0;
    inputs.forEach(i => {
        let v = parseFloat(i.value) || 0;
        if (v > 0) {
            rincianArr.push(v);
            totalBerat += v;
        }
    });

    if (totalBerat <= 0) {
        showToast("⚠️ Masukkan berat!");
        return;
    }

    const nota = {
        id: Date.now(),
        tgl: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        nama: nama,
        harga: harga,
        rincian: rincianArr.join(' + '),
        totalBerat: Math.round(totalBerat),
        totalBayar: Math.round(totalBerat * harga),
        calcLabel: "",
        calcResult: 0
    };

    database.unshift(nota);
    localStorage.setItem('database_karet_final', JSON.stringify(database));
    
    // Reset form
    namaInput.value = '';
    hargaInput.value = '';
    inputs.forEach(i => i.value = '');
    
    showToast("Nota " + nama + " Tersimpan! ✅");
    tampilkanData(database);
}

/* ============================================================
   FUNGSI NOTA (DIPERBARUI UNTUK HALAMAN DINAMIS)
   ============================================================ */

function tampilkanData(data) {
    updateStatistik();
    const wadah = document.getElementById('daftar-nota');
    
    // PENTING: Jika elemen 'daftar-nota' tidak ada di layar (karena sedang di Pengaturan), 
    // fungsi berhenti di sini agar tidak error 'null'.
    if (!wadah) return; 

    // Reset isi wadah
    wadah.innerHTML = '';
    
    if (data.length === 0) {
        wadah.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:14px; margin-top:20px;">Belum ada nota...</p>';
        return;
    }

    data.forEach(n => {
        const card = document.createElement('div');
        card.className = 'nota-card';
        card.style.position = 'relative'; // Memastikan posisi watermark terkunci
        
        // Cek status premium untuk ikon gembok
        const lockClass = isPremium ? "" : "btn-locked";
        
        // Tampilan Kalkulator tambahan jika ada
        let calcDisplayHtml = n.calcResult ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border-color); background: var(--bg-main); margin-left: -20px; margin-right: -20px; padding-left: 20px; padding-right: 20px; padding-bottom: 5px; margin-bottom: -20px; border-radius: 0 0 30px 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">${n.calcLabel}</span>
                    <span style="font-size: 1rem; font-weight: 800; color: #4f46e5;">Rp ${n.calcResult.toLocaleString('id-ID')}</span>
                </div>
            </div>` : '';

        card.innerHTML = `
    ${!isPremium ? `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); opacity: 0.05; pointer-events: none; z-index: 0; width: 85%;">
        <svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">
            <text x="50%" y="100" text-anchor="middle" dominant-baseline="middle" font-family="'Brush Script MT', cursive" font-weight="900" font-size="100" fill="var(--primary)">Gun</text>
            <text x="50%" y="130" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="18" fill="#FF8C00" letter-spacing="3">Original Project</text>
        </svg>
    </div>` : ''}

    <div class="nota-content" style="position: relative; z-index: 1;">
        </div>                        <div class="nota-header">
                    <div class="nota-date">${n.tgl}</div>
                    <div class="action-buttons-group">
                        <button onclick="tampilStruk(${n.id})" class="btn-action-card btn-struk" title="Lihat Struk">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </button>
                        <button onclick="if(proteksiPremium('Edit Nota')) editNota(${n.id})" class="btn-action-card btn-edit ${lockClass}" title="Edit">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onclick="if(proteksiPremium('Kalkulator')) bukaKalkulator(${n.id})" class="btn-action-card btn-calc ${lockClass}" title="Kalkulator">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/></svg>
                        </button>
                        <button onclick="if(proteksiPremium('Bagikan')) bagikanNota(${n.id})" class="btn-action-card btn-share ${lockClass}" title="Share">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        </button>
                        <button onclick="if(proteksiPremium('Download')) downloadNota(${n.id})" class="btn-action-card btn-download ${lockClass}" title="Download">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </button>
                        <button onclick="konfirmasiHapusNota(${n.id})" class="btn-action-card btn-delete" title="Hapus">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <div class="nota-name" style="color: var(--text-main);">${n.nama}</div>
                <div class="nota-detail-box" style="background: var(--bg-main); border-left: 4px solid var(--primary); color: var(--primary);">${n.rincian} = ${n.totalBerat} Kg</div>
                
                <div class="nota-footer">
                    <div>
                        <p style="font-size:9px; color: var(--text-muted); font-weight:800; text-transform:uppercase;">Harga</p>
                        <p style="font-size:13px; font-weight:700; color: var(--text-main);">Rp ${n.harga.toLocaleString('id-ID')}</p>
                    </div>

                    <div style="text-align:right;">
                        <p style="font-size:9px; color:var(--primary); font-weight:800; text-transform:uppercase;">Total Bayar</p>
                        <p class="total-pay-val" style="color: var(--primary);">Rp ${n.totalBayar.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                ${calcDisplayHtml}
            </div>
            `;
        wadah.appendChild(card);
    });
}

function tambahBaris() {
    const area = document.getElementById('area-berat');
    if (!area) return;
    const div = document.createElement('div');
    div.style.marginTop = "8px";
    div.innerHTML = `<input type="number" class="input-berat" placeholder="Timbangan Tambahan" style="background: var(--bg-main); color: var(--text-main); border: 1px solid var(--border-color);">`;
    area.appendChild(div);
}

function cariNota() {
    const inputCari = document.getElementById('input-cari');
    if (!inputCari) return;

    let kw = inputCari.value.toLowerCase();
    let kwFormat = formatDate(kw);
    
    const hasil = database.filter(n => 
        n.nama.toLowerCase().includes(kw) || 
        n.tgl.toLowerCase().includes(kwFormat)
    );
    
    tampilkanData(hasil);
}

/* ============================================================
   5. FUNGSI HAPUS NOTA
   ============================================================ */
function konfirmasiHapusNota(id) {
    const n = database.find(nota => nota.id === id);
    if (!n) return;
    
    idHapusNotaSementara = id;
    document.getElementById('teks-hapus-nota').innerHTML = 
        `Yakin ingin menghapus nota milik <strong>${n.nama}</strong>?<br><small style="color:#94a3b8">Data ini akan hilang permanen.</small>`;
    
    document.getElementById('modal-hapus-nota').classList.add('active');
}

function tutupModalHapusNota() {
    document.getElementById('modal-hapus-nota').classList.remove('active');
    idHapusNotaSementara = null;
}

function prosesHapusNota() {
    if (idHapusNotaSementara) {
        database = database.filter(n => n.id !== idHapusNotaSementara);
        localStorage.setItem('database_karet_final', JSON.stringify(database));
        tampilkanData(database);
        showToast("Nota Berhasil Dihapus! 🗑️");
        tutupModalHapusNota();
    }
}

document.getElementById('btn-konfirmasi-hapus-nota').onclick = prosesHapusNota;

/* ============================================================
   6. FUNGSI EDIT NOTA
   ============================================================ */
function editNota(id) {
    const nota = database.find(n => n.id === id);
    if (!nota) return;

    document.getElementById('nama').value = nota.nama;
    document.getElementById('harga').value = nota.harga;

    const areaBerat = document.getElementById('area-berat');
    areaBerat.innerHTML = '<label class="label-small">INPUT BERAT (KG)</label>';
    
    const beratArr = nota.rincian.split(' + ');
    beratArr.forEach((b, index) => {
        const val = b.replace(' Kg', '').trim();
        const div = document.createElement('div');
        div.style.marginTop = index === 0 ? "0" : "8px";
        div.innerHTML = `<input type="number" class="input-berat" value="${val}">`;
        areaBerat.appendChild(div);
    });

    const btnSimpan = document.querySelector('.btn-save');
    btnSimpan.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>Update Nota</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
    `;
    btnSimpan.style.background = "linear-gradient(135deg, #2563eb, #1d4ed8)";
    btnSimpan.onclick = function() { prosesUpdateNota(id); };
    
    idSedangDiedit = id;
    
    // Auto scroll ke form
    document.getElementById('view-form').classList.remove('hidden');
    document.getElementById('view-form').scrollIntoView({behavior: "smooth"});
}

function prosesUpdateNota(id) {
    const nama = document.getElementById('nama').value.trim();
    const harga = parseFloat(document.getElementById('harga').value) || 0;
    const inputs = document.querySelectorAll('.input-berat');

    if (!nama || harga <= 0) {
        showToast("⚠️ Lengkapi data!");
        return;
    }

    let rincianArr = [];
    let totalBerat = 0;
    inputs.forEach(i => {
        let v = parseFloat(i.value) || 0;
        if (v > 0) {
            rincianArr.push(v);
            totalBerat += v;
        }
    });

    const index = database.findIndex(n => n.id === id);
    if (index !== -1) {
        database[index].nama = nama;
        database[index].harga = harga;
        database[index].rincian = rincianArr.join(' + ');
        database[index].totalBerat = Math.round(totalBerat);
        database[index].totalBayar = Math.round(totalBerat * harga);

        localStorage.setItem('database_karet_final', JSON.stringify(database));
        resetFormUpdate();
        showToast("Nota Berhasil Diupdate! ✨");
        tampilkanData(database);
    }
}

function resetFormUpdate() {
    const btnSimpan = document.querySelector('.btn-save');
    btnSimpan.innerText = "Simpan Nota";
    btnSimpan.style.background = "linear-gradient(135deg, #10b981, #059669)";
    btnSimpan.onclick = simpanNota;
    
    document.getElementById('nama').value = '';
    document.getElementById('harga').value = '';
    
    const areaBerat = document.getElementById('area-berat');
    areaBerat.innerHTML = `
        <label class="label-small">INPUT BERAT (KG)</label>
        <div class="weight-grid">
            <input type="number" class="input-berat" placeholder="0">
            <input type="number" class="input-berat" placeholder="0">
        </div>
    `;
    idSedangDiedit = null;
}

/* ============================================================
   7. FUNGSI STATISTIK
   ============================================================ */
function updateStatistik() {
    const sekarang = new Date();
    const hariIni = sekarang.toDateString();
    
    const awalMinggu = new Date(sekarang);
    awalMinggu.setDate(sekarang.getDate() - (sekarang.getDay() === 0 ? 6 : sekarang.getDay() - 1));
    awalMinggu.setHours(0,0,0,0);

    const bulanIni = sekarang.getMonth();
    const tahunIni = sekarang.getFullYear();
    
    let indexBulanLalu = bulanIni - 1;
    let tahunBulanLalu = tahunIni;
    if (indexBulanLalu < 0) {
        indexBulanLalu = 11;
        tahunBulanLalu--;
    }

    let stats = { semua: 0, hari: 0, minggu: 0, bulan: 0, bulanLalu: 0 };

    database.forEach(n => {
        const tglNota = new Date(n.id);
        const berat = parseFloat(n.totalBerat) || 0;

        stats.semua += berat;
        if (tglNota.toDateString() === hariIni) stats.hari += berat;
        if (tglNota >= awalMinggu) stats.minggu += berat;
        if (tglNota.getMonth() === bulanIni && tglNota.getFullYear() === tahunIni) stats.bulan += berat;
        if (tglNota.getMonth() === indexBulanLalu && tglNota.getFullYear() === tahunBulanLalu) stats.bulanLalu += berat;
    });

    document.getElementById('stat-berat-semua').innerText = Math.round(stats.semua).toLocaleString('id-ID');
    document.getElementById('stat-berat-hari').innerText = Math.round(stats.hari);
    document.getElementById('stat-berat-minggu').innerText = Math.round(stats.minggu);
    document.getElementById('stat-berat-bulan').innerText = Math.round(stats.bulan);
    document.getElementById('stat-berat-bulan-lalu').innerText = Math.round(stats.bulanLalu);
}

/* ============================================================
   8. FUNGSI RINCIAN STATISTIK
   ============================================================ */
function bukaRincianStat() {
    const modal = document.getElementById('modal-rincian-stat');
    const body = document.getElementById('modal-rincian-body');
    
    const sekarang = new Date();
    const hariIni = sekarang.toDateString();
    
    const awalMinggu = new Date(sekarang);
    awalMinggu.setDate(sekarang.getDate() - (sekarang.getDay() === 0 ? 6 : sekarang.getDay() - 1));
    awalMinggu.setHours(0,0,0,0);

    const kemarin = new Date(sekarang);
    kemarin.setDate(sekarang.getDate() - 1);
    const hariKemarin = kemarin.toDateString();

    const bulanIni = sekarang.getMonth();
    const tahunIni = sekarang.getFullYear();
    
    let indexBulanLalu = bulanIni - 1;
    let tahunBulanLalu = tahunIni;
    if (indexBulanLalu < 0) {
        indexBulanLalu = 11;
        tahunBulanLalu--;
    }

    let stats = {
        semua: { berat: 0, uang: 0 },
        hari: { berat: 0, uang: 0 },
        kemarin: { berat: 0, uang: 0 },
        minggu: { berat: 0, uang: 0 },
        bulan: { berat: 0, uang: 0 },
        bulanLalu: { berat: 0, uang: 0 }
    };

    database.forEach(n => {
        const tglNota = new Date(n.id);
        const berat = parseFloat(n.totalBerat) || 0;
        const uang = parseFloat(n.totalBayar) || 0;
        
        stats.semua.berat += berat;
        stats.semua.uang += uang;
        
        if (tglNota.toDateString() === hariIni) {
            stats.hari.berat += berat;
            stats.hari.uang += uang;
        }
        if (tglNota.toDateString() === hariKemarin) {
            stats.kemarin.berat += berat;
            stats.kemarin.uang += uang;
        }
        if (tglNota >= awalMinggu) {
            stats.minggu.berat += berat;
            stats.minggu.uang += uang;
        }
        if (tglNota.getMonth() === bulanIni && tglNota.getFullYear() === tahunIni) {
            stats.bulan.berat += berat;
            stats.bulan.uang += uang;
        }
        if (tglNota.getMonth() === indexBulanLalu && tglNota.getFullYear() === tahunBulanLalu) {
            stats.bulanLalu.berat += berat;
            stats.bulanLalu.uang += uang;
        }
    });

    const maxChart = Math.max(stats.bulan.berat, stats.bulanLalu.berat, 1);
    const heightIni = (stats.bulan.berat / maxChart) * 100;
    const heightLalu = (stats.bulanLalu.berat / maxChart) * 100;

    body.innerHTML = `
        <div class="rincian-container">
            <div class="rincian-hero-card">
                <span class="stat-label" style="color: #94a3b8;">Total Omzet (All Time)</span>
                <span style="font-size: 2rem; font-weight: 900; color: #10b981; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    Rp ${Math.round(stats.semua.uang).toLocaleString('id-ID')}
                </span>
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; display: block;">Total Berat</span>
                        <div style="font-weight: 800; font-size: 16px; color: white;">${Math.round(stats.semua.berat).toLocaleString('id-ID')} Kg</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; display: block;">Total Nota</span>
                        <div style="font-weight: 800; font-size: 16px; color: white;">${database.length} Lembar</div>
                    </div>
                </div>
            </div>

            <h3 style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 25px 0 15px 5px;">Laporan Berkala</h3>

            <div class="rincian-grid">
                <div class="rincian-stat-card" onclick="showStatDetail('Hari Ini', ${stats.hari.berat}, ${stats.hari.uang})">
                    <span class="stat-label">Hari Ini</span>
                    <span class="stat-value">${Math.round(stats.hari.berat)} <small style="font-size: 12px; font-weight: 600;">Kg</small></span>
                    <span class="stat-sub">Rp ${Math.round(stats.hari.uang).toLocaleString('id-ID')}</span>
                </div>

                <div class="rincian-stat-card" onclick="showStatDetail('Kemarin', ${stats.kemarin.berat}, ${stats.kemarin.uang})">
                    <span class="stat-label">Kemarin</span>
                    <span class="stat-value">${Math.round(stats.kemarin.berat)} <small style="font-size: 12px; font-weight: 600;">Kg</small></span>
                    <span class="stat-sub" style="background: #f1f5f9; color: #64748b;">Rp ${Math.round(stats.kemarin.uang).toLocaleString('id-ID')}</span>
                </div>

                <div class="rincian-stat-card" onclick="showStatDetail('Minggu Ini', ${stats.minggu.berat}, ${stats.minggu.uang})">
                    <span class="stat-label">Minggu Ini</span>
                    <span class="stat-value">${Math.round(stats.minggu.berat)} <small style="font-size: 12px; font-weight: 600;">Kg</small></span>
                    <span class="stat-sub" style="background: #f1f5f9; color: #64748b;">Rp ${Math.round(stats.minggu.uang).toLocaleString('id-ID')}</span>
                </div>

                <div class="rincian-stat-card highlight" onclick="showStatDetail('Bulan Ini', ${stats.bulan.berat}, ${stats.bulan.uang})">
                    <span class="stat-label" style="color: var(--primary);">Bulan Ini</span>
                    <span class="stat-value">${Math.round(stats.bulan.berat)} <small style="font-size: 12px; font-weight: 600;">Kg</small></span>
                    <span class="stat-sub">Rp ${Math.round(stats.bulan.uang).toLocaleString('id-ID')}</span>
                </div>
            </div>

            <div class="chart-container">
                <h4 style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 20px; text-align: center;">Perbandingan Bulanan</h4>
                <div class="chart-bar-container">
                    <div class="chart-bar-item">
                        <div class="chart-bar" style="height: ${heightLalu}%; background: #cbd5e1;"></div>
                        <span class="chart-label">BULAN LALU</span>
                    </div>
                    <div class="chart-bar-item">
                        <div class="chart-bar" style="height: ${heightIni}%; background: linear-gradient(to top, var(--primary), var(--primary-light));"></div>
                        <span class="chart-label" style="color: var(--primary);">BULAN INI</span>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-around; margin-top: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 14px; font-weight: 800; color: #64748b;">${Math.round(stats.bulanLalu.berat)} Kg</div>
                        <div style="font-size: 10px; color: #94a3b8;">Rp ${Math.round(stats.bulanLalu.uang).toLocaleString('id-ID')}</div>
                    </div>
                    <div>
                        <div style="font-size: 14px; font-weight: 800; color: var(--primary);">${Math.round(stats.bulan.berat)} Kg</div>
                        <div style="font-size: 10px; color: #94a3b8;">Rp ${Math.round(stats.bulan.uang).toLocaleString('id-ID')}</div>
                    </div>
                </div>
            </div>

            <div style="height: 30px;"></div>
        </div>
    `;

    modal.classList.add('active');
}

function tutupRincianStat() {
    document.getElementById('modal-rincian-stat').classList.remove('active');
}

function showStatDetail(periode, berat, uang) {
    if (berat <= 0) {
        showToast("Belum ada data untuk " + periode);
    } else {
        showToast(`${periode}: ${Math.round(berat)} Kg | Rp ${Math.round(uang).toLocaleString('id-ID')}`);
    }
}

/* ============================================================
   9. FUNGSI STRUK
   ========================================================*/
   
    function tampilStruk(id) {
    const nota = database.find(n => n.id === id);
    if (!nota) return;

    const modal = document.getElementById('modal-struk');
    const isi = document.getElementById('isi-struk');

    const parts = nota.tgl.split(', ');
    const tgl = parts[0] || nota.tgl;
    const waktu = parts[1] || '';
    
    const beratArr = nota.rincian.split(/\s*\+\s*/);
    let rincianHtml = '';
    
    // Ambil tema yang sedang aktif
const currentTheme = localStorage.getItem('gun_theme') || 'light';

// Tentukan warna berdasarkan tema
const isDark = currentTheme === 'dark';

// LOGIKA PEMILIHAN STRUK

    beratArr.forEach((b, i) => {
        rincianHtml += `
            <div style="display:flex; justify-content:space-between; font-family:monospace; margin-bottom:2px; position:relative; z-index:2;">
                <span style="color:#888;">${i + 1}.</span>
                <span style="font-weight:bold;">${parseFloat(b)} Kg</span>
            </div>`;
    });

    isi.innerHTML = `
        <div style="position: relative; overflow: hidden; padding: 10px; background: #fff;">
            
            ${!isPremium ? `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); opacity: 0.08; pointer-events: none; width: 100%; text-align: center; z-index: 1;">
                <svg width="220" height="110" viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg">
                    <text x="50%" y="100" text-anchor="middle" dominant-baseline="middle" font-family="'Brush Script MT', cursive" font-weight="900" font-size="100" fill="#003366">Gun</text>
                    <text x="50%" y="130" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="18" fill="#FF8C00" letter-spacing="3">Original Project</text>
                </svg>
            </div>` : ''}

    <div style="position: relative; overflow: hidden; padding: 15px; 
        background: ${isDark ? '#0f172a' : '#ffffff'}; 
        border-radius: 20px; 
        border: 1px solid ${isDark ? '#1e293b' : '#f1f5f9'};">
        
        ${!isPremium ? `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); opacity: ${isDark ? '0.03' : '0.05'}; pointer-events: none; width: 100%; text-align: center; z-index: 1;">
            <svg width="220" height="110" viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg">
                <text x="50%" y="100" text-anchor="middle" dominant-baseline="middle" font-family="'Brush Script MT', cursive" font-weight="900" font-size="100" fill="${isDark ? '#ffffff' : '#000000'}">Gun</text>
                <text x="50%" y="130" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="18" fill="#FF8C00" letter-spacing="3">Original Project</text>
            </svg>
        </div>` : ''}

        <div style="position: relative; z-index: 2; text-align:center; font-family:monospace; color: ${isDark ? '#f1f5f9' : '#000000'};">
            <div style="font-weight:800; font-size:16px; letter-spacing:2px; color: ${isDark ? '#10b981' : '#000000'};">NOTA DIGITAL</div>
            
            <div style="display: inline-block; padding: 2px 8px; background: ${isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc'}; border-radius: 4px; margin-bottom: 8px; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};">
                <span style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Developer By : Gun Original Project</span>
            </div>

            <hr style="border:none; border-top:1px dashed ${isDark ? '#334155' : '#000'}; margin:10px 0;">
            
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                <span style="color: ${isDark ? '#94a3b8' : '#666'};">Nama:</span>
                <span style="font-weight:bold;">${nota.nama.toUpperCase()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                <span style="color: ${isDark ? '#94a3b8' : '#666'};">Tanggal:</span>
                <span>${tgl}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px;">
                <span style="color: ${isDark ? '#94a3b8' : '#666'};">Waktu:</span>
                <span>${waktu}</span>
            </div>

            <hr style="border:none; border-top:1px dashed ${isDark ? '#334155' : '#ccc'}; margin:10px 0;">
            <div style="font-size:10px; font-weight:bold; letter-spacing:2px; margin-bottom:10px; color: ${isDark ? '#10b981' : '#555'};">RINCIAN BERAT</div>
            
            <div style="${isDark ? 'background: rgba(30, 41, 59, 0.3); padding: 10px; border-radius: 12px; border: 1px solid #1e293b;' : ''}">
                ${rincianHtml}
            </div>

            <hr style="border:none; border-top:1px dashed ${isDark ? '#334155' : '#ccc'}; margin:10px 0;">
            
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span>Total Berat:</span>
                <span style="font-weight:bold;">${nota.totalBerat} Kg</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12px;">
                <span>Harga/Kg:</span>
                <span style="font-weight:bold;">Rp ${nota.harga.toLocaleString('id-ID')}</span>
            </div>

            <div style="background: ${isDark ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#000'}; color:#fff; padding:15px; border-radius:12px; margin-top:20px;">
                <div style="font-size:9px; text-transform:uppercase; opacity:0.8; letter-spacing:2px; margin-bottom:3px;">Total Bayar</div>
                <div style="font-size:20px; font-weight:bold;">Rp ${nota.totalBayar.toLocaleString('id-ID')}</div>
            </div>
            
            ${!isPremium ? `
            <div style="margin-top:25px; padding-top:15px; border-top: 1px solid ${isDark ? '#1e293b' : '#f1f5f9'}; text-align: center;">
                <div style="font-size: 10px; font-weight: 700; color: ${isDark ? '#94a3b8' : '#475569'};">Gun Original Project</div>
                <div style="font-size: 9px; color: #94a3b8;">Aplikasi • Website • Toko Online</div>
                <div style="margin-top: 5px; font-family: monospace; font-size: 10px; color: #10b981; font-weight: bold;">WA: 0816 308 466</div>
            </div>` : `
            <div style="margin-top:20px; border-top: 1px solid ${isDark ? '#1e293b' : '#f1f5f9'}; padding-top:10px;">
                <div style="font-size: 11px; color: #94a3b8; font-style: italic;">Terima kasih atas kepercayaan Anda</div>
                <div style="font-size: 10px; font-weight: 700; color: ${isDark ? '#10b981' : '#475569'}; margin-top: 5px;">Hitung kembali uang Anda sebelum pergi</div>
            </div>`}
        </div>
    </div>
`;

    modal.classList.add('active');
    
    const btnCetak = document.getElementById('btn-cetak-struk');
    btnCetak.setAttribute('data-id', id);
    btnCetak.onclick = function() {
        window.print();
    };
}

function tutupStruk() {
    document.getElementById('modal-struk').classList.remove('active');
}

function tutupStruk() {
    document.getElementById('modal-struk').classList.remove('active');
}

/* ============================================================
   10. FUNGSI KALKULATOR
   ============================================================ */
function bukaKalkulator(id) {
    currentCalcId = id;
    const nota = database.find(n => n.id === id);
    
    document.getElementById('calc-display').value = '0';
    
    const labelInput = document.getElementById('calc-label-input');
    if (nota && nota.calcLabel) {
        labelInput.value = nota.calcLabel;
    } else {
        labelInput.value = 'Kalkulator digunakan';
    }
    
    document.getElementById('modal-kalkulator').classList.add('active');
}

function tutupKalkulator() {
    document.getElementById('modal-kalkulator').classList.remove('active');
    currentCalcId = null;
}

function ketikKalkulator(val) {
    const display = document.getElementById('calc-display');
    let currentText = display.value;

    if (currentText === '0' && !isNaN(val)) {
        display.value = val;
    } else {
        display.value += val;
    }
}

function hapusKalkulator() {
    const display = document.getElementById('calc-display');
    if (display.value.length > 1) {
        display.value = display.value.slice(0, -1);
    } else {
        display.value = '0';
    }
}

function resetKalkulator() {
    document.getElementById('calc-display').value = '0';
}

function hitungKalkulator() {
    const display = document.getElementById('calc-display');
    try {
        let hasil = eval(display.value);
        if (hasil === undefined || isNaN(hasil)) {
            display.value = "Error";
        } else {
            display.value = hasil;
        }
    } catch (e) {
        display.value = "Error";
    }
}

function simpanHasilKalkulator() {
    const display = document.getElementById('calc-display');
    const label = document.getElementById('calc-label-input').value || 'Kalkulator digunakan';
    const hasil = parseFloat(display.value);

    if (isNaN(hasil) || hasil === 0) {
        showToast("⚠️ Hasil tidak valid!");
        return;
    }

    const index = database.findIndex(n => n.id === currentCalcId);
    if (index !== -1) {
        database[index].calcLabel = label;
        database[index].calcResult = hasil;
        
        localStorage.setItem('database_karet_final', JSON.stringify(database));
        tampilkanData(database);
        showToast("Hasil kalkulator disimpan! 🧮");
        tutupKalkulator();
    }
}

/* ============================================================
   11. FUNGSI BAGIKAN & DOWNLOAD
   ============================================================ */
function bagikanNota(id) {
    const n = database.find(nota => nota.id === id);
    if (!n) return;

    const pesan = `*NOTA DIGITAL*\n----------------------------\n*Nama:* ${n.nama.toUpperCase()}\n*Tanggal:* ${n.tgl}\n----------------------------\n*Rincian Berat:*\n${n.rincian.replace(/\+/g, '\n')}\n----------------------------\n*Total Berat:* ${n.totalBerat} Kg\n*Harga/Kg:* Rp ${n.harga.toLocaleString('id-ID')}\n*TOTAL BAYAR:* Rp ${n.totalBayar.toLocaleString('id-ID')}\n----------------------------\n_Dibuat via Gun Original Project_`;

    if (navigator.share) {
        navigator.share({
            title: 'Nota Karet ' + n.nama,
            text: pesan
        }).catch(() => {
            window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, '_blank');
        });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, '_blank');
    }
}

function downloadNota(id) {
    const nota = database.find(n => n.id === id);
    if (!nota) return;

    showToast("Menyiapkan gambar... ⏳");
    tampilStruk(id);
    
    setTimeout(() => {
        const target = document.getElementById('isi-struk');
        html2canvas(target, {
            backgroundColor: "#ffffff",
            scale: 2,
            useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Nota-${nota.nama.replace(/\s+/g, '-')}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            showToast("Gambar berhasil disimpan! ✅");
            tutupStruk();
        }).catch(() => {
            showToast("Gagal mendownload gambar ❌");
        });
    }, 400);
}

/* ============================================================
   12. FUNGSI PANDUAN & LISENSI
   ============================================================ */
   function renderPanduanHalamanFull() {
    const wadahUtama = document.getElementById('view-list');
    
    // 1. Sembunyikan Statistik & Form Nota agar layar bersih
    document.getElementById('view-stats').classList.add('hidden');
    document.getElementById('view-form').classList.add('hidden');

    // 2. Variabel untuk kontrol UI Premium
    const displayStyle = isPremium ? 'display: none !important;' : '';

    // 3. Logika Kartu Aktivasi vs Ucapan Terima Kasih (Diambil dari renderPanduanContent)
    let aktivasiSection = "";
    if (isPremium) {
        aktivasiSection = `
            <div style="background: linear-gradient(135deg, #059669 0%, #064e3b 100%); padding: 30px 25px; border-radius: 35px; color: white; position: relative; overflow: hidden; box-shadow: 0 20px 40px rgba(5, 150, 105, 0.2); text-align: center; margin-top: 30px;">
                <div style="position: absolute; top: -10px; right: -10px; font-size: 60px; opacity: 0.1;">🎖️</div>
                <div style="font-size: 50px; margin-bottom: 10px;">👑</div>
                <h4 style="font-size: 1.4rem; font-weight: 900; color: #fff; margin-bottom: 8px;">Terima Kasih!!</h4>
                <p style="font-size: 13px; color: #d1fae5; line-height: 1.6; margin-bottom: 5px;">
                    Lisensi Premium Anda telah aktif selamanya untuk ID: 
                    <span style="font-family: monospace; font-weight: 900; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px;">${userDeviceId}</span>
                </p>
                <p style="font-size: 11px; color: #a7f3d0; opacity: 0.8;">Selamat menikmati semua fitur tanpa batas di Gun Original Project.</p>
            </div>
        `;
    } else {
        aktivasiSection = `
            <div style="background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%); padding: 30px 25px; border-radius: 40px; color: white; position: relative; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); margin-top: 35px; border: 1px solid rgba(255,255,255,0.05);">
    
    <div style="position: absolute; top: -20px; right: -20px; width: 120px; height: 120px; background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%); border-radius: 50%;"></div>
    <div style="position: absolute; top: 20px; right: 20px; font-size: 40px; opacity: 0.2; filter: grayscale(1);">💎</div>

    <div style="text-align: center; margin-bottom: 25px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 50px; height: 50px; background: rgba(16, 185, 129, 0.1); border-radius: 18px; margin-bottom: 15px; border: 1px solid rgba(16, 185, 129, 0.2);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <h4 style="font-size: 18px; font-weight: 900; color: white; margin: 0;">Akses Premium</h4>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 5px; font-weight: 500;">Buka fitur eksklusif & hapus semua batasan</p>
    </div>

    <div style="background: rgba(15, 23, 42, 0.6); padding: 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(10px);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 5px;">
            <div>
                <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">ID Pengguna</span>
                <div style="font-size: 15px; font-weight: 900; color: #f8fafc; font-family: 'Courier New', monospace;">${userDeviceId}</div>
            </div>
            <button onclick="navigator.clipboard.writeText('${userDeviceId}'); showToast('ID Disalin! 📋');" style="background: #334155; border: none; padding: 8px 15px; border-radius: 12px; color: white; font-size: 10px; font-weight: 800; cursor: pointer; transition: 0.3s;">
                SALIN
            </button>
        </div>

        <div style="position: relative; margin-bottom: 15px;">
            <input type="text" id="input-lisensi-baru" placeholder="MASUKKAN KODE LISENSI" 
                style="width: 100%; padding: 18px; border-radius: 20px; border: 2px solid #334155; background: #020617; color: #10b981; text-align: center; font-family: monospace; font-weight: 900; font-size: 16px; outline: none; box-sizing: border-box; transition: 0.3s; letter-spacing: 2px;">
        </div>

        <button onclick="verifikasiLisensiBaru()" style="width: 100%; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 18px; border-radius: 20px; font-weight: 900; font-size: 14px; cursor: pointer; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); letter-spacing: 1px;">
            AKTIFKAN SEKARANG
        </button>
    </div>

    <div style="text-align: center; margin-top: 20px;">
        <button onclick="hubungiAdmin()" style="background: transparent; color: #64748b; border: none; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; margin: 0 auto; text-decoration: none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.6 8.38 8.38 0 0 1 3.9.9L22 2l-2.1 4.7a8.38 8.38 0 0 1 .9 3.8z"></path></svg>
            Belum punya kode? Hubungi Admin
        </button>
    </div>
</div>
        `;
    }

    // 4. Render Wadah Utama
    wadahUtama.innerHTML = `
        <div style="padding: 0 5px 100px;">
            
            <!-- Header Panduan -->
            <div style="text-align: center; margin-bottom: 40px; padding: 30px 20px; background: linear-gradient(to bottom, rgba(236, 253, 245, 0.5), transparent); border-radius: 0 0 50px 50px;">
    <div style="width: 70px; height: 70px; background: white; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 10px 25px rgba(5, 150, 105, 0.15); border: 1px solid rgba(16, 185, 129, 0.1);">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
    </div>

    <h3 style="font-size: 1.6rem; font-weight: 900; color: var(--text-main); margin-bottom: 8px; letter-spacing: -0.5px;">Cara Penggunaan</h3>
    
    <div style="max-width: 280px; margin: 0 auto;">
        <p style="font-size: 13px; color: var(--text-muted); font-weight: 600; line-height: 1.6;">
            Untuk membuat nota baru, pastikan Anda masuk ke menu 
            <span style="display: inline-flex; align-items: center; gap: 5px; background: var(--primary); color: white; padding: 2px 10px; border-radius: 50px; font-size: 10px; font-weight: 800; margin: 0 2px; vertical-align: middle;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                NOTA
            </span> 
            pada navigasi bawah aplikasi.
        </p>
    </div>
</div>

            <div style="background: var(--bg-card); padding: 20px; border-radius: 25px; border: 1px solid var(--border-color); margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: var(--primary); color: white; width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3);">1</div>
                    <div>
                        <h4 style="font-size: 14px; font-weight: 800; color: var(--text-main); margin-bottom: 5px;">Isi Data </h4>
                        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">Masukkan <b>Nama </b> dan <b>Harga</b> per kilonya hari ini. Pastikan harga diisi tanpa titik (Contoh: 12000).</p>
                    </div>
                </div>
            </div>

            <div style="background: var(--bg-card); padding: 20px; border-radius: 25px; border: 1px solid var(--border-color); margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: var(--primary); color: white; width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3);">2</div>
                    <div>
                        <h4 style="font-size: 14px; font-weight: 800; color: var(--text-main); margin-bottom: 5px;">Input Berat Timbangan</h4>
                        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">Masukkan hasil timbangan di kolom <b>Timbangan 1</b>, <b>Timbangan 2</b>, dst.</p>
                        <div style="background: var(--bg-slate); padding: 12px; border-radius: 15px; margin-top: 10px; border: 1px dashed var(--border-color);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="background: var(--border-color); color: var(--text-main); width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;">+</div>
                                <span style="font-size: 11px; color: var(--text-muted); font-weight: 700;">Gunakan tombol <b>(+)</b> untuk menambah baris timbangan.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="background: var(--bg-card); padding: 20px; border-radius: 25px; border: 1px solid var(--border-color); margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: var(--primary); color: white; width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3);">3</div>
                    <div>
                        <h4 style="font-size: 14px; font-weight: 800; color: var(--text-main); margin-bottom: 5px;">Simpan & Kalkulasi</h4>
                        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">Klik <b>Simpan Nota</b>. Aplikasi akan otomatis menjumlahkan total berat dan total bayar  secara akurat.</p>
                    </div>
                </div>
            </div>

            <div style="background: var(--bg-card); padding: 20px; border-radius: 25px; border: 1px solid var(--border-color); margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: var(--primary); color: white; width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3);">4</div>
                    <div>
                        <h4 style="font-size: 14px; font-weight: 800; color: var(--text-main); margin-bottom: 5px;">Cetak atau Bagikan</h4>
                        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">Klik ikon <b>Struk (Hijau)</b> di kartu nota. Kamu bisa langsung cetak ke printer Bluetooth atau kirim ke WhatsApp.</p>
                    </div>
                </div>
            </div>
            
            <!-- panduan navigasi -->
                        <div style="margin-top: 35px; margin-bottom: 25px;">
                <h4 style="color: var(--text-main); font-size: 15px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    Fungsi Menu Navigasi
                </h4>

                <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                    
                    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-light); display: flex; align-items: center; gap: 15px;">
                        <div style="background: var(--primary); color: white; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.2);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        </div>
                        <div>
                            <strong style="display: block; font-size: 13px; color: var(--text-main);">Home (Beranda)</strong>
                            <span style="font-size: 11px; color: var(--text-muted);">Melihat ringkasan statistik berat KG dan daftar semua nota yang tersimpan.</span>
                        </div>
                    </div>

                    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-light); display: flex; align-items: center; gap: 15px;">
                        <div style="background: var(--primary); color: white; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.2);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                            <strong style="display: block; font-size: 13px; color: var(--text-main);">Nota (Buat Baru)</strong>
                            <span style="font-size: 11px; color: var(--text-muted);">Membuka formulir untuk menginput nama , harga, dan rincian berat timbangan.</span>
                        </div>
                    </div>

                    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-light); display: flex; align-items: center; gap: 15px;">
                        <div style="background: var(--primary); color: white; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.2);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        </div>
                        <div>
                            <strong style="display: block; font-size: 13px; color: var(--text-main);">Catatan (Keuangan)</strong>
                            <span style="font-size: 11px; color: var(--text-muted);">Mengelola kas masuk/keluar dan memantau pembagian modal berdasarkan strategi pos dana.</span>
                            <div class="badge-premium" style="${displayStyle} display: flex; align-items: center; gap: 4px; color: #f59e0b; font-size: 9px; font-weight: 800; margin-top: 5px;">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                <span style="text-decoration: underline; text-underline-offset: 2px;">FITUR PREMIUM</span>
                            </div>
                        </div>
                    </div>

                    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-light); display: flex; align-items: center; gap: 15px;">
                        <div style="background: var(--primary); color: white; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.2);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </div>
                        <div>
                            <strong style="display: block; font-size: 13px; color: var(--text-main);">Pengaturan</strong>
                            <span style="font-size: 11px; color: var(--text-muted);">Mengatur profil, ganti foto, mode gelap, serta melakukan backup/restore data.</span>
                            <div class="badge-premium" style="${displayStyle} display: flex; align-items: center; gap: 4px; color: #f59e0b; font-size: 9px; font-weight: 800; margin-top: 5px;">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                <span style="text-decoration: underline; text-underline-offset: 2px;">FITUR PREMIUM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fungsi Tombol -->
            <div style="margin-top: 35px; margin-bottom: 25px;">
                <h4 style="color: var(--text-main); font-size: 15px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                    Fungsi Tombol di Kartu Nota
                </h4>

                <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
        <div style="background: #ecfdf5; color: #059669; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        <div>
            <strong style="display: block; font-size: 13px; color: var(--text-main);">Lihat Struk</strong>
            <span style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Melihat struk digital siap cetak dengan watermark.</span>
        </div>
    </div>

    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 15px;">
        <div style="background: #eff6ff; color: #2563eb; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </div>
        <div>
            <strong style="display: block; font-size: 13px; color: var(--text-main);">Edit Nota</strong>
            <span style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Mengubah nama, harga, atau rincian berat.</span>
            <div class="badge-premium" style="${displayStyle} display: flex; align-items: center; gap: 5px; color: #f59e0b; font-size: 9px; font-weight: 800; margin-top: 6px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span style="text-decoration: underline; text-underline-offset: 2px;">FITUR PREMIUM</span>
            </div>
        </div>
    </div>

    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 15px;">
        <div style="background: #eef2ff; color: #6366f1; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="12" y1="14" x2="12" y2="14.01"/></svg>
        </div>
        <div>
            <strong style="display: block; font-size: 13px; color: var(--text-main);">Kalkulator Tambahan</strong>
            <span style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Menghitung potongan atau tambahan uang di nota.</span>
            <div class="badge-premium" style="${displayStyle} display: flex; align-items: center; gap: 5px; color: #f59e0b; font-size: 9px; font-weight: 800; margin-top: 6px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span style="text-decoration: underline; text-underline-offset: 2px;">FITUR PREMIUM</span>
            </div>
        </div>
    </div>

    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 15px;">
        <div style="background: #fffbeb; color: #f59e0b; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
        </div>
        <div>
            <strong style="display: block; font-size: 13px; color: var(--text-main);">Kirim WhatsApp</strong>
            <span style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Mengirim rincian nota dalam bentuk teks rapi ke WA.</span>
            <div class="badge-premium" style="${displayStyle} display: flex; align-items: center; gap: 5px; color: #f59e0b; font-size: 9px; font-weight: 800; margin-top: 6px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span style="text-decoration: underline; text-underline-offset: 2px;">FITUR PREMIUM</span>
            </div>
        </div>
    </div>
    
    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 15px;">
        <div style="background: #f0fdfa; color: #0d9488; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </div>
        <div>
            <strong style="display: block; font-size: 13px; color: var(--text-main);">Download Struk</strong>
            <span style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Menyimpan struk digital ke memori HP sebagai Gambar.</span>
            <div class="badge-premium" style="${displayStyle} display: flex; align-items: center; gap: 5px; color: #f59e0b; font-size: 9px; font-weight: 800; margin-top: 6px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span style="text-decoration: underline; text-underline-offset: 2px;">FITUR PREMIUM</span>
            </div>
        </div>
    </div>

    <div style="background: var(--bg-card); padding: 15px; border-radius: 20px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 15px;">
        <div style="background: #fef2f2; color: #ef4444; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
        <div>
            <strong style="display: block; font-size: 13px; color: var(--text-main);">Hapus Nota</strong>
            <span style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Menghapus data nota secara permanen dari perangkat.</span>
        </div>
    </div>
</div>

       <div style="position: relative; margin-top: 30px; padding: 20px; background: var(--bg-card); border-radius: 25px; border: 1px solid var(--border-light); box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;">
    
    <div style="position: absolute; top: -15px; left: -15px; width: 60px; height: 60px; background: #fbbf24; opacity: 0.1; filter: blur(20px); border-radius: 50%;"></div>

    <div style="display: flex; gap: 18px; align-items: center; position: relative; z-index: 1;">
        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3); transform: rotate(-5deg);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18h6"></path>
                <path d="M10 22h4"></path>
                <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path>
            </svg>
        </div>

        <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 10px; font-weight: 900; color: #d97706; text-transform: uppercase; letter-spacing: 1.5px;">Tips</span>
                <div style="height: 2px; width: 20px; background: #fcd34d; border-radius: 2px;"></div>
            </div>
            <p style="margin: 0; font-size: 12.5px; color: var(--text-main); line-height: 1.5; font-weight: 600;">
                Aplikasi ini mendukung <span style="color: #d97706;">Mode Offline</span>. 
                <span style="display: block; font-size: 11px; color: var(--text-muted); font-weight: 500; margin-top: 2px;">
                    Jangan <u>refresh browser</u> saat input agar data tidak hilang dari layar.
                </span>
            </p>
        </div>
    </div>
</div>
            
<div style="background: var(--bg-card); border: 1px solid rgba(239, 68, 68, 0.2); padding: 20px; border-radius: 25px; margin-top: 20px; position: relative; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.05);">
    
    <div style="position: absolute; right: -10px; top: -10px; opacity: 0.05; transform: rotate(15deg); color: #ef4444;">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
    </div>

    <h4 style="color: #ef4444; font-size: 14px; font-weight: 900; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
        <div style="background: #ef4444; color: white; width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        PENTING: Keamanan Data
    </h4>
    
    <div style="padding-left: 36px;">
        <p style="font-size: 12px; color: var(--text-main); line-height: 1.6; margin: 0; font-weight: 500; opacity: 0.9;">
            Data Anda tersimpan di <span style="color: #ef4444; font-weight: 800; border-bottom: 1.5px solid #ef4444;">Penyimpanan Lokal HP</span>. Menghapus histori browser atau ganti perangkat akan menghilangkan data.
        </p>
        
        <div style="margin-top: 15px; display: inline-flex; align-items: center; gap: 8px; background: rgba(239, 68, 68, 0.1); padding: 6px 12px; border-radius: 10px; color: #ef4444; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="21 15 16 10 5 21"></polyline><polyline points="17 21 17 13 7 21"></polyline></svg>
            Gunakan Fitur Backup Secara Rutin
        </div>
    </div>
</div>
                    
            <!-- Area Aktivasi / Info Premium -->
            ${aktivasiSection}

            <!-- Footer -->
            <div style="text-align: center; margin-top: 50px; padding-bottom: 20px;">
    <div style="width: 50px; height: 2px; background: var(--border-light); margin: 0 auto 20px; border-radius: 2px; opacity: 0.5;"></div>
    
    <div style="display: inline-flex; align-items: center; gap: 8px; background: var(--bg-card); padding: 6px 16px; border-radius: 50px; border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
        <div style="width: 18px; height: 18px; background: var(--primary); border-radius: 5px; display: flex; align-items: center; justify-content: center; transform: rotate(-10deg);">
            <span style="color: white; font-size: 10px; font-weight: 900;">G</span>
        </div>
        
        <span style="font-size: 10px; font-weight: 800; color: var(--text-main); letter-spacing: 0.5px;">
            GUN ORIGINAL PROJECT
        </span>
        
        <span style="font-size: 8px; font-weight: 900; color: var(--primary); background: rgba(5, 150, 105, 0.1); padding: 2px 6px; border-radius: 6px;">
            V1.2
        </span>
    </div>
    
    <p style="font-size: 9px; color: var(--text-muted); margin-top: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
        Digital Solution Provider
    </p>
</div>
    `;
}

function tutupPanduan() {
    document.getElementById('halamanPanduan').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function verifikasiLisensiBaru() {
    const inputEl = document.getElementById('input-lisensi-baru');
    if (!inputEl) return;

    const input = inputEl.value.trim().toUpperCase();
    const btn = event.target;
    
    if (!input) {
        showToast("⚠️ Masukkan kode lisensi!");
        return;
    }

    const kodeValid = "GNP" + userDeviceId;

    const teksAsli = btn.innerText;
    btn.innerText = "MENGECEK...";
    btn.disabled = true;

    setTimeout(() => {
        if (input === kodeValid) {
            localStorage.setItem('gun_project_license', 'AKTIF');
            isPremium = true;
            
            tutupPanduan();
            
            const modalSukses = document.getElementById('modal-sukses-aktivasi');
            if (modalSukses) {
                modalSukses.classList.add('active');
            } else {
                alert("Aktivasi Berhasil! Silakan muat ulang halaman.");
                location.reload();
            }
        } else {
            const modalGagal = document.getElementById('modal-gagal-aktivasi');
            if (modalGagal) {
                const errorIdDisplay = document.getElementById('display-id-error');
                if(errorIdDisplay) errorIdDisplay.innerText = userDeviceId;
                
                modalGagal.classList.add('active');
            } else {
                showToast("❌ KODE SALAH! Coba lagi.");
            }
            
            btn.innerText = teksAsli;
            btn.disabled = false;
            inputEl.value = "";
            inputEl.focus();
        }
    }, 800);
}

function tutupModalGagal() {
    document.getElementById('modal-gagal-aktivasi').classList.remove('active');
}

function hubungiAdmin() {
    const text = `Halo Gun Project, saya mau beli Lisensi Premium. ID: ${userDeviceId}`;
    window.open(`https://wa.me/62816308466?text=${encodeURIComponent(text)}`, '_blank');
}

function proteksiPremium(fitur) {
    if (isPremium) return true;
    document.getElementById('premium-title').innerText = "Buka " + fitur;
    document.getElementById('modal-premium').classList.add('active');
    return false;
}

function tutupModalPremium() {
    document.getElementById('modal-premium').classList.remove('active');
}

/* ============================================================
   13. FUNGSI KEUANGAN
   ============================================================ */
function bukaMenuKeuangan() {
    renderKeuanganHalaman();
    document.getElementById('modal-menu-keuangan').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function tutupMenuKeuangan() {
    document.getElementById('modal-menu-keuangan').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function renderKeuanganContent() {
    const body = document.getElementById('modal-keuangan-body');
    const modalHeader = document.querySelector('#modal-menu-keuangan .modal-header');
    
    // Styling Header
    modalHeader.style.margin = "15px 15px 0";
    modalHeader.style.padding = "18px 20px";
    modalHeader.style.background = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";
    modalHeader.style.borderRadius = "25px";
    modalHeader.style.border = "1px solid rgba(255,255,255,0.1)";
    modalHeader.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
    
    const btnBack = modalHeader.querySelector('button');
    if (btnBack) {
        btnBack.style.background = 'rgba(255,255,255,0.1)';
        btnBack.style.color = 'white';
        btnBack.style.borderRadius = '12px';
        btnBack.style.width = '40px';
        btnBack.style.height = '40px';
        btnBack.style.display = 'flex';
        btnBack.style.alignItems = 'center';
        btnBack.style.justifyContent = 'center';
        btnBack.style.border = 'none';
    }

    const titleH2 = modalHeader.querySelector('h2');
    if (titleH2) {
        titleH2.style.color = 'white';
        titleH2.style.fontSize = '1.1rem';
        titleH2.style.fontWeight = '900';
        titleH2.style.margin = '0';
    }

    const subTitle = modalHeader.querySelector('span');
    if (subTitle) {
        subTitle.style.color = '#10b981';
        subTitle.style.fontSize = '9px';
        subTitle.style.fontWeight = '800';
        subTitle.style.letterSpacing = '1px';
    }
    
    // Logic Riwayat
    let riwayatHtml = '';
    const listRiwayat = [...dbKeuangan.riwayat].reverse().slice(0, 15);
    
    if (listRiwayat.length === 0) {
        riwayatHtml = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 40px; margin-bottom: 10px;">🍃</div>
                <p style="font-size: 13px; color: #94a3b8; font-weight: 600;">Belum ada catatan transaksi hari ini.</p>
            </div>`;
    } else {
        listRiwayat.forEach((r, idx) => {
            const originalIndex = dbKeuangan.riwayat.length - 1 - idx;
            const isMasuk = r.tipe === 'masuk';
            riwayatHtml += `
                <div class="riwayat-item" style="background:white; padding:16px; border-radius:20px; border:1px solid #f1f5f9; margin-bottom:12px; box-shadow:0 2px 5px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <div style="width: 42px; height: 42px; border-radius: 14px; background: ${isMasuk ? '#d1fae5' : '#fee2e2'}; display: flex; align-items: center; justify-content: center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isMasuk ? '#059669' : '#ef4444'}" stroke-width="3">
                                    ${isMasuk ? '<path d="M7 10l5 5 5-5M12 15V3"/>' : '<path d="M17 14l-5-5-5 5M12 9v12"/>'}
                                </svg>
                            </div>
                            <div>
                                <div style="font-size: 14px; font-weight: 800; color: #1e293b;">${r.ket}</div>
                                <div style="font-size: 10px; color: #94a3b8; font-weight: 700;">${r.waktu}</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 15px; font-weight: 900; color: ${isMasuk ? '#059669' : '#ef4444'};">
                                ${isMasuk ? '+' : '-'} ${r.jumlah.toLocaleString('id-ID')}
                            </div>
                            <div style="display: flex; gap: 5px; justify-content: flex-end; margin-top: 5px;">
                                <button onclick="bukaEditKeuangan(${originalIndex})" style="border:none; background:#f1f5f9; color:#64748b; padding:5px; border-radius:8px; cursor:pointer;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button onclick="konfirmasiHapusKeuangan(${originalIndex})" style="border:none; background:#fff1f2; color:#ef4444; padding:5px; border-radius:8px; cursor:pointer;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    }

    // Logic Pos
    let posHtml = '';
    dbKeuangan.pos.forEach(p => {
        const nominal = (p.persen / 100) * dbKeuangan.saldo;
        posHtml += `
            <div style="background: white; padding: 18px; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                <div style="width: 36px; height: 36px; background: ${p.warna}15; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                    <div style="width: 10px; height: 10px; background: ${p.warna}; border-radius: 3px;"></div>
                </div>
                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${p.nama}</div>
                <div style="font-size: 15px; font-weight: 900; color: #1e293b; margin-top: 2px;">Rp ${Math.round(nominal).toLocaleString('id-ID')}</div>
                <div style="font-size: 9px; color: ${p.warna}; font-weight: 800; margin-top: 4px;">Alokasi ${p.persen}%</div>
            </div>`;
    });

    // Render Body
    body.innerHTML = `
    <div style="padding: 25px 5px 120px;"> 
        <div class="keuangan-card" style="
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 35px;
            padding: 30px;
            color: white;
            box-shadow: 0 20px 40px rgba(16, 185, 129, 0.25);
            margin-bottom: 40px;
            position: relative;
            overflow: hidden;
        ">
            <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div style="font-size: 11px; font-weight: 800; opacity: 0.9; letter-spacing: 1px;">GUN DIGITAL WALLET</div>
                <div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </div>
            </div>
            
            <p style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; font-weight: 600;">Saldo Aktif</p>
            <div style="font-size: 2.6rem; font-weight: 900; letter-spacing: -1.5px; line-height: 1;">
                <span style="font-size: 1.2rem; vertical-align: middle; margin-right: 5px; opacity: 0.8;">Rp</span>${dbKeuangan.saldo.toLocaleString('id-ID')}
            </div>
        </div>

        <div style="display: flex; gap: 20px; margin-bottom: 40px; padding: 0 10px;">
            <button onclick="bukaInputKeuangan('masuk')" style="flex: 1; background: white; color: #10b981; border: 1px solid #f1f5f9; padding: 18px; border-radius: 50px; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); cursor: pointer;">
                <div style="width: 28px; height: 28px; background: #ecfdf5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">+</div>
                MASUK
            </button>
            <button onclick="bukaInputKeuangan('keluar')" style="flex: 1; background: white; color: #f43f5e; border: 1px solid #f1f5f9; padding: 18px; border-radius: 50px; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); cursor: pointer;">
                <div style="width: 28px; height: 28px; background: #fff1f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">-</div>
                KELUAR
            </button>
        </div>
            
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 10px;">
            <h3 style="font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Strategi Alokasi</h3>
            <button onclick="bukaSetPos()" style="background: #f1f5f9; border: none; width: 38px; height: 38px; border-radius: 12px; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 35px; padding: 0 5px;">
            ${posHtml}
        </div>
        
        <h3 style="font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; padding: 0 10px;">Aktivitas Terbaru</h3>
        <div style="padding: 0 5px;">${riwayatHtml}</div>

    </div>`;
}

function bukaInputKeuangan(tipe) {
    const header = document.getElementById('modal-input-header');
    const title = document.getElementById('modal-input-title');
    
    document.getElementById('edit-index-keuangan').value = '';
    document.getElementById('tipe-keuangan').value = tipe;
    document.getElementById('input-ket-keuangan').value = '';
    document.getElementById('input-jumlah-keuangan').value = '';
    
    if (tipe === 'masuk') {
        header.style.background = '#059669';
        title.innerText = 'Pemasukan Baru';
        document.getElementById('btn-simpan-keuangan').style.background = '#059669';
    } else {
        header.style.background = '#ef4444';
        title.innerText = 'Pengeluaran Baru';
        document.getElementById('btn-simpan-keuangan').style.background = '#ef4444';
    }
    
    document.getElementById('modal-input-keuangan').classList.add('active');
}

function bukaEditKeuangan(index) {
    const item = dbKeuangan.riwayat[index];
    
    const header = document.getElementById('modal-input-header');
    const title = document.getElementById('modal-input-title');
    
    header.style.background = '#f59e0b';
    title.innerText = 'Edit Catatan';
    document.getElementById('btn-simpan-keuangan').style.background = '#f59e0b';
    
    document.getElementById('edit-index-keuangan').value = index;
    document.getElementById('tipe-keuangan').value = item.tipe;
    document.getElementById('input-ket-keuangan').value = item.ket;
    document.getElementById('input-jumlah-keuangan').value = item.jumlah;
    
    document.getElementById('modal-input-keuangan').classList.add('active');
}

function tutupModalInputKeuangan() {
    document.getElementById('modal-input-keuangan').classList.remove('active');
}

function prosesSimpanKeuangan() {
    const ket = document.getElementById('input-ket-keuangan').value.trim();
    const jumlah = parseInt(document.getElementById('input-jumlah-keuangan').value);
    const index = document.getElementById('edit-index-keuangan').value;
    const tipe = document.getElementById('tipe-keuangan').value;

    if (!ket || isNaN(jumlah) || jumlah <= 0) {
        showToast("⚠️ Isi semua data!");
        return;
    }

    if (index === '') {
        // Baru
        if (tipe === 'keluar' && jumlah > dbKeuangan.saldo) {
            showToast("⚠️ Saldo tidak cukup!");
            return;
        }
        
        if (tipe === 'masuk') dbKeuangan.saldo += jumlah;
        else dbKeuangan.saldo -= jumlah;
        
        dbKeuangan.riwayat.push({
            id: Date.now(),
            tipe: tipe,
            ket: ket,
            jumlah: jumlah,
            waktu: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
        });
    } else {
        // Edit
        const idx = parseInt(index);
        const itemLama = dbKeuangan.riwayat[idx];
        
        if (itemLama.tipe === 'masuk') dbKeuangan.saldo -= itemLama.jumlah;
        else dbKeuangan.saldo += itemLama.jumlah;

        if (tipe === 'keluar' && jumlah > dbKeuangan.saldo) {
            // Rollback
            if (itemLama.tipe === 'masuk') dbKeuangan.saldo += itemLama.jumlah;
            else dbKeuangan.saldo -= itemLama.jumlah;
            showToast("⚠️ Saldo tidak cukup!");
            return;
        }

        if (tipe === 'masuk') dbKeuangan.saldo += jumlah;
        else dbKeuangan.saldo -= jumlah;

        dbKeuangan.riwayat[idx].ket = ket;
        dbKeuangan.riwayat[idx].jumlah = jumlah;
        dbKeuangan.riwayat[idx].tipe = tipe;
    }

    localStorage.setItem('gun_db_keuangan', JSON.stringify(dbKeuangan));
    tutupModalInputKeuangan();
    renderKeuanganHalaman();
    showToast("Catatan disimpan! ✅");
}

/* ============================================================
   14. FUNGSI HAPUS KEUANGAN
   ============================================================ */
function konfirmasiHapusKeuangan(index) {
    indexHapusKeuanganSementara = index;
    const item = dbKeuangan.riwayat[index];
    
    document.getElementById('teks-hapus-keuangan').innerHTML = 
        `Yakin hapus <strong>"${item.ket}"</strong>?<br><small style="color:#94a3b8">Rp ${item.jumlah.toLocaleString('id-ID')} akan dikembalikan.</small>`;
    
    document.getElementById('modal-hapus-keuangan').classList.add('active');
}

function tutupModalHapusKeuangan() {
    document.getElementById('modal-hapus-keuangan').classList.remove('active');
    indexHapusKeuanganSementara = null;
}

function prosesHapusKeuangan() {
    if (indexHapusKeuanganSementara !== null) {
        const item = dbKeuangan.riwayat[indexHapusKeuanganSementara];
        
        if (item.tipe === 'masuk') dbKeuangan.saldo -= item.jumlah;
        else dbKeuangan.saldo += item.jumlah;
        
        dbKeuangan.riwayat.splice(indexHapusKeuanganSementara, 1);
        
        localStorage.setItem('gun_db_keuangan', JSON.stringify(dbKeuangan));
        renderKeuanganHalaman();
        tutupModalHapusKeuangan();
        showToast("Catatan dihapus! 🗑️");
    }
}

document.getElementById('btn-konfirmasi-hapus-keuangan').onclick = prosesHapusKeuangan;

/* ============================================================
   15. FUNGSI SET POS
   ============================================================ */
function bukaSetPos() {
    const container = document.getElementById('form-edit-pos');
    container.innerHTML = '';
    
    dbKeuangan.pos.forEach((p, idx) => {
        container.innerHTML += `
            <div style="background: white; padding: 20px; border-radius: 24px; margin-bottom: 15px; border: 1px solid #f1f5f9;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                    <div style="width: 12px; height: 12px; background: ${p.warna}; border-radius: 4px;"></div>
                    <input type="text" class="edit-pos-nama" value="${p.nama}" style="border: none; background: none; font-weight: 800; color: #1e293b; font-size: 14px; width: 100%; outline: none;">
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="flex: 1;">
                        <input type="range" class="edit-pos-range" min="0" max="100" step="5" value="${p.persen}" oninput="updateDariRange(this, ${idx})" style="width: 100%; accent-color: ${p.warna}; cursor: pointer;">
                    </div>
                    <div style="width: 70px;">
                        <input type="number" class="edit-pos-persen" value="${p.persen}" oninput="updateDariInput(this, ${idx})" style="width: 100%; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: 900; font-size: 15px;">
                    </div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('modal-set-pos').classList.add('active');
    cekTotalPersen();
}

function tutupSetPos() {
    document.getElementById('modal-set-pos').classList.remove('active');
}

function updateDariRange(el, idx) {
    document.querySelectorAll('.edit-pos-persen')[idx].value = el.value;
    cekTotalPersen();
}

function updateDariInput(el, idx) {
    document.querySelectorAll('.edit-pos-range')[idx].value = el.value;
    cekTotalPersen();
}

function cekTotalPersen() {
    const inputs = document.querySelectorAll('.edit-pos-persen');
    let total = 0;
    inputs.forEach(input => total += (parseInt(input.value) || 0));
    
    const notifAngka = document.getElementById('notif-persen');
    const notifTeks = document.getElementById('notif-status-teks');
    const progressBar = document.getElementById('progress-bar-total');
    const btn = document.getElementById('btn-save-pos');
    
    notifAngka.innerText = total + '%';
    progressBar.style.width = Math.min(total, 100) + '%';
    
    if (total === 100) {
        notifAngka.style.color = "#059669";
        notifTeks.innerText = "ALOKASI SEMPURNA ✅";
        notifTeks.style.color = "#059669";
        progressBar.style.background = "#059669";
        btn.disabled = false;
        btn.style.opacity = "1";
    } else {
        notifAngka.style.color = "#ef4444";
        notifTeks.innerText = total > 100 ? "MELEBIHI 100% ⚠️" : "BELUM 100% ⚠️";
        notifTeks.style.color = "#ef4444";
        progressBar.style.background = "#ef4444";
        btn.disabled = true;
        btn.style.opacity = "0.5";
    }
}

function simpanPengaturanPos() {
    const inputsPersen = document.querySelectorAll('.edit-pos-persen');
    const inputsNama = document.querySelectorAll('.edit-pos-nama');
    
    let total = 0;
    let posBaru = [];
    
    for (let i = 0; i < dbKeuangan.pos.length; i++) {
        const namaBaru = inputsNama[i].value.trim() || "Pos " + (i+1);
        const persenBaru = parseInt(inputsPersen[i].value) || 0;
        total += persenBaru;
        
        posBaru.push({
            nama: namaBaru,
            persen: persenBaru,
            warna: dbKeuangan.pos[i].warna
        });
    }
    
    if (total !== 100) {
        showToast("⚠️ Total harus 100%!");
        return;
    }
    
    dbKeuangan.pos = posBaru;
    localStorage.setItem('gun_db_keuangan', JSON.stringify(dbKeuangan));
    renderKeuanganHalaman();
    tutupSetPos();
    showToast("Strategi disimpan! 🎯");
}

// 1. Fungsi Utama Ganti Tema
function toggleTema(isDark) {
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('gun_theme', 'dark');
        showToast("Mode Gelap Aktif 🌙");
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('gun_theme', 'light');
        showToast("Mode Terang Aktif ☀️");
    }
}

// 2. Fungsi Load Tema saat Aplikasi Pertama Kali Dibuka
function initTheme() {
    const savedTheme = localStorage.getItem('gun_theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

// 3. Jalankan Fungsi Load Tema Segera
initTheme();

function renderHeaderLogo() {
    const area = document.getElementById('header-logo-area');
    if (!area) return;

    if (isPremium) {
        const userProfile = JSON.parse(localStorage.getItem('gun_user_profile')) || { nama: 'Gunawan Gunawan' };
        const savedPhoto = localStorage.getItem('gun_user_photo'); 
        const inisial = userProfile.nama.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 1);

        area.innerHTML = `
            <div style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--primary); position: relative; background: var(--bg-card); box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                ${savedPhoto ? 
                    `<img src="${savedPhoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                    `<span style="color: var(--primary); font-weight: 900; font-size: 16px;">${inisial}</span>`
                }
                <div style="position: absolute; bottom: -2px; right: -2px; background: #fbbf24; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; border: 2px solid var(--bg-card); z-index: 10;">👑</div>
            </div>
        `;
    }
}

function prosesUnggahFoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataFoto = e.target.result;
            // Simpan ke localStorage
            localStorage.setItem('gun_user_photo', dataFoto);
            // Update tampilan
            renderHeaderLogo();
            renderPengaturanHalaman(); // Refresh halaman pengaturan agar preview update
            showToast("Foto profil diperbarui! 📸");
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updateNavLockStatus() {
    const items = document.querySelectorAll('.nav-item');
    if (!isPremium) {
        // Tambahkan indikator gembok saja tanpa mematikan animasi
        const lockedIndexes = [2, 4]; 
        lockedIndexes.forEach(idx => {
            if (items[idx]) {
                items[idx].classList.add('nav-locked-style');
                const wrapper = items[idx].querySelector('.nav-icon-wrapper');
                if (wrapper && !wrapper.querySelector('.lock-badge')) {
                    const lock = document.createElement('div');
                    lock.className = 'lock-badge';
                    lock.innerHTML = '🔒';
                    wrapper.appendChild(lock);
                }
            }
        });
    }
}

function prosesHapusNota() {
    if (idHapusNotaSementara) {
        // Cari nama sebelum dihapus buat pesan toast
        const notaDihapus = database.find(n => n.id === idHapusNotaSementara);
        const namaUser = notaDihapus ? notaDihapus.nama : "Nota";

        database = database.filter(n => n.id !== idHapusNotaSementara);
        localStorage.setItem('database_karet_final', JSON.stringify(database));
        
        tampilkanData(database);
        
        // Tutup dulu modalnya baru munculin toast
        tutupModalHapusNota();
        
        setTimeout(() => {
            showToast(`🗑️ Nota ${namaUser} berhasil dibuang!`);
        }, 300);
    }
}

function hapusSemuaData() {
    const modal = document.getElementById('modal-danger-zone');
    const input = document.getElementById('input-konfirmasi-bahaya');
    const btn = document.getElementById('btn-eksekusi-reset');
    
    input.value = ''; // Reset input
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    
    modal.classList.add('active');
    
    // Cek ketikan user secara real-time
    input.oninput = function() {
        if (this.value.toUpperCase() === 'HAPUS') {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        } else {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        }
    };
}

function tutupModalDanger() {
    document.getElementById('modal-danger-zone').classList.remove('active');
}

document.getElementById('btn-eksekusi-reset').onclick = function() {
    localStorage.removeItem('database_karet_final');
    localStorage.removeItem('gun_db_keuangan');
    
    showToast("💥 BOOM! Data telah dibersihkan.");
    setTimeout(() => location.reload(), 1500);
};

// Panggil fungsi ini setiap kali aplikasi dimuat
// Jalankan di paling bawah script
initTheme();
renderHeaderLogo(); 
tampilkanData(database);
updateNavLockStatus(); // Memasukkan gembok
