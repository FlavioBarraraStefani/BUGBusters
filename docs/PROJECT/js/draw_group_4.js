window.addEventListener('resize', () => { if (window._draw_group_4_lastCall) draw_group_4(...window._draw_group_4_lastCall); });

function draw_group_4(data, choice, containerId) {
  window._draw_group_4_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP DIMENSIONS & MARGINS
  const localMargin = { top: 30, right: 30, bottom: 40, left: 50 };
  const innerWidth = CHART_WIDTH - localMargin.left - localMargin.right;
  const innerHeight = CHART_HEIGHT - localMargin.top - localMargin.bottom;

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
  
  const g = svg.append('g').attr('transform', `translate(${localMargin.left},${localMargin.top})`);

  // 2. DATA PREPARATION
  const inputJSON = data[choice];
  
  if (!inputJSON || !inputJSON.timeline || inputJSON.timeline.length === 0) {
     g.append("text").text("No Data").attr("x", innerWidth/2).attr("y", innerHeight/2).style("text-anchor", "middle");
     return;
  }

  const timeline = inputJSON.timeline;
  const ribbonPadding = inputJSON.config.ribbonPadding;
  const topTargets = inputJSON.top_targets; // List of 5 targets
  const timeLabels = timeline.map(d => d.label);

  // 3. COLOR MAPPING
  // Map the specific target names to our global color palette
  const colorMap = {};
  topTargets.forEach((target, i) => {
      colorMap[target] = COLORS.targetColors[i % COLORS.targetColors.length];
  });

  // 4. CALCULATE STACK LAYOUT (GRAVITY LOGIC)
  
  // Calculate Max Stack Height (Should be roughly 100 + padding)
  const maxStack = d3.max(timeline, d => {
      const totalVal = Object.values(d.values).reduce((a, b) => a + b, 0);
      const totalPad = (d.order.length - 1) * ribbonPadding;
      return totalVal + totalPad;
  });

  // Transform Data for D3 Area
  const seriesData = topTargets.map(key => {
      return {
          key: key,
          values: timeline.map((step, i) => {
              // Logic from reference:
              const currentStepValueSum = Object.values(step.values).reduce((a,b) => a+b, 0);
              const currentStepPaddingSum = (step.order.length - 1) * ribbonPadding;
              const currentStackHeight = currentStepValueSum + currentStepPaddingSum;

              // Offset pushes the stack down (or up) to align
              // Since we are normalized 100%, maxStack is ~constant, so this effect is subtle
              // but ensures alignment if rounding errors occur.
              const gravityOffset = maxStack - currentStackHeight;
              
              let yCursor = gravityOffset; // Start cursor
              let myY0 = 0;
              let myY1 = 0;

              // Iterate through order (The Ranking Logic)
              for (let k of step.order) {
                  const val = step.values[k];
                  
                  if (k === key) {
                      myY0 = yCursor;
                      myY1 = yCursor + val;
                  }
                  // Move cursor down
                  yCursor += val + ribbonPadding;
              }

              return {
                  x: step.label,
                  xIdx: i,
                  y0: myY0, 
                  y1: myY1,
                  val: step.values[key] // Percentage
              };
          })
      };
  });

  // 5. SCALES
  const x = d3.scalePoint()
      .domain(timeLabels)
      .range([0, innerWidth]);

  const y = d3.scaleLinear()
      .domain([0, maxStack])
      .range([0, innerHeight]); 

  const area = d3.area()
      .x(d => x(d.x))
      .y0(d => y(d.y0))
      .y1(d => y(d.y1))
      .curve(d3.curveBumpX); // The smooth bump curve

  // 6. DRAW RIBBONS
  const ribbonGroup = g.append("g");
  
  ribbonGroup.selectAll(".ribbon")
      .data(seriesData)
      .enter()
      .append("path")
      .attr("class", "ribbon")
      .attr("d", d => area(d.values))
      .attr("fill", d => colorMap[d.key])
      .attr("fill-opacity", 0.85)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .on("mouseover", function(event, d) {
          d3.select(this).attr("fill-opacity", 1).attr("stroke-width", 1);
          showTooltip(event, d.key); // Show generic key name on path hover
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", function() {
          d3.select(this).attr("fill-opacity", 0.85).attr("stroke-width", 0.5);
          hideTooltip();
      });

  // 7. AXES & GRID
  // Vertical Grid Lines
  g.selectAll(".grid-line")
      .data(timeLabels)
      .enter()
      .append("line")
      .attr("x1", d => x(d))
      .attr("x2", d => x(d))
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#eee")
      .attr("stroke-dasharray", "2 2");

  // X Axis Labels
  g.selectAll(".axis-label")
      .data(timeLabels)
      .enter()
      .append("text")
      .attr("class", "axis-label")
      .attr("x", d => x(d))
      .attr("y", innerHeight + 15)
      .style("text-anchor", "middle")
      .style("font-size", "9px")
      .style("fill", COLORS.textPrimary)
      .text(d => d.split("-")[0]); // Show only start year (e.g., "2013") to save space

  // 8. RIBBON LABELS (Placed at widest point)
  // Instead of annotations, we find the best spot to label the ribbon
  seriesData.forEach(series => {
      // Find the point with maximum thickness (val)
      const maxPoint = series.values.reduce((prev, current) => (prev.val > current.val) ? prev : current);
      
      // Only label if it's thick enough (> 10%)
      if (maxPoint.val > 10) {
          const yCenter = (maxPoint.y0 + maxPoint.y1) / 2;
          
          g.append("text")
              .attr("x", x(maxPoint.x))
              .attr("y", y(yCenter))
              .attr("dy", "0.35em")
              .style("text-anchor", "middle")
              .style("font-size", "10px")
              .style("font-weight", "bold")
              .style("fill", "white")
              .style("pointer-events", "none")
              .style("text-shadow", "0px 0px 3px rgba(0,0,0,0.5)")
              .text(truncate(series.key, 10));
      }
  });
  
  function truncate(str, n) {
      return (str.length > n) ? str.substr(0, n-1) + '.' : str;
  }

  // 9. TOOLTIP
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("stroke-width", 0.5).attr("rx", 2);
  const tooltipText = tooltipGroup.append("text").attr("x", 4).attr("y", 9).style("font-size", "8px").style("font-family", "sans-serif");

  function showTooltip(event, text) {
      tooltipGroup.style("display", null);
      tooltipText.text(text);
      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 8).attr("height", bbox.height + 5);
      moveTooltip(event);
  }

  function moveTooltip(event) {
      const [x, y] = d3.pointer(event, svg.node());
      const xOffset = (x > CHART_WIDTH / 2) ? - (tooltipRect.attr("width") * 1) - 10 : 10; 
      const yOffset = -15;
      tooltipGroup.attr("transform", `translate(${x + xOffset}, ${y + yOffset})`);
  }

  function hideTooltip() { tooltipGroup.style("display", "none"); }
}window.addEventListener('resize', () => { if (window._draw_group_4_lastCall) draw_group_4(...window._draw_group_4_lastCall); });

