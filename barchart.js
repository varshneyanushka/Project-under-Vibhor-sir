let videoTime, totalDuration, table;

function startTimer() {
    if (isRunning) return;  // Don't start if already running
    isRunning = true;
    timerInterval = setInterval(() => {
        curr += 0.01;  // Increment by 0.01 seconds
    }, 10);  // 10ms interval for high precision
}

// Function to pause the timer
function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
}
// Start the timer automatically when the video starts playing
const videoElement = document.getElementById("myVideo");

videoElement.addEventListener('play', function () {
    startTimer(); // Start the timer when the video starts playing
});

// If the video is paused, stop the timer as well
videoElement.addEventListener('pause', function () {
    pauseTimer(); // Pause the timer when the video is paused
});
//spacebar pause feature

let rowi = 10;

let ctx;
let barLineChart;

let delays = [];
async function loadExcelAndGenerateCharts() {
    try {
        const response = await fetch('./data/Book2.xlsx');
        const arrayBuffer = await response.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = jsonData[0];
        const columns = jsonData.slice(1).map(row => row.map(Number));
        ctx = document.getElementById('barLineChart').getContext('2d');

        // Chart configuration
       barLineChart = new Chart(ctx, {
    type: 'bar', // Bar chart
    data: {
        labels: headers.slice(0, 6),
        datasets: [
            {
                label: 'Actual Time (Bar)',
                data: columns[rowi + 1].slice(0, 6),
                backgroundColor: 'rgba(0, 4, 255, 0.59)',
                borderColor: 'rgba(0, 4, 255, 1)',
                borderWidth: 1
            },

        ]
    },
    options: {
        responsive: true,
        scales: {
            
            y: {
                title: {
                    display: true,
                    text: 'Actual Cycle Time',
                    color: 'black' // Set y-axis title color to black
                },
                beginAtZero: true
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: 'black' // Set legend labels color to black
                }
            },
            title: {
                color: 'black' // Set chart title color to black
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label}: ${context.raw} seconds`;
                    }
                }
            }
        }
    }
});

        headers.slice(headers.length - 1, headers.length).forEach((header, index) => {

            const columnData = columns.map(row => row[index]).filter(Number.isFinite);

            const gaussianData10 = calculateGaussian(columnData.slice(0, rowi));
            const peak10 = getPeakXValue(gaussianData10);

            const gaussianData11 = calculateGaussian(columnData.slice(0, rowi + 1));
            const x11 = columnData[rowi];

            const isDanger = x11 > peak10;


            createChart(header, gaussianData10, gaussianData11, x11, isDanger);
        });

        headers.slice(0, headers.length - 1).forEach((header, index) => {

            const columnData = columns.map(row => row[index]).filter(Number.isFinite);

            const gaussianData10 = calculateGaussian(columnData.slice(0, rowi));
            const peak10 = getPeakXValue(gaussianData10);

            const gaussianData11 = calculateGaussian(columnData.slice(0, rowi + 1));
            const x11 = columnData[rowi];

            const isDanger = x11 > peak10;


            createChart(header, gaussianData10, gaussianData11, x11, isDanger);
        });



    } catch (error) {
        console.error("Error loading or processing the Excel file:", error);
    }
}

function calculateGaussian(data) {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const stdDev = Math.sqrt(data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / data.length);

    const gaussianData = [];
    for (let x = mean - 3 * stdDev; x <= mean + 3 * stdDev; x += 0.1) {
        const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
        gaussianData.push({ x, y });
    }
    return gaussianData;
}

function getPeakXValue(gaussianData) {
    return gaussianData.reduce((peak, data) => data.y > peak.y ? data : peak, { x: 0, y: 0 }).x;
}




function createChart(header, gaussianData10, gaussianData11, x11, isDanger) {
    const chartContainer = document.createElement("div");
    chartContainer.classList.add("chart-grid");
    const canvas = document.createElement("canvas");
    chartContainer.appendChild(canvas);
    document.getElementById("chartsContainer").appendChild(chartContainer);
    if (isDanger) {
        delays.push(header);
    }

    const colors = {
        backgroundColor: isDanger ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 192, 36, 0.1)',
        borderColor: isDanger ? 'rgba(255, 0, 0, 1)' : 'rgba(0, 192, 36, 0.63)'
    };

    new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            datasets: [
                {
                    label: `First ${rowi} Data Points`,
                    data: gaussianData10,
                    borderColor: "rgba(0, 4, 255, 0.59)",
                    fill: true,
                },
                {
                    label: `First ${rowi + 1} Data Points`,
                    data: gaussianData11,
                    
                    backgroundColor: colors.backgroundColor,
                    borderColor: colors.borderColor,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,

            plugins: {
                legend: { position: "top" },
                title: { display: true, text: header },
            },

            scales: {
                x: { type: "linear", align: screenLeft },
                y: { beginAtZero: true }
            },
        },
    });

   



}

function populateRandomDetails() {
    // Generate random date
    const today = new Date();
    const randomDay = today.getDate() + Math.floor(Math.random() * 30); // Add up to 30 random days
    const randomDate = new Date(today.getFullYear(), today.getMonth(), randomDay);

    // Generate random time 
    const randomHours = Math.floor(Math.random() * 24);
    const randomMinutes = Math.floor(Math.random() * 60);
    const randomTime = new Date(randomDate.getFullYear(), randomDate.getMonth(), randomDate.getDate(), randomHours, randomMinutes);

    // Format date and time for display
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', options);

    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const formattedTime = randomTime.toLocaleTimeString('en-US', timeOptions);

    // Set values
    document.getElementById("date-column").textContent = formattedDate;
    document.getElementById("time-column").textContent = formattedTime;
    document.getElementById("shift-column").textContent = `3 Shift`;
    document.getElementById("remaining-shift-time-column").textContent = `2 hrs`;
    document.getElementById("workpiece-column").textContent = `Workpiece s`;
}


let headers = [];  // Declare headers and columns globally
let columns = [];
let curr = 0;
let timerInterval = null;
let isRunning = false;
let hi = 0;

let starttime = 0;
let serial = 0;



// Listen for the spacebar key press to toggle play/pause of the video and timer
document.addEventListener('keydown', function (event) {
    event.preventDefault();
    const video = document.getElementById("myVideo");

    if (event.code === "Space") {
        if (video.paused) {
            // Play the video and resume the timer
            video.play();
            startTimer();
        } else {
            // Pause the video and stop the timer
            video.pause();
            pauseTimer();
        }
    }
});


let nor = 10;
async function fetchExcelData() {
    const response = await fetch('./data/Book2.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    headers = jsonData[0];
    columns = jsonData.slice(1).map(row => row.map(Number));
    nor = jsonData.length;


    document.getElementById("myVideo").addEventListener('timeupdate', function () {
        // const t = document.getElementById("c");
        // if (t) {
        //     t.textContent = curr; // Update current time in the HTML
        // }

        // Check if video time has reached a certain point and add/update rows in the table
        if (starttime <= curr && hi < (headers.length - 1)) {
            const updatedValues = createrow();
            starttime = updatedValues.starttime;
            serial = updatedValues.serial;
            hi = updatedValues.hi;
            atp = updatedValues.atp;
        }
    });
}

const at = [1.46, 5.95, 10.44, 15.00, 22.39, 50.00]
let atp = 0;

// Function to create a new row in the table
function createrow() {
    let tbody = document.getElementById("time-table").querySelector('tbody');

    // Ensure tbody exists
    if (!tbody) {
        const newTbody = document.createElement("tbody");
        document.getElementById("time-table").appendChild(newTbody);
        tbody = newTbody;
    }

    // Access operation from columns at the current index and hi
    const cycletime = parseFloat(columns[rowi + 1][hi].toFixed(2));

    // Create a new row for the table
    const newRow = document.createElement("tr");
    newRow.classList.add("border", "border-black");

    // Add cells to the row with the operation and other data
    newRow.innerHTML = `
                <td class="border border-black p-1">${serial + 1}</td> <!-- Serial No. -->
                <td class="border border-black p-1">${headers[hi]}</td> <!-- Operation -->
                <td class="border border-black p-1">${starttime}</td> <!-- Starting Time -->
                <td class="border border-black p-1">${parseFloat((starttime + cycletime).toFixed(2))}</td> <!-- Expected Ending Time -->
                <td class="border border-black p-1">${at[atp]}</td> <!-- Expected Ending Time -->
            `;

    // Append the new row to the table body
    tbody.appendChild(newRow);

    // Return updated values for the next operation
    return {
        starttime: parseFloat((starttime + cycletime).toFixed(2)), // Update starttime for the next row
        serial: serial + 1,               // Increment the serial number
        hi: hi + 1,
        atp: atp + 1               // Increment the index (to move to the next operation)
    };
}
let ds;


function message() {
    const video = document.getElementById("myVideo");

    // Listen for the 'ended' event to show the message
    video.addEventListener("ended", function () {
        document.getElementById("message").style.visibility = "visible";
        ds = delays.join(", ");
        document.getElementById("message").innerHTML = `There is a delay in : ${ds}`;
    });

    // Check for near end using a range for safety
    video.addEventListener("timeupdate", function () {
        if (Math.abs(curr - totalDuration) < 0.1) {
            document.getElementById("message").style.visibility = "visible";
            const ds = delays.join(", ");
            if (ds === "") { // Check if ds is an empty string
                document.getElementById("message").innerHTML = "There were no delays observed!";
            } else {
                document.getElementById("message").innerHTML = `There is a delay in :  ${ds}`;
            }
        } else {
            document.getElementById("message").style.visibility = "hidden";
        }
    });
}

// Call `message` after video element and delays array are ready
document.getElementById("myVideo").addEventListener("loadedmetadata", () => {
    totalDuration = document.getElementById("myVideo").duration;
    message();
});

// <block:setup:1>



// Call the function to fetch and process the Excel data
fetchExcelData();
loadExcelAndGenerateCharts();

populateRandomDetails();


document.getElementById("workpiece-column").textContent = rowi + 1;
function onButtonClick() {

    if (barLineChart) {
        barLineChart.destroy();
    }
    // Step 1: Clear previous charts
    const chartsContainer = document.getElementById("chartsContainer");
    while (chartsContainer.firstChild) {
        chartsContainer.removeChild(chartsContainer.firstChild);
    }

    // Step 2: Clear previous table rows
    const tbody = document.getElementById("time-table").querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = '';  // Clear existing rows
    }

    // if (barLineChart) {
    //     barLineChart='';
    // }

    const chartGridElement = document.createElement('div');
    chartGridElement.id = 'chart-grid';
    chartGridElement.className = 'chart-grid';

    // Step 3: Create a new canvas element for the bar chart
    const barChartCanvas = document.createElement('canvas');
    barChartCanvas.id = 'barLineChart';

    chartGridElement.appendChild(barChartCanvas);
    document.getElementById('chartsContainer').appendChild(chartGridElement);







    // Step 3: Reset the current time (curr)
    curr = 0;
    hi = 0;
    starttime = 0;
    serial = 0;
    ds = [];
    delays = [];
    atp = 0;

    // Step 4: Reset the video to the beginning and play it
    const video = document.getElementById("myVideo");
    video.currentTime = 0; // Reset video to start
    video.play(); // Play the video from the beginning

    // Step 5: Re-initialize the analysis with the new data
    rowi++; // Reset rowi (or any other variables if needed)

    document.getElementById("workpiece-column").textContent = rowi + 1;
    fetchExcelData();
    loadExcelAndGenerateCharts();
}


