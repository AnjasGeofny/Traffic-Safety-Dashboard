// Professional Traffic Safety Dashboard
class TrafficDashboard {
  constructor() {
    this.data = [];
    this.filteredData = [];
    this.filters = {
      weather: "",
      lighting: "",
      traffic: "",
    };
    this.charts = {};
    this.colorSchemes = {
      primary: ["#3498db", "#2980b9", "#1f77b4", "#17a2b8", "#6c757d"],
      sequential: [
        "#f7fbff",
        "#deebf7",
        "#c6dbef",
        "#9ecae1",
        "#6baed6",
        "#4292c6",
        "#2171b5",
        "#08519c",
        "#08306b",
      ],
      categorical: [
        "#1f77b4",
        "#ff7f0e",
        "#2ca02c",
        "#d62728",
        "#9467bd",
        "#8c564b",
        "#e377c2",
        "#7f7f7f",
        "#bcbd22",
        "#17becf",
      ],
      diverging: [
        "#d73027",
        "#f46d43",
        "#fdae61",
        "#fee08b",
        "#ffffbf",
        "#e6f598",
        "#abdda4",
        "#66c2a5",
        "#3288bd",
        "#5e4fa2",
      ],
    };

    this.init();
  }
  async init() {
    try {
      console.log("Initializing dashboard...");
      await this.loadData();
      console.log("Data loaded, setting up filters...");
      this.setupFilters();
      console.log("Creating KPIs...");
      this.createKPIs();
      console.log("Creating charts...");
      this.createCharts();
      console.log("Setting up tooltip...");
      this.setupTooltip();
      console.log("Setting up event listeners...");
      this.setupEventListeners();
      console.log("Dashboard initialization complete!");
    } catch (error) {
      console.error("Error initializing dashboard:", error);
      // Show error message to user
      d3.select("body")
        .append("div")
        .style("position", "fixed")
        .style("top", "50%")
        .style("left", "50%")
        .style("transform", "translate(-50%, -50%)")
        .style("background", "#f8d7da")
        .style("color", "#721c24")
        .style("padding", "20px")
        .style("border-radius", "5px")
        .style("border", "1px solid #f5c6cb")
        .text(`Error loading dashboard: ${error.message}`);
    }
  }
  async loadData() {
    try {
      this.data = await d3.csv("datasets/traffic_accidents.csv");
      this.filteredData = [...this.data];
      console.log(`Loaded ${this.data.length} records`);

      // Debug: Check if we have the expected columns
      if (this.data.length > 0) {
        console.log("Sample data columns:", Object.keys(this.data[0]));
        console.log("Sample record:", this.data[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      throw error;
    }
  }
  setupFilters() {
    // Get unique values with counts to filter out empty/low-count options
    const weatherData = d3.rollup(
      this.data,
      (v) => v.length,
      (d) => d.weather_condition
    );
    const lightingData = d3.rollup(
      this.data,
      (v) => v.length,
      (d) => d.lighting_condition
    );
    const trafficData = d3.rollup(
      this.data,
      (v) => v.length,
      (d) => d.traffic_control_device
    );

    // Filter options that have at least 2 records and are not empty/unknown
    const weatherOptions = Array.from(weatherData.entries())
      .filter(
        ([key, count]) =>
          key &&
          key.trim() !== "" &&
          !key.toLowerCase().includes("unknown") &&
          count >= 2
      )
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([key]) => key);

    const lightingOptions = Array.from(lightingData.entries())
      .filter(
        ([key, count]) =>
          key &&
          key.trim() !== "" &&
          !key.toLowerCase().includes("unknown") &&
          count >= 2
      )
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key);

    const trafficOptions = Array.from(trafficData.entries())
      .filter(
        ([key, count]) =>
          key &&
          key.trim() !== "" &&
          !key.toLowerCase().includes("unknown") &&
          count >= 2
      )
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key);

    this.populateSelect("#weather-filter", weatherOptions);
    this.populateSelect("#lighting-filter", lightingOptions);
    this.populateSelect("#traffic-filter", trafficOptions);

    // Update navbar stats
    this.updateNavbarStats();
  }
  populateSelect(selector, options) {
    const select = d3.select(selector);
    options.forEach((option) => {
      select.append("option").attr("value", option).text(option);
    });
  }
  updateNavbarStats() {
    // Navbar stats removed - no longer needed
  }

