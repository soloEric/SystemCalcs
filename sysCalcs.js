/*
Current calcs do not support systems with more than one different type of inverter:
:it can handle micro inverters, more than one string inverters of the same output/partnumber
No battery support
Does not support trenching specific strings and not others
*/
// common acronyms: 
// ocpd = overcurrent protection device - refers to the solar breaker rating
const WS = require('./wireScheduleObjs');
const ocpdTable = require('./jsonTables/ocpdTable.json');
const gaugeTable = require('./jsonTables/gaugeTable.json');
const gaugeAreaTable = require('./jsonTables/gaugeToAreaTable.json'); // All sizes are for Conductor types: THHN, THWN, THWN-2 from chrome-extension://oemmndcbldboiebfnladdacbdfmadadm/https://shop.iccsafe.org/media/wysiwyg/material/8950P229-sample.pdf
const conduitSizeTable = require('./jsonTables/conduitSizeTable.json');
const enphaseVDropTable = require('./jsonTables/enphaseVDropTable.json');
// possibleGauges only reflects what is usual for a residential solar system
const possibleGauges = ["14 AWG", "12 AWG", "10 AWG", "8 AWG", "6 AWG", "4 AWG", "3 AWG", "2 AWG", "1 AWG", "1/0 AWG", "2/0 AWG", "3/0 AWG", "4/0 AWG"];
const defaultWireDist = 10;
const maxConduitFillPercent = 0.4;
const possibleTrenchConduitSizes = [1.5, 2, 2.5, 3];

// Completed by Dev?
function CalculateWholeSystem(interconnection) {
    // get interconnection type
    // get extra equipment if needed
    // get best practices items
    // ? determine number of segments
    // Get Wire Schedule
    // Get fused/solar breaker size
    // if derate, calculate new main
}

/**
 * Fills out a wire schedule object
 * see test outputs for similar format to CAD
 * @param {Integer} numSegments 
 * @param {Array} trenchSegments has segment number and distance
 * @param {Integer} numInverters 
 * @param {Object} inverter 
 * @param {Array} modulesPerString 
 * @param {Object} solarModule 
 * @param {Object} optimizer 
 * @param {Boolean} copperBool 
 * @param {Boolean} tapBool
 * @param {String} wireType
 * @param {String} wireTypeAlt
 * @param {String} groundWireType
 * @param {String} groundWireTypeAlt
 */
// FIXME: wireType, wireTypeAlt, and groundWireType have been hard coded for testing, these should come from best practice or utility objects
function GetWireSchedule(numSegments, trenchSegments, numInverters, inverter, modulesPerString, solarModule, optimizer, copperBool, tapBool, wireType, wireTypeAlt, groundWireType, groundWireTypeAlt) {
    let pvBackfeed = DetermineBackfeed(numInverters, inverter.max_output_current);
    const wireSchedule = [];
    const vDropPrintOuts = [];

    let firstSegAfterInv = GetFirstSegAfterInv(modulesPerString);

    let material;
    if (copperBool) material = "Copper";
    else material = "Aluminum";

    for (let i = 1; i <= numSegments; ++i) {
        let wires = [];
        let dist = defaultWireDist;
        let isTrenched = false;
        // parse trench distance and set isTrenched bool
        for (let j = 0; j < trenchSegments.length; ++j) {
            if (trenchSegments[j].segment == i) {
                dist = trenchSegments[j].distance;
                isTrenched = true;
            }
        }
        let gauge = GetSegmentWireSize(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, i, copperBool, tapBool, firstSegAfterInv);

        // Post MVP: refer to table on derate factor per number of current carrying conductors
        let numPosOrNegWires = CalculateNumCurrentCarryingConductors(i, modulesPerString, numInverters, inverter, firstSegAfterInv);

        //wire type comes from either company best practice or lookup table, these values are for testing
        wireType = "THWN test"
        wireTypeAlt = "other type";

        if (i < firstSegAfterInv && !(inverter.type === "Micro")) {
            wires.push(new WS.Wire(numPosOrNegWires / 2, gauge, wireType, wireTypeAlt, material, "POSITIVE"));
            wires.push(new WS.Wire(numPosOrNegWires / 2, gauge, wireType, wireTypeAlt, material, "NEGATIVE"));
        } else {
            wires.push(new WS.Wire(numPosOrNegWires / 2, gauge, wireType, wireTypeAlt, material, "L1"));
            wires.push(new WS.Wire(numPosOrNegWires / 2, gauge, wireType, wireTypeAlt, material, "L2"));
        }

        if (i >= firstSegAfterInv) {
            wires.push(new WS.Wire(1, gauge, wireType, wireTypeAlt, material, "NEUTRAL"));
        }

        let groundGauge;
        groundWireTypeAlt = "";
        groundWireType = "Test Ground type";
        groundGauge = GetSegmentGroundSize(pvBackfeed, modulesPerString, numInverters, inverter, solarModule, optimizer, dist, i, copperBool, firstSegAfterInv);
        wires.push(new WS.Wire(1, groundGauge, groundWireType, groundWireTypeAlt, material, "GROUND"));

        let conduitCallout = CalculateConduitSize(wires, isTrenched);
        let scheduleItem;
        if (i == 1) {
            scheduleItem = new WS.WireScheduleItem(i, wires, "");
        }
        else if (isTrenched) {
            scheduleItem = new WS.WireScheduleItem(i, wires, "CONDUIT: " + conduitCallout + " 18\" MIN. BURIAL IN DIRT");
        }
        else if (i >= firstSegAfterInv - 1) {
            scheduleItem = new WS.WireScheduleItem(i, wires, "CONDUIT: " + conduitCallout);
        }
        else {
            scheduleItem = new WS.WireScheduleItem(i, wires, "(1)\t" + conduitCallout + " OR FMC");
        }

        wireSchedule.push(scheduleItem);
        vDropPrintOuts.push(VoltageDropToString(gauge.gauge, dist, gauge.maxOutputVolt, gauge.maxOutputCurrent, gauge.vDrop));
    }
    return {
        schedule: wireSchedule,
        voltageDropCalcs: vDropPrintOuts
    }
}

