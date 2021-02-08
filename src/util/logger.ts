/* eslint-disable no-console */
import chalk from 'chalk'
import {toolOptions} from '../env'

const logger = {
  info(...args: unknown[]): void {
    if (args.length > 1) {
      args[0] = chalk.green(String(args[0]))
    }
    console.log(...args)
  },
  error(category: string, ...args: unknown[]): void {
    if (args.length) {
      args[0] = chalk.red(String(args[0]))
      console.error(chalk.red('ERROR'), chalk.red(category), ...args)
      return
    }
    console.error(chalk.red(category))
  },
  warn(category: string, ...args: unknown[]): void {
    if (args.length) {
      args[0] = chalk.yellow(String(args[0]))
      console.warn(chalk.yellow('WARN'), chalk.yellow(category), ...args)
      return
    }
    console.warn(chalk.yellow(category))
  },
  trace(category: string, ...args: unknown[]): void {
    if (toolOptions.trace) {
      console.log(chalk.gray('TRACE'), chalk.gray(category), ...args)
    }
  },
}
export default logger
