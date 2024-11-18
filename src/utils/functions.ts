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

/**********************************************************************************/

export { isDevelopmentMode, isProductionMode, isTestMode, strcasecmp };