/**
 * Calculate the number of current carrying conductors in a segment
 * @param {Integer} segment 
 * @param {Array} modulesPerString 
 * @param {Integer} numInverters 
 * @param {Object} inverter 
 * @param {Integer} firstSegAfterInv 3 or 4
 */
function CalculateNumCurrentCarryingConductors(segment, modulesPerString, numInverters, inverter, firstSegAfterInv) {
    if (segment == 1) return 2;
    else if (segment > 1 && segment < firstSegAfterInv) { // segment 2 or 3
        if (inverter.type == "Micro" && segment == 3) return modulesPerString.length;
        else if (segment == 3) return (modulesPerString.length / numInverters) * 2;
        else return 2;
    } else return 2;
}

// for MVP we are using ocpdTable for generic temperature derate calcs
/**
 * given a list of wires, calculate the conduit fill and determine conduit size
 * @param {Object Array} wires 
 * @param {Boolean} isTrenched 
 */
function CalculateConduitSize(wires, isTrenched) {
    // for each wire
    let totalArea = 0;
    for (let i = 0; i < wires.length; ++i) {
        // number of wires per type multiplyed by the gauge area is area per wiretype
        let numWires = wires[i].number;
        let gauge = wires[i].gauge.gauge;
        let obGaugeArea = gaugeAreaTable.find(function (e) {
            return e.conductorSize === `${gauge}`;
        });
        if (obGaugeArea == undefined) throw `Error at CalculateConduitSize: gaugeAreaTable.find(${gauge}) returned undefined`;
        let area = obGaugeArea.inchArea;
        totalArea += (area * numWires);
    }
    let minimumConduitSize = totalArea / maxConduitFillPercent;

    let conduitSize = ToNearestFourth(minimumConduitSize);
    if (conduitSize < 0.75) {
        conduitSize = 0.75;
    }
    if (conduitSize > 3) throw "Error at CalculateConduitSize: Conduit size returned larger than max known size";

    if (isTrenched) {
        for (let i = 0; i < possibleTrenchConduitSizes.length; ++i) {
            if (minimumConduitSize < possibleTrenchConduitSizes[i]) {
                conduitSize = possibleTrenchConduitSizes[i];
                break;
            }
        }
    }

    const oConduit = conduitSizeTable.find(function (e) {
        return e.floatSize === `${conduitSize}`;
    });
    if (oConduit == undefined) throw `Error at CalculateConduitSize: conduitSizeTable.find(${conduitSize}) returned undefined`;
    return oConduit.conduitCallout;
}

