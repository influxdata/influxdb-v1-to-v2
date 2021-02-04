/* eslint-disable no-console */
import colors from 'colors'

const TRACE_ENABLED = !!(process.env['TRACE'] && process.env['TRACE'] !== '0')

const logger = {
  info(...args: unknown[]): void {
    if (args.length > 1) {
      args[0] = colors.green(String(args[0]))
    }
    console.log(...args)
  },
  error(category: string, ...args: unknown[]): void {
    if (args.length) {
      args[0] = colors.red(String(args[0]))
      console.error(colors.red('ERROR'), colors.red(category), ...args)
      return
    }
    console.error(colors.red(category))
  },
  warn(category: string, ...args: unknown[]): void {
    if (args.length) {
      args[0] = colors.yellow(String(args[0]))
      console.warn(colors.yellow('WARN'), colors.yellow(category), ...args)
    }
    console.warn(colors.yellow(category))
  },
  trace(category: string, ...args: unknown[]): void {
    if (TRACE_ENABLED) {
      console.log(colors.gray('TRACE'), colors.gray(category), ...args)
    }
  },
}
export default logger
