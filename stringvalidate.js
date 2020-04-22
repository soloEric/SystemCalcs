

// *************** added 4/8/20 *********************

/**
 * call this before a designer enters in the modules per string values
 * the value returned is the upper bound of what a designer can enter into a single string
 * the lower bound comes from optimizer.min_number_modules_per_string
 * lowerBound <= modulesPerString[i] <= upperBound
 * @param {Object} inverter 
 * @param {Object} solarModule 
 */
function getMaxStringLengthOptimized(inverter, solarModule) {
    if (inverter.type != "Optimized") throw "getMaxStringLength only applies to optimized inverters";
    return Math.floor(inverter.max_input_per_string/solarModule.wattage);
}
/**
 * lower bound for optimized inverter strings: see getMaxstringlengthOptimized description
 * @param {Object} optimizer 
 */
function getMinStringLengthOptimized(optimizer) {
    return optimizer.min_num_modules_per_string;
}
// returns upper bound for number of modules per string
function getMaxStringLengthMicro(inverter) {
    return inverter.max_connected_per_inverter * inverter.max_num_inverters_per_string;
}

// returns lower bound for number of modules per string
function getMinStringLengthMicro(inverter) {
    return inverter.min_num_modules_per_string;
}


/**
 * returns upper bound string input for inverter.type == "String"
 * @param {Object} inverter 
 * @param {Object} solarModule 
 */
function getMaxStringLengthString (inverter, solarModule) {
    if (inverter.type != 'String') throw "getMaxStringLengthString only applies to inverter.type === 'String'"; 
    return Math.floor(inverter.max_input_voltage/solarModule.open_circuit_voltage);
}

/**
 * returns lower bound string input for inverter.type == "String"
 * 
 * @param {Object} inverter 
 * @param {Object} solarModule 
 */
function getMinStringLengthString (inverter, solarModule) {
    if (inverter.type != 'String') throw "getMinStringLengthString only applies to inverter.type === 'String'"; 
    return Math.ceil(inverter.min_mpp_input_voltage/solarModule.mpp_voltage);
}