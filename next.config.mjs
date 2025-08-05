/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}



// module.exports = {
//   // Allow WebSocket connections (HMR) via ngrok
//   webpackDevMiddleware: (config) => {
//     config.watchOptions = {
//       poll: 1000, // Check for changes every second (fallback)
//       aggregateTimeout: 300, // Delay rebuild
//     };
//     return config;
//   },
// };