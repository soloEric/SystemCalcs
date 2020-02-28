const csv = require("csvtojson");
const fs = require("fs");
(async () => {
  const jsonArray = await csv().fromFile("./Book1.csv");
  fs.writeFileSync("./ocpdTable.json", JSON.stringify(jsonArray, null, 2));
})();