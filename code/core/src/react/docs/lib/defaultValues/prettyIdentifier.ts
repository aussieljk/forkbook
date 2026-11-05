import type { InspectionFunction, InspectionIdentifiableInferedType } from '../inspection';
import { InspectionType } from '../inspection';

export function getPrettyFuncIdentifier(
  identifier: string | undefined,
  hasArguments: boolean
): string {
  return hasArguments ? `${identifier}( ... )` : `${identifier}()`;
}

export function getPrettyElementIdentifier(identifier: string | undefined) {
  return `<${identifier} />`;
}

export function getPrettyIdentifier(inferredType: InspectionIdentifiableInferedType): string {
  const { type, identifier } = inferredType;

  switch (type) {
    case InspectionType.FUNCTION:
      return getPrettyFuncIdentifier(identifier, (inferredType as InspectionFunction).hasParams);
    case InspectionType.ELEMENT:
      return getPrettyElementIdentifier(identifier);
    default:
      return identifier;
  }
}
