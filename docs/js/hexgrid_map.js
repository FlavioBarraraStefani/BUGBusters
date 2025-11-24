/*function drawHexgridMap(rawData) {
    (async function () {
        const tooltip = d3.select("#hexgrid_map_tooltip");
        const chartContainer = d3.select("#hexgrid_map_svg");
        const legendContainer = d3.select("#hexgrid_map_legend");

        chartContainer.selectAll("*").remove();
        legendContainer.selectAll("*").remove();
        tooltip.style("opacity", 0);

        if (!Array.isArray(rawData) || rawData.length === 0) {
            console.warn("[drawHexgridMap] empty data");
            return;
        }

        const data = rawData
            .map(d => ({lat: +d.lt, lon: +d.lg, kill: +d.k }))
            .filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));

        if (data.length === 0) {
            console.warn("[drawHexgridMap] no valid lat/lon rows");
            return;
        }


        // --- Load Afghanistan GeoJSON ---
        let afgFeature;
        try { afgFeature = await d3.json("assets/afghanistan.json"); }
        catch (err) { console.error("[drawHexgridMap] Cannot load Afghanistan GeoJSON", err); return; }

        // --- Dimensions ---
        const node = chartContainer.node();
        const width = node.getBoundingClientRect().width || 900;
        const height = Math.max(420, Math.round(width * 0.6));

        const svg = chartContainer.append("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("preserveAspectRatio", "xMidYMid meet");

        const mapLayer = svg.append("g").attr("class", "map-layer");
        const hexOverlay = svg.append("g").attr("class", "hex-overlay");

        // --- Projection & path ---
        const projection = d3.geoNaturalEarth1().fitSize([width, height], afgFeature);
        const geoPath = d3.geoPath(projection);

        // --- Draw Afghanistan ---
        const baseMapG = mapLayer.append("g").attr("class", "basemap");
        baseMapG.append("path")
            .datum(afgFeature)
            .attr("d", geoPath)
            .attr("fill", "#f3f4f6")
            .attr("stroke", "#cbd5e1")
            .attr("stroke-width", 0.6);

        // --- Project points ---
        const projected = data.map(d => {
            const [x, y] = projection([d.lon, d.lat]);
            return { x, y, lat: d.lat, lon: d.lon };
        }).filter(d => isFinite(d.x) && isFinite(d.y));

        if (projected.length === 0) { console.warn("[drawHexgridMap] no projected points"); return; }

        const baseHexRadius = 20;
        const hex = d3.hexbin().radius(baseHexRadius).extent([[0, 0], [width, height]]);

        // Original points array (for applying zoom transform)
        const originalPoints = projected.map(p => [p.x, p.y, p]);

        // --- Compute bins ---
        function computeBins(pointsForHex) {
            const bins = hex(pointsForHex);
            bins.forEach(b => b.count = b.length);
            return bins;
        }

        let bins = computeBins(originalPoints);

        // --- Color scale ---
        const maxCount = d3.max(bins, b => b.count) || 1;
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxCount]);

        // --- Draw hexes (pre-create) ---
        const hexG = hexOverlay.append("g").attr("class", "hexbins");
        const hexPaths = hexG.selectAll("path.hexbin-cell")
            .data(bins)
            .enter()
            .append("path")
            .attr("class", "hexbin-cell")
            .attr("d", hex.hexagon())
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .attr("fill", d => colorScale(d.count))
            .attr("fill-opacity", 0.9)
            .attr("stroke", "#1f2937")
            .attr("stroke-width", 0.35)
            .style("pointer-events", "none")
            .attr("opacity", 0)
            .transition()
            .duration(350)
            .attr("opacity", 1)
            .on("end", function () { d3.select(this).style("pointer-events", "auto"); });

        // --- Tooltip ---
        const fmt = d3.format(",");
        hexG.selectAll("path.hexbin-cell")
            .on("mouseenter", function (event, d) {
                hexG.selectAll("path.hexbin-cell").classed("dimmed", b => b !== d);
                d3.select(this).raise();
                tooltip.transition().duration(120).style("opacity", 0.95);
                tooltip.html(`<div style="padding:6px 8px; font-size:13px;">
                    <div style="font-weight:600; margin-bottom:4px;">${fmt(d.count)} events</div>
                </div>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseleave", function () {
                tooltip.transition().duration(150).style("opacity", 0);
                hexG.selectAll("path.hexbin-cell").classed("dimmed", false);
            });

        // --- Legend ---
        const legendWrapper = legendContainer
            .style("display", "flex")
            .style("justify-content", "center")
            .style("gap", "12px")
            .style("margin-top", "10px")
            .style("align-items", "center");

        const nBuckets = 5;
        const thresholds = [];
        for (let i = 1; i <= nBuckets; i++) {
            thresholds.push(Math.round(d3.quantile(bins.map(b => b.count).sort(d3.ascending), i / (nBuckets + 1)) || 0));
        }
        const uniqThresholds = Array.from(new Set(thresholds)).filter(v => v > 0);
        const legendValues = uniqThresholds.length ? uniqThresholds : [Math.round(maxCount / 3), Math.round(maxCount / 2), maxCount];

        legendValues.forEach(v => {
            const sw = legendWrapper.append("div").attr("class", "legend-swatch");
            sw.append("div").attr("class", "box").style("background", colorScale(v));
            sw.append("div").attr("class", "legend-label").text(`${fmt(v)} events`);
        });

        legendWrapper.append("div")
            .attr("class", "legend-swatch")
            .style("margin-left", "8px")
            .append("div")
            .attr("class", "legend-label")
            .text("Hex radius = " + baseHexRadius + "px");

        // --- Zoom & pan (fast) ---
        let lastZoomTime = 0;
        const zoomThrottle = 50; // ms

        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                const now = Date.now();
                if (now - lastZoomTime < zoomThrottle) return;
                lastZoomTime = now;

                // transform map layer
                mapLayer.attr("transform", event.transform);
                baseMapG.selectAll("path").attr("stroke-width", 0.6 / event.transform.k);

                // transformed points for hex aggregation
                const transformedPoints = originalPoints.map(pt => {
                    const t = event.transform.apply([pt[0], pt[1]]);
                    return [t[0], t[1], pt[2]];
                });
                bins = computeBins(transformedPoints);

                // update color scale domain
                const newMax = d3.max(bins, b => b.count) || 1;
                colorScale.domain([0, newMax]);

                // update hexes only (reuse DOM elements)
                hexG.selectAll("path.hexbin-cell")
                    .data(bins)
                    .attr("transform", d => `translate(${d.x},${d.y})`)
                    .attr("fill", d => colorScale(d.count))
                    .attr("stroke-width", 0.35 / event.transform.k);
            });

        svg.call(zoom);

    })();
}

*/

