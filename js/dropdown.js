'use strict';

(function() {
  let data = 'no data';
  let svgContainer = ''; // keep SVG reference in global scope
  let selectedLocation = 'AUS';

  // load data and make scatter plot after window loads
  window.onload = function() {
    svgContainer = d3
      .select('body')
      .append('svg')
      .attr('width', 800)
      .attr('height', 500);

    // d3.csv is basically fetch but it can be be passed a csv file as a parameter
    d3.csv('./data/dataEveryYear.csv').then(data => makeScatterPlot(data));
  };

  // make scatter plot with trend line
  function makeScatterPlot(csvData) {
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
    const mapFunctions = drawAxes(axesLimits, 'time', 'pop_mlns');

    // creates dropdown of different years
    makeDropdown(mapFunctions);

    // plot data as points and add tooltip functionality
    plotData(mapFunctions);

    // show and hide data points starting with 1960
    filterPoints(mapFunctions);
  }

  // make title and axes labels
  function makeLabels() {
    svgContainer
      .append('text')
      .attr('x', 100)
      .attr('y', 40)
      .style('font-size', '14pt')
      .text('Population Change Over Time');

    svgContainer
      .append('text')
      .attr('x', 375)
      .attr('y', 490)
      .style('font-size', '10pt')
      .text('Year');

    svgContainer
      .append('text')
      .attr('transform', 'translate(10, 300)rotate(-90)')
      .style('font-size', '10pt')
      .text('Population in millions');
  }

  // create dropdown to filter data points
  function makeDropdown(mapFunctions) {
    // get all unique years to include in dropdown
    const dropdownCountries = [
      ...new Set(data.map(location => location.location)),
    ];

    // create select element and add an on change event handler to show and hide points
    const dropdown = d3
      .select('#filter')
      .append('select')
      .attr('name', 'country-list')
      .on('change', function() {
        selectedLocation = this.value;
        d3.selectAll('.line').remove();
        filterPoints(mapFunctions);
      });

    // add dropdown options with the year as text
    dropdown
      .selectAll('option')
      .data(dropdownCountries)
      .enter()
      .append('option')
      .text(d => d)
      .attr('value', d => d);

    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');

    // add click event listener to update dropdown value and filter data points by previous year
    prevButton.addEventListener('click', () => {
      const select = document.getElementsByTagName('select')[0];

      if (select.selectedIndex > 0) {
        select.selectedIndex--;
        select.dispatchEvent(new Event('change'));
      }
    });

    // add click event listener to update dropdown value and filter data points by next year
    nextButton.addEventListener('click', () => {
      const select = document.getElementsByTagName('select')[0];

      if (select.selectedIndex !== dropdownCountries.length - 1) {
        select.selectedIndex++;
        select.dispatchEvent(new Event('change'));
      }
    });
  }

  // hides and shows data points based off of selected year
  function filterPoints(mapFunctions) {
    svgContainer
      .selectAll('.circles')
      .filter(d => selectedLocation !== d.location)
      .attr('display', 'none');

    svgContainer
      .selectAll('.circles')
      .filter(d => {
        return selectedLocation === d.location;
      })
      .attr('display', 'inline');

    plotData(mapFunctions);
  }

  // plot all the data points on the SVG
  // and add tooltip functionality
  function plotData(map) {
    const filteredData = data.filter(
      location => location.location === selectedLocation
    );

    // mapping functions
    const xMap = map.x;
    const yMap = map.y;
    const xScale = map.xScale;
    const yScale = map.yScale;

    const line = d3
      .line()
      .x(d => xScale(d.time))
      .y(d => yScale(d.pop_mlns))
      .curve(d3.curveMonotoneX);

    svgContainer
      .append('path')
      .datum(filteredData)
      .attr('class', 'line')
      .attr('d', line);

    // make tooltip
    // const tooltip = d3
    //   .select('body')
    //   .append('div')
    //   .attr('class', 'tooltip')
    //   .style('opacity', 0);

    // append data to SVG and plot as points
    svgContainer
      .selectAll('.dot')
      .data(filteredData)
      .enter()
      .append('circle')
      .attr('class', 'circles')
      .attr('cx', xMap)
      .attr('cy', yMap)
      .attr('r', 3)
      .attr('fill', '#4286f4');

    // add tooltip functionality to points
    //   .on('mouseover', d => {
    //     tooltip
    //       .transition()
    //       .duration(200)
    //       .style('opacity', 0.9);

    //     tooltip
    //       .html(
    //         d.location +
    //           '<br/>' +
    //           'population: ' +
    //           numberWithCommas(d['pop_mlns'] * 1000000) +
    //           '<br/>' +
    //           'year: ' +
    //           d['time'] +
    //           '<br/>' +
    //           'life expectancy: ' +
    //           d['life_expectancy'] +
    //           '<br/>' +
    //           'fertility_rate: ' +
    //           d['fertility_rate']
    //       )
    //       .style('left', d3.event.pageX + 5 + 'px')
    //       .style('top', d3.event.pageY + 10 + 'px');
    //   })
    //   .on('mouseout', d => {
    //     tooltip
    //       .transition()
    //       .duration(500)
    //       .style('opacity', 0);
    //   });
  }

  // draw the axes and ticks
  function drawAxes(limits, x, y) {
    // return x value from a row of data
    const xValue = function(d) {
      return +d[x];
    };

    // function to scale x value
    const xScale = d3
      .scaleLinear()
      .domain([limits.xMin, limits.xMax]) // give domain buffer room
      .range([50, 750]);

    // xMap returns a scaled x value from a row of data
    const xMap = function(d) {
      return xScale(xValue(d));
    };

    // plot x-axis at bottom of SVG
    const xAxis = d3.axisBottom().scale(xScale);
    svgContainer
      .append('g')
      .attr('transform', 'translate(0, 450)')
      .call(xAxis);

    // return y value from a row of data
    const yValue = function(d) {
      return +d[y];
    };

    // function to scale y
    const yScale = d3
      .scaleLinear()
      .domain([limits.yMax + 5, limits.yMin - 5]) // give domain buffer
      .range([50, 450]);

    // yMap returns a scaled y value from a row of data
    const yMap = function(d) {
      return yScale(yValue(d));
    };

    // plot y-axis at the left of SVG
    const yAxis = d3.axisLeft().scale(yScale);
    svgContainer
      .append('g')
      .attr('transform', 'translate(50, 0)')
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

  // format numbers
  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
})();
