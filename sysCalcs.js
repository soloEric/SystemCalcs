// common acronyms: 
// ocpd = overcurrent protection device - refers to the breaker rating

const ocpdTable = require('./ocpdTable.json');
const gaugeTable = require('./gaugeTable.json');
// possibleGauges only reflects what is usual for a residential solar system
const possibleGauges = ["14 AWG", "12 AWG", "10 AWG", "8 AWG", "6 AWG", "4 AWG", "3 AWG", "2 AWG", "1 AWG", "1/0 AWG", "2/0 AWG", "3/0 AWG", "4/0 AWG"];
const defaultWireDist = 10;
// FIXME: add wire descriptor table, 

module.exports = {

    CalculateWholeSystem: function () {
        // get interconnection type
        // get extra equipment if needed
        // ? determine number of segments
        // Get Wire Schedule
        // Get fused/solar breaker size
        // if derate, calculate new main
    },

    /**
     * 
     * @param {*} numSegments 
     * @param {*} numStrings 
     * @param {*} trenchSegments 
     * @param {*} distPerSegment 
     * @param {*} numInverters 
     * @param {*} inverter 
     * @param {Array} modulesPerString integers
     * @param {*} solarModule 
     * @param {*} optimizer 
     * @param {*} copperBool 
     * @param {*} interconnection 
     */
    GetWireSchedule: function (numSegments, trenchSegments, distPerSegment, numInverters, inverter, modulesPerString, solarModule, optimizer, copperBool, interconnection) {
        // numStrings = modulesPerString.length
        // if segment dc, segment will have 3 conductors, pos, neg, ground
        // after seg 1 will need conductor label
        // numDCconductors = numStrings * 2 + ground
        // (microInverter) numAcConductors = numStrings * (l1, l3, n, g)
        // segment 1 has pos, neg, ground, no conduit
        // segment 2-3 has pos, neg, ground, conduit
        // after inverter has l1(pos) l2(neg), neutral, ground, conduit
        // if numStrings = 1, then there will be one lest segment and dc will go from 1,2 after 3 will be ac
        let pvBackfeed = DetermineBackfeed(numInverters, inverter.max_output_current);
        const wireSchedule = [];
        const vDropPrintouts = [];
        let material;
        if (copperBool) material = "Copper";
        else material = "Aluminum";

        for (let i = 0; i < numSegments; ++i) {
            let wires = [];

            // if enphase
            // else do normal

            numWiresInSegment = this.CalculateNumWires(i, modulesPerString);
            // FIXME: figure out number of wires in scheduleItem
            for (let j = 0; j < numWiresInSegment; ++j) {

                //wire type comes from either company best practice or lookup table
                let numWires, gauge, wireType, wireTypeAlt, label;
                gauge = this.GetSegmentWireSize();
                wires.push(new Wire(numWires, gauge, wireType, wireTypeAlt, material, label));
                
            }
            let groundGauge, groundWireType, groundWireTypeAlt;
            groundGauge = this.GetSegmentWireSize()
            wires.push(new Wire(1, groundGauge, groundWireType, groundWireTypeAlt, material, "GROUND"));

            altInputString = this.CalculateConduitSize(wires);
            scheduleItem = new WireScheduleItem(i, wires, altInputString);
            wireSchedule.push(scheduleItem);
        }
    },

    // calculate the number of wires in a segment
    CalculateNumWires: function (segment, modulesPerString) {
        let firstSegAfterInv;
        if (modulesPerString.length > 1) firstSegAfterInv = 4;
        else firstSegAfterInv = 3;

        if (segment == 1) {

        }
        else if (segment > 1 && segment < firstSegAfterInv) { // segment 2 or 3

        } else {

        }

    },

    // for MVP we are using ocpdTable for generic temperature derate calcs
    // given a list of wires, calculate the conduit fill and determine conduit size
    // needs gauge size table
    CalculateConduitSize: function (wires) {
        // for each wire
        // get number of wires per type multiplyed by the gauge area to get area per wiretype
        // total all areas per wire type
        // lookup table to find conduit size based on total area
        // return conduit size

    },

    /**
     * FIXME: may need to return from final GetPercentVoltageDrop with formatted callout:
     * Trenched Conductor Voltage Drop: #3 AWG, 300 ft, 45.6A, 240V, 2.85 VD%		
     * 
     * Makes a decision on wire gauge for current segment
     * returns the first wire gauge that falls under the accepted voltage drop percentage
     * based on the inverter/module object
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
    GetSegmentWireSize: function (modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool, tapBool) {
        if (segment < 1) throw "Invalid segment number: must be 1 or greater";
        if (!segment || !copperBool) throw "missing vital field: segment number or copperBool";
        if (segment < 1) throw "Segment must be 1 or greater";
        if (inverter == null || inverter == undefined) throw "Missing inverter object";

        let firstSegAfterInv;
        if (modulesPerString.length > 1) firstSegAfterInv = 4;
        else firstSegAfterInv = 3;

        if (dist == null || dist == undefined) dist = defaultWireDist;

        let pvBackfeed = DetermineBackfeed(numInverters, inverter.max_output_current);
        let maxOutputVolt;
        let maxOutputCurrent;
        let dcBool;

        if (inverter.type === "Micro") {
            // FIXME: replace throw with call to Enphase calc
            if (segment < firstSegAfterInv && inverter.manufacturer === "Enphase") throw "Use Enphase Voltage Drop Values";
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
            if (optimizer == null || optimizer == undefined) throw "Optimizer is required"
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

        let pair;
        for (let i = 0; i < possibleGauges.length; ++i) {
            let voltageDropPercent = GetPercentVoltageDrop(dist, maxOutputCurrent, maxOutputVolt, possibleGauges[i], copperBool, dcBool);
            // console.log(voltageDropPercent);
            if (voltageDropPercent <= inverter.max_voltage_drop) {
                pair = { gauge: possibleGauges[i], vDrop: voltageDropPercent };
                break;
            }
        }
        const oOcpd = ocpdTable.find(function (e) {
            return e.pvBackfeed === `${pvBackfeed}`;
        });
        console.log("Calculated: ", pair);
        console.log("From Table: ", oOcpd.wireSize, oOcpd.tapWireSize);
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
            if (tapBool) return { gauge: oOcpd.tapWireSize, vDrop: GetPercentVoltageDrop(dist, maxOutputCurrent, maxOutputVolt, oOcpd.tapWireSize, copperBool, dcBool) };
            else return { gauge: oOcpd.wireSize, vDrop: GetPercentVoltageDrop(dist, maxOutputCurrent, maxOutputVolt, oOcpd.wireSize, copperBool, dcBool) };
        }
        else return pair;
    },
    // for MVP this is just a table lookup 
    GetSegmentGroundSize(ocpd) {
        const oOcpd = ocpdTable.find(function (e) {
            return e.pvBackfeed === `${ocpd}`;
        });
        return oOcpd.groundWireSize;
    },

    GetACDiscoSize: function (numInverters, invCurrentOutput, tapBool) {
        const ocpd = DetermineBackfeed(numInverters, invCurrentOutput);
        // console.log(ocpd);
        const oOcpd = ocpdTable.find(function (e) {
            return e.pvBackfeed === `${ocpd}`;
        });
        if (tapBool) return parseInt(oOcpd.tapAcDisco);
        return parseInt(oOcpd.acDisco);
    },

    /**
     * returns int of solar breaker/fuse size
     * @param {Integer} numInverters number of inverters
     * @param {Float} invCurrentOutput value from inverter object
     * @param {Boolean} fusedBool is the disconnect fused or no
     * @param {Boolean} commonBreakerBool if company doesn't want to use breakers that are multiples of 5, this value is true
     */
    CalculateSolarOcpd: function (numInverters, invCurrentOutput, fusedBool, commonBreakerBool) {
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

    },
}


