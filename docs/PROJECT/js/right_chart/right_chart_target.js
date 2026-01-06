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
  leftPadAxis = RIGHT_CHART_MARGIN + 60; 

  const showLegend = isSmallScreen() || !STACKED_LAYOUT_PREFERRED;
  const MARGIN_TOP = showLegend ? 30 : 0;
  
  rightPadAxis = !showLegend ? 
        RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN - 180 : 
        RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN; // Original was -180 in example, assuming room for labels

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

  // --- 3. Groups (Order matters) ---
  // 1. Ribbons (Bottom)
  const ribbonsGroup = container.selectChild('g.ribbons-group', 'g').attr('class', 'ribbons-group');
  
  // 2. Labels (Right side) - Create if missing
  const labelsGroup = container.selectChild('g.labels-group', 'g').attr('class', 'labels-group');

  // 3. Axis (Above ribbons)
  let yAxisGroup = container.select('.y-axis-target');
  if (yAxisGroup.empty()) {
    yAxisGroup = container.append('g')
      .attr('class', 'y-axis-target')
      .style('font-family', 'sans-serif')
      .attr('opacity', 0) 
      .attr('transform', `translate(${leftPadAxis}, -${RIGHT_CHART_HEIGHT})`);

    const preferredSize = labelFontSize * (isSmallScreen() ? 1 : 1.5);
    const availableHeight = RIGHT_CHART_HEIGHT - 2*RIGHT_CHART_MARGIN;
    const finalFontSize = Math.max(10, Math.min(preferredSize, availableHeight / 6));

    yAxisGroup.append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('x', -((RIGHT_CHART_HEIGHT + MARGIN_TOP) / 2))
      .attr('y', -80)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', `${finalFontSize}px`)
      .attr('fill', COLORS.RIGHT_CHART.textPrimary)
      .text(`Attack count (${pre.config.binSize} year bins)`);
  }
  yAxisGroup.raise();

  // 4. Overlay & Interaction (Top)
  let overlay = container.select('.interaction-overlay');
  if (overlay.empty()) {
    overlay = container.append('rect')
      .attr('class', 'interaction-overlay')
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');
  }
  overlay.raise();

  // 5. Hover Line
  let hoverLine = container.select('.hover-line');
  if (hoverLine.empty()) {
    hoverLine = container.append('line')
      .attr('class', 'hover-line')
      .attr('stroke', COLORS.RIGHT_CHART.axisLine)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')
      .style('opacity', 0)
      .style('pointer-events', 'none');
  }
  hoverLine.raise();

  if (d3.select('#target-tooltip').empty()) {
      d3.select('body').append('div')
        .attr('id', 'target-tooltip')
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
    
    // Fallback logic
    const visualTimeline = (isStart && slicedTimeline.length === 0 && pre.timeline.length > 0) 
                           ? [pre.timeline[0]] 
                           : slicedTimeline;

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

    // Update Overlay
    overlay
        .attr('x', leftPadAxis)
        .attr('y', RIGHT_CHART_MARGIN + MARGIN_TOP)
        .attr('width', Math.max(0, rightPadAxis - leftPadAxis))
        .attr('height', (RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN) - (RIGHT_CHART_MARGIN + MARGIN_TOP));

    // --- E. Render Y-Axis ---
    const height = (RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN) - (RIGHT_CHART_MARGIN + MARGIN_TOP);
    const minPxPerTick = labelFontSize + 2; 
    const numTicks = Math.max(2, Math.min(5, Math.floor(height / minPxPerTick)));

    const yAxis = d3.axisLeft(y).ticks(numTicks).tickFormat(d3.format(".2s"));

    if (yAxisGroup.attr('opacity') == 0) {
        yAxisGroup.call(yAxis);
        yAxisGroup.transition().duration(transitionDurationMs).ease(d3.easeCubicOut)
            .attr('opacity', 1)
            .attr('transform', `translate(${leftPadAxis}, 0)`);
    } else {
        const t = yAxisGroup.transition().duration(duration).ease(d3.easeLinear);
        t.attr('opacity', 1)
         .attr('transform', `translate(${leftPadAxis}, 0)`)
         .call(yAxis);
    }

    yAxisGroup.selectAll('.tick text')
        .style('font-size', `${labelFontSize}px`)
        .attr('fill', COLORS.RIGHT_CHART.textPrimary);
        
    yAxisGroup.selectAll('path, line')
        .attr('stroke', COLORS.RIGHT_CHART.axisLine)
        .attr('stroke-width', 2);

    // --- F. Prepare Data (Ribbons & Labels) ---
    if (visualTimeline.length === 0) {
        ribbonsGroup.selectAll('*').remove();
        labelsGroup.selectAll('*').remove();
        // Keep going to update legend/tooltip if needed
    }

    const seriesData = (visualTimeline.length === 0) ? [] : KEYS.map(key => {
      let values = visualTimeline.map(step => {
        let yCursor = 0;
        let y0 = 0, y1 = 0;
        const dynamicOrderReversed = [...step.order].reverse();
        dynamicOrderReversed.forEach(k => {
            const val = step.values[k] || 0;
            if (k === key) {
                y0 = yCursor;
                y1 = yCursor + val;
            }
            yCursor += val + ribbonPadding;
        });
        return { x: step.year, y0, y1, val: step.values[key] };
      });

      // Handle Single Point Visual
      if (values.length === 1) {
          const point = values[0];
          const p1 = { ...point, x: minYear }; 
          const p2 = { ...point, x: minYear + 0.1 };
          values = [p1, p2];
      }
      
      // Calculate label Y position (center of last point)
      const lastPoint = values[values.length - 1];
      const labelY = y((lastPoint.y0 + lastPoint.y1) / 2);

      return { key, values, labelY };
    });

    // --- G. Render Ribbons ---
    const area = d3.area()
      .x(d => x(d.x))
      .y0(d => y(d.y0))
      .y1(d => y(d.y1))
      .curve(visualTimeline.length === 1 ? d3.curveLinear : d3.curveBumpX); 

    if (ribbonsGroup.attr('data-init') !== "true") {
         ribbonsGroup.attr('data-init', "true")
                     .attr('opacity', 0)
                     .attr('transform', `translate(0, -${RIGHT_CHART_HEIGHT})`)
                     .attr('opacity', 1)
                     .attr('transform', `translate(0, 0)`);
    } else {
         ribbonsGroup.attr('transform', `translate(0, 0)`);
    }

    ribbonsGroup.selectAll('.ribbon')
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
          .on('click', (e, d) => { // ADDED CLICK LOGIC
              stopAnimation();
              showModal("target", d.key);
              e.stopPropagation();
          }),
        update => {
            update.interrupt();
            update
                .attr('d', d => area(d.values))
                .attr('fill', d => colorMap[d.key]);
            return update;
        },
        exit => exit.remove()
      );

    // --- H. Render Labels (Right Side) ---
    // Only if legend is hidden (stacked layout preferred)
    if (!showLegend && seriesData.length > 0) {
        labelsGroup.attr('transform', `translate(0, 0)`);
        
        // 1. Prepare Label Nodes
        let labelNodes = seriesData.map(d => ({
            key: d.key,
            y: d.labelY, // Calculated above
            color: colorMap[d.key],
            text: d.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        })).sort((a, b) => a.y - b.y); // Sort by Y for collision

        // 2. Collision Detection (Simple Iterative)
        const spacing = labelFontSize; // px
        for (let iter = 0; iter < 5; iter++) {
            for (let i = 1; i < labelNodes.length; i++) {
                if (labelNodes[i].y - labelNodes[i-1].y < spacing) {
                    labelNodes[i].y = labelNodes[i-1].y + spacing;
                }
            }
        }

        // 3. Render
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
                    .on('click', (e, d) => { // ADDED CLICK LOGIC
                        if (typeof stopAnimation === 'function') stopAnimation();
                        if (typeof showModal === 'function') showModal("target", d.key);
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

    // --- I. Tooltip Logic ---
    const hideTooltip = () => {
       container.select('.hover-line').style('opacity', 0);
       d3.select('#target-tooltip').style('opacity', 0);
    };

    const updateTooltip = (event) => {
       const [mx] = d3.pointer(event, container.node());
       const yearRaw = x.invert(mx);
       let year = Math.round(yearRaw);

       if (year < minYear || year > maxYearNow) {
           hideTooltip();
           return;
       }

       const step = visualTimeline.find(s => Math.abs(s.year - year) < (pre.config.binSize / 2 + 0.1)) 
                    || visualTimeline[visualTimeline.length - 1]; 

       if (!step) { hideTooltip(); return; }
       
       const xPos = x(step.year);
       hoverLine.attr('x1', xPos).attr('x2', xPos)
                .attr('y1', RIGHT_CHART_MARGIN + MARGIN_TOP)
                .attr('y2', RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN)
                .style('opacity', 1);

       let html = `<strong style="font-size:${labelFontSize}px">Years: ${step.year-pre.config.binSize+1}-${step.year}</strong><br/>`;
       
       const sortedStats = KEYS.map(key => ({
           name: key,
           value: step.values[key] || 0,
           color: colorMap[key]
       })).sort((a, b) => b.value - a.value);

       sortedStats.forEach(stat => {
           const name = stat.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
           html += `
           <div style="display:flex; align-items:center; margin-top:4px; font-size:${labelFontSize}px">
              <span style="width:8px; height:8px; background:${stat.color}; border-radius:50%; margin-right:6px; display:inline-block;"></span>
              <span>${name}: ${d3.format(",")(parseInt(stat.value))}</span>
           </div>`;
       });

       const tooltip = d3.select('#target-tooltip');
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

    overlay
       .on('mousemove', updateTooltip)
       .on('touchmove', (e) => { e.preventDefault(); updateTooltip(e.touches[0]); })
       .on('mouseleave', hideTooltip)
       .on('click', () => { if(typeof stopAnimation === 'function') stopAnimation(); });


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
                  stopAnimation();
                  showModal("target", d.type);
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

      const availableWidth = RIGHT_CHART_WIDTH - 20; 
      const itemSpacing = 15;
      const lineHeight = legendFontSize + 8; 
      
      let rows = [];
      let currentRow = { width: 0, items: [] };

      legendItems.each(function() {
         const g = d3.select(this);
         const w = this.getBBox().width;
         if (currentRow.width + w > availableWidth && currentRow.items.length > 0) {
            rows.push(currentRow);
            currentRow = { width: 0, items: [] };
         }
         currentRow.items.push({ element: g, x: currentRow.width });
         currentRow.width += w + itemSpacing;
      });
      if (currentRow.items.length > 0) rows.push(currentRow);

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

      const totalBlockHeight = rows.length * lineHeight;
      const areaHeight = RIGHT_CHART_MARGIN + MARGIN_TOP; 
      const blockStartY = 5 + (areaHeight - totalBlockHeight) / 2;
      
      if (duration === 0) {
         legendGroup.attr('transform', `translate(0, ${blockStartY})`);
      } else {
         legendGroup.transition().duration(duration).attr('transform', `translate(0, ${blockStartY})`);
      }

      legendGroup.selectAll('.new-legend-item')
        .transition().duration(transitionDurationMs)
        .attr('opacity', 1)
        .on('end', function() { d3.select(this).classed('new-legend-item', false); });

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

    xAxis._updateAxis(playIntervalMs/2); 
    container._updateBump(playIntervalMs);
}