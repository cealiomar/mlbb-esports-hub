/**
 * A single timestamp captured when the static build starts. Keeping it at
 * module scope makes every prerendered page agree on what "now" means.
 */
export const BUILD_UNIX_TIME = Math.floor(Date.now() / 1000)
