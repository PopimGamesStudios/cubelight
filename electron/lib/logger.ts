import log from "electron-log/main";

log.initialize();
log.transports.file.level = "info";
log.transports.console.level = process.env.VITE_DEV_SERVER_URL ? "debug" : "info";

export const logger = log;
