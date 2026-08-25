"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_JOB_SOURCES = void 0;
exports.getSourceByName = getSourceByName;
const GreenhouseSource_1 = require("./greenhouse/GreenhouseSource");
const LeverSource_1 = require("./lever/LeverSource");
const AshbySource_1 = require("./ashby/AshbySource");
const WorkdaySource_1 = require("./workday/WorkdaySource");
const AdzunaSource_1 = require("./adzuna/AdzunaSource");
const RemotiveSource_1 = require("./remotive/RemotiveSource");
const RemoteOKSource_1 = require("./remoteok/RemoteOKSource");
const JobSpySource_1 = require("./jobspy/JobSpySource");
exports.ALL_JOB_SOURCES = [
    new GreenhouseSource_1.GreenhouseSource(),
    new LeverSource_1.LeverSource(),
    new AshbySource_1.AshbySource(),
    new WorkdaySource_1.WorkdaySource(),
    new AdzunaSource_1.AdzunaSource(),
    new RemotiveSource_1.RemotiveSource(),
    new RemoteOKSource_1.RemoteOKSource(),
    new JobSpySource_1.JobSpySource(),
];
function getSourceByName(name) {
    return exports.ALL_JOB_SOURCES.find((s) => s.name === name);
}
__exportStar(require("./base/JobSource"), exports);
__exportStar(require("./base/SourceTypes"), exports);
//# sourceMappingURL=index.js.map