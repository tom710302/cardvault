/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cards.scryfall.io" },
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },
};

module.exports = nextConfig;
