/* global QUnit */
// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

sap.ui.require([
	"em_webapp/test/unit/AllTests"
], function (Controller) {
	"use strict";
	QUnit.start();
});