/**	
 * 
 * Makes a decision on wire gauge for current segment
 * returns the first wire gauge that falls under the accepted voltage drop percentage
 * based on the inverter/module object, or if bigger, the size from the ocpdTable. 
 * Also returns a voltage drop printout per section
 * Note that a different voltage drop calc is done for Enphase systems
 * 
 * @param {Array of Integer} modulesPerString
 * @param {Integer} numInverters
 * @param {Inverter Object} inverter 
 * @param {Module Object} solarModule
 * @param {Optimizer Object} optimizer can be null
 * @param {Integer} dist distance rounded to the nearest foot
 * @param {Integer} segment indicates which segment the voltage calcs are for, switch statement anything greater than 4 is always ac
 * @param {Boolean} copperBool is the wire copper or not? Comes from best practices
 * @param {Boolean} tapBool
 */
function GetSegmentWireSize(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool, tapBool, firstSegAfterInv) {
    let ocpd = DetermineBackfeed(numInverters, inverter.max_output_current);
    let inputs = GetMaxOutCurrentMaxOutVolt(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool, firstSegAfterInv)

    let pair;

    for (let i = 0; i < possibleGauges.length; ++i) {
        let voltageDropPercent;
        if (inputs.vDrop) {
            voltageDropPercent = inputs.vDrop;
        } else {
            voltageDropPercent = GetPercentVoltageDrop(dist, inputs.maxOutputCurrent, inputs.maxOutputVolt, possibleGauges[i], copperBool, inputs.dcBool);
        }
        if (voltageDropPercent <= inverter.max_voltage_drop) {
            pair = {
                gauge: possibleGauges[i], vDrop: voltageDropPercent,
                maxOutputVolt: inputs.maxOutputVolt, maxOutputCurrent: inputs.maxOutputCurrent
            };
            break;
        }
    }
    const oOcpd = ocpdTable.find(function (e) {
        if (inputs.dcBool || (inverter.type === "Micro" && segment < firstSegAfterInv)) {
            return e.pvBackfeed === `${Math.ceil(inputs.maxOutputCurrent / 5) * 5}`;
        } else {
            return e.pvBackfeed === `${ocpd}`;
        }
    });
    if (oOcpd == undefined) throw `Error at GetSegmentWireSize: ocpdTable.find(${ocpd} OR ${Math.ceil(inputs.maxOutputCurrent / 5) * 5}) returned undefined`;

    // rate sizes and select one with larger gauge
    let calcRating = 0;
    let tableRating = 0;
    for (let i = 0; i < possibleGauges.length; ++i) {
        if (pair.gauge === possibleGauges[i]) calcRating = i;
        if (tapBool) {
            if (oOcpd.tapWireSize === possibleGauges[i]) tableRating = i;
        } else {
            if (oOcpd.wireSize === possibleGauges[i]) tableRating = i;
        }
    }

    if (tableRating > calcRating) {
        if (inputs.vDrop) {
            if (tapBool) return {
                gauge: oOcpd.tapWireSize,
                vDrop: parseFloat(inputs.vDrop),
                maxOutputVolt: inputs.maxOutputVolt, maxOutputCurrent: inputs.maxOutputCurrent
            };
            else return {
                gauge: oOcpd.wireSize,
                vDrop: parseFloat(inputs.vDrop),
                maxOutputVolt: inputs.maxOutputVolt, maxOutputCurrent: inputs.maxOutputCurrent
            };
        } else {
            if (tapBool) return {
                gauge: oOcpd.tapWireSize,
                vDrop: GetPercentVoltageDrop(dist, inputs.maxOutputCurrent, inputs.maxOutputVolt, oOcpd.tapWireSize, copperBool, inputs.dcBool),
                maxOutputVolt: inputs.maxOutputVolt, maxOutputCurrent: inputs.maxOutputCurrent
            };
            else return {
                gauge: oOcpd.wireSize,
                vDrop: GetPercentVoltageDrop(dist, inputs.maxOutputCurrent, inputs.maxOutputVolt, oOcpd.wireSize, copperBool, inputs.dcBool),
                maxOutputVolt: inputs.maxOutputVolt, maxOutputCurrent: inputs.maxOutputCurrent
            };
        }
    }
    else return pair;
}

