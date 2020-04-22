/**
 * returns an array of the number of inverters found in each string
 * This is a unique value for multiple input inverters
 * Its only necessary to call this function when the inverter.type === "Micro"
 * the values returned show up in the csv and are datalinked to cad
 * @param {Array} modulesPerString list of the number of modules in the string 
 * @param {Object} inverter the inverter object
 */
function GetNumInverters(modulesPerString, inverter) {
    if (inverter.type != 'Micro') throw "User specifies number of inverters";
    let invertersPerString = [];
    let totalInv = 0;
    for (let i = 0; i < modulesPerString.length; ++i) {
        let numInverters = Math.ceil(modulesPerString[i] / inverter.modules_per_inverter); //modules_per_inverter == max connected panels or max panels per inverter
        invertersPerString.push(numInverters);
        totalInv += numInverters;
    }

    return { totalInverters: totalInv, invertersPerString: invertersPerString };
}

/**
 * This returns an object showing the designer the DC:AC ratio and whether it is valid
 * This tells the designer if they need to upsize or downsize the inverter object (switch to 
 * a smaller or larger inverter)
 * Intended to be called on the equipment info page of the Cad tool
 * this will be called each time the inverter object is selected/changed (designer needs to be able to 
 * change the selected equipment)
 * display the ratio value to the designer along with a message indicating the value is 
 * valid or not, eg. if valid == true msg("Inverter size is valid")
 * if valid == false msg("Inverter size is too small")
 * @param {Float} systemSize  call CalculateSystemSize
 * @param {Object} inverter only applies to inverter.type != "Micro"
 * @param {Integer} numInverters this should only be 1 or 2 for string/optimized inverters
 * @param {Integer} ratioThreshold comes from the company object (preferred acDcRatio which is usually 125)
 * Note: requires "Rated AC Power" and "Max Input Power" to be filled out in the inverter object
 * company object needs field "Preferred DC AC Ratio"
 */
function dcAcRatio(systemSize, inverter, numInverters, ratioThreshold) {
    if (ratioThreshold == undefined || ratioThreshold == null) {
        ratioThreshold = (Math.round(inverter.max_dc_input_power / inverter.rated_ac_power) * 100);
    }
    let ratio = Math.round(((systemSize * 1000) / inverter.rated_ac_power) * 100) / numInverters; // percentage
    let valid = false;
    if (ratio <= ratioThreshold) valid = true;
    return { ratio: ratio, valid: valid };
}