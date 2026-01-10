window.addEventListener('resize', () => { if (window._draw_group_4_lastCall) draw_group_4(...window._draw_group_4_lastCall); });

function draw_group_4(data, choice, containerId) {
    window._draw_group_4_lastCall = [data, choice, containerId];

    const container = d3.select(`#${containerId}`);
    if (container.empty()) return;

    const svg = container.select('svg');
    if (svg.empty()) return;

    svg.selectAll('*').remove();

    const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize : 10;

    // 1. DATA PREP
    const inputJSON = data[choice];

    if (!inputJSON || !inputJSON.timeline || inputJSON.timeline.length === 0) {
        svg.attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
        svg.append("text")
            .text("No Data")
            .attr("x", CHART_WIDTH / 2)
            .attr("y", CHART_HEIGHT / 2)
            .style("text-anchor", "middle")
            .style("font-size", `${FONT_SIZE}px`)
            .style("fill", COLORS.textPrimary);
        return;
    }

    const timeline = inputJSON.timeline;
    const ribbonPadding = inputJSON.config.ribbonPadding;
    const topTargets = inputJSON.top_targets;
    const timeLabels = timeline.map(d => d.label);

    const categoricalColors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"];
    const colorMap = {};
    topTargets.forEach((target, i) => {
        colorMap[target] = categoricalColors[i % categoricalColors.length];
    });

    // 2. SVG SETUP
    svg
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

    svg.append("rect")
        .attr("width", CHART_WIDTH)
        .attr("height", CHART_HEIGHT)
        .attr("fill", "transparent")
        .on("click", () => resetSelection());

    // 3. SAFE LEGEND CALCULATION 
    const legendGroup = svg.append('g').attr('class', 'legend-group');

    const iconSize = 10;
    const itemGap = 25;
    const rowGap = 5;
    const textPadding = 6;

    const availableLegendWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;

    let currentX = 0;
    let currentY = 0;
    let lineHeight = Math.max(iconSize, FONT_SIZE) + rowGap;

    const measureText = svg.append("text")
        .style("font-size", `${FONT_SIZE}px`)
        .style("font-weight", "bold")
        .style("visibility", "hidden");

    const legendItemsPositions = [];

    topTargets.forEach(key => {
        measureText.text(key);

        let textWidth = measureText.node().getComputedTextLength();
        if (textWidth <= 1) {
            textWidth = key.length * (FONT_SIZE * 0.65);
        }

        const itemWidth = iconSize + textPadding + textWidth;

        if (currentX + itemWidth > availableLegendWidth && currentX > 0) {
            currentX = 0;
            currentY += lineHeight;
        }

        legendItemsPositions.push({
            key: key,
            x: currentX,
            y: currentY,
            width: itemWidth
        });

        currentX += itemWidth + itemGap;
    });

    measureText.remove();

    const totalLegendHeight = currentY + lineHeight + 5;

    legendGroup.attr("transform", `translate(${CHART_MARGIN.left}, ${CHART_MARGIN.top})`);

    legendItemsPositions.forEach(pos => {
        const gItem = legendGroup.append("g")
            .datum(pos.key)
            .attr("class", "legend-item")
            .attr("transform", `translate(${pos.x}, ${pos.y})`)
            .style("cursor", "pointer")
            .on("click", (e) => { e.stopPropagation(); toggleSelection(pos.key); })
            .on("mouseover", () => { if (!activeSeries) updateVisuals(pos.key, true); })
            .on("mouseout", () => { if (!activeSeries) updateVisuals(null); });

        gItem.append("rect")
            .attr("width", iconSize).attr("height", iconSize)
            .attr("y", -1)
            .attr("rx", 2)
            .attr("fill", colorMap[pos.key]);

        gItem.append("text")
            .attr("x", iconSize + textPadding)
            .attr("y", iconSize / 2)
            .attr("dy", "0.35em")
            .style("font-size", `${FONT_SIZE}px`)
            .style("font-weight", "bold")
            .style("fill", COLORS.textPrimary)
            .text(pos.key);
    });

    // 4. CHART DIMENSIONS 
    const chartTopY = CHART_MARGIN.top + totalLegendHeight;
    const chartHeight = CHART_HEIGHT - chartTopY - CHART_MARGIN.bottom;
    const chartWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;

    const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${chartTopY})`);

    // 5. STACK LOGIC
    const maxStack = d3.max(timeline, d => {
        const totalVal = Object.values(d.values).reduce((a, b) => a + b, 0);
        const totalPad = (d.order.length - 1) * ribbonPadding;
        return totalVal + totalPad;
    });

    const seriesData = topTargets.map(key => {
        return {
            key: key,
            values: timeline.map((step, i) => {
                const currentStepValueSum = Object.values(step.values).reduce((a, b) => a + b, 0);
                const currentStepPaddingSum = (step.order.length - 1) * ribbonPadding;
                const currentStackHeight = currentStepValueSum + currentStepPaddingSum;
                const gravityOffset = maxStack - currentStackHeight;

                let yCursor = gravityOffset;
                let myY0 = 0; let myY1 = 0;

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
                    y0: myY0,
                    y1: myY1,
                    val: step.values[key]
                };
            })
        };
    });

    // 6. SCALES
    const x = d3.scalePoint()
        .domain(timeLabels)
        .range([0, chartWidth]);

    const y = d3.scaleLinear()
        .domain([0, maxStack])
        .range([0, chartHeight]);

    const area = d3.area()
        .x(d => x(d.x))
        .y0(d => y(d.y0))
        .y1(d => y(d.y1))
        .curve(d3.curveBumpX);

    // 7. DRAW CHART ELEMENTS

    const verticalLine = g.append("line")
        .attr("y1", 0)
        .attr("y2", chartHeight)
        .attr("stroke", COLORS.axisLine)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 3")
        .style("opacity", 0)
        .style("pointer-events", "none");

    const ribbonGroup = g.append("g");
    let activeSeries = null;

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


    function toggleSelection(key) {
        activeSeries = (activeSeries === key) ? null : key;
        updateVisuals(activeSeries);
    }

    function resetSelection() {
        activeSeries = null;
        updateVisuals(null);
    }

    function updateVisuals(highlightKey, isHover = false) {
        if (!highlightKey) {
            // Reset
            ribbons.transition().duration(200)
                .attr("fill", d => colorMap[d.key])
                .attr("fill-opacity", 0.9)
                .attr("stroke", "white");

            legendGroup.selectAll('.legend-item').transition().duration(200).style("opacity", 1);

            if (!isHover) {
                verticalLine.style("opacity", 0);
                tooltipGroup.style("display", "none");
            }
        } else {
            // Dim Others
            ribbons.transition().duration(200)
                .attr("fill", d => d.key === highlightKey ? colorMap[d.key] : "#e0e0e0")
                .attr("fill-opacity", d => d.key === highlightKey ? 1 : 0.3)
                .attr("stroke", d => d.key === highlightKey ? "#333" : "none");

            ribbons.filter(d => d.key === highlightKey).raise();

            legendGroup.selectAll('.legend-item')
                .transition().duration(200)
                .style("opacity", function () {
                    return d3.select(this).datum() === highlightKey ? 1 : 0.3;
                });
        }
    }

    ribbons
        .on("click", (e, d) => { e.stopPropagation(); toggleSelection(d.key); updateTooltip(e, d.key); })
        .on("mouseover", (e, d) => { if (!activeSeries) { updateVisuals(d.key, true); verticalLine.style("opacity", 1); updateTooltip(e, d.key); } })
        .on("mousemove", (e, d) => { updateTooltip(e, activeSeries || d.key); })
        .on("mouseout", () => { if (!activeSeries) { updateVisuals(null); verticalLine.style("opacity", 0); tooltipGroup.style("display", "none"); } });

    // 8. AXES

    const numTicks = timeLabels.length;
    const availableSpacePerTick = chartWidth / numTicks;
    let axisFontSize = FONT_SIZE;
    if (availableSpacePerTick < 25) axisFontSize = Math.max(8, FONT_SIZE - 2);

    g.selectAll(".axis-label")
        .data(timeLabels)
        .enter()
        .append("text")
        .attr("x", d => x(d))
        .attr("y", chartHeight + 15)
        .style("text-anchor", "middle")
        .style("font-size", `${axisFontSize}px`)
        .style("fill", COLORS.textPrimary)
        .text(d => d.split("-")[0]);

    // 9. TOOLTIP
    function updateTooltip(event, key) {
        if (!key) return;

        const mouseX = d3.pointer(event, g.node())[0];
        const step = x.step();
        let index = Math.round(mouseX / step);
        const domain = x.domain();
        index = Math.max(0, Math.min(index, domain.length - 1));

        const hoveredLabel = domain[index];
        const xPos = x(hoveredLabel);

        const series = seriesData.find(s => s.key === key);
        const dataPoint = series.values[index];

        verticalLine.attr("x1", xPos).attr("x2", xPos).style("opacity", 1);

        const valText = dataPoint ? `${dataPoint.val.toFixed(1)}%` : "0%";
        tooltipText.text(`${hoveredLabel}: ${valText}`);

        const bbox = tooltipText.node().getBBox();
        tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);

        const [mx, my] = d3.pointer(event, svg.node());
        let tx = mx + 10;
        if (tx + bbox.width > CHART_WIDTH) tx = mx - bbox.width - 10;

        tooltipGroup.attr("transform", `translate(${tx}, ${my - 20})`);
        tooltipGroup.style("display", null);
    }

    const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
    const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("stroke-width", 0.5).attr("rx", 2);
    const tooltipText = tooltipGroup.append("text").attr("x", 5).attr("y", 12).style("font-size", `${FONT_SIZE}px`).style("font-weight", "bold").style("fill", "#333");
}