  applyFilters() {
    this.filteredData = this.data.filter((d) => {
      return (
        (!this.filters.weather ||
          d.weather_condition === this.filters.weather) &&
        (!this.filters.lighting ||
          d.lighting_condition === this.filters.lighting) &&
        (!this.filters.traffic ||
          d.traffic_control_device === this.filters.traffic)
      );
    });

    this.updateDashboard();
  }
  updateDashboard() {
    this.updateNavbarStats(); // Update navbar stats when dashboard updates
    this.updateKPIs();
    this.updateEnvironmentalStats(); // Update environmental statistics
    this.updateCharts();
  }
  createKPIs() {
    const totalAccidents = this.filteredData.length;
    const totalInjuries = d3.sum(
      this.filteredData,
      (d) =>
        (+d.injuries_fatal || 0) +
        (+d.injuries_incapacitating || 0) +
        (+d.injuries_non_incapacitating || 0) +
        (+d.injuries_reported_not_evident || 0)
    );
    const totalFatalities = d3.sum(
      this.filteredData,
      (d) => +d.injuries_fatal || 0
    );
    const averageUnits = d3.mean(this.filteredData, (d) => +d.num_units || 0);

    this.animateKPI("#kpi-value-accidents", totalAccidents, 0);
    this.animateKPI("#kpi-value-injuries", totalInjuries, 0);
    this.animateKPI("#kpi-value-fatalities", totalFatalities, 0);
    this.animateKPI("#kpi-value-average-units", averageUnits, 1);

    // Initialize percentage indicators to 100% since no filters are applied initially (showing 100% of data)
    this.updateKPIChange("#kpi-change-accidents", "100.0");
    this.updateKPIChange("#kpi-change-injuries", "100.0");
    this.updateKPIChange("#kpi-change-fatalities", "100.0");
    this.updateKPIChange("#kpi-change-average-units", "100.0");
  }
  updateKPIs() {
    const totalAccidents = this.filteredData.length;
    const totalInjuries = d3.sum(
      this.filteredData,
      (d) =>
        (+d.injuries_fatal || 0) +
        (+d.injuries_incapacitating || 0) +
        (+d.injuries_non_incapacitating || 0) +
        (+d.injuries_reported_not_evident || 0)
    );
    const totalFatalities = d3.sum(
      this.filteredData,
      (d) => +d.injuries_fatal || 0
    );
    const averageUnits = d3.mean(this.filteredData, (d) => +d.num_units || 0);

    // Calculate original values for comparison (unfiltered data)
    const originalTotal = this.data.length;
    const originalInjuries = d3.sum(
      this.data,
      (d) =>
        (+d.injuries_fatal || 0) +
        (+d.injuries_incapacitating || 0) +
        (+d.injuries_non_incapacitating || 0) +
        (+d.injuries_reported_not_evident || 0)
    );
    const originalFatalities = d3.sum(this.data, (d) => +d.injuries_fatal || 0);
    const originalAverageUnits = d3.mean(this.data, (d) => +d.num_units || 0);

    // Calculate percentage of total data (what portion of total data is currently shown)
    const accidentsPercent =
      originalTotal > 0
        ? ((totalAccidents / originalTotal) * 100).toFixed(1)
        : "0.0";
    const injuriesPercent =
      originalInjuries > 0
        ? ((totalInjuries / originalInjuries) * 100).toFixed(1)
        : "0.0";
    const fatalitiesPercent =
      originalFatalities > 0
        ? ((totalFatalities / originalFatalities) * 100).toFixed(1)
        : "0.0";
    const unitsPercent =
      originalAverageUnits > 0
        ? ((averageUnits / originalAverageUnits) * 100).toFixed(1)
        : "0.0";

    // Update KPI values
    this.animateKPI("#kpi-value-accidents", totalAccidents, 0);
    this.animateKPI("#kpi-value-injuries", totalInjuries, 0);
    this.animateKPI("#kpi-value-fatalities", totalFatalities, 0);
    this.animateKPI("#kpi-value-average-units", averageUnits, 1);

    // Update percentage indicators to show percentage of total data
    this.updateKPIChange("#kpi-change-accidents", accidentsPercent);
    this.updateKPIChange("#kpi-change-injuries", injuriesPercent);
    this.updateKPIChange("#kpi-change-fatalities", fatalitiesPercent);
    this.updateKPIChange("#kpi-change-average-units", unitsPercent);
  }

  animateKPI(selector, targetValue, decimals = 0) {
    const element = d3.select(selector);
    const startValue = +element.text() || 0;

    element
      .transition()
      .duration(1500)
      .ease(d3.easeQuadOut)
      .tween("text", function () {
        const interpolate = d3.interpolate(startValue, targetValue);
        return function (t) {
          const value = interpolate(t);
          d3.select(this).text(
            decimals === 0 ? Math.round(value) : value.toFixed(decimals)
          );
        };
      });
  }
  updateKPIChange(selector, changePercent) {
    const element = d3.select(selector);
    const percent = parseFloat(changePercent);

    // Format percentage display - no sign needed since we're showing percentage of total
    const displayText = `${changePercent}%`;

    // Update text
    element.text(displayText);

    // Update styling - always show as positive since it's percentage of total data
    element.classed("positive", true).classed("negative", false);
  }

  updateEnvironmentalStats() {
    // Weather statistics
    const weatherData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.weather_condition
    );

    const totalWeatherRecords = this.filteredData.length;
    let clearWeatherCount = 0;
    let badWeatherCount = 0;
    let worstWeatherCondition = "";
    let maxWeatherCount = 0;

