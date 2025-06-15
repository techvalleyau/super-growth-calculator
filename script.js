// --- Configuration Data ---
const sgRates = [
    { year: 2014, rate: 0.095 },
    { year: 2015, rate: 0.095 },
    { year: 2016, rate: 0.095 },
    { year: 2017, rate: 0.095 },
    { year: 2018, rate: 0.095 },
    { year: 2019, rate: 0.095 },
    { year: 2020, rate: 0.095 },
    { year: 2021, rate: 0.100 }, // July 1, 2021 - June 30, 2022
    { year: 2022, rate: 0.105 }, // July 1, 2022 - June 30, 2023
    { year: 2023, rate: 0.110 }, // July 1, 2023 - June 30, 2024
    { year: 2024, rate: 0.115 }, // July 1, 2024 - June 30, 2025
    { year: 2025, rate: 0.120 }  // July 1, 2025 - June 30, 2026 onwards (reaches 12%)
];

// Max contribution base for SG (quarterly, indexed) - affects very high earners
// ATO Indexed amounts: https://www.ato.gov.au/Super/Super-guarantee/Maximum-contribution-base/
const maxContributionBaseQuarterly = [
    { year: 2023, value: 62270 }, // FY 2023-24
    { year: 2024, value: 64510 }, // FY 2024-25
    { year: 2025, value: 66990 }  // FY 2025-26 - *Check ATO for actual updated amount if available post-June 2025*
];

const historicalInflationRates = [
    // Source: RBA Inflation data (e.g., CPI annual percentage change)
    // This is an example, you might want to find more precise annual rates or a longer series
    { year: 1990, rate: 0.076 }, { year: 1991, rate: 0.029 }, { year: 1992, rate: 0.010 }, { year: 1993, rate: 0.018 }, { year: 1994, rate: 0.019 },
    { year: 1995, rate: 0.046 }, { year: 1996, rate: 0.026 }, { year: 1997, rate: 0.011 }, { year: 1998, rate: 0.013 }, { year: 1999, rate: 0.017 },
    { year: 2000, rate: 0.045 }, { year: 2001, rate: 0.032 }, { year: 2002, rate: 0.030 }, { year: 2003, rate: 0.027 }, { year: 2004, rate: 0.023 },
    { year: 2005, rate: 0.028 }, { year: 2006, rate: 0.039 }, { year: 2007, rate: 0.036 }, { year: 2008, rate: 0.045 }, { year: 2009, rate: 0.018 },
    { year: 2010, rate: 0.029 }, { year: 2011, rate: 0.033 }, { year: 2012, rate: 0.018 }, { year: 2013, rate: 0.024 }, { year: 2014, rate: 0.025 },
    { year: 2015, rate: 0.015 }, { year: 2016, rate: 0.013 }, { year: 2017, rate: 0.021 }, { year: 2018, rate: 0.019 }, { year: 2019, rate: 0.018 },
    { year: 2020, rate: 0.007 }, { year: 2021, rate: 0.035 }, { year: 2022, rate: 0.061 }, { year: 2023, rate: 0.041 } // Assuming up to end of 2023
    // For future years, we project RBA target
];
const projectedInflationRate = 0.025; // RBA's target 2-3% midpoint for future projection

// --- DOM Elements ---
const calculateBtn = document.getElementById('calculateBtn');
const inflationRateOption = document.getElementById('inflationRateOption');
const fixedInflationRateGroup = document.getElementById('fixedInflationRateGroup');
const displaySGrate = document.getElementById('displaySGrate'); // For dynamic SG rate display
const superChartCanvas = document.getElementById('superChart');

// --- Chart Instance (initialized globally) ---
let superChart = null;

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Set initial SG rate display
    updateSGDisplay();

    // Show/hide fixed inflation rate input based on selection
    inflationRateOption.addEventListener('change', () => {
        if (inflationRateOption.value === 'fixed') {
            fixedInflationRateGroup.style.display = 'block';
        } else {
            fixedInflationRateGroup.style.display = 'none';
        }
    });

    // UX: Attach event listener for calculate button
    calculateBtn.addEventListener('click', calculateSuper);

    // UX: Initialize FAQ toggles
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const parentItem = question.closest('.faq-item'); // Get the parent for active class
            
            // Toggle active class on the question for styling (e.g., arrow change)
            question.classList.toggle('active');

            // Toggle show class for answer to control max-height/padding
            answer.classList.toggle('show');

            // Optional: Close other open FAQs if only one should be open at a time
            // document.querySelectorAll('.faq-answer.show').forEach(openAnswer => {
            //     if (openAnswer !== answer) {
            //         openAnswer.classList.remove('show');
            //         openAnswer.previousElementSibling.classList.remove('active');
            //     }
            // });
        });
    });
});

// --- Helper Functions ---

function updateSGDisplay() {
    const currentYear = new Date().getFullYear();
    const sg = sgRates.find(s => s.year === currentYear) || sgRates[sgRates.length - 1]; // Use latest if current year beyond defined
    displaySGrate.textContent = (sg.rate * 100).toFixed(1);
}

