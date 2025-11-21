// พารามิเตอร์ของโมเดล
const params = {
    k_before: 0.42,
    k_after: -0.18,
    Q0: 100,
    t_vaccine_start: 13,
    pfizer_efficacy: 0.95,
    sinovac_efficacy: 0.70,
    pfizer_ratio: 0.40,
    sinovac_ratio: 0.60
};

// ตัวแปรเก็บข้อมูล
let results = null;
let charts = {};

// เริ่มต้นโปรแกรม
document.addEventListener('DOMContentLoaded', function() {
    calculatePrediction();
    setupTabs();
});

// ฟังก์ชันคำนวณการทำนาย
function calculatePrediction() {
    const historicalData = [];
    const predictionData = [];
    const vaccineData = [];
    const totalPopulation = 10000;

    // คำนวณข้อมูลจริง 2020-2021 (เดือน 0-23)
    for (let t = 0; t <= 23; t++) {
        let Q;
        if (t < params.t_vaccine_start) {
            Q = params.Q0 * Math.exp(params.k_before * t);
        } else {
            const t_since = t - params.t_vaccine_start;
            const Q_at_vaccine = params.Q0 * Math.exp(params.k_before * params.t_vaccine_start);
            const avg_efficacy = params.pfizer_efficacy * params.pfizer_ratio + 
                                params.sinovac_efficacy * params.sinovac_ratio;
            Q = Q_at_vaccine * Math.exp(params.k_after * t_since) * (1 - avg_efficacy * 0.8);
        }

        historicalData.push({
            month: t,
            date: `${(t % 12) + 1}/${2020 + Math.floor(t / 12)}`,
            infections: Math.round(Q),
            year: 2020 + Math.floor(t / 12)
        });
    }

    // คำนวณการทำนายปี 2022 (เดือน 24-35)
    for (let t = 24; t <= 35; t++) {
        const t_since = t - params.t_vaccine_start;
        const Q_at_vaccine = params.Q0 * Math.exp(params.k_before * params.t_vaccine_start);
        const avg_efficacy = params.pfizer_efficacy * params.pfizer_ratio + 
                            params.sinovac_efficacy * params.sinovac_ratio;
        
        const coverage_effect = Math.min(1, (t - 13) / 20);
        const Q = Q_at_vaccine * Math.exp(params.k_after * t_since) * (1 - avg_efficacy * 0.8 * coverage_effect);

        predictionData.push({
            month: t,
            date: `${(t % 12) + 1}/2022`,
            infections: Math.round(Q),
            year: 2022
        });
    }

    // คำนวณข้อมูลวัคซีน
    for (let t = params.t_vaccine_start; t <= 35; t++) {
        const months_since = t - params.t_vaccine_start;
        const coverage = Math.min(0.75, 0.03 * months_since);
        const totalVaccinated = Math.round(totalPopulation * coverage);

        vaccineData.push({
            month: t,
            date: `${(t % 12) + 1}/${2020 + Math.floor(t / 12)}`,
            vaccinated: totalVaccinated,
            coverage_percent: (coverage * 100).toFixed(1),
            year: 2020 + Math.floor(t / 12)
        });
    }

    // คำนวณสถิติ
    const data2020 = historicalData.filter(d => d.year === 2020);
    const data2021 = historicalData.filter(d => d.year === 2021);
    const data2022 = predictionData;

    const total2020 = data2020.reduce((sum, d) => sum + d.infections, 0);
    const total2021 = data2021.reduce((sum, d) => sum + d.infections, 0);
    const total2022 = data2022.reduce((sum, d) => sum + d.infections, 0);

    results = {
        historicalData,
        predictionData,
        allData: [...historicalData, ...predictionData],
        vaccineData,
        stats: {
            total2020: Math.round(total2020),
            avg2020: Math.round(total2020 / data2020.length),
            total2021: Math.round(total2021),
            avg2021: Math.round(total2021 / data2021.length),
            total2022: Math.round(total2022),
            avg2022: Math.round(total2022 / data2022.length),
            reduction2021to2022: (((total2021 - total2022) / total2021) * 100).toFixed(1),
            finalCoverage: vaccineData[vaccineData.length - 1]?.coverage_percent || 0
        },
        totalPopulation
    };

    // อัปเดต UI
    updateMetrics();
    createOverviewChart();
    createPrediction2022Chart();
    createComparisonChart();
    createVaccineChart();
    updateYearCards();
    updateChangeCards();
    updateCalculationResult();
}