function DetermineBackfeed(numInverters, invCurrentOutput) {
    return Math.ceil(((numInverters * invCurrentOutput) * 1.25) / 5) * 5;
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
function voltageDropToString(gauge, type, dist, maxOutputVolt, maxOutputCurrent, voltDrop) {
    return `${gauge} ${type}, ${dist} ft, ${maxOutputCurrent.toFixed(1)}A, ${maxOutputVolt}V, ${voltDrop.toFixed(2)} VD%`;
}

class WireScheduleItem {
    /**
     * 
     * @param {Integer} tagNum tag label
     * @param {Array} wires array of wire objects
     * @param {String} altInput string to hold additional information for the over all tag 
     */
    constructor(tagNum, wires, altInput) {
        this.tagNum = tagNum;
        this.wires = wires;
        this.altInput = fixNull(altInput);
    }

    getTotalNumWires() {
        let total = 0;
        for (let i = 0; i < this.wires.length; ++i) {
            total += wires[i].getNumWires();
        }
        return total;
    }

    _fixNull(item) {
        if (item == null || item == undefined) return "";
        else return item;
    }
}

class Wire {
    /**
     * toString to print out line
     * @param {Integer} number 
     * @param {String} gauge calculated by the sysCalc getSegmentWireSize
     * @param {String} wireType wire descriptor such as AWG THWN-2 or THHN
     * @param {String} wireTypeAlt alt wire descriptor such as 10/2 NM-B
     * @param {String} material copper or aluminum
     * @param {String} label POSITIVE, NEGATIVE, GROUND
     */
    constructor(number, gauge, wireType, wireTypeAlt, material, label) {
        this.number = fixNull(number);
        this.gauge = fixNull(gauge);
        this.wireType = fixNull(wireType);
        this.wireTypeAlt = fixNull(wireTypeAlt);
        this.material = fixNull(material);
        this.label = fixNull(label);
    }

    getNumWires() {
        return this.number;
    }

    _fixNull(item) {
        if (item == null || item == undefined) return "";
        else return item;
    }

    toString() {
        if (this.wireTypeAlt) {
            this.wireTypeAlt = `or ${this.wireTypeAlt}`;
        } else {
            this.wireTypeAlt = "";
        }
        return `(${this.number})\t${this.gauge} ${this.wireType}, ${this.wireTypeAlt}, ${this.material}, - (${this.label})`;
    }
}

