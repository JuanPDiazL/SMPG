// This file contains the cards' help: the texts shown by a card's help button, and the functions
// that show them. A card's help is chosen in its layout entry (smpgOpts.help, one of the ids of
// HELP_TEXTS). The texts are part of the report, so they work without internet; only the link to
// the user guide needs a connection. They describe the cards' charts and tables, so they change
// with the charts' titles, series and table texts.

"use strict";

const HELP_GUIDE_URL = "https://help.fews.net/en/tools/v3/smpg-tool";

// Shared by the cards that show the start of season
const HELP_SOS_RULE = `<p><b>How the start of season (SoS) is detected.</b> The rule runs over the
monitoring season, with the same thresholds for the current season and for every climatology year,
as set in the plugin's Rainy Season Detection Preferences.</p>
<ul>
<li><b>Fixed Threshold (mm)</b>: a period is a candidate when its rainfall reaches the 1st threshold
and the next period has rain. The start is confirmed when the two periods after the candidate add
up to the 2nd threshold.</li>
<li><b>Percent of Climatology (%)</b>: the same rule, with the 1st threshold as a percent of the
candidate period's climatology average, and the 2nd as a percent of the climatology average of the
second period after it. The fixed thresholds in mm are used as a fallback.</li>
</ul>
<p>A candidate that isn't confirmed is a <b>Possible Start</b>. The <b>SoS of Historical Avg.</b>
is the median start of the climatology years that started. The <b>SoS Anomaly</b> is how many
periods the current start is early or late compared with it; <b>Yet to Start</b> while there is
no start to compare.</p>`;

const HELP_ENSEMBLE = `<p><b>What it shows.</b> Possible ends of the season. Each scenario is the
current season's accumulation, continued with the rainfall of one year from the next period to the
end of the season.</p>
<ul>
<li>One line per scenario, for each of the selected years.</li>
<li><b>Ensemble Med.</b> (black, dashed): the median of the scenarios.</li>
<li><b>Current Season Accumulation</b> (blue): the rainfall added up so far this season.</li>
<li><b>LTA</b> (red) and <b>LTA±20%</b> (band): the average accumulation of the climatology years.</li>
<li>Dots at the end of the season: <b>LTA±St. Dev.</b> (green) and <b>(33, 67) Pctl.</b> (black),
from the climatology years' season totals; <b>E. LTA±St. Dev.</b> (orange), the scenarios' average
± the selected years' standard deviation; and <b>E. (33, 67) Pctl.</b> (blue), the 33rd and 67th
percentiles of the scenarios' totals.</li>
</ul>
<p><b>Tables.</b> <b>Sel. Yrs.</b> builds the scenarios with the selected years, <b>Clim.</b> with
the climatology years.</p>
<ul>
<li><b>Projection at EoS</b>: the scenarios' median, the season's LTA, the median as a percent of
the LTA, and the median's percentile among the season totals of every past season.</li>
<li><b>Probability at EoS</b>: the share of scenarios that end the season below normal (under the
33rd percentile of the climatology years' season totals), normal (from the 33rd up to the 67th) or
above normal (the 67th or more). Every scenario counts the same.</li>
</ul>`;

const HELP_PERCENTILES = `<p><b>What it shows.</b> The current season's accumulation, ranked among
every past season in the data: each bar (light blue) is a season's rainfall from the start of the
monitoring season up to the same period, and the last bar (blue) is the current season.</p>
<ul>
<li><b>Climatology Average</b> (red): the climatology years' average accumulation up to that period.</li>
<li><b>67 Pctl.</b> and <b>33 Pctl.</b>: the limits of the normal range.</li>
<li><b>D1</b> to <b>D4</b>: the 21st, 11th, 6th and 3rd percentiles, for drier and drier seasons.</li>
</ul>
<p>The percentiles are taken over every past season, not only the climatology years. The
<b>Current Season Pctl.</b> is the share of past seasons with less rainfall by the same period
(ties count half).</p>`;

