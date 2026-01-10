function right_chart_attack(svg) {
  // Use precomputed data
  const pre = window._precomputed_attack;
  const data = pre.data;
  const attackTypes = CATEGORIES.attack;
  const attackColors = COLORS.attackColors;
  const minYear = sliderRange[0];

  // --- 0. STATE: Track Mouse Position ---
  let lastMouseX = null; // <--- ADDED

  // --- 1. Layout Calculations ---
  // Set padding differently when legend is shown

  const preferredSize = labelFontSize * (isSmallScreen() ? 1 : 1.2);
  const showLegend = isSmallScreen() || (!STACKED_LAYOUT_PREFERRED && !isXLScreen());

  // Precompute legend rows so MARGIN_TOP can depend on actual legend height
  const legendFontSize = labelFontSize * (isSmallScreen() ? 1 : 1.5);
  let legend_rows = 0;
  if (showLegend) {
    const availableWidth = RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN * 2;
    const itemSpacingEstimate = 15;
    let currentRowWidth = 0;
    legend_rows = 1;
    attackTypes.forEach(type => {
      const label = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const approxLabelWidth = label.length * (legendFontSize * 0.6);
      const approxItemWidth = 12 /* swatch */ + 6 /* gap */ + approxLabelWidth + 8 /* padding */;
      if (currentRowWidth > 0 && (currentRowWidth + approxItemWidth) > availableWidth) {
        legend_rows++;
        currentRowWidth = approxItemWidth + itemSpacingEstimate;
      } else {
        currentRowWidth += approxItemWidth + itemSpacingEstimate;
      }
    });
  }

  const MARGIN_TOP = (showLegend ? preferredSize * 1.2 * Math.max(1, legend_rows) : 0) + preferredSize;

  if (showLegend) {
    leftPadAxis = RIGHT_CHART_MARGIN;
    rightPadAxis = RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN - 20;
  } else {
    leftPadAxis = RIGHT_CHART_MARGIN+10;
    rightPadAxis = RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN - 160;
  }

  // Ensure container exists
  let container = svg.select('.attacks-container');
  if (container.empty()) {
    container = svg.append('g').attr('class', 'attacks-container');

    // 1. Create Overlay
    container.append('rect')
      .attr('class', 'interaction-overlay')
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');

    // Note: Y axis removed — thresholds (dotted lines) are used instead

    // 3. Hover Line
    container.append('line')
      .attr('class', 'hover-line')
      .attr('stroke', COLORS.RIGHT_CHART.axisLine)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')
      .style('opacity', 0)
      .style('pointer-events', 'none');

    // Tooltip Container
    if (d3.select('#attack-tooltip').empty()) {
      d3.select('body').append('div')
        .attr('id', 'attack-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.9)')
        .style('color', '#fff')
        .style('padding', '10px')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 99)
        .style('font-family', 'sans-serif')
        .style('box-shadow', '0 2px 10px rgba(0,0,0,0.5)');
    }

    let title = container.select('.main-chart-title');
        //creatae title if not exists
      if (title.empty()) {
        title = container.append('text')
          .attr('class', 'main-chart-title')
          .attr('text-anchor', 'middle') // Centers text horizontally
          .style('font-weight', 'bold')
          .attr('x', RIGHT_CHART_WIDTH / 2) // Center of chart width
          .attr('y', preferredSize /2*3)    // Center vertically within the top margin
          .style('font-size', `${preferredSize}px`) 
          .text("Cumulative count of Attacks by Type")
          .style('opacity', 0)
          .attr('transform', `translate(0, -${RIGHT_CHART_HEIGHT})`);
  
        title.transition()
          .duration(transitionDurationMs)
          .ease(d3.easeCubicOut)
          .style('opacity', 1)
          .attr('transform', 'translate(0, 0)');
      }

    let legendGroup = container.select('.top-legend');
    if (legendGroup.empty()) {
      legendGroup = container.append('g').attr('class', 'top-legend');
  }
  }


  // --- 2. Update Function ---
  container._updateLines = (duration = 0) => {
    const maxYearNow = +slider.property('value');
    const minYear = sliderRange[0];
    const isStart = maxYearNow === minYear;

    const visibleData = data.filter(d => d.year >= minYear && d.year <= maxYearNow);

    if (visibleData.length === 0 && !isStart) return;

    // Calculate Dynamic Max Y
    let currentMax = 0;
    visibleData.forEach(d => {
      if (d.rowMax > currentMax) currentMax = d.rowMax;
    });
    const yMax = currentMax > 0 ? currentMax * 1.05 : 10;

    // Scales
    const x = d3.scaleLinear()
      .domain([minYear, isStart ? minYear + 1 : maxYearNow])
      .range([leftPadAxis, rightPadAxis]);

    // Update Overlay Dimensions
    container.select('.interaction-overlay')
      .attr('x', leftPadAxis)
      .attr('y', RIGHT_CHART_MARGIN + MARGIN_TOP)
      .attr('width', Math.max(0, rightPadAxis - leftPadAxis))
      .attr('height', RIGHT_CHART_HEIGHT - 2 * RIGHT_CHART_MARGIN - MARGIN_TOP);

    const y = d3.scaleLinear()
      .domain([0, yMax])
      .range([RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN, RIGHT_CHART_MARGIN + MARGIN_TOP]);

    const availableHeight = (RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN) - (RIGHT_CHART_MARGIN + MARGIN_TOP);
    const minPxPerTick = labelFontSize + 2;
    const numTicks = Math.max(2, Math.min(5, Math.floor(availableHeight / minPxPerTick)));

    // Y axis removed: ensure any existing axis group is removed
    container.selectAll('.y-axis-attack').remove();

    // --- HORIZONTAL THRESHOLD LINES ---
    // Draw up to 3 largest thresholds that fit within yMax
    const thresholds = [100, 500, 1000, 5000, 10000, 20000, 50000];
    const availableThresholds = thresholds.filter(t => t <= yMax).sort((a, b) => a - b);
    const thresholdsToShow = availableThresholds.slice(-3);

    const tGroups = container.selectAll('.threshold-group')
      .data(thresholdsToShow, d => d);

    tGroups.join(
      enter => enter.append('g').attr('class', 'threshold-group')
        .attr('opacity', 0)
        .call(g => {
          g.append('line')
            .attr('class', 'threshold-line')
            .attr('x1', leftPadAxis)
            .attr('x2', rightPadAxis)
            .attr('y1', d => y(d))
            .attr('y2', d => y(d))
            .attr('stroke', COLORS.RIGHT_CHART.axisLine || '#888')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3')
            .style('opacity', 0.12);

          g.append('text')
            .attr('class', 'threshold-label')
            .attr('x', leftPadAxis)
            .attr('text-anchor', 'start')
            .attr('y', d => y(d) - 4)
            .style('font-size', `${preferredSize * 0.8}px`)
            .attr('fill', COLORS.defaultComparison)
            .style('opacity', 1)
            .text(d => String(d));
        })
        .transition().duration(transitionDurationMs).attr('opacity', 1),
      update => update.call(g => {
        g.select('line').transition().duration(duration)
          .attr('x1', leftPadAxis).attr('x2', rightPadAxis)
          .attr('y1', d => y(d)).attr('y2', d => y(d));
        g.select('text').transition().duration(duration)
          .attr('x', leftPadAxis - 8).attr('y', d => y(d) - 4);
      }),
      exit => exit.transition().duration(duration).style('opacity', 0).remove()
    );


    // Line Generator
    const lineGen = d3.line()
      .defined(d => !isNaN(d.value) && d.value !== null)
      .x(d => x(d.year))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Series Data
    const series = isStart ? [] : attackTypes.map((type, i) => ({
      type: type,
      color: attackColors[i % attackColors.length],
      values: visibleData.map(d => ({
        year: d.year,
        value: d[type]
      }))
    }));

    // --- TOOLTIP LOGIC (UPDATED) ---
    const hideTooltip = () => {
      lastMouseX = null; // <--- Clear state
      container.select('.hover-line').style('opacity', 0);
      d3.select('#attack-tooltip').style('opacity', 0);
    };

    const updateTooltip = (event) => {
      let mx;

      // 1. Determine X coordinate (from Event or State)
      if (event) {
        [mx] = d3.pointer(event, container.node());
        lastMouseX = mx; // Save state
      } else if (lastMouseX !== null) {
        mx = lastMouseX; // Use saved state
      } else {
        return;
      }

      // 2. Invert using *current* scale
      const yearRaw = x.invert(mx);
      let year = Math.round(yearRaw);

      if (year < minYear || year > +slider.property('value')) {
        hideTooltip();
        return;
      }

      const xPos = x(year);
      container.select('.hover-line')
        .attr('x1', xPos).attr('x2', xPos)
        .attr('y1', RIGHT_CHART_MARGIN + MARGIN_TOP).attr('y2', RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN)
        .style('opacity', 1);

      let html = `<strong style="font-size:${labelFontSize}px">Year: ${year}</strong><br/>`;

      const yearData = data.find(d => d.year === year);
      if (yearData) {
        const sortedStats = attackTypes.map((type, i) => ({
          name: type,
          value: yearData[type] || 0,
          color: attackColors[i % attackColors.length]
        })).sort((a, b) => b.value - a.value);

        sortedStats.forEach(stat => {
          const name = stat.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          html += `
                <div style="display:flex; align-items:center; margin-top:4px; font-size:${labelFontSize}px">
                   <span style="width:8px; height:8px; background:${stat.color}; border-radius:50%; margin-right:6px; display:inline-block;"></span>
                   <span>${name}: ${d3.format(",")(parseInt(stat.value))}</span>
                </div>`;
        });
      }

      const tooltip = d3.select('#attack-tooltip');
      tooltip.html(html).style('opacity', 1);

      // 3. Update Position (Only if real event occurred)
      if (event) {
        const tNode = tooltip.node();
        const tRect = tNode.getBoundingClientRect();

        const offset = 15;
        let left = event.pageX + offset;
        let top = event.pageY - offset;

        if (left + tRect.width > window.innerWidth) left = event.pageX - tRect.width - offset;
        if (top + tRect.height > window.innerHeight) top = event.pageY - tRect.height - offset;
        if (top < 0) top = event.pageY + offset;

        tooltip.style('left', left + 'px').style('top', top + 'px');
      }
    };

    // Attach Listeners to Overlay
    container.select('.interaction-overlay')
      .on('mousemove', updateTooltip)
      .on('touchmove', (e) => {
        e.preventDefault();
        updateTooltip(e.touches[0]);
      })
      .on('mouseleave', hideTooltip);

    // --- Render Lines ---
    container.selectAll('.attack-line')
      .data(series, d => d.type)
      .join(
        enter => {
          return enter.append('path')
            .attr('class', 'attack-line')
            .attr('fill', 'none')
            .attr('stroke', d => d.color)
            .attr('stroke-width', 1.5)
            .attr('stroke-linecap', 'round')
            .style('cursor', 'pointer')
            .on('mousemove', updateTooltip)
            .on('mouseleave', hideTooltip)
            .on('click', function(event, d) {
              if (typeof stopAnimation === 'function') stopAnimation();
              if (typeof showModal === 'function') showModal("attack", d.type);
              event.stopPropagation();
            })
            .attr('d', d => {
              const validPoints = d.values.filter(v => !isNaN(v.value));
              if (validPoints.length === 1) return `M${x(validPoints[0].year)},${y(validPoints[0].value)}h0.1`;
              return lineGen(d.values);
            })
            .attr('opacity', 0)
            .attr('transform', `translate(0, -${RIGHT_CHART_HEIGHT})`)
            .call(enter => enter.transition().duration(transitionDurationMs).ease(d3.easeCubicOut)
              .attr('opacity', 1)
              .attr('transform', 'translate(0, 0)')
            );
        },
        update => {
          update.interrupt();
          update.attr('d', d => {
            const validPoints = d.values.filter(v => !isNaN(v.value));
            if (validPoints.length === 1) return `M${x(validPoints[0].year)},${y(validPoints[0].value)}h0.1`;
            return lineGen(d.values);
          });
          return update
            .attr('transform', 'translate(0, 0)')
            .attr('opacity', 1)
            .style('cursor', 'pointer')
            .on('mousemove', updateTooltip)
            .transition().duration(duration).ease(d3.easeLinear)
            .attr('stroke', d => d.color);
        },
        exit => exit.remove()
      );

    // --- LINE LABELS ---
    const nameLabelData = (!showLegend && !isStart) ? series : [];
    const valueLabelData = (showLegend && !isStart) ? series : [];

    // Join Name Labels (right-side textual names when legend is hidden)
    const labels = container.selectAll('.line-label')
      .data(nameLabelData, d => d.type)
      .join(
        enter => enter.append('text')
          .attr('class', 'line-label new-label')
          .attr('x', rightPadAxis + 10)
          .attr('dy', '0.35em')
          .style('font-family', 'sans-serif')
          .style('font-weight', 'bold')
          .style('font-size', `${preferredSize}px`)
          .attr('fill', d => d.color)
          .attr('opacity', 0)
          .attr('transform', `translate(0, -${RIGHT_CHART_HEIGHT})`)
          .text(d => d.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
          .style('cursor', 'pointer')
          .on('mousemove', updateTooltip)
          .on('mouseleave', hideTooltip)
          .on('click', function(event, d) {
            if (typeof stopAnimation === 'function') stopAnimation();
            if (typeof showModal === 'function') showModal("attack", d.type);
            event.stopPropagation();
          }),
        update => update
          .attr('x', rightPadAxis + 10)
          .attr('fill', d => d.color)
          .style('cursor', 'pointer')
          .on('mousemove', updateTooltip),
        exit => exit.transition().duration(duration).style('opacity', 0).remove()
      );

    // Helper: format edge values as 3-char right-aligned strings
    const formatEdgeValue = (v) => {
      const n = +v || 0;
      let s;
      if (n >= 1000) {
        s = Math.round(n / 1000) + 'K';
      } else {
        s = Math.round(n).toString();
      }
      return s.padStart(3, ' ');
    };

    // Helper: parse displayed value back to numeric
    const parseDisplayedValue = (txt) => {
      if (!txt) return 0;
      const t = txt.trim();
      if (t.endsWith('K')) {
        const k = parseInt(t.slice(0, -1)) || 0;
        return k * 1000;
      }
      return parseInt(t.replace(/,/g, '')) || 0;
    };

    // Join Value Labels (numeric right-side values when legend is shown)
    // Move them further right and remove animated counting — simple rewrite
    const valueLabels = container.selectAll('.line-value-label')
      .data(valueLabelData, d => d.type)
      .join(
        enter => enter.append('text')
          .attr('class', 'line-value-label new-value-label')
          .attr('x', rightPadAxis +15)
          .attr('text-anchor', 'end')
          .style('font-family', 'monospace')
          .attr('dy', '0.35em')
          .style('font-weight', 'bold')
          .style('font-size', `${preferredSize*0.8}px`)
          .attr('fill', d => d.color)
          .attr('opacity', 0)
          .attr('transform', `translate(0, -${RIGHT_CHART_HEIGHT})`)
          .text(formatEdgeValue(0))
          .style('cursor', 'pointer')
          .on('mousemove', updateTooltip)
          .on('mouseleave', hideTooltip)
          .on('click', function(event, d) {
            if (typeof stopAnimation === 'function') stopAnimation();
            if (typeof showModal === 'function') showModal("attack", d.type);
            event.stopPropagation();
          }),
        update => update
          .attr('x', rightPadAxis + 30)
          .attr('text-anchor', 'end')
          .style('font-family', 'monospace')
          .attr('fill', d => d.color)
          .style('cursor', 'pointer')
          .on('mousemove', updateTooltip),
        exit => exit.transition().duration(duration).style('opacity', 0).remove()
      );

    // Label Collision Logic (compute ideal positions from series end values)
    const nodes = [];
    series.forEach(d => {
      const lastVal = d.values[d.values.length - 1];
      const idealY = (lastVal && !isNaN(lastVal.value)) ? y(lastVal.value) : y(0);
      nodes.push({ id: d.type, y: idealY });
    });

    const spacing = labelFontSize * 1.4;
    const maxIterations = 100;
    let collision = true;
    let iter = 0;

    while (collision && iter < maxIterations) {
      collision = false;
      nodes.sort((a, b) => a.y - b.y);
      for (let i = 0; i < nodes.length - 1; i++) {
        const top = nodes[i];
        const bottom = nodes[i + 1];
        if (bottom.y - top.y < spacing) {
          top.y -= 1;
          bottom.y += 1;
          collision = true;
        }
      }
      iter++;
    }

    // Apply Positions to Name Labels
    labels.each(function(d) {
      const el = d3.select(this);
      const node = nodes.find(n => n.id === d.type);
      const finalY = node ? node.y : 0;

      if (el.classed('new-label')) {
        el.attr('y', finalY)
          .transition().duration(transitionDurationMs).ease(d3.easeCubicOut)
          .attr('opacity', 1)
          .attr('transform', 'translate(0, 0)')
          .on('end', () => el.classed('new-label', false));
      } else {
        el.transition().duration(duration).ease(d3.easeLinear)
          .attr('y', finalY)
          .attr('transform', 'translate(0, 0)')
          .style('opacity', 1);
      }
    });

    // Apply Positions and Animated Values to Value Labels
    valueLabels.each(function(d) {
      const el = d3.select(this);
      const node = nodes.find(n => n.id === d.type);
      const finalY = node ? node.y : 0;

      // Determine end numeric value
      const lastVal = d.values[d.values.length - 1];
      const endValue = lastVal && !isNaN(lastVal.value) ? +lastVal.value : 0;

      // No animated counting: simply set final text and transition position/opacity
      const display = formatEdgeValue(endValue);
      if (el.classed('new-value-label')) {
        el.text(display)
          .attr('y', finalY)
          .transition().duration(transitionDurationMs).ease(d3.easeCubicOut)
          .attr('opacity', 1)
          .attr('transform', 'translate(0, 0)')
          .on('end', () => el.classed('new-value-label', false));
      } else {
        el.text(display);
        el.transition().duration(duration).ease(d3.easeLinear)
          .attr('y', finalY)
          .attr('transform', 'translate(0, 0)');
      }
    });

    // --- LEGEND LOGIC (Table-like centered layout, matching target chart) ---
    if (showLegend) {
      const legendFontSize = labelFontSize * (isSmallScreen() ? 0.75 : 1);
      let legendGroup = container.select('.top-legend');
      if (legendGroup.empty()) legendGroup = container.append('g').attr('class', 'top-legend');

      const legendData = attackTypes.map((type, i) => ({
        type: type,
        color: attackColors[i % attackColors.length]
      }));

      // Render items
      const legendItems = legendGroup.selectAll('.legend-item')
        .data(legendData, d => d.type)
        .join(
          enter => {
            const g = enter.append('g')
              .attr('class', 'legend-item new-legend-item')
              .style('cursor', 'pointer')
              .attr('opacity', 0)
              .on('click', function(event, d) {
                stopAnimation();
                showModal("attack", d.type);
                event.stopPropagation();
              })
              .on('mouseover', (e, d) => {/* noop: ribbons handle hover */})
              .on('mouseout', () => {});

            g.append('rect')
              .attr('width', 12).attr('height', 12)
              .attr('y', -6).attr('rx', 2)
              .attr('fill', d => d.color);

            g.append('text')
              .attr('x', 16).attr('y', 0).attr('dy', '0.35em')
              .style('font-family', 'sans-serif')
              .style('font-weight', 'bold')
              .style('font-size', `${legendFontSize}px`)
              .attr('fill', d => d.color)
              .text(d => d.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

            return g;
          },
          update => update.attr('opacity', 1),
          exit => exit.remove()
        );

      // Measure and pack items into minimal rows then render as centered table
      const availW = RIGHT_CHART_WIDTH - 2 * RIGHT_CHART_MARGIN;
      const itemSpacing = 15;
      const lineHeight = legendFontSize + 8;

      // Build width map
      const items = [];
      legendItems.each(function() {
        const el = d3.select(this);
        const w = this.getBBox().width;
        items.push({ element: el, width: w });
      });

      // Greedy pack into minimal number of rows
      const rowsPacked = [];
      let curRow = [];
      let curWidth = 0;
      items.forEach(it => {
        const itemW = it.width + itemSpacing;
        if (curRow.length > 0 && (curWidth + itemW) > availW) {
          rowsPacked.push(curRow);
          curRow = [it];
          curWidth = itemW;
        } else {
          curRow.push(it);
          curWidth += itemW;
        }
      });
      if (curRow.length > 0) rowsPacked.push(curRow);

      const numRows = Math.max(1, rowsPacked.length);
      const totalItems = items.length;
      const numCols = Math.ceil(totalItems / numRows);

      // Distribute items into columns (top-to-bottom)
      const columns = Array.from({ length: numCols }, () => []);
      for (let i = 0; i < totalItems; i++) {
        const col = Math.floor(i / numRows);
        const rowIndex = i % numRows;
        columns[col].push({ item: items[i], rowIndex });
      }

      // Compute column widths and table metrics
      const colWidths = columns.map(col => col.reduce((s, c) => Math.max(s, c.item.width), 0));
      const gap = Math.max(itemSpacing, 8);
      // tableWidth: sum of column widths + gaps between columns
      const tableWidth = colWidths.reduce((s, w) => s + w, 0) + gap * Math.max(0, numCols - 1);
      // startX: center the table within available width (no extra arbitrary offset)
      const startX = RIGHT_CHART_MARGIN + Math.max(0, (availW - tableWidth) / 2);

      // Position items
      columns.forEach((col, colIndex) => {
        let x = startX + colWidths.slice(0, colIndex).reduce((s, w) => s + w + gap, 0);
        col.forEach(({ item, rowIndex }) => {
          const yPos = rowIndex * lineHeight;
          if (item.element.classed('new-legend-item')) {
            item.element.attr('transform', `translate(${x}, ${yPos})`);
          } else {
            if (duration === 0) {
              item.element.attr('transform', `translate(${x}, ${yPos})`);
            } else {
              item.element.transition().duration(duration).attr('transform', `translate(${x}, ${yPos})`);
            }
          }
        });
      });

      // Vertical placement (center within title/legend area)
      const totalBlockHeight = numRows * lineHeight;
      const areaHeight = RIGHT_CHART_MARGIN + MARGIN_TOP;
      const blockStartY = preferredSize * 2 + Math.max(0, (areaHeight - totalBlockHeight) / 2);

      if (duration === 0) {
        legendGroup.attr('transform', `translate(0, ${blockStartY})`);
      } else {
        legendGroup.transition().duration(duration).attr('transform', `translate(0, ${blockStartY})`);
      }

      // Fade in new items
      legendGroup.selectAll('.new-legend-item')
        .transition().duration(transitionDurationMs)
        .attr('opacity', 1)
        .on('end', function() { d3.select(this).classed('new-legend-item', false); });

    } else {
      container.select('.top-legend').remove();
    }

    // --- AUTO UPDATE TOOLTIP ON ANIMATION ---
    if (lastMouseX !== null) {
      updateTooltip();
    }
  };

  // Global override
  stepAnimationRight = (transition = true) => {
    const duration = transition ? playIntervalMs : 0;
    xAxis._updateAxis(0);
    container._updateLines(duration);
  };

  xAxis._updateAxis(playIntervalMs / 2);
  container._updateLines(playIntervalMs);
}

//avoid  duplicated operations by precomputing data
function precompute_attack(rawData) {
  const attackTypes = CATEGORIES.attack;
  const minYear = sliderRange[0];

  // Convert strings to numbers once and sort by year
  const cleanData = rawData.map(d => {
    const year = +d.date;
    const obj = { year: year };
    
    // Pre-calculate max value for this specific year row (optimization for Y-scale)
    let rowMax = 0;
    attackTypes.forEach(type => {
      const val = +d[type] || 0; // Handle missing/NaN
      obj[type] = val;
      if (val > rowMax) rowMax = val;
    });
    obj.rowMax = rowMax;
    
    return obj;
  }).sort((a, b) => a.year - b.year);

  // Store globally
  window._precomputed_attack = {
    data: cleanData,
    minYear: minYear,
    maxYear: cleanData.length > 0 ? cleanData[cleanData.length - 1].year : minYear
  };
}