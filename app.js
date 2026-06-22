// --- State Management ---
const STORAGE_KEY = 'SPK_DATA_V1';

const defaultData = {
    kriteria: [
        { id: 'k1', nama: 'Grafis', tipe: 'benefit', bobot: 30, target: 8, factor_type: 'core' },
        { id: 'k2', nama: 'Gameplay', tipe: 'benefit', bobot: 40, target: 8, factor_type: 'core' },
        { id: 'k3', nama: 'Harga (Ribuan Rp)', tipe: 'cost', bobot: 20, target: 300, factor_type: 'secondary' },
        { id: 'k4', nama: 'Storage (GB)', tipe: 'cost', bobot: 10, target: 10, factor_type: 'secondary' }
    ],
    alternatif: [
        { id: 'a1', nama: 'Cyberpunk 2077', penilaian: { 'k1': 9, 'k2': 8, 'k3': 600, 'k4': 70 } },
        { id: 'a2', nama: 'The Witcher 3', penilaian: { 'k1': 8, 'k2': 9, 'k3': 300, 'k4': 50 } },
        { id: 'a3', nama: 'Stardew Valley', penilaian: { 'k1': 7, 'k2': 9, 'k3': 150, 'k4': 2 } }
    ],
    ahpMatrix: {}
};

let appState = { kriteria: [], alternatif: [], ahpMatrix: {} };

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        appState = JSON.parse(saved);
        // Ensure backwards compatibility with old criteria
        appState.kriteria.forEach(k => {
            if (k.target === undefined) k.target = 3;
            if (k.factor_type === undefined) k.factor_type = 'core';
        });
        if (!appState.ahpMatrix) appState.ahpMatrix = {};
    } else {
        appState = JSON.parse(JSON.stringify(defaultData));
        saveData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

// --- Init & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupNavigation();
    setupModals();
    renderKriteria();
    renderAlternatif();

    document.getElementById('btn-reset-data').addEventListener('click', () => {
        if(confirm('Apakah Anda yakin ingin menghapus semua data dan kembali ke data bawaan?')) {
            localStorage.removeItem(STORAGE_KEY);
            loadData();
            renderKriteria();
            renderAlternatif();
            alert('Data berhasil di-reset!');
        }
    });
});

// --- Navigation ---
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn[data-target]');
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            navBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'view-perhitungan') {
                document.querySelector('.calc-tab.active').click(); // trigger render calc
            }
        });
    });

    const calcTabs = document.querySelectorAll('.calc-tab');
    calcTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            calcTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderPerhitungan(e.target.getAttribute('data-method'));
        });
    });
}

// --- Modals Logic ---
function setupModals() {
    // Open Modals
    document.getElementById('btn-add-kriteria').addEventListener('click', () => {
        document.getElementById('kriteria-id').value = '';
        document.getElementById('form-kriteria').reset();
        document.getElementById('kriteria-target').value = '3';
        document.getElementById('kriteria-factor-type').value = 'core';
        document.getElementById('modal-kriteria-title').textContent = 'Tambah Kriteria';
        document.getElementById('modal-kriteria').classList.add('active');
    });

    document.getElementById('btn-add-alternatif').addEventListener('click', () => {
        document.getElementById('alternatif-id').value = '';
        document.getElementById('alternatif-nama').value = '';
        
        // Generate inputs for penilaian
        const container = document.getElementById('penilaian-inputs-container');
        container.innerHTML = '<h4>Penilaian</h4>';
        appState.kriteria.forEach(k => {
            container.innerHTML += `
                <div class="form-group">
                    <label>${k.nama} (${k.tipe})</label>
                    <input type="number" step="0.01" class="input-penilaian" data-kriteria="${k.id}" required>
                </div>
            `;
        });

        document.getElementById('modal-alternatif-title').textContent = 'Tambah Alternatif';
        document.getElementById('modal-alternatif').classList.add('active');
    });

    // Close Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.neo-modal').forEach(m => m.classList.remove('active'));
        });
    });

    // Save Kriteria
    document.getElementById('form-kriteria').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('kriteria-id').value || 'k' + Date.now();
        const nama = document.getElementById('kriteria-nama').value;
        const tipe = document.getElementById('kriteria-tipe').value;
        const bobot = parseFloat(document.getElementById('kriteria-bobot').value);
        const target = parseFloat(document.getElementById('kriteria-target').value) || 3;
        const factor_type = document.getElementById('kriteria-factor-type').value;

        const existIndex = appState.kriteria.findIndex(k => k.id === id);
        if (existIndex > -1) {
            appState.kriteria[existIndex] = { id, nama, tipe, bobot, target, factor_type };
        } else {
            appState.kriteria.push({ id, nama, tipe, bobot, target, factor_type });
            // Add default 0 score for new kriteria in all alternatifs
            appState.alternatif.forEach(a => a.penilaian[id] = 0);
        }

        saveData();
        renderKriteria();
        renderAlternatif();
        document.getElementById('modal-kriteria').classList.remove('active');
    });

    // Save Alternatif
    document.getElementById('form-alternatif').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('alternatif-id').value || 'a' + Date.now();
        const nama = document.getElementById('alternatif-nama').value;
        
        const penilaian = {};
        document.querySelectorAll('.input-penilaian').forEach(input => {
            penilaian[input.getAttribute('data-kriteria')] = parseFloat(input.value);
        });

        const existIndex = appState.alternatif.findIndex(a => a.id === id);
        if (existIndex > -1) {
            appState.alternatif[existIndex] = { id, nama, penilaian };
        } else {
            appState.alternatif.push({ id, nama, penilaian });
        }

        saveData();
        renderAlternatif();
        document.getElementById('modal-alternatif').classList.remove('active');
    });
}

