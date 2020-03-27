'use strict';

/**
 * Request context Logger, itself isn't a {@link Logger}.
 */
class ContextLogger {

  /**
   * @constructor
   * @param {Context} ctx - egg Context instance
   * @param {Logger} logger - Logger instance
   */
  constructor(ctx, logger) {
    this.ctx = ctx;
    this._logger = logger;
  }

  checkIgnorePath (array, path) {
    let flag = false
    for (let item of array) {
      if (typeof item === 'string') {
        flag = item === path
      } else if (item && typeof item === 'object' && typeof item.test === 'function') {
        flag = item.test(path)
      }

      if (flag) break
    }
    return flag
  }

  get paddingMessage() {
    const ctx = this.ctx;

    let body = ''
    let ignoreBody = []
    if(ctx.app.config.customLog && ctx.app.config.customLog.ignoreBody) {
      ignoreBody = ctx.app.config.customLog.ignoreBody
    }
    let ignore = this.checkIgnorePath(ignoreBody, ctx.path)
    if (ctx.request && ctx.request.body && !ignore) {
      try {
        body = JSON.stringify(ctx.request.body)
      } catch (err) {
        console.log(err)
      }
    }

    // Auto record necessary request context infomation, e.g.: user id, request spend time
    // format: '[$userId/$ip/$traceId/$use_ms $method $url]'
    const userId = ctx.userId || '-';
    const traceId = ctx.tracer && ctx.tracer.traceId || '-';
    const use = ctx.starttime ? Date.now() - ctx.starttime : 0;
    return '[' +
      userId + '/' +
      ctx.ip + '/' +
      traceId + '/' +
      use + 'ms ' +
      ctx.method + ' ' +
      ctx.url +
    '] ' + body;
  }

  write(msg) {
    this._logger.write(msg);
  }
}

[ 'error', 'warn', 'info', 'debug' ].forEach(level => {
  const LEVEL = level.toUpperCase();
  ContextLogger.prototype[level] = function() {
    const meta = {
      formatter: contextFormatter,
      paddingMessage: this.paddingMessage,
    };
    Object.defineProperty(meta, 'ctx', {
      enumerable: false,
      value: this.ctx,
    });
    this._logger.log(LEVEL, arguments, meta);
  };
});

module.exports = ContextLogger;

function contextFormatter(meta) {
  return meta.date + ' ' + meta.level + ' ' + meta.pid + ' ' + meta.paddingMessage + ' ' + meta.message;
}
