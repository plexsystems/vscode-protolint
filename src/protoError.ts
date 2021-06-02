export interface ProtoError {
  line: number;
  reason: string;
}

// parseProtoError takes the an error message from protolint
// and attempts to parse it as a linting error.
//
// Linting errors are in the format:
// [path/to/file.proto:line:column] an error message is here
export function parseProtoError(error: string): ProtoError {
  if (!error) {
    return getEmptyProtoError();
  }

  const errorLine = parseInt(error.split(".proto:")[1], 10);
  const errorReason = error.split("] ")[1];

  const protoError: ProtoError = {
    line: errorLine,
    reason: errorReason
  };

  return protoError;
}

export function getEmptyProtoError(): ProtoError {
  const emptyProtoError: ProtoError = {
    line: 0,
    reason: ""
  };

  return emptyProtoError;
}
