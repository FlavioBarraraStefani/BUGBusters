
function precompute_group(data) {
  const groups = CATEGORIES.group;
  const minYear = 1977;

  let dataMax = minYear;
  groups.forEach(g => {
    if (data[g]) {
      Object.keys(data[g]).forEach(ky => {
        const y = +ky;
        if (y > dataMax) dataMax = y;
      });
    }
  });

  const fullYearsArr = d3.range(minYear, dataMax + 1);
  const rawCountsByGroup = groups.map(gname => {
    return fullYearsArr.map(y => {
      return (data[gname] && data[gname][y]) ? +data[gname][y].total_count : 0;
    });
  });

  const snapshots = {};
  for (let endYear = minYear; endYear <= dataMax; endYear++) {
    
    const count = endYear - minYear + 1;

    const snapshotData = groups.map((gname, i) => {
        const currentCounts = rawCountsByGroup[i].slice(0, count);
        
        const totalCount = currentCounts.reduce((a, b) => a + b, 0);
        const divisor = totalCount || 1; 

        // Generate the PDF series objects
        const series = currentCounts.map((val, idx) => ({
            year: minYear + idx,
            value: val / divisor, // Normalized PDF value
            count: val            // Raw count for tooltip
        }));

        const maxVal = d3.max(series, s => s.value) || 0;

        return {
            name: gname,
            index: i, 
            series: series,
            maxVal: maxVal,
            totalCount: totalCount
        };
    });
    
    snapshots[endYear] = snapshotData;
  }

  window._precomputed_group = {
    minYear: minYear,
    maxYear: dataMax,
    snapshots: snapshots
  };
}


