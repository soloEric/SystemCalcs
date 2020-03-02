const csv = require("csvtojson");
const fs = require("fs");
(async () => {
  const jsonArray = await csv().fromFile("./gauge_table.csv");
  fs.writeFileSync("./gaugeTable.json", JSON.stringify(jsonArray, null, 2));
})();