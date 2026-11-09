// This file contains the cards' help: the texts shown by a card's help button, and the functions
// that show them. A card's help is chosen in its layout entry (smpgOpts.help, one of the ids of
// HELP_TEXTS). The texts are part of the report, so they work without internet; only the link to
// the user guide needs a connection. They describe the cards' charts and tables, so they change
// with the charts' titles, series and table texts.

"use strict";

const HELP_GUIDE_URL = "https://help.fews.net/en/tools/v3/smpg-tool";

// Shared by the cards that show the start of season
const HELP_SOS_RULE = `<p><b>How the start of season (SOS) is detected.</b> A period is a candidate
when its rainfall reaches the 1st threshold and the next period has rain. The start is confirmed
when the two periods after the candidate together reach the 2nd threshold. The thresholds are set
in the plugin's Rainy Season Detection Preferences:</p>
<ul>
<li><b>Fixed Threshold</b>: both in mm.</li>
<li><b>Percent of Climatology</b>: the 1st as a percent of the candidate period's climatology
average, the 2nd as a percent of the climatology average of the second period after it; the mm
thresholds are the fallback.</li>
</ul>
<p>The same rule runs over the monitoring season of the current year and of every climatology year.
A candidate that isn't confirmed yet is a <b>Possible Start</b>. The <b>Median SOS of
Climatology</b> is the median start of the climatology years that started. The <b>SOS anomaly</b> is
how many periods the current start is early or late compared with it; <b>Yet to Start</b> while
there is no start to compare.</p>`;

const HELP_ENSEMBLE = `<p><b>What it shows.</b> Possible ends of the season. Each scenario is the
rainfall observed so far, completed with the rainfall of one year from the next period to the end
of the season.</p>
<p><b>Scenario</b> = Current Accumulation + rainfall of year <i>y</i> from the next period to the
end of the season.</p>
<ul>
<li>Thin lines: one scenario per selected year. Click one to make its year the year in view.</li>
<li><b>Ensemble Med.</b> (black, dashed): the median of the scenarios.</li>
<li><b>Current Season Accumulation</b> (blue): the rainfall added up so far this season.</li>
<li><b>LTA</b> (red) and <b>LTA±20%</b> (band): the climatology average.</li>
<li>Dots at the end of the season. Climatology: <b>LTA±St. Dev.</b> (green) and the 33rd and 67th
percentiles, <b>(33, 67) Pctl.</b> (black), which bound the normal range. Ensemble: <b>E. LTA±St.
Dev.</b> (orange), the scenarios' average ± the selected years' standard deviation, and <b>E. (33,
67) Pctl.</b> (purple), the percentiles of the scenarios.</li>
</ul>
<p><b>Tables.</b> <b>Sel. Yrs.</b> builds the scenarios with the selected years; <b>Clim.</b> with
all the climatology years. Each column compares with its own average, but both use the normal range
of the climatology. The first rows of <b>EOS Statistics</b> (LTA and St. Dev.) describe the season
totals of the years, not the ensemble.</p>
<ul>
<li><b>Ensemble Med. Pct. of Avg.</b> = Ensemble Med. ÷ LTA × 100.</li>
<li><b>Ensemble Med. Pctl.</b>: the percentile of the median among the season totals of all past
seasons.</li>
<li><b>Below Normal</b> = scenarios with a season total below the 33rd percentile of the
climatology ÷ all scenarios × 100.</li>
<li><b>Normal</b>: from the 33rd percentile (included) to the 67th (not included). <b>Above
Normal</b>: at or above the 67th.</li>
</ul>
<p>Each scenario has the same weight: with <i>n</i> years, the probabilities move in steps of
100 ÷ <i>n</i> % (about 14 % with 7 selected years).</p>`;

const HELP_PERCENTILES = `<p><b>What it shows.</b> The current season's accumulation up to the
current period, ranked among all past seasons in the data.</p>
<ul>
<li>One bar per past season (light blue): its rainfall from the start of the monitoring season up to
the same period. The last bar (blue) is the current season. Click a bar to make its year the year in
view.</li>
<li><b>Climatology Average</b> (red line): the average of the climatology years for the same
periods.</li>
<li><b>67 Pctl.</b> and <b>33 Pctl.</b>: the upper and lower limits of the normal range.</li>
<li><b>D1</b> to <b>D4</b>: drought thresholds at the 21st, 11th, 6th and 3rd percentiles.</li>
</ul>
<p><b>Percentile</b> = the share of past seasons with less rainfall by the same period (ties count
half): low percentiles are dry seasons, high ones wet. Every past season in the rainfall file
counts, not only the climatology years.</p>`;

