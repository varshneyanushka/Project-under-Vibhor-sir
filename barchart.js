let videoTime, totalDuration, table;
let designcycletime=0;
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  timerInterval = setInterval(() => {
    curr += 0.01;
  }, 10);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
}

const videoElement = document.getElementById("myVideo");

videoElement.addEventListener("play", function () {
  startTimer();
});

videoElement.addEventListener("pause", function () {
  pauseTimer();
});

let rowi = 9;

let ctx;
let barLineChart;

let delays = [];
async function loadExcelAndGenerateCharts() {
  try {
    const response = await fetch("./data/Book2_copy.xlsx");
    const arrayBuffer = await response.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = jsonData[0];
    const columns = jsonData.slice(1).map((row) => row.map(Number));
    const ctx = document.getElementById("barLineChart").getContext("2d");

    // Chart configuration for bar chart
    const barLineChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: headers.slice(0, 6),
        datasets: [
          {
            label: "Actual Time (Bar)",
            data: columns[rowi + 1].slice(0, 6),
            backgroundColor: "rgba(0, 4, 255, 0.59)",
            borderColor: "rgba(0, 4, 255, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            title: {
              display: true,
              text: "Actual Cycle Time",
              color: "black",
              font: {
                weight: "bold",
                size: 13,
              },
            },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            labels: {
              color: "black",
            },
          },
          title: {
            color: "black",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${context.raw} seconds`;
              },
            },
          },
        },
      },
    });

    // Process the last header and its column separately
    const lastHeaderIndex = headers.length - 1;
    const lastHeader = headers[lastHeaderIndex];
    const lastColumnData = columns
      .map((row) => row[lastHeaderIndex])
      .filter(Number.isFinite);

    const {
      gaussianData: lastGaussianData10,
      limit1: lastlimit1,
      limit2: lastlimit2,
    } = calculateGaussian(lastColumnData.slice(0, rowi));
    const lastPeak10 = getPeakXValue(lastGaussianData10);
    designcycletime=lastColumnData[rowi+2];

    const lastX11 = lastColumnData[rowi + 1];
    const lastIsDanger = lastX11 < lastlimit2 && lastX11 > lastlimit1;

    createChart(
      lastHeader,
      lastGaussianData10,
      null, // Assuming no 11-point Gaussian data
      lastX11,
      lastIsDanger,
      lastlimit1,
      lastlimit2
    );

    // Process all headers except the last one
    headers.slice(0, lastHeaderIndex).forEach((header, index) => {
      const columnData = columns
        .map((row) => row[index])
        .filter(Number.isFinite);
        

      const {
        gaussianData: gaussianData10,
        limit1: lastlimit1,
        limit2: lastlimit2,
      } = calculateGaussian(columnData.slice(0, rowi));
      const peak10 = getPeakXValue(gaussianData10);
      

      const x11 = columnData[rowi + 1];
      const isDanger = x11 < lastlimit2 && x11 > lastlimit1;

      createChart(
        header,
        gaussianData10,
        null,
        x11,
        isDanger,
        lastlimit1,
        lastlimit2
      );
    });
  } catch (error) {
    console.error("Error loading or processing the Excel file:", error);
  }
}

function calculateGaussian(data) {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const stdDev = Math.sqrt(
    data.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / data.length
  );

  const gaussianData = [];
  for (let x = mean - 3 * stdDev; x <= mean + 3 * stdDev; x += 0.1) {
    const y =
      (1 / (stdDev * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    gaussianData.push({ x, y });
  }
  const limit1 = mean - stdDev;
  const limit2 = mean + stdDev;

  // Return both Gaussian data and standard deviation
  return { gaussianData, limit1, limit2 };
}

function getPeakXValue(gaussianData) {
  return gaussianData.reduce((peak, data) => (data.y > peak.y ? data : peak), {
    x: 0,
    y: 0,
  }).x;
}

let hr = 1;

function createChart(
  header,
  gaussianData10,
  gaussianData11,
  x11,
  isDanger,
  lastlimit1,
  lastlimit2
) {
  const chartContainer = document.createElement("div");
  chartContainer.classList.add("chart-grid");
  const canvas = document.createElement("canvas");
  chartContainer.appendChild(canvas);
  document.getElementById("chartsContainer").appendChild(chartContainer);

  if (isDanger) {
    delays.push(header);
  }

  const colors = {
    backgroundColor: isDanger ? "rgba(0, 192, 36, 1)" : "rgba(255, 0, 0, 1)",
    borderColor: isDanger ? "rgba(0, 192, 36, 0.63)" : "rgba(255, 0, 0, 1)",
  };

  new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      datasets: [
        {
          label: `Overall`,
          data: gaussianData10,
          backgroundColor: "rgba(0, 4, 255, 0.1)",
          borderColor: "rgba(0, 4, 255, 0.59)",
          fill: true,
        },
        {
          label: "cycle time",
          data: [
            { x: x11, y: 0 },
            { x: x11, y: Math.max(...gaussianData10.map((d) => d.y)) },
          ],
          borderColor: colors.backgroundColor, // Vertical line color
          borderWidth: 2,
          fill: false,
          showLine: true,
        },
        {
          label: "limit", // First limit line
          data: [
            { x: lastlimit1, y: 0 },
            { x: lastlimit1, y: Math.max(...gaussianData10.map((d) => d.y)) },
          ],
          borderColor: "rgba(99, 99, 99, 0.5)", // Vertical line color
          borderWidth: 2,
          fill: false,
          showLine: true,
        },
        {
          label: "limit", // Second limit line
          data: [
            { x: lastlimit2, y: 0 },
            { x: lastlimit2, y: Math.max(...gaussianData10.map((d) => d.y)) },
          ],
          borderColor: "rgba(99, 99, 99, 0.5)", // Vertical line color
          borderWidth: 2,
          fill: false,
          showLine: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            // Filter legend items to hide the "limit" labels
            filter: function (legendItem, chartData) {
              return legendItem.text !== "limit"; // Hide "limit" labels from the legend
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (tooltipItem) {
              // Hide tooltips for "limit" datasets
              if (tooltipItem.dataset.label === "limit") {
                return null; // No tooltip for "limit"
              }
              // Show tooltip for other datasets
              return `x: ${tooltipItem.raw.x.toFixed(
                4
              )}, y: ${tooltipItem.raw.y.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: header,
            color: "black",
            font: {
              weight: "bold",
              size: 13,
            },
          },
          type: "linear",
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  });
  

  if (hr === 1) {
    const horizontalLine = document.createElement("div");
    horizontalLine.className = "horizontal-line";
    document.getElementById("chartsContainer").appendChild(horizontalLine);
  }
  hr++;
}

