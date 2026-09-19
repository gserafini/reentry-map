import { getResourceAddressType, getResourceServiceArea } from './resource-location'

type LocatedResource = {
  addressType?: unknown
  address_type?: unknown
  serviceArea?: unknown
  service_area?: unknown
}
export interface ResourceLocationGroup<T> {
  type: 'places' | 'services' | 'unconfirmed'
  label: 'Places to visit' | 'Services covering this area' | 'Service area to confirm'
  entries: Array<{ resource: T; originalIndex: number }>
}

/** Group by travel vs service area without changing the order within either section. */
export function groupResourcesByLocation<T extends LocatedResource>(
  resources: T[]
): ResourceLocationGroup<T>[] {
  const groups = new Map<'places' | 'services' | 'unconfirmed', ResourceLocationGroup<T>>()
  resources.forEach((resource, originalIndex) => {
    const type =
      getResourceAddressType(resource) === 'physical'
        ? 'places'
        : getResourceServiceArea(resource)
          ? 'services'
          : 'unconfirmed'
    let group = groups.get(type)
    if (!group) {
      group = {
        type,
        label:
          type === 'places'
            ? 'Places to visit'
            : type === 'services'
              ? 'Services covering this area'
              : 'Service area to confirm',
        entries: [],
      }
      groups.set(type, group)
    }
    group.entries.push({ resource, originalIndex })
  })
  return [...groups.values()]
}
