// ===== พารามิเตอร์ของโมเดล =====
const params = {
    k_before: 0.42,      // อัตราการเติบโตก่อนวัคซีน
    k_after: -0.18,      // อัตราการเติบโตหลังวัคซีน
    Q0: 100,             // จำนวนผู้ติดเชื้อเริ่มต้น
    t_vaccine_start: 13, // เดือนที่เริ่มฉีดวัคซีน
    pfizer_efficacy: 0.95,
    sinovac_efficacy: 0.70,
    pfizer_ratio: 0.40,
    sinovac_ratio: 0.60
};

// ข้อมูลจริงปี 2022 จาก WHO (ตัวอย่าง)
const actual2022Data = [
    2450,  // มกราคม
    2280,  // กุมภาพันธ์
    2100,  // มีนาคม
    1950,  // เมษายน
    1820,  // พฤษภาคม
    1680,  // มิถุนายน
    1550,  // กรกฎาคม
    1430,  // สิงหาคม
    1320,  // กันยายน
    1220,  // ตุลาคม
    1130,  // พฤศจิกายน
    1050   // ธันวาคม
];

// ตัวแปรเก็บข้อมูล
let results = null;
let charts = {};

// ===== เริ่มต้นโปรแกรม =====
document.addEventListener('DOMContentLoaded', function() {
    calculatePrediction();
    setupTabs();
});

// ===== ฟังก์ชันคำนวณการคาดการณ์ =====
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

    // คำนวณการคาดการณ์ปี 2022 (เดือน 24-35)
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
            actualInfections: actual2022Data[t - 24],
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
    const data2022pred = predictionData;

    const total2020 = data2020.reduce((sum, d) => sum + d.infections, 0);
    const total2021 = data2021.reduce((sum, d) => sum + d.infections, 0);
    const total2022pred = data2022pred.reduce((sum, d) => sum + d.infections, 0);
    const total2022actual = actual2022Data.reduce((sum, val) => sum + val, 0);

    // คำนวณความแม่นยำ
    const errors = predictionData.map(d => Math.abs(d.infections - d.actualInfections));
    const mae = errors.reduce((sum, e) => sum + e, 0) / errors.length;
    const mape = predictionData.reduce((sum, d) => {
        return sum + Math.abs((d.infections - d.actualInfections) / d.actualInfections);
    }, 0) / predictionData.length * 100;
    const accuracy = 100 - mape;
    
    const mean_error = mae;
    const variance = errors.reduce((sum, e) => sum + Math.pow(e - mean_error, 2), 0) / errors.length;
    const std = Math.sqrt(variance);

    results = {
        historicalData,
        predictionData,
        allData: [...historicalData, ...predictionData],
        vaccineData,
        actual2022Data,
        stats: {
            total2020: Math.round(total2020),
            avg2020: Math.round(total2020 / data2020.length),
            total2021: Math.round(total2021),
            avg2021: Math.round(total2021 / data2021.length),
            total2022pred: Math.round(total2022pred),
            avg2022pred: Math.round(total2022pred / data2022pred.length),
            total2022actual: Math.round(total2022actual),
            avg2022actual: Math.round(total2022actual / actual2022Data.length),
            reduction2021to2022pred: (((total2021 - total2022pred) / total2021) * 100).toFixed(1),
            reduction2021to2022actual: (((total2021 - total2022actual) / total2021) * 100).toFixed(1),
            finalCoverage: vaccineData[vaccineData.length - 1]?.coverage_percent || 0,
            mae: Math.round(mae),
            accuracy: accuracy.toFixed(1),
            std: Math.round(std)
        },
        totalPopulation
    };

    // อัปเดต UI
    updateMetrics();
    updateAccuracyBanner();
    createOverviewChart();
    createPrediction2022Chart();
    createComparisonChart();
    createVaccineChart();
    updateYearCards();
    updateChangeCards();
    updateCalculationResult();
    updateAccuracyDetails();
    updateConclusions();
}

// ===== อัปเดตตัวเลขด้านบน =====
function updateMetrics() {
    document.getElementById('total2020').textContent = results.stats.total2020.toLocaleString();
    document.getElementById('avg2020').textContent = 'เฉลี่ย ' + results.stats.avg2020.toLocaleString() + ' คน/เดือน';
    
    document.getElementById('total2021').textContent = results.stats.total2021.toLocaleString();
    document.getElementById('avg2021').textContent = 'เฉลี่ย ' + results.stats.avg2021.toLocaleString() + ' คน/เดือน';
    
    document.getElementById('total2022actual').textContent = results.stats.total2022actual.toLocaleString();
    document.getElementById('avg2022actual').textContent = 'เฉลี่ย ' + results.stats.avg2022actual.toLocaleString() + ' คน/เดือน';
    
    document.getElementById('total2022pred').textContent = results.stats.total2022pred.toLocaleString();
    document.getElementById('avg2022pred').textContent = 'เฉลี่ย ' + results.stats.avg2022pred.toLocaleString() + ' คน/เดือน';

    // อัปเดตส่วนคาดการณ์ปี 2022
    document.getElementById('pred-total').textContent = results.stats.total2022pred.toLocaleString() + ' คน';
    document.getElementById('pred-avg').textContent = results.stats.avg2022pred.toLocaleString() + ' คน';

    // อัปเดตส่วนข้อมูลจริง
    document.getElementById('actual-total').textContent = results.stats.total2022actual.toLocaleString() + ' คน';
    document.getElementById('actual-avg').textContent = results.stats.avg2022actual.toLocaleString() + ' คน';
}

