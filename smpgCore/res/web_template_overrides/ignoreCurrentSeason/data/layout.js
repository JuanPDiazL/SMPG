var layout = {
    "general": {
        "gridstack": {
            "xResolution": 12,
            "yResolution": 8,
            "widgetWidth": 0.3333333333333333,
            "widgetHeight": 0.5
        }
    },
    "gridstackWidgets": {
        "w6": {
            "smpgOpts": {
                "smpgCardType": "Rich Text",
                "title": "Polygon Briefing",
                "showHeader": false,
                "editor": {
                    "editMode": false,
                    "text": "<h3>Analog-years outlook for {{ place }}</h3>\n<p>For the [{{ season }}] window, the {{ climatology }} long-term average (LTA) rainfall in {{ place }} is <strong>{{ round(stat(place, \"Average Total\"), 0) }} mm</strong>. In a typical year the season total falls between <strong>{{ round(place_general_stats[place][\"Climatology 33 Pctl.\"], 0) }} and {{ round(place_general_stats[place][\"Climatology 67 Pctl.\"], 0) }} mm</strong> (33rd to 67th percentile).</p>\n<p>The outlook uses the analog years {{ analog_years }}, each taken as one scenario. Their median season total is <strong>{{ round(stat(place, \"Ensemble Med. Pct. of Avg.\"), 0) }}%</strong> of the LTA, at the <strong>{{ round(stat(place, \"Ensemble Med. Pctl.\"), 0) }}th percentile</strong> of the historical distribution.</p>\n<p>The chance of ending the season below normal is <strong>{{ round(stat(place, \"Probability Below Normal\"), 0) }}%</strong>, normal <strong>{{ round(stat(place, \"Probability of Normal\"), 0) }}%</strong> and above normal <strong>{{ round(stat(place, \"Probability Above Normal\"), 0) }}%</strong>. Below normal is a season total under the 33rd percentile of the historical distribution, and above normal one over the 67th.</p>\n<blockquote>\n<p><a href=\"./index.html#modify_layout=%7B%22w7%22%3A%7B%22unloaded%22%3Atrue%7D%2C%22w2%22%3A%7B%22unloaded%22%3Afalse%7D%7D\">Open the full Monitoring Report</a> for seasonal context, methodology, maps, and analyst notes.</p>\n</blockquote>"
                }
            },
            "gridstackOpts": {
                "width": 1,
                "height": 0.75,
                "xPos": 0,
                "yPos": 0
            }
        },
        "w7": {
            "smpgOpts": {
                "smpgCardType": "Seasonal Accumulations",
                "showHeader": true,
                "table": {
                    "tableShown": false
                }
            },
            "gridstackOpts": {
                "width": 1,
                "height": 1,
                "xPos": 1,
                "yPos": 0
            }
        },
        "w3": {
            "smpgOpts": {
                "smpgCardType": "Current Year Status",
                "showHeader": true,
                "table": {
                    "tableShown": false
                }
            },
            "gridstackOpts": {
                "width": 1,
                "height": 1,
                "xPos": 2,
                "yPos": 0
            }
        },
        "w1": {
            "smpgOpts": {
                "smpgCardType": "Map",
                "showHeader": true,
                "map": {
                    "label_field": "ADM2_NAME",
                    "legend_stat": "Ensemble Med. Pct. of Avg.",
                    "show_legend": true
                },
                "mapDescription": {
                    "show_description": false
                }
            },
            "gridstackOpts": {
                "width": 1,
                "height": 1.25,
                "xPos": 0,
                "yPos": 0.75
            }
        },
        "w4": {
            "smpgOpts": {
                "smpgCardType": "Ensemble",
                "showHeader": true,
                "table": {
                    "tableShown": true
                }
            },
            "gridstackOpts": {
                "width": 1,
                "height": 1,
                "xPos": 1,
                "yPos": 1
            }
        },
        "w5": {
            "smpgOpts": {
                "smpgCardType": "Seasonal Accumulation Percentiles",
                "showHeader": true,
                "table": {
                    "tableShown": false
                }
            },
            "gridstackOpts": {
                "width": 1,
                "height": 1,
                "xPos": 2,
                "yPos": 1
            }
        },
        "w2": {
            "unloaded": true,
            "smpgOpts": {
                "smpgCardType": "Rich Text",
                "title": "Monitoring Report",
                "showHeader": true,
                "editor": {
                    "editMode": false,
                    "text": "<blockquote>\n<p>Contents</p>\n<nav class=\"text-toc\" contenteditable=\"false\">Table of contents</nav></blockquote>\n<h3 id=\"sec-intro\" style=\"box-sizing: inherit; font-size: 1.25em; font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold; margin: 0.6em 0px 0.5em; padding-top: 0px; border-top-width: medium; border-top-style: none; border-top-color: currentcolor; scroll-margin-top: 174.688px; color: #000000; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">1. Introduction</h3>\n<p style=\"box-sizing: inherit; margin: 0.5em 0px; text-align: justify; hyphens: auto; color: #000000; font-family: Verdana, sans-serif; font-size: 14.25px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">This preliminary report covers the [{{ season }}] monitoring window (the Central America and Caribbean rainy season) across 1,411 administrative units spanning Costa Rica, El Salvador, Guatemala, Nicaragua, Honduras, Panama, Haiti, the Dominican Republic, and Belize. Conditions are described from the Total up to Current Period Pct. of Avg. map field, the same indicator used to identify the most impacted areas below. Rainfall estimates are from CHIRPS v3. The analysis uses seven analog years: {{ analog_years }} as analog years for the remainder of the season.</p>\n<p class=\"report-text-see\" style=\"box-sizing: inherit; font-size: 0.88em; color: #546e7a; border-left: 3px solid rgb(207, 216, 220); padding-left: 0.7em; text-align: justify; margin: 0.5em 0px; hyphens: auto; font-family: Verdana, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">See: <a href=\"./index.html#modify_layout=%7B%22w3%22%3A%7B%22smpgCardType%22%3A%22Seasonal%20Accumulations%22%7D%7D\">Seasonal Accumulations</a> for the historical year-by-year accumulation for any location you select.</p>\n<p class=\"report-text-note\" style=\"box-sizing: inherit; font-size: 0.88em; color: #757575; border-top: 1px solid rgb(224, 224, 224); padding-top: 0.8em; margin: 0.5em 0px; text-align: justify; hyphens: auto; font-family: Verdana, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\"><em style=\"box-sizing: inherit;\">[Analyst: add context here on what this rainy season represents agronomically for Central America and the Caribbean, the countries or livelihood zones most dependent on it, and any relevant climate drivers (e.g. the current El Ni&ntilde;o signal, which is why these particular analog years were selected) &mdash; none of that is derived from this report's data and needs to be added by hand.]</em></p>\n<h3 id=\"sec-climate\" style=\"box-sizing: inherit; font-size: 1.25em; font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold; margin: 2em 0px 0.5em; padding-top: 1.2em; border-top: 1px solid rgb(221, 225, 227); scroll-margin-top: 174.688px; color: #000000; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">2. Climate of the Season</h3>\n<p style=\"box-sizing: inherit; margin: 0.5em 0px; text-align: justify; hyphens: auto; color: #000000; font-family: Verdana, sans-serif; font-size: 14.25px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">The <a href=\"./index.html#modify_layout=%7B%22w1%22%3A%7B%22map%22%3A%7B%22legend_stat%22%3A%22Average%20Total%22%7D%7D%7D\">Average Total</a> map field shows the full {{ climatology }} climatological average for the entire {{ season }} window (not just up to the current dekad), so it depicts what a typical rainy season looks like across the region independent of how this particular year is going.</p>\n<p class=\"report-text-note\" style=\"box-sizing: inherit; font-size: 0.88em; color: #757575; border-top: 1px solid rgb(224, 224, 224); padding-top: 0.8em; margin: 0.5em 0px; text-align: justify; hyphens: auto; font-family: Verdana, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\"><em style=\"box-sizing: inherit;\">[Analyst: describe here the general shape of a typical Central America/Caribbean rainy season &mdash; including the mid-summer drought (veranillo/canicula) if relevant &mdash; using the Average Total map as reference.]</em></p>\n<h3 id=\"sec-sos\" style=\"box-sizing: inherit; font-size: 1.25em; font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold; margin: 2em 0px 0.5em; padding-top: 1.2em; border-top: 1px solid rgb(221, 225, 227); scroll-margin-top: 174.688px; color: #000000; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">3. Start / End of Season</h3>\n<p class=\"report-text-note\" style=\"box-sizing: inherit; font-size: 0.88em; color: #757575; border-top: 1px solid rgb(224, 224, 224); padding-top: 0.8em; margin: 0.5em 0px; text-align: justify; hyphens: auto; font-family: Verdana, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\"><em style=\"box-sizing: inherit;\">[Placeholder: Start-of-Season detection was not enabled when this report was generated, so no SOS data exists to describe here. Once SOS is run for this dataset, this section will describe how the season started using the <code style=\"box-sizing: inherit; font-family: monospace, monospace; font-size: 1em;\">Start of Season Anomaly</code> field.]</em></p>\n<h3 id=\"sec-current\" style=\"box-sizing: inherit; font-size: 1.25em; font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold; margin: 2em 0px 0.5em; padding-top: 1.2em; border-top: 1px solid rgb(221, 225, 227); scroll-margin-top: 174.688px; color: #000000; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">4. Current Conditions</h3>\n<p style=\"box-sizing: inherit; margin: 0.5em 0px; text-align: justify; hyphens: auto; color: #000000; font-family: Verdana, sans-serif; font-size: 14.25px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">As of the current dekad, half of this report's 1,411 locations have reached 68.3% or less of their long-term average rainfall for this point in the season. Totals range from 30% to 148.2% of each location's own LTA.</p>\n<p style=\"box-sizing: inherit; margin: 0.5em 0px; text-align: justify; hyphens: auto; color: #000000; font-family: Verdana, sans-serif; font-size: 14.25px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">The driest conditions so far cluster in northern Nicaragua, led by Mosonte (Nueva Segovia) at 30% of LTA, followed closely by Totolgalpa (Madriz) (30.5%), Condega (Esteli) (30.6%), Palacaguina (Madriz) (30.7%), and Ocotal (Nueva Segovia) (31%). All five are among the lowest in the region on the percent-of-LTA map.</p>\n<p class=\"report-text-note\" style=\"box-sizing: inherit; font-size: 0.88em; color: #757575; border-top: 1px solid rgb(224, 224, 224); padding-top: 0.8em; margin: 0.5em 0px; text-align: justify; hyphens: auto; font-family: Verdana, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">All percentages come from the <em style=\"box-sizing: inherit;\">Total up to Current Period Pct. of Avg.</em> column of the climatology statistics file, the same indicator used to color the map.</p>\n<h3 id=\"sec-outlook\" style=\"box-sizing: inherit; font-size: 1.25em; font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold; margin: 2em 0px 0.5em; padding-top: 1.2em; border-top: 1px solid rgb(221, 225, 227); scroll-margin-top: 174.688px; color: #000000; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">5. Outlook</h3>\n<p style=\"box-sizing: inherit; margin: 0.5em 0px; text-align: justify; hyphens: auto; color: #000000; font-family: Verdana, sans-serif; font-size: 14.25px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">The <a href=\"./index.html#modify_layout=%7B%22w1%22%3A%7B%22map%22%3A%7B%22legend_stat%22%3A%22Probability%20Below%20Normal%22%7D%7D%7D\">Probability Below Normal</a> map is built from an ensemble of scenarios: observed rainfall up to the current {{ datasetProperties[\"period_unit_id\"] }} is combined with each of the seven analog years: {{ analog_years }} historical rainfall for the rest of the season, producing one possible end-of-season outcome per analog year. The probability shown is the share of those outcomes that fall below the 33rd percentile of the historical distribution &mdash; the threshold used to define a below-normal season.</p>\n<p style=\"box-sizing: inherit; margin: 0.5em 0px; text-align: justify; hyphens: auto; color: #000000; font-family: Verdana, sans-serif; font-size: 14.25px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\"><a href=\"./index.html#modify_layout=%7B%22w1%22%3A%7B%22map%22%3A%7B%22legend_stat%22%3A%22Ensemble%20Med.%20Pctl.%22%7D%7D%7D\">Ensemble Med. Pctl.</a> shows the median outcome across the analog years, and can be viewed alongside the full spread on the <a href=\"./index.html#modify_layout=%7B%22w4%22%3A%7B%22smpgCardType%22%3A%22Ensemble%22%7D%7D\">Ensemble chart</a>.</p>\n<p style=\"box-sizing: inherit; margin: 0.5em 0px; text-align: justify; hyphens: auto; color: #000000; font-family: Verdana, sans-serif; font-size: 14.25px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\"><a href=\"./index.html#modify_layout=%7B%22w3%22%3A%7B%22smpgCardType%22%3A%22Current%20Year%20Status%22%7D%7D\">Current Year Status</a> is a different view of the same period: instead of a single end-of-season probability, it shows the dekad-by-dekad observed rainfall bars against the {{ climatology }} climatology average.</p>\n<p class=\"report-text-note\" style=\"box-sizing: inherit; font-size: 0.88em; color: #757575; border-top: 1px solid rgb(224, 224, 224); padding-top: 0.8em; margin: 0.5em 0px; text-align: justify; hyphens: auto; font-family: Verdana, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: #ffffff; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;\">This is the analyst's text. The always-on-screen Briefing window (left column, above the map) is generated separately from this report's own data and follows whichever location is selected on the map.</p>"
                }
            },
            "gridstackOpts": {
                "width": 1,
                "height": 1,
                "xPos": 1,
                "yPos": 0
            }
        }
    }
};