function right_chart_group(svg) {
  // --- Constants & Config ---
  const minYear = sliderRange[0];
  const pre = window._precomputed_group;

  // --- NEW: Define Top Margin ---
  const fontSize = labelFontSize * (isSmallScreen() || (!STACKED_LAYOUT_PREFERRED && !isXLScreen()) ? 1 : 1.5);
  const MARGIN_TOP = fontSize * 2; // Increased top margin for title
  
  // --- State for Tooltip Persistence ---
  let lastMouseOverlayX = null; 
  let lastMousePageCoords = null; 
  
  // Ensure container exists
  let container = svg.select('.groups-container');
  if (container.empty()) {
    container = svg.append('g').attr('class', 'groups-container');
  }

  // --- NEW: Add/Update Title ---
  let title = container.select('.main-chart-title');

  
  // --- Helper: Data Processing ---
  const getSeriesData = (currentMaxYear) => {
    let y = Math.round(currentMaxYear);
    if (y < pre.minYear) y = pre.minYear;
    if (y > pre.maxYear) y = pre.maxYear;
    return pre.snapshots[y] || [];
  };
  
  // --- Core Render Function ---
  container._updateRidges = (duration = 0) => {
    //creatae title if not exists
    if (title.empty()) {
    title = container.append('text')
      .attr('class', 'main-chart-title')
      .attr('text-anchor', 'middle') // Centers text horizontally
      .style('font-weight', 'bold')
      .attr('x', RIGHT_CHART_WIDTH / 2) // Center of chart width
      .attr('y', MARGIN_TOP * 0.75)    // Center vertically within the top margin
      .style('font-size', `${fontSize}px`) 
      .text("Probability Distribution of attacks")
      .style('opacity', 0)
      .attr('transform', `translate(0, -${RIGHT_CHART_HEIGHT})`);

    title.transition()
      .duration(transitionDurationMs)
      .ease(d3.easeCubicOut)
      .style('opacity', 1)
      .attr('transform', 'translate(0, 0)');
  }
  


    // 1. Get current state
    const maxYearNow = +slider.property('value') || years[years.length - 1];
    const minYear = sliderRange[0]; 
    const data = getSeriesData(maxYearNow);
    
    // 2. Setup Scales & Dimensions
    const xStart = leftPadAxis;
    const xEnd = RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN;
    const axisY = RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN;
    
    // Scale
    const x = d3.scaleLinear()
    .domain([minYear, maxYearNow])
    .range([xStart, xEnd]);
    
    // Handle collapsed axis edge case
    const axisCollapsed = maxYearNow == minYear;
    const lineX1 = axisCollapsed ? xStart : x(minYear);
    const lineX2 = axisCollapsed ? xEnd : x(maxYearNow);
    const bgWidth = Math.max(0, lineX2 - lineX1);
    
    // Layout
    const smallGap = 10;
    const labelPadding = 5;
    // When labels are on top (not stacked), gap must include label height + padding
    const labelOnTop = !STACKED_LAYOUT_PREFERRED;
    // Use a larger gap to accommodate the label when labels are placed on top.
    // In stacked layout, use a small gap between groups so they don't touch.
    const groupGap = labelOnTop ? (labelPadding + fontSize) : smallGap;
    const totalGaps = (data.length * groupGap) + (2 * smallGap);
    const rectHeight = Math.max(0, (axisY - MARGIN_TOP - totalGaps) / data.length);

    // 3. Bind Data & Render Groups
    container.selectAll('g.groups')
      .data(data, d => d.name)
      .join(
        enter => {
          const g = enter.append('g').attr('class', 'groups');
          g.append('rect').attr('class', 'group-bg').attr('fill', 'transparent');
          g.append('path').attr('class', 'group-area').attr('stroke', 'none');
          g.append('line').attr('class', 'group-empty-line');
          g.append('text').attr('class', 'group-label').style('font-family', 'sans-serif');
          
          // Enter Animation
          g.style('opacity', 0)
           .attr('transform', `translate(0, -${RIGHT_CHART_HEIGHT})`);

          g.transition()
           .duration(transitionDurationMs)
           .ease(d3.easeCubicOut)
           .style('opacity', 1)
           .attr('transform', 'translate(0, 0)');

          return g;
        },
        update => update,
        exit => exit.remove()
      )
      .each(function(d) {
        const g = d3.select(this);
        const i = d.index;
        const color = COLORS.groupColors[i];
        const darkerColor = d3.color(color) ? d3.color(color).darker(0.8) : color;

        const yTop = MARGIN_TOP + smallGap + (labelOnTop ? groupGap : 0) + i * (rectHeight + groupGap);
        const yBottom = yTop + rectHeight;

        // Draw Background
        g.select('.group-bg')
          .transition().duration(duration)
          .attr('x', lineX1).attr('y', yTop)
          .attr('width', bgWidth).attr('height', rectHeight)
          .style('opacity', 1);

        // Draw Bottom Line
        g.select('.group-empty-line')
          .transition().duration(duration)
          .attr('x1', lineX1).attr('x2', lineX2)
          .attr('y1', yBottom).attr('y2', yBottom)
          .attr('stroke', darkerColor).attr('stroke-width', 1.5)
          .style('opacity', 1);

        // Draw Label
        const labelName = d.name.charAt(0).toUpperCase() + d.name.slice(1);
        const labelText = g.select('.group-label')
          .text(labelName)
          .attr('fill', color)
          .style('font-size', `${fontSize}px`)
          .style('cursor', 'pointer'); // Ensure cursor indicates clickability

        // DIRECT LABEL CLICK HANDLER (Crucial for Stacked Layout)
        labelText.on('click', function(event) {
             stopAnimation();
             showModal("group", d.name);
             event.stopPropagation();
        });

        if (STACKED_LAYOUT_PREFERRED) {
          labelText.transition().duration(duration)
            .attr('x', xStart - 10).attr('y', yBottom).attr('dy', 0)
            .attr('text-anchor', 'end').style('opacity', 1);
        } else {
          // Label positioned 5px below previous rect (or title), centered above current rect
          labelText.transition().duration(duration)
            .attr('x', lineX1 + bgWidth / 2).attr('y', yTop - labelPadding).attr('dy', 0)
            .attr('dominant-baseline', 'auto')
            .attr('text-anchor', 'middle').style('opacity', 1);
        }

        // Draw Area
        const pathEl = g.select('.group-area');
        if (d.maxVal <= 0) {
          pathEl.transition().duration(duration).style('opacity', 0).attr('d', null);
        } else {
          let pathString;
          if (d.series.length >= 2) {
            const areaGen = d3.area()
              .x(s => x(s.year)).y0(yBottom)
              .y1(s => {
                const raw = yBottom - (s.value / d.maxVal) * rectHeight;
                return Math.max(yBottom - rectHeight, Math.min(yBottom, raw));
              })
              .curve(d3.curveMonotoneX);
            pathString = areaGen(d.series);
          } else {
            const s = d.series[0];
            const xMid = x(s.year);
            const w = Math.max(4, (xEnd - xStart) * 0.01);
            const h = (s.value / d.maxVal) * rectHeight;
            const yTopRect = yBottom - h;
            pathString = `M ${xMid-w/2},${yBottom} L ${xMid-w/2},${yTopRect} L ${xMid+w/2},${yTopRect} L ${xMid+w/2},${yBottom} Z`;
          }
          pathEl
            .attr('fill', color).attr('fill-opacity', 0.75)
            .attr('stroke', darkerColor).attr('stroke-width', 1.5)
            .attr('d', pathString).style('opacity', 1);
        }
      });

    // --- TOOLTIP & INTERACTION LOGIC ---

    if (container.select('.hover-line').empty()) {
      container.append('line')
        .attr('class', 'hover-line')
        .attr('stroke', 'gray')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 4')
        .style('opacity', 0)
        .style('pointer-events', 'none');
    }

    let overlay = container.select('.interaction-overlay');
    if (overlay.empty()) {
      overlay = container.append('rect')
        .attr('class', 'interaction-overlay')
        .attr('fill', 'transparent')
        .style('pointer-events', 'all') 
        .style('cursor', 'pointer'); 
      
      if (d3.select('#ridgeline-tooltip').empty()) {
        d3.select('body').append('div')
          .attr('id', 'ridgeline-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.9)')
          .style('color', '#fff')
          .style('padding', '10px')
          .style('border-radius', '4px')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('z-index', 99);
      }
    }

    // Ensure Overlay is on top of lines/areas (BUT labels might be outside or under)
    overlay.raise();

    // Helper: Update Tooltip
    const updateTooltip = () => {
      if (lastMouseOverlayX === null) return;
      const yearRaw = x.invert(lastMouseOverlayX);
      const year = Math.round(yearRaw);

      if (year < minYear || year > maxYearNow) {
        container.select('.hover-line').style('opacity', 0);
        d3.select('#ridgeline-tooltip').style('opacity', 0);
        return;
      }

      const xPos = x(year);

      container.select('.hover-line')
        .attr('x1', xPos).attr('x2', xPos)
        .attr('y1', 0).attr('y2', axisY)
        .style('opacity', 1);

      let html = `<strong style="font-size:${labelFontSize}px">Year: ${year}</strong><br/>`;
      data.forEach((g) => {
        const point = g.series.find(s => s.year === year);
        const count = point ? point.count : 0;
        const percent = (g.totalCount > 0) ? ((count / g.totalCount) * 100).toFixed(1) : "0.0";
        const color = COLORS.groupColors[g.index];
        html += `<div style="display:flex; align-items:center; margin-top:4px; font-size:${labelFontSize}px">
                  <span style="width:8px; height:8px; background:${color}; border-radius:50%; margin-right:6px; display:inline-block;"></span>
                  <span>${g.name}: ${count} (${percent}%) attacks</span>
                 </div>`;
      });

      const tooltip = d3.select('#ridgeline-tooltip');
      tooltip.html(html).style('font-size', `${labelFontSize}px`).style('opacity', 1);

      if (lastMousePageCoords) {
        const pageX = lastMousePageCoords[0];
        const pageY = lastMousePageCoords[1];
        const tooltipNode = tooltip.node();
        const tooltipWidth = tooltipNode ? tooltipNode.getBoundingClientRect().width : 150;
        const windowWidth = window.innerWidth;
        
        const offset = 15;
        let leftPos = pageX + offset;
        
        if (leftPos + tooltipWidth > windowWidth - 10) {
          leftPos = pageX - tooltipWidth - offset;
        }

        tooltip.style('left', leftPos + 'px').style('top', (pageY - 15) + 'px');
      }
    };

    overlay
      .attr('x', xStart)
      .attr('y', 0)
      .attr('width', Math.max(0, xEnd - xStart))
      .attr('height', axisY)
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event);
        lastMouseOverlayX = mx;
        lastMousePageCoords = [event.pageX, event.pageY];
        updateTooltip();
      })
      .on('mouseleave', function() {
        lastMouseOverlayX = null;
        lastMousePageCoords = null;
        container.select('.hover-line').style('opacity', 0);
        d3.select('#ridgeline-tooltip').style('opacity', 0);
      })
      .on('click', function(event) {
        // Calculate which vertical band was clicked
        const [mx, my] = d3.pointer(event);
        const clickedGroup = data.find((d, i) => {
             const yTop = smallGap + groupGap + i * (rectHeight + groupGap);
             const yBottom = yTop + rectHeight;
             return my >= (yTop - 25) && my <= yBottom;
        });

        if (clickedGroup) {
          stopAnimation();
          showModal("group", clickedGroup.name);
        }
      });

    if (lastMouseOverlayX !== null) {
      updateTooltip();
    }
  };

  // choose left padding based on stacked layout preference
  leftPadAxis = STACKED_LAYOUT_PREFERRED
  ? RIGHT_CHART_MARGIN + (isSmallScreen() ? 45 : 90)
  : RIGHT_CHART_MARGIN;
    
  rightPadAxis = RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN;

  // Global override
  stepAnimationRight = (transition = true) => {
    const duration = transition ? playIntervalMs : 0;
    xAxis._updateAxis(0); 
    container._updateRidges(duration);
  };

  xAxis._updateAxis(playIntervalMs/2); 
  container._updateRidges(playIntervalMs);
}