function GetMaxOutCurrentMaxOutVolt(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool, firstSegAfterInv) {
    if (segment < 1) throw `Error at GetMaxOutCurrentMaxOutVolt: Invalid segment number: must be 1 or greater. Segment number was ${segment}`;
    if (!segment || !copperBool) throw "Error at GetMaxOutCurrentMaxOutVolt: missing segment number or copperBool";
    if (inverter == null || inverter == undefined) throw "Error at GetMaxOutCurrentMaxOutVolt: Missing inverter object";
    if (dist == null || dist == undefined) throw "Error at GetMaxOutCurrentMaxOutVolt: Distance field cannot be null";

    let maxOutputVolt;
    let maxOutputCurrent;
    let dcBool;

    if (inverter.type === "Micro") {
        if (segment == 1 && inverter.manufacturer === "Enphase") {
            return GetEnphaseCalc(modulesPerString, inverter);
        }

        if (numInverters == null || numInverters == undefined) throw "Error at GetMaxOutCurrentMaxOutVolt: Missing numInverters field";
        dcBool = false;
        maxOutputVolt = inverter.max_output_voltage;
        if (segment < firstSegAfterInv) {
            maxOutputCurrent = inverter.max_output_current * parseFloat(parseFloat(GetHighest(modulesPerString).toString()).toFixed(2));
        } else {
            maxOutputCurrent = inverter.max_output_current * parseFloat(parseFloat(numInverters.toString()).toFixed(2));
        }
        // console.log(`Segment: ${segment}`, maxOutputCurrent, maxOutputVolt);
    } else if (inverter.type === "String" && segment < firstSegAfterInv) {
        if (solarModule == null || solarModule == undefined) throw "Error at GetMaxOutCurrentMaxOutVolt: Module object missing";
        if (modulesPerString == null || modulesPerString == undefined) throw "Error at GetMaxOutCurrentMaxOutVolt: Array of string sizes missing";
        dcBool = true;
        maxOutputVolt = solarModule.open_circuit_voltage * GetLowest(modulesPerString);
        maxOutputCurrent = solarModule.short_circuit_current;
    } else if (inverter.type === "Optimized" && segment < firstSegAfterInv) {
        // optimized
        if (optimizer == null || optimizer == undefined) throw "Error at GetMaxOutCurrentMaxOutVolt: Optimizer object missing";
        dcBool = true;
        maxOutputVolt = inverter.nominal_dc_input_voltage;
        maxOutputCurrent = optimizer.output_current;
    } else {
        // after the inverter and is a String inverter
        if (numInverters == null || numInverters == undefined) throw "Error at GetMaxOutCurrentMaxOutVolt: numInverters field missing";
        dcBool = false;
        maxOutputVolt = inverter.max_output_voltage;
        maxOutputCurrent = inverter.max_output_current * parseFloat(parseFloat(numInverters.toString()).toFixed(2));
    }
    return { maxOutputVolt: maxOutputVolt, maxOutputCurrent: maxOutputCurrent, dcBool: dcBool }
}

// for MVP this is just a table lookup 
function GetSegmentGroundSize(ocpd, modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool, firstSegAfterInv) {
    let inputs = GetMaxOutCurrentMaxOutVolt(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool, firstSegAfterInv);
    const oOcpd = ocpdTable.find(function (e) {
        if (segment >= firstSegAfterInv) {
            return e.pvBackfeed === `${ocpd}`;
        } else {
            return e.pvBackfeed === `${ToNearestFive(inputs.maxOutputCurrent)}`;
        }
    });
    if (oOcpd == undefined) throw `Error at GetMaxOutCurrentMaxOutVolt: ocpdTable.find(${ocpd} OR ${ToNearestFive(inputs.maxOutputCurrent)}) returned undefined`;
    return { gauge: oOcpd.groundWireSize, vDrop: "NA" };
}
/**
 * Enphase vDrop calc is based off a table provided by the manufacturer
 * @param {Array} modulesPerString 
 * @param {Object} inverter 
 */
