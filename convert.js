const csv = require("csvtojson");
const fs = require("fs");
(async () => {
  const jsonArray = await csv().fromFile("./csvs/conduitSizeTable.csv");
  fs.writeFileSync("./conduitSizeTable.json", JSON.stringify(jsonArray, null, 2));
})();