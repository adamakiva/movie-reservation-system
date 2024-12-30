function strcasecmp<T extends string>(s1: T, s2: T) {
  const result = s1.localeCompare(s2, undefined, {
    sensitivity: 'accent',
  });

  return result;
}

function isDevelopmentMode(mode?: string) {
  if (!mode) {
    return false;
  }
  const result = !strcasecmp(mode, 'development');

  return result;
}

function isTestMode(mode?: string) {
  if (!mode) {
    return false;
  }
  const result = !strcasecmp(mode, 'test');

  return result;
}

function isProductionMode(mode?: string) {
  if (!mode) {
    return false;
  }
  const result = !strcasecmp(mode, 'production');

  return result;
}

function encodeCursor(id: string, createdAt: Date) {
  const encodedCursor = Buffer.from(
    `${id},${createdAt.toISOString()}`,
  ).toString('base64');

  return encodedCursor;
}

function decodeCursor(cursor: string) {
  const decodedCursor = Buffer.from(cursor, 'base64')
    .toString('utf-8')
    .split(',');

  const result = {
    id: decodedCursor[0]!,
    createdAt: new Date(decodedCursor[1]!),
  } as const;

  return result;
}

/**********************************************************************************/

export {
  decodeCursor,
  encodeCursor,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  strcasecmp,
};
