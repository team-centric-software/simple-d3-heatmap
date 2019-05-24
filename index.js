class HeatmapGenerator {
	constructor(settings = {}) {
		this.hours = d3.range(24);

		this.baseColor = settings.baseColor || "#ECF5E2";
		this.fadeColor = settings.fadeColor || "#222081";
		this.colorMode = settings.colorMode || 2;

		this.gutterSize = settings.gutterSize || 0.1;
		this.outerSize = settings.outerSize || 0.35;
		this.scale = settings.scale || 1;
		this.cubeSize = settings.cubeSize || 24;

		this.showLines = settings.showLines || false;
		this.showTicks = settings.showTicks || true;
		this.locale = settings.locale || "en-US";
		this.dayNameLength = settings.dayNameLength || "long";
		this.showMonth = settings.showMonth || true;

		// create tooltip
		d3.select("body").append("div")
			.attr("class", "tooltip")
			.style("position", "absolute")
			.attr("id", "tooltipDiv")
			.style("display", "none");
	}

	weekly(container_id, data) {
		const self = this;

		const maxValue = data.maxPossible || Number.MAX_SAFE_INTEGER;
		const minValue = data.minPossible || 0;
		data = data.data || [];

		const tooltipDiv = d3.select("#tooltipDiv");

		// get all the unique weeks in dataset
		const weeks = [...new Set(data.map(el => el.week))];

		for (let w = 0; w < weeks.length; w++) {
			const week = weeks[w];

			const weekData = data.filter(el => el.week === week);
			
			const margin = { left: 75, right: 25, top: 25, bottom: 10 };
			const width = (715 * this.scale) - (margin.left + margin.right);
			let height = (225 * this.scale) - (margin.top + margin.bottom);

			// create our base - the svg
			const svg = d3.select(`#${container_id}`)
				.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
				.on("mouseout", function(d) {
					tooltipDiv.style("display", "none")
				});
	
			// create localized weekdays (mo - fr)
			let days = [];
			for (let i = 0; i < 7; i++) {
				const day = new Date(2019, 0, i);
				days.push(day.toLocaleString(this.locale, {weekday: this.dayNameLength}));
			}
			days.reverse();

			// go through all days in the month
			for (let i = 0; i < 7; i++) {
				// go through all 24 hours
				for (let j = 0; j < 24; j++) {
					// check if data for this time exists
					const item = weekData.find(el => el.day === i && el.hour === j);
					// if data does not exist, create a new object with specified day and hour and no value
					if (!item) {
						weekData.push({
							week: parseFloat(week), // week of the year - range: 0-53
							day: parseFloat(i), // range: 0-6
							hour: parseFloat(j), // range: 0 - 23
							year: parseFloat(weekData[0].year), // e.g. 2017
							value: 0 // e.g. 5
						});
					}
				}
			}

			weekData.sort((a, b) => {
				return a.day - b.day;
			}).sort((a, b) => {
				if (b.hour < a.day) {
					return 1;
				}
				if (a.hour < b.hour) {
					return -1;
				}
				return 0;
			});
	
			// Create a new ScaleBand for the X Axis
			const x = d3.scaleBand()
				.range([0, width])
				.paddingInner(this.gutterSize)
				.paddingOuter(this.outerSize)
				.domain(this.hours);
	
			// Create a new ScaleBand for the Y Axis
			const y = d3.scaleBand()
				.range([height, 0])
				.paddingInner(this.gutterSize)
				.paddingOuter(this.outerSize)
				.domain(days);
	
			// Format the Ticks of the xAxis (Hour)
			const xAxis = d3.axisTop(x).tickFormat((d, i) => {
				return d % 2 === 0 ? i + "h" : "";
			});
			// Format the Ticks of the yAxis (Dates)
			const yAxis = d3.axisLeft(y).tickFormat((d, i) => {
				return `${d}`;
			});
	
			// render the xAxis (Hours)
			svg.append("g")
				.attr("class", "timeLine")
				.call(xAxis);
			
			// render the yAxis (Dates)
			svg.append("g")
				.attr("class", "dateLine")
				.call(yAxis);

			// add cubes to heatmap
			svg.selectAll()
				.data(weekData)
				.enter()
				.append("rect")
				.attr("x", function(d) { return x(d.hour) })
				.attr("y", function(d) { return y(days[d.day]) })
				.attr("width", x.bandwidth() )
				.attr("height", y.bandwidth() )
				.attr("style", function (d, i) {
					return `animation: testAnim 0.25s ease-out ${0.00275 * i}s; animation-fill-mode: backwards;`;
				})
				.style("fill", function(d) { return self.getColor(minValue, maxValue, d.value)} )
				.on("mouseover", function(d) {
					tooltipDiv.style("display", "block");
					tooltipDiv.html(d.value)
						.style("left", `${d3.event.pageX - 17.5}px`)
						.style("top", `${d3.event.pageY - 45}px`);
				});

			if (!this.showLines) {
				svg.selectAll("path")
					.style("opacity", 0);
				}
				
			if (!this.showTicks) {
				svg.selectAll("line")
					.style("opacity", 0);
			}
		}
	}

	monthly(container_id, data) {
		const self = this;

		const maxValue = data.maxPossible || Number.MAX_SAFE_INTEGER;
		const minValue = data.minPossible || 0;
		data = data.data || [];

		const tooltipDiv = d3.select("#tooltipDiv");

		// get all the unique months in dataset
		const months = [...new Set(data.map(el => el.month))];
		
		// iterate over all available unique months
		for (let m = 0; m < months.length; m++) {
			const currMonth = months[m];

			// get all the data that is related to our current month
			const monthData = data.filter(el => el.month === currMonth);

			// create a date object from our current month and year
			const date = new Date(monthData[0].year, currMonth + 1, 0);

			// get the amount of days available in this month
			const daysInMonth = date.getDate();

			// go through all days in the month
			for (let i = 0; i < daysInMonth; i++) {
				// go through all 24 hours
				for (let j = 0; j < 24; j++) {
					// check if data for this time exists
					const item = monthData.find(el => el.day === i && el.hour === j);
					// if data does not exist, create a new object with specified day and hour and no value
					if (!item) {
						monthData.push({
							day: i,
							hour: j,
							year: monthData[0].year,
							month: monthData[0].month,
							value: 0,
						});
					}
				}
			}

			// sort our data (needed for animation)
			monthData.sort((a, b) => {
				return a.day - b.day;
			}).sort((a, b) => {
				if (b.hour < a.day) {
					return 1;
				}
				if (a.hour < b.hour) {
					return -1;
				}
				return 0;
			});

			// create array with all available days in current month - we need to reverse it for d3 so we start from the bottom
			const days = d3.range(daysInMonth).reverse();

			// set our margin's, width and height
			const margin = { left: 100, right: 25, top: this.showMonth ? 75 : 25, bottom: 25 };
			const width = (692 * this.scale) - (margin.left + margin.right);
			let height = ((26 * daysInMonth) * this.scale) - (margin.top + margin.bottom);
			this.showMonth ? "" : height -= 50; // remove 50px which were needed for the "Month - Year" text
			
			const paddingBottom = (height + margin.top + margin.bottom) - (806 * this.scale);

			// create our base - the svg
			const svg = d3.select(`#${container_id}`)
				.append("div")
				.attr("style", "display: inline-block;")
				.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom - paddingBottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
				.on("mouseout", function(d) {
					tooltipDiv.style("display", "none")
				});

			// Create a new ScaleBand for the X Axis
			const x = d3.scaleBand()
				.range([0, width])
				.paddingInner(this.gutterSize)
				.paddingOuter(this.outerSize)
				.domain(this.hours);

			// Create a new ScaleBand for the Y Axis
			const y = d3.scaleBand()
				.range([height, 0])
				.paddingInner(this.gutterSize)
				.paddingOuter(this.outerSize)
				.domain(days);

			// Format the Ticks of the xAxis (Hour)
			const xAxis = d3.axisTop(x).tickFormat((d, i) => {
				return d % 2 === 0 ? i + "h" : "";
			});
			// Format the Ticks of the yAxis (Dates)
			const yAxis = d3.axisLeft(y).tickFormat((d, i) => {
				const date = new Date(monthData[0].year, currMonth, d + 1);
				const dayMonth = date.toLocaleString(this.locale, {
					month: "2-digit",
					day: "2-digit",
				});
				const dayName = date.toLocaleString(this.locale, {
					weekday: this.dayNameLength,
				});
				// .text(date.toLocaleString(settings.locale, { month: "long" }) + " - " + data[0].year)
				return `${dayMonth}, ${dayName}`;
			});

			// render the xAxis (Hours)
			svg.append("g")
				.attr("class", "timeLine")
				.call(xAxis);
			
			// render the yAxis (Dates)
			svg.append("g")
				.attr("class", "dateLine")
				.call(yAxis);

			if (this.showMonth) {
				// render the month and date at the top of the heatmap
				svg.append("text")
					.text(date.toLocaleString(this.locale, { month: "long" }) + " - " + monthData[0].year)
					.attr("style", "font-weight: 700; font-size: 18;")
					.attr("x", -45)
					.attr("y", -45);
			}

			// add cubes to heatmap
			svg.selectAll()
				.data(monthData)
				.enter()
				.append("rect")
				.attr("x", function(d) { return x(d.hour) })
				.attr("y", function(d) { return y(d.day) })
				.attr("width", x.bandwidth() )
				.attr("height", y.bandwidth() )
				.attr("style", function (d, i) {
					let style = `animation: testAnim 0.25s ease-out ${0.00075 * i}s; animation-fill-mode: backwards;`;
					return style;
				})
				.style("fill", function(d) {
					return self.getColor(minValue, maxValue, d.value);
				})
				.on("mouseover", function(d) {
					tooltipDiv.style("display", "block");
					tooltipDiv.html(d.value)
						.style("left", `${d3.event.pageX - 17.5}px`)
						.style("top", `${d3.event.pageY - 45}px`);
				});
				

			if (!this.showLines) {
				svg.selectAll("path")
					.style("opacity", 0);
				}
				
			if (!this.showTicks) {
				svg.selectAll("line")
					.style("opacity", 0);
			}

			const sundays = Array.from(new Set(monthData.map(el => el.day))).map(day => {
				const item = monthData.find(el => el.day === day);
				const date = new Date(item.year, item.month, day).getDay();
				const isSunday = date == 6 ? true : false;
				if (isSunday) {
					return {
						day: day,
						month: item.month,
						year: item.year
					}
				} else {
					return {}
				}
			}).filter((item) => {
				return item.day;
			});

			const spacing = height / daysInMonth;
			svg.selectAll()
				.data(sundays)
				.enter()
				.append("path")
				.attr("style", "opacity: 1;")
				.attr("stroke", "rgba(0,0,0,0.15)")
				.attr("stroke-width", `${3 * this.scale}px`)
				.attr("d", (d, i) => {
					const height = ((spacing - (0.115 * self.scale) * (i + 1)) * (d.day + 1)) + (7 * self.scale);
					// console.log(d.day, spacing);
					return `M${8 * self.scale},${height} L${width - (8 * self.scale)},${height}`;
				});
		}
	}

	yearly(container_id, data) {
		const self = this;
		const tooltipDiv = d3.select("#tooltipDiv");

		const maxValue = data.maxPossible || Number.MAX_SAFE_INTEGER;
		const minValue = data.minPossible || 0;
		data = data.data || [];

		// set our margin's, width and height
		const margin = { left: 85, right: 0, top: 25, bottom: 0 };
		const width = 52 * (this.cubeSize * this.scale) + (margin.left + margin.right) + (12 * this.cubeSize);
		const height = 7 * (this.cubeSize * this.scale) + (margin.top + margin.bottom);

		// create localized weekdays (mo - fr)
		let days = [];
		for (let i = 0; i < 7; i++) {
			const day = new Date(2019, 0, i);
			days.push(day.toLocaleString(this.locale, {weekday: this.dayNameLength}));
		}

		// returns the given date's day as int (0 - 6)
		const getDayOfDate = (d) => (new Date(d).getUTCDay() + 6) % 7;
		const formatDay = d => days[d];
		const formatMonth = d => new Date(d).toLocaleString(this.locale, { month: "long" });

		// create our base - the svg
		const svg = d3.select(`#${container_id}`)
			.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
			.on("mouseout", function(d) {
				tooltipDiv.style("display", "none")
			});

		// add the weekdays (monday-sunday)
		svg.append("g")
			.attr("text-anchor", "end")
			.selectAll("text")
			.data(d3.range(7)) // d3.range(X) generates an array of numbers from 0 to X
			.join("text")
			.attr("x", -5)
			.attr("y", (d, i) => { return (d + 0.5) * (this.cubeSize * this.scale) + (i * this.gutterSize); })
			.attr("dy", "0.31em") // give it a little y space from top
			.text(formatDay);

		// needed to add missing data
		data.sort((a, b) => {
			return a.date - b.date
		})

		const oldest = data[0].date;
		for (let i = 0; i < 365; i++) {
			const date = new Date(oldest + (i * 86400000));

			const day = date.getUTCDate() + 1;
			const month = date.getUTCMonth();
			const year = date.getUTCFullYear();

			if (!data.find(el => el.day === day && el.month === month && el.year === year)) {
				data.push({
					date: date.getTime(),
					day: day,
					month: month,
					year: year,
					value: 0,
				});
			}
		}

		// needed for the fancy animation
		data.sort((a, b) => {
			return a.month - b.month
		});

		// add the cubes
		svg.selectAll()
			.data(data)
			.enter()
			.append("rect")
			.attr("x", function (d, i) {
				// d3.utcMonday => gets all "Monday-based" weeks
				// d3.utcYear => gets the start of the year (e.g. Jan 01 2019)
				const date = new Date(d.date);

				// returns current week of the year * cubeSize
				return (d3.utcMonday.count(d3.utcYear(date), date) + date.getUTCMonth()) * (self.cubeSize * self.scale);
				// return (d3.utcMonday.count(d3.utcYear(d.date), d.date) * (self.cubeSize * self.scale)) + d3.utcMonday.count(d3.utcYear(d.date), d.date) * (self.gutterSize);
			})
			.attr("y", function (d) {
				// returns the day of the given date of the week (0-6, monday-sunday) * cubeSize to set the Y position (Monday at the top, Sunday at the bottom)
				return (getDayOfDate(d.date) * (self.cubeSize * self.scale) + 0.5) + getDayOfDate(d.date) * (self.gutterSize);
			})
			.attr("style", function (d, i) {
				return `animation: testAnim 0.25s ease-out ${0.00075 * i}s; animation-fill-mode: backwards;`;
			})
			.attr("width", (this.cubeSize * this.scale) - (1* this.scale) )
			.attr("height", (this.cubeSize * this.scale) - (1* this.scale) )
			.style("fill", function(d) {
				// returns the color from the color scale
				return self.getColor(minValue, maxValue, d.value);
			})
			.on("mouseover", function(d) {
				const date = new Date(d.date);
				tooltipDiv.style("display", "block")
				tooltipDiv.html(`${d.value}: ${date.getUTCMonth() + 1}/${date.getUTCDate()}`)
					.style("left", `${event.pageX - 35}px`)
					.style("top", `${event.pageY - 40}px`);
			});
		
		// add the month labels
		svg.selectAll()
			.data(d3.utcMonths(new Date(data[0].year, 0, 0), new Date(data[0].year, 12, 0)))
			.enter()
			.append("text")
			.attr("x", function (d, i) {
				// timeWeek.count(d3.utcYear(d), timeWeek.ceil(d))
				// d3.utcMonday.count(d3.utcYear(d), d3.utcMonday.ceil(d))
				const date = new Date(d);
				
				// d3.utcMonday.count(d3.utcYear(date), date) + date.getUTCMonth())
				const pos = d3.utcMonday.count(d3.utcYear(date), d3.utcMonday.ceil(date)) + date.getUTCMonth();
				return pos * (self.cubeSize * self.scale);
			})
			.attr("y", -5)
			.text(formatMonth);

		/*data.sort((a, b) => {
			return a.date - b.date;
		});

		const monthsToPath = d3.utcMonths(d3.utcMonth(data[0].date), data[Object.keys(data).length - 1].date);
		monthsToPath.sort((a, b) => {
			const dateA = new Date(a);
			const dateB = new Date(b);
			return dateA - dateB;
		});

		const monthPath = svg.append("g")
			.selectAll("g")
			.data(monthsToPath)
			.join("g");
			
		monthPath.filter((d, i) => i).append("path")
			.attr("fill", "none")
			.attr("stroke", "white")
			.attr("stroke-width", 3 * this.scale)
			.attr("d", (d, i) => {
				// amount of days
				const days = 7;
				// day when the month starts
				const dayOfTheWeek = getDayOfDate(d);
				// week in current year
				const weekOfYear = d3.utcMonday.count(d3.utcYear(d), d);
				
				// M = set starting point (X, Y)
				// V = draw vertical line to X
				// H = draw horizontal line to X

				// start off by setting the "Pen" to: Week of the Current Year + 1 (So its one more than when the actual week is)
				// Draw a vertical line to the day of the start of the month
				// Draw a horizontal line until we hit the previous month
				// Draw a vertical line to the bottom to finish off

				// if the day of the start of the month is 0, we only need to draw a straight line to the bottom
				// we are doing `+ i / 100` to account in for the gaps between the cubes
				if (dayOfTheWeek == 0) {
					return `M${(weekOfYear) * ((self.cubeSize + (i / 60)) * self.scale)},0 V${days * ((self.cubeSize + (i / 60)) * self.scale)}`;
				} else {
					return `M${(weekOfYear + 1) * ((self.cubeSize + (i / 60)) * self.scale)},0 V${dayOfTheWeek * ((self.cubeSize + (i / 60)) * self.scale)} H${weekOfYear * ((self.cubeSize + (i / 60)) * self.scale)} V${days * (self.cubeSize * self.scale)}`;
				}
			});*/
	}

	getColor(minValue, maxValue, value) {
		let colors;

		switch (this.colorMode) {
			default:
			case 1: // linear color scale
				colors = d3.scaleLinear()
					.range([this.baseColor, this.fadeColor])
					.domain([minValue, maxValue]);
				break;
			case 2: // sqrt color scale
				colors = d3.scaleSqrt()
					.range([this.baseColor, this.fadeColor])
					.domain([0, maxValue]);
				break;
			case 3: // cubehelix color scale
				colors = d3.scaleSequential(d3.interpolateCubehelix(this.baseColor, this.fadeColor))
					.domain([minValue, maxValue]);
				break;
		}

		return colors(value);
	}
}

