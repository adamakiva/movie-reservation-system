function strcasecmp<T extends string>(s1: T, s2: T) {
  return s1.localeCompare(s2, undefined, {
    sensitivity: 'accent',
  });
}

function isDevelopmentMode(mode?: string) {
  if (!mode) {
    return false;
  }

  return !strcasecmp(mode, 'development');
}

function isTestMode(mode?: string) {
  if (!mode) {
    return false;
  }

  return !strcasecmp(mode, 'test');
}

function isProductionMode(mode?: string) {
  if (!mode) {
    return false;
  }

  return !strcasecmp(mode, 'production');
}

function encodeCursor(id: string, createdAt: Date) {
  return Buffer.from(`${id},${createdAt.toISOString()}`).toString('base64');
}

function decodeCursor(cursor: string) {
  const val = Buffer.from(cursor, 'base64').toString('utf-8').split(',');

  return {
    id: val[0]!,
    createdAt: new Date(val[1]!),
  } as const;
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
