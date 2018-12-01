import chalk from 'chalk';
import fig from 'figures';

const colorMapping = {
  warn: 'yellow',
  success: 'green',
  error: 'red'
};

const iconMapping = {
  info: 'ℹ',
  warn: '⚠',
  success: '✔',
  error: '✖'
};

const prefixMapping = {
  warn: 'Warning: ',
  error: 'Error: '
};

function colorLogger(type) {
  const color = colorMapping[type];
  return (text) => {
    const chalkColor = chalk[color];
    return chalkColor ? chalkColor(text) : text;
  };
}

function logType(type, message, other) {
  const icon = iconMapping[type];
  const prefix = prefixMapping[type];
  const colorLog = colorLogger(type);
  console.log(`${icon ? colorLog(fig(icon)) : ''}${prefix ? colorLog(prefix) : ' '}${message}`); // eslint-disable-line no-console
  if (other) {
    console.log('\n', other); // eslint-disable-line no-console
  }
}

export const log = console.log; // eslint-disable-line
export const info = (message, other) => logType('info', message, other);
export const success = (message, other) => logType('success', message, other);
export const warn = (message, other) => logType('warn', message, other);
export const error = (message, other) => logType('error', message, other);