const weeklyData = createWeeklyData(data.nodegroups.kz);
const yearlyData = createYearlyData(data.byday.kz);
const monthlyData = createMonthlyData(data.nodegroups.kz);
// generate the svg
const heatmap = new HeatmapGenerator({ locale: "de-DE" });
heatmap.yearly("graphcontainer", yearlyData);
// heatmap.monthly("graphcontainer", monthlyData);
// heatmap.weekly("graphcontainer", weeklyData);

function createYearlyData(data) {
	// split the date (e.g. "190228") and return single elements (day, month, year) instead
	function parseDateByHour(el) {
		const date = el.match(/.{2}/g);
	
		const year = date[0];
		const month = date[1];
		const day = date[2];
		
		return [day, month, year];
	};
	
	// create new array
	let newHeatMapData = [];
	let lowestValue = Number.MAX_SAFE_INTEGER;
	let highestValue = 0;
	
	const keys = Object.keys(data);
	for (let i = 0; i < keys.length; i++) {
		const date = parseDateByHour(keys[i]);

		const jsDate = new Date("20" + date[2], date[1], date[0]);

		const ms = jsDate.getTime();
		const value = data[keys[i]];

		newHeatMapData.push({
			date: ms,
			day: jsDate.getDate(),
			month: jsDate.getMonth(),
			year: jsDate.getFullYear(),
			value: value,
		});

		/*if (ms < lowestDate) {
			lowestDate = ms;
		} else if (ms > highestDate) {
			highestDate = ms;
		}*/

		if (value < lowestValue) {
			lowestValue = value;
		} else if (value > highestValue) {
			highestValue = value;
		}
	}

	return {data: newHeatMapData, minPossible: lowestValue, maxPossible: highestValue};
	// return [newHeatMapData, lowestDate, highestDate, lowestValue, highestValue];
}