const HELP_TEXTS = {
    "current-year-status": {
        title: "Current Year Status",
        html: `<p><b>What it shows.</b> The current season period by period, over the whole year,
compared with the climatology average. The shaded area is the monitoring season.</p>
<ul>
<li><b>Current Season</b> (blue bars): the rainfall of each period.</li>
<li><b>Forecast</b> (pink bars): the forecast rainfall of the next periods.</li>
<li><b>Climatology Average</b> (red): the average rainfall of each period over the climatology years.</li>
<li>Vertical lines: <b>SoS of Current Season</b> or <b>Possible SoS</b> (blue), <b>SoS of
Historical Avg.</b> (red) and, with a forecast, <b>SoS of Forecast</b> (pink).</li>
</ul>
<p><b>Tables.</b> <b>Seasonal Analysis</b>: the LTA and standard deviation of the season totals,
for the selected years (<b>Sel. Yrs.</b>) and the climatology years (<b>Clim.</b>). <b>Rainy Season
Status</b>: the start of season and its anomaly, also with the forecast.</p>
${HELP_SOS_RULE}`,
    },
    "seasonal-accumulations": {
        title: "Seasonal Accumulations",
        html: `<p><b>What it shows.</b> The rainfall added up from the start of the monitoring
season, compared with past seasons.</p>
<ul>
<li><b>Current Season Accumulation</b> (blue): the current season so far.</li>
<li><b>Forecast Accumulation</b> (pink): the same, continued with the forecast.</li>
<li><b>LTA</b> (red) and <b>LTA±20%</b> (band): the average accumulation of the climatology years.</li>
<li><b>LTA (Sel. Yrs.)</b> (dark red): the average accumulation of the selected years.</li>
<li><b>Median</b> (black): the climatology years' median accumulation.</li>
<li>One thin line per selected year.</li>
<li>Dashed vertical line: the current period, the last one with observed data.</li>
<li>Dots at the end of the season: <b>LTA±St. Dev.</b> (green) and <b>(33, 67) Pctl.</b> (black),
from the climatology years' season totals.</li>
</ul>
<p><b>Table.</b> <b>LTA up to Current Period</b>: the average accumulation up to the current period,
for the selected years (<b>Sel. Yrs.</b>) and the climatology years (<b>Clim.</b>). <b>Total up to
Current Period Pct. of Avg.</b>: the current accumulation as a percent of it. Then the current
accumulation, and with a forecast, the accumulation including it. Without a current season, the
table shows the LTA at the end of the season.</p>`,
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
        html: HELP_ENSEMBLE + `<p><b>With Forecast</b>: the scenarios start after the forecast, which
is added to the current season first (<b>Forecast Accumulation</b>, pink).</p>`,
    },
    "map": {
        title: "Map",
        html: `<p><b>What it shows.</b> One statistic for every place, to compare the selected
place with the others. Click a place to select it; the selected place has a dashed outline.</p>
<p>The settings button opens the <b>Map Parameters</b>: the places' labels, the statistic shown
(<b>Selected Map Stat</b>), which classes its legend lists (or no legend), and its description,
which explains the statistic.</p>
<p><b>Which years.</b> The percent of average maps compare with the climatology years. The
ensemble and probability maps use the selected years' scenarios (see the Ensemble help). The
percentile maps rank among every past season.</p>
<table class="w3-table report-dialog-table">
<tr><td>Current Accumulation to Present</td><td>The rainfall from the start of the monitoring season to the current period (mm).</td></tr>
<tr><td>Average Total</td><td>The climatology years' average season total (mm).</td></tr>
<tr><td>Current Period Pct. of Avg.</td><td>The current period's rainfall, as a percent of its climatology average.</td></tr>
<tr><td>Total up to Current Period Pct. of Avg.</td><td>The current accumulation, as a percent of the climatology average accumulation up to the same period.</td></tr>
<tr><td>Ensemble Med. Pct. of Avg.</td><td>The scenarios' median season total, as a percent of the LTA.</td></tr>
<tr><td>Probability Below Normal, of Normal, Above Normal</td><td>The share of scenarios in each category.</td></tr>
<tr><td>Ensemble Med. Pctl.</td><td>The scenarios' median, ranked among past season totals.</td></tr>
<tr><td>Current Season Pctl.</td><td>The current accumulation, ranked among past seasons at the same period.</td></tr>
<tr><td>Start of Season, Start of Season Anomaly</td><td>The period the season started, and how early or late (see the Current Year Status help).</td></tr>
<tr><td>Forecast statistics</td><td>The same values, with the forecast added to the current season.</td></tr>
<tr><td>Year in View: % of Average</td><td>With a year in view, its accumulation up to the current period, as a percent of the LTA.</td></tr>
</table>`,
    },
    "rich-text": {
        title: "Text",
        html: `<p><b>What it shows.</b> Text written for this report. Its values (rainfall,
percentages, dates) can follow the selected place: they are filled in from the same statistics as
the charts.</p>
<p>In the report's edit mode, the card's edit button opens the editor: the text can be changed,
and values inserted with the template variable button.</p>`,
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
