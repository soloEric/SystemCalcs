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

    it("Get AC Disco Size for Tap", done => {
        expect(system.GetACDiscoSize(8, 1, true)).equals(60); // 8 Enphase IQ7-60-2-US
        expect(system.GetACDiscoSize(50, 1, true)).equals(100); // 50 Enphase IQ7-60-2-US
        done();
    });

    it("Get AC Disco Size non Tap", done => {
        expect(system.GetACDiscoSize(8, 1, false)).equals(30); // 8 Enphase IQ7-60-2-US
        expect(system.GetACDiscoSize(24, 1, false)).equals(30); // 24 Enphase IQ7-60-2-US
        expect(system.GetACDiscoSize(25, 1, false)).equals(60); // 25 Enphase IQ7-60-2-US
        done();
    });

    it("Get wire gauge test 1", done => {
        inverter = { // SE 3800
            max_output_voltage: 240,
            max_output_current: 16,
            nominal_dc_input_voltage: 380,
            max_voltage_drop: 3.0,
            type: "String"
        };
        solarModule = { // Axitec AC-280M/156-60S
            mpp_voltage: 31.8,
            short_circuit_current: 9.75
        };
        optimizer = { // p320
            output_current: 15
        };
        console.log(system.CalculateVoltageDrop(15, 1, inverter, solarModule, optimizer, 200, 3, true));
        done();
    });

});