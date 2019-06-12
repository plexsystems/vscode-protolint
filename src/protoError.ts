export interface ProtoError {
  line: number;
  reason: string;
}

export function parseProtoError(error: string): ProtoError {

  if (!error) {
    return getEmptyProtoError();
  }

  const errorLine = parseInt(error.split(":")[1], 10);
  const errorReason = error.split("] ")[1];

  const protoError: ProtoError = {
    line: errorLine,
    reason: errorReason
  }

  return protoError;
}

export function getEmptyProtoError(): ProtoError {
  const emptyProtoError: ProtoError = {
    line: 0,
    reason: ""
  }

  return emptyProtoError;
}
