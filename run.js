// use to debug single tests

const system = require('./sysCalcs');
const d = require('./dwgSelection');
function run() {
    inverter = { // Enphase IQ7
        max_output_voltage: 240,
        max_output_current: 1,
        nominal_dc_input_voltage: 16,
        max_voltage_drop: 2.0,
        manufacturer: "Enphase",
        man_part_num: "IQ7-60-2-US",
        type: "Micro"
    };
    solarModule = { // Hanwha Q. Cells Q.Peak DUO-G5 - 315
        open_circuit_voltage: 39.87,
        short_circuit_current: 10.04
    };
    optimizer = null;
    let ret = system.GetWireSchedule(5, [], 120, inverter, [15, 15, 15, 15, 15, 15, 15, 15], solarModule, optimizer, true, false);
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