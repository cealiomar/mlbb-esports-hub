/** Credit shown in the site footer. */
export const AUTHOR = {
  handle: 'madebyceali',
  tagline: 'Product & UI design',
  instagram: 'https://instagram.com/madebyceali',
  email: 'cealiomar@gmail.com',
  paypal: 'https://www.paypal.com/paypalme/cealiomar?locale.x=en_US',
  /** Signature lockup. The portrait inside it is a 384px WebP so the whole
      mark costs 49KB rather than the 967KB the original export carried. */
  logo: {
    src: '/brand/credit.svg',
    width: 1101,
    height: 253,
    aspect: 1101 / 253,
  },
} as const