function createWeeklyData(data) {
	// split the date (e.g. "19022810") and return single elements (hour, day, month, year) instead
	function parseDateByHour(el) {
		const date = el.match(/.{2}/g);
	
		const year = date[0];
		const month = date[1];
		const day = date[2];
		const hour = date[3];
		
		return [hour, day, month, year];
	};
	
	// create new array
	let newHeatMapData = [];
	let lowestVal = Number.MAX_SAFE_INTEGER;
	let highestVal = 0;

	
	const keys = Object.keys(data);
	for (let i = 0; i < keys.length; i++) {
		const date = parseDateByHour(keys[i]);
		const val = data[keys[i]];

		const jsDate = new Date("20" + date[3], date[2] - 1, date[1], date[0]);
		const startOfYear = new Date(jsDate.getFullYear(), 0, 1);
		const weekInYear = Math.ceil( (((jsDate - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7 );

		const day = jsDate.getUTCDay();

		newHeatMapData.push({
			week: parseFloat(weekInYear), // week of the year - range: 0-53
			day: parseFloat(day), // range: 0-6
			hour: parseFloat(date[0]), // range: 0 - 23
			year: parseFloat(date[3]), // e.g. 2017
			value: val // e.g. 5
		});

		if (val > highestVal) {
			highestVal = val;
		}

		if (val < lowestVal) {
			lowestVal = val;
		}
	}

	return {data: newHeatMapData, minPossible: lowestVal, maxPossible: highestVal};
}

function createMonthlyData(data) {
	// split the date (e.g. "19022810") and return single elements (hour, day, month, year) instead
	function parseDateByHour(el) {
		const date = el.match(/.{2}/g);
	
		const year = date[0];
		const month = date[1];
		const day = date[2];
		const hour = date[3];
		
		return [hour, day, month, year];
	};
	
	// create new array
	let newHeatMapData = {data: [], maxPossible: 0, minPossible: Number.MAX_SAFE_INTEGER};

	const keys = Object.keys(data);
	for (let i = 0; i < keys.length; i++) {
		const date = parseDateByHour(keys[i]);
		
		const val = data[keys[i]];
		
		newHeatMapData.data.push({
			month: parseFloat(date[2]) - 1,
			day: parseFloat(date[1]) - 1,
			hour: parseFloat(date[0]),
			year: parseFloat("20" + date[3]),
			value: parseFloat(val),
		});

		if (val > newHeatMapData.maxPossible) {
			newHeatMapData.maxPossible = val;
		}

		if (val < newHeatMapData.minPossible) {
			newHeatMapData.minPossible = val;
		}
	}

	return newHeatMapData;
}