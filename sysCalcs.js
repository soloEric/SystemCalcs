// common acronyms: 
// ocpd = overcurrent protection device - refers to the breaker rating
const ocpdTable = require('./ocpdTable.json');
const gaugeTable = require('./gaugeTable.json');
const possibleGauges = ["#14", "#12", "#10", "#8", "#6", "#4", "#3", "#2", "#1", "1/0", "2/0", "3/0", "4/0"];

module.exports = {

    CalculateConductor: function () {

    },

    CalculateConduit: function () {

    },

    /**
     * Makes a decision on wire gauge for current segment
     * returns the first wire gauge that falls under the accepted voltage drop percentage
     * based on the inverter/module object
     * 
     * @param {Integer} numModules
     * @param {Integer} numInverters
     * @param {Inverter Object} inverter 
     * @param {Module Object} module
     * @param {Integer} dist distance rounded to the nearest foot
     * @param {Integer} segment indicates which segment the voltage calcs are for, switch statement anything greater than 4 is always ac
     * all are ac if inverter is micro, must be 1 or greater
     * @param {Boolean} copperBool is the wire copper or not? Comes from best practices
     */
    CalculateVoltageDrop: function (numModules, numInverters, inverter, solarModule, optimizer, dist, segment, copperBool) {
        if (segment < 1) throw "Invalid segment number: must be 1 or greater";

        let maxOutputVolt;
        let maxOutputCurrent;
        let dcBool;
        if (inverter.manufacturer === "Enphase") dcBool = false;
        // FIXME: This section is unfinished
        if (inverter.type === "Micro") {
            if (segment < 4 && inverter.manufacturer === "Enphase") throw "Use Enphase Voltage Drop Values";
            maxOutputVolt = inverter.max_output_voltage;
            maxOutputCurrent = inverter.max_output_current * parseFloat(parseFloat(numInverters.toString()).toFixed(2));
            console.log(maxOutputCurrent, " should be 18.24 on wire gauge test 3");
        } else if (inverter.type === "String" && segment > 3) {
            dcBool = false;
            // maxOutputVolt = solarModule.mpp_voltage * numModules;
            // maxOutputCurrent = solarModule.short_circuit_current;
            maxOutputVolt = inverter.max_output_voltage;
            maxOutputCurrent = inverter.max_output_current * numInverters;
        } else {
            // optimized
            dcBool = true;
            maxOutputVolt = inverter.nominal_dc_input_voltage;
            maxOutputCurrent = optimizer.output_current;
        }

        for (let i = 0; i < possibleGauges.length; ++i) {
            let voltageDropPercent = GetPercentVoltageDrop(dist, maxOutputCurrent, maxOutputVolt, possibleGauges[i], copperBool, dcBool);
            console.log(voltageDropPercent);
            if (voltageDropPercent <= inverter.max_voltage_drop) return possibleGauges[i];
        }
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
     * 
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
 * @param {Boolean} dcBool indicates whether the segment is runnign dc or ac
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
    console.log("segCurrent: ", segCurrent);
    console.log("SegVolt: ", segVolt)
    console.log("Ohms = ", ohms);
    if (isNaN(ohms)) return 100.0;

    // v = segCurrent * resistance
    const resistance = (ohms / 1000) * dist * 2;
    console.log("Resistance: ", resistance);
    const vDrop = segCurrent * resistance;
    console.log("Voltage Drop: ", vDrop);

    return (1 - ((segVolt - vDrop) / segVolt)) * 100;
}
