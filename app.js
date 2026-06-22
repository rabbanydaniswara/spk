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
        refreshActiveCalculation();
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
        refreshActiveCalculation();
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
        
        // Clean up AHP matrix keys relating to deleted kriteria
        if (appState.ahpMatrix) {
            Object.keys(appState.ahpMatrix).forEach(key => {
                if (key.startsWith(id + '-') || key.endsWith('-' + id)) {
                    delete appState.ahpMatrix[key];
                }
            });
        }

        saveData();
        renderKriteria();
        renderAlternatif();
        refreshActiveCalculation();
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
        refreshActiveCalculation();
    }
}

function refreshActiveCalculation() {
    const calcView = document.getElementById('view-perhitungan');
    if (calcView && calcView.classList.contains('active')) {
        const activeTab = document.querySelector('.calc-tab.active');
        if (activeTab) {
            renderPerhitungan(activeTab.getAttribute('data-method'));
        }
    }
}

// --- SPK Methods Engine ---
const SPKEngine = {
    // Shared minMax helper
    getMinMax: function(kriteria, alternatif) {
        const minMax = {};
        kriteria.forEach(k => {
            const values = alternatif.map(a => a.penilaian[k.id] || 0);
            minMax[k.id] = {
                max: values.length > 0 ? Math.max(...values) : 0,
                min: values.length > 0 ? Math.min(...values) : 0
            };
        });
        return minMax;
    },

    // SAW Method
    saw: function(kriteria, alternatif) {
        const minMax = this.getMinMax(kriteria, alternatif);
        const totalBobot = kriteria.reduce((sum, k) => sum + k.bobot, 0);
        const normMatrix = {};
        const normDetails = {};
        const preferensiDetails = {};
        const hasilAkhir = [];

        alternatif.forEach(a => {
            normMatrix[a.id] = {};
            normDetails[a.id] = {};
            let total = 0;
            let processTerms = [];

            kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                let n = 0;
                let calcStr = "";
                if (k.tipe === 'benefit') {
                    const maxVal = minMax[k.id].max;
                    calcStr = `${val} / ${maxVal}`;
                    n = maxVal !== 0 ? val / maxVal : 0;
                } else {
                    const minVal = minMax[k.id].min;
                    calcStr = `${minVal} / ${val}`;
                    n = val !== 0 ? minVal / val : 0;
                }
                normMatrix[a.id][k.id] = n;
                normDetails[a.id][k.id] = { calcStr, val: n };

                const w = totalBobot !== 0 ? k.bobot / totalBobot : 0;
                processTerms.push(`(${w.toFixed(2)} * ${n.toFixed(3)})`);
                total += n * w;
            });

            preferensiDetails[a.id] = {
                calcStr: processTerms.join(' + '),
                total: total
            };
            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: total });
        });

        hasilAkhir.sort((a, b) => b.nilai - a.nilai);

        return { minMax, normMatrix, normDetails, preferensiDetails, hasilAkhir };
    },

    // WP Method
    wp: function(kriteria, alternatif) {
        const totalBobot = kriteria.reduce((sum, k) => sum + k.bobot, 0);
        const wRel = {};
        kriteria.forEach(k => {
            const wNormalized = totalBobot !== 0 ? k.bobot / totalBobot : 0;
            wRel[k.id] = k.tipe === 'benefit' ? wNormalized : -wNormalized;
        });

        const vectorS = {};
        let totalS = 0;
        const hasilAkhir = [];

        alternatif.forEach(a => {
            let s = 1;
            let processTerms = [];
            kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const valSafe = val === 0 ? 0.0001 : val;
                const valS = Math.pow(valSafe, wRel[k.id]);
                s *= valS;
                processTerms.push(`(${valSafe}<sup>${wRel[k.id].toFixed(2)}</sup>)`);
            });
            vectorS[a.id] = {
                s: s,
                calcStr: processTerms.join(' * ')
            };
            totalS += s;
        });

        alternatif.forEach(a => {
            const sVal = vectorS[a.id].s;
            const v = totalS !== 0 ? sVal / totalS : 0;
            hasilAkhir.push({
                id: a.id,
                nama: a.nama,
                vector_s: sVal,
                nilai: v
            });
        });

        hasilAkhir.sort((a, b) => b.nilai - a.nilai);

        return { wRel, vectorS, totalS, hasilAkhir };
    },

    // SMART Method
    smart: function(kriteria, alternatif) {
        const minMax = this.getMinMax(kriteria, alternatif);
        const totalBobot = kriteria.reduce((sum, k) => sum + k.bobot, 0);
        const wNorm = {};
        kriteria.forEach(k => {
            wNorm[k.id] = totalBobot !== 0 ? k.bobot / totalBobot : 0;
        });

        const utility = {};
        const preferensiDetails = {};
        const hasilAkhir = [];

        alternatif.forEach(a => {
            utility[a.id] = {};
            let total = 0;
            let processTerms = [];

            kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const min = minMax[k.id].min;
                const max = minMax[k.id].max;
                let u = 1;
                if (max - min !== 0) {
                    if (k.tipe === 'benefit') {
                        u = (val - min) / (max - min);
                    } else {
                        u = (max - val) / (max - min);
                    }
                }
                utility[a.id][k.id] = u;

                const w = wNorm[k.id];
                processTerms.push(`(${w.toFixed(2)} * ${u.toFixed(3)})`);
                total += u * w;
            });

            preferensiDetails[a.id] = {
                calcStr: processTerms.join(' + '),
                total: total
            };
            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: total });
        });

        hasilAkhir.sort((a, b) => b.nilai - a.nilai);

        return { minMax, wNorm, utility, preferensiDetails, hasilAkhir };
    },

    // AHP Method (Criteria weight calculation + SAW Synthesis)
    ahp: function(kriteria, alternatif, ahpMatrix) {
        const n = kriteria.length;
        const ahpVals = {};
        
        // Build raw comparison matrix
        kriteria.forEach(rowK => {
            ahpVals[rowK.id] = {};
            kriteria.forEach(colK => {
                if (rowK.id === colK.id) {
                    ahpVals[rowK.id][colK.id] = 1.0;
                } else {
                    const key = rowK.id + '-' + colK.id;
                    const revKey = colK.id + '-' + rowK.id;
                    if (ahpMatrix[key] !== undefined) {
                        ahpVals[rowK.id][colK.id] = ahpMatrix[key];
                    } else if (ahpMatrix[revKey] !== undefined) {
                        ahpVals[rowK.id][colK.id] = 1.0 / ahpMatrix[revKey];
                    } else {
                        ahpVals[rowK.id][colK.id] = 1.0; // default
                    }
                }
            });
        });

        // Sum columns
        const colSums = {};
        kriteria.forEach(colK => {
            let sum = 0;
            kriteria.forEach(rowK => {
                sum += ahpVals[rowK.id][colK.id];
            });
            colSums[colK.id] = sum;
        });

        // Normalize matrix & extract criteria weights (Priority Vector)
        const normMatrix = {};
        const weights = {};
        kriteria.forEach(rowK => {
            normMatrix[rowK.id] = {};
            let rowSum = 0;
            kriteria.forEach(colK => {
                const normVal = colSums[colK.id] !== 0 ? ahpVals[rowK.id][colK.id] / colSums[colK.id] : 0;
                normMatrix[rowK.id][colK.id] = normVal;
                rowSum += normVal;
            });
            weights[rowK.id] = n > 0 ? rowSum / n : 0;
        });

        // Consistency check
        let lambdaMax = 0;
        kriteria.forEach(k => {
            lambdaMax += colSums[k.id] * weights[k.id];
        });

        const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
        const riMap = { 1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
        const ri = riMap[n] || 1.49;
        const cr = ri > 0 ? ci / ri : 0;
        const isConsistent = cr <= 0.1;

        // Synthesis of alternatives
        const minMax = this.getMinMax(kriteria, alternatif);
        const preferensiDetails = {};
        const hasilAkhir = [];

        alternatif.forEach(a => {
            let total = 0;
            let processTerms = [];

            kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                let r = 0;
                if (k.tipe === 'benefit') {
                    r = minMax[k.id].max !== 0 ? val / minMax[k.id].max : 0;
                } else {
                    r = val !== 0 ? minMax[k.id].min / val : 0;
                }
                const w = weights[k.id];
                processTerms.push(`(${w.toFixed(3)} * ${r.toFixed(3)})`);
                total += r * w;
            });

            preferensiDetails[a.id] = {
                calcStr: processTerms.join(' + '),
                total: total
            };
            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: total });
        });

        hasilAkhir.sort((a, b) => b.nilai - a.nilai);

        return {
            ahpVals,
            colSums,
            normMatrix,
            weights,
            lambdaMax,
            ci,
            ri,
            cr,
            isConsistent,
            preferensiDetails,
            hasilAkhir
        };
    },

    // TOPSIS Method
    topsis: function(kriteria, alternatif) {
        const totalBobot = kriteria.reduce((sum, k) => sum + k.bobot, 0);

        // Precalculate vector divisors
        const divisors = {};
        kriteria.forEach(k => {
            const sumSq = alternatif.reduce((sum, a) => sum + Math.pow(a.penilaian[k.id] || 0, 2), 0);
            divisors[k.id] = Math.sqrt(sumSq);
        });

        // Staged matrices
        const normMatrix = {};
        const weightedMatrix = {};
        
        alternatif.forEach(a => {
            normMatrix[a.id] = {};
            weightedMatrix[a.id] = {};
            kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const r = divisors[k.id] !== 0 ? val / divisors[k.id] : 0;
                const w = totalBobot !== 0 ? k.bobot / totalBobot : 0;
                normMatrix[a.id][k.id] = r;
                weightedMatrix[a.id][k.id] = r * w;
            });
        });

        // Solusi Ideal Positif & Negatif
        const idealPos = {};
        const idealNeg = {};
        kriteria.forEach(k => {
            const yVals = alternatif.map(a => weightedMatrix[a.id][k.id]);
            if (k.tipe === 'benefit') {
                idealPos[k.id] = yVals.length > 0 ? Math.max(...yVals) : 0;
                idealNeg[k.id] = yVals.length > 0 ? Math.min(...yVals) : 0;
            } else {
                idealPos[k.id] = yVals.length > 0 ? Math.min(...yVals) : 0;
                idealNeg[k.id] = yVals.length > 0 ? Math.max(...yVals) : 0;
            }
        });

        // Distances & Preference Value
        const distances = {};
        const hasilAkhir = [];

        alternatif.forEach(a => {
            let sumSqPos = 0;
            let sumSqNeg = 0;
            kriteria.forEach(k => {
                const y = weightedMatrix[a.id][k.id];
                sumSqPos += Math.pow(y - idealPos[k.id], 2);
                sumSqNeg += Math.pow(y - idealNeg[k.id], 2);
            });
            const dPos = Math.sqrt(sumSqPos);
            const dNeg = Math.sqrt(sumSqNeg);
            const v = (dPos + dNeg) !== 0 ? dNeg / (dPos + dNeg) : 0;

            distances[a.id] = {
                dPos,
                dNeg,
                sumSqPos,
                sumSqNeg
            };
            hasilAkhir.push({
                id: a.id,
                nama: a.nama,
                d_pos: dPos,
                d_neg: dNeg,
                nilai: v
            });
        });

        hasilAkhir.sort((a, b) => b.nilai - a.nilai);

        return { divisors, normMatrix, weightedMatrix, idealPos, idealNeg, distances, hasilAkhir };
    },

    // MOORA Method
    moora: function(kriteria, alternatif) {
        const totalBobot = kriteria.reduce((sum, k) => sum + k.bobot, 0);

        // Precalculate divisors
        const divisors = {};
        kriteria.forEach(k => {
            const sumSq = alternatif.reduce((sum, a) => sum + Math.pow(a.penilaian[k.id] || 0, 2), 0);
            divisors[k.id] = Math.sqrt(sumSq);
        });

        const normMatrix = {};
        const weightedMatrix = {};
        const optimization = {};
        const hasilAkhir = [];

        alternatif.forEach(a => {
            normMatrix[a.id] = {};
            weightedMatrix[a.id] = {};
            
            let sumBenefit = 0;
            let sumCost = 0;
            let benefitTerms = [];
            let costTerms = [];

            kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const xStar = divisors[k.id] !== 0 ? val / divisors[k.id] : 0;
                const w = totalBobot !== 0 ? k.bobot / totalBobot : 0;
                const termVal = w * xStar;

                normMatrix[a.id][k.id] = xStar;
                weightedMatrix[a.id][k.id] = termVal;

                if (k.tipe === 'benefit') {
                    sumBenefit += termVal;
                    benefitTerms.push(`(${w.toFixed(2)} * ${xStar.toFixed(3)})`);
                } else {
                    sumCost += termVal;
                    costTerms.push(`(${w.toFixed(2)} * ${xStar.toFixed(3)})`);
                }
            });

            const yVal = sumBenefit - sumCost;
            optimization[a.id] = {
                sumBenefit,
                sumCost,
                benefitStr: benefitTerms.length > 0 ? benefitTerms.join(' + ') : '0',
                costStr: costTerms.length > 0 ? costTerms.join(' + ') : '0',
                yVal
            };
            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: yVal });
        });

        hasilAkhir.sort((a, b) => b.nilai - a.nilai);

        return { divisors, normMatrix, weightedMatrix, optimization, hasilAkhir };
    },

    // Profile Matching Method
    profileMatching: function(kriteria, alternatif) {
        const coreCriteria = kriteria.filter(k => k.factor_type === 'core');
        const secondaryCriteria = kriteria.filter(k => k.factor_type !== 'core');

        const gaps = {};
        const gapWeights = {};
        const ncf = {};
        const nsf = {};
        const hasilAkhir = [];

        const getGapWeight = (gap) => {
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
        };

        let wCore = 0.6;
        let wSecondary = 0.4;
        if (coreCriteria.length === 0) {
            wCore = 0.0;
            wSecondary = 1.0;
        } else if (secondaryCriteria.length === 0) {
            wCore = 1.0;
            wSecondary = 0.0;
        }

        alternatif.forEach(a => {
            gaps[a.id] = {};
            gapWeights[a.id] = {};
            let sumCore = 0;
            let sumSecondary = 0;

            kriteria.forEach(k => {
                const val = a.penilaian[k.id] || 0;
                const target = k.target !== undefined ? k.target : 3;
                const gap = val - target;
                const w = getGapWeight(gap);

                gaps[a.id][k.id] = gap;
                gapWeights[a.id][k.id] = w;

                if (k.factor_type === 'core') {
                    sumCore += w;
                } else {
                    sumSecondary += w;
                }
            });

            const valNcf = coreCriteria.length > 0 ? sumCore / coreCriteria.length : 0;
            const valNsf = secondaryCriteria.length > 0 ? sumSecondary / secondaryCriteria.length : 0;
            const total = wCore * valNcf + wSecondary * valNsf;

            ncf[a.id] = valNcf;
            nsf[a.id] = valNsf;

            hasilAkhir.push({ id: a.id, nama: a.nama, nilai: total });
        });

        hasilAkhir.sort((a, b) => b.nilai - a.nilai);

        return { gaps, gapWeights, coreCriteria, secondaryCriteria, ncf, nsf, wCore, wSecondary, hasilAkhir };
    }
};

