const bunyan = require('bunyan')

const getLogger = (module, logLevel = 'info') => {
  const logger = bunyan.createLogger({
    name: module,
    level: logLevel,
  })

  logger.fields.log_level = logLevel
  delete logger.fields.pid
  delete logger.fields.hostname
  return logger
}

module.exports = {
  getLogger,
}