function draw_group_4(data, choice, containerId) {
  window._draw_group_4_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP DIMENSIONS & MARGINS
  // Aumentiamo il margine destro per far stare le etichette
  const localMargin = { top: 30, right: 90, bottom: 40, left: 40 };
  const innerWidth = CHART_WIDTH - localMargin.left - localMargin.right;
  const innerHeight = CHART_HEIGHT - localMargin.top - localMargin.bottom;

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
  
  const g = svg.append('g').attr('transform', `translate(${localMargin.left},${localMargin.top})`);

  // 2. DATA PREPARATION
  const inputJSON = data[choice];
  
  if (!inputJSON || !inputJSON.timeline || inputJSON.timeline.length === 0) {
     g.append("text").text("No Data").attr("x", innerWidth/2).attr("y", innerHeight/2).style("text-anchor", "middle");
     return;
  }

  const timeline = inputJSON.timeline;
  const ribbonPadding = inputJSON.config.ribbonPadding;
  const topTargets = inputJSON.top_targets; 
  const timeLabels = timeline.map(d => d.label);

  // 3. COLOR MAPPING
  const colorMap = {};
  topTargets.forEach((target, i) => {
      colorMap[target] = COLORS.targetColors[i % COLORS.targetColors.length];
  });

  // 4. CALCULATE STACK LAYOUT
  const maxStack = d3.max(timeline, d => {
      const totalVal = Object.values(d.values).reduce((a, b) => a + b, 0);
      const totalPad = (d.order.length - 1) * ribbonPadding;
      return totalVal + totalPad;
  });

  const seriesData = topTargets.map(key => {
      return {
          key: key,
          values: timeline.map((step, i) => {
              const currentStepValueSum = Object.values(step.values).reduce((a,b) => a+b, 0);
              const currentStepPaddingSum = (step.order.length - 1) * ribbonPadding;
              const currentStackHeight = currentStepValueSum + currentStepPaddingSum;
              const gravityOffset = maxStack - currentStackHeight;
              
              let yCursor = gravityOffset;
              let myY0 = 0;
              let myY1 = 0;

              for (let k of step.order) {
                  const val = step.values[k];
                  if (k === key) {
                      myY0 = yCursor;
                      myY1 = yCursor + val;
                  }
                  yCursor += val + ribbonPadding;
              }

              return {
                  x: step.label,
                  xIdx: i,
                  y0: myY0, 
                  y1: myY1,
                  val: step.values[key]
              };
          })
      };
  });

  // 5. SCALES
  const x = d3.scalePoint()
      .domain(timeLabels)
      .range([0, innerWidth]);

  const y = d3.scaleLinear()
      .domain([0, maxStack])
      .range([0, innerHeight]); 

  const area = d3.area()
      .x(d => x(d.x))
      .y0(d => y(d.y0))
      .y1(d => y(d.y1))
      .curve(d3.curveBumpX);

  // 6. DRAW ELEMENTS

  // A. Vertical Axis Line (Hidden by default)
  const verticalLine = g.append("line")
    .attr("class", "hover-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#444")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3 3")
    .style("opacity", 0)
    .style("pointer-events", "none"); // Important so it doesn't steal mouse events

  // B. Ribbons
  const ribbonGroup = g.append("g");
  
  ribbonGroup.selectAll(".ribbon")
      .data(seriesData)
      .enter()
      .append("path")
      .attr("class", "ribbon")
      .attr("d", d => area(d.values))
      .attr("fill", d => colorMap[d.key])
      .attr("fill-opacity", 0.9)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      // --- INTERACTION ---
      .on("mouseover", function(event, d) {
          // 1. Dim others
          d3.selectAll(".ribbon")
            .transition().duration(200)
            .attr("fill", "#ccc") // Make others gray
            .attr("fill-opacity", 0.3)
            .attr("stroke", "none");

          // 2. Highlight current
          d3.select(this)
            .transition().duration(200)
            .attr("fill", colorMap[d.key]) // Restore color
            .attr("fill-opacity", 1)
            .attr("stroke", "#333")
            .attr("stroke-width", 1);
            
          verticalLine.style("opacity", 1);
          tooltipGroup.style("display", null);
      })
      .on("mousemove", function(event, d) {
          // 1. Find nearest X (Bin)
          // Since scalePoint is discrete, we find the closest index based on mouse X
          const mouseX = d3.pointer(event, g.node())[0];
          const domain = x.domain();
          const range = x.range();
          const step = x.step();
          
          // Calculate index: round(mouseX / step)
          let index = Math.round(mouseX / step);
          // Clamp index
          index = Math.max(0, Math.min(index, domain.length - 1));
          
          const hoveredLabel = domain[index];
          const xPos = x(hoveredLabel);
          const dataPoint = d.values[index]; // The value for this series at this time

          // 2. Move Vertical Line
          verticalLine
            .attr("x1", xPos)
            .attr("x2", xPos);

          // 3. Update Tooltip
          // Show Year and Percentage
          const valText = dataPoint ? `${dataPoint.val.toFixed(1)}%` : "0%";
          const tooltipContent = `${hoveredLabel}: ${valText}`;
          
          tooltipText.text(tooltipContent);
          
          // Resize tooltip bg
          const bbox = tooltipText.node().getBBox();
          tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
          
          // Move tooltip near mouse but usually a bit up
          const [mx, my] = d3.pointer(event, svg.node());
          // Logic to keep tooltip within chart bounds
          let tx = mx + 10;
          if (tx + bbox.width > CHART_WIDTH) tx = mx - bbox.width - 10;
          
          tooltipGroup.attr("transform", `translate(${tx}, ${my - 20})`);
      })
      .on("mouseout", function() {
          // Reset all ribbons
          d3.selectAll(".ribbon")
            .transition().duration(200)
            .attr("fill", d => colorMap[d.key])
            .attr("fill-opacity", 0.9)
            .attr("stroke", "white")
            .attr("stroke-width", 0.5);

          verticalLine.style("opacity", 0);
          tooltipGroup.style("display", "none");
      });

  // 7. LABELS ON THE RIGHT (Final Position)
  const labelsGroup = g.append("g");
  
  seriesData.forEach(series => {
      // Get the last data point to position the label
      const lastPoint = series.values[series.values.length - 1];
      const yCenter = (lastPoint.y0 + lastPoint.y1) / 2;
      
      labelsGroup.append("text")
          .attr("x", innerWidth + 5) // Just outside the chart area
          .attr("y", y(yCenter))
          .attr("dy", "0.35em")
          .style("text-anchor", "start") // Left aligned (reading from chart outwards)
          .style("font-size", "9px")     // Same style as previous plots
          .style("fill", COLORS.textPrimary)
          .style("font-weight", "bold")
          .style("cursor", "default")
          .text(series.key);
  });

  // 8. AXES
  // X Axis Labels (Years)
  g.selectAll(".axis-label")
      .data(timeLabels)
      .enter()
      .append("text")
      .attr("class", "axis-label")
      .attr("x", d => x(d))
      .attr("y", innerHeight + 15)
      .style("text-anchor", "middle")
      .style("font-size", "9px")
      .style("fill", COLORS.textPrimary)
      .text(d => d.split("-")[0]); // Show start year "2015"

  // 9. TOOLTIP GROUP
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("stroke-width", 0.5).attr("rx", 2);
  const tooltipText = tooltipGroup.append("text").attr("x", 5).attr("y", 12).style("font-size", "10px").style("font-weight", "bold").style("fill", "#333");
}window.addEventListener('resize', () => { if (window._draw_group_4_lastCall) draw_group_4(...window._draw_group_4_lastCall); });

