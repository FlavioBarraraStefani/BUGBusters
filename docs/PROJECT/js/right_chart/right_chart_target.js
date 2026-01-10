function right_chart_target(svg) {
  // --- Constants & Config ---
  const pre = window._precomputed_target;
  const KEYS = pre.keys;
  const ribbonPadding = pre.config.ribbonPadding || 10;

  // Define Colors
  const colorMap = {};
  KEYS.forEach((key, i) => {
    colorMap[key] = COLORS.targetColors[i];
  });

  // --- 1. Layout Calculations ---
  // initial fallback; will be set properly after computing legend rows

  // Use same preferredSize logic as attack chart and precompute legend rows
  const preferredSize = labelFontSize * (isSmallScreen() ? 1 : 1.2);
  const showLegend = isSmallScreen() || (!STACKED_LAYOUT_PREFERRED && !isXLScreen());

  const legendFontSize = labelFontSize * (isSmallScreen() ? 1 : 1.5);
  let legend_rows = 0;
  if (showLegend) {
    const availableWidth = RIGHT_CHART_WIDTH - 2* RIGHT_CHART_MARGIN;
    const itemSpacingEstimate = 15;
    let currentRowWidth = 0;
    legend_rows = 1;
    KEYS.forEach(type => {
      const label = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const approxLabelWidth = label.length * (legendFontSize * 0.6);
      const approxItemWidth = 12 + 6 + approxLabelWidth + 8;
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
    leftPadAxis = RIGHT_CHART_MARGIN +25;
    rightPadAxis = RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN;
  } else {
    leftPadAxis = RIGHT_CHART_MARGIN +25;
    rightPadAxis = RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN - 100;
  }

  // --- 2. Container Setup ---
  let container = svg.select('.targets-container');
  if (container.empty()) {
    container = svg.append('g').attr('class', 'targets-container');
  }

  // Helper Definition
  container.selectChild = function(selector, type) {
    let el = this.select(selector);
    if (el.empty()) el = this.append(type);
    return el;
  };

  // --- 3. Groups (Order matters for Z-index) ---

  // A. Overlay (Bottom - Catch background clicks to reset)
  let overlay = container.select('.interaction-overlay');
  if (overlay.empty()) {
    overlay = container.append('rect')
      .attr('class', 'interaction-overlay')
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');
  }

  // B. Ribbons (Above Overlay)
  const ribbonsGroup = container.selectChild('g.ribbons-group', 'g').attr('class', 'ribbons-group');

  // C. Labels (Above Ribbons)
  const labelsGroup = container.selectChild('g.labels-group', 'g').attr('class', 'labels-group');

  // D. Axis (Above everything for readability)
  // Y axis removed — thresholds (dotted lines) will be used as reference lines

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
          .text("Targets of Attack Over Time (5-year bins)")
          .style('opacity', 0)
          .attr('transform', `translate(0, -${RIGHT_CHART_HEIGHT})`);
  
        title.transition()
          .duration(transitionDurationMs)
          .ease(d3.easeCubicOut)
          .style('opacity', 1)
          .attr('transform', 'translate(0, 0)');
      }

  // --- FORCE Z-INDEX ORDER ---
  overlay.lower();
  ribbonsGroup.raise();
  labelsGroup.raise();

  // --- Helper: Get Stack Height ---
  const getStackHeight = (step) => {
    if (!step) return 0;
    const totalVal = Object.values(step.values).reduce((a, b) => a + b, 0);
    const totalPad = (step.order.length - 1) * ribbonPadding;
    return totalVal + totalPad;
  };

  // --- 4. Core Update Function ---
  container._updateBump = (duration = 0) => {
    // A. Read State
    const maxYearNow = +slider.property('value');
    const minYear = sliderRange[0];
    const isStart = maxYearNow === minYear;

    // B. Slice Data
    const slicedTimeline = pre.timeline.filter(d => d.year <= maxYearNow);

    // Fallback for visual rendering
    const visualTimeline = (isStart && slicedTimeline.length === 0 && pre.timeline.length > 0) ?
      [pre.timeline[0]] :
      slicedTimeline;

    // C. Scales
    const xEnd = (visualTimeline.length === 1) ? minYear + 0.1 : maxYearNow;
    const x = d3.scaleLinear()
      .domain([minYear, xEnd])
      .range([leftPadAxis, rightPadAxis]);

    // D. Y-Axis Scale
    const firstBinMax = (pre.timeline.length > 0) ? getStackHeight(pre.timeline[0]) : 100;
    const currentMaxStack = isStart ? firstBinMax : (d3.max(slicedTimeline, getStackHeight) || firstBinMax);
    const yMax = currentMaxStack * 1.05;

    const y = d3.scaleLinear()
      .domain([0, yMax])
      .range([RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN, RIGHT_CHART_MARGIN + MARGIN_TOP]);

    // Update Overlay Dimensions
    overlay
      .attr('x', leftPadAxis)
      .attr('y', RIGHT_CHART_MARGIN + MARGIN_TOP)
      .attr('width', Math.max(0, rightPadAxis - leftPadAxis))
      .attr('height', (RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN) - (RIGHT_CHART_MARGIN + MARGIN_TOP));

    // Y axis removed: ensure it's not present
    container.selectAll('.y-axis-target').remove();

    // --- HORIZONTAL THRESHOLD LINES ---
    // thresholds for targets chart
    const thresholds = [1000, 2000, 5000, 10000, 25000, 50000];
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
            .attr('x1', RIGHT_CHART_MARGIN+10)
            .attr('x2', rightPadAxis)
            .attr('y1', d => y(d))
            .attr('y2', d => y(d))
            .attr('stroke', COLORS.RIGHT_CHART.axisLine || '#888')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3')
            .style('opacity', 0.12);

          g.append('text')
            .attr('class', 'threshold-label')
            .attr('x', RIGHT_CHART_MARGIN-5)
            .attr('text-anchor', 'start')
            .attr('y', d => y(d)-preferredSize/2)
            .attr('dy', '0.35em')
            .style('font-size', `${preferredSize * 0.8}px`)
            .attr('fill', COLORS.defaultComparison)
            .style('opacity', 1)
            .text(d => String(d));
        })
        .transition().duration(transitionDurationMs).attr('opacity', 1),
      update => update.call(g => {
        g.select('line').transition().duration(duration)
          .attr('x1', RIGHT_CHART_MARGIN+10).attr('x2', rightPadAxis)
          .attr('y1', d => y(d)).attr('y2', d => y(d));
        g.select('text').transition().duration(duration)
          .attr('x', RIGHT_CHART_MARGIN-5).attr('y', d => y(d)-preferredSize/2);
      }),
      exit => exit.transition().duration(duration).style('opacity', 0).remove()
    );

    // Ensure thresholds sit behind ribbons and labels
    container.selectAll('.threshold-group').lower();

    // --- F. Prepare Data (Ribbons & Labels) ---
    if (visualTimeline.length === 0) {
      ribbonsGroup.selectAll('*').remove();
      labelsGroup.selectAll('*').remove();
    }

    const seriesData = (visualTimeline.length === 0) ? [] : KEYS.map(key => {
      let values = visualTimeline.map(step => {
        let yCursor = 0;
        let y0 = 0,
          y1 = 0;
        const dynamicOrderReversed = [...step.order].reverse();
        dynamicOrderReversed.forEach(k => {
          const val = step.values[k] || 0;
          if (k === key) {
            y0 = yCursor;
            y1 = yCursor + val;
          }
          yCursor += val + ribbonPadding;
        });
        return {
          x: step.year,
          y0,
          y1,
          val: step.values[key]
        };
      });

      if (values.length === 1) {
        const point = values[0];
        const p1 = { ...point, x: minYear };
        const p2 = { ...point, x: minYear + 0.1 };
        values = [p1, p2];
      }

      const lastPoint = values[values.length - 1];
      const labelY = y((lastPoint.y0 + lastPoint.y1) / 2);

      return { key, values, labelY };
    });

    // --- G. Render Ribbons ---
    const area = d3.area()
      .x(d => x(d.x))
      .y0(d => y(d.y0)-3)
      .y1(d => y(d.y1)-3)
      .curve(visualTimeline.length === 1 ? d3.curveLinear : d3.curveBumpX);

    if (ribbonsGroup.attr('data-init') !== "true") {
      ribbonsGroup.attr('data-init', "true")
        .attr('opacity', 0)
        .attr('transform', `translate(0, -${RIGHT_CHART_HEIGHT})`)
        .transition().duration(transitionDurationMs).ease(d3.easeCubicOut)
        .attr('opacity', 1)
        .attr('transform', `translate(0, 0)`);
    } else {
      ribbonsGroup.attr('transform', `translate(0, 0)`);
    }

    // --- VISUAL UPDATE HELPER ---
    function updateVisuals(highlightKey, isHover = false) {
      const ribbons = ribbonsGroup.selectAll('.ribbon');
      const labels = labelsGroup.selectAll('.bump-label');

      if (!highlightKey) {
        // RESET ALL
        ribbons.transition().duration(200)
          .attr("fill", d => colorMap[d.key])
          .attr("fill-opacity", 0.85)
          .attr("stroke", "white")
          .attr("stroke-width", 0.5);

        labels.style("opacity", 1);
      } else {
        // DIM OTHERS
        ribbons.transition().duration(200)
          .attr("fill", d => d.key === highlightKey ? colorMap[d.key] : "#ccc")
          .attr("fill-opacity", d => d.key === highlightKey ? 1 : 0.3)
          .attr("stroke", d => d.key === highlightKey ? "#333" : "none")
          .attr("stroke-width", d => d.key === highlightKey ? 1 : 0);

        ribbons.filter(d => d.key === highlightKey).raise();
        labels.style("opacity", d => d.key === highlightKey ? 1 : 0.3);
      }
    }

    // Apply Overlay Logic (Resets on click/hover)
    overlay
      .on('mousemove', () => updateVisuals(null))
      .on('click', () => {
        if (typeof stopAnimation === 'function') stopAnimation();
        updateVisuals(null);
      });

    // --- APPLY RIBBONS ---
    const ribbons = ribbonsGroup.selectAll('.ribbon')
      .data(seriesData, d => d.key)
      .join(
        enter => enter.append('path')
        .attr('class', 'ribbon')
        .attr('fill', d => colorMap[d.key])
        .attr('stroke', '#fff').attr('stroke-width', 0.5)
        .attr('fill-opacity', 0.85)
        .attr('d', d => area(d.values))
        .style('opacity', 1)
        .style('cursor', 'pointer')
        // --- RIBBON INTERACTION ---
        .on('mouseover', (e, d) => updateVisuals(d.key, true))
        .on('mouseout', () => updateVisuals(null))
        .on('click', (e, d) => {
          if (typeof stopAnimation === 'function') stopAnimation();
          if (typeof showModal === 'function') showModal("target", d.key);
          e.stopPropagation();
        }),

        update => {
          update.interrupt();
          update.attr('d', d => area(d.values))
            .attr('fill', d => colorMap[d.key]);
          return update;
        },
        exit => exit.remove()
      );

    // --- H. Render Labels ---
    if (!showLegend && seriesData.length > 0) {
      labelsGroup.attr('transform', `translate(0, 0)`);

      let labelNodes = seriesData.map(d => ({
        key: d.key,
        y: d.labelY,
        color: colorMap[d.key],
        text: d.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      })).sort((a, b) => a.y - b.y);

      const spacing = 12;
      for (let iter = 0; iter < 5; iter++) {
        for (let i = 1; i < labelNodes.length; i++) {
          if (labelNodes[i].y - labelNodes[i - 1].y < spacing) {
            labelNodes[i].y = labelNodes[i - 1].y + spacing;
          }
        }
      }

      labelsGroup.selectAll('.bump-label')
        .data(labelNodes, d => d.key)
        .join(
          enter => enter.append('text')
          .attr('class', 'bump-label')
          .attr('x', rightPadAxis + 5)
          .attr('y', d => d.y)
          .attr('dy', '0.35em')
          .text(d => d.text)
          .style('font-family', 'sans-serif')
          .style('font-size', `${labelFontSize}px`)
          .style('font-weight', 'bold')
          .style('fill', d => d.color)
          .style('opacity', 0)
          .style('cursor', 'pointer')
          .on('mouseover', (e, d) => updateVisuals(d.key, true))
          .on('mouseout', () => updateVisuals(null))
          .on('click', (e, d) => {
            stopAnimation();
            showModal("target", d.key);
            e.stopPropagation();
          })
          .call(e => e.transition().duration(transitionDurationMs).style('opacity', 1)),

          update => update.text(d => d.text)
          .transition().duration(duration/3*2).ease(d3.easeLinear)
          .attr('x', rightPadAxis + 5)
          .attr('y', d => d.y)
          .style('fill', d => d.color)
          .style('opacity', 1),

          exit => exit.remove()
        );
    } else {
      labelsGroup.selectAll('*').remove();
    }

    // --- J. Legend Logic ---
    if (showLegend) {
      const legendFontSize = labelFontSize * (isSmallScreen() ? 0.75 : 1);
      let legendGroup = container.select('.top-legend');
      if (legendGroup.empty()) {
        legendGroup = container.append('g').attr('class', 'top-legend');
      }

      const legendData = KEYS.map((type, i) => ({
        type: type,
        color: colorMap[type]
      }));

      const legendItems = legendGroup.selectAll('.legend-item')
        .data(legendData, d => d.type)
        .join(
          enter => {
            const g = enter.append('g')
              .attr('class', 'legend-item new-legend-item')
              .style('cursor', 'pointer')
              .attr('opacity', 0)
              .on('click', function(event, d) {
                if (typeof stopAnimation === 'function') stopAnimation();
                if (typeof showModal === 'function') showModal("target", d.type);
                event.stopPropagation();
              })
              .on('mouseover', (e, d) => updateVisuals(d.type, true))
              .on('mouseout', () => updateVisuals(null));

            g.append('rect')
              .attr('width', 12).attr('height', 12)
              .attr('y', -6).attr('rx', 2)
              .attr('fill', d => d.color);

            g.append('text')
              .attr('x', 16).attr('y', 0).attr('dy', '0.35em')
              .style('font-family', 'sans-serif')
              .style('font-weight', 'bold')
              .style('font-size', `${legendFontSize}px`)
              .attr('fill', COLORS.RIGHT_CHART.textPrimary)
              .text(d => d.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

            return g;
          },
          update => update.attr('opacity', 1),
          exit => exit.remove()
        );

      const availableWidth = RIGHT_CHART_WIDTH - 20;
      const itemSpacing = 15;
      const lineHeight = legendFontSize + 8;

      // Build an array of legend item elements and widths
      const items = [];
      legendItems.each(function() {
        const el = d3.select(this);
        const w = this.getBBox().width;
        items.push({ element: el, width: w });
      });

      // Greedy pack into the minimal number of rows given availableWidth
      const availW = RIGHT_CHART_WIDTH - 2 * RIGHT_CHART_MARGIN;
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

      // Distribute items into columns (top-to-bottom, left-to-right)
      const columns = Array.from({ length: numCols }, () => []);
      let ci = 0;
      for (let i = 0; i < totalItems; i++) {
        const col = Math.floor(i / numRows);
        const rowIndex = i % numRows;
        columns[col].push({ item: items[i], rowIndex });
      }

      // Compute column widths
      const colWidths = columns.map(col => col.reduce((s, c) => Math.max(s, c.item.width), 0));
      const gap = Math.max(itemSpacing, 8);
      const tableWidth = colWidths.reduce((s, w) => s + w, 0) + gap * (numCols + 1);
      const startX = RIGHT_CHART_MARGIN + Math.max(0, (availW - tableWidth) / 2) + gap;

      // Position items: x based on column, y based on rowIndex
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

      // Build rows array for height calculation
      rows = Array.from({ length: numRows }, (_, i) => ({ items: [] }));

      const totalBlockHeight = rows.length * lineHeight;
      const areaHeight = RIGHT_CHART_MARGIN + MARGIN_TOP;
      const blockStartY = preferredSize * 2 + Math.max(0, (areaHeight - totalBlockHeight) / 2);

      if (duration === 0) {
        legendGroup.attr('transform', `translate(0, ${blockStartY})`);
      } else {
        legendGroup.transition().duration(duration).attr('transform', `translate(0, ${blockStartY})`);
      }

      legendGroup.selectAll('.new-legend-item')
        .transition().duration(transitionDurationMs)
        .attr('opacity', 1)
        .on('end', function() {
          d3.select(this).classed('new-legend-item', false);
        });

    } else {
      container.select('.top-legend').remove();
    }
  };

  // 4. Trigger
  stepAnimationRight = (transition = true) => {
    const duration = transition ? playIntervalMs : 0;
    xAxis._updateAxis(0);
    container._updateBump(duration);
  }

  // Initial Draw
  xAxis._updateAxis(playIntervalMs / 2);
  container._updateBump(playIntervalMs);
}

function precompute_target(raw) {  
  if (!raw || !raw.timeline) {
    console.error("Target data missing");
    window._precomputed_target = { timeline: [], lookup: {} };
    return;
  }

  // Create a quick lookup map by year for O(1) access
  const lookup = {};
  raw.timeline.forEach((item, index) => {
    lookup[item.year] = index;
  });

  window._precomputed_target = {
    config: raw.config,
    keys: raw.target_keys,
    timeline: raw.timeline,
    lookup: lookup
  };
}