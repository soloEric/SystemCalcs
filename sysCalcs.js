// may replace these values with table lookup
const ocpd_table = require('./ocpdTable.json');

module.exports = {

    conductorCalc: function () {

    },

    conduitCalc: function () {

    },

    trenchingCalc: function () {

    },

    getACDiscoSize: function (num_inverters, inv_current_output, tap_bool) {
        const ocpd = determineOCPD(num_inverters, inv_current_output);
        // console.log(ocpd);
        const j_ocpd = ocpd_table.find(function (e) {
            return e.pv_backfeed === `${ocpd}`;
        });
        if (tap_bool) return parseInt(j_ocpd.tap_ac_disco);
        return parseInt(j_ocpd.ac_disco);
    },

    /**
     * 
     * @param {Integer} num_inverters number of inverters
     * @param {Float} inv_current_output value from inverter object
     * @param {Boolean} fused_bool is the disconnect fused or no
     * @param {Boolean} common_breaker_bool if company doesn't want to use breakers that are multiples of 5, this value is true
     */
    solarOCPDCalc: function (num_inverters, inv_current_output, fused_bool, common_breaker_bool) {
        const ocpd = determineOCPD(num_inverters, inv_current_output);
        // console.log(ocpd);
        const j_ocpd = ocpd_table.find(function (e) {
            return e.pv_backfeed === `${ocpd}`;
        });

        if (fused_bool || common_breaker_bool) {
            return parseInt(j_ocpd.pv_breaker_common_size);
        } else {
            return parseInt(j_ocpd.standard_breaker);
        }

    },
}

// for solarOCPDCalc to call
function determineOCPD(num_inverters, inv_current_output) {
    return Math.ceil(((num_inverters * inv_current_output) * 1.25) / 5) * 5;
}