// --- Render UI ---
function renderKriteria() {
    const tbody = document.querySelector('#table-kriteria tbody');
    tbody.innerHTML = '';
    let totalBobot = 0;

    appState.kriteria.forEach((k, index) => {
        totalBobot += k.bobot;
        tbody.innerHTML += `
            <tr>
                <td>K${index + 1}</td>
                <td>${k.nama}</td>
                <td>${k.tipe.toUpperCase()}</td>
                <td>${k.bobot}</td>
                <td>${k.target !== undefined ? k.target : 3}</td>
                <td>${k.factor_type === 'core' ? 'Core (CF)' : 'Secondary (SF)'}</td>
                <td>
                    <button class="neo-btn btn-small btn-primary" onclick="editKriteria('${k.id}')">Edit</button>
                    <button class="neo-btn btn-small btn-danger" onclick="deleteKriteria('${k.id}')">Hapus</button>
                </td>
            </tr>
        `;
    });
    
    if(appState.kriteria.length > 0) {
        tbody.innerHTML += `
            <tr style="background: var(--text-color); color: var(--surface); font-weight: bold;">
                <td colspan="3" style="text-align: right;">Total Bobot:</td>
                <td>${totalBobot}</td>
                <td colspan="3"></td>
            </tr>
        `;
    }
}

window.editKriteria = function(id) {
    const k = appState.kriteria.find(item => item.id === id);
    if (k) {
        document.getElementById('kriteria-id').value = k.id;
        document.getElementById('kriteria-nama').value = k.nama;
        document.getElementById('kriteria-tipe').value = k.tipe;
        document.getElementById('kriteria-bobot').value = k.bobot;
        document.getElementById('kriteria-target').value = k.target !== undefined ? k.target : 3;
        document.getElementById('kriteria-factor-type').value = k.factor_type || 'core';
        document.getElementById('modal-kriteria-title').textContent = 'Edit Kriteria';
        document.getElementById('modal-kriteria').classList.add('active');
    }
}

window.deleteKriteria = function(id) {
    if(confirm('Hapus kriteria ini?')) {
        appState.kriteria = appState.kriteria.filter(k => k.id !== id);
        // remove score from alternatifs
        appState.alternatif.forEach(a => delete a.penilaian[id]);
        saveData();
        renderKriteria();
        renderAlternatif();
    }
}

function renderAlternatif() {
    const theadTr = document.getElementById('table-alternatif-header');
    const tbody = document.querySelector('#table-alternatif tbody');
    
    // Update Header
    theadTr.innerHTML = `<th>ID</th><th>Nama Alternatif</th>`;
    appState.kriteria.forEach(k => {
        theadTr.innerHTML += `<th>${k.nama}</th>`;
    });
    theadTr.innerHTML += `<th>Aksi</th>`;

    // Update Body
    tbody.innerHTML = '';
    appState.alternatif.forEach((a, index) => {
        let row = `<tr><td>A${index + 1}</td><td>${a.nama}</td>`;
        appState.kriteria.forEach(k => {
            row += `<td>${a.penilaian[k.id] !== undefined ? a.penilaian[k.id] : 0}</td>`;
        });
        row += `<td><button class="neo-btn btn-small btn-danger" onclick="deleteAlternatif('${a.id}')">Hapus</button></td></tr>`;
        tbody.innerHTML += row;
    });
}

window.deleteAlternatif = function(id) {
    if(confirm('Hapus alternatif ini?')) {
        appState.alternatif = appState.alternatif.filter(a => a.id !== id);
        saveData();
        renderAlternatif();
    }
}

