function drawBoxPlotChart(rawData) {
  (async function () {
    const chartContainer = d3.select("#dist_boxplot_svg");
    chartContainer.selectAll("*").remove();

    // --- Parameters ---
    const topN = 15;
    const rowPadding = 5;
    const boxHeight = 25;
    let selectedGroup = null;

    // --- Prepare data (sorted by upperWhisker descending) ---
    let data = rawData.slice(0, topN)
      .map(d => {
        const iqr = d.q3 - d.q1;
        const lowerWhisker = Math.max(d.q1 - 1.5 * iqr, d.min);
        const upperWhisker = Math.min(d.q3 + 1.5 * iqr, d.max);
        return { ...d, iqr, lowerWhisker, upperWhisker };
      })
      .sort((a, b) => d3.descending(a.upperWhisker, b.upperWhisker));

    const groups = data.map(d => d.group);


    // --- Dimensions ---
    const containerWidth = chartContainer.node().getBoundingClientRect().width;
    const margin = { top: 50, right: 30, bottom: 50, left: 120 }; // space for top/bottom labels
    const height = margin.top + margin.bottom + data.length * (boxHeight + rowPadding);

    // --- X Scale ---
    const xMinGlobal = d3.min(data, d => d.lowerWhisker);
    const xMaxGlobal = d3.max(data, d => d.upperWhisker);
    const x = d3.scaleLinear()
      .domain([xMinGlobal, xMaxGlobal])
      .range([margin.left, containerWidth - margin.right]);

    // --- Y Scale ---
    const y = d3.scaleBand()
      .domain(groups)
      .range([margin.top, height - margin.bottom])
      .paddingInner(rowPadding / boxHeight)
      .paddingOuter(0.1);

    const svg = chartContainer.append("svg")
      .attr("viewBox", [0, 0, containerWidth, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // --- Group labels ---
    const groupLabels = svg.selectAll(".group-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "group-label")
      .attr("x", margin.left - 10)
      .attr("y", d => y(d.group) + boxHeight / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 12)
      .attr("fill", "#111")
      .text(d => d.group);

    // --- Box Groups ---
    const boxGroups = svg.selectAll(".box-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "box-group")
      .attr("transform", d => `translate(0,${y(d.group)})`);

    // --- Draw Boxes ---
    boxGroups.append("rect")
      .attr("x", d => x(d.q1))
      .attr("y", 0)
      .attr("width", d => Math.max(1, x(d.q3) - x(d.q1)))
      .attr("height", boxHeight)
      .attr("fill", "#69b3a2")
      .attr("stroke", "#333")
      .attr("stroke-width", 1);

    // --- Median Lines ---
    boxGroups.append("line")
      .attr("class", "median-line")
      .attr("x1", d => x(d.median))
      .attr("x2", d => x(d.median))
      .attr("y1", 0)
      .attr("y2", boxHeight)
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

    // --- Whiskers ---
    boxGroups.each(function(d) {
      const g = d3.select(this);
      // horizontal whiskers
      g.append("line").attr("class", "whisker-h lower")
        .attr("x1", x(d.lowerWhisker))
        .attr("x2", x(d.q1))
        .attr("y1", boxHeight / 2)
        .attr("y2", boxHeight / 2)
        .attr("stroke", "#555")
        .attr("stroke-width", 1);

      g.append("line").attr("class", "whisker-h upper")
        .attr("x1", x(d.q3))
        .attr("x2", x(d.upperWhisker))
        .attr("y1", boxHeight / 2)
        .attr("y2", boxHeight / 2)
        .attr("stroke", "#555")
        .attr("stroke-width", 1);

      // vertical whisker caps
      g.append("line").attr("class", "whisker-cap lower")
        .attr("x1", x(d.lowerWhisker))
        .attr("x2", x(d.lowerWhisker))
        .attr("y1", boxHeight * 0.25)
        .attr("y2", boxHeight * 0.75)
        .attr("stroke", "#555")
        .attr("stroke-width", 1);

      g.append("line").attr("class", "whisker-cap upper")
        .attr("x1", x(d.upperWhisker))
        .attr("x2", x(d.upperWhisker))
        .attr("y1", boxHeight * 0.25)
        .attr("y2", boxHeight * 0.75)
        .attr("stroke", "#555")
        .attr("stroke-width", 1);
    });

    // --- X-axis group initially
    const xAxisG = svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${margin.top})`) // initial at top
      .call(d3.axisTop(x).ticks(8));

    // --- Click Zoom + Shift Behavior with value labels ---
    boxGroups.style("cursor", "pointer")
      .on("click", function(event, d) {
        const isSelected = selectedGroup === d.group;
        selectedGroup = isSelected ? null : d.group;

        const xDomain = selectedGroup
          ? [xMinGlobal, d.upperWhisker + (d.upperWhisker - d.lowerWhisker) * 0.1]
          : [xMinGlobal, xMaxGlobal];

        x.domain(xDomain);
        const rowHeight = boxHeight + rowPadding;

        // Remove previous value labels
        svg.selectAll(".value-label").remove();

        // Transition boxes
        boxGroups.transition().duration(600)
          .attr("transform", g => {
            if (!selectedGroup) return `translate(0,${y(g.group)})`;
            if (g.group === selectedGroup) return `translate(0,${y(g.group)})`;
            const idxSelected = groups.indexOf(selectedGroup);
            const idxG = groups.indexOf(g.group);
            if (idxG < idxSelected) return `translate(0,${y(g.group) - rowHeight})`;
            if (idxG > idxSelected) return `translate(0,${y(g.group) + rowHeight})`;
            return `translate(0,${y(g.group)})`;
          });

        // Transition group labels
        groupLabels.transition().duration(600)
          .attr("y", g => {
            if (!selectedGroup) return y(g.group) + boxHeight / 2;
            if (g.group === selectedGroup) return y(g.group) + boxHeight / 2;
            const idxSelected = groups.indexOf(selectedGroup);
            const idxG = groups.indexOf(g.group);
            if (idxG < idxSelected) return y(g.group) - rowHeight + boxHeight / 2;
            if (idxG > idxSelected) return y(g.group) + rowHeight + boxHeight / 2;
            return y(g.group) + boxHeight / 2;
          })
          .attr("fill-opacity", g => !selectedGroup || g.group === selectedGroup ? 1 : 0.2)
          .attr("font-weight", g => g.group === selectedGroup ? "bold" : "normal");

        // Transition X-axis and box widths
        boxGroups.select("rect").transition().duration(600)
          .attr("x", g => x(g.q1))
          .attr("width", g => Math.max(1, x(g.q3) - x(g.q1)))
          .attr("fill-opacity", g => !selectedGroup || g.group === selectedGroup ? 1 : 0.2);

        boxGroups.select(".median-line").transition().duration(600)
          .attr("x1", g => x(g.median))
          .attr("x2", g => x(g.median))
          .attr("stroke-opacity", g => !selectedGroup || g.group === selectedGroup ? 1 : 0.2);

        boxGroups.select(".whisker-h.lower").transition().duration(600)
          .attr("x1", g => x(g.lowerWhisker))
          .attr("x2", g => x(g.q1))
          .attr("stroke-opacity", g => !selectedGroup || g.group === selectedGroup ? 1 : 0.2);

        boxGroups.select(".whisker-h.upper").transition().duration(600)
          .attr("x1", g => x(g.q3))
          .attr("x2", g => x(g.upperWhisker))
          .attr("stroke-opacity", g => !selectedGroup || g.group === selectedGroup ? 1 : 0.2);

        boxGroups.select(".whisker-cap.lower").transition().duration(600)
          .attr("x1", g => x(g.lowerWhisker))
          .attr("x2", g => x(g.lowerWhisker))
          .attr("stroke-opacity", g => !selectedGroup || g.group === selectedGroup ? 1 : 0.2);

        boxGroups.select(".whisker-cap.upper").transition().duration(600)
          .attr("x1", g => x(g.upperWhisker))
          .attr("x2", g => x(g.upperWhisker))
          .attr("stroke-opacity", g => !selectedGroup || g.group === selectedGroup ? 1 : 0.2);

        const xAxisY = selectedGroup ? margin.top - rowHeight : margin.top;

        xAxisG.transition().duration(600)
          .attr("transform", `translate(0, ${xAxisY})`)
          .call(d3.axisTop(x).ticks(8))
          .on("end", () => {
            // --- Add value labels after transition ends ---
            if (selectedGroup) {
              const s = data.find(g => g.group === selectedGroup);

              const topValues = [
                { val: s.lowerWhisker, xVal: x(s.lowerWhisker) },
                { val: s.median, xVal: x(s.median) },
                { val: s.upperWhisker, xVal: x(s.upperWhisker) }
              ];

              const bottomValues = [
                { val: s.q1, xVal: x(s.q1) },
                { val: s.q3, xVal: x(s.q3) }
              ];

              svg.selectAll(".value-label-top")
                .data(topValues)
                .enter()
                .append("text")
                .attr("class", "value-label value-label-top")
                .attr("x", d => d.xVal)
                .attr("y", y(s.group) - rowHeight / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "baseline")
                .attr("font-size", 11)
                .attr("font-weight", "bold")
                .text((d, i) => {
                  if (i === 0) return `Min:${d.val}`;
                  if (i === 1) return `Median:${d.val}`;
                  return `Max:${d.val}`;
                });

              // Bottom labels
              svg.selectAll(".value-label-bottom")
                .data(bottomValues)
                .enter()
                .append("text")
                .attr("class", "value-label value-label-bottom")
                .attr("x", d => d.xVal)
                .attr("y", y(s.group) + boxHeight + rowHeight / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "hanging")
                .attr("font-size", 11)
                .attr("font-weight", "bold")
                .text((d, i) => {
                  if (i === 0) return `Q1:${d.val}`;
                  return `Q3:${d.val}`;
                });
            }
          });

      });

  })();
}