// --- Method Renderers ---
const MethodRenderer = {
    saw: function(data, kriteria, alternatif) {
        let html = `
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

        html += `<h3>1. Matriks Keputusan (X)</h3>`;
        html += buildMatrixTable(kriteria, alternatif, (a, k) => a.penilaian[k.id] || 0);

        html += `<h3>2. Proses Normalisasi Detail (R<sub>ij</sub>)</h3>`;
        let normDetailTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif / Kriteria</th>`;
        kriteria.forEach(k => normDetailTable += `<th>${k.nama}</th>`);
        normDetailTable += `</tr></thead><tbody>`;
        alternatif.forEach(a => {
            normDetailTable += `<tr><td><strong>${a.nama}</strong></td>`;
            kriteria.forEach(k => {
                const item = data.normDetails[a.id][k.id];
                normDetailTable += `<td><div style="font-size:0.8rem; color:#555; font-family:monospace;">${item.calcStr}</div><strong>${parseFloat(item.val.toFixed(3))}</strong></td>`;
            });
            normDetailTable += `</tr>`;
        });
        normDetailTable += `</tbody></table>`;
        html += normDetailTable;

        html += `<h3>3. Matriks Normalisasi (R)</h3>`;
        html += buildMatrixTable(kriteria, alternatif, (a, k) => data.normMatrix[a.id][k.id]);

        html += `<h3>4. Proses Perhitungan Detail (V<sub>i</sub>)</h3>`;
        let processTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Proses Perhitungan (W &times; R)</th><th>Hasil Akhir (V)</th></tr></thead><tbody>`;
        alternatif.forEach(a => {
            const detail = data.preferensiDetails[a.id];
            processTable += `<tr><td><strong>${a.nama}</strong></td><td><div style="font-size:0.9rem; font-family:monospace;">${detail.calcStr}</div></td><td style="font-weight:bold; color:var(--text-color); font-size:1.1rem;">${parseFloat(detail.total.toFixed(4))}</td></tr>`;
        });
        processTable += `</tbody></table>`;
        html += processTable;

        return html;
    },

    wp: function(data, kriteria, alternatif) {
        let html = `
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

        html += `<h3>1. Bobot Relatif (W<sub>j</sub>)</h3>`;
        let wRelTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr>`;
        kriteria.forEach(k => wRelTable += `<th>${k.nama}</th>`);
        wRelTable += `</tr></thead><tbody><tr>`;
        kriteria.forEach(k => {
            wRelTable += `<td>${parseFloat(data.wRel[k.id].toFixed(4))}</td>`;
        });
        wRelTable += `</tr></tbody></table>`;
        html += wRelTable;

        html += `<h3>2. Perhitungan Vektor S</h3>`;
        let sTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Proses Perkalian (X<sup>w</sup>)</th><th>Nilai S</th></tr></thead><tbody>`;
        alternatif.forEach(a => {
            const detail = data.vectorS[a.id];
            sTable += `<tr><td><strong>${a.nama}</strong></td><td><div style="font-size:0.9rem; font-family:monospace;">${detail.calcStr}</div></td><td><strong>${parseFloat(detail.s.toFixed(6))}</strong></td></tr>`;
        });
        sTable += `</tbody></table>`;
        html += sTable;

        return html;
    },

    smart: function(data, kriteria, alternatif) {
        let html = `
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

        html += `<h3>1. Normalisasi Bobot Kriteria (W<sub>j</sub>)</h3>`;
        let wNormTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr>`;
        kriteria.forEach(k => wNormTable += `<th>${k.nama}</th>`);
        wNormTable += `</tr></thead><tbody><tr>`;
        kriteria.forEach(k => {
            wNormTable += `<td>${parseFloat(data.wNorm[k.id].toFixed(4))}</td>`;
        });
        wNormTable += `</tr></tbody></table>`;
        html += wNormTable;

        html += `<h3>2. Matriks Utility (U<sub>ij</sub>)</h3>`;
        html += buildMatrixTable(kriteria, alternatif, (a, k) => data.utility[a.id][k.id]);

        html += `<h3>3. Proses Perhitungan Detail (V<sub>i</sub>)</h3>`;
        let processTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Proses (W &times; U)</th><th>Nilai V</th></tr></thead><tbody>`;
        alternatif.forEach(a => {
            const detail = data.preferensiDetails[a.id];
            processTable += `<tr><td><strong>${a.nama}</strong></td><td><div style="font-size:0.9rem; font-family:monospace;">${detail.calcStr}</div></td><td><strong style="font-size:1.1rem;">${parseFloat(detail.total.toFixed(4))}</strong></td></tr>`;
        });
        processTable += `</tbody></table>`;
        html += processTable;

        return html;
    },

    ahp: function(data, kriteria, alternatif) {
        const n = kriteria.length;
        let html = `
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

        html += `<h3>1. Matriks Perbandingan Berpasangan Kriteria</h3>`;
        let matrixTable = `<div class="table-container" style="margin-bottom:2rem;"><table class="neo-table"><thead><tr><th>Kriteria</th>`;
        kriteria.forEach(k => matrixTable += `<th>${k.nama}</th>`);
        matrixTable += `</tr></thead><tbody>`;

        kriteria.forEach((rowK, rIdx) => {
            matrixTable += `<tr><td><strong>${rowK.nama}</strong></td>`;
            kriteria.forEach((colK, cIdx) => {
                const val = data.ahpVals[rowK.id][colK.id];
                if (rIdx === cIdx) {
                    matrixTable += `<td style="background:#f0f0f0; text-align:center; font-weight:bold;">1</td>`;
                } else if (rIdx < cIdx) {
                    matrixTable += `<td>
                        <select onchange="updateAhpMatrix('${rowK.id}', '${colK.id}', this.value)" style="padding:4px; font-size:0.85rem; border:2px solid var(--border-color); width:100%;">
                            <option value="1" ${val === 1 ? 'selected' : ''}>1 - Sama penting</option>
                            <option value="2" ${Math.abs(val - 2) < 0.01 ? 'selected' : ''}>2 - Nilai Antara (2)</option>
                            <option value="3" ${Math.abs(val - 3) < 0.01 ? 'selected' : ''}>3 - Cukup penting</option>
                            <option value="4" ${Math.abs(val - 4) < 0.01 ? 'selected' : ''}>4 - Nilai Antara (4)</option>
                            <option value="5" ${Math.abs(val - 5) < 0.01 ? 'selected' : ''}>5 - Lebih penting</option>
                            <option value="6" ${Math.abs(val - 6) < 0.01 ? 'selected' : ''}>6 - Nilai Antara (6)</option>
                            <option value="7" ${Math.abs(val - 7) < 0.01 ? 'selected' : ''}>7 - Sangat penting</option>
                            <option value="8" ${Math.abs(val - 8) < 0.01 ? 'selected' : ''}>8 - Nilai Antara (8)</option>
                            <option value="9" ${Math.abs(val - 9) < 0.01 ? 'selected' : ''}>9 - Mutlak penting</option>
                            
                            <option value="0.5" ${Math.abs(val - 0.5) < 0.01 ? 'selected' : ''}>1/2 - Nilai Antara (1/2)</option>
                            <option value="0.333333" ${Math.abs(val - 0.333333) < 0.01 ? 'selected' : ''}>1/3 - Cukup tidak penting</option>
                            <option value="0.25" ${Math.abs(val - 0.25) < 0.01 ? 'selected' : ''}>1/4 - Nilai Antara (1/4)</option>
                            <option value="0.2" ${Math.abs(val - 0.2) < 0.01 ? 'selected' : ''}>1/5 - Lebih tidak penting</option>
                            <option value="0.166667" ${Math.abs(val - 0.166667) < 0.01 ? 'selected' : ''}>1/6 - Nilai Antara (1/6)</option>
                            <option value="0.142857" ${Math.abs(val - 0.142857) < 0.01 ? 'selected' : ''}>1/7 - Sangat tidak penting</option>
                            <option value="0.125" ${Math.abs(val - 0.125) < 0.01 ? 'selected' : ''}>1/8 - Nilai Antara (1/8)</option>
                            <option value="0.111111" ${Math.abs(val - 0.111111) < 0.01 ? 'selected' : ''}>1/9 - Mutlak tidak penting</option>
                        </select>
                    </td>`;
                } else {
                    matrixTable += `<td style="background:#fafafa; font-family:monospace; font-size:0.9rem;">${val >= 1 ? parseFloat(val.toFixed(2)) : '1/' + Math.round(1/val)} (${parseFloat(val.toFixed(3))})</td>`;
                }
            });
            matrixTable += `</tr>`;
        });
        
        matrixTable += `<tr style="font-weight:bold; background:#e9d5ff;"><td>Total Kolom</td>`;
        kriteria.forEach(colK => {
            matrixTable += `<td>${parseFloat(data.colSums[colK.id].toFixed(3))}</td>`;
        });
        matrixTable += `</tr></tbody></table></div>`;
        html += matrixTable;

        html += `<h3>2. Matriks Normalisasi & Priority Vector (Bobot AHP)</h3>`;
        let normTable = `<div class="table-container" style="margin-bottom:2rem;"><table class="neo-table"><thead><tr><th>Kriteria</th>`;
        kriteria.forEach(k => normTable += `<th>${k.nama}</th>`);
        normTable += `<th style="background:var(--success)">Bobot (Priority Vector)</th></tr></thead><tbody>`;

        kriteria.forEach(rowK => {
            normTable += `<tr><td><strong>${rowK.nama}</strong></td>`;
            kriteria.forEach(colK => {
                normTable += `<td>${parseFloat(data.normMatrix[rowK.id][colK.id].toFixed(4))}</td>`;
            });
            normTable += `<td style="font-weight:bold; background:#f0fdf4;">${parseFloat(data.weights[rowK.id].toFixed(4))}</td></tr>`;
        });
        html += normTable;

        let consistencyAlert = '';
        if (data.isConsistent) {
            consistencyAlert = `
                <div style="background:var(--success); padding:1rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                    <h4>✔ Matriks Konsisten (CR = ${parseFloat(data.cr.toFixed(4))} &le; 0.1)</h4>
                    <p style="font-size:0.9rem;">Perbandingan berpasangan kriteria valid dan dapat digunakan untuk perhitungan selanjutnya.</p>
                </div>
            `;
        } else {
            consistencyAlert = `
                <div style="background:var(--danger); padding:1rem; border:3px solid var(--border-color); border-radius:4px; box-shadow: 4px 4px 0 var(--border-color); margin-bottom:2rem;">
                    <h4>⚠ Matriks TIDAK Konsisten (CR = ${parseFloat(data.cr.toFixed(4))} &gt; 0.1)</h4>
                    <p style="font-size:0.9rem;">Nilai perbandingan berpasangan kriteria kurang konsisten. Harap tinjau kembali perbandingan Anda agar nilai CR &le; 0.1.</p>
                </div>
            `;
        }
        html += `
            <h3>3. Uji Konsistensi</h3>
            <div style="display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                <div style="flex:1; min-width:200px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                    <strong>&lambda;<sub>max</sub>:</strong> ${parseFloat(data.lambdaMax.toFixed(4))}
                </div>
                <div style="flex:1; min-width:200px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                    <strong>CI:</strong> ${parseFloat(data.ci.toFixed(4))}
                </div>
                <div style="flex:1; min-width:200px; background:#fff; padding:1rem; border:2px solid var(--border-color); border-radius:4px;">
                    <strong>RI (n=${n}):</strong> ${data.ri}
                </div>
            </div>
            ${consistencyAlert}
        `;

        html += `<h3>4. Matriks Sintesis Alternatif & Perankingan</h3>`;
        let processTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Proses Perhitungan (W<sub>AHP</sub> &times; R)</th><th>Hasil Akhir</th></tr></thead><tbody>`;
        alternatif.forEach(a => {
            const detail = data.preferensiDetails[a.id];
            processTable += `<tr><td><strong>${a.nama}</strong></td><td><div style="font-size:0.85rem; font-family:monospace;">${detail.calcStr}</div></td><td style="font-weight:bold; font-size:1.1rem;">${parseFloat(detail.total.toFixed(4))}</td></tr>`;
        });
        processTable += `</tbody></table>`;
        html += processTable;

        return html;
    },
    topsis: function(data, kriteria, alternatif) {
        let html = `
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

        html += `<h3>1. Matriks Keputusan (X)</h3>`;
        html += buildMatrixTable(kriteria, alternatif, (a, k) => a.penilaian[k.id] || 0);

        html += `<h3>2. Matriks Normalisasi (R)</h3>`;
        html += buildMatrixTable(kriteria, alternatif, (a, k) => data.normMatrix[a.id][k.id]);

        html += `<h3>3. Matriks Ternormalisasi Terbobot (Y)</h3>`;
        html += buildMatrixTable(kriteria, alternatif, (a, k) => data.weightedMatrix[a.id][k.id]);

        html += `<h3>4. Solusi Ideal Positif (A<sup>+</sup>) & Negatif (A<sup>-</sup>)</h3>`;
        let idealTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Solusi Ideal</th>`;
        kriteria.forEach(k => idealTable += `<th>${k.nama}</th>`);
        idealTable += `</tr></thead><tbody>`;
        
        idealTable += `<tr style="background:#d1fae5; font-weight:bold;"><td>Positif (A<sup>+</sup>)</td>`;
        kriteria.forEach(k => idealTable += `<td>${parseFloat(data.idealPos[k.id].toFixed(4))}</td>`);
        idealTable += `</tr>`;

        idealTable += `<tr style="background:#fee2e2; font-weight:bold;"><td>Negatif (A<sup>-</sup>)</td>`;
        kriteria.forEach(k => idealTable += `<td>${parseFloat(data.idealNeg[k.id].toFixed(4))}</td>`);
        idealTable += `</tr></tbody></table>`;
        html += idealTable;

        html += `<h3>5. Jarak Solusi Ideal & Kedekatan Relatif</h3>`;
        let distTable = `<table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Jarak Ideal Positif (D<sup>+</sup>)</th><th>Jarak Ideal Negatif (D<sup>-</sup>)</th><th>Kedekatan Relatif (V)</th></tr></thead><tbody>`;

        alternatif.forEach(a => {
            const dist = data.distances[a.id];
            const vVal = data.hasilAkhir.find(item => item.id === a.id).nilai;
            distTable += `<tr>
                <td><strong>${a.nama}</strong></td>
                <td>&radic;(${parseFloat(dist.sumSqPos.toFixed(6))}) = <strong>${parseFloat(dist.dPos.toFixed(4))}</strong></td>
                <td>&radic;(${parseFloat(dist.sumSqNeg.toFixed(6))}) = <strong>${parseFloat(dist.dNeg.toFixed(4))}</strong></td>
                <td style="font-weight:bold; font-size:1.15rem;">${parseFloat(vVal.toFixed(4))}</td>
            </tr>`;
        });
        distTable += `</tbody></table>`;
        html += distTable;

        return html;
    },

    moora: function(data, kriteria, alternatif) {
        let html = `
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

        html += `<h3>1. Matriks Keputusan (X)</h3>`;
        html += buildMatrixTable(kriteria, alternatif, (a, k) => a.penilaian[k.id] || 0);

        html += `<h3>2. Matriks Normalisasi (X<sup>*</sup>)</h3>`;
        html += buildMatrixTable(kriteria, alternatif, (a, k) => data.normMatrix[a.id][k.id]);

        html += `<h3>3. Proses Optimasi & Perhitungan Nilai Akhir (Y<sub>i</sub>)</h3>`;
        let processTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Jumlah Benefit (&sum; W &times; X<sup>*</sup>)</th><th>Jumlah Cost (&sum; W &times; X<sup>*</sup>)</th><th>Nilai Optimasi (Y = Benefit - Cost)</th></tr></thead><tbody>`;

        alternatif.forEach(a => {
            const opt = data.optimization[a.id];
            processTable += `<tr>
                <td><strong>${a.nama}</strong></td>
                <td><div style="font-size:0.8rem; font-family:monospace; margin-bottom:0.3rem;">${opt.benefitStr}</div>= <strong>${parseFloat(opt.sumBenefit.toFixed(4))}</strong></td>
                <td><div style="font-size:0.8rem; font-family:monospace; margin-bottom:0.3rem;">${opt.costStr}</div>= <strong>${parseFloat(opt.sumCost.toFixed(4))}</strong></td>
                <td style="font-weight:bold; font-size:1.15rem; background:#fafafa;">${parseFloat(opt.yVal.toFixed(4))}</td>
            </tr>`;
        });
        processTable += `</tbody></table></div>`;
        html += processTable;

        return html;
    },

    profile: function(data, kriteria, alternatif) {
        let html = `
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
                        <h4>3. Nilai Total</h4>
                        <p style="font-size:0.85rem;">Total = (Bobot CF &times; NCF) + (Bobot SF &times; NSF)</p>
                        <p style="font-size:0.8rem; color:#555;">*Bobot saat ini: ${data.wCore * 100}% CF / ${data.wSecondary * 100}% SF</p>
                    </div>
                </div>
                <div style="font-size:0.85rem; color:#555; background:#fff; padding:0.8rem; border:2px solid var(--border-color); border-radius:4px; margin-top:0.8rem;">
                    💡 <strong>Tip:</strong> Disarankan menggunakan skala nilai yang seragam (misal: 1 s.d. 10) agar perhitungan Gap lebih relevan.
                </div>
            </div>
        `;

        html += `<h3>1. Matriks Keputusan vs Nilai Target</h3>`;
        let targetTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Kriteria / Alternatif</th>`;
        kriteria.forEach(k => {
            targetTable += `<th>${k.nama}<br><span style="font-size:0.8rem; font-weight:normal;">(${k.factor_type === 'core' ? 'Core' : 'Sec'})</span></th>`;
        });
        targetTable += `</tr></thead><tbody>`;

        alternatif.forEach(a => {
            targetTable += `<tr><td><strong>${a.nama}</strong></td>`;
            kriteria.forEach(k => {
                targetTable += `<td>${a.penilaian[k.id] || 0}</td>`;
            });
            targetTable += `</tr>`;
        });

        targetTable += `<tr style="font-weight:bold; background:#e0f2fe;"><td>Target Profil</td>`;
        kriteria.forEach(k => {
            targetTable += `<td>${k.target !== undefined ? k.target : 3}</td>`;
        });
        targetTable += `</tr></tbody></table></div>`;
        html += targetTable;

        html += `<h3>2. Matriks Gap (Nilai - Target)</h3>`;
        let gapTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th>`;
        kriteria.forEach(k => gapTable += `<th>${k.nama}</th>`);
        gapTable += `</tr></thead><tbody>`;

        alternatif.forEach(a => {
            gapTable += `<tr><td><strong>${a.nama}</strong></td>`;
            kriteria.forEach(k => {
                gapTable += `<td>${parseFloat(data.gaps[a.id][k.id].toFixed(2))}</td>`;
            });
            gapTable += `</tr>`;
        });
        gapTable += `</tbody></table></div>`;
        html += gapTable;

        html += `<h3>3. Matriks Pembobotan Nilai Gap</h3>`;
        let gapWeightTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Detail Core (CF)</th><th>Detail Sec (SF)</th>`;
        gapWeightTable += `</tr></thead><tbody>`;

        alternatif.forEach(a => {
            let coreDetails = [];
            let secDetails = [];

            kriteria.forEach(k => {
                const w = data.gapWeights[a.id][k.id];
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
        html += gapWeightTable;

        html += `<h3>4. Perhitungan NCF, NSF, dan Nilai Total</h3>`;
        let pmProcessTable = `<div class="table-container"><table class="neo-table" style="margin-bottom:2rem;"><thead><tr><th>Alternatif</th><th>Core Factor (NCF)</th><th>Secondary Factor (NSF)</th><th>Nilai Akhir (${data.wCore * 100}% NCF + ${data.wSecondary * 100}% NSF)</th></tr></thead><tbody>`;

        alternatif.forEach(a => {
            const ncfVal = data.ncf[a.id];
            const nsfVal = data.nsf[a.id];
            const totalVal = data.hasilAkhir.find(item => item.id === a.id).nilai;

            const coreList = data.coreCriteria.length > 0 ? data.coreCriteria.map(k => data.gapWeights[a.id][k.id]).join('+') : '0';
            const secList = data.secondaryCriteria.length > 0 ? data.secondaryCriteria.map(k => data.gapWeights[a.id][k.id]).join('+') : '0';

            pmProcessTable += `<tr>
                <td><strong>${a.nama}</strong></td>
                <td>(${coreList}) / ${data.coreCriteria.length || 1} = <strong>${parseFloat(ncfVal.toFixed(4))}</strong></td>
                <td>(${secList}) / ${data.secondaryCriteria.length || 1} = <strong>${parseFloat(nsfVal.toFixed(4))}</strong></td>
                <td style="font-weight:bold; font-size:1.15rem; background:#fafafa;">${data.wCore} &times; ${parseFloat(ncfVal.toFixed(2))} + ${data.wSecondary} &times; ${parseFloat(nsfVal.toFixed(2))} = <strong>${parseFloat(totalVal.toFixed(4))}</strong></td>
            </tr>`;
        });
        pmProcessTable += `</tbody></table></div>`;
        html += pmProcessTable;

        return html;
    }
};

// --- Math & Calculations Controller ---
function renderPerhitungan(method) {
    const container = document.getElementById('calc-result-container');
    
    if (appState.kriteria.length === 0 || appState.alternatif.length === 0) {
        container.innerHTML = `<div class="neo-modal active" style="position:relative; background:none"><div class="modal-content"><h3 style="color:var(--danger)">Error</h3><p>Data kriteria atau alternatif masih kosong.</p></div></div>`;
        return;
    }

    if (method === 'ahp' && appState.kriteria.length < 2) {
        container.innerHTML = `<div class="neo-modal active" style="position:relative; background:none"><div class="modal-content"><h3 style="color:var(--danger)">Kriteria Tidak Cukup</h3><p>Metode AHP membutuhkan minimal 2 kriteria untuk perbandingan berpasangan.</p></div></div>`;
        return;
    }



    // Call pure math engine
    let engineData;
    if (method === 'saw') engineData = SPKEngine.saw(appState.kriteria, appState.alternatif);
    else if (method === 'wp') engineData = SPKEngine.wp(appState.kriteria, appState.alternatif);
    else if (method === 'smart') engineData = SPKEngine.smart(appState.kriteria, appState.alternatif);
    else if (method === 'ahp') engineData = SPKEngine.ahp(appState.kriteria, appState.alternatif, appState.ahpMatrix);
    else if (method === 'topsis') engineData = SPKEngine.topsis(appState.kriteria, appState.alternatif);
    else if (method === 'moora') engineData = SPKEngine.moora(appState.kriteria, appState.alternatif);
    else if (method === 'profile') engineData = SPKEngine.profileMatching(appState.kriteria, appState.alternatif);

    // Call view renderer
    let resultHTML = "";
    if (method === 'saw') resultHTML = MethodRenderer.saw(engineData, appState.kriteria, appState.alternatif);
    else if (method === 'wp') resultHTML = MethodRenderer.wp(engineData, appState.kriteria, appState.alternatif);
    else if (method === 'smart') resultHTML = MethodRenderer.smart(engineData, appState.kriteria, appState.alternatif);
    else if (method === 'ahp') resultHTML = MethodRenderer.ahp(engineData, appState.kriteria, appState.alternatif);
    else if (method === 'topsis') resultHTML = MethodRenderer.topsis(engineData, appState.kriteria, appState.alternatif);
    else if (method === 'moora') resultHTML = MethodRenderer.moora(engineData, appState.kriteria, appState.alternatif);
    else if (method === 'profile') resultHTML = MethodRenderer.profile(engineData, appState.kriteria, appState.alternatif);

    // Render global ranking table
    const hasilAkhir = engineData.hasilAkhir;
    resultHTML += `<h3>Hasil Akhir & Perankingan (${method === 'profile' ? 'PROFILE MATCHING' : method.toUpperCase()})</h3>`;
    let rankTable = `<table class="neo-table"><thead><tr><th>Peringkat</th><th>Nama Alternatif</th>`;
    if (method === 'wp') rankTable += `<th>Vektor S</th>`;
    rankTable += `<th>Nilai Akhir</th></tr></thead><tbody>`;
    
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

function buildMatrixTable(kriteria, alternatif, valFunc) {
    let html = `<table class="neo-table"><thead><tr><th>Alternatif</th>`;
    kriteria.forEach(k => html += `<th>${k.nama}</th>`);
    html += `</tr></thead><tbody>`;
    
    alternatif.forEach(a => {
        html += `<tr><td>${a.nama}</td>`;
        kriteria.forEach(k => {
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