function drawHexgridMap(rawData) {
        (async function () {
            const tooltip = d3.select("#hexgrid_map_tooltip");
            const chartContainer = d3.select("#hexgrid_map_svg");
            const legendContainer = d3.select("#hexgrid_map_legend");

            chartContainer.selectAll("*").remove();
            legendContainer.selectAll("*").remove();
            tooltip.style("opacity", 0);

            if (!Array.isArray(rawData) || rawData.length === 0) {
                console.warn("[drawScatterMap] empty data");
                return;
            }

            // --- Parse data ---
            const data = rawData
                .map(d => ({
                    lat: +d.lt,
                    lon: +d.lg,
                    kill: Math.max(+d.k, 0)
                }))
                .filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));

            if (data.length === 0) {
                console.warn("[drawScatterMap] no valid lat/lon rows");
                return;
            }

            // --- Load Afghanistan GeoJSON ---
            let afgFeature;
            try { afgFeature = await d3.json("assets/afghanistan.json"); }
            catch (err) { console.error("[drawScatterMap] Cannot load Afghanistan GeoJSON", err); return; }

            // --- Dimensions ---
            const node = chartContainer.node();
            const width = node.getBoundingClientRect().width || 900;
            const height = Math.max(420, Math.round(width * 0.6));

            const svg = chartContainer.append("svg")
                .attr("viewBox", [0, 0, width, height])
                .attr("preserveAspectRatio", "xMidYMid meet");

            const mapLayer = svg.append("g").attr("class", "map-layer");
            const pointsLayer = svg.append("g").attr("class", "points-layer");

            // --- Projection & path ---
            const projection = d3.geoNaturalEarth1().fitSize([width, height], afgFeature);
            const geoPath = d3.geoPath(projection);

            // --- Draw Afghanistan ---
            mapLayer.append("path")
                .datum(afgFeature)
                .attr("d", geoPath)
                .attr("fill", "#f3f4f6")
                .attr("stroke", "#cbd5e1")
                .attr("stroke-width", 0.6);

            // --- Scale for kills (radius) ---
            const maxKill = d3.max(data, d => d.kill) || 1;
            const rScale = d3.scaleSqrt()
                .domain([0, maxKill])
                .range([2, 25]); // bigger radius for visibility

            // --- Draw points ---
            const circles = pointsLayer.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", d => projection([d.lon, d.lat])[0])
                .attr("cy", d => projection([d.lon, d.lat])[1])
                .attr("r", d => rScale(d.kill))
                .attr("fill", "none")
                .attr("stroke", "#f87171")
                .attr("stroke-width", 1.2)
                .attr("opacity", 0)
                .transition()
                .duration(350)
                .attr("opacity", 0.9);

            // --- Tooltip ---
            const fmt = d3.format(",");
            circles.on("mouseover", function (event, d) {
                d3.select(this).raise();
                tooltip.transition().duration(120).style("opacity", 0.95);
                tooltip.html(`
                    <div style="padding:6px 8px; font-size:13px;">
                        <div style="font-weight:600; margin-bottom:4px;">${fmt(d.kill)} killed</div>
                        <div><b>Lat:</b> ${d.lat.toFixed(4)}</div>
                        <div><b>Lon:</b> ${d.lon.toFixed(4)}</div>
                    </div>
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
                .on("mousemove", function (event) {
                    tooltip.style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", function () {
                    tooltip.transition().duration(150).style("opacity", 0);
                });

            // --- Legend (optional) ---
            const legendWrapper = legendContainer
                .style("display", "flex")
                .style("justify-content", "center")
                .style("gap", "12px")
                .style("margin-top", "10px")
                .style("align-items", "center");

            const legendValues = [1, Math.round(maxKill / 2), maxKill];
            legendValues.forEach(v => {
                const sw = legendWrapper.append("div").attr("class", "legend-swatch");
                sw.append("div")
                    .attr("class", "circle-box")
                    .style("width", `${rScale(v) * 2}px`)
                    .style("height", `${rScale(v) * 2}px`)
                    .style("border-radius", "50%")
                    .style("border", "1.2px solid #f87171")
                    .style("background", "none");
                sw.append("div")
                    .attr("class", "legend-label")
                    .text(`${fmt(v)} killed`);
            });

            // --- Zoom & pan ---
            const zoom = d3.zoom()
                .scaleExtent([1, 8])
                .on("zoom", (event) => {
                    mapLayer.attr("transform", event.transform);
                    pointsLayer.attr("transform", event.transform);
                    mapLayer.selectAll("path").attr("stroke-width", 0.6 / event.transform.k);
                    pointsLayer.selectAll("circle").attr("stroke-width", 1.2 / event.transform.k);
                });

            svg.call(zoom);

        })();
    }