// อัปเดตตัวเลขด้านบน
function updateMetrics() {
    document.getElementById('total2020').textContent = results.stats.total2020.toLocaleString();
    document.getElementById('avg2020').textContent = 'เฉลี่ย ' + results.stats.avg2020.toLocaleString() + ' คน/เดือน';
    
    document.getElementById('total2021').textContent = results.stats.total2021.toLocaleString();
    document.getElementById('avg2021').textContent = 'เฉลี่ย ' + results.stats.avg2021.toLocaleString() + ' คน/เดือน';
    
    document.getElementById('total2022').textContent = results.stats.total2022.toLocaleString();
    document.getElementById('avg2022').textContent = 'เฉลี่ย ' + results.stats.avg2022.toLocaleString() + ' คน/เดือน';
    
    document.getElementById('reduction').textContent = '↓ ' + results.stats.reduction2021to2022 + '%';
    document.getElementById('coverage').textContent = 'ครอบคลุมวัคซีน ' + results.stats.finalCoverage + '%';

    // อัปเดตส่วนทำนายปี 2022
    document.getElementById('pred-total').textContent = results.stats.total2022.toLocaleString();
    document.getElementById('pred-avg').textContent = results.stats.avg2022.toLocaleString();
    document.getElementById('pred-reduction').textContent = results.stats.reduction2021to2022 + '%';
}

