let videoTime, totalDuration, table;

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

let rowi = 10;

let ctx;
let barLineChart;

let delays = [];
async function loadExcelAndGenerateCharts() {
  try {
    const response = await fetch("./data/Book2.xlsx");
    const arrayBuffer = await response.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = jsonData[0];
    const columns = jsonData.slice(1).map((row) => row.map(Number));
    ctx = document.getElementById("barLineChart").getContext("2d");

    // Chart configuration
    barLineChart = new Chart(ctx, {
      type: "bar", // Bar chart
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

    headers
      .slice(headers.length - 1, headers.length)
      .forEach((header, index) => {
        const columnData = columns
          .map((row) => row[index])
          .filter(Number.isFinite);

        const gaussianData10 = calculateGaussian(columnData.slice(0, rowi));
        const peak10 = getPeakXValue(gaussianData10);

        const gaussianData11 = calculateGaussian(columnData.slice(0, rowi + 1));
        const x11 = columnData[rowi];

        const isDanger = x11 > peak10;

        createChart(header, gaussianData10, gaussianData11, x11, isDanger);
      });

    headers.slice(0, headers.length - 1).forEach((header, index) => {
      const columnData = columns
        .map((row) => row[index])
        .filter(Number.isFinite);

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
  return gaussianData;
}

function getPeakXValue(gaussianData) {
  return gaussianData.reduce((peak, data) => (data.y > peak.y ? data : peak), {
    x: 0,
    y: 0,
  }).x;
}

let hr = 1;

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
    backgroundColor: isDanger
      ? "rgba(255, 0, 0, 0.2)"
      : "rgba(0, 192, 36, 0.1)",
    borderColor: isDanger ? "rgba(255, 0, 0, 1)" : "rgba(0, 192, 36, 0.63)",
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

      scales: {
        x: {
          title: {
            display: true,
            text: header,
            color: "black",
            font: {
              weight: "bold", // Makes the text bold
              size: 13, // Adjust the size if needed
            },
          },
          type: "linear",
          align: screenLeft,
        },

        y: { beginAtZero: true },
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
  document.getElementById("time-column").textContent = formattedTime;
  document.getElementById("shift-column").textContent = `3 Shift`;
  document.getElementById("remaining-shift-time-column").textContent = `2 hrs`;
  document.getElementById("workpiece-column").textContent = `Workpiece s`;
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
  document.body.innerHTML = "";

  const loadingContainer = document.createElement("div");
  loadingContainer.style.display = "flex";
  loadingContainer.style.flexDirection = "column";
  loadingContainer.style.justifyContent = "center";
  loadingContainer.style.alignItems = "center";
  loadingContainer.style.height = "100vh";
  loadingContainer.style.backgroundColor = "#f4f4f4";
  loadingContainer.style.textAlign = "center";

  const spinner = document.createElement("div");
  spinner.style.border = "6px solid #ddd";
  spinner.style.borderTop = "6px solid #007BFF";
  spinner.style.borderRadius = "50%";
  spinner.style.width = "50px";
  spinner.style.height = "50px";
  spinner.style.animation = "spin 1s linear infinite";
  loadingContainer.appendChild(spinner);

  const loadingText = document.createElement("p");
  loadingText.textContent = "Processing...";
  loadingText.style.marginTop = "15px";
  loadingText.style.fontSize = "18px";
  loadingText.style.fontWeight = "bold";
  loadingText.style.color = "#333";
  loadingContainer.appendChild(loadingText);

  document.body.appendChild(loadingContainer);

  setTimeout(() => {
    document.body.innerHTML = "";

    const messageContainer = document.createElement("div");
    messageContainer.style.display = "flex";
    messageContainer.style.flexDirection = "column";
    messageContainer.style.justifyContent = "center";
    messageContainer.style.alignItems = "center";
    messageContainer.style.height = "100vh";
    messageContainer.style.backgroundColor = "#f4f4f4";
    messageContainer.style.textAlign = "center";

    const message = document.createElement("h1");
    message.textContent =
      "No more workpieces left to be processed. Reload the page to review analysis";
    message.style.color = "#333";
    message.style.fontSize = "24px";
    message.style.fontWeight = "bold";
    message.style.marginBottom = "20px";
    messageContainer.appendChild(message);

    document.body.appendChild(messageContainer);
  }, 500);

  const style = document.createElement("style");
  style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
  document.head.appendChild(style);
}

let nor = 10;
async function fetchExcelData() {
  const response = await fetch("./data/Book2.xlsx");
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
      if (rowi + 1 === 20) {
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

const at = [1.46, 5.95, 10.44, 15.0, 22.39, 50.0];
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

document.getElementById("workpiece-column").textContent = rowi + 1;
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
  document.getElementById("workpiece-column").textContent = rowi + 1;
  fetchExcelData();
  loadExcelAndGenerateCharts();
}

