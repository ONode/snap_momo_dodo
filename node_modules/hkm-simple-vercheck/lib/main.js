var vm = require("./vermanager");
/**
 * Upgrade an existing dependency declaration to satisfy the latest version
 * @param declaration Current version declaration (e.g. "1.2.x")
 * @param latestVersion Latest version (e.g "1.3.2")
 * @returns {string} The upgraded dependency declaration (e.g. "1.3.x")
 * @source https://github.com/tjunnone/npm-check-updates/blob/master/lib/vmgr.js
 */
var hkmvercheck = function (declaration, latestVersion) {
    var determine = vm.upgradeDependencyDeclaration(declaration, latestVersion);
    this.message = "";
    this.final_version = determine;
    if (latestVersion == declaration) {
        this.message = "up-to-date!";
    } else if (determine == latestVersion) {
        this.message = "your version is newer!";
    } else if (determine == declaration) {
        this.message = "You have a newer version, please update your product!";
    }
}
hkmvercheck.prototype = {
    getMessage: function () {
        return this.message;
    },
    getVersionFinal: function () {
        return this.final_version;
    }
}
exports.hkmverchecker = hkmvercheck;
exports.hkmversionmanager = vm;