// สร้างกราฟภาพรวม
function createOverviewChart() {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;

    if (charts.overview) {
        charts.overview.destroy();
    }

    charts.overview = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.allData.map(d => d.date),
            datasets: [{
                label: 'จำนวนผู้ติดเชื้อ',
                data: results.allData.map(d => d.infections),
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'ผู้ติดเชื้อ: ' + context.parsed.y.toLocaleString() + ' คน';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// สร้างกราฟทำนายปี 2022
function createPrediction2022Chart() {
    const ctx = document.getElementById('prediction2022Chart');
    if (!ctx) return;

    if (charts.prediction) {
        charts.prediction.destroy();
    }

    charts.prediction = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.predictionData.map(d => d.date),
            datasets: [{
                label: 'ทำนายผู้ติดเชื้อปี 2022',
                data: results.predictionData.map(d => d.infections),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 4,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#10B981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'ผู้ติดเชื้อ (ทำนาย): ' + context.parsed.y.toLocaleString() + ' คน';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// สร้างกราฟเปรียบเทียบ 3 ปี
function createComparisonChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;

    if (charts.comparison) {
        charts.comparison.destroy();
    }

    charts.comparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['2020', '2021', '2022'],
            datasets: [{
                label: 'จำนวนผู้ติดเชื้อรวม',
                data: [
                    results.stats.total2020,
                    results.stats.total2021,
                    results.stats.total2022
                ],
                backgroundColor: [
                    '#F97316',
                    '#EAB308',
                    '#10B981'
                ],
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const type = context.dataIndex === 2 ? ' (ทำนาย)' : ' (จริง)';
                            return 'ผู้ติดเชื้อรวม: ' + context.parsed.y.toLocaleString() + ' คน' + type;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// สร้างกราฟวัคซีน
function createVaccineChart() {
    const ctx = document.getElementById('vaccineChart');
    if (!ctx) return;

    if (charts.vaccine) {
        charts.vaccine.destroy();
    }

    charts.vaccine = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.vaccineData.map(d => d.date),
            datasets: [{
                label: 'จำนวนผู้ฉีดวัคซีน',
                data: results.vaccineData.map(d => d.vaccinated),
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'ผู้ฉีดวัคซีน: ' + context.parsed.y.toLocaleString() + ' คน';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// อัปเดตการ์ดปี
function updateYearCards() {
    const yearCardsContainer = document.getElementById('yearCards');
    if (!yearCardsContainer) return;

    const yearData = [
        {
            year: 2020,
            total: results.stats.total2020,
            avg: results.stats.avg2020,
            colorClass: 'orange',
            badgeClass: 'orange',
            status: 'ระบาดหนัก',
            note: 'ยังไม่มีวัคซีน'
        },
        {
            year: 2021,
            total: results.stats.total2021,
            avg: results.stats.avg2021,
            colorClass: 'yellow',
            badgeClass: 'yellow',
            status: 'จุดสูงสุด',
            note: 'เริ่มฉีดวัคซีน Q1'
        },
        {
            year: 2022,
            total: results.stats.total2022,
            avg: results.stats.avg2022,
            colorClass: 'green',
            badgeClass: 'green',
            status: 'ดีขึ้น (ทำนาย)',
            note: 'วัคซีนครอบคลุม 75%'
        }
    ];

    yearCardsContainer.innerHTML = yearData.map(item => `
        <div class="year-card ${item.colorClass}">
            <div class="year-header">
                <h3 class="year-title">ปี ${item.year}</h3>
                <span class="year-badge ${item.badgeClass}">${item.status}</span>
            </div>
            <p class="year-total">${item.total.toLocaleString()}</p>
            <p class="year-label">ผู้ติดเชื้อรวม</p>
            <div class="year-avg">
                <p class="year-avg-label">เฉลี่ยต่อเดือน</p>
                <p class="year-avg-value">${item.avg.toLocaleString()}</p>
            </div>
            <p class="year-note">${item.note}</p>
        </div>
    `).join('');
}

// อัปเดตการ์ดการเปลี่ยนแปลง
function updateChangeCards() {
    const change2021 = ((results.stats.total2021 - results.stats.total2020) / results.stats.total2020 * 100).toFixed(1);
    const change2022 = results.stats.reduction2021to2022;
    
    const change2021El = document.getElementById('change2021');
    const change2022El = document.getElementById('change2022');
    
    if (change2021El) {
        change2021El.innerHTML = `
            เพิ่มขึ้น ${change2021}%<br>
            <span style="font-size: 0.85rem; color: #6B7280;">เพิ่ม ${(results.stats.total2021 - results.stats.total2020).toLocaleString()} คน</span>
        `;
    }
    
    if (change2022El) {
        change2022El.innerHTML = `
            ลดลง ${change2022}%<br>
            <span style="font-size: 0.85rem; color: #6B7280;">ลด ${(results.stats.total2021 - results.stats.total2022).toLocaleString()} คน</span>
        `;
    }
}

// อัปเดตผลการคำนวณ
function updateCalculationResult() {
    const resultEl = document.getElementById('calcResult');
    if (resultEl && results.predictionData[0]) {
        resultEl.textContent = 'ผลลัพธ์ ≈ ' + results.predictionData[0].infections.toLocaleString() + ' คน';
    }
}

// ตั้งค่าแท็บ
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;

            // ลบ active class จากทุกแท็บ
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // เพิ่ม active class ให้แท็บที่เลือก
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // สร้างกราฟใหม่เมื่อเปลี่ยนแท็บ
            setTimeout(() => {
                if (targetTab === 'overview' && charts.overview) {
                    charts.overview.resize();
                } else if (targetTab === 'prediction2022' && charts.prediction) {
                    charts.prediction.resize();
                } else if (targetTab === 'comparison' && charts.comparison) {
                    charts.comparison.resize();
                } else if (targetTab === 'vaccine' && charts.vaccine) {
                    charts.vaccine.resize();
                }
            }, 100);
        });
    });
}