let noofjobsrem = 10;
const expecteddeliverytime = 540;
let timeremaining = 540;
let tardiness = 0;


function populateRandomDetails() {
  const today = new Date();
  const randomDay = today.getDate() + Math.floor(Math.random() * 30);
  const randomDate = new Date(today.getFullYear(), today.getMonth(), randomDay);

  const randomHours = Math.floor(Math.random() * 24);
  const randomMinutes = Math.floor(Math.random() * 60);
  const randomTime = new Date(
    randomDate.getFullYear(),
    randomDate.getMonth(),
    randomDate.getDate(),
    randomHours,
    randomMinutes
  );

  const options = { year: "numeric", month: "short", day: "numeric" };
  const formattedDate = today.toLocaleDateString("en-US", options);

  const timeOptions = { hour: "2-digit", minute: "2-digit" };
  const formattedTime = randomTime.toLocaleTimeString("en-US", timeOptions);

  // Set values
  document.getElementById("date-column").textContent = formattedDate;
  document.getElementById("jobs").textContent = noofjobsrem-1;
  document.getElementById("shift-column").textContent =expecteddeliverytime + " seconds";
  document.getElementById("remaining-shift-time-column").textContent =timeremaining + " seconds";
  document.getElementById("tardiness").textContent = tardiness + " seconds";
}

let headers = [];
let columns = [];
let curr = 0;
let timerInterval = null;
let isRunning = false;
let hi = 0;
let starttime = 0;
let serial = 0;

document.addEventListener("keydown", function (event) {
  event.preventDefault();
  const video = document.getElementById("myVideo");

  if (event.code === "Space") {
    if (video.paused) {
      video.play();
      startTimer();
    } else {
      video.pause();
      pauseTimer();
    }
  }
});

