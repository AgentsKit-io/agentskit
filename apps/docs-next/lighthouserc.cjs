const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

module.exports = {
  ci: {
    collect: {
      settings: {
        extraHeaders: JSON.stringify(bypass
          ? {
              'x-vercel-protection-bypass': bypass,
              'x-vercel-set-bypass-cookie': 'true',
            }
          : {}),
      },
    },
  },
}
