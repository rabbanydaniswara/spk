// --- State Management ---
const STORAGE_KEY = 'SPK_DATA_V1';

const defaultData = {
    kriteria: [
        { id: 'k1', nama: 'Grafis', tipe: 'benefit', bobot: 30 },
        { id: 'k2', nama: 'Gameplay', tipe: 'benefit', bobot: 40 },
        { id: 'k3', nama: 'Harga (Ribuan Rp)', tipe: 'cost', bobot: 20 },
        { id: 'k4', nama: 'Storage (GB)', tipe: 'cost', bobot: 10 }
    ],
    alternatif: [
        { id: 'a1', nama: 'Cyberpunk 2077', penilaian: { 'k1': 9, 'k2': 8, 'k3': 600, 'k4': 70 } },
        { id: 'a2', nama: 'The Witcher 3', penilaian: { 'k1': 8, 'k2': 9, 'k3': 300, 'k4': 50 } },
        { id: 'a3', nama: 'Stardew Valley', penilaian: { 'k1': 7, 'k2': 9, 'k3': 150, 'k4': 2 } }
    ]
};

let appState = { kriteria: [], alternatif: [] };

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        appState = JSON.parse(saved);
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

        const existIndex = appState.kriteria.findIndex(k => k.id === id);
        if (existIndex > -1) {
            appState.kriteria[existIndex] = { id, nama, tipe, bobot };
        } else {
            appState.kriteria.push({ id, nama, tipe, bobot });
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
                <td>
                    <button class="neo-btn btn-small btn-danger" onclick="deleteKriteria('${k.id}')">Hapus</button>
                </td>
            </tr>
        `;
    });
    
    if(appState.kriteria.length > 0) {
        tbody.innerHTML += `
            <tr style="background: var(--text-color); color: var(--surface); font-weight: bold;">
                <td colspan="3" style="text-align: right;">Total Bobot:</td>
                <td colspan="2">${totalBobot}</td>
            </tr>
        `;
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
    }

    // Sort and Rank
    hasilAkhir.sort((a, b) => b.nilai - a.nilai);

    resultHTML += `<h3>Hasil Akhir & Perankingan (${method.toUpperCase()})</h3>`;
    let rankTable = `<table class="neo-table"><thead><tr><th>Peringkat</th><th>Nama Alternatif</th>`;
    if (method === 'wp') rankTable += `<th>Vektor S</th>`;
    rankTable += `<th>Nilai Preferensi (V)</th></tr></thead><tbody>`;
    
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