    weatherData.forEach((count, condition) => {
      if (condition && condition.trim() !== "") {
        if (
          condition.toLowerCase().includes("clear") ||
          condition.toLowerCase().includes("fair") ||
          condition.toLowerCase().includes("sunny")
        ) {
          clearWeatherCount += count;
        } else if (
          condition.toLowerCase().includes("rain") ||
          condition.toLowerCase().includes("snow") ||
          condition.toLowerCase().includes("fog") ||
          condition.toLowerCase().includes("sleet") ||
          condition.toLowerCase().includes("storm")
        ) {
          badWeatherCount += count;
        }

        if (count > maxWeatherCount) {
          maxWeatherCount = count;
          worstWeatherCondition = condition;
        }
      }
    });

    // Lighting statistics
    const lightingData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.lighting_condition
    );

    let daylightCount = 0;
    let nightCount = 0;
    let worstLightingCondition = "";
    let maxLightingCount = 0;

    lightingData.forEach((count, condition) => {
      if (condition && condition.trim() !== "") {
        if (
          condition.toLowerCase().includes("daylight") ||
          condition.toLowerCase().includes("dawn") ||
          condition.toLowerCase().includes("dusk")
        ) {
          daylightCount += count;
        } else if (
          condition.toLowerCase().includes("dark") ||
          condition.toLowerCase().includes("night")
        ) {
          nightCount += count;
        }

        if (count > maxLightingCount) {
          maxLightingCount = count;
          worstLightingCondition = condition;
        }
      }
    });

    // Update environmental summary percentages
    const clearWeatherPct =
      totalWeatherRecords > 0
        ? ((clearWeatherCount / totalWeatherRecords) * 100).toFixed(1)
        : "0.0";
    const badWeatherPct =
      totalWeatherRecords > 0
        ? ((badWeatherCount / totalWeatherRecords) * 100).toFixed(1)
        : "0.0";
    const daylightPct =
      totalWeatherRecords > 0
        ? ((daylightCount / totalWeatherRecords) * 100).toFixed(1)
        : "0.0";
    const nightPct =
      totalWeatherRecords > 0
        ? ((nightCount / totalWeatherRecords) * 100).toFixed(1)
        : "0.0";

    // Update DOM elements
    d3.select("#clear-weather-pct").text(`${clearWeatherPct}%`);
    d3.select("#bad-weather-pct").text(`${badWeatherPct}%`);
    d3.select("#daylight-pct").text(`${daylightPct}%`);
    d3.select("#night-pct").text(`${nightPct}%`);

    // Update chart statistics
    d3.select("#weather-conditions-count").text(weatherData.size);
    d3.select("#worst-weather").text(worstWeatherCondition || "N/A");
    d3.select("#lighting-conditions-count").text(lightingData.size);
    d3.select("#worst-lighting").text(worstLightingCondition || "N/A");
  }
  createCharts() {
    this.createMonthlyTrendChart();
    this.createHeatmapChart();
    this.createCrashTypesDonut();
    this.createMainCausesBar();
    this.createRoadSurfaceChart();
    this.createRoadAlignmentChart();
    this.createTrafficwayChart();
    this.createRoadDefectChart();
    this.createWeatherChart();
    this.createLightingChart();
  }
  updateCharts() {
    // Clear existing charts by removing all chart content
    d3.select("#monthly-trend").selectAll("*").remove();
    d3.select("#heatmap-chart").selectAll("*").remove();
    d3.select("#crash-types-donut").selectAll("*").remove();
    d3.select("#main-causes-bar").selectAll("*").remove();
    d3.select("#road-surface-chart").selectAll("*").remove();
    d3.select("#road-alignment-chart").selectAll("*").remove();
    d3.select("#trafficway-chart").selectAll("*").remove();
    d3.select("#road-defect-chart").selectAll("*").remove();
    d3.select("#weather-chart").selectAll("*").remove();
    d3.select("#lighting-chart").selectAll("*").remove();

    // Recreate charts with filtered data
    this.createCharts();
  }
  createMonthlyTrendChart() {
    const container = d3.select("#monthly-trend");
    container.selectAll("*").remove();

    const monthlyData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => +d.crash_month
    );

    const data = Array.from(monthlyData, ([month, count]) => ({
      month,
      count,
      monthName: this.getMonthName(month),
    }))
      .filter((d) => d.month >= 1 && d.month <= 12 && d.count > 0) // Valid months and counts
      .sort((a, b) => a.month - b.month);

    // Check if we have data
    if (data.length === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("padding", "50px")
        .style("color", "#666")
        .text("No data available for monthly trend");
      return;
    }
    const margin = { top: 20, right: 30, bottom: 50, left: 60 }; // Adjusted margins
    const containerWidth = container.node().getBoundingClientRect().width;
    const width = Math.max(300, containerWidth - margin.left - margin.right);
    const height = 300 - margin.top - margin.bottom;

    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .style("overflow", "visible");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.month))
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count)])
      .nice()
      .range([height, 0]);

    const line = d3
      .line()
      .x((d) => xScale(d.month))
      .y((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(""))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    // Add gradient
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "lineGradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", height)
      .attr("x2", 0)
      .attr("y2", 0);

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3498db")
      .attr("stop-opacity", 0.1);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3498db")
      .attr("stop-opacity", 0.8);

    // Add area under curve
    const area = d3
      .area()
      .x((d) => xScale(d.month))
      .y0(height)
      .y1((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "url(#lineGradient)")
      .attr("d", area);

    // Add line
    const path = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3498db")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Animate line drawing
    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    // Add points
    g.selectAll(".point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", (d) => xScale(d.month))
      .attr("cy", (d) => yScale(d.count))
      .attr("r", 0)
      .attr("fill", "#2980b9")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .on("mouseover", (event, d) => {
        this.showTooltip(
          event,
          `
          <strong>${d.monthName}</strong><br/>
          Kecelakaan: ${d.count}
        `
        );
      })
      .on("mouseout", () => this.hideTooltip())
      .transition()
      .delay((d, i) => i * 100)
      .duration(500)
      .attr("r", 5);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat((d) => this.getMonthName(d)));

    g.append("g").call(d3.axisLeft(yScale));

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text("Jumlah Kecelakaan");

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom})`)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text("Bulan");
  }
  createHeatmapChart() {
    const container = d3.select("#heatmap-chart");
    container.selectAll("*").remove();

    // Create hour vs day matrix
    const heatmapData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => +d.crash_day_of_week,
      (d) => +d.crash_hour
    );

    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const hours = d3.range(0, 24);

    const data = [];
    days.forEach((day, dayIndex) => {
      hours.forEach((hour) => {
        const count = heatmapData.get(dayIndex + 1)?.get(hour) || 0;
        data.push({
          day: dayIndex,
          hour: hour,
          count: count,
          dayName: day,
        });
      });
    });

    // Check if we have any data
    const maxCount = d3.max(data, (d) => d.count);
    if (!maxCount || maxCount === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("padding", "50px")
        .style("color", "#666")
        .text("No data available for heatmap");
      return;
    }
    const margin = { top: 60, right: 20, bottom: 80, left: 60 }; // Increased top margin for legend space
    const containerWidth = container.node().getBoundingClientRect().width;
    const width = Math.max(400, containerWidth - margin.left - margin.right);
    const height = 350 - margin.top - margin.bottom; // Increased height for legend space

    const cellWidth = width / 24;
    const cellHeight = height / 7;

    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .style("overflow", "visible");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3
      .scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain([0, d3.max(data, (d) => d.count)]);

    // Add cells
    g.selectAll(".heatmap-cell")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "heatmap-cell")
      .attr("x", (d) => d.hour * cellWidth)
      .attr("y", (d) => d.day * cellHeight)
      .attr("width", cellWidth - 1)
      .attr("height", cellHeight - 1)
      .attr("fill", (d) => colorScale(d.count))
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("opacity", 0)
      .on("mouseover", (event, d) => {
        this.showTooltip(
          event,
          `
          <strong>${d.dayName}, ${d.hour}:00</strong><br/>
          Kecelakaan: ${d.count}
        `
        );
      })
      .on("mouseout", () => this.hideTooltip())
      .transition()
      .delay((d, i) => i * 2)
      .duration(500)
      .style("opacity", 1);

    // Add day labels
    g.selectAll(".day-label")
      .data(days)
      .enter()
      .append("text")
      .attr("class", "day-label")
      .attr("x", -10)
      .attr("y", (d, i) => i * cellHeight + cellHeight / 2)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text((d) => d);

    // Add hour labels
    const hourLabels = g
      .selectAll(".hour-label")
      .data(hours.filter((h) => h % 2 === 0))
      .enter()
      .append("text")
      .attr("class", "hour-label")
      .attr("x", (d) => d * cellWidth + cellWidth / 2)
      .attr("y", height + 20)
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#666")
      .text((d) => `${d}:00`); // Add color legend - positioned at top right corner with proper spacing
    const legendWidth = 120;
    const legendHeight = 12;
    const legendX = width - legendWidth - 5;
    const legendY = -45; // Positioned well above the chart to avoid overlap

    const legendScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count)])
      .range([0, legendWidth]);

    const legend = g
      .append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    const legendGradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    legendGradient
      .selectAll("stop")
      .data(d3.range(0, 1.1, 0.1))
      .enter()
      .append("stop")
      .attr("offset", (d) => `${d * 100}%`)
      .attr("stop-color", (d) => d3.interpolateBlues(d));

    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)")
      .style("stroke", "#ccc")
      .style("stroke-width", 1);

    // Legend title positioned above the gradient bar
    legend
      .append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -5)
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#666")
      .style("font-weight", "600")
      .text("Intensitas Kecelakaan");

    // Legend value labels positioned below the gradient bar
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", legendHeight + 12)
      .style("text-anchor", "start")
      .style("font-size", "8px")
      .style("fill", "#666")
      .text("0");

    legend
      .append("text")
      .attr("x", legendWidth)
      .attr("y", legendHeight + 12)
      .style("text-anchor", "end")
      .style("font-size", "9px")
      .style("fill", "#666")
      .text(d3.max(data, (d) => d.count));
  }
  createCrashTypesDonut() {
    const container = d3.select("#crash-types-donut");
    container.selectAll("*").remove();

    const crashTypeData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.first_crash_type
    );

    const data = Array.from(crashTypeData, ([type, count]) => ({
      type: type && type.trim() !== "" ? type : "Unknown",
      count,
    }))
      .filter((d) => d.count > 0) // Filter out zero counts
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 crash types

    // Check if we have data
    if (data.length === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("padding", "50px")
        .style("color", "#666")
        .text("No data available for crash types");
      return;
    }
    const width = 380; // Increased width
    const height = 380; // Increased height
    const radius = Math.min(width, height) / 2 - 20; // More margin

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("display", "block")
      .style("margin", "0 auto")
      .style("overflow", "visible");

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const colorScale = d3
      .scaleOrdinal()
      .domain(data.map((d) => d.type))
      .range(this.colorSchemes.categorical);

    const pie = d3
      .pie()
      .value((d) => d.count)
      .sort(null);

    const arc = d3
      .arc()
      .innerRadius(radius * 0.5)
      .outerRadius(radius);

    const arcHover = d3
      .arc()
      .innerRadius(radius * 0.5)
      .outerRadius(radius + 10);

    const arcs = g
      .selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");
    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => colorScale(d.data.type))
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("opacity", 0)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("d", arcHover);

        this.showTooltip(
          event,
          `
          <strong>${d.data.type}</strong><br/>
          Jumlah: ${d.data.count}<br/>
          Persentase: ${(
            (d.data.count / d3.sum(data, (d) => d.count)) *
            100
          ).toFixed(1)}%
        `
        );
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("d", arc);
        this.hideTooltip();
      })
      .transition()
      .delay((d, i) => i * 100)
      .duration(800)
      .style("opacity", 1)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(interpolate(t));
        };
      }); // Add percentage labels for segments > 5%
    const total = d3.sum(data, (d) => d.count);

    arcs
      .append("text")
      .attr("transform", (d) => {
        const percentage = (d.data.count / total) * 100;
        if (percentage > 5) {
          const centroid = arc.centroid(d);
          // Position text at the centroid (center of the segment)
          return `translate(${centroid[0]}, ${centroid[1]})`;
        }
        return null;
      })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .style("stroke", "#333")
      .style("stroke-width", "0.3px")
      .style("paint-order", "stroke")
      .style("opacity", 0)
      .text((d) => {
        const percentage = (d.data.count / total) * 100;
        return percentage > 5 ? `${percentage.toFixed(1)}%` : "";
      })
      .transition()
      .delay((d, i) => i * 100 + 400) // Delay after the arcs appear
      .duration(600)
      .style("opacity", 1);

    // Add center text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.5em")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#666")
      .text("Total");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .style("font-size", "24px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(d3.sum(data, (d) => d.count));

    // Add legend
    const legend = container
      .append("div")
      .style("margin-top", "20px")
      .style("display", "flex")
      .style("flex-wrap", "wrap")
      .style("justify-content", "center")
      .style("gap", "10px");

    data.forEach((d) => {
      const legendItem = legend
        .append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin", "2px")
        .style("font-size", "12px");

      legendItem
        .append("div")
        .style("width", "12px")
        .style("height", "12px")
        .style("background-color", colorScale(d.type))
        .style("margin-right", "5px")
        .style("border-radius", "2px");

      legendItem
        .append("span")
        .text(
          `${d.type.length > 15 ? d.type.substring(0, 15) + "..." : d.type}`
        );
    });
  }
  createMainCausesBar() {
    const container = d3.select("#main-causes-bar");
    container.selectAll("*").remove();

    const causeData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.prim_contributory_cause
    );

    const data = Array.from(causeData, ([cause, count]) => ({
      cause: cause && cause.trim() !== "" ? cause : "Unknown",
      count,
    }))
      .filter((d) => d.count > 0) // Filter out zero counts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 causes

    // Check if we have data
    if (data.length === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("padding", "50px")
        .style("color", "#666")
        .text("No data available for causes");
      return;
    }
    const margin = { top: 20, right: 30, bottom: 160, left: 120 }; // Increased left margin for rotated labels
    const containerWidth = container.node().getBoundingClientRect().width;
    const width = Math.max(400, containerWidth - margin.left - margin.right);
    const height = 400 - margin.top - margin.bottom; // Increased height

    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .style("overflow", "visible");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.cause))
      .range([0, width])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count)])
      .nice()
      .range([height, 0]);

    const colorScale = d3
      .scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain([0, data.length - 1]);

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    // Add bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.cause))
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", (d, i) => colorScale(i))
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        this.showTooltip(
          event,
          `
          <strong>${d.cause}</strong><br/>
          Jumlah: ${d.count}
        `
        );
      })
      .on("mouseout", () => this.hideTooltip())
      .transition()
      .delay((d, i) => i * 100)
      .duration(800)
      .attr("y", (d) => yScale(d.count))
      .attr("height", (d) => height - yScale(d.count));

    // Add value labels on bars
    g.selectAll(".bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", (d) => xScale(d.cause) + xScale.bandwidth() / 2)
      .attr("y", (d) => yScale(d.count) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#666")
      .style("opacity", 0)
      .text((d) => d.count)
      .transition()
      .delay((d, i) => i * 100 + 400)
      .duration(400)
      .style("opacity", 1); // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "8px") // Reduced font size for better fit
      .style("fill", "#666")
      .text((d) => {
        // More aggressive truncation to prevent overlap
        if (d.length > 15) {
          return d.substring(0, 13) + "...";
        }
        return d;
      });

    g.append("g").call(d3.axisLeft(yScale));

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 40) // Reduced distance from chart
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text("Jumlah Kecelakaan");
  }
  createWeatherChart() {
    const container = d3.select("#weather-chart");
    container.selectAll("*").remove();

    const weatherData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.weather_condition
    );

    const data = Array.from(weatherData, ([condition, count]) => ({
      condition: condition && condition.trim() !== "" ? condition : "Unknown",
      count,
    }))
      .filter((d) => d.count > 0) // Filter out zero counts
      .sort((a, b) => b.count - a.count);

    // Check if we have data
    if (data.length === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("padding", "50px")
        .style("color", "#666")
        .text("No weather data available");
      return;
    }

    const margin = { top: 20, right: 30, bottom: 90, left: 50 }; // Increased margins
    const width = 320; // Fixed width
    const height = 280 - margin.top - margin.bottom; // Increased height

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height + margin.top + margin.bottom)
      .attr("viewBox", `0 0 ${width} ${height + margin.top + margin.bottom}`)
      .style("display", "block")
      .style("margin", "0 auto")
      .style("overflow", "visible");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.condition))
      .range([0, width - margin.left - margin.right])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count)])
      .nice()
      .range([height, 0]);

    const colorScale = d3
      .scaleOrdinal()
      .domain(data.map((d) => d.condition))
      .range(["#3498db", "#e74c3c", "#f39c12", "#27ae60", "#9b59b6"]);

    // Add bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.condition))
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", (d) => colorScale(d.condition))
      .on("mouseover", (event, d) => {
        this.showTooltip(
          event,
          `
          <strong>${d.condition}</strong><br/>
          Jumlah: ${d.count}
        `
        );
      })
      .on("mouseout", () => this.hideTooltip())
      .transition()
      .delay((d, i) => i * 100)
      .duration(800)
      .attr("y", (d) => yScale(d.count))
      .attr("height", (d) => height - yScale(d.count));

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "10px");

    g.append("g").call(d3.axisLeft(yScale));
  }
  createLightingChart() {
    const container = d3.select("#lighting-chart");
    container.selectAll("*").remove();

    const lightingData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.lighting_condition
    );

    const data = Array.from(lightingData, ([condition, count]) => ({
      condition: condition && condition.trim() !== "" ? condition : "Unknown",
      count,
    }))
      .filter((d) => d.count > 0) // Filter out zero counts
      .sort((a, b) => b.count - a.count);

    // Check if we have data
    if (data.length === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("padding", "50px")
        .style("color", "#666")
        .text("No lighting data available");
      return;
    }
    const margin = { top: 20, right: 30, bottom: 90, left: 50 }; // Increased margins
    const width = 320; // Fixed width to match weather chart
    const height = 280 - margin.top - margin.bottom; // Increased height

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height + margin.top + margin.bottom)
      .attr("viewBox", `0 0 ${width} ${height + margin.top + margin.bottom}`)
      .style("display", "block")
      .style("margin", "0 auto")
      .style("overflow", "visible");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.condition))
      .range([0, width - margin.left - margin.right])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count)])
      .nice()
      .range([height, 0]);

    const colorScale = d3
      .scaleOrdinal()
      .domain(data.map((d) => d.condition))
      .range(["#f39c12", "#2c3e50", "#8e44ad", "#16a085"]);

    // Add bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.condition))
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", (d) => colorScale(d.condition))
      .on("mouseover", (event, d) => {
        this.showTooltip(
          event,
          `
          <strong>${d.condition}</strong><br/>
          Jumlah: ${d.count}
        `
        );
      })
      .on("mouseout", () => this.hideTooltip())
      .transition()
      .delay((d, i) => i * 100)
      .duration(800)
      .attr("y", (d) => yScale(d.count))
      .attr("height", (d) => height - yScale(d.count));

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "10px");

    g.append("g").call(d3.axisLeft(yScale));
  }

  setupTooltip() {
    this.tooltip = d3.select("#tooltip");
  }

  showTooltip(event, content) {
    this.tooltip
      .html(content)
      .classed("visible", true)
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 10 + "px");
  }

  hideTooltip() {
    this.tooltip.classed("visible", false);
  }

  setupEventListeners() {
    // Filter event listeners
    d3.select("#weather-filter").on("change", (event) => {
      this.filters.weather = event.target.value;
    });

    d3.select("#lighting-filter").on("change", (event) => {
      this.filters.lighting = event.target.value;
    });

    d3.select("#traffic-filter").on("change", (event) => {
      this.filters.traffic = event.target.value;
    });

    d3.select("#apply-filters").on("click", () => {
      this.applyFilters();
    });

    d3.select("#reset-filters").on("click", () => {
      this.filters = { weather: "", lighting: "", traffic: "" };
      d3.select("#weather-filter").property("value", "");
      d3.select("#lighting-filter").property("value", "");
      d3.select("#traffic-filter").property("value", "");
      this.filteredData = [...this.data];
      this.updateDashboard();
    });

    // Window resize listener
    window.addEventListener("resize", () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.updateCharts();
      }, 300);
    });
  }

  getMonthName(month) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months[month - 1] || "Unknown";
  } // Road Condition Analysis Charts
  createRoadSurfaceChart() {
    const container = d3.select("#road-surface-chart");
    container.selectAll("*").remove();

    const surfaceData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.roadway_surface_cond || "UNKNOWN"
    );

    const data = Array.from(surfaceData, ([condition, count]) => ({
      condition,
      count,
    }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 conditions

    if (data.length === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("color", "#999")
        .style("padding", "2rem")
        .text("No data available");
      return;
    }

    this.createHorizontalBarChart(
      container.node(),
      data,
      "condition",
      "count",
      "#27ae60"
    );
  }

  createRoadAlignmentChart() {
    const container = d3.select("#road-alignment-chart");
    container.selectAll("*").remove();

    const alignmentData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.alignment || "UNKNOWN"
    );

    const data = Array.from(alignmentData, ([alignment, count]) => ({
      alignment,
      count,
    }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 alignments

    if (data.length === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("color", "#999")
        .style("padding", "2rem")
        .text("No data available");
      return;
    }

    this.createHorizontalBarChart(
      container.node(),
      data,
      "alignment",
      "count",
      "#3498db"
    );
  }

  createTrafficwayChart() {
    const container = d3.select("#trafficway-chart");
    container.selectAll("*").remove();

    const trafficwayData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.trafficway_type || "UNKNOWN"
    );

    const data = Array.from(trafficwayData, ([type, count]) => ({
      type,
      count,
    }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 types

    if (data.length === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("color", "#999")
        .style("padding", "2rem")
        .text("No data available");
      return;
    }

    this.createHorizontalBarChart(
      container.node(),
      data,
      "type",
      "count",
      "#f39c12"
    );
  }

  createRoadDefectChart() {
    const container = d3.select("#road-defect-chart");
    container.selectAll("*").remove();

    const defectData = d3.rollup(
      this.filteredData,
      (v) => v.length,
      (d) => d.road_defect || "UNKNOWN"
    );

    const data = Array.from(defectData, ([defect, count]) => ({
      defect,
      count,
    }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 defects

    if (data.length === 0) {
      container
        .append("div")
        .style("text-align", "center")
        .style("color", "#999")
        .style("padding", "2rem")
        .text("No data available");
      return;
    }

    this.createHorizontalBarChart(
      container.node(),
      data,
      "defect",
      "count",
      "#e74c3c"
    );
  }
  createHorizontalBarChart(
    containerElement,
    data,
    keyField,
    valueField,
    baseColor
  ) {
    const margin = { top: 20, right: 20, bottom: 40, left: 100 };
    const width = 280 - margin.left - margin.right;
    const height = 240 - margin.top - margin.bottom;

    // Clear any existing content
    d3.select(containerElement).selectAll("*").remove();

    // Create SVG
    const svg = d3
      .select(containerElement)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d[keyField]))
      .range([0, height])
      .padding(0.1);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d[valueField])])
      .nice()
      .range([0, width]);

    // Create color scale
    const colorScale = d3
      .scaleOrdinal()
      .domain(data.map((d) => d[keyField]))
      .range([baseColor]);

    // Add axes
    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#666")
      .text((d) => (d.length > 12 ? d.substring(0, 12) + "..." : d));

    g.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#666");

    // Add bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", (d) => yScale(d[keyField]))
      .attr("x", 0)
      .attr("width", 0)
      .attr("height", yScale.bandwidth())
      .attr("fill", baseColor)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("fill", d3.rgb(baseColor).darker(0.5));

        this.showTooltip(
          event,
          `
          <strong>${d[keyField]}</strong><br/>
          Jumlah: ${d[valueField]}
        `
        );
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("fill", baseColor);

        this.hideTooltip();
      })
      .transition()
      .delay((d, i) => i * 100)
      .duration(800)
      .attr("width", (d) => xScale(d[valueField]));

    // Add value labels
    g.selectAll(".bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", (d) => xScale(d[valueField]) + 5)
      .attr("y", (d) => yScale(d[keyField]) + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .style("font-size", "10px")
      .style("fill", "#666")
      .style("opacity", 0)
      .text((d) => d[valueField])
      .transition()
      .delay((d, i) => i * 100 + 400)
      .duration(400)
      .style("opacity", 1);
  }

  createSimplePieChart(
    containerElement,
    data,
    keyField,
    valueField,
    baseColor
  ) {
    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2 - 30;

    // Clear any existing content
    d3.select(containerElement).selectAll("*").remove();

    // Create SVG
    const svg = d3
      .select(containerElement)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Create color scale with fallback
    let colors;
    try {
      colors = this.generateSimpleColors(data.length, baseColor);
    } catch (e) {
      colors = d3.schemeCategory10.slice(0, data.length);
    }

    const colorScale = d3
      .scaleOrdinal()
      .domain(data.map((d) => d[keyField]))
      .range(colors);

    // Create pie generator
    const pie = d3
      .pie()
      .value((d) => d[valueField])
      .sort(null);

    // Create arc generator
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    try {
      // Create arcs
      const arcs = g
        .selectAll(".arc")
        .data(pie(data))
        .enter()
        .append("g")
        .attr("class", "arc");

      // Add pie slices
      const paths = arcs
        .append("path")
        .attr("d", arc)
        .attr("fill", (d) => colorScale(d.data[keyField]))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer");

      // Add hover effects with error handling
      paths
        .on("mouseover", (event, d) => {
          try {
            d3.select(event.currentTarget)
              .transition()
              .duration(200)
              .attr("transform", "scale(1.05)");

            // Simple tooltip
            const total = data.reduce((sum, item) => sum + item[valueField], 0);
            const percentage = ((d.data[valueField] / total) * 100).toFixed(1);

            // Remove existing tooltip
            d3.selectAll(".road-tooltip").remove();

            // Create new tooltip
            const tooltip = d3
              .select("body")
              .append("div")
              .attr("class", "road-tooltip")
              .style("position", "absolute")
              .style("background", "rgba(0, 0, 0, 0.8)")
              .style("color", "white")
              .style("padding", "8px 12px")
              .style("border-radius", "4px")
              .style("font-size", "12px")
              .style("pointer-events", "none")
              .style("z-index", "1000")
              .style("opacity", 0);

            tooltip
              .html(
                `
              <strong>${d.data[keyField]}</strong><br/>
              Jumlah: ${d.data[valueField]}<br/>
              Persentase: ${percentage}%
            `
              )
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 10 + "px")
              .transition()
              .duration(200)
              .style("opacity", 1);
          } catch (e) {
            console.warn("Error in mouseover handler:", e);
          }
        })
        .on("mouseout", (event, d) => {
          try {
            d3.select(event.currentTarget)
              .transition()
              .duration(200)
              .attr("transform", "scale(1)");

            d3.selectAll(".road-tooltip")
              .transition()
              .duration(200)
              .style("opacity", 0)
              .remove();
          } catch (e) {
            console.warn("Error in mouseout handler:", e);
          }
        });

      // Add percentage labels for larger slices
      arcs
        .append("text")
        .attr("transform", (d) => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text((d) => {
          const total = data.reduce((sum, item) => sum + item[valueField], 0);
          const percentage = ((d.data[valueField] / total) * 100).toFixed(0);
          return percentage > 8 ? `${percentage}%` : "";
        });

      // Add legend
      this.addSimpleLegend(svg, data, keyField, colorScale, width, height);
    } catch (e) {
      console.error("Error creating pie chart:", e);
      // Fallback: show simple bar chart or text
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("Chart data available");
    }
  }

  addSimpleLegend(svg, data, keyField, colorScale, width, height) {
    try {
      const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 120}, 20)`);

      const maxItems = Math.min(5, data.length);
      const legendItems = legend
        .selectAll(".legend-item")
        .data(data.slice(0, maxItems))
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 18})`);

      legendItems
        .append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", (d) => colorScale(d[keyField]));

      legendItems
        .append("text")
        .attr("x", 16)
        .attr("y", 6)
        .attr("dy", "0.35em")
        .style("font-size", "10px")
        .style("fill", "#333")
        .text((d) => {
          const label = String(d[keyField]);
          return label.length > 12 ? label.substring(0, 12) + "..." : label;
        });
    } catch (e) {
      console.warn("Error creating legend:", e);
    }
  }
  generateSimpleColors(count, baseColor) {
    // Fallback color schemes
    const fallbackColors = [
      "#3498db",
      "#e74c3c",
      "#2ecc71",
      "#f39c12",
      "#9b59b6",
      "#1abc9c",
      "#34495e",
      "#e67e22",
      "#95a5a6",
      "#f1c40f",
    ];

    if (!count || count <= 0) {
      return [baseColor || "#3498db"];
    }

    try {
      const colors = [];
      const base = d3.color(baseColor);

      if (!base) {
        // Return predefined colors if baseColor is invalid
        return fallbackColors.slice(0, count);
      }

      // Generate variations of the base color
      for (let i = 0; i < count; i++) {
        try {
          const hsl = d3.hsl(base);

          // Vary hue slightly
          hsl.h = (hsl.h + i * 25) % 360;

          // Vary lightness and saturation
          hsl.l = Math.max(0.3, Math.min(0.8, 0.5 + ((i % 3) - 1) * 0.15));
          hsl.s = Math.max(0.4, Math.min(0.9, 0.7 + (i % 2) * 0.2));

          const colorString = hsl.toString();
          colors.push(colorString || fallbackColors[i % fallbackColors.length]);
        } catch (e) {
          // Use fallback color if generation fails
          colors.push(fallbackColors[i % fallbackColors.length]);
        }
      }

      return colors;
    } catch (e) {
      console.warn("Error generating colors, using fallback:", e);
      return fallbackColors.slice(0, count);
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.dashboard = new TrafficDashboard();
});
