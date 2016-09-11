#!/usr/bin/env node
var should = require("should");
var assert = require('assert'),
    hkmverchecker = require('../lib/main').hkmverchecker,
    vm = require('../lib/main').hkmversionmanager;

describe('hkm-simple-vercheck', function () {

    it('check versioning 1', function () {
        var ch = new hkmverchecker("0.0.1", "0.2.1");
        var message = ch.getMessage();
        console.log(message + ch.getVersionFinal());
    });

    it('check versioning 2', function () {
        var ch = new hkmverchecker("8.4.1", "0.1.1");
        var message = ch.getMessage();
        console.log(message + ch.getVersionFinal());
    });


    it('numeric upgrades', function () {
        vm.upgradeDependencyDeclaration("0", "1").should.equal("1");
        vm.upgradeDependencyDeclaration("1", "10").should.equal("10");
        vm.upgradeDependencyDeclaration("10", "1").should.equal("1"); // Downgrade

        vm.upgradeDependencyDeclaration("0.1", "1.0").should.equal("1.0");
        vm.upgradeDependencyDeclaration("1.0", "1.1").should.equal("1.1");
        vm.upgradeDependencyDeclaration("2.0", "1.1").should.equal("1.1"); // Downgrade

        vm.upgradeDependencyDeclaration("1.0.0", "1.0.1").should.equal("1.0.1");
        vm.upgradeDependencyDeclaration("1.0.1", "1.1.0").should.equal("1.1.0");
        vm.upgradeDependencyDeclaration("2.0.1", "2.0.11").should.equal("2.0.11");
        vm.upgradeDependencyDeclaration("2.0.0", "1.0.0").should.equal("1.0.0"); // Downgrade

        vm.upgradeDependencyDeclaration("1.0.0", "1.1").should.equal("1.1");
        vm.upgradeDependencyDeclaration("1.0.0", "2").should.equal("2");
        vm.upgradeDependencyDeclaration("22.0.1", "22").should.equal("22"); // Downgrade
    });

});