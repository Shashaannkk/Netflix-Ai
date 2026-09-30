/**
 * Startup Environment Variable Audit Validator (Phase 7)
 * Safely audits environment variable presence without printing secrets.
 */
export const validateEnvironment = () => {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  
  const envVars = [
    { name: 'MONGO_URI', required: isProduction },
    { name: 'GOOGLE_CLIENT_ID', required: false },
    { name: 'GOOGLE_CLIENT_SECRET', required: false },
    { name: 'JWT_ACCESS_SECRET', required: isProduction },
    { name: 'JWT_REFRESH_SECRET', required: isProduction },
  ];

  console.log('[ENV] Auditing server environment variables...');

  let hasMissingRequired = false;

  envVars.forEach(({ name, required }) => {
    const isPresent = !!process.env[name];
    if (isPresent) {
      console.log(`[ENV] ${name}: PRESENT`);
    } else {
      if (required) {
        console.error(`[MISSING_ENV] ${name}: MISSING (Required in production)`);
        hasMissingRequired = true;
      } else {
        console.warn(`[ENV] ${name}: MISSING (Optional / Fallback enabled)`);
      }
    }
  });

  return !hasMissingRequired;
};