function draw_group_4(data, choice, containerId) {
  window._draw_group_4_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP DIMENSIONS & MARGINS
  const localMargin = { top: 30, right: 90, bottom: 40, left: 40 };
  const innerWidth = CHART_WIDTH - localMargin.left - localMargin.right;
  const innerHeight = CHART_HEIGHT - localMargin.top - localMargin.bottom;

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
  
  // Aggiungiamo un rettangolo trasparente per catturare il click di "reset" sullo sfondo
  svg.append("rect")
     .attr("width", CHART_WIDTH)
     .attr("height", CHART_HEIGHT)
     .attr("fill", "transparent")
     .on("click", () => resetSelection());

  const g = svg.append('g').attr('transform', `translate(${localMargin.left},${localMargin.top})`);

  // 2. DATA PREPARATION
  const inputJSON = data[choice];
  
  if (!inputJSON || !inputJSON.timeline || inputJSON.timeline.length === 0) {
     g.append("text").text("No Data").attr("x", innerWidth/2).attr("y", innerHeight/2).style("text-anchor", "middle");
     return;
  }

  const timeline = inputJSON.timeline;
  const ribbonPadding = inputJSON.config.ribbonPadding;
  const topTargets = inputJSON.top_targets; 
  const timeLabels = timeline.map(d => d.label);

  // 3. COLOR MAPPING
  const colorMap = {};
  topTargets.forEach((target, i) => {
      colorMap[target] = COLORS.targetColors[i % COLORS.targetColors.length];
  });

  // 4. CALCULATE STACK LAYOUT
  const maxStack = d3.max(timeline, d => {
      const totalVal = Object.values(d.values).reduce((a, b) => a + b, 0);
      const totalPad = (d.order.length - 1) * ribbonPadding;
      return totalVal + totalPad;
  });

  const seriesData = topTargets.map(key => {
      return {
          key: key,
          values: timeline.map((step, i) => {
              const currentStepValueSum = Object.values(step.values).reduce((a,b) => a+b, 0);
              const currentStepPaddingSum = (step.order.length - 1) * ribbonPadding;
              const currentStackHeight = currentStepValueSum + currentStepPaddingSum;
              const gravityOffset = maxStack - currentStackHeight;
              
              let yCursor = gravityOffset;
              let myY0 = 0;
              let myY1 = 0;

              for (let k of step.order) {
                  const val = step.values[k];
                  if (k === key) {
                      myY0 = yCursor;
                      myY1 = yCursor + val;
                  }
                  yCursor += val + ribbonPadding;
              }

              return {
                  x: step.label,
                  xIdx: i,
                  y0: myY0, 
                  y1: myY1,
                  val: step.values[key]
              };
          })
      };
  });

  // 5. SCALES
  const x = d3.scalePoint()
      .domain(timeLabels)
      .range([0, innerWidth]);

  const y = d3.scaleLinear()
      .domain([0, maxStack])
      .range([0, innerHeight]); 

  const area = d3.area()
      .x(d => x(d.x))
      .y0(d => y(d.y0))
      .y1(d => y(d.y1))
      .curve(d3.curveBumpX);

  // 6. DRAW ELEMENTS

  // A. Vertical Axis Line
  const verticalLine = g.append("line")
    .attr("class", "hover-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#444")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3 3")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // B. Ribbon Group
  const ribbonGroup = g.append("g");
  
  // STATE VARIABLE
  let activeSeries = null; // Stores the key of the clicked series

  const ribbons = ribbonGroup.selectAll(".ribbon")
      .data(seriesData)
      .enter()
      .append("path")
      .attr("class", "ribbon")
      .attr("d", d => area(d.values))
      .attr("fill", d => colorMap[d.key])
      .attr("fill-opacity", 0.9)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer");

  // --- INTERACTION LOGIC ---

  ribbons.on("click", function(event, d) {
      event.stopPropagation(); // Prevent bg click

      // Toggle selection
      if (activeSeries === d.key) {
          activeSeries = null; // Deselect if clicking same
      } else {
          activeSeries = d.key; // Select new
      }
      updateVisuals(activeSeries);
      
      // Update tooltip immediately for the click position
      updateTooltip(event, d.key); 
  });

  ribbons.on("mouseover", function(event, d) {
      if (activeSeries) return; // Ignore hover if selection is active
      updateVisuals(d.key, true); // true = temporary hover
      verticalLine.style("opacity", 1);
      updateTooltip(event, d.key);
  });

  ribbons.on("mousemove", function(event, d) {
      // If selection active, track that key. If not, track hovered key.
      const targetKey = activeSeries || d.key;
      updateTooltip(event, targetKey);
  });

  ribbons.on("mouseout", function() {
      if (activeSeries) return; // Don't reset if selection active
      updateVisuals(null); // Reset to default
      verticalLine.style("opacity", 0);
      tooltipGroup.style("display", "none");
  });

  // Function to handle visual states (Graying out vs Highlighting)
  function updateVisuals(highlightKey, isHover = false) {
      if (!highlightKey) {
          // RESET ALL
          ribbons
            .transition().duration(200)
            .attr("fill", d => colorMap[d.key])
            .attr("fill-opacity", 0.9)
            .attr("stroke", "white")
            .attr("stroke-width", 0.5);
          
          // Reset labels opacity
          labelsGroup.selectAll("text").style("opacity", 1);
          
          if (!isHover) {
            verticalLine.style("opacity", 0);
            tooltipGroup.style("display", "none");
          }
      } else {
          // DIM OTHERS
          ribbons
            .transition().duration(200)
            .attr("fill", d => d.key === highlightKey ? colorMap[d.key] : "#ccc")
            .attr("fill-opacity", d => d.key === highlightKey ? 1 : 0.3)
            .attr("stroke", d => d.key === highlightKey ? "#333" : "none")
            .attr("stroke-width", d => d.key === highlightKey ? 1 : 0);
          
          // Raise the selected one to top
          const selectedRibbon = ribbons.filter(d => d.key === highlightKey);
          selectedRibbon.raise();

          // Dim labels
          labelsGroup.selectAll("text")
             .style("opacity", d => d.key === highlightKey ? 1 : 0.3);
      }
  }

  function resetSelection() {
      activeSeries = null;
      updateVisuals(null);
  }

  // C. Generic Tooltip Logic
  function updateTooltip(event, key) {
      if (!key) return;

      // 1. Find nearest X (Bin)
      const mouseX = d3.pointer(event, g.node())[0];
      const domain = x.domain();
      const step = x.step();
      let index = Math.round(mouseX / step);
      index = Math.max(0, Math.min(index, domain.length - 1));
      
      const hoveredLabel = domain[index];
      const xPos = x(hoveredLabel);
      
      // Find value for the SPECIFIC key (even if mouse is over another ribbon)
      const series = seriesData.find(s => s.key === key);
      const dataPoint = series.values[index];

      // 2. Move Vertical Line
      verticalLine
        .attr("x1", xPos)
        .attr("x2", xPos)
        .style("opacity", 1);

      // 3. Update Tooltip Text
      const valText = dataPoint ? `${dataPoint.val.toFixed(1)}%` : "0%";
      const tooltipContent = `${hoveredLabel}: ${valText}`;
      
      tooltipGroup.style("display", null);
      tooltipText.text(tooltipContent);
      
      // 4. Position Tooltip
      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
      
      const [mx, my] = d3.pointer(event, svg.node());
      let tx = mx + 10;
      if (tx + bbox.width > CHART_WIDTH) tx = mx - bbox.width - 10;
      
      tooltipGroup.attr("transform", `translate(${tx}, ${my - 20})`);
  }

  // 7. LABELS ON THE RIGHT
  const labelsGroup = g.append("g");
  
  seriesData.forEach(series => {
      const lastPoint = series.values[series.values.length - 1];
      const yCenter = (lastPoint.y0 + lastPoint.y1) / 2;
      
      labelsGroup.append("text")
          .datum(series) // Bind data so we can access key for filtering
          .attr("x", innerWidth + 5)
          .attr("y", y(yCenter))
          .attr("dy", "0.35em")
          .style("text-anchor", "start")
          .style("font-size", "6px")
          .style("fill", COLORS.textPrimary)
          .style("cursor", "pointer") // Make labels clickable too!
          .text(series.key)
          .on("click", function(event, d) {
              event.stopPropagation();
              if (activeSeries === d.key) activeSeries = null;
              else activeSeries = d.key;
              updateVisuals(activeSeries);
              // For label click, we don't show tooltip immediately as mouse might be far
          });
  });

  // 8. AXES
  g.selectAll(".axis-label")
      .data(timeLabels)
      .enter()
      .append("text")
      .attr("class", "axis-label")
      .attr("x", d => x(d))
      .attr("y", innerHeight + 15)
      .style("text-anchor", "middle")
      .style("font-size", "9px")
      .style("fill", COLORS.textPrimary)
      .text(d => d.split("-")[0]); 

  // 9. TOOLTIP GROUP
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("stroke-width", 0.5).attr("rx", 2);
  const tooltipText = tooltipGroup.append("text").attr("x", 5).attr("y", 12).style("font-size", "10px").style("font-weight", "bold").style("fill", "#333");
}