// Shared by the Rich Text cards: editing their text
const HELP_RICH_TEXT_EDIT = `<p>In the report's edit mode, the card's edit button opens the
editor: the text can be changed, and values inserted with the template variable button. The text is
saved with the report.</p>`;

const HELP_TEXTS = {
    "current-year-status": {
        title: "Current Year Status",
        html: `<p><b>What it shows.</b> The rainfall of each period of the current calendar year,
compared with the average. It is the first view of the rainy season: how each period compares with
the average, and when the season started. It is the only chart not limited to the monitoring
season, which is the shaded area.</p>
<ul>
<li><b>Current Season</b> (blue bars): the rainfall of each period of the current year.</li>
<li><b>Forecast</b> (pink bars): the rainfall forecast for the next periods.</li>
<li><b>Climatology Average</b> (red line): the average rainfall of each period over the climatology
years.</li>
<li>With a year in view, its rainfall of each period, to compare.</li>
<li>Vertical lines: <b>SOS of Current Season</b> (blue), the start of season detected this year,
or <b>Possible SOS</b> while it isn't confirmed; <b>Median SOS of Climatology</b> (red), the typical
start; and <b>SOS of Forecast</b> (pink), the start with the forecast added, when the forecast
changes it.</li>
</ul>
<p><b>Start of Season (SOS) table</b>, when the start of season detection is on: Current SOS,
Median SOS of Climatology, SOS anomaly (how many periods early or late), and the SOS and anomaly
with the forecast added when the forecast changes them. Without a current season, only the Median
SOS of Climatology. The season's LTA and St. Dev. are in the Ensemble tables.</p>
${HELP_SOS_RULE}`,
    },
    "seasonal-accumulations": {
        title: "Seasonal Accumulations",
        html: `<p><b>What it shows.</b> The rainfall added up from the start of the monitoring
season, compared with the average for the same periods.</p>
<ul>
<li><b>Current Season Accumulation</b> (thick blue line): the rainfall added up so far this
season.</li>
<li><b>Forecast Accumulation</b> (pink): the same, continued with the forecast inside the
season.</li>
<li><b>LTA</b> (red line) and <b>LTA±20%</b> (shaded band): the average accumulation of the
climatology years.</li>
<li><b>LTA (Sel. Yrs.)</b> (dark red line): the average accumulation of the selected years.</li>
<li>Thin lines: the accumulation of each selected year. Click one to make its year the year in
view.</li>
<li>Dots at the end of the season: <b>LTA±St. Dev.</b> (green) and <b>(33, 67) Pctl.</b> (black),
from the climatology years' season totals; the percentiles are the limits of the normal range.</li>
<li>Dashed vertical line: the current period, the last one with observed data.</li>
</ul>
<p><b>Tables.</b> Click an underlined value to show or hide its dot on the chart.</p>
<ul>
<li><b>LTA</b>: the average accumulation up to the current period, for the selected years
(<b>Sel. Yrs.</b>) and for the climatology years (<b>Clim.</b>).</li>
<li><b>% of Average</b> = Current Accumulation ÷ LTA × 100, for each column.</li>
<li><b>Current Accumulation</b>: the rainfall added up to the current period.</li>
<li><b>Accumulation with Forecast</b>: the current accumulation plus the forecast inside the
season.</li>
</ul>
<p>Without a current season, the table shows the LTA at the end of the season.</p>`,
    },
    "seasonal-accumulation-percentiles": {
        title: "Seasonal Accumulation Percentiles",
        html: HELP_PERCENTILES,
    },
    "seasonal-accumulation-percentiles-with-forecast": {
        title: "Seasonal Accumulation Percentiles with Forecast",
        html: HELP_PERCENTILES + `<p><b>With Forecast</b>: each season has two bars, one in front
of the other: its accumulation up to the current period, and behind it, the taller one up to the
end of the forecast (green; pink for the current season). The lines, the percentiles and the
<b>Forecast Pctl.</b> are taken at the end of the forecast.</p>`,
    },
    "ensemble": {
        title: "Ensemble",
        html: HELP_ENSEMBLE,
    },
    "ensemble-with-forecast": {
        title: "Ensemble with Forecast",
        html: HELP_ENSEMBLE + `<p><b>With Forecast</b>: the forecast is added after the last
observed period (<b>Forecast Accumulation</b>, pink), and the scenarios continue after it. The
statistics "w. Forecast" are the same, with these scenarios.</p>`,
    },
    "map": {
        title: "Map",
        html: `<p><b>What it shows.</b> One statistic for every place, so you can see where the
selected place stands within the region. The selected place has a dashed outline; click a place to
select it.</p>
<p>The settings button opens the <b>Map Parameters</b>: the places' labels, the statistic shown
(<b>Selected Map Stat</b>), which classes its legend lists (or <b>Hide</b> for no legend), and its
description.</p>
<p><b>Which years.</b> Maps in % of average compare with the climatology LTA. Ensemble and
probability maps use the <b>selected years</b>, like the Briefing. Percentile maps rank among every
past season.</p>
<table class="w3-table report-dialog-table">
<tr><th>Map</th><th>What it shows</th></tr>
<tr><td>Current Accumulation to Present</td><td>Rainfall from the start of the monitoring season to the current period (mm).</td></tr>
<tr><td>Average Total</td><td>Average rainfall of the whole season, climatology years (mm).</td></tr>
<tr><td>Current Period Pct. of Avg.</td><td>Rainfall of the <b>last period only</b> ÷ its average × 100.</td></tr>
<tr><td>Total up to Current Period Pct. of Avg.</td><td>Current Accumulation ÷ LTA up to the current period × 100.</td></tr>
<tr><td>Total up to Forecast Pct. of Avg.</td><td>(Current Accumulation + forecast inside the season) ÷ LTA up to the end of the forecast × 100.</td></tr>
<tr><td>Forecast 1st (2nd, 3rd) Period Pct. of Avg.</td><td>Forecast of that period ÷ its average × 100.</td></tr>
<tr><td>Forecast Accumulation Pct. of Avg.</td><td>Forecast of all its periods ÷ their average × 100.</td></tr>
<tr><td>Current Season Pctl.</td><td>Share of past seasons with less rainfall by the same period.</td></tr>
<tr><td>Forecast Pctl.</td><td>The same, by the end of the forecast.</td></tr>
<tr><td>Ensemble Med. Pct. of Avg. (w. Forecast)</td><td>Median of the scenarios ÷ LTA × 100, selected years.</td></tr>
<tr><td>Ensemble Med. Pctl. (w. Forecast)</td><td>Percentile of that median among past season totals, selected years.</td></tr>
<tr><td>Probability Below Normal (w. Forecast)</td><td>Scenarios below the 33rd percentile ÷ all scenarios × 100.</td></tr>
<tr><td>Probability of Normal (w. Forecast)</td><td>Scenarios from the 33rd to the 67th percentile ÷ all × 100.</td></tr>
<tr><td>Probability Above Normal (w. Forecast)</td><td>Scenarios at or above the 67th percentile ÷ all × 100.</td></tr>
<tr><td>Start of Season</td><td>Period when the season started (see the Current Year Status help).</td></tr>
<tr><td>Start of Season Anomaly</td><td>Periods early or late, compared with the median start.</td></tr>
<tr><td>Forecast Start of Season (Anomaly)</td><td>The same, with the forecast added.</td></tr>
<tr><td>Year in View: % of Average</td><td>With a year in view, its accumulation up to the current period ÷ LTA × 100.</td></tr>
</table>`,
    },
    "polygon-briefing": {
        title: "Polygon Briefing",
        html: `<p><b>What it shows.</b> The selected place in words: how its season compares with
the average and with past seasons, and the probability of ending the season below normal with the
selected (analog) years, with and without the forecast when there is one. Its numbers come from the
same statistics as the charts, and follow the selected place.</p>
${HELP_RICH_TEXT_EDIT}`,
    },
    "monitoring-report": {
        title: "Monitoring Report",
        html: `<p><b>What it shows.</b> The analysts' written report on the season. Its links can
change the map's statistic or a card's chart, to show what the text describes.</p>
${HELP_RICH_TEXT_EDIT}`,
    },
    "rich-text": {
        title: "Text",
        html: `<p><b>What it shows.</b> Text written for this report. Its values (rainfall,
percentages, dates) can follow the selected place: they are filled in from the same statistics as
the charts.</p>
${HELP_RICH_TEXT_EDIT}`,
    },
};

/**
 * Whether a help id is one of HELP_TEXTS'.
 * @param {string} helpId - A card's help id (smpgOpts.help).
 * @returns {boolean}
 */
function hasHelp(helpId) {
    return typeof helpId === "string" && Object.prototype.hasOwnProperty.call(HELP_TEXTS, helpId);
}

/**
 * Opens a help text in the help window.
 * @param {string} helpId - One of HELP_TEXTS' ids.
 */
function openHelp(helpId) {
    if (!hasHelp(helpId)) { return; }
    const help = HELP_TEXTS[helpId];
    const dialog = getDialog("helpDialog", {
        title: "Help",
    });
    dialog.modal.select("header > h3").text(`Help: ${help.title}`);
    dialog.body.html(`${help.html}<p>More in the
<a href="${HELP_GUIDE_URL}" target="_blank" rel="noopener">SMPG user guide</a> (needs internet).</p>`);
    dialog.open();
}
