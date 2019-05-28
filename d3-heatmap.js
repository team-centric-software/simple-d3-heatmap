/**
 * @file D3 Heatmap Generation Module
 * @author [Daniel Luft]{@link https://github.com/daluf}
 */

/**
 * Create an instance of SimpleD3Heatmap.
 * @param {Object} [settings] Object which holds all settings for the SimpleD3Heatmap
 * @param {color} [settings.minColor] Color of the lowest datapoint in the heatmap - as HEX, RGB or CSS color code
 * @param {color} [settings.maxColor] Color of the highest datapoint in the heatmap - as HEX, RGB or CSS color code
 * @param {int} [settings.colorMode] Selects the way the colors are generated (1 => linear, 2 => sqrt or 3 => cubehelix)
 * @param {float} [settings.gutterSize] Defines the space inbetween the square (0 - 1) (not for yearly)
 * @param {float} [settings.outerSize] Defines the space inbetween the axis and the square (0 - 1) (not for yearly)
 * @param {float} [settings.scale] Defines the size of the heatmap
 * @param {boolean} [settings.showLines] Show axis lines? (not for yearly)
 * @param {boolean} [settings.showTicks] Show axis ticks? (not for yearly)
 * @param {String} [settings.locale] Locale - language used for months, weekdays and date formats
 * @param {String} [settings.dayNameLength] Defines the weekday format (long => "Friday", short => "Fri" or narrow => "F")
 * @param {boolean} [settings.showMonth] Show the months?
 * @param {String} [settings.tooltipClass] CSS class for the tooltip
 * 
 * @example 
 * const heatmap = new SimpleD3Heatmap({
 *     minColor: "#ECF5E2", // lowest datapoint's color in the heatmap - e.g. rgb(0, 255, 0) or #00ff00
 *     maxColor: "#222081", // highest datapoint's color in the heatmap - e.g. rgb(255, 255, 0) or #ffff00
 *     colorMode: 2, // switches between color scales (1: linear, 2: sqrt and 3: cubehelix)
 *     
 *     gutterSize: 0.1, // distance inbetween the squares (range: 0-1)
 *     outerSize: 0.35, // distance inbetween axis x, y and the squares
 *     scale: 0.8, // scale of the heatmap
 *     
 *     showLines: false, // show the axis line
 *     showTicks: true, // show the axis ticks
 *     locale: "de-DE", // defines the format of the date in the axis
 *     dayNameLength: "long", // style of the displayed weekday, options => long: "Friday", short: "Fri", narrow: "F" (uses locale)
 *     showMonth: true, // displays the months (uses locale)
 *     
 *     tooltipClass: "d3-calendar-tooltip" // CSS class for the tooltip
 * })
 * 
 * @class
 */
class SimpleD3Heatmap {
	constructor(settings = {}) {
		this.hours = d3.range(24);

		this.minColor = settings.minColor || "#ECF5E2";
		this.maxColor = settings.maxColor || "#222081";
		this.colorMode = settings.colorMode || 2;

		this.gutterSize = settings.gutterSize || 0.1;
		this.outerSize = settings.outerSize || 0.35;
		this.scale = settings.scale || 1;

		this.showLines = settings.showLines || false;
		this.showTicks = settings.showTicks || true;
		this.locale = settings.locale || "en-US";
		this.dayNameLength = settings.dayNameLength || "short";
		this.showMonth = settings.showMonth || true;

		this.tooltipClass = settings.tooltipClass || "d3-calendar-tooltip";

		// check if tooltipDiv exists
		if (d3.select("#tooltipDiv").empty()) {
			// create tooltip
			d3.select("body").append("div")
				.attr("style", "font-family: 'Tahoma'; position: absolute;")
				.attr("class", this.tooltipClass)
				.attr("id", "tooltipDiv")
				.style("display", "none");
			console.log("created tooltip")
		}
	}

