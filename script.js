document.addEventListener('DOMContentLoaded', () => {
    const currentAgeInput = document.getElementById('currentAge');
    const currentBalanceInput = document.getElementById('currentBalance');
    const annualSalaryInput = document.getElementById('annualSalary');
    const displaySGrate = document.getElementById('displaySGrate'); // New element
    const extraContributionsInput = document.getElementById('extraContributions');
    const investmentReturnInput = document.getElementById('investmentReturn');
    const inflationRateOption = document.getElementById('inflationRateOption'); // New select
    const inflationRateInput = document.getElementById('inflationRate');
    const fixedInflationRateGroup = document.getElementById('fixedInflationRateGroup'); // New div
    const retirementAgeInput = document.getElementById('retirementAge');
    const calculateBtn = document.getElementById('calculateBtn');

    const retirementAgeDisplay = document.getElementById('retirementAgeDisplay');
    const nominalBalanceDisplay = document.getElementById('nominalBalance');
    const realBalanceDisplay = document.getElementById('realBalance');
    const superChartCanvas = document.getElementById('superChart');

    let superChart; // To hold our Chart.js instance

    // --- Data for SG Rates and Inflation Rates ---

    // ATO Superannuation Guarantee (SG) Schedule (from search results)
    const sgRates = [
        { year: 2023, rate: 0.110 }, // FY 2023-2024 (July 2023 - June 2024)
        { year: 2024, rate: 0.115 }, // FY 2024-2025 (July 2024 - June 2025)
        { year: 2025, rate: 0.120 }  // FY 2025-2026 and onwards (July 2025 - June 2026 onwards)
    ];

    // Maximum Super Contribution Base per quarter (for ordinary time earnings)
    // This is indexed annually by AWOTE. We'll use recent/future published values.
    // Assuming annual salary is divided by 4 for quarterly calculation check
    const maxContributionBaseQuarterly = {
        2023: 62270, // FY 2023-24
        2024: 65070, // FY 2024-25
        2025: 62500  // FY 2025-26
    };


    // Historical and Projected Australian Annual CPI (Inflation) Data (Year-ended March Quarter, from ABS/RBA)
    // Using a blend of historical from ABS and future RBA targets/projections.
    // Important: For a real app, you might want to fetch this daily/quarterly from a reliable, updated source.
    // For this simple project, hardcoding recent and projecting future is a good starting point.
    const inflationData = {
        // Historical (Year-ended March Quarter CPI, source: ABS, RBA)
        2015: 0.013,
        2016: 0.013,
        2017: 0.021,
        2018: 0.019,
        2019: 0.013,
        2020: 0.022, // Pre-pandemic
        2021: 0.011, // Pandemic low
        2022: 0.051,
        2023: 0.070,
        2024: 0.036,
        2025: 0.024, // Q1 2025 (latest available at query time is March 2025, 2.4%)

        // Projections (simplified based on RBA targets/forecasts)
        2026: 0.025, // RBA target mid-point
        2027: 0.025,
        2028: 0.025,
        2029: 0.025,
        2030: 0.025,
        // ... and so on for future years ...
        // For years beyond 2030, we'll use a default long-term projection if no specific data exists
    };


    // --- Helper Functions ---

    function getCurrentFinancialYear(date) {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed (0 = Jan, 6 = July)
        return (month >= 6) ? year : year - 1; // July onwards is new FY
    }

    function getSGrateForYear(financialYear) {
        // Find the rate for the given financial year
        for (let i = sgRates.length - 1; i >= 0; i--) {
            if (financialYear >= sgRates[i].year) {
                return sgRates[i].rate;
            }
        }
        // If year is before our earliest data, use the earliest rate
        return sgRates[0].rate;
    }

    function getInflationRateForYear(year) {
        if (inflationRateOption.value === 'fixed') {
            return parseFloat(inflationRateInput.value) / 100;
        } else { // 'historical' option
            // Find the closest historical rate or use a projection
            const historicalRate = inflationData[year];
            if (historicalRate !== undefined) {
                return historicalRate;
            } else {
                // If no specific historical data or projection, use a long-term average/target
                return 0.025; // Default long-term RBA target
            }
        }
    }

    function calculateSuperGrowth() {
        let currentAge = parseInt(currentAgeInput.value);
        let currentBalance = parseFloat(currentBalanceInput.value);
        const annualSalary = parseFloat(annualSalaryInput.value);
        const extraContributions = parseFloat(extraContributionsInput.value);
        const investmentReturnRate = parseFloat(investmentReturnInput.value) / 100;
        const retirementAge = parseInt(retirementAgeInput.value);

        if (currentAge >= retirementAge) {
            alert('Your current age must be less than your desired retirement age.');
            return;
        }

        const yearsToRetirement = retirementAge - currentAge;
        const startFinancialYear = getCurrentFinancialYear(new Date());

        let annualBalances = [];
        let realBalances = [];
        let years = [];
        let currentCalculatedYear = currentAge; // To track age for chart labels

        for (let yearCounter = 0; yearCounter <= yearsToRetirement; yearCounter++) {
            const currentYear = startFinancialYear + yearCounter;
            const ageAtEndOfYear = currentAge + yearCounter;

            if (ageAtEndOfYear > retirementAge) break; // Stop at retirement age

            years.push(`Age ${ageAtEndOfYear}`); // Label with age for clarity

            // Get SG rate for the current financial year
            const sgRate = getSGrateForYear(currentYear);
            displaySGrate.textContent = (sgRate * 100).toFixed(1); // Update live display

            // Calculate employer contributions, respecting maximum contribution base
            const quarterlySalary = annualSalary / 4;
            const maxBaseForYear = maxContributionBaseQuarterly[currentYear] || maxContributionBaseQuarterly[Object.keys(maxContributionBaseQuarterly).pop()]; // Use latest if future not defined
            const effectiveQuarterlySalary = Math.min(quarterlySalary, maxBaseForYear);
            const annualEmployerContribution = (effectiveQuarterlySalary * sgRate) * 4; // Multiply by 4 quarters

            // Total annual contributions
            const totalAnnualContributions = annualEmployerContribution + extraContributions;

            // Apply contributions and investment returns
            // For simplicity, we'll add contributions at the start of the year and apply full year return.
            // In reality, super contributions are quarterly.
            if (yearCounter > 0 || currentBalance === 0) { // Add contributions from year 1, or if starting balance is 0
                 currentBalance += totalAnnualContributions;
            }


            currentBalance *= (1 + investmentReturnRate);

            // Store nominal balance
            annualBalances.push(currentBalance);

            // Get inflation rate for the current year
            const annualInflationRate = getInflationRateForYear(currentYear);

            // Calculate real balance (inflation-adjusted to today's purchasing power)
            // The real value is discounted by the cumulative inflation up to that year
            const cumulativeInflationFactor = Math.pow((1 + annualInflationRate), yearCounter);
            const realValue = currentBalance / cumulativeInflationFactor;
            realBalances.push(realValue);
        }

        const finalNominalBalance = annualBalances[annualBalances.length - 1];
        const finalRealBalance = realBalances[realBalances.length - 1];

        retirementAgeDisplay.textContent = retirementAge;
        nominalBalanceDisplay.textContent = formatCurrency(finalNominalBalance);
        realBalanceDisplay.textContent = formatCurrency(finalRealBalance);

        updateChart(years, annualBalances, realBalances);
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    function updateChart(labels, nominalData, realData) {
        if (superChart) {
            superChart.destroy();
        }

        superChart = new Chart(superChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Nominal Balance (AUD)',
                        data: nominalData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)', // For shaded area if fill: true
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'Real Balance (AUD, Inflation Adjusted)',
                        data: realData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Super Balance (AUD)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Age'
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
                                if (context.parsed.y !== null) {
                                    label += formatCurrency(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Event Listeners and Initial Setup ---

    // Toggle fixed inflation input visibility
    inflationRateOption.addEventListener('change', () => {
        if (inflationRateOption.value === 'fixed') {
            fixedInflationRateGroup.style.display = 'block';
        } else {
            fixedInflationRateGroup.style.display = 'none';
        }
        calculateSuperGrowth(); // Recalculate when option changes
    });

    // Recalculate on any input change
    const inputs = document.querySelectorAll('.input-group input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateSuperGrowth);
    });

    calculateBtn.addEventListener('click', calculateSuperGrowth);

    // Initial calculation on page load
    calculateSuperGrowth();
});