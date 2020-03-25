// return just the name key of the dwg for sql lookup
function SelectStringsDwgName(inverter, numStrings) {
    const strOpt = "str_opt_";
    const enphase = "enphase_";
    const multi = "mult_input_";
    const ending = "_string";
    const maxEnphase = 6;
    const maxOther = 5;
    let lookupName;
    let num;

    // changing string number if it is too low or too high
    // this gives the designer a drawing that is closest to the number
    // of strings they will need which they can then edit manually
    if (numStrings < 1) {
        num = 1;
        numStrings = 1; // in case it goes into micro branch
    }
    else if (numStrings > maxOther) num = maxOther;
    else num = numStrings;
    // make new lookup table for just strings drawings or by type/manufacturer
    // get inverter type
    if (inverter.type === "String" || inverter.type === "Optimized") {
        //all string inverters optimized or not
        lookupName = strOpt + num + ending;
    } else {
        if (inverter.type === "Micro") {
            if (numStrings > maxEnphase) num = maxEnphase;
            else num = numStrings;
            if (inverter.manufacturer === "Enphase") {
                // get dwg from enphase table?
                lookupName = enphase + num + ending;
            } else {
                lookupName = multi + num + ending;
            }
        }
    }
    return lookupName;
}

module.exports = { SelectStringsDwgName };