const csv = require("csvtojson");
const fs = require("fs");
(async () => {
  const jsonArray = await csv().fromFile("./csvs/enphaseVDropTable.csv");
  fs.writeFileSync("./enphaseVDropTable.json", JSON.stringify(jsonArray, null, 2));
})();