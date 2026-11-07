import type { ServicePackage } from "@/data/packages";
import { SERVICES } from "@/data/services";

export interface PackageChoiceState {
  service: string;
  package: string;
  priceOption: string;
  otherServiceDetail: string;
}
export type RememberedPackage = { packageId: string; priceOption: string };
export type PackageMemory = Record<string, RememberedPackage>;

function serviceSlug(name: string): string | undefined {
  return SERVICES.find(service => service.name === name)?.slug;
}

function belongsToService(
  id: string,
  serviceName: string,
  available: readonly ServicePackage[],
): boolean {
  const slug = serviceSlug(serviceName);
  return !!slug && available.some(pkg => pkg.id === id && pkg.serviceSlug === slug);
}

/**
 * Restore the last package used with this service, including the initial URL
 * selection. Never carry a package across services; never restore unpublished
 * catalogue packages absent from the server-provided allowlist.
 */
export function switchEnquiryService<T extends PackageChoiceState>(
  current: T,
  nextService: string,
  memory: PackageMemory,
  available: readonly ServicePackage[],
): { form: T; memory: PackageMemory } {
  const nextMemory = { ...memory };
  if (current.package && belongsToService(current.package, current.service, available)) {
    nextMemory[current.service] = {
      packageId: current.package,
      priceOption: current.priceOption,
    };
  }
  const remembered = nextMemory[nextService];
  const restored = remembered && belongsToService(remembered.packageId, nextService, available)
    ? remembered : undefined;
  return {
    memory: nextMemory,
    form: {
      ...current,
      service: nextService,
      otherServiceDetail: nextService === "Other" ? current.otherServiceDetail : "",
      package: restored?.packageId ?? "",
      priceOption: restored?.priceOption ?? "",
    },
  };
}

/** A manual package change supersedes the URL default and clears its price option. */
export function switchEnquiryPackage<T extends PackageChoiceState>(
  current: T,
  nextPackage: string,
  memory: PackageMemory,
  available: readonly ServicePackage[],
): { form: T; memory: PackageMemory } {
  const id = nextPackage && belongsToService(nextPackage, current.service, available)
    ? nextPackage : "";
  const nextMemory = { ...memory };
  if (id) nextMemory[current.service] = { packageId: id, priceOption: "" };
  else delete nextMemory[current.service];
  return { memory: nextMemory, form: { ...current, package: id, priceOption: "" } };
}
