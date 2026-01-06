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
  leftPadAxis = RIGHT_CHART_MARGIN + 50;

  const showLegend = isSmallScreen() || !STACKED_LAYOUT_PREFERRED;
  const MARGIN_TOP = showLegend ? 30 : 0;

  rightPadAxis = !showLegend ?
    RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN - 180 :
    RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN;

  // Ensure container exists
  let container = svg.select('.attacks-container');
  if (container.empty()) {
    container = svg.append('g').attr('class', 'attacks-container');

    // 1. Create Overlay
    container.append('rect')
      .attr('class', 'interaction-overlay')
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');

    // 2. Create Axis Group
    const yGroup = container.append('g')
      .attr('class', 'y-axis-attack')
      .style('font-family', 'sans-serif')
      .attr('opacity', 0)
      .attr('transform', `translate(${leftPadAxis}, -${RIGHT_CHART_HEIGHT})`);

    const preferredSize = labelFontSize * (isSmallScreen() ? 1 : 1.5);
    const availableHeight = RIGHT_CHART_HEIGHT - 2 * RIGHT_CHART_MARGIN;
    const maxFittingSize = availableHeight / 6;
    const finalFontSize = Math.max(10, Math.min(preferredSize, maxFittingSize));

    yGroup.append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('x', -((RIGHT_CHART_HEIGHT + MARGIN_TOP) / 2))
      .attr('y', -70)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', `${finalFontSize}px`)
      .attr('fill', COLORS.RIGHT_CHART.textPrimary)
      .text("Cumulative Attacks");

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

    // Update Y-Axis
    const yAxis = d3.axisLeft(y)
      .ticks(numTicks)
      .tickFormat(d3.format(".2s"));

    const yAxisGroup = container.select('.y-axis-attack');

    if (yAxisGroup.attr('opacity') == 0) {
      yAxisGroup.call(yAxis);
      yAxisGroup.transition().duration(transitionDurationMs).ease(d3.easeCubicOut)
        .attr('opacity', 1)
        .attr('transform', `translate(${leftPadAxis}, 0)`);
    } else {
      yAxisGroup.transition().duration(duration)
        .attr('transform', `translate(${leftPadAxis}, 0)`)
        .attr('opacity', 1)
        .call(yAxis);
    }

    yAxisGroup.selectAll('.tick text')
      .style('font-size', `${labelFontSize}px`)
      .attr('fill', COLORS.RIGHT_CHART.textPrimary);

    yAxisGroup.selectAll('path, line')
      .attr('stroke', COLORS.RIGHT_CHART.axisLine)
      .attr('stroke-width', 2);


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
            .attr('stroke-width', 3)
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
    const labelData = (!showLegend && !isStart) ? series : [];

    // Join Labels
    const labels = container.selectAll('.line-label')
      .data(labelData, d => d.type)
      .join(
        enter => enter.append('text')
        .attr('class', 'line-label new-label')
        .attr('x', rightPadAxis + 10)
        .attr('dy', '0.35em')
        .style('font-family', 'sans-serif')
        .style('font-weight', 'bold')
        .style('font-size', `${labelFontSize * (isSmallScreen() ? 0.75 : 1.2)}px`)
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

    // Label Collision Logic
    const nodes = [];
    labels.each(function(d) {
      const lastVal = d.values[d.values.length - 1];
      const idealY = (lastVal && !isNaN(lastVal.value)) ? y(lastVal.value) : y(0);
      nodes.push({
        id: d.type,
        y: idealY
      });
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

    // Apply Label Positions
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

    // --- LEGEND LOGIC (Full Width Centered - FIXED) ---
    if (showLegend) {
      const legendFontSize = labelFontSize * (isSmallScreen() ? 0.75 : 1);

      let legendGroup = container.select('.top-legend');
      if (legendGroup.empty()) {
        legendGroup = container.append('g').attr('class', 'top-legend');
      }

      const legendData = attackTypes.map((type, i) => ({
        type: type,
        color: attackColors[i % attackColors.length]
      }));

      // 1. Render Items (Create them immediately)
      const legendItems = legendGroup.selectAll('.legend-item')
        .data(legendData, d => d.type)
        .join(
          enter => {
            const g = enter.append('g')
              .attr('class', 'legend-item new-legend-item')
              .style('cursor', 'pointer')
              .attr('opacity', 0) // Start invisible
              .on('click', function(event, d) {
                stopAnimation();
                showModal("attack", d.type);
                event.stopPropagation();
              });

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

      // 2. Calculate Layout Synchronously
      const availableWidth = RIGHT_CHART_WIDTH - 20;
      const itemSpacing = 15;
      const lineHeight = legendFontSize + 8;

      let rows = [];
      let currentRow = {
        width: 0,
        items: []
      };

      // Force bbox calculation
      legendItems.each(function() {
        const g = d3.select(this);
        const w = this.getBBox().width;

        if (currentRow.width + w > availableWidth && currentRow.items.length > 0) {
          rows.push(currentRow);
          currentRow = {
            width: 0,
            items: []
          };
        }
        currentRow.items.push({
          element: g,
          x: currentRow.width
        });
        currentRow.width += w + itemSpacing;
      });
      if (currentRow.items.length > 0) rows.push(currentRow);

      // 3. Apply Positions
      rows.forEach((row, rowIndex) => {
        const actualRowWidth = row.width - itemSpacing;
        const startX = (RIGHT_CHART_WIDTH - actualRowWidth) / 2;

        row.items.forEach(item => {
          if (item.element.classed('new-legend-item')) {
            item.element.attr('transform', `translate(${startX + item.x}, ${rowIndex * lineHeight})`);
          } else {
            if (duration === 0) {
              item.element.attr('transform', `translate(${startX + item.x}, ${rowIndex * lineHeight})`);
            } else {
              item.element.transition().duration(duration)
                .attr('transform', `translate(${startX + item.x}, ${rowIndex * lineHeight})`);
            }
          }
        });
      });

      // 4. Center Vertically
      const totalBlockHeight = rows.length * lineHeight;
      const areaHeight = RIGHT_CHART_MARGIN + MARGIN_TOP;
      const blockStartY = 5 + (areaHeight - totalBlockHeight) / 2;

      if (duration === 0) {
        legendGroup.attr('transform', `translate(0, ${blockStartY})`);
      } else {
        legendGroup.transition().duration(duration)
          .attr('transform', `translate(0, ${blockStartY})`);
      }

      // 5. Fade In New Items (After positioning is set)
      legendGroup.selectAll('.new-legend-item')
        .transition().duration(transitionDurationMs)
        .attr('opacity', 1)
        .on('end', function() {
          d3.select(this).classed('new-legend-item', false);
        });

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