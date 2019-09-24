import chalk from 'chalk';
import fig from 'figures';

const colorMapping = {
  warn: 'yellow',
  success: 'green',
  error: 'red',
};

const iconMapping = {
  info: 'ℹ',
  warn: '⚠',
  success: '✔',
  error: '✖',
};

const prefixMapping = {
  warn: 'Warning: ',
  error: 'Error: ',
};

type LogType = 'success' | 'error' | 'warn' | 'info';

/**
 * Create a function for coloring the log based on type
 * @param type - Log type
 * @returns A color logger function
 */
function colorLogger(type: LogType): Function {
  const color = (colorMapping as any)[type];
  return (text: string): any => {
    const chalkColor: any = (chalk as any)[color];
    return chalkColor ? chalkColor(text) : text;
  };
}

/**
 * Log using a specific type (colorizes for CLI)
 * @param type - Log type
 * @param message - Message containing info to log
 * @param other - Other values to pass to info
 */
function logType(type: LogType, message: string, other?: any): void {
  const icon: any = iconMapping[type];
  const prefix: any = (prefixMapping as any)[type];
  const colorLog = colorLogger(type);
  /* eslint-disable no-console */
  console.log(
    `${icon ? colorLog(fig(icon)) : ''} ${
      prefix ? colorLog(prefix) : ''
    }${message}`,
  );
  /* eslint-enable no-console */
  if (other) {
    console.log('\n', other); // eslint-disable-line no-console
  }
}

export const log = console.log; // eslint-disable-line

/**
 * Log info within console
 * @param message - Message containing info to log
 * @param other - Other values to pass to info
 * @returns undefined
 */
export function info(message: string, other?: any): void {
  return logType('info', message, other);
}

/**
 * Log a success within console (colorized with green)
 * @param message - Success message to log
 * @param other - Other values to pass to info
 * @returns undefined
 */
export function success(message: string, other?: any): void {
  return logType('success', message, other);
}

/**
 * Log a warning within the console (colorized with yellow)
 * @param message - Warning message to log
 * @param other - Other values to pass to info
 * @returns undefined
 */
export function warn(message: string, other?: any): void {
  return logType('warn', message, other);
}

/**
 * Log an error within console (colorized with red)
 * @param message - Error message to log
 * @param other - Other values to pass to info
 * @returns undefined
 */
export function error(message: string, other?: any): void {
  return logType('error', message, other);
}
