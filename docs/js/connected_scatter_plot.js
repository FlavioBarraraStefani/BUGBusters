function drawConnectedScatter(rawData) {
  (async function () {

    const Cutoff = 1990;
    const DynamicAxis = false;
    const TotalDuration = 20000; // total animation duration in ms (20 sec)
    const mainColor = "orange"; // color for key years

    const tooltip = d3.select("#nyt_scatter_tooltip");
    const chartContainer = d3.select("#nyt_scatter_svg");
    chartContainer.selectAll("*").remove();
    tooltip.style("opacity", 0);

    if (!Array.isArray(rawData) || !rawData.length) {
      console.warn("[drawConnectedScatter] empty data");
      return;
    }

    // --- Parse data ---
    const data = rawData
      .map(d => ({
        year: +d.year,
        attacks: +d.attacks,
        victims: +d.victims,
        is_key: !!d.is_key,
        label: d.label || d.year,
        note: d.note || "",
        pos: d.pos || null,           // top-left corner in data units
        size: d.size || null,         // width/height in data units
        anchorPos: d.anchorPos || null // line endpoint in data units
      }))
      .filter(d => Number.isFinite(d.year) && Number.isFinite(d.attacks) && Number.isFinite(d.victims))
      .sort((a, b) => d3.ascending(a.year, b.year))
      .filter(d => d.year >= Cutoff);

    const minYear = d3.min(data, d => d.year);
    const maxYear = d3.max(data, d => d.year);
    const yearRange = maxYear - minYear;

    const containerWidth = chartContainer.node().getBoundingClientRect().width || 900;
    const margin = { top: 70, right: 40, bottom: 60, left: 80 };
    const height = 500;

    const svg = chartContainer.append("svg")
      .attr("viewBox", [0, 0, containerWidth, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    const title = svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "600")
      .text(`Time Range: ${Cutoff} - ${minYear}`);

    const fmt = d3.format(",.0f");

    // --- Scales ---
    const x = d3.scaleLinear().range([margin.left, containerWidth - margin.right]);
    const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);

    if (!DynamicAxis) {
      const xVals = data.map(d => d.attacks);
      const yVals = data.map(d => d.victims);
      x.domain([0, d3.max(xVals) * 1.05]);
      y.domain([0, d3.max(yVals) * 1.05]);
    }

    const lineGen = d3.line()
      .x(d => x(d.attacks))
      .y(d => y(d.victims))
      .curve(d3.curveLinear);

    const xAxisG = svg.append("g").attr("class", "x-axis");
    const yAxisG = svg.append("g").attr("class", "y-axis");

    // Axis labels
    svg.append("text")
      .attr("class", "axis-hint")
      .attr("x", (margin.left + (containerWidth - margin.right)) / 2)
      .attr("y", height - margin.bottom + 50)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .text("Number of attacks");

    svg.append("text")
      .attr("class", "axis-hint")
      .attr("x", margin.left - 40)
      .attr("y", (margin.top + (height - margin.bottom)) / 2 - 25)
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(-90, ${margin.left - 40}, ${(margin.top + (height - margin.bottom)) / 2})`)
      .style("font-size", "20px")
      .text("Number of victims");

    // Slider + play button
    const sliderContainer = chartContainer.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "10px")
      .style("margin-top", "8px");

    const slider = sliderContainer.append("input")
      .attr("type", "range")
      .attr("min", minYear)
      .attr("max", maxYear)
      .attr("step", 0.01)
      .attr("value", maxYear)
      .style("flex", "1");

    const playButton = sliderContainer.append("button").text("▶ Play");
    let playing = false;
    let lastTime = null;
    let sliderMoving = false;

    slider.on("input", () => {
      playing = false;
      playButton.text("▶ Play");
      sliderMoving = true;
      updateFrame(parseFloat(slider.property("value")));
      sliderMoving = false;
    });

    slider.on("change", () => {
      if (!playing) {
        updateFrame(parseFloat(slider.property("value")));
      }
    });

    const AnimationSpeed = yearRange / TotalDuration; // years per ms

    function updateFrame(time) {
      svg.selectAll(".partial-line, .year-node, .current-point, .current-label, .annotation-group").remove();

      // Interpolated point
      let interpPoint = null;
      for (let i = 0; i < data.length - 1; i++) {
        const d0 = data[i];
        const d1 = data[i + 1];
        if (time >= d0.year && time <= d1.year) {
          const frac = (time - d0.year) / (d1.year - d0.year);
          interpPoint = {
            attacks: d0.attacks + frac * (d1.attacks - d0.attacks),
            victims: d0.victims + frac * (d1.victims - d0.victims),
            year: time
          };
          break;
        }
      }
      if (!interpPoint) interpPoint = { ...data[data.length - 1] };

      const visiblePoints = data.filter(d => d.year <= time);

      if (DynamicAxis) {
        const xVals = visiblePoints.map(d => d.attacks).concat(interpPoint.attacks);
        const yVals = visiblePoints.map(d => d.victims).concat(interpPoint.victims);
        x.domain([d3.min(xVals) * 0.95, d3.max(xVals) * 1.05]);
        y.domain([d3.min(yVals) * 0.95, d3.max(yVals) * 1.05]);
      }

      xAxisG
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(fmt));

      yAxisG
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(8).tickFormat(fmt));

      // --- Linea parziale ---
      svg.append("path")
        .datum([...visiblePoints, interpPoint])
        .attr("class", "partial-line")
        .attr("fill", "none")
        .attr("stroke", mainColor)
        .attr("stroke-width", 2)
        .attr("d", lineGen);

      // --- Punti raggiunti ---
      svg.selectAll(".year-node")
        .data(visiblePoints)
        .join("circle")
        .attr("class", "year-node")
        .attr("r", 5)
        .attr("fill", d => mainColor)
        .attr("cx", d => x(d.attacks))
        .attr("cy", d => y(d.victims))
        .on("mouseenter", function (event, d) {
          if (playing) return;
          tooltip.transition().duration(80).style("opacity", 0.95);
          tooltip.html(
            `<div style="padding:6px 8px;">
               <div style="font-weight:600; margin-bottom:2px;">Year ${d.year}</div>
               <div><b>Attacks:</b> ${fmt(d.attacks)}</div>
               <div><b>Victims:</b> ${fmt(d.victims)}</div>
             </div>`
          )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");

          svg.selectAll(".year-node").classed("dimmed", n => n !== d);
          svg.selectAll(".partial-line").attr("stroke-opacity", 0.2);
          svg.selectAll(".current-point").attr("opacity", 0.2);
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");
        })
        .on("mouseleave", () => {
          tooltip.transition().duration(200).style("opacity", 0);
          svg.selectAll(".year-node").classed("dimmed", false);
          svg.selectAll(".partial-line").attr("stroke-opacity", 1);
          svg.selectAll(".current-point").attr("opacity", 1);
        });

      // --- Punto corrente ---
      svg.append("circle")
        .attr("class", "current-point")
        .attr("r", 5)
        .attr("fill", mainColor)
        .attr("cx", x(interpPoint.attacks))
        .attr("cy", y(interpPoint.victims));

      if (playing || sliderMoving) {
        svg.append("text")
          .attr("class", "current-label")
          .attr("x", x(interpPoint.attacks))
          .attr("y", y(interpPoint.victims) - 10)
          .attr("text-anchor", "middle")
          .style("font-weight", "600")
          .text(Math.round(interpPoint.year));
      }

      // --- Key points annotations ---
      const visibleKeyPoints = visiblePoints.filter(d => d.is_key && d.pos && d.size && d.anchorPos);

      const annoGroup = svg.append("g")
        .attr("class", "annotation-layer");

      const annos = annoGroup.selectAll(".annotation-group")
        .data(visibleKeyPoints)
        .enter()
        .append("g")
        .attr("class", "annotation-group");

      const defs = svg.append("defs");
      defs.append("marker")
          .attr("id", "arrow-head")
          .attr("viewBox", "0 0 6 6")
          .attr("refX", 6)        // position of the tip
          .attr("refY", 3)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,0 L6,3 L0,6 Z")
          .attr("fill", "#9ca3af");


      // line from data point to anchorPos
      annos.append("line")
        .attr("x1", d => x(d.attacks))
        .attr("y1", d => y(d.victims))
        .attr("x2", d => x(d.anchorPos.x))
        .attr("y2", d => y(d.anchorPos.y))
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", 1.2)
        .attr("marker-end", "url(#arrow-head)");

      // annotation box
      const labelG = annos.append("g")
        .attr("transform", d => `translate(${x(d.pos.x)}, ${y(d.pos.y)})`);

      labelG.append("rect")
        .attr("class", "annotation-box")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", d => x(d.pos.x + d.size.x) - x(d.pos.x))
        .attr("height", d => y(d.pos.y) - y(d.pos.y + d.size.y)) // invert because y scale
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", "#f9fafb")
        .attr("stroke", "#d1d5db")
        .attr("stroke-width", 1);

      // Function to wrap text inside annotation box
      function wrapText(textSel, text, boxWidthPx) {
          const words = text.split(/\s+/).reverse();
          let line = [];
          let lineNumber = 0;
          const lineHeight = 1.2; // em
          const y0 = parseFloat(textSel.attr("y"));
          let tspan = textSel.text(null)
              .append("tspan")
              .attr("x", 6)
              .attr("y", y0)
              .attr("dy", "0em");

          while (words.length > 0) {
              const word = words.pop();
              line.push(word);
              tspan.text(line.join(" "));
              if (tspan.node().getComputedTextLength() > boxWidthPx - 12) { // 12px padding
                  line.pop();
                  tspan.text(line.join(" "));
                  line = [word];
                  tspan = textSel.append("tspan")
                      .attr("x", 6)
                      .attr("y", y0)
                      .attr("dy", ++lineNumber * lineHeight + "em")
                      .text(word);
              }
          }
      }

      // Append text inside annotation box with automatic wrapping
      labelG.append("text")
          .attr("class", "annotation-text")
          .attr("x", 6)
          .attr("y", 16) // top padding
          .each(function(d) {
              const textSel = d3.select(this);

              // Title (year)
              textSel.append("tspan")
                  .attr("class", "annotation-title")
                  .attr("x", 6)
                  .attr("y", 16)
                  .attr("dy", 0)
                  .text(d.label || d.year);

              // Notes (wrapped)
              const boxWidthPx = x(d.pos.x + d.size.x) - x(d.pos.x); // convert width in data coords to pixels
              wrapText(textSel, d.note || "", boxWidthPx);
          });


      title.text(`Time Range: ${Cutoff} - ${Math.round(time)}`);

    }

    function animate(timestamp) {
      if (!playing) return;
      if (lastTime === null) lastTime = timestamp;

      const dt = timestamp - lastTime;
      lastTime = timestamp;

      let val = parseFloat(slider.property("value"));
      val += dt * AnimationSpeed;

      if (val > maxYear) {
        val = maxYear;
        playing = false;
        playButton.text("▶ Play");
      }

      slider.property("value", val);
      updateFrame(val);

      if (playing) requestAnimationFrame(animate);
    }

    playButton.on("click", () => {
      playing = !playing;
      let val = parseFloat(slider.property("value"));
      if (playing) {
        if (val >= maxYear) val = minYear;
        slider.property("value", val);
        lastTime = null;
        playButton.text("❚❚ Pause");
        requestAnimationFrame(animate);
      } else {
        playButton.text("▶ Play");
        updateFrame(val);
      }
    });

    // first frame at the end
    updateFrame(maxYear);

  })();
}