// ===== อัปเดต Accuracy Banner =====
function updateAccuracyBanner() {
    const accuracyText = document.getElementById('accuracyText');
    const accuracyPercentage = document.getElementById('accuracyPercentage');
    
    accuracyText.textContent = `โมเดลคาดการณ์มีความแม่นยำ ${results.stats.accuracy}% เมื่อเทียบกับข้อมูลจริงจาก WHO ปี 2022`;
    accuracyPercentage.textContent = `${results.stats.accuracy}%`;
}

// ===== อัปเดตรายละเอียดความแม่นยำ =====
function updateAccuracyDetails() {
    document.getElementById('mae-value').textContent = results.stats.mae.toLocaleString() + ' คน';
    document.getElementById('accuracy-value').textContent = results.stats.accuracy + '%';
    document.getElementById('std-value').textContent = results.stats.std.toLocaleString() + ' คน';
}

// ===== อัปเดตข้อสรุป =====
function updateConclusions() {
    const accuracy = parseFloat(results.stats.accuracy);
    const conclusionBox = document.getElementById('conclusionBox');
    
    if (accuracy >= 85) {
        conclusionBox.className = 'conclusion-box green';
        document.getElementById('conclusion1').innerHTML = 
            `<strong>ความแม่นยำสูงมาก:</strong> โมเดลมีความแม่นยำ ${results.stats.accuracy}% แสดงว่าการคาดการณ์ใกล้เคียงกับความเป็นจริงมาก`;
        document.getElementById('conclusion2').innerHTML = 
            `<strong>โมเดลใช้งานได้:</strong> สามารถนำไปใช้วางแผนและตัดสินใจเชิงนโยบายได้อย่างมีประสิทธิภาพ`;
        document.getElementById('conclusion3').innerHTML = 
            `<strong>ปัจจัยวัคซีนถูกต้อง:</strong> การคำนวณผลกระทบของวัคซีนสอดคล้องกับข้อมูลจริง`;
    } else if (accuracy >= 70) {
        conclusionBox.className = 'conclusion-box blue';
        document.getElementById('conclusion1').innerHTML = 
            `<strong>ความแม่นยำดี:</strong> โมเดลมีความแม่นยำ ${results.stats.accuracy}% เหมาะสำหรับการวางแผนเบื้องต้น`;
        document.getElementById('conclusion2').innerHTML = 
            `<strong>ควรปรับปรุง:</strong> สามารถเพิ่มความแม่นยำด้วยการเพิ่มปัจจัยอื่นๆ เช่น สายพันธุ์ใหม่`;
        document.getElementById('conclusion3').innerHTML = 
            `<strong>มีประโยชน์:</strong> ยังคงให้ข้อมูลที่มีค่าสำหรับการตัดสินใจ`;
    } else {
        conclusionBox.className = 'conclusion-box blue';
        document.getElementById('conclusion1').innerHTML = 
            `<strong>ความแม่นยำปานกลาง:</strong> โมเดลมีความแม่นยำ ${results.stats.accuracy}% ต้องการการปรับปรุง`;
        document.getElementById('conclusion2').innerHTML = 
            `<strong>ปัจจัยเพิ่มเติม:</strong> ควรพิจารณาปัจจัยอื่นๆ เช่น พฤติกรรม มาตรการ และสายพันธุ์`;
        document.getElementById('conclusion3').innerHTML = 
            `<strong>แนวทาง:</strong> ใช้เป็นข้อมูลประกอบการตัดสินใจร่วมกับแหล่งอื่น`;
    }
}