	/**
	 * Creates a weekly heatmap
	 *
	 * @param {String} container_id ID of the Container where the Heatmap should be appended to
	 * @param {heatmapData} data
	 * @memberof SimpleD3Heatmap
	 */
	weekly(container_id, data) {
		const self = this;

		const tooltipDiv = d3.select("#tooltipDiv");
		
		const margin = { left: 75, right: 25, top: 25, bottom: 10 };
		const width = (715 * this.scale) - (margin.left + margin.right);
		let height = (225 * this.scale) - (margin.top + margin.bottom);

		const maxValue = Math.max(...Object.values(data));
		const minValue = Math.min(...Object.values(data));

		// Re-format our data => convert our ts to date/year/hour
		let data2 = [];
		d3.keys(data).map((d) => {
			const date = new Date(parseInt(d, 10));
			const startOfYear = new Date(date.getFullYear(), 0, 1);
			const weekInYear = Math.ceil( (((date - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7 );

			data2.push({
				day: date.getUTCDay(),
				hour: date.getUTCHours(),
				week: weekInYear,
				year: date.getUTCFullYear(),
				value: parseFloat(data[d])
			});
		});
		data = data2;

		const week = data[0].week;

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

		// go through all days in the week
		for (let i = 0; i < 7; i++) {
			// go through all 24 hours
			for (let j = 0; j < 24; j++) {
				// check if data for this time exists
				const item = data.find(el => el.day === i && el.hour === j);
				// if data does not exist, create a new object with specified day and hour and no value
				if (!item) {
					data.push({
						day: parseFloat(i), // range: 0-6
						week: parseFloat(week), // week of the year - range: 0-53
						hour: parseFloat(j), // range: 0 - 23
						year: parseFloat(data[0].year), // e.g. 2017
						value: 0 // e.g. 5
					});
				}
			}
		}

		data.sort((a, b) => {
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
			days.reverse();
			return `${days[i]}`;
		});

		// render the xAxis (Hours)
		svg.append("g")
			.attr("class", "timeLine")
			.call(xAxis);
		
		// render the yAxis (Dates)
		svg.append("g")
			.attr("class", "dateLine")
			.call(yAxis);

		// add square to heatmap
		svg.selectAll()
			.data(data)
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
				tooltipDiv.style("display", "block")
					.html(d.value);
				const tooltipSize = tooltipDiv.node().getBoundingClientRect();
				tooltipDiv.style("left", `${d3.event.pageX - tooltipSize.width/2}px`)
					.style("top", `${d3.event.pageY - tooltipSize.height - 15}px`);
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
	
	/**
	 * Creates a monthly heatmap
	 *
	 * @param {String} container_id ID of the Container where the Heatmap should be appended to
	 * @param {heatmapData} data
	 * @memberof SimpleD3Heatmap
	 */
	monthly(container_id, data) {
		const self = this;

		const tooltipDiv = d3.select("#tooltipDiv");

		const maxValue = Math.max(...Object.values(data));
		const minValue = Math.min(...Object.values(data));

		// Re-format our data => convert our ts to date/month/year/hour
		let data2 = [];
		d3.keys(data).map((d) => {
			const date = new Date(parseInt(d, 10));
			data2.push({
				day: date.getUTCDate() - 1,
				hour: date.getUTCHours(),
				month: date.getUTCMonth(),
				year: date.getUTCFullYear(),
				value: parseFloat(data[d])
			});
		});
		data = data2;

		// create a date object from our current month and year
		const date = new Date(data[0].year, data[0].month + 1, 0);

		// get the amount of days available in this month
		const daysInMonth = date.getDate();

		// go through all days in the month
		for (let i = 0; i < daysInMonth; i++) {
			// go through all 24 hours
			for (let j = 0; j < 24; j++) {
				// check if data for this time exists
				const item = data.find(el => el.day === i && el.hour === j);
				// if data does not exist, create a new object with specified day and hour and no value
				if (!item) {
					data.push({
						day: i,
						hour: j,
						month: data[0].month,
						year: data[0].year,
						value: 0,
					});
				}
			}
		}

		// sort our data (needed for animation)
		data.sort((a, b) => {
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
			const date = new Date(data[0].year, data[0].month, d - 1);
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
				.text(date.toLocaleString(this.locale, { month: "long" }) + " - " + data[0].year)
				.attr("style", "font-weight: 700; font-size: 18px; font-family: 'Tahoma';")
				.attr("x", -45)
				.attr("y", -45);
		}

		// add square to heatmap
		svg.selectAll()
			.data(data)
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
				tooltipDiv.style("display", "block")
					.html(d.value);
				const tooltipSize = tooltipDiv.node().getBoundingClientRect();
				tooltipDiv.style("left", `${d3.event.pageX - tooltipSize.width/2}px`)
					.style("top", `${d3.event.pageY - tooltipSize.height - 15}px`);
			});
			

		if (!this.showLines) {
			svg.selectAll("path")
				.style("opacity", 0);
			}
			
		if (!this.showTicks) {
			svg.selectAll("line")
				.style("opacity", 0);
		}

		const sundays = Array.from(new Set(data.map(el => el.day))).map(day => {
			const item = data.find(el => el.day === day);
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

	/**
	 * Creates a yearly heatmap
	 *
	 * @param {String} container_id ID of the Container where the Heatmap should be appended to
	 * @param {heatmapData} data
	 * @memberof SimpleD3Heatmap
	 */
	yearly(container_id, data) {
		const self = this;
		const tooltipDiv = d3.select("#tooltipDiv");

		const maxValue = Math.max(...Object.values(data));
		const minValue = Math.min(...Object.values(data));

		// set our margin's, width and height
		const margin = { left: 85, right: 0, top: this.showMonth ? 25 : 0, bottom: 0 };
		const width = 52 * (25 * this.scale) + (margin.left + margin.right) + (12 * 25);
		const height = 7 * (25 * this.scale) + (margin.top + margin.bottom);

		// create localized weekdays (mo - fr)
		let days = [];
		for (let i = 0; i < 7; i++) {
			const day = new Date(2019, 0, i);
			days.push(day.toLocaleString(this.locale, {weekday: this.dayNameLength}));
		}

		// returns the given date's day as int (0 - 6)
		const getDayOfDate = (d) => (new Date(d).getUTCDay() + 6) % 7;
		const formatDay = d => days[d];

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
			.attr("style", "font-family: 'Tahoma';")
			.attr("x", -5)
			.attr("y", (d, i) => { return (d + 0.5) * (25 * this.scale) + (i * this.gutterSize); })
			.attr("dy", "0.31em") // give it a little y space from top
			.text(formatDay);

		// Re-format our data => convert our ts to date/month/year
		let data2 = [];
		d3.keys(data).map((d) => {
			const date = new Date(parseInt(d, 10));
			data2.push({ 
				ts: date.getTime(),
				date: date.getUTCDate(),
				month: date.getUTCMonth(),
				year: date.getUTCFullYear(),
				value: parseFloat(data[d])
			});
		});
		data = data2;

		// sort by date
		data.sort((a, b) => {
			return a.ts - b.ts;
		});

		// get the oldest available date
		const oldest = new Date(data[0].ts).getTime();

		// go through all 365 days
		for (let i = 0; i < 365; i++) {
			// create date for day
			const date = new Date(oldest + (i * 86400000));

			const day = date.getUTCDate();
			const month = date.getUTCMonth();
			const year = date.getUTCFullYear();

			// try to find the index of given date
			const itemIndex = data.findIndex(el => el.date === day && el.month === month && el.year === year);
			if (itemIndex === -1) {
				// day does not exist - lets create and push it
				data.push({
					ts: date.getTime(),
					date: day,
					month: month,
					year: year,
					value: 0,
				});
			}
		}
		
		if (this.showMonth) {
			// add the month labels
			svg.selectAll()
				.data(d3.utcMonths(new Date(data[0].year, data[0].month, data[0].date), new Date(data[data.length - 1].year, data[data.length - 1].month, data[data.length - 1].date)))
				.enter()
				.append("text")
				.attr("style", "font-family: 'Tahoma';")
				.attr("x", function (d, i) {
					// timeWeek.count(d3.utcYear(d), timeWeek.ceil(d))
					// d3.utcMonday.count(d3.utcYear(d), d3.utcMonday.ceil(d))
					const date = new Date(d);
					
					// d3.utcMonday.count(d3.utcYear(date), date) + date.getUTCMonth())
					const pos = d3.utcMonday.count(d3.utcYear(date), d3.utcMonday.ceil(date)) + date.getUTCMonth();
					return pos * (25 * self.scale);
				})
				.attr("y", -5)
				.text((d) => {
					const date = new Date(d);
					return date.toLocaleString(this.locale, { month: this.dayNameLength }) + " - " + date.getUTCFullYear();
				});
		}

		// sort by month for the fancy animation
		data.sort((a, b) => {
			return a.month - b.month
		});

		// add the squares
		svg.selectAll()
			.data(data)
			.enter()
			.append("rect")
			.attr("x", function (d, i) {
				const date = new Date(d.ts);
				
				// d3.utcMonday => gets all "Monday-based" weeks
				// d3.utcYear => gets the start of the year (e.g. Jan 01 2019)

				// returns current week of the year * squaresize
				return (d3.utcMonday.count(d3.utcYear(date), date) + date.getUTCMonth()) * (25 * self.scale);
				// return (d3.utcMonday.count(d3.utcYear(d.date), d.date) * (25 * self.scale)) + d3.utcMonday.count(d3.utcYear(d.date), d.date) * (self.gutterSize);
			})
			.attr("y", function (d) {
				// returns the day of the given date of the week (0-6, monday-sunday) * squareize to set the Y position (Monday at the top, Sunday at the bottom)
				return (getDayOfDate(d.ts) * (25 * self.scale) + 0.5) + getDayOfDate(d.ts) * (self.gutterSize);
			})
			.attr("style", function (d, i) {
				return `animation: testAnim 0.25s ease-out ${0.00075 * i}s; animation-fill-mode: backwards;`;
			})
			.attr("width", (25 * this.scale) - (1* this.scale) )
			.attr("height", (25 * this.scale) - (1* this.scale) )
			.style("fill", function(d) {
				// returns the color from the color scale
				return self.getColor(minValue, maxValue, d.value);
			})
			.on("mouseover", function(d) {
				tooltipDiv.style("display", "block")
					.html(d.value);
				const tooltipSize = tooltipDiv.node().getBoundingClientRect();
				tooltipDiv.style("left", `${d3.event.pageX - tooltipSize.width/2}px`)
					.style("top", `${d3.event.pageY - tooltipSize.height - 15}px`);
			});
	}

	getColor(minValue, maxValue, value) {
		let colors;

		switch (this.colorMode) {
			default:
			case 1: // linear color scale
				colors = d3.scaleLinear()
					.range([this.minColor, this.maxColor])
					.domain([minValue, maxValue]);
				break;
			case 2: // sqrt color scale
				colors = d3.scaleSqrt()
					.range([this.minColor, this.maxColor])
					.domain([0, maxValue]);
				break;
			case 3: // cubehelix color scale
				colors = d3.scaleSequential(d3.interpolateCubehelix(this.minColor, this.maxColor))
					.domain([minValue, maxValue]);
				break;
		}

		return colors(value);
	}
}