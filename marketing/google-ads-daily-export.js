// Google Ads Script — daily performance export for the Bartz-Claim-Acquisition campaign.
//
// What it does: every time it runs, it refreshes a Google Sheet with three tabs
// (Campaigns, Keywords, SearchTerms) covering the last 14 days. Claude's
// google-ads-manager agent reads that sheet to run the weekly check-in.
//
// ONE-TIME SETUP (about 10 minutes, do this after the Ads account exists):
// 1. Create an empty Google Sheet at sheets.google.com. Copy its URL.
// 2. Paste that URL into SPREADSHEET_URL below (between the quotes).
// 3. In Google Ads: Tools & Settings -> Bulk Actions -> Scripts -> the blue "+".
// 4. Paste this entire file, click Authorize (Google will ask twice), then Save.
// 5. Click Preview once to test — the Sheet should fill with data.
// 6. Set Frequency to Daily, 6 AM.
// 7. In the Sheet: File -> Share -> Publish to web -> select "Entire document"
//    and "Comma-separated values (.csv)" -> Publish. Copy that published URL
//    and paste it into a Claude chat so the agent can read it. (Published CSVs
//    are read-only stats — no account access, no login, nothing sensitive.)

var SPREADSHEET_URL = "PASTE_YOUR_GOOGLE_SHEET_URL_HERE";

function main() {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);

  exportReport(ss, "Campaigns",
    "SELECT segments.date, campaign.name, metrics.cost_micros, metrics.impressions, " +
    "metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions, " +
    "metrics.cost_per_conversion " +
    "FROM campaign WHERE segments.date DURING LAST_14_DAYS " +
    "AND campaign.status != 'REMOVED' ORDER BY segments.date DESC");

  exportReport(ss, "Keywords",
    "SELECT ad_group.name, ad_group_criterion.keyword.text, " +
    "ad_group_criterion.keyword.match_type, ad_group_criterion.status, " +
    "metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.average_cpc, " +
    "metrics.conversions, metrics.search_impression_share " +
    "FROM keyword_view WHERE segments.date DURING LAST_14_DAYS " +
    "ORDER BY metrics.cost_micros DESC");

  exportReport(ss, "SearchTerms",
    "SELECT search_term_view.search_term, ad_group.name, metrics.impressions, " +
    "metrics.clicks, metrics.cost_micros, metrics.conversions " +
    "FROM search_term_view WHERE segments.date DURING LAST_14_DAYS " +
    "ORDER BY metrics.cost_micros DESC");

  var stamp = ss.getSheetByName("Meta") || ss.insertSheet("Meta");
  stamp.clear();
  stamp.getRange(1, 1, 2, 2).setValues([
    ["last_updated", new Date().toISOString()],
    ["account", AdsApp.currentAccount().getName()]
  ]);
}

function exportReport(ss, tabName, gaql) {
  var sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
  sheet.clear();
  AdsApp.report(gaql).exportToSheet(sheet);
}
