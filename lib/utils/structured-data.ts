/** JSON embedded in an HTML script must not contain a literal less-than sign:
 * JSON escaping alone leaves </script> able to terminate the element.
 * Unicode escapes preserve the original data when a consumer parses the JSON.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