function GetEnphaseCalc(modulesPerString, inverter) {
    let numInverters = GetHighest(modulesPerString);
    let maxOutputCurrent;
    const oEnphase = enphaseVDropTable.find(function (e) {
        return e.numInverters === `${numInverters}`;
    });
    if (oEnphase == undefined) throw `Error at GetEnphaseCalc: enphaseVDropTable.find(${numInverters}) returned undefined`;

    switch (inverter.man_part_num) {
        case "IQ7-60-2-US":
            maxOutputCurrent = parseFloat(oEnphase.currentIQ7);

            return { maxOutputVolt: inverter.max_output_voltage, maxOutputCurrent: maxOutputCurrent, dcBool: false, vDrop: oEnphase.vDropIQ7 };

        case "IQ7PLUS-72-2-US":
            maxOutputCurrent = parseFloat(oEnphase.currentIQ7Plus);
            if (maxOutputCurrent === "NA") throw "Error at GetEnphaseCalc: Too many modules in the string";
            return { maxOutputVolt: inverter.max_output_voltage, maxOutputCurrent: maxOutputCurrent, dcBool: false, vDrop: oEnphase.vDropIQ7Plus };

        default:
            throw "Error at GetEnphaseCalc: Inverter not supported";
        // FIXME: ?add other enphase inverters
    }
}
/**
 * returns ACDisco rating 
 * @param {Integer} ocpd or pvBackfeed, call DetermineBackfeed before calling this
 */
function GetACDiscoSize(ocpd) {
    const oOcpd = ocpdTable.find(function (e) {
        return e.pvBackfeed === `${ocpd}`;
    });
    if (oOcpd == undefined) throw `Error at GetACDiscoSize: ocpdTable.find(${ocpd}) returned undefined`;
    if (tapBool) return parseInt(oOcpd.tapAcDisco);
    return parseInt(oOcpd.acDisco);
}

/**
 * returns int of solar breaker/fuse size
 * @param {Integer} numInverters
 * @param {Float} invCurrentOutput 
 * @param {Boolean} fusedBool is the disconnect fused or no
 * @param {Boolean} commonBreakerBool if company doesn't want to use breakers that are multiples of 5, this value is true
 */
function CalculateSolarOcpd(numInverters, invCurrentOutput, fusedBool, commonBreakerBool) {
    const ocpd = DetermineBackfeed(numInverters, invCurrentOutput);
    const oOcpd = ocpdTable.find(function (e) {
        return e.pvBackfeed === `${ocpd}`;
    });

    if (fusedBool || commonBreakerBool) {
        return parseInt(oOcpd.pvBreakerCommonSize);
    } else {
        return parseInt(oOcpd.standardBreakerSize);
    }

}


function GetFirstSegAfterInv(modulesPerString) {
    if (modulesPerString.length > 1) return 4;
    else return 3;
}

function DetermineBackfeed(numInverters, invCurrentOutput) {
    return Math.ceil(((numInverters * invCurrentOutput) * 1.25) / 5) * 5;
}

function ToNearestFourth(num) {
    return Math.ceil(num * 4) / 4;
}

function ToNearestFive(num) {
    return Math.ceil(num / 5) * 5;
}

/**
 * returns float of percent voltage drop for current section
 * @param {Integer} dist 
 * @param {Integer} segCurrent 
 * @param {Integer} segVolt
 * @param {String} gauge ex: 12 AWG, 1/0 AWG
 * @param {Boolean} copperWireBool
 * @param {Boolean} dcBool indicates whether the segment is running dc or ac
 */
function GetPercentVoltageDrop(dist, segCurrent, segVolt, gauge, copperWireBool, dcBool) {
    const oGauge = gaugeTable.find(function (e) {
        return e.wireGauge === `${gauge}`;
    });
    if (oGauge == undefined) throw `Error at GetPercentVoltageDrop: gaugeTable.find(${gauge}) returned undefined`;
    let ohms = 0;
    if (copperWireBool) {
        if (dcBool) ohms = parseFloat(oGauge['CopperDcResist']);
        else ohms = parseFloat(oGauge['CopperAcResist']);
    } else {
        if (dcBool) ohms = parseFloat(oGauge['AluminumDcResist']);
        else ohms = parseFloat(oGauge['AluminumAcResist']);
    }
    if (isNaN(ohms)) throw "Error at GetPercentVoltageDrop: ohms is not a number";

    const resistance = (ohms / 1000) * dist * 2;
    const vDrop = segCurrent * resistance;
    return (vDrop / segVolt) * 100;
}

/**
 * return least number of modules found of all the strings
 * @param {Array of Integers} strings 
 */
function GetLowest(strings) {
    let lowest;
    for (let i = 0; i < strings.length; ++i) {
        if (lowest == null || lowest == undefined) lowest = strings[i];
        if (strings[i] < lowest) lowest = strings[i];
    }
    if (lowest == undefined) throw `Error at GetLowest: GetLowest of ${strings} output undefined`;

    return lowest;
}

