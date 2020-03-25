const csv = require("csvtojson");
const fs = require("fs");
(async () => {
  const jsonArray = await csv().fromFile("./csvs/interconDwgTable.csv");
  fs.writeFileSync("./interconDwgTable.json", JSON.stringify(jsonArray, null, 2));
})();