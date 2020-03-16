// common acronyms: 
// ocpd = overcurrent protection device - refers to the breaker rating
const WS = require('./wireScheduleObjs');
const ocpdTable = require('./ocpdTable.json');
const gaugeTable = require('./gaugeTable.json');
const gaugeAreaTable = require('./gaugeToAreaTable.json'); // All sizes are for Conductor types: THHN, THWN, THWN-2 from chrome-extension://oemmndcbldboiebfnladdacbdfmadadm/https://shop.iccsafe.org/media/wysiwyg/material/8950P229-sample.pdf
const conduitSizeTable = require('./conduitSizeTable.json');
const enphaseVDropTable = require('./enphaseVDropTable.json');
// possibleGauges only reflects what is usual for a residential solar system
const possibleGauges = ["14 AWG", "12 AWG", "10 AWG", "8 AWG", "6 AWG", "4 AWG", "3 AWG", "2 AWG", "1 AWG", "1/0 AWG", "2/0 AWG", "3/0 AWG", "4/0 AWG"];
const defaultWireDist = 10;
const maxConduitFillPercent = 0.4;
// FIXME: add wire descriptor table, ask Jake 
// FIXME: add throws anytime a table lookup returns undefined


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
 * 
 * @param {Integer} numSegments 
 * @param {Array} trenchSegments has segment number and distance
 * @param {Integer} numInverters 
 * @param {Object} inverter 
 * @param {Array} modulesPerString 
 * @param {Object} solarModule 
 * @param {Object} optimizer 
 * @param {*} copperBool 
 * @param {*} interconnection 
 */
function GetWireSchedule(numSegments, trenchSegments, numInverters, inverter, modulesPerString, solarModule, optimizer, copperBool, tapBool, wireType, wireTypeAlt) {
    // numStrings = modulesPerString.length
    let pvBackfeed = DetermineBackfeed(numInverters, inverter.max_output_current);
    const wireSchedule = [];
    const vDropPrintOuts = [];
    let material;

    let firstSegAfterInv = getFirstSegAfterInv(modulesPerString);

    if (copperBool) material = "Copper";
    else material = "Aluminum";

    for (let i = 1; i <= numSegments; ++i) {
        let wires = [];
        let dist = defaultWireDist;
        let isTrenched = false;
        for (let j = 0; j < trenchSegments.length; ++j) {
            if (trenchSegments[j].segment == i) {
                // console.log(`Trenching at segment ${i}`);
                dist = trenchSegments[j].distance;
                isTrenched = true;
            }
        }
        // console.log(`Tag ${i}: distance is ${dist}`);

        // if enphase

        // else do normal
        let gauge = GetSegmentWireSize(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, i, copperBool, tapBool);
        let numPosOrNegWires = CalculateNumCurrentCarryingConductors(i, modulesPerString, numInverters, inverter);

        //wire type comes from either company best practice or lookup table, these values are for testing
        wireType = "THWN test"
        wireTypeAlt = "other type";

        if (i < firstSegAfterInv) {
            wires.push(new WS.Wire(numPosOrNegWires / 2, gauge, wireType, wireTypeAlt, material, "POSITIVE"));
            wires.push(new WS.Wire(numPosOrNegWires / 2, gauge, wireType, wireTypeAlt, material, "NEGATIVE"));
        } else {
            wires.push(new WS.Wire(numPosOrNegWires / 2, gauge, wireType, wireTypeAlt, material, "L1"));
            wires.push(new WS.Wire(numPosOrNegWires / 2, gauge, wireType, wireTypeAlt, material, "L2"));
        }

        if (i >= firstSegAfterInv) {
            wires.push(new WS.Wire(1, gauge, wireType, wireTypeAlt, material, "NEUTRAL"));
        }

        let groundGauge, groundWireType, groundWireTypeAlt = "test ground type";
        groundGauge = GetSegmentGroundSize(pvBackfeed, modulesPerString, numInverters, inverter, solarModule, optimizer, dist, i, copperBool, firstSegAfterInv);
        wires.push(new WS.Wire(1, groundGauge, groundWireType, groundWireTypeAlt, material, "GROUND"));

        let conduitCallout = CalculateConduitSize(wires);
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
        vDropPrintOuts.push(voltageDropToString(gauge.gauge, dist, gauge.maxOutputVolt, gauge.maxOutputCurrent, gauge.vDrop));
    }
    return {
        schedule: wireSchedule,
        voltageDropCalcs: vDropPrintOuts
    }
}