/**
 * return largest number of modules found of all the strings
 * @param {Array of Integers} strings 
 */
function GetHighest(strings) {
    let highest;
    for (let i = 0; i < strings.length; ++i) {
        if (highest == null || highest == undefined) highest = strings[i];
        if (strings[i] > highest) highest = strings[i];
    }
    if (highest == undefined) throw `Error at GetHighest: GetHighest of ${strings} output undefined`;

    return highest;
}

/**
 * outputs example: #3 AWG, 300 ft, 45.6A, 240V, 2.85 VD%
 * Printout is used when trenching, can also be required for every segment by utility or ahj (Oregon) 
 * @param {String} gauge 
 * @param {String} type 
 * @param {Integer} dist 
 * @param {Float} maxOutputVolt 
 * @param {Float} maxOutputCurrent 
 * @param {Float} voltDrop 
 */
function VoltageDropToString(gauge, dist, maxOutputVolt, maxOutputCurrent, voltDrop) {
    return `${gauge}, ${dist} ft, ${maxOutputCurrent.toFixed(1)}A, ${maxOutputVolt}V, ${voltDrop.toFixed(2)} VD%`;
}

/**
 * returns the system size, used for cad csv and datalinking to cad
 * @param {Integer} totalModules total number of modules on the project == sum of modulesPerString 
 * @param {Object} solarModule the solar module object 
 */
function CalculateSystemSize(totalModules, solarModule) {
    return totalModules * solarModule.max_output_power; // max_output_power is wattage (float)
}
/**
 * returns an array of the output current for each string
 * this is applicable to inverter.type === 'Micro'
 * these values go into the csv and are datalinked into cad
 * @param {Object} inverter 
 * @param {Array} invertersPerString call GetNumInverters for this array 
 */
function CalculateCurrentPerString(inverter, invertersPerString) {
    let currentPerString = [];
    for (let i = 0; i < invertersPerString.length; ++i) {
        currentPerString.push(inverter.max_output_power * invertersPerString[i]);
    }
    return currentPerString;
}

/**
 * returns the upper bound value of the max panels that can be in any string, used in ValidateStringsSizes
 * this is meant for when inverter.type != 'Micro'
 * @param {Object} inverter 
 * @param {Object} solarModule 
 */
function CalculateMaxPanelsPerString(inverter, solarModule) { // non micro
    let maxPanelsPerString = Math.floor(inverter.max_power_per_string / (solarModule.max_power));
    return maxPanelsPerString;
}

/**
 * Don't Use this anymore
 * Validate user inputs for panels per string entered
 * returns an array indicating which strings are valid (true) and which strings are invalid (false)
 * @param {Array} modulesPerString number of panels in the string being validated
 * @param {Object} inverter inverter Object
 * @param {Integer} maxPanelsPerString is the value returned by CalculateMaxPanelsPerString
 * @param {Array} invertersPerString is the array returned by GetNumInverters
 */
function ValidateStringSizes(modulesPerString, inverter, maxPanelsPerString, invertersPerString) {
    // maxPanelsPerString can be null if
    let boolArray = [];
    if (inverter.type === 'Micro') {
        if (invertersPerString == null || invertersPerString == undefined) throw "Missing invertersPerString: call GetNumInverters";
        for (let i = 0; i < modulesPerString.length; ++i) {
            if (invertersPerString[i] <= inverter.max_inverters_per_string && modulesPerString[i] >= inverter.min_num_modules_per_string) boolArray.push(true);
            else boolArray.push(false);
        }
    }
    else {
        if (maxPanelsPerString == null || maxPanelsPerString == undefined) throw "Missing maxPanelsPerString: call CalculateMaxPanelsPerString";
        for (let i = 0; i < modulesPerString.length; ++i) {
            if (modulesPerString[i] <= maxPanelsPerString && modulesPerString[i] >= inverter.min_num_modules_per_string) boolArray.push(true);
            else boolArray.push(false);
        }
    }
    return boolArray;
}

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


module.exports = { CalculateSolarOcpd, GetACDiscoSize, GetSegmentWireSize, GetWireSchedule, CalculateSystemSize, GetNumInverters, ValidateStringSizes, CalculateMaxPanelsPerString, CalculateCurrentPerString, dcAcRatio, getMaxStringLengthOptimized, getMinStringLengthOptimized, getMaxStringLengthString, getMinStringLengthMicro, getMaxStringLengthMicro, getMinStringLengthString };