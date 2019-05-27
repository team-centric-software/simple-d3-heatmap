README
======

Description
-----------------

This Module allows you to create nicely looking heatmaps with ease. You can choose between the yearly, monthly and weekly format.

Getting Started
-----------------

#### Installation

Embed the `d3-heatmap.js` aswell as [d3.js](https://d3js.org/) in your HTML

```html
<script src="d3.js"></script>
<script src="d3-heatmap.js"></script>
```

#### Basic Usage

```html
<div id="calendarContainer"></div>
<script>
	const heatmap = new HeatmapGenerator();
	heatmap.weekly("calendarContainer", data);
</script>
```

Documentation
-----------------

Documentation aswell as data formats can be found [here](DOCUMENTATION.md)