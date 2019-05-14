'use strict';

(function() {
  let data = 'no data';
  let svgLineGraph = ''; // keep SVG reference in global scope
  let selectedLocation = 'AUS'; // have AUS as selected country on load
  let svgScatterPlot = '';
  let tooltip = '';

  // load data and make line graph after window loads
  window.onload = function() {
    svgLineGraph = d3
      .select('body')
      .append('svg')
      .attr('width', 800)
      .attr('height', 500);

    // make tooltip
    tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    svgScatterPlot = tooltip
      .append('svg')
      .attr('width', 400)
      .attr('height', 300);

    // d3.csv is basically fetch but it can be be passed a csv file as a parameter
    d3.csv('./data/dataEveryYear.csv').then(data => makeLineGraph(data));
  };

  // make line graph
  function makeLineGraph(csvData) {
    data = csvData; // assign data as global variable

    // get arrays of population data and year data
    const pop_mlns_data = data.map(
      row => Math.round(parseFloat(row['pop_mlns']) * 100) / 100
    );
    const year_data = data.map(row => parseInt(row['time']));

    // find data limits
    const axesLimits = findMinMax(year_data, pop_mlns_data);

    // draw title and axes labels
    makeLabels();

    // draw axes and return scaling + mapping functions
    const mapFunctions = drawAxes(
      axesLimits,
      'time',
      'pop_mlns',
      svgLineGraph,
      { min: 50, max: 750 },
      { min: 50, max: 450 }
    );

    // creates dropdown of different years
    makeDropdown(mapFunctions);

    // plot data as points and add tooltip functionality
    plotData(mapFunctions);
  }

  // make title and axes labels
  function makeLabels() {
    svgLineGraph
      .append('text')
      .attr('x', 100)
      .attr('y', 40)
      .style('font-size', '14pt')
      .text('Population Change Over Time');

    svgLineGraph
      .append('text')
      .attr('x', 375)
      .attr('y', 490)
      .style('font-size', '10pt')
      .text('Year');

    svgLineGraph
      .append('text')
      .attr('transform', 'translate(10, 300)rotate(-90)')
      .style('font-size', '10pt')
      .text('Population in millions');
  }

  // create dropdown to filter data points
  function makeDropdown(mapFunctions) {
    // get all unique countries to include in dropdown
    const dropdownCountries = [
      ...new Set(data.map(location => location.location)),
    ].sort();

    // create select element and add an on change event handler to update shown country
    const dropdown = d3
      .select('#filter')
      .append('select')
      .attr('name', 'country-list')
      .on('change', function() {
        selectedLocation = this.value;
        d3.selectAll('.line').remove();
        plotData(mapFunctions);
      });

    // add dropdown options with the country as text
    dropdown
      .selectAll('option')
      .data(dropdownCountries)
      .enter()
      .append('option')
      .text(d => d)
      .attr('value', d => d);

    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');

    // add click event listener to update dropdown value and filter data points by previous country in list
    prevButton.addEventListener('click', () => {
      const select = document.getElementsByTagName('select')[0];

      if (select.selectedIndex > 0) {
        select.selectedIndex--;
        select.dispatchEvent(new Event('change'));
      }
    });

    // add click event listener to update dropdown value and filter data points by next country in list
    nextButton.addEventListener('click', () => {
      const select = document.getElementsByTagName('select')[0];

      if (select.selectedIndex !== dropdownCountries.length - 1) {
        select.selectedIndex++;
        select.dispatchEvent(new Event('change'));
      }
    });
  }

  // draw lines on the SVG
  // and add tooltip functionality
  function plotData(map) {
    const filteredData = data.filter(
      location => location.location === selectedLocation
    );

    // mapping functions
    const xScale = map.xScale;
    const yScale = map.yScale;

    const line = d3
      .line()
      .x(d => xScale(d.time))
      .y(d => yScale(d.pop_mlns))
      .curve(d3.curveMonotoneX);

    // draw line for chosen country and add tooltip functionality
    svgLineGraph
      .append('path')
      .datum(filteredData)
      .attr('class', 'line')
      .attr('d', line)
      // add tooltip functionality to line
      .on('mouseover', () => {
        tooltip
          .transition()
          .duration(200)
          .style('opacity', 1);

        const yPos =
          d3.event.pageY < 325 ? d3.event.pageY + 15 : d3.event.pageY - 325;

        tooltip
          .style('left', d3.event.pageX + 10 + 'px')
          .style('top', yPos + 'px');

        makeScatterPlot();
      })
      .on('mouseout', () => {
        tooltip
          .transition()
          .duration(500)
          .style('opacity', 0);
      });
  }

  // create scatter plot for tooltip
  function makeScatterPlot() {
    svgScatterPlot.html('');
    const fertilityRateData = data.map(row => row['fertility_rate']);
    const lifeExpectancyData = data.map(row => row['life_expectancy']);

    let minMax = findMinMax(fertilityRateData, lifeExpectancyData);
    minMax = {
      xMin: parseFloat(minMax.xMin) - 0.1,
      xMax: parseFloat(minMax.xMax) + 0.1,
      yMin: minMax.yMin - 1,
      yMax: minMax.yMax + 1,
    };

    const funcs = drawAxes(
      minMax,
      'fertility_rate',
      'life_expectancy',
      svgScatterPlot,
      { min: 50, max: 350 },
      { min: 50, max: 250 }
    );

    plotScatterPlot(funcs);
  }

  // plots points on the svg in tooltip and creates labels
  function plotScatterPlot(funcs) {
    svgScatterPlot
      .selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'circles')
      .attr('cx', funcs.x)
      .attr('cy', funcs.y)
      .attr('r', 1.5)
      .attr('fill', '#4286f4');

    svgScatterPlot
      .append('text')
      .attr('x', 130)
      .attr('y', 290)
      .style('font-size', '10pt')
      .text('Year');

    svgScatterPlot
      .append('text')
      .attr('x', 50)
      .attr('y', 30)
      .style('font-size', '10pt')
      .text('Life Expectancy vs Fertility Rate');

    svgScatterPlot
      .append('text')
      .attr('transform', 'translate(15, 220)rotate(-90)')
      .style('font-size', '10pt')
      .text('Life Expectancy (years)');
  }

  // draw the axes and ticks
  function drawAxes(limits, x, y, svg, rangeX, rangeY) {
    // return x value from a row of data
    const xValue = function(d) {
      return +d[x];
    };

    // function to scale x value
    const xScale = d3
      .scaleLinear()
      .domain([limits.xMin, limits.xMax]) // give domain buffer room
      .range([rangeX.min, rangeX.max]);

    // xMap returns a scaled x value from a row of data
    const xMap = function(d) {
      return xScale(xValue(d));
    };

    // plot x-axis at bottom of SVG
    const xAxis = d3.axisBottom().scale(xScale);
    svg
      .append('g')
      .attr('transform', 'translate(0, ' + rangeY.max + ')')
      .call(xAxis);

    // return y value from a row of data
    const yValue = function(d) {
      return +d[y];
    };

    // function to scale y
    const yScale = d3
      .scaleLinear()
      .domain([limits.yMax, limits.yMin]) // give domain buffer
      .range([rangeY.min, rangeY.max]);

    // yMap returns a scaled y value from a row of data
    const yMap = function(d) {
      return yScale(yValue(d));
    };

    // plot y-axis at the left of SVG
    const yAxis = d3.axisLeft().scale(yScale);
    svg
      .append('g')
      .attr('transform', 'translate(' + rangeX.min + ', 0)')
      .call(yAxis);

    // return mapping and scaling functions
    return {
      x: xMap,
      y: yMap,
      xScale: xScale,
      yScale: yScale,
    };
  }

  // find min and max for arrays of x and y
  function findMinMax(x, y) {
    // get min/max x values
    const xMin = d3.min(x);
    const xMax = d3.max(x);

    // get min/max y values
    const yMin = d3.min(y);
    const yMax = d3.max(y);

    // return formatted min/max data as an object
    return {
      xMin: xMin,
      xMax: xMax,
      yMin: yMin,
      yMax: yMax,
    };
  }
})();
