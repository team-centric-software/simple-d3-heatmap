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
 * @param {boolean} [settings.includeWeekend] Show saturday and sunday? (Only weekly calendar heatmap)
 * @param {Number} [settings.mobileViewPx] At how many pixels (width) change to "mobile view"?
 * @param {Number} [settings.enableAnimations] Enable animations when rendering the calendar heatmaps
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
 *     includeWeekend: true, // Show saturday and sunday? Only for weekly calendar heatmap
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
		this.dayNameLength = settings.dayNameLength || "long";
		this.showMonth = settings.showMonth || true;
		this.includeWeekend = settings.includeWeekend || true;

		this.tooltipClass = settings.tooltipClass || "d3-calendar-tooltip";
		this.enableAnimations = settings.enableAnimations || true;

		const minPix = settings.mobileViewPx || 1200;
		this.mobileView = window.innerWidth < minPix ? true : false;

		// check if tooltipDiv exists
		if (d3.select("#tooltipDiv").empty()) {
			// create tooltip
			d3.select("body").append("div")
				.attr("style", "font-family: 'Tahoma'; position: absolute;")
				.attr("class", this.tooltipClass)
				.attr("id", "tooltipDiv")
				.style("display", "none");

			const styling = document.createElement("style");
			styling.type = "text/css";

			const keyFrames = `@keyframes simple-d3-heatmaps-cubeanim {
				from {
					opacity: 0;
					width: 0;
					height: 0;
				}
				to {
					opacity: 1;
				}
			}`;

			styling.innerHTML = keyFrames;
			document.getElementsByTagName("head")[0].appendChild(styling);
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

		const daysInWeek = this.includeWeekend ? 7 : 5;

		const tooltipDiv = d3.select("#tooltipDiv");

		const margin = { left: 75, right: 25, top: 25, bottom: 10 };
		const width = (715 * this.scale) - (margin.left + margin.right);
		const height = (this.includeWeekend ? 225 : 175 * this.scale) - (margin.top + margin.bottom);

		// get the smallest and highest values out of the data
		const maxValue = Math.max(...Object.values(data));
		const minValue = Math.min(...Object.values(data));

		// Re-format our data => convert our ts to date/year/hour
		const data2 = [];
		d3.keys(data).map((d) => {
			const date = new Date(parseInt(d, 10));

			if (date.getUTCDay() + 1 <= daysInWeek) {
				data2.push({
					day: date.getUTCDay(),
					hour: date.getUTCHours(),
					year: date.getUTCFullYear(),
					date: date.toISOString(),
					value: parseFloat(data[d])
				});
			}
		});
		data = data2;

		// create container for the svg
		const container = d3.select(`#${container_id}`).append("div");

		// create svg
		const svg = container.append("svg")
			.attr("viewBox", `${-margin.left} ${-margin.top} ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
			.attr("style", `display: inline-block; position: absolute; top: 0px; left: 0px;`)
			.attr("preserveAspectRatio", "xMinYMin meet")
			.on("mouseout", function(d) {
				tooltipDiv.style("display", "none")
			});

		// array for localized weekdays (mo - fr)
		const days = [];

		if (!this.mobileView) {
			container.attr("style", `display: inline-block; position: relative; width: 40%; padding-bottom: 13%; vertical-align: top; overflow: hidden;`);

			// create days, localized and push them into `days`
			for (let i = 0; i < daysInWeek; i++) {
				const day = new Date(2019, 0, i);
				days.push(day.toLocaleString(this.locale, {weekday: this.dayNameLength}));
			}
		} else {
			container.attr("style", `display: inline-block; position: relative; width: 100%; padding-bottom: 32%; vertical-align: top; overflow: hidden;`);

			// create days, localized and push them into `days`
			for (let i = 0; i < daysInWeek; i++) {
				const day = new Date(2019, 0, i);
				days.push(day.toLocaleString(this.locale, {weekday: "short"}));
			}
		}

		// reverse the days array so the days are in correct order
		days.reverse();

		// go through all days in the week
		for (let i = 0; i < daysInWeek; i++) {
			// go through all 24 hours
			for (let j = 0; j < 24; j++) {
				// check if data for this time exists
				const item = data.find(el => el.day === i && el.hour === j);
				// if data does not exist, create a new object with specified day and hour and no value
				if (!item) {
					data.push({
						day: parseFloat(i), // range: 0-6
						hour: parseFloat(j), // range: 0 - 23
						year: parseFloat(data[0].year), // e.g. 2017
						value: 0 // e.g. 5
					});
				}
			}
		}

		// sort the data by day then by hour
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
			return `${d}`;
		});

		// render the xAxis (Hours)
		svg.append("g")
			.attr("class", "timeLine")
			.attr("style", `font-family: 'Tahoma', Arial, serif; font-size: ${this.mobileView ? 16 : 12}px;`)
			.call(xAxis);

		// render the yAxis (Dates)
		svg.append("g")
			.attr("style", `font-family: 'Tahoma', Arial, serif; font-size: ${this.mobileView ? 16 : 12}px;`)
			.call(yAxis);

		// add square to heatmap
		svg.selectAll()
			.data(data)
			.enter()
			.append("rect")
			.attr("x", function(d) { return x(d.hour) })
			.attr("y", function(d) {
				return y(days[d.day]);
			})
			.attr("width", x.bandwidth() )
			.attr("height", y.bandwidth() )
			.attr("style", function (d, i) {
				if (self.enableAnimations) {
					return `animation: simple-d3-heatmaps-cubeanim 0.25s ease-out ${0.00275 * i}s; animation-fill-mode: backwards;`;
				}
			})
			.style("fill", function(d) { return self.getColor(minValue, maxValue, d.value)} )
			.on("mouseover", function(d) {
				tooltipDiv.style("display", "block")
					.html(d.value);
				const tooltipSize = tooltipDiv.node().getBoundingClientRect();
				tooltipDiv.style("left", `${d3.event.pageX - tooltipSize.width/2}px`)
					.style("top", `${d3.event.pageY - tooltipSize.height - 15}px`);
			});

		// hide all paths (lines) if false
		if (!this.showLines) {
			svg.selectAll("path")
			.style("opacity", 0);
		}

		// hide all ticks if false
		if (!this.showTicks) {
			svg.selectAll("line")
				.style("opacity", 0);
		}

		// Remove every second tick for beauty purposes
		const ticks = svg.selectAll(".timeLine > .tick");

		ticks.attr("class", function(d,i){
			if(i % 2 != 0) d3.select(this).remove();
		});
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

		// get the smallest and highest values out of the data
		const maxValue = Math.max(...Object.values(data));
		const minValue = Math.min(...Object.values(data));

		// Re-format our data => convert our ts to date/month/year/hour
		const data2 = [];
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
		const margin = { left: 125, right: 25, top: this.showMonth ? 75 : 25, bottom: 25 };
		const width = (692 * this.scale) - (margin.left + margin.right);
		let height = ((27 * daysInMonth) * this.scale) - (margin.top + margin.bottom);
		this.showMonth ? "" : height -= 50; // remove 50px which were needed for the "Month - Year" text

		// create our svg container
		const container = d3.select(`#${container_id}`).append("div");
		// create svg
		const svg = container.append("svg")
			.attr("preserveAspectRatio", "xMinYMin meet")
			.attr("viewBox", `${-margin.left} ${-margin.top} ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
			.attr("style", `display: inline-block; position: absolute; top: 0px; left: 0px;`)
			.on("mouseout", function() {
				tooltipDiv.style("display", "none")
			});

		// add styling depending on mobileview
		if (!this.mobileView) {
			container.attr("style", `display: inline-block; position: relative; width: 40%; padding-bottom: 48%; vertical-align: top; overflow: hidden;`);
		} else {
			container.attr("style", `display: inline-block; position: relative; width: 100%; padding-bottom: 120%; vertical-align: top; overflow: hidden;`);
		}

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
			const date = new Date(data[0].year, data[0].month, d + 1);
			const dayMonth = date.toLocaleString(this.locale, {
				month: "2-digit",
				day: "2-digit",
			});
			const dayName = date.toLocaleString(this.locale, {
				weekday: this.mobileView ? "short" : this.dayNameLength,
			});
			// .text(date.toLocaleString(settings.locale, { month: "long" }) + " - " + data[0].year)
			return `${dayMonth}, ${dayName}`;
		});

		// render the xAxis (Hours)
		svg.append("g")
			.attr("class", "timeLine")
			.attr("style", `font-family: 'Tahoma', Arial, serif; font-size: ${this.mobileView ? 16 : 12}px;`)
			.call(xAxis);

		// render the yAxis (Dates)
		svg.append("g")
			.attr("style", `font-family: 'Tahoma', Arial, serif; font-size: ${this.mobileView ? 16 : 12}px;`)
			.call(yAxis);

		if (this.showMonth) {
			// render the month and date at the top of the heatmap
			svg.append("text")
				.attr("style", `font-weight: 700; font-size: 22px; font-family: 'Tahoma', Arial, serif;`)
				.text(date.toLocaleString(this.locale, { month: "long" }) + " - " + data[0].year)
				.attr("x", -45)
				.attr("y", -45);
		}

		// add squares to heatmap
		svg.selectAll()
			.data(data)
			.enter()
			.append("rect")
			.attr("x", function(d) { return x(d.hour) })
			.attr("y", function(d) { return y(d.day) })
			.attr("width", x.bandwidth() )
			.attr("height", y.bandwidth() )
			.attr("style", function (d, i) {
				if (self.enableAnimations) {
					return `animation: simple-d3-heatmaps-cubeanim 0.25s ease-out ${0.00075 * i}s; animation-fill-mode: backwards;`;
				}
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

		// get all available sundays from specified month
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

		// hide all paths (lines) if false
		if (!this.showLines) {
			svg.selectAll("path")
				.style("opacity", 0);
		}

		// calculate spacing between sundays
		const spacing = height / daysInMonth;
		svg.selectAll()
			.data(sundays)
			.enter()
			.append("path")
			.attr("style", "opacity: 1;")
			.attr("stroke", "rgba(0,0,0,0.15)")
			.attr("stroke-width", `${3 * this.scale}px`)
			.attr("d", (d, i) => {
				const height = ((spacing - (0.11 * self.scale) * (i + 1)) * (d.day + 1)) + (7 * self.scale);
				// console.log(d.day, spacing);
				return `M${8 * self.scale},${height} L${width - (8 * self.scale)},${height}`;
			});

		// hide all ticks if false
		if (!this.showTicks) {
			svg.selectAll("line")
				.style("opacity", 0);
		}

		// Remove every second tick
		const ticks = svg.selectAll(".timeLine > .tick");

		ticks.attr("class", function(d,i){
			if(i % 4 != 0) d3.select(this).remove();
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

		const cubeSize = 25;
		// set our margin's, width and height
		const margin = { left: 85, right: 0, top: this.showMonth ? 25 : 0, bottom: 0 };
		const width = 52 * (cubeSize * this.scale) + (margin.left + margin.right) + (12 * 25);
		const height = 7 * (cubeSize * this.scale) + (margin.top + margin.bottom);

		// array for localized weekdays (mo - fr)
		const days = [];

		// create our svg container
		const container = d3.select(`#${container_id}`).append("div")
		// create svg
		const svg = container.append("svg")
		.	attr("preserveAspectRatio", "xMinYMin meet")
			.attr("style", `display: inline-block; position: absolute; top: 0px; left: 0px;`)
			.on("mouseout", function(d) {
				tooltipDiv.style("display", "none")
			});

		// add styling depending on mobileview
		if (!this.mobileView) {
			container.attr("style", `display: inline-block; position: relative; width: 100%; padding-bottom: 12%; vertical-align: top; overflow: hidden;`);

			svg.attr("viewBox", `${-margin.left} ${-margin.top} ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)

			// fill days
			for (let i = 0; i < 7; i++) {
				const day = new Date(2019, 0, i);
				days.push(day.toLocaleString(this.locale, {weekday: this.dayNameLength}));
			}
		} else {
			container.attr("style", `display: inline-block; position: relative; width: 100%; padding-bottom: 170%; vertical-align: top; overflow: hidden;`);

			svg.attr("viewBox", `${-margin.left} ${-margin.top} ${width / 4 + margin.left + margin.right} ${height * 4 + margin.top + margin.bottom + 25}`)

			// fill days
			for (let i = 0; i < 7; i++) {
				const day = new Date(2019, 0, i);
				days.push(day.toLocaleString(this.locale, {weekday: "short"}));
			}
		}

		// add the weekdays (monday-sunday)
		svg.append("g")
			.attr("text-anchor", "end")
			.selectAll("text")
			.data(d3.range(7)) // d3.range(X) generates an array of numbers from 0 to X
			.join("text")
			.attr("style", `font-family: 'Tahoma', Arial, serif; font-size: ${this.mobileView ? 18 : 16}px`)
			.attr("x", this.mobileView ? -5 + -cubeSize : -5)
			.attr("y", (d, i) => { return (d + 0.5) * (cubeSize * this.scale) + (i * this.gutterSize); })
			.attr("dy", "0.31em") // give it a little y space from top
			.text((d) => {
				return days[d];
			});

		// on mobileview we have more lines => we need to show the weekdays for each line
		if (this.mobileView) {
			for (let i = 1; i < 4; i++) {
				svg.append("g")
					.attr("text-anchor", "end")
					.selectAll("text")
					.data(d3.range(7)) // d3.range(X) generates an array of numbers from 0 to X
					.join("text")
					.attr("style", `font-family: 'Tahoma', Arial, serif; font-size: ${this.mobileView ? 18 : 16}px`)
					.attr("x", -5 + -cubeSize)
					.attr("y", (d, j) => { return (d + 0.5) * (cubeSize * this.scale) + (j * this.gutterSize) + (cubeSize * 8 * i) + (i * 15); })
					.attr("dy", "0.31em") // give it a little y space from top
					.text((d) => {
						return days[d];
					});
			}
		}

		// Re-format our data => convert our ts to date/month/year
		const data2 = [];
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
		let oldest = new Date(data[0].ts);
		if (!data.find(el => el.month === oldest.getMonth() - 1)) {
			oldest.setMonth(0);
		}
		oldest = oldest.getTime();

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

		// sort by date
		data.sort((a, b) => {
			return a.ts - b.ts;
		});

		if (this.showMonth) {
			// add the month labels
			svg.selectAll()
				.data(d3.utcMonths(new Date(data[0].year, -1, data[0].date), new Date(data[0].year, 11, data[0].date)))
				.enter()
				.append("text")
				.attr("style", `font-family: 'Tahoma', Arial, serif; font-size: ${this.mobileView ? 16 : 18}px`)
				.attr("x", function (d, i) {
					// timeWeek.count(d3.utcYear(d), timeWeek.ceil(d))
					// d3.utcMonday.count(d3.utcYear(d), d3.utcMonday.ceil(d))
					const date = new Date(d);

					if (self.mobileView) {
						if (d.getUTCMonth() >= 3 && d.getUTCMonth() <= 5) {
							const pos = d3.utcMonday.count(d3.utcYear(date), d3.utcMonday.ceil(date)) + date.getUTCMonth();
							return pos * (cubeSize * self.scale) - (cubeSize * 2) - (cubeSize * (3*5)) + cubeSize;
						}
						if (d.getUTCMonth() >= 5 && d.getUTCMonth() <= 8) {
							const pos = d3.utcMonday.count(d3.utcYear(date), d3.utcMonday.ceil(date)) + date.getUTCMonth();
							return pos * (cubeSize * self.scale) - (cubeSize * 3) - (cubeSize * (6*5)) + cubeSize;
						}
						if (d.getUTCMonth() >= 9 && d.getUTCMonth() <= 11) {
							const pos = d3.utcMonday.count(d3.utcYear(date), d3.utcMonday.ceil(date)) + date.getUTCMonth();
							return pos * (cubeSize * self.scale) - (cubeSize * 4) - (cubeSize * (9*5)) + cubeSize;
						}
					}

					// d3.utcMonday.count(d3.utcYear(date), date) + date.getUTCMonth())
					const pos = d3.utcMonday.count(d3.utcYear(date), d3.utcMonday.ceil(date)) + date.getUTCMonth();
					return pos * (cubeSize * self.scale);
				})
				.attr("y", (d) => {
					if (self.mobileView) {
						if (d.getUTCMonth() >= 3 && d.getUTCMonth() <= 5) {
							return 10 + (cubeSize * 8);
						}
						if (d.getUTCMonth() >= 6 && d.getUTCMonth() <= 8) {
							return 25 + (cubeSize * 16);
						}
						if (d.getUTCMonth() >= 9 && d.getUTCMonth() <= 11) {
							return 40 + (cubeSize * 24);
						}
					}

					return -5;
				})
				.text((d) => {
					const date = new Date(d);
					return date.toLocaleString(this.locale, { month: "short" }) + " - " + date.getUTCFullYear();
				});
		}

		// sort by month for the fancy animation
		data.sort((a, b) => {
			return a.month - b.month
		});

		// returns the given date's day as int (0 - 6)
		const getDayOfDate = (d) => (new Date(d).getUTCDay() + 6) % 7;

		// add the squares
		svg.selectAll()
			.data(data)
			.enter()
			.append("rect")
			.attr("x", function (d, i) {
				const date = new Date(d.ts);

				if (self.mobileView) {
					if (date.getUTCMonth() >= 3 && date.getUTCMonth() <= 5) {
						const pos = d3.utcMonday.count(d3.utcYear(date), date) + date.getUTCMonth();
						return pos * (cubeSize * self.scale) - (cubeSize) - (cubeSize * (3*5));
					}
					if (date.getUTCMonth() >= 6 && date.getUTCMonth() <= 8) {
						const pos = d3.utcMonday.count(d3.utcYear(date), date) + date.getUTCMonth();
						return pos * (cubeSize * self.scale) - (cubeSize * 2) - (cubeSize * (6*5));
					}
					if (date.getUTCMonth() >= 9 && date.getUTCMonth() <= 11) {
						const pos = d3.utcMonday.count(d3.utcYear(date), date) + date.getUTCMonth();
						return pos * (cubeSize * self.scale) - (cubeSize * 3) - (cubeSize * (9*5));
					}
				}
				// d3.utcMonday => gets all "Monday-based" weeks
				// d3.utcYear => gets the start of the year (e.g. Jan 01 2019)

				// returns current week of the year * squaresize
				return (d3.utcMonday.count(d3.utcYear(date), date) + date.getUTCMonth()) * (cubeSize * self.scale);
				// return (d3.utcMonday.count(d3.utcYear(d.date), d.date) * (25 * self.scale)) + d3.utcMonday.count(d3.utcYear(d.date), d.date) * (self.gutterSize);
			})
			.attr("y", function (d) {
				if (self.mobileView) {
					if (d.month >= 3 && d.month <= 5) {
						return (getDayOfDate(d.ts) * (cubeSize * self.scale)) + getDayOfDate(d.ts) * (self.gutterSize) + 15 + (cubeSize * 8);
					}
					if (d.month >= 6 && d.month <= 8) {
						return (getDayOfDate(d.ts) * (cubeSize * self.scale)) + getDayOfDate(d.ts) * (self.gutterSize) + 31 + (cubeSize * 16);
					}
					if (d.month >= 9 && d.month <= 11) {
						return (getDayOfDate(d.ts) * (cubeSize * self.scale)) + getDayOfDate(d.ts) * (self.gutterSize) + 46 + (cubeSize * 24);
					}
				}

				// returns the day of the given date of the week (0-6, monday-sunday) * squareize to set the Y position (Monday at the top, Sunday at the bottom)
				return (getDayOfDate(d.ts) * (cubeSize * self.scale)) + getDayOfDate(d.ts) * (self.gutterSize);
			})
			.attr("style", function (d, i) {
				if (self.enableAnimations) {
					return `animation: simple-d3-heatmaps-cubeanim 0.25s ease-out ${0.00075 * i}s; animation-fill-mode: backwards;`;
				}
			})
			.attr("width", (cubeSize * this.scale) - (1 * this.scale) )
			.attr("height", (cubeSize * this.scale) - (1 * this.scale) )
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

	// create a color depending on colorMode and minvalue/maxvalue and actual value
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
