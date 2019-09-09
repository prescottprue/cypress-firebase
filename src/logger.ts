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

function colorLogger(type: LogType): Function {
  const color = (colorMapping as any)[type];
  return (text: string): any => {
    const chalkColor: any = (chalk as any)[color];
    return chalkColor ? chalkColor(text) : text;
  };
}

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
export function info(message: string, other?: any): void {
  return logType('info', message, other);
}
export function success(message: string, other?: any): void {
  return logType('success', message, other);
}
export function warn(message: string, other?: any): void {
  return logType('warn', message, other);
}
export function error(message: string, other?: any): void {
  return logType('error', message, other);
}
