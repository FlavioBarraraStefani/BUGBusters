function drawWaffleChart(rawData) {
      (function() {
        // Aggregate small categories into "Others"
        const major = rawData.slice(0, 5);
        const othersTotal = rawData.slice(5).reduce((sum,d)=>sum+d.value,0);
        major.push({ name:"Others", value:othersTotal, icon:"\uf0c8", color:"#9b59b6" });

        const data = major;
        const total = d3.sum(data, d=>d.value);

        const tooltip = d3.select("#waffle_chart_tooltip");
        const chartContainer = d3.select("#waffle_chart_svg");
        const legendContainer = d3.select("#waffle_chart_legend");
        chartContainer.selectAll("*").remove();
        legendContainer.selectAll("*").remove();

        const cols=20, rows=5, totalCells=cols*rows;
        const containerWidth = chartContainer.node().getBoundingClientRect().width;
        const cellSize = containerWidth/(cols)*0.95;
        const height = rows*cellSize*1.1;

        const svg = chartContainer.append("svg")
          .attr("viewBox",[0,0,containerWidth,height])
          .attr("preserveAspectRatio","xMidYMid meet");

        //scale data
        const scaledData=[];
        data.forEach(d=>d.cells=Math.round((d.value/total)*totalCells));
        data.forEach(d=>{ for(let i=0;i<d.cells;i++) scaledData.push({...d}); });
        while(scaledData.length>totalCells) scaledData.pop();
        while(scaledData.length<totalCells) scaledData.push(data[data.length-1]);
        scaledData.forEach((d,i)=>{ d.col=i%cols; d.row=Math.floor(i/cols); });

        const g = svg.append("g")
          .attr("transform", `translate(${cellSize/2},${cellSize/2})`);

        //draws
        g.selectAll("text")
          .data(scaledData)
          .enter()
          .append("text")
          .attr("class","waffle-icon")
          .attr("x", d=>d.col*cellSize*1.05)
          .attr("y", d=>d.row*cellSize*1.05)
          .attr("font-size",cellSize)
          .attr("fill",d=>d.color)
          .text(d=>d.icon)
          .attr("opacity",0)
          .transition()
          .delay((d,i)=>i*10)
          .duration(400)
          .attr("opacity",1);

        //hover effect
        svg.selectAll(".waffle-icon")
          .on("mouseover",(event,d)=>{
            const percent=((d.value/total)*100).toFixed(1);
            svg.selectAll(".waffle-icon").classed("dimmed",x=>x.name!==d.name);
            tooltip.transition().duration(150).style("opacity",0.9);
            tooltip.html(`<b>${d.name}</b><br>${percent}%<br>${d.value.toLocaleString()} incidents`)
              .style("left",(event.pageX+10)+"px")
              .style("top",(event.pageY-20)+"px");
          })
          .on("mousemove",event=>{
            tooltip.style("left",(event.pageX+10)+"px")
                   .style("top",(event.pageY-20)+"px");
          })
          .on("mouseout",()=>{
            svg.selectAll(".waffle-icon").classed("dimmed",false);
            tooltip.transition().duration(300).style("opacity",0);
          });

        //legend
        const legendItems = legendContainer.selectAll(".legend-item")
          .data(data)
          .enter()
          .append("div")
          .attr("class","legend-item")
          .each(function(d){
            d3.select(this)
              .append("span")
              .attr("class","legend-color")
              .style("background",d.color);
            d3.select(this)
              .append("span")
              .text(d.name);
          })
          .on("mouseover",(event,d)=>{
            const percent=((d.value/total)*100).toFixed(1);
            tooltip.transition().duration(200).style("opacity",0.9);
            tooltip.html(`
              <b>${d.name}</b><br>
              ${percent}% of total<br>
              ${d.value.toLocaleString()} incidents`)
              .style("left",(event.pageX+10)+"px")
              .style("top",(event.pageY-20)+"px");
            svg.selectAll(".waffle-icon").classed("dimmed",x=>x.name!==d.name);
          })
          .on("mouseout",()=>{
            tooltip.transition().duration(300).style("opacity",0);
            svg.selectAll(".waffle-icon").classed("dimmed",false);
          });

      })();
    }