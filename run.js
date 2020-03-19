// use to debug single tests

const system = require('./sysCalcs');
function run() {
    inverter = { // Enphase IQ7
        max_output_voltage: 240,
        max_output_current: 1,
        nominal_dc_input_voltage: null,
        max_voltage_drop: 2.0,
        manufacturer: "Enphase",
        man_part_num: "IQ7-60-2-US",
        type: "Micro"
    };
    solarModule = { // Axitec AC-280M/156-60S
        open_circuit_voltage: 31.8,
        short_circuit_current: 9.75
    };
    optimizer = null;
    let ret = system.GetWireSchedule(5, [{segment: 4, distance: 35}], 52, inverter, [13, 13, 13, 13], solarModule, optimizer, true, false);
    for (let i = 0; i < ret.schedule.length; ++i) {
        console.log(`TAG ${ret.schedule[i].tagNum}`/*, ret.schedule[i]["wires"]*/);
        console.log("Schedule Item:");
        for (const wire in ret.schedule[i]["wires"]) {
            console.log(ret.schedule[i]["wires"][wire].getString());
        }
        console.log(ret.schedule[i].conduitCallout);
        console.log(ret.voltageDropCalcs[i], "\n");
    }
}
run();