function getSGRate(year) {
    const sg = sgRates.find(s => s.year === year);
    if (sg) {
        return sg.rate;
    }
    // If year is beyond defined rates, use the last defined rate (currently 12%)
    return sgRates[sgRates.length - 1].rate;
}

function getMaxContributionBase(year) {
    const base = maxContributionBaseQuarterly.find(b => b.year === year);
    if (base) {
        return base.value * 4; // Convert quarterly to annual
    }
    // If year is beyond defined, use the last defined base (for estimation)
    return maxContributionBaseQuarterly[maxContributionBaseQuarterly.length - 1].value * 4;
}

function getInflationRateForYear(year) {
    if (inflationRateOption.value === 'fixed') {
        return parseFloat(document.getElementById('inflationRate').value) / 100;
    } else { // Historical + Projected
        const historicalRate = historicalInflationRates.find(r => r.year === year);
        if (historicalRate) {
            return historicalRate.rate;
        }
        // For future years, use the projected rate
        return projectedInflationRate;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// --- Main Calculation Logic ---
function calculateSuper() {
    // 1. Get Input Values
    const currentAge = parseFloat(document.getElementById('currentAge').value);
    let currentBalance = parseFloat(document.getElementById('currentBalance').value);
    const annualSalary = parseFloat(document.getElementById('annualSalary').value);
    const extraContributions = parseFloat(document.getElementById('extraContributions').value);
    const investmentReturn = parseFloat(document.getElementById('investmentReturn').value) / 100;
    const retirementAge = parseFloat(document.getElementById('retirementAge').value);
    const currentYear = new Date().getFullYear();

    // UX: Basic Input Validation
    if (isNaN(currentAge) || currentAge < 18 || currentAge > 90 ||
        isNaN(currentBalance) || currentBalance < 0 ||
        isNaN(annualSalary) || annualSalary < 0 ||
        isNaN(extraContributions) || extraContributions < 0 ||
        isNaN(investmentReturn) || investmentReturn < 0 || investmentReturn > 1 || // Max 100%
        isNaN(retirementAge) || retirementAge < currentAge || retirementAge > 90 ||
        (inflationRateOption.value === 'fixed' && (isNaN(parseFloat(document.getElementById('inflationRate').value)) || parseFloat(document.getElementById('inflationRate').value) < 0))
    ) {
        alert("Please ensure all inputs are valid numbers. Monetary values cannot be negative, percentages should be realistic, and your retirement age must be greater than your current age.");
        return; // Stop execution
    }

    // Update display for results section
    document.getElementById('retirementAgeDisplay').textContent = retirementAge;

    // 2. Prepare Data for Chart
    const years = [];
    const nominalBalances = [];
    const realBalances = [];

    let balance = currentBalance;
    let realBalance = currentBalance; // Balance adjusted for inflation
    let effectiveSalary = annualSalary; // Salary used for contributions, accounts for cap

    // 3. Loop Through Years to Retirement
    for (let age = currentAge; age <= retirementAge; age++) {
        const yearIndex = currentYear + (age - currentAge);
        years.push(yearIndex);

        const sgRate = getSGRate(yearIndex);
        const maxSGContributionBase = getMaxContributionBase(yearIndex);

        // Calculate employer contributions, respecting the maximum contribution base
        let employerContribution = Math.min(annualSalary, maxSGContributionBase) * sgRate;

        // Total contributions for the year
        const totalContributions = employerContribution + extraContributions;

        // Apply investment return (compounding)
        balance *= (1 + investmentReturn);
        realBalance *= (1 + investmentReturn);

        // Add contributions (usually at end of year or averaged, for simplicity, added after return)
        balance += totalContributions;
        realBalance += totalContributions;

        // Adjust for inflation for 'real' balance
        const inflationRate = getInflationRateForYear(yearIndex);
        realBalance /= (1 + inflationRate); // Divide by inflation to get purchasing power

        nominalBalances.push(balance);
        realBalances.push(realBalance);
    }

    // 4. Display Results
    document.getElementById('nominalBalance').textContent = formatCurrency(nominalBalances[nominalBalances.length - 1]);
    document.getElementById('realBalance').textContent = formatCurrency(realBalances[realBalances.length - 1]);

    // 5. Update Chart
    if (superChart) {
        superChart.destroy(); // Destroy previous chart instance
    }

    superChart = new Chart(superChartCanvas, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Projected Nominal Balance (AUD)',
                data: nominalBalances,
                borderColor: '#007bff', // Blue
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                fill: true,
                tension: 0.3
            }, {
                label: 'Projected Real (Inflation-Adjusted) Balance (AUD)',
                data: realBalances,
                borderColor: '#28a745', // Green
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Super Balance (AUD)'
                    },
                    beginAtZero: false,
                    // Use a callback to format Y-axis labels as currency
                    ticks: {
                        callback: function(value, index, values) {
                            return formatCurrency(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += formatCurrency(context.raw);
                            return label;
                        }
                    }
                }
            }
        }
    });

    // UX: Scroll to results section after calculation
    document.querySelector('.results').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}