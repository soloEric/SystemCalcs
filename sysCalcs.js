// common acronyms: 
// ocpd = overcurrent protection device - refers to the breaker rating

const ocpdTable = require('./ocpdTable.json');
const gaugeTable = require('./gaugeTable.json');
const possibleGauges = ["#14", "#12", "#10", "#8", "#6", "#4", "#3", "#2", "#1", "1/0", "2/0", "3/0", "4/0"];
// FIXME: add wire descriptor table, 

module.exports = {
    /**
     * 
     * @param {*} numSegments 
     * @param {*} trenchSegments 
     * @param {*} distPerSegment 
     * @param {*} numInverters 
     * @param {*} inverter 
     * @param {*} modulesPerString 
     * @param {*} solarModule 
     * @param {*} optimizer 
     * @param {*} copperBool 
     * @param {*} interconnection
     */
    GetWireSchedule: function (numSegments, trenchSegments, distPerSegment, numInverters, inverter, modulesPerString, solarModule, optimizer, copperBool, interconnection) {

        let wireSchedule = [];
        let material;
        if (copperBool) material = "Copper";
        else material = "Aluminum";

        for (let i = 0; i < numSegments; ++i) {
            let wires = [];
            
            // if enphase
            // else do normal

            // FIXME: figure out number of wires in scheduleItem
            for (let j = 0; j < numWiresInSegment; ++j) {
                let numWires, gauge, wireType, wireTypeAlt, label;
                wires.push(new Wire(numWires, gauge, wireType, wireTypeAlt, material, label))
            } 
            wires.push(new Wire(1, groundGauge, groundWireType, groundWireTypeAlt, material, "GROUND"));

            scheduleItem = new WireScheduleItem(i, wires, altInputString);
            wireSchedule.push(scheduleItem);
        }
    },

    CalculateConductor: function () {

    },

    // given a list of wires, calculate the conduit fill and determine conduit size
    CalculateConduit: function () {

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
     */
    GetSegmentWireSize: function (modulesPerString, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool) {
        if (segment < 1) throw "Invalid segment number: must be 1 or greater";
        if (!dist || !segment || !copperBool) throw "missing vital field: distance, segment number or copperBool";

        let maxOutputVolt;
        let maxOutputCurrent;
        let dcBool;
        if (inverter == null || inverter == undefined) throw "Missing inverter object";
        if (inverter.type === "Micro") {
            // FIXME: replace throw with call to Enphase calc
            if (segment < 4 && inverter.manufacturer === "Enphase") throw "Use Enphase Voltage Drop Values";
            dcBool = false;
            if (numInverters == null || numInverters == undefined) throw "Missing numInverters field";
            maxOutputVolt = inverter.max_output_voltage;
            maxOutputCurrent = inverter.max_output_current * parseFloat(parseFloat(numInverters.toString()).toFixed(2));
        } else if (inverter.type === "String" && segment < 4) {
            dcBool = true;
            if (solarModule == null || solarModule == undefined) throw "Module object missing";
            if (modulesPerString == null || modulesPerString == undefined) throw "Array of string sizes missing";
            maxOutputVolt = solarModule.mpp_voltage * getLowest(modulesPerString);
            maxOutputCurrent = solarModule.short_circuit_current;
        } else if (inverter.type === "Optimized" && segment < 4) {
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

        for (let i = 0; i < possibleGauges.length; ++i) {
            let voltageDropPercent = GetPercentVoltageDrop(dist, maxOutputCurrent, maxOutputVolt, possibleGauges[i], copperBool, dcBool);
            // console.log(voltageDropPercent);
            if (voltageDropPercent <= inverter.max_voltage_drop) return possibleGauges[i];
        }
    },

    GetSegmentGroundSize() {

    },

    GetACDiscoSize: function (numInverters, invCurrentOutput, tapBool) {
        const ocpd = DetermineOcpd(numInverters, invCurrentOutput);
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
        const ocpd = DetermineOcpd(numInverters, invCurrentOutput);
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

// solarOCPDCalc calls this
function DetermineOcpd(numInverters, invCurrentOutput) {
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
 * 
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

