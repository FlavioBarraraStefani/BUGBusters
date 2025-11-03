function drawStackedBarChart(rawData) {
  (async function () {

    const container       = d3.select("#stacked_bar_chart_container");
    const svgContainer    = container.select("#stacked_bar_chart_svg");
    const legendContainer = container.select("#stacked_bar_chart_legend");
    const tooltip         = container.select("#stacked_bar_chart_tooltip");

    svgContainer.selectAll("*").remove();
    legendContainer.selectAll("*").remove();

    const margin = { top: 10, right: 24, bottom: 42, left:180 };
    const width  = 1200 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = svgContainer.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Keys and colors
    let allKeys = Object.keys(rawData[0]).filter(d => d !== "region_txt");
    const palette_map = { "Other":"#8c564b", "Unknown":"#2c2c2c" };
    const default_palette = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd"];
    const color = d => palette_map[d] || default_palette[ allKeys.indexOf(d) % default_palette.length ];

    const y = d3.scaleBand()
      .domain(rawData.map(d => d.region_txt))
      .range([0,height])
      .padding(0.3);

    const x = d3.scaleLinear()
      .domain([0,100])
      .range([0,width]);

    // Axes
    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "16px")
      .style("font-weight", "700");
    
    svg.append("g")
      .attr("transform",`translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d=>d+"%"))
      .selectAll("text")
      .style("font-size", "15px")
      .style("font-weight", "600");

    const LITERAL_GREY = "#bfbfbf";

    // Function to compute stacked positions
    function computeStackedPositions(data, keysOrder) {
      return data.map(row => {
        let cum = 0;
        const stackedRow = { region_txt: row.region_txt };
        keysOrder.forEach(k => {
          stackedRow[k] = { x0: cum, x1: cum + row[k] };
          cum += row[k];
        });
        return stackedRow;
      });
    }

    let currentData = computeStackedPositions(rawData, allKeys);

    // Draw bars
    function drawBars(stackedRows) {
      svg.selectAll(".layer").remove();

      allKeys.forEach(key => {
        const group = svg.append("g")
          .attr("class","layer")
          .attr("data-key", key)
          .attr("fill", color(key));

        group.selectAll("rect")
          .data(stackedRows.map(d => ({ region_txt: d.region_txt, ...d[key] })))
          .enter()
          .append("rect")
          .attr("y", d => y(d.region_txt))
          .attr("x", d => x(d.x0))
          .attr("width", d => x(d.x1 - d.x0))
          .attr("height", y.bandwidth())
          .on("mouseover", function(event,d){
            // Rendere tutti gli altri grigi
            svg.selectAll("rect")
              .style("fill", function(r) {
                return (r === d) ? color(key) : LITERAL_GREY;
              });

            tooltip
              .style("opacity",1)
              .html(`
                <div style="background:#fff; padding:16px 20px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.12); border:1px solid #e8e8e8;">
                  <div style="color:#666; font-size:12px; font-weight:500; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">${d.region_txt}</div>
                  <div style="display:flex; align-items:center; margin-bottom:6px;">
                    <span style="background:${color(key)}; width:12px; height:12px; border-radius:2px; display:inline-block; margin-right:10px;"></span>
                    <span style="color:#333; font-size:15px; font-weight:600;">${key}</span>
                  </div>
                  <div style="color:#000; font-size:28px; font-weight:700; letter-spacing:-0.5px;">${(d.x1-d.x0).toFixed(1)}%</div>
                </div>
              `)
              .style("left",(event.pageX+10)+"px")
              .style("top",(event.pageY-20)+"px");
          })
          .on("mouseout", function() {
            // Ripristina colori originali
            allKeys.forEach(k => {
              svg.select(`g[data-key='${k}']`).selectAll("rect")
                .style("fill", color(k));
            });
            tooltip.style("opacity",0);
          });
      });
    }

    drawBars(currentData);

    // Legend with tooltip
    legendContainer.selectAll("span")
      .data(allKeys)
      .enter()
      .append("span")
      .style("display","inline-block")
      .style("margin-right","16px")
      .style("cursor","pointer")
      .style("font-size","14px")
      .html(d=>`<span style="background:${color(d)};width:16px;height:16px;display:inline-block;margin-right:6px;border-radius:2px;vertical-align:middle;"></span>${d}`)
      .on("mouseover", function(event, key){
        const totalPercent = rawData.reduce((sum, row) => sum + (row[key] || 0), 0) / rawData.length;
        tooltip
          .style("opacity",1)
          .html(`
            <div style="background:#fff; padding:14px 18px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.12); border:1px solid #e8e8e8;">
              <div style="display:flex; align-items:center; margin-bottom:6px;">
                <span style="background:${color(key)}; width:12px; height:12px; border-radius:2px; display:inline-block; margin-right:10px;"></span>
                <span style="color:#333; font-size:15px; font-weight:600;">${key}</span>
              </div>
              <div style="color:#000; font-size:24px; font-weight:700;">Media: ${totalPercent.toFixed(1)}%</div>
            </div>
          `)
          .style("left",(event.pageX+10)+"px")
          .style("top",(event.pageY-20)+"px");
      })
      .on("mouseout", () => tooltip.style("opacity",0))
      .on("click", function(event, key){
        const isActive = d3.select(this).classed("active");
        legendContainer.selectAll("span").classed("active", false);

        if(isActive){
          currentData = computeStackedPositions(rawData, allKeys);
          allKeys.forEach(k => {
            svg.select(`g[data-key='${k}']`).selectAll("rect")
              .transition().duration(500)
              .attr("x", d => x(d.x0))
              .attr("width", d => x(d.x1 - d.x0))
              .style("fill", color(k));
          });
        } else {
          d3.select(this).classed("active", true);
          currentData = rawData.map(row => {
            const idx = allKeys.indexOf(key);
            const order = allKeys.slice(idx).concat(allKeys.slice(0, idx));
            return computeStackedPositions([row], order)[0];
          });
          allKeys.forEach(k => {
            svg.select(`g[data-key='${k}']`).selectAll("rect")
              .data(currentData.map(d => ({ region_txt: d.region_txt, ...d[k] })))
              .transition().duration(500)
              .attr("x", d => x(d.x0))
              .attr("width", d => x(d.x1 - d.x0))
              .style("fill", k === key ? color(k) : LITERAL_GREY);
          });
        }
      });

  })();
}
