function right_chart_attack(svg) {
  // Use precomputed data
  const pre = window._precomputed_attack;
  const data = pre.data;
  const attackTypes = CATEGORIES.attack;
  const attackColors = COLORS.attackColors;
  const minYear = 1969; 

  // --- 1. Layout Calculations ---
  leftPadAxis = RIGHT_CHART_MARGIN + 50;

  rightPadAxis = STACKED_LAYOUT_PREFERRED ? 
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

    yGroup.append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(RIGHT_CHART_HEIGHT / 2))
      .attr('y', -75)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', `${labelFontSize * 1.5}px`)
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
        .style('z-index', 9999)
        .style('font-family', 'sans-serif')
        .style('box-shadow', '0 2px 10px rgba(0,0,0,0.5)');
    }
  }

  // --- 2. Update Function ---
  container._updateLines = (duration = 0) => {
    const maxYearNow = +slider.property('value');
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

    const y = d3.scaleLinear()
      .domain([0, yMax])
      .range([RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN, RIGHT_CHART_MARGIN]);

    // Update Overlay Dimensions
    container.select('.interaction-overlay')
        .attr('x', leftPadAxis)
        .attr('y', RIGHT_CHART_MARGIN)
        .attr('width', Math.max(0, rightPadAxis - leftPadAxis))
        .attr('height', RIGHT_CHART_HEIGHT - 2 * RIGHT_CHART_MARGIN);

    // Update Y-Axis
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d3.format(".2s"));
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
      .attr('stroke', COLORS.RIGHT_CHART.axisLine);

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
      values: visibleData.map(d => ({ year: d.year, value: d[type] }))
    }));

    // --- TOOLTIP LOGIC ---
    const hideTooltip = () => {
        container.select('.hover-line').style('opacity', 0);
        d3.select('#attack-tooltip').style('opacity', 0);
    };

    const updateTooltip = (event) => {
        const [mx] = d3.pointer(event, container.node());
        const yearRaw = x.invert(mx);
        let year = Math.round(yearRaw);

        if (year < minYear || year > maxYearNow) {
            hideTooltip();
            return;
        }

        const xPos = x(year);
        container.select('.hover-line')
            .attr('x1', xPos).attr('x2', xPos)
            .attr('y1', RIGHT_CHART_MARGIN).attr('y2', RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN)
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

        const tNode = tooltip.node();
        const tRect = tNode.getBoundingClientRect();
        
        const offset = 15;
        let left = event.pageX + offset;
        let top = event.pageY - offset;

        if (left + tRect.width > window.innerWidth) left = event.pageX - tRect.width - offset;
        if (top + tRect.height > window.innerHeight) top = event.pageY - tRect.height - offset;
        if (top < 0) top = event.pageY + offset;

        tooltip.style('left', left + 'px').style('top', top + 'px');
    };

    // Attach Listeners to Overlay
    container.select('.interaction-overlay')
        .on('mousemove', updateTooltip)
        .on('touchmove', (e) => { e.preventDefault(); updateTooltip(e.touches[0]); })
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
    const labelData = (STACKED_LAYOUT_PREFERRED && !isStart) ? series : [];
    
    // 1. Join Data (Only create/remove, do NOT animate here)
    const labels = container.selectAll('.line-label')
      .data(labelData, d => d.type)
      .join(
        enter => enter.append('text')
            .attr('class', 'line-label new-label') // MARK AS NEW
            .attr('x', rightPadAxis + 10)
            .attr('dy', '0.35em') 
            .style('font-family', 'sans-serif')
            .style('font-weight', 'bold')
            .style('font-size', `${labelFontSize * 1.2}px`)
            .attr('fill', d => d.color)
            // Start from Top
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

    // 2. Collision Resolution
    const nodes = [];
    labels.each(function(d) {
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

    // 3. Apply Positions & Animations (Separately for New vs Old)
    labels.each(function(d) {
        const el = d3.select(this);
        const node = nodes.find(n => n.id === d.type);
        const finalY = node ? node.y : 0;

        if (el.classed('new-label')) {
            // NEW LABELS: Snap Y to correct spot, then slide down from top
            el.attr('y', finalY)
              .transition().duration(transitionDurationMs).ease(d3.easeCubicOut)
              .attr('opacity', 1)
              .attr('transform', 'translate(0, 0)')
              .on('end', () => el.classed('new-label', false));
        } else {
            // EXISTING LABELS: Animate Y position smoothly
            el.transition().duration(duration).ease(d3.easeLinear)
              .attr('y', finalY)
              .attr('transform', 'translate(0, 0)')
              .style('opacity', 1);
        }
    });
  };

  // Global override
  stepAnimationRight = (transition = true) => {
    const duration = transition ? playIntervalMs : 0;
    xAxis._updateAxis(duration); 
    container._updateLines(duration);
  };
}