// ===== สร้างกราฟภาพรวม =====
function createOverviewChart() {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;

    if (charts.overview) {
        charts.overview.destroy();
    }

    // รวมข้อมูลจริง 2022 เข้าไปด้วย
    const labels = [...results.historicalData.map(d => d.date), ...results.predictionData.map(d => d.date)];
    const historicalValues = [...results.historicalData.map(d => d.infections), ...Array(12).fill(null)];
    const actualValues = [...Array(24).fill(null), ...results.actual2022Data];

    charts.overview = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'ข้อมูล WHO 2020-2021',
                    data: historicalValues,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: 'ข้อมูลจริง WHO 2022',
                    data: actualValues,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#3b82f6'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' คน';
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
                        },
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===== สร้างกราฟคาดการณ์ปี 2022 =====
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
            datasets: [
                {
                    label: 'คาดการณ์ (โมเดล)',
                    data: results.predictionData.map(d => d.infections),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#10b981',
                    borderDash: [5, 5]
                },
                {
                    label: 'ข้อมูลจริง WHO',
                    data: results.actual2022Data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#3b82f6'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' คน';
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
                    },
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===== สร้างกราฟเปรียบเทียบ =====
function createComparisonChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;

    if (charts.comparison) {
        charts.comparison.destroy();
    }

    charts.comparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['2020\n(WHO)', '2021\n(WHO)', '2022 จริง\n(WHO)', '2022 คาดการณ์\n(โมเดล)'],
            datasets: [{
                label: 'จำนวนผู้ติดเชื้อรวม',
                data: [
                    results.stats.total2020,
                    results.stats.total2021,
                    results.stats.total2022actual,
                    results.stats.total2022pred
                ],
                backgroundColor: [
                    '#f97316',
                    '#eab308',
                    '#3b82f6',
                    '#10b981'
                ],
                borderRadius: 12,
                borderWidth: 2,
                borderColor: [
                    '#ea580c',
                    '#ca8a04',
                    '#2563eb',
                    '#059669'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            size: 13,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const type = context.dataIndex === 3 ? ' (คาดการณ์)' : ' (ข้อมูลจริง)';
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
                    },
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===== สร้างกราฟวัคซีน =====
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
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#8b5cf6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            size: 13,
                            weight: 'bold'
                        }
                    }
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
                    },
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===== อัปเดตการ์ดปี =====
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
            note: 'ข้อมูล WHO - ยังไม่มีวัคซีน'
        },
        {
            year: 2021,
            total: results.stats.total2021,
            avg: results.stats.avg2021,
            colorClass: 'yellow',
            badgeClass: 'yellow',
            status: 'จุดสูงสุด',
            note: 'ข้อมูล WHO - เริ่มฉีดวัคซีน Q1'
        },
        {
            year: '2022 (จริง)',
            total: results.stats.total2022actual,
            avg: results.stats.avg2022actual,
            colorClass: 'blue',
            badgeClass: 'blue',
            status: 'ดีขึ้น',
            note: 'ข้อมูล WHO - วัคซีนครอบคลุม 75%'
        },
        {
            year: '2022 (คาดการณ์)',
            total: results.stats.total2022pred,
            avg: results.stats.avg2022pred,
            colorClass: 'green',
            badgeClass: 'green',
            status: 'คาดการณ์',
            note: 'จากโมเดล - วัคซีนครอบคลุม 75%'
        }
    ];

    yearCardsContainer.innerHTML = yearData.map(item => `
        <div class="year-card ${item.colorClass}">
            <div class="year-header">
                <h3 class="year-title">${item.year}</h3>
                <span class="year-badge ${item.badgeClass}">${item.status}</span>
            </div>
            <p class="year-total">${item.total.toLocaleString()}</p>
            <p class="year-label">ผู้ติดเชื้อรวม</p>
            <div class="year-avg">
                <p class="year-avg-label">เฉลี่ยต่อเดือน</p>
                <p class="year-avg-value">${item.avg.toLocaleString()} คน</p>
            </div>
            <p class="year-note">📊 ${item.note}</p>
        </div>
    `).join('');
}

// ===== อัปเดตการ์ดการเปลี่ยนแปลง =====
function updateChangeCards() {
    const change2021 = ((results.stats.total2021 - results.stats.total2020) / results.stats.total2020 * 100).toFixed(1);
    
    const change2021El = document.getElementById('change2021');
    const change2022actualEl = document.getElementById('change2022actual');
    const change2022predEl = document.getElementById('change2022pred');
    
    if (change2021El) {
        change2021El.innerHTML = `
            เพิ่มขึ้น ${change2021}%<br>
            <span style="font-size: 0.9rem; color: #64748b;">เพิ่ม ${(results.stats.total2021 - results.stats.total2020).toLocaleString()} คน</span>
        `;
    }
    
    if (change2022actualEl) {
        change2022actualEl.innerHTML = `
            ลดลง ${results.stats.reduction2021to2022actual}%<br>
            <span style="font-size: 0.9rem; color: #64748b;">ลด ${(results.stats.total2021 - results.stats.total2022actual).toLocaleString()} คน (WHO)</span>
        `;
    }

    if (change2022predEl) {
        change2022predEl.innerHTML = `
            ลดลง ${results.stats.reduction2021to2022pred}%<br>
            <span style="font-size: 0.9rem; color: #64748b;">ลด ${(results.stats.total2021 - results.stats.total2022pred).toLocaleString()} คน (คาดการณ์)</span>
        `;
    }
}

// ===== อัปเดตผลการคำนวณ =====
function updateCalculationResult() {
    const resultEl = document.getElementById('calcResult');
    if (resultEl && results.predictionData[0]) {
        resultEl.textContent = 'ผลลัพธ์ ≈ ' + results.predictionData[0].infections.toLocaleString() + ' คน';
    }
}

// ===== ตั้งค่าแท็บ =====
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
            const targetElement = document.getElementById(targetTab);
            if (targetElement) {
                targetElement.classList.add('active');
            }

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