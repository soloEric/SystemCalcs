const system = require('../sysCalcs');
const chai = require('chai');
var expect = chai.expect;

describe("System Calc Tests:", () => {

    it("OCPD Fused Calc", done => {
        expect(system.CalculateSolarOcpd(1, 47.5, true, false)).equals(60); // 1 SolarEdge SE11400H-US (240V)
        expect(system.CalculateSolarOcpd(33, 1.21, true, false)).equals(50); // 33 Enphase IQ7PLUS-72-2-US
        expect(system.CalculateSolarOcpd(1, 12.5, true, false)).equals(20); // 1 SolarEdge SE3800H-US (240V)
        expect(system.CalculateSolarOcpd(8, 1, true, false)).equals(20); // 8 Enphase IQ7-60-2-US
        expect(system.CalculateSolarOcpd(8, 1, false, true)).equals(20); // 8 Enphase IQ7-60-2-US

        done();
    });

    it("OCPD nonfused , noncommon calc", done => {
        expect(system.CalculateSolarOcpd(8, 1, false, false)).equals(15); // 8 Enphase IQ7-60-2-US, pulls from Standard Breakers list
        expect(system.CalculateSolarOcpd(10, 1, false, false)).equals(15); // 8 Enphase IQ7-60-2-US, pulls from Standard Breakers list
        expect(system.CalculateSolarOcpd(15, 1, false, false)).equals(20); // 8 Enphase IQ7-60-2-US, pulls from Standard Breakers list
        expect(system.CalculateSolarOcpd(18, 1, false, false)).equals(25); // 8 Enphase IQ7-60-2-US, pulls from Standard Breakers list
        done();
    });

    it("Get wire gauge test 1: Solaredge trench before inverter", done => {
        inverter = { // SE 3800
            max_output_voltage: 240,
            max_output_current: 16,
            nominal_dc_input_voltage: 380,
            max_voltage_drop: 3.0,
            type: "Optimized"
        };
        solarModule = { // Axitec AC-280M/156-60S
            open_circuit_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        let wire = system.GetSegmentWireSize([15], 1, inverter, solarModule, optimizer, 200, 2, true, false, 3);
        // console.log("Returned ", wire);
        expect(wire.gauge).equals("10 AWG");
        done();
    });
    it("Get wire gauge test 2: Solaredge trench after inverter", done => {
        inverter = { // SE 3800
            max_output_voltage: 240,
            max_output_current: 16,
            nominal_dc_input_voltage: 380,
            max_voltage_drop: 3.0,
            type: "Optimized"
        };
        solarModule = { // Axitec AC-280M/156-60S
            open_circuit_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        let wire = system.GetSegmentWireSize([15], 1, inverter, solarModule, optimizer, 200, 3, true, false, 3);
        // console.log("Returned ", wire);
        expect(wire.gauge).equals("8 AWG");
        done();
    });

    it("Get wire gauge test 3: AP Sys trench after inverter", done => {
        inverter = { // AP Sys YC600
            max_output_voltage: 240,
            max_output_current: 2.28,
            nominal_dc_input_voltage: 380,
            max_voltage_drop: 3.0,
            type: "Micro"
        };
        solarModule = { // Axitec AC-280M/156-60S
            open_circuit_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        let wire = system.GetSegmentWireSize([15], 8, inverter, solarModule, optimizer, 300, 3, true, false, 3);
        // console.log("Returned ", wire);
        expect(wire.gauge).equals("6 AWG");
        done();
    });

    it("Get wire gauge test 4: AP sys trench after inverter", done => {
        inverter = { // AP Sys YC600
            max_output_voltage: 240,
            max_output_current: 2.28,
            nominal_dc_input_voltage: 380,
            max_voltage_drop: 3.0,
            type: "Micro"
        };
        solarModule = { // Axitec AC-280M/156-60S
            open_circuit_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        let wire = system.GetSegmentWireSize([14, 13, 13], 20, inverter, solarModule, optimizer, 300, 4, true, false, 4);
        // console.log("Returned ", wire);
        expect(wire.gauge).equals("3 AWG");
        done();
    });

    it("Get wire gauge test 5: AP sys trench before inverter", done => {
        inverter = { // AP Sys YC600
            max_output_voltage: 240,
            max_output_current: 2.28,
            nominal_dc_input_voltage: 380,
            max_voltage_drop: 3.0,
            type: "Micro"
        };
        solarModule = { // Axitec AC-280M/156-60S
            open_circuit_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        let wire = system.GetSegmentWireSize([14, 13, 13], 20, inverter, solarModule, optimizer, 300, 3, true, false, 4);
        // console.log("Returned ", wire);
        expect(wire.gauge).equals("4 AWG");
        done();
    });

    it("Get wire gauge test 6: Sunny Boy trench before inverter", done => {
        inverter = { // Sunny Boy 3.0
            max_output_voltage: 240,
            max_output_current: 12.5,
            nominal_dc_input_voltage: 480,
            max_voltage_drop: 3.0,
            type: "String"
        };
        solarModule = { // Axitec AC-280M/156-60S
            open_circuit_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        let wire = system.GetSegmentWireSize([10], 1, inverter, solarModule, optimizer, 300, 2, true, false, 3);
        // console.log("Returned ", wire);
        expect(wire.gauge).equals("10 AWG");
        done();
    });

    it("Get wire gauge test 7: Sunny Boy trench before inverter w/ multi string", done => {
        inverter = { // Sunny Boy 3.0
            max_output_voltage: 240,
            max_output_current: 12.5,
            nominal_dc_input_voltage: 480,
            max_voltage_drop: 3.0,
            type: "String"
        };
        solarModule = { // Axitec AC-280M/156-60S
            open_circuit_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        let wire = system.GetSegmentWireSize([11, 10], 1, inverter, solarModule, optimizer, 300, 3, true, false, 4);
        // console.log("Returned ", wire);
        expect(wire.gauge).equals("10 AWG");
        done();
    });

    it("Get wire gauge test 8: Sunny Boy after inverter with default distance", done => {
        inverter = { // Sunny Boy 3.0
            max_output_voltage: 240,
            max_output_current: 12.5,
            nominal_dc_input_voltage: 480,
            max_voltage_drop: 3.0,
            type: "String"
        };
        solarModule = { // Axitec AC-280M/156-60S
            open_circuit_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        let wire = system.GetSegmentWireSize([10], 1, inverter, solarModule, optimizer, 10, 3, true, false, 3);
        // console.log("Returned ", wire);
        expect(wire.gauge).equals("10 AWG");
        done();
    });

    it("Get wire gauge test 9: 2 Solaredge 7600s 52 panels trench after inverter", done => {
        inverter = { // SE 7600
            max_output_voltage: 240,
            max_output_current: 32,
            nominal_dc_input_voltage: 400,
            max_voltage_drop: 3.0,
            type: "Optimized"
        };
        solarModule = { // Axitec AC-280M/156-60S
            open_circuit_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        let wire = system.GetSegmentWireSize([13, 13, 13, 13], 2, inverter, solarModule, optimizer, 200, 4, true, false, 4);
        // console.log("Returned ", wire);
        expect(wire.gauge).equals("3 AWG");
        done();
    });

    it ("Get wire Schedule test 1: Solaredge Inverter", done => {
        inverter = { // SE 7600
            max_output_voltage: 240,
            max_output_current: 32,
            nominal_dc_input_voltage: 400,
            max_voltage_drop: 3.0,
            type: "Optimized"
        };
        solarModule = { // Trina 320W
            open_circuit_voltage: 40.3,
            short_circuit_current: 10.2
        };
        optimizer = { // p320
            output_current: 15
        };
        let ret = system.GetWireSchedule(5, [], 2, inverter, [15, 14, 14, 14], solarModule, optimizer, true, false);
        for (let i = 0; i < ret.schedule.length; ++i) {
            console.log(`TAG ${ret.schedule[i].tagNum}`);
            console.log("Schedule Item:");
            for (const wire in ret.schedule[i]["wires"]) {
                console.log(ret.schedule[i]["wires"][wire].getString());
            }
            console.log(ret.schedule[i].conduitCallout);
            console.log(ret.voltageDropCalcs[i], "\n");
        }
        done();
    });

    it ("Get wire Schedule test 2: Enphase Inverter", done => {
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
        done();
    });

});