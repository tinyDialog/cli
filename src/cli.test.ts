import {describe, expect, test} from 'bun:test';
import {EventEmitter} from 'node:events';
import {parseArgs} from './args.ts';
import {installOutputErrorHandler, splitCombinedSurvey} from './cli.ts';

describe('CLI behavior', () => {
  test('preserves slashes in survey names with an explicit project', () => {
    const command = parseArgs([
      'response',
      'list',
      '--project',
      'Website',
      '--survey',
      'Website/Followup',
    ]);
    if(command.kind !== 'response-list') throw new Error('Expected response-list command.');

    expect(splitCombinedSurvey(command)).toMatchObject({
      project: 'Website',
      survey: 'Website/Followup',
    });
  });

  test('splits project/survey shorthand when no project is explicit', () => {
    const command = parseArgs(['response', 'list', '--survey', 'Website/Followup']);
    if(command.kind !== 'response-list') throw new Error('Expected response-list command.');

    expect(splitCombinedSurvey(command)).toMatchObject({
      project: 'Website',
      survey: 'Followup',
    });
  });

  test('exits successfully when stdout reports EPIPE', () => {
    const output = new EventEmitter();
    let exitCode: number|undefined;
    installOutputErrorHandler(output, (code) => {
      exitCode = code;
    });

    output.emit('error', Object.assign(new Error('broken pipe'), {code: 'EPIPE'}));

    expect(exitCode).toBe(0);
  });
});