function handleNoMoreWorkpieces() {
  // Clear the current content
  document.body.innerHTML = "";

  // Create a container for the loading screen
  const loadingContainer = document.createElement("div");
  loadingContainer.style.display = "flex";
  loadingContainer.style.flexDirection = "column";
  loadingContainer.style.justifyContent = "center";
  loadingContainer.style.alignItems = "center";
  loadingContainer.style.height = "100vh";
  loadingContainer.style.backgroundColor = "#eef2f3";
  loadingContainer.style.textAlign = "center";
  loadingContainer.style.fontFamily = "'Poppins', sans-serif";

  // Create a spinner with a gradient for better aesthetics
  const spinner = document.createElement("div");
  spinner.style.border = "6px solid #e0e0e0";
  spinner.style.borderTop = "6px solid #3498db";
  spinner.style.borderRadius = "50%";
  spinner.style.width = "60px";
  spinner.style.height = "60px";
  spinner.style.animation = "spin 1s linear infinite";
  loadingContainer.appendChild(spinner);

  // Add a loading text
  const loadingText = document.createElement("p");
  loadingText.textContent = "Processing...";
  loadingText.style.marginTop = "20px";
  loadingText.style.fontSize = "20px";
  loadingText.style.fontWeight = "500";
  loadingText.style.color = "#555";
  loadingContainer.appendChild(loadingText);

  // Append the loading container to the body
  document.body.appendChild(loadingContainer);

  // Transition to the results screen after a delay
  setTimeout(() => {
    // Clear the loading screen
    document.body.innerHTML = "";

    // Create a container for the message screen
    const messageContainer = document.createElement("div");
    messageContainer.style.display = "flex";
    messageContainer.style.flexDirection = "column";
    messageContainer.style.justifyContent = "center";
    messageContainer.style.alignItems = "center";
    messageContainer.style.height = "100vh";
    messageContainer.style.backgroundColor = "#fdfdfd";
    messageContainer.style.textAlign = "center";
    messageContainer.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    messageContainer.style.borderRadius = "12px";
    messageContainer.style.padding = "20px";
    messageContainer.style.fontFamily = "'Poppins', sans-serif";

    // First message
    const message1 = document.createElement("p");
    message1.textContent = "No more workpieces left to be processed.";
    message1.style.color = "#333";
    message1.style.fontSize = "24px";
    message1.style.fontWeight = "600";
    message1.style.marginBottom = "15px";
    messageContainer.appendChild(message1);

    // Second message
    const message2 = document.createElement("p");
    message2.textContent = "Reload the page to review analysis.";
    message2.style.color = "#555";
    message2.style.fontSize = "18px";
    message2.style.fontWeight = "500";
    message2.style.marginBottom = "15px";
    messageContainer.appendChild(message2);

    // Third message with highlighted tardiness
    const message3 = document.createElement("p");
    message3.innerHTML =
      "You have a latency of <span style='color: #e74c3c; font-weight: bold;'>" +
      tardiness +
      " seconds</span>.";
    message3.style.color = "#333";
    message3.style.fontSize = "20px";
    message3.style.fontWeight = "500";
    message3.style.marginBottom = "20px";
    messageContainer.appendChild(message3);

    if (timeremaining >=0 && tardiness >= 0) {
      const message4 = document.createElement("p");
      message4.textContent =
        "You will be able to finish the manufacturing on time. " ;
      message4.style.color = "#50C878"; // Green for success
      message4.style.fontSize = "18px";
      message4.style.fontWeight = "500";
      message4.style.marginBottom = "15px";
      messageContainer.appendChild(message4);
    } else {
      const message4 = document.createElement("p");
      message4.textContent =
        "You will NOT be able to finish the manufacturing on time due to several delays." ;
      message4.style.color = "#e74c3c"; // Red for failure
      message4.style.fontSize = "18px";
      message4.style.fontWeight = "500";
      message4.style.marginBottom = "15px";
      messageContainer.appendChild(message4);
    }
    

    

    // Append the message container to the body
    document.body.appendChild(messageContainer);
  }, 500); // Increased delay for better transition

  // Add spinner animation styles
  const style = document.createElement("style");
  style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(120deg, #f6f9fc, #eef2f3);
        }
    `;
  document.head.appendChild(style);
}


let nor = 10;
async function fetchExcelData() {
  const response = await fetch("./data/Book2_copy.xlsx");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  headers = jsonData[0];
  columns = jsonData.slice(1).map((row) => row.map(Number));
  nor = jsonData.length;

  document
    .getElementById("myVideo")
    .addEventListener("timeupdate", function () {
      // const t = document.getElementById("c");
      // if (t) {
      //     t.textContent = curr; // Update current time in the HTML
      // }

      // Check if video time has reached a certain point and add/update rows in the table
      if (noofjobsrem === 0) {
        handleNoMoreWorkpieces(); // Clear page and display message
        return;
      }
      if (starttime <= curr && hi < headers.length - 1) {
        const updatedValues = createrow();
        starttime = updatedValues.starttime;
        serial = updatedValues.serial;
        hi = updatedValues.hi;
        atp = updatedValues.atp;
      }
    });
}

const at = [1.96, 12.86, 26.84, 33.31, 44.9, 54];
let atp = 0;

// Function to create a new row in the table
function createrow() {
  let tbody = document.getElementById("time-table").querySelector("tbody");

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

  newRow.innerHTML = `
                <td class="border border-black p-1">${
                  serial + 1
                }</td> <!-- Serial No. -->
                <td class="border border-black p-1">${
                  headers[hi]
                }</td> <!-- Operation -->
                <td class="border border-black p-1">${starttime}</td> <!-- Starting Time -->
                <td class="border border-black p-1">${parseFloat(
                  (starttime + cycletime).toFixed(2)
                )}</td> <!-- Expected Ending Time -->
                <td class="border border-black p-1">${
                  at[atp]
                }</td> <!-- Expected Ending Time -->
            `;

  tbody.appendChild(newRow);

  return {
    starttime: parseFloat((starttime + cycletime).toFixed(2)),
    serial: serial + 1,
    hi: hi + 1,
    atp: atp + 1,
  };
}
let ds;

function message() {
  const video = document.getElementById("myVideo");

  video.addEventListener("ended", function () {
    document.getElementById("message").style.visibility = "visible";
    ds = delays.join(", ");
    document.getElementById(
      "message"
    ).innerHTML = `There is a delay in : ${ds}`;
  });

  video.addEventListener("timeupdate", function () {
    if (Math.abs(curr - totalDuration) < 0.1) {
      document.getElementById("message").style.visibility = "visible";
      const ds = delays.join(", ");
      if (ds === "") {
        document.getElementById("message").innerHTML =
          "There were no delays observed!";
      } else {
        document.getElementById(
          "message"
        ).innerHTML = `There is a delay in :  ${ds}`;
      }
    } else {
      document.getElementById("message").style.visibility = "hidden";
    }
  });
}

document.getElementById("myVideo").addEventListener("loadedmetadata", () => {
  totalDuration = document.getElementById("myVideo").duration;
  message();
});

fetchExcelData();
loadExcelAndGenerateCharts();

populateRandomDetails();

document.getElementById("workpiece-column").textContent = rowi + 2;
function onButtonClick() {
  if (barLineChart) {
    barLineChart.destroy();
  }

  const chartsContainer = document.getElementById("chartsContainer");
  while (chartsContainer.firstChild) {
    chartsContainer.removeChild(chartsContainer.firstChild);
  }

  const tbody = document.getElementById("time-table").querySelector("tbody");
  if (tbody) {
    tbody.innerHTML = "";
  }

  // if (barLineChart) {
  //     barLineChart='';
  // }

  const chartGridElement = document.createElement("div");
  chartGridElement.id = "chart-grid";
  chartGridElement.className = "chart-grid";

  const barChartCanvas = document.createElement("canvas");
  barChartCanvas.id = "barLineChart";

  chartGridElement.appendChild(barChartCanvas);
  document.getElementById("chartsContainer").appendChild(chartGridElement);

  curr = 0;
  hi = 0;
  starttime = 0;
  serial = 0;
  ds = [];
  delays = [];
  atp = 0;
  hr = 1;

  const video = document.getElementById("myVideo");
  video.currentTime = 0;
  video.play();



  
  rowi++;
  
  noofjobsrem--;
// Update timeremaining and ensure it is an integer
timeremaining = Math.round(timeremaining - designcycletime) > 0  ? Math.round(timeremaining - designcycletime) : 0;


// Update tardiness and ensure it is an integer
tardiness = tardiness + Math.round(
  (54 - designcycletime > 0 || isNaN(designcycletime)) 
  ? 0 
  : designcycletime - 54
);



  
  document.getElementById("jobs").textContent = noofjobsrem-1;
  document.getElementById("remaining-shift-time-column").textContent = timeremaining + " seconds";
  document.getElementById("tardiness").textContent = tardiness + " seconds";

  document.getElementById("workpiece-column").textContent = rowi + 2;
  fetchExcelData();
  loadExcelAndGenerateCharts();
}
