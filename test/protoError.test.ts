import * as assert from 'assert';
import { ProtoError, parseProtoError, getEmptyProtoError } from '../src/protoError';

describe('parseProtoError', () => {
  it('should return empty protoerror when there is no error', () => {
    const expected: ProtoError = getEmptyProtoError();
    const actual = parseProtoError("");

    assert.deepStrictEqual(actual, expected);
  });

  describe('should return the correct values', () => {
    it('when parsing a valid error', () => {
      const expected: ProtoError = {
        line: 1,
        reason: "test error"
      };

      const error: string = "[path/to/file.proto:1:5] test error";
      const actual = parseProtoError(error);

      assert.deepStrictEqual(actual, expected);
    });

    it('when file directory contains a space', () => {
      const expected: ProtoError = {
        line: 1,
        reason: "test error"
      };

      const error: string = "[path/to /file.proto:1:5] test error";
      const actual = parseProtoError(error);

      assert.deepStrictEqual(actual, expected);
    });
  });
});