// calculate the number of wires in a segment for pos/neg
// always 1 ground, if neutral, one neutral
// refer to table on derate factor per number of current carrying conductors
function CalculateNumCurrentCarryingConductors(segment, modulesPerString, numInverters, inverter) {
    let firstSegAfterInv = getFirstSegAfterInv(modulesPerString);

    if (segment == 1) {
        return 2
    }
    else if (segment > 1 && segment < firstSegAfterInv) { // segment 2 or 3
        if (inverter.type == "Micro" && segment == 3) return modulesPerString.length;
        else if (segment == 3) return (modulesPerString.length / numInverters) * 2;
        else return 2;
    } else {
        return 2;
    }

}

// for MVP we are using ocpdTable for generic temperature derate calcs
// given a list of wires, calculate the conduit fill and determine conduit size
// needs gauge size table
function CalculateConduitSize(wires) {
    // for each wire
    let totalArea = 0;
    for (let i = 0; i < wires.length; ++i) {
        // get number of wires per type multiplyed by the gauge area to get area per wiretype
        let numWires = wires[i].number;
        let gauge = wires[i].gauge.gauge;
        let obGaugeArea = gaugeAreaTable.find(function (e) {
            return e.conductorSize === `${gauge}`;
        });
        let area = obGaugeArea.inchArea;
        totalArea += (area * numWires);
    }
    let minimumConduitSize = totalArea / maxConduitFillPercent;
    // lookup table to find conduit size based on total area
    // return conduit size
    let conduitSize = ToNearestFourth(minimumConduitSize);
    if (conduitSize < 0.75) {
        conduitSize = 0.75;
    }
    if (conduitSize > 3) throw "Conduit size returned abnormally large";

    const oConduit = conduitSizeTable.find(function (e) {
        return e.floatSize = `${conduitSize}`;
    })
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
 * all are ac if inverter is micro, must be 1 or greater
 * @param {Boolean} copperBool is the wire copper or not? Comes from best practices
 * @param {Boolean} tapBool
 */
function GetSegmentWireSize(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool, tapBool) {
    let pvBackfeed = DetermineBackfeed(numInverters, inverter.max_output_current);

    let inputs = GetMaxOutCurrentMaxOutVolt(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool)

    let pair;
    for (let i = 0; i < possibleGauges.length; ++i) {
        let voltageDropPercent;
        if (inverter.manufacturer === "Enphase") {
            voltageDropPercent = inputs.vDrop;
        } else {
            voltageDropPercent = GetPercentVoltageDrop(dist, inputs.maxOutputCurrent, inputs.maxOutputVolt, possibleGauges[i], copperBool, inputs.dcBool);
        }
        // console.log(voltageDropPercent);
        if (voltageDropPercent <= inverter.max_voltage_drop) {
            pair = {
                gauge: possibleGauges[i], vDrop: voltageDropPercent,
                maxOutputVolt: inputs.maxOutputVolt, maxOutputCurrent: inputs.maxOutputCurrent
            };
            break;
        }
    } 
    const oOcpd = ocpdTable.find(function (e) {
        // FIXME: Check this on Enphase systems
        if (inputs.dcBool) {
            // console.log("Rounded value: ", Math.ceil(maxOutputCurrent / 5) * 5);
            return e.pvBackfeed === `${Math.ceil(inputs.maxOutputCurrent / 5) * 5}`;
        } else {
            return e.pvBackfeed === `${pvBackfeed}`;
        }
    });
    // console.log("Calculated: ", pair);
    // console.log("From Table: ", oOcpd.wireSize, oOcpd.tapWireSize);
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
    // if (segment < firstSegAfterInv) tableRating = 0;
    if (tableRating > calcRating) {
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
    else return pair;
}

function GetMaxOutCurrentMaxOutVolt(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool) {
    if (segment < 1) throw `Invalid segment number: must be 1 or greater. Segment number was ${segment}`;
    if (!segment || !copperBool) throw "missing segment number or copperBool";
    if (inverter == null || inverter == undefined) throw "Missing inverter object";
    if (dist == null || dist == undefined) throw "Distance field cannot be null";

    let firstSegAfterInv = getFirstSegAfterInv(modulesPerString);

    let maxOutputVolt;
    let maxOutputCurrent;
    let dcBool;

    if (inverter.type === "Micro") {
        // FIXME: replace throw with call to Enphase calc
        if (segment == 1 && inverter.manufacturer === "Enphase") {
            // throw "Use Enphase Voltage Drop Values";
            return GetEnphaseCalc(numInverters, inverter);
        }

        dcBool = false;
        if (numInverters == null || numInverters == undefined) throw "Missing numInverters field";
        maxOutputVolt = inverter.max_output_voltage;
        maxOutputCurrent = inverter.max_output_current * parseFloat(parseFloat(numInverters.toString()).toFixed(2));
    } else if (inverter.type === "String" && segment < firstSegAfterInv) {
        dcBool = true;
        if (solarModule == null || solarModule == undefined) throw "Module object missing";
        if (modulesPerString == null || modulesPerString == undefined) throw "Array of string sizes missing";
        maxOutputVolt = solarModule.open_circuit_voltage * getLowest(modulesPerString);
        maxOutputCurrent = solarModule.short_circuit_current;
    } else if (inverter.type === "Optimized" && segment < firstSegAfterInv) {
        // optimized
        if (optimizer == null || optimizer == undefined) throw "Optimizer is required";
        dcBool = true;
        maxOutputVolt = inverter.nominal_dc_input_voltage;
        maxOutputCurrent = optimizer.output_current;
    } else {
        // after the inverter and is a String inverter
        dcBool = false;
        if (numInverters == null || numInverters == undefined) throw "Missing numInverters field";
        maxOutputVolt = inverter.max_output_voltage;
        maxOutputCurrent = inverter.max_output_current * parseFloat(parseFloat(numInverters.toString()).toFixed(2));
    }
    return { maxOutputVolt: maxOutputVolt, maxOutputCurrent: maxOutputCurrent, dcBool: dcBool }
}

// for MVP this is just a table lookup 
function GetSegmentGroundSize(ocpd, modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool, firstSegAfterInv) {
    let inputs = GetMaxOutCurrentMaxOutVolt(modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool);
    const oOcpd = ocpdTable.find(function (e) {
        if (segment >= firstSegAfterInv) {
            return e.pvBackfeed === `${ocpd}`;
        } else {
            return e.pvBackfeed === `${inputs.maxOutputCurrent}`;
        }

    });
    return { gauge: oOcpd.groundWireSize, vDrop: "NA" };
}

function GetEnphaseCalc(numInverters, inverter) {
// FIXME: Ask JAke if the vDrop is per string, if vDrop is calculated correctly when returned
    let maxOutputCurrent;
    const oEnphase = enphaseVDropTable.find(function (e) {
        return e.numInverters === `${numInverters}`;
    });
    if (oEnphase == undefined) throw "Error: find returned undefined";
    switch (inverter.man_part_num) {
        case "IQ7-60-2-US":
            maxOutputCurrent = oEnphase.currentIQ7;

            return { maxOutputVolt: 0, maxOutputCurrent: maxOutputCurrent, dcBool: false, vDrop: oEnphase.vDropIQ7 };

        case "IQ7PLUS-72-2-US":
            maxOutputCurrent = oEnphase.currentIQ7Plus;
            if (maxOutputCurrent === "NA") throw "Error: Too many modules in the string";
            return { maxOutputVolt: 0, maxOutputCurrent: maxOutputCurrent, dcBool: false, vDrop: oEnphase.vDropIQ7Plus };

        default:
            throw "Inverter not supported";
        // add other enphase inverters
    }
}

function GetACDiscoSize(numInverters, invCurrentOutput, tapBool) {
    const ocpd = DetermineBackfeed(numInverters, invCurrentOutput);
    // console.log(ocpd);
    const oOcpd = ocpdTable.find(function (e) {
        return e.pvBackfeed === `${ocpd}`;
    });
    if (tapBool) return parseInt(oOcpd.tapAcDisco);
    return parseInt(oOcpd.acDisco);
}

/**
 * returns int of solar breaker/fuse size
 * @param {Integer} numInverters number of inverters
 * @param {Float} invCurrentOutput value from inverter object
 * @param {Boolean} fusedBool is the disconnect fused or no
 * @param {Boolean} commonBreakerBool if company doesn't want to use breakers that are multiples of 5, this value is true
 */
function CalculateSolarOcpd(numInverters, invCurrentOutput, fusedBool, commonBreakerBool) {
    const ocpd = DetermineBackfeed(numInverters, invCurrentOutput);
    // console.log(ocpd);
    const oOcpd = ocpdTable.find(function (e) {
        return e.pvBackfeed === `${ocpd}`;
    });

    if (fusedBool || commonBreakerBool) {
        return parseInt(oOcpd.pvBreakerCommonSize);
    } else {
        return parseInt(oOcpd.standardBreakerSize);
    }

}


function getFirstSegAfterInv(modulesPerString) {
    let firstSegAfterInv;
    if (modulesPerString.length > 1) firstSegAfterInv = 4;
    else firstSegAfterInv = 3;
    return firstSegAfterInv;
}

function DetermineBackfeed(numInverters, invCurrentOutput) {
    return Math.ceil(((numInverters * invCurrentOutput) * 1.25) / 5) * 5;
}

function ToNearestFourth(num) {
    return Math.round(num * 4) / 4;
}

/**
 * returns float of percent voltage drop for current section
 * @param {Integer} dist 
 * @param {Integer} segCurrent 
 * @param {Integer} segVolt
 * @param {String} gauge ex: #12, 1/0
 * @param {Boolean} copperWire refers to either "copper" or "aluminum"
 * @param {Boolean} dcBool indicates whether the segment is running dc or ac
 */
function GetPercentVoltageDrop(dist, segCurrent, segVolt, gauge, copperWire, dcBool) {
    const oGauge = gaugeTable.find(function (e) {
        return e.wireGauge === `${gauge}`;
    });
    let ohms = 0;
    // console.log(dcBool);
    if (copperWire) {
        // console.log(oGauge['CopperAcResist']);
        if (dcBool) ohms = parseFloat(oGauge['CopperDcResist']);
        else ohms = parseFloat(oGauge['CopperAcResist']);
    } else {
        if (dcBool) ohms = parseFloat(oGauge['AluminumDcResist']);
        else ohms = parseFloat(oGauge['AluminumAcResist']);
    }
    // console.log("segCurrent: ", segCurrent);
    // console.log("SegVolt: ", segVolt)
    // console.log("Ohms = ", ohms);
    if (isNaN(ohms)) return 100.0;

    // v = segCurrent * resistance
    const resistance = (ohms / 1000) * dist * 2;
    // console.log("Resistance: ", resistance);
    const vDrop = segCurrent * resistance;
    // console.log("Voltage Drop: ", vDrop);

    return (vDrop / segVolt) * 100;
}
/**
 * return least number of modules found of all the strings
 * @param {Array of Integers} strings 
 */
function getLowest(strings) {
    let lowest;
    for (let i = 0; i < strings.length; ++i) {
        if (lowest == null || lowest == undefined) lowest = strings[i];
        if (strings[i] < lowest) lowest = strings[i];
    }
    if (lowest == undefined) throw `${strings} output undefined`;

    return lowest;
}

/**
 * outputs in this form: #3 AWG, 300 ft, 45.6A, 240V, 2.85 VD%
 * @param {String} gauge 
 * @param {String} type 
 * @param {Integer} dist 
 * @param {Float} maxOutputVolt 
 * @param {Float} maxOutputCurrent 
 * @param {Float} voltDrop 
 */
function voltageDropToString(gauge, dist, maxOutputVolt, maxOutputCurrent, voltDrop) {
    return `${gauge}, ${dist} ft, ${maxOutputCurrent.toFixed(1)}A, ${maxOutputVolt}V, ${voltDrop.toFixed(2)} VD%`;
}

module.exports = { CalculateSolarOcpd, GetACDiscoSize, GetSegmentWireSize, GetWireSchedule, CalculateWholeSystem };