// --- Math & Calculations ---
function renderPerhitungan(method) {
    const container = document.getElementById('calc-result-container');
    
    if (appState.kriteria.length === 0 || appState.alternatif.length === 0) {
        container.innerHTML = `<div class="neo-modal active" style="position:relative; background:none"><div class="modal-content"><h3 style="color:var(--danger)">Error</h3><p>Data kriteria atau alternatif masih kosong.</p></div></div>`;
        return;
    }

    let resultHTML = '';
    let hasilAkhir = [];
    const totalBobot = appState.kriteria.reduce((sum, k) => sum + k.bobot, 0);

    // Min Max finder
    const minMax = {};
    appState.kriteria.forEach(k => {
        const values = appState.alternatif.map(a => a.penilaian[k.id] || 0);
        minMax[k.id] = { max: Math.max(...values), min: Math.min(...values) };
    });

    if (method === 'saw') {
        resultHTML += `
            <div style="background:var(--secondary); padding:1.5rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                <h3 style="margin-bottom:0.5rem; border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">Rumus Perhitungan SAW</h3>
                <div style="display:flex; flex-wrap:wrap; gap:1rem;">
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>1. Normalisasi (R)</h4>
                        <p style="font-size:0.9rem;"><strong>Benefit:</strong> r = x / max(x)</p>
                        <p style="font-size:0.9rem;"><strong>Cost:</strong> r = min(x) / x</p>
                    </div>
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>2. Nilai Preferensi (V)</h4>
                        <p style="font-size:0.9rem;">V = &sum; (w &times; r)</p>
                        <p style="font-size:0.8rem; color:#555;">*w: bobot, r: normalisasi</p>
                    </div>
                </div>
            </div>
        `;

        resultHTML += `<h3>1. Matriks Keputusan (X)</h3>`;
        resultHTML += buildMatrixTable('Keputusan', (a, k) => a.penilaian[k.id] || 0);

        resultHTML += `<h3>2. Proses Normalisasi Detail (R<sub>ij</sub>)</h3>`;
        let normDetailTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif / Kriteria</th>`;
        appState.kriteria.forEach(k => normDetailTable += `<th>${k.nama}</th>`);
        normDetailTable += `</tr></thead><tbody>`;
        appState.alternatif.forEach(a => {
            normDetailTable += `<tr><td><strong>${a.nama}</strong></td>`;
            appState.kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                let calcStr = "";
                let n = 0;
                if (k.tipe === 'benefit') {
                    calcStr = `${val} / ${minMax[k.id].max}`;
                    n = minMax[k.id].max !== 0 ? val / minMax[k.id].max : 0;
                } else {
                    calcStr = `${minMax[k.id].min} / ${val}`;
                    n = val !== 0 ? minMax[k.id].min / val : 0;
                }
                normDetailTable += `<td><div style="font-size:0.8rem; color:#555; font-family:monospace;">${calcStr}</div><strong>${parseFloat(n.toFixed(3))}</strong></td>`;
            });
            normDetailTable += `</tr>`;
        });
        normDetailTable += `</tbody></table>`;
        resultHTML += normDetailTable;

        resultHTML += `<h3>3. Matriks Normalisasi (R)</h3>`;
        resultHTML += buildMatrixTable('Normalisasi', (a, k) => {
            const val = a.penilaian[k.id] || 0;
            if (k.tipe === 'benefit') return minMax[k.id].max !== 0 ? val / minMax[k.id].max : 0;
            return val !== 0 ? minMax[k.id].min / val : 0;
        });

        resultHTML += `<h3>4. Proses Perhitungan Detail (V<sub>i</sub>)</h3>`;
        let processTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Proses Perhitungan (W &times; R)</th><th>Hasil Akhir (V)</th></tr></thead><tbody>`;
        
        appState.alternatif.forEach(a => {
            let total = 0;
            let processStrArr = [];
            appState.kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                let n = 0;
                if (k.tipe === 'benefit') n = minMax[k.id].max !== 0 ? val / minMax[k.id].max : 0;
                else n = val !== 0 ? minMax[k.id].min / val : 0;
                
                const w = k.bobot / totalBobot;
                processStrArr.push(`(${parseFloat(w.toFixed(2))} &times; ${parseFloat(n.toFixed(3))})`);
                total += n * w;
            });
            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: total });
            processTable += `<tr><td><strong>${a.nama}</strong></td><td><div style="font-size:0.9rem; font-family:monospace;">${processStrArr.join(' + ')}</div></td><td style="font-weight:bold; color:var(--text-color); font-size:1.1rem;">${parseFloat(total.toFixed(4))}</td></tr>`;
        });
        processTable += `</tbody></table>`;
        resultHTML += processTable;

    } else if (method === 'wp') {
        resultHTML += `
            <div style="background:var(--secondary); padding:1.5rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                <h3 style="margin-bottom:0.5rem; border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">Rumus Perhitungan WP</h3>
                <div style="display:flex; flex-wrap:wrap; gap:1rem;">
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>1. Perbaikan Bobot (W)</h4>
                        <p style="font-size:0.9rem;">W = Bobot / &sum;Bobot</p>
                        <p style="font-size:0.8rem; color:#555;">(Positif untuk benefit, negatif untuk cost)</p>
                    </div>
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>2. Vektor S & V</h4>
                        <p style="font-size:0.9rem;">S = &prod; X<sup>W</sup></p>
                        <p style="font-size:0.9rem;">V = S / &sum;S</p>
                    </div>
                </div>
            </div>
        `;

        resultHTML += `<h3>1. Bobot Relatif (W<sub>j</sub>)</h3>`;
        let wRelTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr>`;
        appState.kriteria.forEach(k => wRelTable += `<th>${k.nama}</th>`);
        wRelTable += `</tr></thead><tbody><tr>`;
        
        const wRel = {};
        appState.kriteria.forEach(k => {
            wRel[k.id] = k.tipe === 'benefit' ? (k.bobot / totalBobot) : -(k.bobot / totalBobot);
            wRelTable += `<td>${parseFloat(wRel[k.id].toFixed(4))}</td>`;
        });
        wRelTable += `</tr></tbody></table>`;
        resultHTML += wRelTable;

        resultHTML += `<h3>2. Perhitungan Vektor S</h3>`;
        let sTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Proses Perkalian (X<sup>w</sup>)</th><th>Nilai S</th></tr></thead><tbody>`;
        let totalS = 0;
        const vectorS = {};

        appState.alternatif.forEach(a => {
            let s = 1;
            let processStrArr = [];
            appState.kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 1; // avoid 0^neg
                const valS = Math.pow(val === 0 ? 0.0001 : val, wRel[k.id]);
                s *= valS;
                processStrArr.push(`(${val}<sup>${parseFloat(wRel[k.id].toFixed(2))}</sup>)`);
            });
            vectorS[a.id] = s;
            totalS += s;
            sTable += `<tr><td><strong>${a.nama}</strong></td><td><div style="font-size:0.9rem; font-family:monospace;">${processStrArr.join(' &times; ')}</div></td><td><strong>${parseFloat(s.toFixed(6))}</strong></td></tr>`;
        });
        sTable += `</tbody></table>`;
        resultHTML += sTable;

        appState.alternatif.forEach(a => {
            const v = totalS !== 0 ? vectorS[a.id] / totalS : 0;
            hasilAkhir.push({ id: a.id, nama: a.nama, vector_s: vectorS[a.id], nilai: v });
        });

    } else if (method === 'smart') {
        resultHTML += `
            <div style="background:var(--secondary); padding:1.5rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                <h3 style="margin-bottom:0.5rem; border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">Rumus Perhitungan SMART</h3>
                <div style="display:flex; flex-wrap:wrap; gap:1rem;">
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>1. Normalisasi Bobot</h4>
                        <p style="font-size:0.9rem;">W = Bobot / &sum;Bobot</p>
                        <br>
                        <h4>2. Nilai Utility (u)</h4>
                        <p style="font-size:0.9rem;"><strong>Benefit:</strong> (X - Min) / (Max - Min)</p>
                        <p style="font-size:0.9rem;"><strong>Cost:</strong> (Max - X) / (Max - Min)</p>
                    </div>
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>3. Nilai Akhir (V)</h4>
                        <p style="font-size:0.9rem;">V = &sum; (Bobot Normalisasi &times; Utility)</p>
                    </div>
                </div>
            </div>
        `;

        resultHTML += `<h3>1. Normalisasi Bobot Kriteria (W<sub>j</sub>)</h3>`;
        let wNormTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr>`;
        appState.kriteria.forEach(k => wNormTable += `<th>${k.nama}</th>`);
        wNormTable += `</tr></thead><tbody><tr>`;
        appState.kriteria.forEach(k => {
            const w = k.bobot / totalBobot;
            wNormTable += `<td>${parseFloat(w.toFixed(4))}</td>`;
        });
        wNormTable += `</tr></tbody></table>`;
        resultHTML += wNormTable;

        resultHTML += `<h3>2. Matriks Utility (U<sub>ij</sub>)</h3>`;
        resultHTML += buildMatrixTable('Utility', (a, k) => {
            const val = a.penilaian[k.id] || 0;
            const min = minMax[k.id].min;
            const max = minMax[k.id].max;
            if (max - min === 0) return 1;
            
            if (k.tipe === 'benefit') return (val - min) / (max - min);
            return (max - val) / (max - min);
        });

        resultHTML += `<h3>3. Proses Perhitungan Detail (V<sub>i</sub>)</h3>`;
        let processTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Proses (W &times; U)</th><th>Nilai V</th></tr></thead><tbody>`;
        
        appState.alternatif.forEach(a => {
            let total = 0;
            let processStrArr = [];
            appState.kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const min = minMax[k.id].min;
                const max = minMax[k.id].max;
                let u = 1;
                if (max - min !== 0) {
                    if (k.tipe === 'benefit') u = (val - min) / (max - min);
                    else u = (max - val) / (max - min);
                }
                const w = k.bobot / totalBobot;
                processStrArr.push(`(${parseFloat(w.toFixed(2))} &times; ${parseFloat(u.toFixed(3))})`);
                total += u * w;
            });
            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: total });
            processTable += `<tr><td><strong>${a.nama}</strong></td><td><div style="font-size:0.9rem; font-family:monospace;">${processStrArr.join(' + ')}</div></td><td><strong style="font-size:1.1rem;">${parseFloat(total.toFixed(4))}</strong></td></tr>`;
        });
        processTable += `</tbody></table>`;
        resultHTML += processTable;

    } else if (method === 'ahp') {
        const n = appState.kriteria.length;
        if (!appState.ahpMatrix) appState.ahpMatrix = {};

        resultHTML += `
            <div style="background:var(--secondary); padding:1.5rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                <h3 style="margin-bottom:0.5rem; border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">Metode AHP - Pembobotan Kriteria</h3>
                <p style="font-size:0.9rem; margin-bottom:1rem;">
                    Gunakan tabel di bawah ini untuk menentukan tingkat kepentingan relatif antar kriteria. Nilai kebalikannya (reciprocal) akan dihitung secara otomatis.
                </p>
                <div style="font-size:0.8rem; background:#fff; padding:0.8rem; border:2px solid var(--border-color); border-radius:4px; margin-bottom:1rem;">
                    <strong>Skala Saaty:</strong> 1 = Sama penting, 3 = Sedikit lebih penting, 5 = Lebih penting, 7 = Sangat lebih penting, 9 = Mutlak lebih penting. (2,4,6,8 adalah nilai antaranya).
                </div>
            </div>
        `;

        resultHTML += `<h3>1. Matriks Perbandingan Berpasangan Kriteria</h3>`;
        let matrixTable = `<div class="table-container" style="margin-bottom:2rem;"><table class="neo-table"><thead><tr><th>Kriteria</th>`;
        appState.kriteria.forEach(k => matrixTable += `<th>${k.nama}</th>`);
        matrixTable += `</tr></thead><tbody>`;

        const ahpVals = {};
        appState.kriteria.forEach((rowK) => {
            ahpVals[rowK.id] = {};
            appState.kriteria.forEach((colK) => {
                if (rowK.id === colK.id) {
                    ahpVals[rowK.id][colK.id] = 1.0;
                } else {
                    const key = rowK.id + '-' + colK.id;
                    const revKey = colK.id + '-' + rowK.id;
                    if (appState.ahpMatrix[key] !== undefined) {
                        ahpVals[rowK.id][colK.id] = appState.ahpMatrix[key];
                    } else if (appState.ahpMatrix[revKey] !== undefined) {
                        ahpVals[rowK.id][colK.id] = 1.0 / appState.ahpMatrix[revKey];
                    } else {
                        ahpVals[rowK.id][colK.id] = 1.0;
                    }
                }
            });
        });

        appState.kriteria.forEach((rowK, rIdx) => {
            matrixTable += `<tr><td><strong>${rowK.nama}</strong></td>`;
            appState.kriteria.forEach((colK, cIdx) => {
                if (rIdx === cIdx) {
                    matrixTable += `<td style="background:#f0f0f0; text-align:center; font-weight:bold;">1</td>`;
                } else if (rIdx < cIdx) {
                    const curVal = ahpVals[rowK.id][colK.id];
                    matrixTable += `<td>
                        <select onchange="updateAhpMatrix('${rowK.id}', '${colK.id}', this.value)" style="padding:4px; font-size:0.85rem; border:2px solid var(--border-color); width:100%;">
                            <option value="1" ${curVal === 1 ? 'selected' : ''}>1 - Sama penting</option>
                            <option value="2" ${Math.abs(curVal - 2) < 0.01 ? 'selected' : ''}>2 - Nilai Antara (2)</option>
                            <option value="3" ${Math.abs(curVal - 3) < 0.01 ? 'selected' : ''}>3 - Cukup penting</option>
                            <option value="4" ${Math.abs(curVal - 4) < 0.01 ? 'selected' : ''}>4 - Nilai Antara (4)</option>
                            <option value="5" ${Math.abs(curVal - 5) < 0.01 ? 'selected' : ''}>5 - Lebih penting</option>
                            <option value="6" ${Math.abs(curVal - 6) < 0.01 ? 'selected' : ''}>6 - Nilai Antara (6)</option>
                            <option value="7" ${Math.abs(curVal - 7) < 0.01 ? 'selected' : ''}>7 - Sangat penting</option>
                            <option value="8" ${Math.abs(curVal - 8) < 0.01 ? 'selected' : ''}>8 - Nilai Antara (8)</option>
                            <option value="9" ${Math.abs(curVal - 9) < 0.01 ? 'selected' : ''}>9 - Mutlak penting</option>
                            
                            <option value="0.5" ${Math.abs(curVal - 0.5) < 0.01 ? 'selected' : ''}>1/2 - Nilai Antara (1/2)</option>
                            <option value="0.333333" ${Math.abs(curVal - 0.333333) < 0.01 ? 'selected' : ''}>1/3 - Cukup tidak penting</option>
                            <option value="0.25" ${Math.abs(curVal - 0.25) < 0.01 ? 'selected' : ''}>1/4 - Nilai Antara (1/4)</option>
                            <option value="0.2" ${Math.abs(curVal - 0.2) < 0.01 ? 'selected' : ''}>1/5 - Lebih tidak penting</option>
                            <option value="0.166667" ${Math.abs(curVal - 0.166667) < 0.01 ? 'selected' : ''}>1/6 - Nilai Antara (1/6)</option>
                            <option value="0.142857" ${Math.abs(curVal - 0.142857) < 0.01 ? 'selected' : ''}>1/7 - Sangat tidak penting</option>
                            <option value="0.125" ${Math.abs(curVal - 0.125) < 0.01 ? 'selected' : ''}>1/8 - Nilai Antara (1/8)</option>
                            <option value="0.111111" ${Math.abs(curVal - 0.111111) < 0.01 ? 'selected' : ''}>1/9 - Mutlak tidak penting</option>
                        </select>
                    </td>`;
                } else {
                    const val = ahpVals[rowK.id][colK.id];
                    matrixTable += `<td style="background:#fafafa; font-family:monospace; font-size:0.9rem;">${val >= 1 ? parseFloat(val.toFixed(2)) : '1/' + Math.round(1/val)} (${parseFloat(val.toFixed(3))})</td>`;
                }
            });
            matrixTable += `</tr>`;
        });
        
        matrixTable += `<tr style="font-weight:bold; background:#e9d5ff;"><td>Total Kolom</td>`;
        const colSums = {};
        appState.kriteria.forEach(colK => {
            let colSum = 0;
            appState.kriteria.forEach(rowK => {
                colSum += ahpVals[rowK.id][colK.id];
            });
            colSums[colK.id] = colSum;
            matrixTable += `<td>${parseFloat(colSum.toFixed(3))}</td>`;
        });
        matrixTable += `</tr></tbody></table></div>`;
        resultHTML += matrixTable;

        resultHTML += `<h3>2. Matriks Normalisasi & Priority Vector (Bobot AHP)</h3>`;
        let normTable = `<div class="table-container" style="margin-bottom:2rem;"><table class="neo-table"><thead><tr><th>Kriteria</th>`;
        appState.kriteria.forEach(k => normTable += `<th>${k.nama}</th>`);
        normTable += `<th style="background:var(--success)">Bobot (Priority Vector)</th></tr></thead><tbody>`;

        const ahpWeights = {};
        const normMatrix = {};
        appState.kriteria.forEach(rowK => {
            normMatrix[rowK.id] = {};
            let rowSum = 0;
            appState.kriteria.forEach(colK => {
                const normVal = ahpVals[rowK.id][colK.id] / colSums[colK.id];
                normMatrix[rowK.id][colK.id] = normVal;
                rowSum += normVal;
            });
            ahpWeights[rowK.id] = rowSum / n;
        });

        appState.kriteria.forEach(rowK => {
            normTable += `<tr><td><strong>${rowK.nama}</strong></td>`;
            appState.kriteria.forEach(colK => {
                normTable += `<td>${parseFloat(normMatrix[rowK.id][colK.id].toFixed(4))}</td>`;
            });
            normTable += `<td style="font-weight:bold; background:#f0fdf4;">${parseFloat(ahpWeights[rowK.id].toFixed(4))}</td></tr>`;
        });
        normTable += `</tbody></table></div>`;
        resultHTML += normTable;

        let lambdaMax = 0;
        appState.kriteria.forEach(k => {
            lambdaMax += colSums[k.id] * ahpWeights[k.id];
        });

        const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
        const riMap = { 1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
        const ri = riMap[n] || 1.49;
        const cr = ri > 0 ? ci / ri : 0;

        let consistencyAlert = '';
        if (cr <= 0.1) {
            consistencyAlert = `
                <div style="background:var(--success); padding:1rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                    <h4>✔ Matriks Konsisten (CR = ${parseFloat(cr.toFixed(4))} &le; 0.1)</h4>
                    <p style="font-size:0.9rem;">Perbandingan berpasangan kriteria valid dan dapat digunakan untuk perhitungan selanjutnya.</p>
                </div>
            `;
        } else {
            consistencyAlert = `
                <div style="background:var(--danger); padding:1rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                    <h4>⚠ Matriks TIDAK Konsisten (CR = ${parseFloat(cr.toFixed(4))} &gt; 0.1)</h4>
                    <p style="font-size:0.9rem;">Nilai perbandingan berpasangan kriteria kurang konsisten. Harap tinjau kembali perbandingan Anda agar nilai CR &le; 0.1.</p>
                </div>
            `;
        }
        resultHTML += `
            <h3>3. Uji Konsistensi</h3>
            <div style="display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                <div style="flex:1; min-width:200px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                    <strong>&lambda;<sub>max</sub>:</strong> ${parseFloat(lambdaMax.toFixed(4))}
                </div>
                <div style="flex:1; min-width:200px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                    <strong>CI:</strong> ${parseFloat(ci.toFixed(4))}
                </div>
                <div style="flex:1; min-width:200px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                    <strong>RI (n=${n}):</strong> ${ri}
                </div>
            </div>
            ${consistencyAlert}
        `;

        resultHTML += `<h3>4. Matriks Sintesis Alternatif & Perankingan</h3>`;
        let processTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Proses Perhitungan (W<sub>AHP</sub> &times; R)</th><th>Hasil Akhir</th></tr></thead><tbody>`;

        appState.alternatif.forEach(a => {
            let total = 0;
            let processStrArr = [];
            appState.kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                let r = 0;
                if (k.tipe === 'benefit') r = minMax[k.id].max !== 0 ? val / minMax[k.id].max : 0;
                else r = val !== 0 ? minMax[k.id].min / val : 0;

                const w = ahpWeights[k.id];
                processStrArr.push(`(${parseFloat(w.toFixed(3))} &times; ${parseFloat(r.toFixed(3))})`);
                total += r * w;
            });
            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: total });
            processTable += `<tr><td><strong>${a.nama}</strong></td><td><div style="font-size:0.85rem; font-family:monospace;">${processStrArr.join(' + ')}</div></td><td style="font-weight:bold; font-size:1.1rem;">${parseFloat(total.toFixed(4))}</td></tr>`;
        });
        processTable += `</tbody></table>`;
        resultHTML += processTable;

    } else if (method === 'topsis') {
        resultHTML += `
            <div style="background:var(--secondary); padding:1.5rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                <h3 style="margin-bottom:0.5rem; border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">Rumus Perhitungan TOPSIS</h3>
                <div style="display:flex; flex-wrap:wrap; gap:1rem;">
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>1. Normalisasi Matriks (R)</h4>
                        <p style="font-size:0.85rem;">r<sub>ij</sub> = x<sub>ij</sub> / &radic;(&sum; x<sub>kj</sub><sup>2</sup>)</p>
                    </div>
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>2. Matriks Ternormalisasi Terbobot (Y)</h4>
                        <p style="font-size:0.85rem;">y<sub>ij</sub> = w<sub>j</sub> &times; r<sub>ij</sub></p>
                    </div>
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>3. Jarak Ideal & Preferensi</h4>
                        <p style="font-size:0.85rem;">D<sup>+</sup> = &radic;(&sum; (y<sub>ij</sub> - y<sub>j</sub><sup>+</sup>)<sup>2</sup>)</p>
                        <p style="font-size:0.85rem;">D<sup>-</sup> = &radic;(&sum; (y<sub>ij</sub> - y<sub>j</sub><sup>-</sup>)<sup>2</sup>)</p>
                        <p style="font-size:0.85rem;">V<sub>i</sub> = D<sub>i</sub><sup>-</sup> / (D<sub>i</sub><sup>+</sup> + D<sub>i</sub><sup>-</sup>)</p>
                    </div>
                </div>
            </div>
        `;

        const divisors = {};
        appState.kriteria.forEach(k => {
            const sumSq = appState.alternatif.reduce((sum, a) => sum + Math.pow(a.penilaian[k.id] || 0, 2), 0);
            divisors[k.id] = Math.sqrt(sumSq);
        });

        resultHTML += `<h3>1. Matriks Keputusan (X)</h3>`;
        resultHTML += buildMatrixTable('Keputusan', (a, k) => a.penilaian[k.id] || 0);

        resultHTML += `<h3>2. Matriks Normalisasi (R)</h3>`;
        resultHTML += buildMatrixTable('Normalisasi', (a, k) => {
            const val = a.penilaian[k.id] || 0;
            return divisors[k.id] !== 0 ? val / divisors[k.id] : 0;
        });

        resultHTML += `<h3>3. Matriks Ternormalisasi Terbobot (Y)</h3>`;
        const matrixY = {};
        appState.alternatif.forEach(a => {
            matrixY[a.id] = {};
            appState.kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const r = divisors[k.id] !== 0 ? val / divisors[k.id] : 0;
                const w = k.bobot / totalBobot;
                matrixY[a.id][k.id] = r * w;
            });
        });

        resultHTML += buildMatrixTable('Terbobot', (a, k) => matrixY[a.id][k.id]);

        const idealPos = {};
        const idealNeg = {};
        appState.kriteria.forEach(k => {
            const yVals = appState.alternatif.map(a => matrixY[a.id][k.id]);
            if (k.tipe === 'benefit') {
                idealPos[k.id] = Math.max(...yVals);
                idealNeg[k.id] = Math.min(...yVals);
            } else {
                idealPos[k.id] = Math.min(...yVals);
                idealNeg[k.id] = Math.max(...yVals);
            }
        });

        resultHTML += `<h3>4. Solusi Ideal Positif (A<sup>+</sup>) & Negatif (A<sup>-</sup>)</h3>`;
        let idealTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Solusi Ideal</th>`;
        appState.kriteria.forEach(k => idealTable += `<th>${k.nama}</th>`);
        idealTable += `</tr></thead><tbody>`;
        
        idealTable += `<tr style="background:#d1fae5; font-weight:bold;"><td>Positif (A<sup>+</sup>)</td>`;
        appState.kriteria.forEach(k => idealTable += `<td>${parseFloat(idealPos[k.id].toFixed(4))}</td>`);
        idealTable += `</tr>`;

        idealTable += `<tr style="background:#fee2e2; font-weight:bold;"><td>Negatif (A<sup>-</sup>)</td>`;
        appState.kriteria.forEach(k => idealTable += `<td>${parseFloat(idealNeg[k.id].toFixed(4))}</td>`);
        idealTable += `</tr></tbody></table>`;
        resultHTML += idealTable;

        resultHTML += `<h3>5. Jarak Solusi Ideal & Kedekatan Relatif</h3>`;
        let distTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Jarak Ideal Positif (D<sup>+</sup>)</th><th>Jarak Ideal Negatif (D<sup>-</sup>)</th><th>Kedekatan Relatif (V)</th></tr></thead><tbody>`;

        appState.alternatif.forEach(a => {
            let sumSqPos = 0;
            let sumSqNeg = 0;
            appState.kriteria.forEach(k => {
                const y = matrixY[a.id][k.id];
                sumSqPos += Math.pow(y - idealPos[k.id], 2);
                sumSqNeg += Math.pow(y - idealNeg[k.id], 2);
            });
            const dPos = Math.sqrt(sumSqPos);
            const dNeg = Math.sqrt(sumSqNeg);
            const v = (dPos + dNeg) !== 0 ? dNeg / (dPos + dNeg) : 0;
            
            hasilAkhir.push({ id: a.id, nama: a.nama, d_pos: dPos, d_neg: dNeg, nilai: v });
            
            distTable += `<tr>
                <td><strong>${a.nama}</strong></td>
                <td>&radic;(${parseFloat(sumSqPos.toFixed(6))}) = <strong>${parseFloat(dPos.toFixed(4))}</strong></td>
                <td>&radic;(${parseFloat(sumSqNeg.toFixed(6))}) = <strong>${parseFloat(dNeg.toFixed(4))}</strong></td>
                <td style="font-weight:bold; font-size:1.15rem;">${parseFloat(v.toFixed(4))}</td>
            </tr>`;
        });
        distTable += `</tbody></table>`;
        resultHTML += distTable;

    } else if (method === 'moora') {
        resultHTML += `
            <div style="background:var(--secondary); padding:1.5rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                <h3 style="margin-bottom:0.5rem; border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">Rumus Perhitungan MOORA</h3>
                <div style="display:flex; flex-wrap:wrap; gap:1rem;">
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>1. Normalisasi Matriks (X<sup>*</sup>)</h4>
                        <p style="font-size:0.9rem;">x<sub>ij</sub><sup>*</sup> = x<sub>ij</sub> / &radic;(&sum; x<sub>kj</sub><sup>2</sup>)</p>
                    </div>
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>2. Nilai Optimasi (Y<sub>i</sub>)</h4>
                        <p style="font-size:0.9rem;">Y<sub>i</sub> = &sum; (w<sub>j</sub> &times; x<sub>ij</sub><sup>*</sup>)<sub>Benefit</sub> - &sum; (w<sub>j</sub> &times; x<sub>ij</sub><sup>*</sup>)<sub>Cost</sub></p>
                    </div>
                </div>
            </div>
        `;

        const divisors = {};
        appState.kriteria.forEach(k => {
            const sumSq = appState.alternatif.reduce((sum, a) => sum + Math.pow(a.penilaian[k.id] || 0, 2), 0);
            divisors[k.id] = Math.sqrt(sumSq);
        });

        resultHTML += `<h3>1. Matriks Keputusan (X)</h3>`;
        resultHTML += buildMatrixTable('Keputusan', (a, k) => a.penilaian[k.id] || 0);

        resultHTML += `<h3>2. Matriks Normalisasi (X<sup>*</sup>)</h3>`;
        resultHTML += buildMatrixTable('Normalisasi', (a, k) => {
            const val = a.penilaian[k.id] || 0;
            return divisors[k.id] !== 0 ? val / divisors[k.id] : 0;
        });

        resultHTML += `<h3>3. Proses Optimasi & Perhitungan Nilai Akhir (Y<sub>i</sub>)</h3>`;
        let processTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Jumlah Benefit (&sum; W &times; X<sup>*</sup>)</th><th>Jumlah Cost (&sum; W &times; X<sup>*</sup>)</th><th>Nilai Optimasi (Y = Benefit - Cost)</th></tr></thead><tbody>`;

        appState.alternatif.forEach(a => {
            let sumBenefit = 0;
            let sumCost = 0;
            let benefitTerms = [];
            let costTerms = [];

            appState.kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const xStar = divisors[k.id] !== 0 ? val / divisors[k.id] : 0;
                const w = k.bobot / totalBobot;
                const termVal = w * xStar;

                if (k.tipe === 'benefit') {
                    sumBenefit += termVal;
                    benefitTerms.push(`(${parseFloat(w.toFixed(2))} &times; ${parseFloat(xStar.toFixed(3))})`);
                } else {
                    sumCost += termVal;
                    costTerms.push(`(${parseFloat(w.toFixed(2))} &times; ${parseFloat(xStar.toFixed(3))})`);
                }
            });

            const yVal = sumBenefit - sumCost;
            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: yVal });

            const benefitStr = benefitTerms.length > 0 ? benefitTerms.join(' + ') : '0';
            const costStr = costTerms.length > 0 ? costTerms.join(' + ') : '0';

            processTable += `<tr>
                <td><strong>${a.nama}</strong></td>
                <td><div style="font-size:0.8rem; font-family:monospace; margin-bottom:0.3rem;">${benefitStr}</div>= <strong>${parseFloat(sumBenefit.toFixed(4))}</strong></td>
                <td><div style="font-size:0.8rem; font-family:monospace; margin-bottom:0.3rem;">${costStr}</div>= <strong>${parseFloat(sumCost.toFixed(4))}</strong></td>
                <td style="font-weight:bold; font-size:1.15rem; background:#fafafa;">${parseFloat(yVal.toFixed(4))}</td>
            </tr>`;
        });
        processTable += `</tbody></table></div>`;
        resultHTML += processTable;

    } else if (method === 'profile') {
        resultHTML += `
            <div style="background:var(--secondary); padding:1.5rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                <h3 style="margin-bottom:0.5rem; border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">Rumus Perhitungan Profile Matching</h3>
                <div style="display:flex; flex-wrap:wrap; gap:1rem;">
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>1. Gap & Pembobotan</h4>
                        <p style="font-size:0.85rem;">Gap = Nilai - Target</p>
                        <p style="font-size:0.8rem; color:#555;">Gap 0 ➡️ 5 | Gap 1 ➡️ 4.5 | Gap -1 ➡️ 4 | Gap 2 ➡️ 3.5 | Gap -2 ➡️ 3 | Gap 3 ➡️ 2.5 | Gap -3 ➡️ 2 | Gap 4 ➡️ 1.5 | Gap -4 ➡️ 1</p>
                    </div>
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>2. NCF & NSF</h4>
                        <p style="font-size:0.85rem;">NCF = &sum; Bobot Core / Jumlah Core</p>
                        <p style="font-size:0.85rem;">NSF = &sum; Bobot Secondary / Jumlah Secondary</p>
                    </div>
                    <div style="flex:1; min-width:250px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                        <h4>3. Nilai Total (60% / 40%)</h4>
                        <p style="font-size:0.85rem;">Total = 60% &times; NCF + 40% &times; NSF</p>
                    </div>
                </div>
                <div style="font-size:0.85rem; color:#555; background:#fff; padding:0.8rem; border:2px solid var(--border-color); border-radius:4px; margin-top:0.8rem;">
                    💡 <strong>Tip:</strong> Disarankan menggunakan skala nilai yang seragam (misal: 1 s.d. 10) agar perhitungan Gap lebih relevan.
                </div>
            </div>
        `;

        resultHTML += `<h3>1. Matriks Keputusan vs Nilai Target</h3>`;
        let targetTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Kriteria / Alternatif</th>`;
        appState.kriteria.forEach(k => {
            targetTable += `<th>${k.nama}<br><span style="font-size:0.8rem; font-weight:normal;">(${k.factor_type === 'core' ? 'Core' : 'Sec'})</span></th>`;
        });
        targetTable += `</tr></thead><tbody>`;

        appState.alternatif.forEach(a => {
            targetTable += `<tr><td><strong>${a.nama}</strong></td>`;
            appState.kriteria.forEach(k => {
                targetTable += `<td>${a.penilaian[k.id] || 0}</td>`;
            });
            targetTable += `</tr>`;
        });

        targetTable += `<tr style="font-weight:bold; background:#e0f2fe;"><td>Target Profil</td>`;
        appState.kriteria.forEach(k => {
            targetTable += `<td>${k.target !== undefined ? k.target : 3}</td>`;
        });
        targetTable += `</tr></tbody></table></div>`;
        resultHTML += targetTable;

        function getGapWeight(gap) {
            const gapInt = Math.round(gap);
            const map = {
                0: 5.0,
                1: 4.5,
                [-1]: 4.0,
                2: 3.5,
                [-2]: 3.0,
                3: 2.5,
                [-3]: 2.0,
                4: 1.5,
                [-4]: 1.0
            };
            if (map[gapInt] !== undefined) return map[gapInt];
            return 1.0;
        }

        resultHTML += `<h3>2. Matriks Gap (Nilai - Target)</h3>`;
        let gapTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th>`;
        appState.kriteria.forEach(k => gapTable += `<th>${k.nama}</th>`);
        gapTable += `</tr></thead><tbody>`;

        appState.alternatif.forEach(a => {
            gapTable += `<tr><td><strong>${a.nama}</strong></td>`;
            appState.kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const target = k.target !== undefined ? k.target : 3;
                const gap = val - target;
                gapTable += `<td>${parseFloat(gap.toFixed(2))}</td>`;
            });
            gapTable += `</tr>`;
        });
        gapTable += `</tbody></table></div>`;
        resultHTML += gapTable;

        resultHTML += `<h3>3. Matriks Pembobotan Nilai Gap</h3>`;
        let gapWeightTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Detail Core (CF)</th><th>Detail Sec (SF)</th>`;
        gapWeightTable += `</tr></thead><tbody>`;

        const gapWeights = {};
        const coreCriteria = appState.kriteria.filter(k => k.factor_type === 'core');
        const secondaryCriteria = appState.kriteria.filter(k => k.factor_type !== 'core');

        appState.alternatif.forEach(a => {
            gapWeights[a.id] = {};
            let coreDetails = [];
            let secDetails = [];

            appState.kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const target = k.target !== undefined ? k.target : 3;
                const gap = val - target;
                const w = getGapWeight(gap);
                gapWeights[a.id][k.id] = w;

                if (k.factor_type === 'core') {
                    coreDetails.push(`${k.nama}: <strong>${w}</strong>`);
                } else {
                    secDetails.push(`${k.nama}: <strong>${w}</strong>`);
                }
            });

            gapWeightTable += `<tr>
                <td><strong>${a.nama}</strong></td>
                <td><div style="font-size:0.85rem;">${coreDetails.join(' | ')}</div></td>
                <td><div style="font-size:0.85rem;">${secDetails.join(' | ')}</div></td>
            </tr>`;
        });
        gapWeightTable += `</tr></tbody></table></div>`;
        resultHTML += gapWeightTable;

        resultHTML += `<h3>4. Perhitungan NCF, NSF, dan Nilai Total</h3>`;
        let pmProcessTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Core Factor (NCF)</th><th>Secondary Factor (NSF)</th><th>Nilai Akhir (60% NCF + 40% NSF)</th></tr></thead><tbody>`;

        appState.alternatif.forEach(a => {
            let sumCore = 0;
            let sumSecondary = 0;
            
            coreCriteria.forEach(k => sumCore += gapWeights[a.id][k.id]);
            secondaryCriteria.forEach(k => sumSecondary += gapWeights[a.id][k.id]);

            const ncf = coreCriteria.length > 0 ? sumCore / coreCriteria.length : 0;
            const nsf = secondaryCriteria.length > 0 ? sumSecondary / secondaryCriteria.length : 0;
            const total = 0.6 * ncf + 0.4 * nsf;

            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: total });

            const coreList = coreCriteria.length > 0 ? coreCriteria.map(k => gapWeights[a.id][k.id]).join('+') : '0';
            const secList = secondaryCriteria.length > 0 ? secondaryCriteria.map(k => gapWeights[a.id][k.id]).join('+') : '0';

            pmProcessTable += `<tr>
                <td><strong>${a.nama}</strong></td>
                <td>(${coreList}) / ${coreCriteria.length} = <strong>${parseFloat(ncf.toFixed(4))}</strong></td>
                <td>(${secList}) / ${secondaryCriteria.length} = <strong>${parseFloat(nsf.toFixed(4))}</strong></td>
                <td style="font-weight:bold; font-size:1.15rem; background:#fafafa;">0.6 &times; ${parseFloat(ncf.toFixed(2))} + 0.4 &times; ${parseFloat(nsf.toFixed(2))} = <strong>${parseFloat(total.toFixed(4))}</strong></td>
            </tr>`;
        });
        pmProcessTable += `</tbody></table></div>`;
        resultHTML += pmProcessTable;
    }

    hasilAkhir.sort((a, b) => b.nilai - a.nilai);

    resultHTML += `<h3>Hasil Akhir & Perankingan (${method.toUpperCase()})</h3>`;
    let rankTable = `<table class="neo-table"><thead><tr><th>Peringkat</th><th>Nama Alternatif</th>`;
    if (method === 'wp') rankTable += `<th>Vektor S</th>`;
    rankTable += `<th>Nilai Preferensi / Akhir</th></tr></thead><tbody>`;
    
    hasilAkhir.forEach((h, index) => {
        let rankClass = '';
        if(index === 0) rankClass = 'rank-1';
        else if (index === 1) rankClass = 'rank-2';
        else if (index === 2) rankClass = 'rank-3';
        
        rankTable += `<tr class="${rankClass}"><td>${index + 1}</td><td><strong>${h.nama}</strong></td>`;
        if (method === 'wp') rankTable += `<td>${parseFloat(h.vector_s.toFixed(6))}</td>`;
        rankTable += `<td>${parseFloat(h.nilai.toFixed(4))}</td></tr>`;
    });
    rankTable += `</tbody></table>`;

    resultHTML += rankTable;
    container.innerHTML = resultHTML;
}

function buildMatrixTable(title, valFunc) {
    let html = `<table class="neo-table"><thead><tr><th>Alternatif</th>`;
    appState.kriteria.forEach(k => html += `<th>${k.nama}</th>`);
    html += `</tr></thead><tbody>`;
    
    appState.alternatif.forEach(a => {
        html += `<tr><td>${a.nama}</td>`;
        appState.kriteria.forEach(k => {
            const val = valFunc(a, k);
            html += `<td>${parseFloat(val.toFixed(4))}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table><br>`;
    return html;
}

window.updateAhpMatrix = function(rowId, colId, value) {
    if (!appState.ahpMatrix) appState.ahpMatrix = {};
    appState.ahpMatrix[rowId + '-' + colId] = parseFloat(value);
    saveData();
    renderPerhitungan('ahp');
}
